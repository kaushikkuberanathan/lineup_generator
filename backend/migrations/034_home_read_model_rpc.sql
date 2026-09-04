-- Migration 034: single-round-trip Home read-model RPC
-- Issue: #1072 (GET /api/v1/home server latency p95 816ms vs. §29.2's 300ms
-- budget — root-caused to Render (Oregon) <-> Supabase (us-east-1) being in
-- different AWS regions, doubled by the route's two SEQUENTIAL round trips:
-- team_memberships, then teams + team_data. Region colocation is the larger
-- lever and is a separate infra decision (tracked on #1072, not this
-- migration) — this migration is the code-level mitigation available today:
-- collapse the two sequential round trips into one.
--
-- NOT YET APPLIED ANYWHERE. Build/verify on DEV (psqvzppphdedqkpmarwx) first,
-- per this repo's own established migration-apply convention (see
-- backend/CLAUDE.md's Migration Notes for prior examples) — PROD apply needs
-- its own explicit go-ahead, same as every other migration in this file's
-- history.
--
-- home_read_model() runs the membership lookup and the teams/team_data joins
-- inside one Postgres statement, so PostgREST executes it as a single HTTP
-- round trip instead of two sequential ones. No RLS bypass is introduced:
-- GET /api/v1/home already reads exclusively via supabaseAdmin (the
-- service_role client, which bypasses RLS entirely per
-- backend/src/lib/supabase.js's own header) — this function is SECURITY
-- INVOKER, runs with the caller's own (service_role) privileges, and its
-- EXECUTE grant is restricted to service_role only, so it cannot be reached
-- by anon/authenticated even if a client guessed the RPC name.
--
-- Idempotent: CREATE OR REPLACE FUNCTION and REVOKE/GRANT are safe to repeat.

BEGIN;

CREATE OR REPLACE FUNCTION public.home_read_model(p_user_id uuid, p_email text)
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
    'memberships', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('team_id', team_id, 'role', role, 'status', status))
       FROM active_memberships),
      '[]'::jsonb
    ),
    'teams', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
         'id', t.id, 'name', t.name, 'age_group', t.age_group,
         'season', t.season, 'year', t.year, 'sport', t.sport
       ))
       FROM public.teams t
       WHERE t.id IN (SELECT team_id FROM member_team_ids)),
      '[]'::jsonb
    ),
    'team_data', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
         'team_id', td.team_id, 'roster', td.roster, 'schedule', td.schedule,
         'grid', td.grid, 'batting_order', td.batting_order, 'locked', td.locked,
         'attendance_overrides', td.attendance_overrides
       ))
       FROM public.team_data td
       WHERE td.team_id IN (SELECT team_id FROM member_team_ids)),
      '[]'::jsonb
    )
  );
$function$;

REVOKE ALL ON FUNCTION public.home_read_model(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.home_read_model(uuid, text) TO service_role;

COMMIT;

-- Verification queries are intentionally read-only and can be run after apply:
--
-- SELECT has_function_privilege('service_role', 'public.home_read_model(uuid, text)', 'EXECUTE') AS service_role_execute,
--        has_function_privilege('anon', 'public.home_read_model(uuid, text)', 'EXECUTE') AS anon_execute,
--        has_function_privilege('authenticated', 'public.home_read_model(uuid, text)', 'EXECUTE') AS auth_execute;
-- Expected: service_role_execute = true, the other two = false.
--
-- SELECT public.home_read_model(
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   'nobody@example.invalid'
-- );
-- Expected: {"memberships": [], "teams": [], "team_data": []} — a
-- non-existent identity resolves to empty arrays, not an error.
