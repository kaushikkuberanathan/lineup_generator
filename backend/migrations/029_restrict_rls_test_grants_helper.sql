-- Migration 029: make the migration-013 catalog helper service-role-only.
--
-- Migration 013 granted EXECUTE to service_role but did not revoke PostgreSQL's
-- default EXECUTE grant to PUBLIC. Because anon/authenticated inherit PUBLIC,
-- the SECURITY DEFINER RPC remained callable through PostgREST. The function is
-- read-only and returns only grant metadata, but its documented privilege
-- boundary was false and Supabase's security advisor correctly flagged it.
--
-- DEV remediation. PROD does not contain this helper and does not need it.

DO $block$
BEGIN
  IF to_regprocedure('public.rls_test_anon_grants(text[])') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.rls_test_anon_grants(text[]) FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.rls_test_anon_grants(text[]) FROM anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.rls_test_anon_grants(text[]) TO service_role;
  END IF;
END
$block$;
