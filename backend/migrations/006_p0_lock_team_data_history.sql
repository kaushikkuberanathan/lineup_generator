-- Migration 006: P0 SECURITY FIX - lock team_data_history
--
-- APPLIED TO PRODUCTION: 2026-07-13 (Supabase ledger version 20260713144129)
-- Repo record of a migration applied directly to prod under an active exposure.
--
-- Idempotent: safe to re-run.
--
-- ---------------------------------------------------------------------------
-- WHAT WAS WRONG
-- ---------------------------------------------------------------------------
-- team_data_history had:
--   RLS: DISABLED
--   Grants to anon: SELECT, INSERT, UPDATE, DELETE, TRUNCATE
--
-- 2,810 historical roster snapshots - every roster edit ever made, containing
-- children's names - were publicly readable and TRUNCATE-able with the anon key
-- that ships in the frontend bundle.
--
-- Note the four-layer roster-wipe defence (Postgres trigger, backend 409 guard,
-- recovery UI, manual export) all lives in the BACKEND. The anon key goes around
-- all four.
--
-- ---------------------------------------------------------------------------
-- !! THE TRAP - READ THIS BEFORE TOUCHING 004_rls_fixes.sql
-- ---------------------------------------------------------------------------
-- 004_rls_fixes.sql states that snapshot_team_data() is SECURITY DEFINER.
--
--   IT IS NOT. Verified against prod: pg_proc.prosecdef = false.
--
-- A non-DEFINER trigger runs as the INVOKER. Coaches save team_data with the
-- ANON key (the frontend writes Supabase directly - it does NOT use the backend
-- teamData route). So the trigger's insert into team_data_history executes AS
-- ANON.
--
-- Enabling RLS on team_data_history with no policies - which is what 004 does -
-- would therefore BLOCK the trigger's insert, the trigger would fail, and
-- EVERY COACH'S ROSTER SAVE WOULD FAIL.
--
-- 004 as written is a live landmine. Its header has been corrected; do not run
-- it without reading that correction.
--
-- ---------------------------------------------------------------------------
-- THE FIX
-- ---------------------------------------------------------------------------
-- Make the trigger functions SECURITY DEFINER so they run as their owner
-- (postgres) and bypass RLS. The anon write path to team_data is untouched.
--
-- search_path is pinned to public. A SECURITY DEFINER function without a fixed
-- search_path is itself a privilege-escalation vector (a caller could shadow
-- an unqualified table name with one in their own schema).
--
-- ---------------------------------------------------------------------------
-- PROVEN, NOT ASSUMED
-- ---------------------------------------------------------------------------
-- After applying, an UPDATE on team_data was executed AS THE ANON ROLE - exactly
-- what a coach's save does. team_data_history went 2,810 -> 2,811. The trigger
-- fired into the locked table. Saves work. See the verification block below to
-- re-run this test.
--
-- ---------------------------------------------------------------------------
-- ROLLBACK
-- ---------------------------------------------------------------------------
--   ALTER FUNCTION public.snapshot_team_data() SECURITY INVOKER;
--   ALTER FUNCTION public.prune_team_data_history() SECURITY INVOKER;
--   ALTER TABLE public.team_data_history DISABLE ROW LEVEL SECURITY;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_data_history TO anon, authenticated;
--
-- Related: GitHub #342


-- ---------------------------------------------------------------------------
-- 1. Trigger runs as owner (postgres) -> bypasses RLS on team_data_history.
--    The function BODY is byte-identical to the pre-existing definition.
--    Only the security context and search_path change.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.snapshot_team_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
  insert into team_data_history (team_id, snapshot, write_source)
  values (
    NEW.team_id,
    jsonb_build_object(
      'roster',        coalesce(NEW.roster,        '[]'::jsonb),
      'schedule',      coalesce(NEW.schedule,      '[]'::jsonb),
      'practices',     coalesce(NEW.practices,     '[]'::jsonb),
      'batting_order', coalesce(NEW.batting_order, '[]'::jsonb),
      'grid',          coalesce(NEW.grid,          '{}'::jsonb),
      'innings',       NEW.innings,
      'locked',        NEW.locked
    ),
    coalesce(current_setting('app.write_source', true), 'unknown')
  );
  return NEW;
end;
$function$;


-- ---------------------------------------------------------------------------
-- 2. The prune helper DELETEs from team_data_history. Same treatment, or it
--    would be blocked by RLS the same way.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prune_team_data_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
  delete from team_data_history
  where id not in (
    select id
    from (
      select id,
             row_number() over (partition by team_id order by written_at desc) as rn
      from team_data_history
    ) ranked
    where rn <= 20
  );
end;
$function$;


-- ---------------------------------------------------------------------------
-- 3. Lock the table. No policies = denied for anon and authenticated.
--    service_role bypasses RLS (backend recovery reads keep working).
--    The trigger now bypasses RLS too (step 1), so roster saves keep working.
-- ---------------------------------------------------------------------------
ALTER TABLE public.team_data_history ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- 4. Defence in depth: revoke the grants outright.
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.team_data_history FROM anon;
REVOKE ALL ON public.team_data_history FROM authenticated;


-- ---------------------------------------------------------------------------
-- VERIFICATION (run after applying)
-- ---------------------------------------------------------------------------
-- A. State. Expect: rls_on = true, trigger_is_definer = true, anon_grants = NONE
--
--   SELECT c.relrowsecurity AS rls_on,
--          (SELECT p.prosecdef FROM pg_proc p
--             JOIN pg_namespace pn ON pn.oid = p.pronamespace
--            WHERE pn.nspname='public' AND p.proname='snapshot_team_data')
--            AS trigger_is_definer,
--          COALESCE((SELECT string_agg(DISTINCT g.grantee, ',')
--                    FROM information_schema.role_table_grants g
--                    WHERE g.table_schema='public'
--                      AND g.table_name='team_data_history'
--                      AND g.grantee IN ('anon','authenticated')), 'NONE') AS anon_grants
--   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
--   WHERE n.nspname='public' AND c.relname='team_data_history';
--
-- B. THE IMPORTANT ONE - prove roster saves still work. This UPDATEs team_data
--    as the ANON role (what a coach's save does) and asserts the trigger still
--    wrote to the locked history table. If this RAISEs, saves are broken.
--
--   DO $$
--   DECLARE before_count int; after_count int; test_team text;
--   BEGIN
--     SELECT count(*) INTO before_count FROM public.team_data_history;
--     SELECT team_id  INTO test_team    FROM public.team_data LIMIT 1;
--     SET LOCAL ROLE anon;
--     UPDATE public.team_data SET locked = locked WHERE team_id = test_team;
--     RESET ROLE;
--     SELECT count(*) INTO after_count FROM public.team_data_history;
--     IF after_count <= before_count THEN
--       RAISE EXCEPTION 'FAIL: trigger did not insert. Roster saves are BROKEN.';
--     END IF;
--   END $$;
--
--    (Note: this test writes one history row. Harmless - the prune helper keeps
--     the last 20 per team.)
