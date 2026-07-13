-- Migration 009: P0 HOTFIX - request-access was BROKEN in production
--
-- APPLIED TO PRODUCTION: 2026-07-13 (Supabase ledger 20260713172035)
-- Repo record of a hotfix applied directly to prod.
--
-- Idempotent: DROP CONSTRAINT IF EXISTS guards the re-add.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT BROKE, AND WHO BROKE IT
-- ─────────────────────────────────────────────────────────────────────────────
-- v2.5.31 (WS-1, commit a51db38) added ingestion normalization to
-- POST /api/v1/auth/request-access. It translates the incoming role to a canonical
-- value BEFORE inserting into access_requests:
--
--   Head Coach       -> 'admin'
--   Assistant Coach  -> 'coach'
--   Team Coordinator -> 'coach'
--   Parent           -> 'viewer'
--
-- But the LIVE CHECK constraint on access_requests.requested_role only permitted:
--
--   ('team_admin', 'coordinator', 'coach', 'scorekeeper', 'parent')
--
-- 'admin' and 'viewer' are NOT in that list. Verified by direct probe against prod:
--
--   admin       -> REJECTED (check_violation)
--   viewer      -> REJECTED (check_violation)
--   coach       -> ACCEPTED
--
-- CONSEQUENCE: from the moment v2.5.31 shipped until this hotfix, anyone selecting
-- "Head Coach" or "Parent" on the PUBLIC request-access form got a 500. Assistant
-- Coach and Team Coordinator still worked (both normalize to 'coach').
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY IT WAS MISSED - the lesson, stated plainly
-- ─────────────────────────────────────────────────────────────────────────────
-- WS-1 was built entirely against the constraint declared in the REPO
-- (backend/src/db/migrations/003_create_team_memberships.sql, which lists four
-- roles). The LIVE database was never asked what it actually enforced.
--
-- Production's real constraints had drifted outside version control:
--   - team_memberships allows SEVEN roles, not four (incl. team_admin, coordinator,
--     parent). So the "CHECK violation on approve-link" that WS-1 was written to fix
--     WOULD NOT HAVE OCCURRED. That diagnosis was wrong.
--   - access_requests allows FIVE roles, excluding exactly the two canonical values
--     WS-1 normalizes toward.
--
-- The WS-1 test suite passed - including WS1-14, which specifically asserts
-- "requestedRole team_admin -> persists canonical admin". It passed because it
-- asserts on a MOCKED insert payload. The mock proved the code did what was
-- intended. Nothing proved the DATABASE would accept it.
--
-- Every backend test mocks supabaseAdmin. No test has ever exercised a real database
-- constraint. That is #348.
--
-- This is the SECOND time in one day that a file describing the database turned out
-- to be describing a database that does not exist (the first: 004_rls_fixes.sql's
-- false SECURITY DEFINER claim). The root cause is #351 - the repo and the database
-- have never been in sync, and nothing detects the difference.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE FIX
-- ─────────────────────────────────────────────────────────────────────────────
-- Widen the CHECK to accept BOTH the canonical values WS-1 writes AND the legacy
-- values still present in 596 existing rows. Purely additive: no existing row is
-- invalidated, no backfill required.
--
-- This is a STOPGAP, not the end state. The correct cleanup is to normalize the 596
-- legacy rows and then tighten the CHECK to canonical-only. That is schema work and
-- belongs with WS-3, not an emergency hotfix.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (WARNING: rolling back RE-BREAKS Head Coach / Parent request-access)
-- ─────────────────────────────────────────────────────────────────────────────
--   ALTER TABLE public.access_requests
--     DROP CONSTRAINT access_requests_requested_role_check;
--   ALTER TABLE public.access_requests
--     ADD CONSTRAINT access_requests_requested_role_check
--     CHECK (requested_role IS NULL OR requested_role = ANY
--            (ARRAY['team_admin','coordinator','coach','scorekeeper','parent']));


ALTER TABLE public.access_requests
  DROP CONSTRAINT IF EXISTS access_requests_requested_role_check;

ALTER TABLE public.access_requests
  ADD CONSTRAINT access_requests_requested_role_check
  CHECK (
    requested_role IS NULL
    OR requested_role = ANY (ARRAY[
      -- canonical: what WS-1 / v2.5.31 writes
      'admin'::text,
      'coach'::text,
      'scorekeeper'::text,
      'viewer'::text,
      -- legacy: 596 existing rows, plus any stale cached frontend bundle
      'team_admin'::text,
      'coordinator'::text,
      'parent'::text
    ])
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION (run after applying)
-- ─────────────────────────────────────────────────────────────────────────────
-- Probes every role value against the live constraint and cleans up after itself.
-- Expect: all seven ACCEPTED, 'wizard' REJECTED.
--
--   CREATE OR REPLACE FUNCTION public.__tmp_check_probe()
--   RETURNS TABLE(role_value text, insert_result text)
--   LANGUAGE plpgsql AS $$
--   BEGIN
--     FOREACH role_value IN ARRAY ARRAY['admin','viewer','coach','scorekeeper',
--                                       'team_admin','coordinator','parent','wizard'] LOOP
--       BEGIN
--         INSERT INTO public.access_requests
--           (first_name,last_name,email,team_id,requested_role,status)
--         VALUES ('zzprobe','zzprobe','zzprobe_'||role_value||'@example.invalid',
--                 '1774297491626',role_value,'pending');
--         insert_result := 'ACCEPTED';
--       EXCEPTION
--         WHEN check_violation THEN insert_result := 'REJECTED - check_violation';
--         WHEN others          THEN insert_result := 'REJECTED - ' || SQLERRM;
--       END;
--       RETURN NEXT;
--     END LOOP;
--     DELETE FROM public.access_requests WHERE email LIKE 'zzprobe%@example.invalid';
--   END $$;
--
--   SELECT * FROM public.__tmp_check_probe();
--   DROP FUNCTION public.__tmp_check_probe();
