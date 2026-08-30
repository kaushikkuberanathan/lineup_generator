-- Migration 032: post-v3.1 database permission hardening
-- Issues: #961, #962, #963
-- APPLIED TO DEV: 2026-08-30 (ledger 20260830160330); catalog, service-role
-- probe, RLS suite, and Security Advisor verified.
-- APPLIED TO PROD: 2026-08-30 (ledger 20260830160406); same verification.
--
-- Idempotent: REVOKE/GRANT, ALTER FUNCTION, CREATE OR REPLACE FUNCTION,
-- ALTER POLICY and DROP FUNCTION IF EXISTS are safe to repeat.
--
-- The private.is_active_admin() move is deliberate: the helper must remain
-- SECURITY DEFINER to avoid recursive team_memberships RLS evaluation, but it
-- does not need to be an exposed PostgREST RPC. Trigger functions likewise do
-- not need direct client EXECUTE. restore_game_state remains an intentional
-- public RPC, but its target tables already grant and policy the same client
-- roles, so SECURITY INVOKER preserves behavior without privilege escalation.

BEGIN;

-- #961: legal consent records are written only by the backend service role.
-- RLS does not govern TRUNCATE, so remove the client grants themselves.
REVOKE ALL PRIVILEGES ON TABLE public.legal_consents FROM anon, authenticated;

-- #963: pin every function currently reported by advisor lint 0011. These
-- functions use only pg_catalog built-ins and do not resolve public objects.
ALTER FUNCTION public.set_updated_at() SET search_path = pg_catalog;
ALTER FUNCTION public.split_full_name(text) SET search_path = pg_catalog;
ALTER FUNCTION public.update_updated_at() SET search_path = pg_catalog;

-- #962: move the RLS-only admin helper out of the exposed public schema.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_memberships
    WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
  );
$function$;

REVOKE ALL ON FUNCTION private.is_active_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_active_admin() TO authenticated, service_role;

ALTER POLICY admin_manages_requests ON public.access_requests
  USING (private.is_active_admin())
  WITH CHECK (private.is_active_admin());

ALTER POLICY "feedback: admin select" ON public.feedback
  USING (private.is_active_admin());

ALTER POLICY admin_manages_memberships ON public.team_memberships
  USING (private.is_active_admin())
  WITH CHECK (private.is_active_admin());

DROP FUNCTION IF EXISTS public.is_active_admin();

-- Trigger-only/internal SECURITY DEFINER functions are never client RPCs.
REVOKE ALL ON FUNCTION public.guard_roster_wipe() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_team() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prune_roster_snapshots() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prune_team_data_history() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.snapshot_team_data() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.guard_roster_wipe() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_team() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.prune_roster_snapshots() TO service_role;
GRANT EXECUTE ON FUNCTION public.prune_team_data_history() TO service_role;
GRANT EXECUTE ON FUNCTION public.snapshot_team_data() TO service_role;

-- This is the sole intentional client RPC in the advisor list. Its tables are
-- already accessible to anon/authenticated under the pre-Phase-4C scoring
-- policies, so invoker rights preserve the current contract and remove the
-- SECURITY DEFINER escalation path.
ALTER FUNCTION public.restore_game_state(text, text, uuid, text) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.restore_game_state(text, text, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_game_state(text, text, uuid, text)
  TO anon, authenticated, service_role;

COMMIT;

-- Verification queries are intentionally read-only and can be run after apply:
--
-- SELECT grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'public' AND table_name = 'legal_consents'
--   AND grantee IN ('anon', 'authenticated');
-- Expected: zero rows.
--
-- SELECT n.nspname, p.oid::regprocedure, p.prosecdef, p.proconfig,
--        has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_execute
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE (n.nspname, p.proname) IN
--   (('private', 'is_active_admin'), ('public', 'guard_roster_wipe'),
--    ('public', 'handle_new_team'), ('public', 'handle_new_user'),
--    ('public', 'prune_roster_snapshots'), ('public', 'prune_team_data_history'),
--    ('public', 'restore_game_state'), ('public', 'set_updated_at'),
--    ('public', 'snapshot_team_data'), ('public', 'split_full_name'),
--    ('public', 'update_updated_at'))
-- ORDER BY 1, 2;
