-- Migration 035: single-round-trip Account/Identity read model (#1131)
-- NOT YET APPLIED TO DEV OR PROD.
--
-- Resolves the caller profile, active memberships, and matching team rows in
-- one Postgres statement. SECURITY INVOKER plus service_role-only EXECUTE
-- matches migration 034's established private read-model boundary.

BEGIN;

CREATE OR REPLACE FUNCTION public.account_read_model(p_user_id uuid, p_email text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
  WITH active_memberships AS (
    SELECT team_id, role, status
    FROM public.team_memberships
    WHERE status = 'active'
      AND (user_id = p_user_id OR email = p_email)
  ),
  member_team_ids AS (
    SELECT DISTINCT team_id FROM active_memberships
  )
  SELECT jsonb_build_object(
    'profile', (
      SELECT jsonb_build_object(
        'id', p.id,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'email', p.email
      )
      FROM public.profiles p
      WHERE p.id = p_user_id
      LIMIT 1
    ),
    'memberships', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
         'team_id', team_id, 'role', role, 'status', status
       ) ORDER BY team_id)
       FROM active_memberships),
      '[]'::jsonb
    ),
    'teams', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
         'id', t.id, 'name', t.name, 'age_group', t.age_group,
         'season', t.season, 'year', t.year, 'sport', t.sport
       ) ORDER BY t.id)
       FROM public.teams t
       WHERE t.id IN (SELECT team_id FROM member_team_ids)),
      '[]'::jsonb
    )
  );
$function$;

REVOKE ALL ON FUNCTION public.account_read_model(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_read_model(uuid, text) TO service_role;

COMMIT;

-- Read-only post-apply verification:
-- SELECT has_function_privilege('service_role', 'public.account_read_model(uuid, text)', 'EXECUTE') AS service_role_execute,
--        has_function_privilege('anon', 'public.account_read_model(uuid, text)', 'EXECUTE') AS anon_execute,
--        has_function_privilege('authenticated', 'public.account_read_model(uuid, text)', 'EXECUTE') AS authenticated_execute;
-- Expected: true, false, false.
