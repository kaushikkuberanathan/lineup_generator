-- Migration 014: auto-provision a profiles row on new auth user
--
-- APPLIED TO DEV: 2026-07-15 (psqvzppphdedqkpmarwx) — verified: trigger fires,
--   both the magic-link ('' names) and OAuth (metadata names) branches work,
--   cascade delete confirmed.
-- NOT YET APPLIED TO PROD (hzaajccyurlyeweekvma). Apply as part of the #369 /
--   WS-3 cutover.
--
-- Repo record of a trigger created DEV-first, committed after verification.
-- Same convention as migrations 005-013.
--
-- ---------------------------------------------------------------------------
-- WHY
-- ---------------------------------------------------------------------------
-- profiles rows were NEVER created for new users. No trigger on auth.users,
-- no insert in any callback. The only INSERT INTO profiles lived in
-- activate_membership(), dropped in prod (migration 012). Result: GET /me
-- runs profiles.eq('id',userId).single() -> PGRST116 -> throw -> 500 for
-- EVERY authenticated user. Confirmed via #369 DEV rehearsal (spike 1b2).
--
-- This trigger creates the profiles row at signup so it always exists by the
-- time /me runs. Piece 1 of 3 for #369.
--
-- ---------------------------------------------------------------------------
-- NO BACKFILL MIGRATION — BY DESIGN
-- ---------------------------------------------------------------------------
-- This trigger fires on auth.users INSERT, so it only provisions NEW users.
-- Users that predate the trigger have no profiles row and are NOT backfilled
-- by this migration. That is deliberate: the pre-existing user count is
-- trivial (1-2 in DEV, confirm in prod at cutover), so those rows are
-- provisioned MANUALLY rather than via a backfill script.
--
-- WS-3 CUTOVER CHECKLIST ITEM: before enabling the auth gate in prod, insert
-- a profiles row for every pre-trigger prod auth.users entry that lacks one:
--   INSERT INTO public.profiles (id, email, first_name, last_name)
--   SELECT u.id, u.email, '', '' FROM auth.users u
--   LEFT JOIN public.profiles p ON p.id = u.id
--   WHERE p.id IS NULL;
-- (Run once, at cutover, after confirming the count is small.)
--
-- ---------------------------------------------------------------------------
-- DESIGN NOTES
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER + pinned search_path per the schema.sql convention for all
--   definer functions (an unpinned search_path on a DEFINER function is a
--   privilege-escalation vector).
-- NOT NULL names: profiles.first_name/last_name are NOT NULL, but a magic-link
--   signup carries no name. COALESCE pulls given_name/family_name from
--   raw_user_meta_data (covers Google OAuth), else falls through to ''.
-- ON CONFLICT DO NOTHING: idempotent — a pre-existing profiles row is a no-op.
--
-- ---------------------------------------------------------------------------
-- ROLLBACK
-- ---------------------------------------------------------------------------
--   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--   DROP FUNCTION IF EXISTS public.handle_new_user();
--
-- Related: #369, blocks #342

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'given_name',  NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'family_name', NEW.raw_user_meta_data ->> 'last_name',  '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
