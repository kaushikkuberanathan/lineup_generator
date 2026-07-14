-- Migration 013: read-only grant-introspection helper for the #348 RLS suite
--
-- APPLIED TO DEV: 2026-07-14 (psqvzppphdedqkpmarwx)
-- NOT YET APPLIED TO PROD. Apply as part of WS-3 verification.
--
-- Repo record of a function created directly in DEV, committed after the fact
-- so the repo and the database do not diverge. Same convention as 005-012.
--
-- ---------------------------------------------------------------------------
-- WHY THIS EXISTS
-- ---------------------------------------------------------------------------
-- Test S4b in backend/src/__tests__/rls/policies.test.js must assert that anon
-- holds NO TRUNCATE/DELETE grant on the three exposed tables.
--
-- This matters more than it sounds. TRUNCATE BYPASSES RLS ENTIRELY. Enabling
-- RLS in WS-3 does nothing to stop it. The only defence is revoking the grant.
-- Every other test in the #348 suite turns green under an RLS-only cutover
-- while the anon key retains the ability to empty every table. S4b is the only
-- assertion that catches that incomplete fix.
--
-- PostgREST cannot reach information_schema over REST (it prefixes every
-- relation with `public.` -> PGRST205, "could not find the table
-- 'public.information_schema.role_table_grants'"). So the catalog query has to
-- happen inside the database and be exposed as an RPC.
--
-- ---------------------------------------------------------------------------
-- SAFETY
-- ---------------------------------------------------------------------------
-- Read-only. STABLE. Returns catalog metadata only - no table data, no PII.
-- EXECUTE granted to service_role ONLY; anon and authenticated cannot call it.
-- search_path is pinned per the schema.sql convention: an unpinned search_path
-- on a SECURITY DEFINER function is a privilege-escalation vector.
--
-- ---------------------------------------------------------------------------
-- ROLLBACK
-- ---------------------------------------------------------------------------
--   DROP FUNCTION IF EXISTS public.rls_test_anon_grants(text[]);
--
-- Related: GitHub #348, #342

CREATE OR REPLACE FUNCTION public.rls_test_anon_grants(table_names text[])
RETURNS TABLE (table_name text, privilege_type text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = information_schema, public
STABLE
AS $$
  SELECT table_name::text, privilege_type::text
  FROM information_schema.role_table_grants
  WHERE grantee = 'anon'
    AND table_schema = 'public'
    AND table_name = ANY(table_names)
    AND privilege_type IN ('TRUNCATE', 'DELETE');
$$;

GRANT EXECUTE ON FUNCTION public.rls_test_anon_grants(text[]) TO service_role;


-- ---------------------------------------------------------------------------
-- VERIFICATION (run after applying)
-- ---------------------------------------------------------------------------
-- Expect SIX rows today - DELETE and TRUNCATE on each of the three exposed
-- tables. Expect ZERO rows after WS-3 revokes the grants.
--
--   SELECT * FROM public.rls_test_anon_grants(
--     ARRAY['team_data','teams','roster_snapshots']
--   );
--
-- Confirmed against DEV 2026-07-14 - six rows returned:
--   anon:DELETE on teams              anon:TRUNCATE on teams
--   anon:DELETE on roster_snapshots   anon:TRUNCATE on roster_snapshots
--   anon:DELETE on team_data          anon:TRUNCATE on team_data
