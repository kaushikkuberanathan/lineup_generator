-- Migration 016: resolve profile names from auth metadata (fix trigger + backfill)
--
-- APPLIED TO DEV: 2026-07-21 (psqvzppphdedqkpmarwx) - verified: split_full_name handles two-word/three-word/single-word/empty; backfill populated the full_name account, left the metadata-less one empty; trigger installed.
-- NOT YET APPLIED TO PROD (hzaajccyurlyeweekvma).
--
-- Repo record of a function/trigger change to be applied DEV-first, committed
-- after verification. Same convention as migrations 005-015.
--
-- ---------------------------------------------------------------------------
-- WHY (#402)
-- ---------------------------------------------------------------------------
-- profiles.first_name is empty for every user, so the app greeting falls back
-- to the literal "Coach" (frontend App.jsx: user.profile.first_name || "Coach").
-- Three compounding problems:
--
--   (1) The handle_new_user trigger from migration 014 is NOT live in prod, so
--       for most existing users no name was ever captured at signup.
--   (2) Where the 014 trigger DOES run, it reads only given_name/first_name and
--       family_name/last_name from raw_user_meta_data. Google OAuth leaves
--       given_name/family_name NULL on many accounts and puts the human name in
--       full_name / name instead. So the COALESCE fell through to '' even when a
--       name was present in metadata.
--   (3) The 014 trigger never split a single full-name string into first/last.
--
-- This migration fixes the trigger to resolve a name with a sensible precedence
-- (given_name -> full_name -> name), splits full names into first/last, and
-- backfills existing profiles rows that are empty-but-have-a-metadata-source.
--
-- Names are collected at request time in access_requests.first_name/last_name,
-- but the approval flow (admin.js /approve and /approve-link) never propagates
-- them into profiles. That access_requests-sourced backfill is a SEPARATE
-- follow-up; THIS migration only sources names from auth.users metadata.


-- ===========================================================================
-- PART 1: helper to split a full name into first / last
-- ===========================================================================
-- Defined FIRST: PART 2 (the trigger) and PART 3 (the backfill) both call it,
-- so it must exist before either runs.
-- first word              -> first_name
-- everything after the    -> last_name
--   first space
-- single-word name        -> first_name set, last_name ''
-- null / blank            -> both ''

CREATE OR REPLACE FUNCTION public.split_full_name(p_full text)
RETURNS TABLE(first_name text, last_name text)
LANGUAGE sql IMMUTABLE AS $$
  SELECT
    CASE WHEN p_full IS NULL OR btrim(p_full) = '' THEN ''
         ELSE split_part(btrim(p_full), ' ', 1) END,
    CASE WHEN p_full IS NULL OR btrim(p_full) = '' THEN ''
         WHEN position(' ' in btrim(p_full)) = 0 THEN ''
         ELSE btrim(substring(btrim(p_full) from position(' ' in btrim(p_full)) + 1)) END
$$;


-- ===========================================================================
-- PART 2: fixed handle_new_user trigger
-- ===========================================================================
-- Resolves a name with this precedence, then splits:
--   1. given_name present  -> first_name = given_name,
--                             last_name  = COALESCE(family_name, '')
--   2. else full_name present -> split via split_full_name(full_name)
--   3. else name present      -> split via split_full_name(name)
--   4. else both ''
-- Insert into profiles with ON CONFLICT (id) DO NOTHING (idempotent, as 014).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_given  text := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data ->> 'given_name', '')), '');
  v_family text := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data ->> 'family_name', '')), '');
  v_full   text := COALESCE(NEW.raw_user_meta_data ->> 'full_name',
                            NEW.raw_user_meta_data ->> 'name');
  v_first  text;
  v_last   text;
BEGIN
  IF v_given IS NOT NULL THEN
    -- Precedence 1: explicit given/family name from the IdP.
    v_first := v_given;
    v_last  := COALESCE(v_family, '');
  ELSE
    -- Precedence 2/3/4: split full_name, then name, else both ''.
    SELECT s.first_name, s.last_name
      INTO v_first, v_last
      FROM public.split_full_name(v_full) s;
  END IF;

  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (NEW.id, NEW.email, v_first, v_last)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Reuse the migration 014 trigger name so this REPLACES rather than duplicates.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ===========================================================================
-- PART 3: backfill existing profiles from auth metadata
-- ===========================================================================
-- Only touches profiles rows whose name is empty AND that have a metadata
-- source. Rows with no source (magic-link users) are left '' by design.

-- 3a: full_name / name -> split into first/last.
UPDATE public.profiles p
SET first_name = s.first_name,
    last_name  = s.last_name,
    updated_at = now()
FROM auth.users u,
     LATERAL public.split_full_name(
       COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')
     ) s
WHERE p.id = u.id
  AND (p.first_name IS NULL OR p.first_name = '')
  AND COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') IS NOT NULL;

-- 3b: given_name / family_name -> first/last (belt-and-suspenders for IdPs that
-- send structured names but no full_name/name). Runs after 3a; still guarded to
-- empty-name rows only, so it never clobbers a name 3a just wrote.
UPDATE public.profiles p
SET first_name = btrim(u.raw_user_meta_data->>'given_name'),
    last_name  = COALESCE(btrim(u.raw_user_meta_data->>'family_name'), ''),
    updated_at = now()
FROM auth.users u
WHERE p.id = u.id
  AND (p.first_name IS NULL OR p.first_name = '')
  AND NULLIF(btrim(COALESCE(u.raw_user_meta_data->>'given_name', '')), '') IS NOT NULL;


-- ===========================================================================
-- NOTES (non-executing) — kept at the end so nothing above depends on them
-- ===========================================================================
--
-- ---------------------------------------------------------------------------
-- WHAT THIS DOES NOT COVER
-- ---------------------------------------------------------------------------
-- - Magic-link (email OTP) users have no name metadata at all. They are left
--   with first_name = '' by both the trigger and the backfill (no source).
--   Prompting them for a name is a separate UI follow-up (#402 thread).
-- - access_requests as a backfill source is out of scope here (see WHY above).
--
-- ---------------------------------------------------------------------------
-- DESIGN NOTES
-- ---------------------------------------------------------------------------
-- - split_full_name is IMMUTABLE and pure-SQL (no table access), safe to call
--   in the trigger and in the LATERAL backfill.
-- - handle_new_user stays SECURITY DEFINER with a pinned search_path per the
--   schema.sql convention for all definer functions (an unpinned search_path on
--   a DEFINER function is a privilege-escalation vector).
-- - The trigger keeps ON CONFLICT (id) DO NOTHING: idempotent, a pre-existing
--   profiles row is a no-op (unchanged from 014).
-- - The trigger NAME is reused verbatim from migration 014
--   (on_auth_user_created) so this REPLACES the existing trigger rather than
--   creating a duplicate.
--
-- ---------------------------------------------------------------------------
-- ROLLBACK
-- ---------------------------------------------------------------------------
-- The PART 3 backfill is NOT cleanly reversible: it overwrites first_name/
-- last_name in place and does not record the prior values. There is no undo
-- beyond restoring from a point-in-time backup. (The prior values were empty
-- strings for every row this migration touches, so the practical loss is nil,
-- but it is still a one-way data write.)
--
-- The trigger/function rollback restores the migration 014 behavior:
--   CREATE OR REPLACE FUNCTION public.handle_new_user()
--   RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
--   AS $$
--   BEGIN
--     INSERT INTO public.profiles (id, email, first_name, last_name)
--     VALUES (
--       NEW.id,
--       NEW.email,
--       COALESCE(NEW.raw_user_meta_data ->> 'given_name',  NEW.raw_user_meta_data ->> 'first_name', ''),
--       COALESCE(NEW.raw_user_meta_data ->> 'family_name', NEW.raw_user_meta_data ->> 'last_name',  '')
--     )
--     ON CONFLICT (id) DO NOTHING;
--     RETURN NEW;
--   END;
--   $$;
--   CREATE OR REPLACE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- And optionally drop the helper:
--   DROP FUNCTION IF EXISTS public.split_full_name(text);
--
-- Related: #402, follows #369 (migration 014)
