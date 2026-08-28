-- Migration 026: write_source role-based fallback (#379)
--
-- APPLIED TO DEV: 2026-08-28 (psqvzppphdedqkpmarwx), applied and verified live
-- this session. NOT YET APPLIED TO PROD (hzaajccyurlyeweekvma) — needs an
-- explicit go-ahead before touching prod, same as any other schema/function
-- change; see the verification section below for exactly what to re-check
-- after applying there.
--
-- ---------------------------------------------------------------------------
-- WHY
-- ---------------------------------------------------------------------------
-- team_data_history.write_source has been 'unknown' on every single row —
-- confirmed live against PROD 2026-08-28: all 3,000 rows. #379's earlier
-- closure (based on code review of backend/src/routes/teamData.js alone,
-- never checked against live data) was wrong; reopened with the root cause
-- below.
--
-- backend/src/routes/teamData.js sets app.write_source via a SEPARATE
-- Supabase RPC call (`supabaseAdmin.rpc('set_config', { is_local: true })`)
-- before a SEPARATE `.upsert()` call. Each Supabase/PostgREST call runs in
-- its own transaction. `is_local: true` scopes the setting to the
-- transaction it was set in, which ends the moment that RPC call returns —
-- long before the upsert's own, later transaction begins. The setting the
-- trigger reads was never in scope for the write it's meant to tag.
--
-- This affects EVERY write path, not just the backend route. Per this
-- table's own migration 006 header: "the frontend writes Supabase directly -
-- it does NOT use the backend teamData route" — frontend/src/supabase.js's
-- dbSaveTeamData() upserts team_data directly from the browser via the
-- Supabase JS client, which never touches app.write_source at all. That
-- direct-write path is the dominant one in practice (every roster/schedule
-- autosave); the backend route is secondary.
--
-- ---------------------------------------------------------------------------
-- FIX
-- ---------------------------------------------------------------------------
-- Rather than trying to make a session variable survive across separate
-- stateless REST calls (fragile, and wouldn't help the direct-frontend path
-- at all), capture the Postgres ROLE the write came in as — anon /
-- authenticated / service_role — and use it as the fallback. This is exactly
-- what #379's own body proposed ("Consider whether the history trigger/
-- insert can capture the Postgres role as a fallback... the role alone would
-- tell you a great deal about the origin, without touching every call
-- site"), and it requires zero changes to any route handler or frontend
-- write path — every write already carries its role, unconditionally.
--
-- Two triggers, not one, and the split matters:
--   1. capture_write_source_role() — a plain SECURITY INVOKER function on a
--      NEW *BEFORE* trigger. Runs as whatever role actually performed the
--      write (anon/authenticated/service_role), so current_user here is the
--      real caller. Stashes it into a transaction-scoped custom GUC
--      (set_config(..., true)) that the AFTER trigger, firing later in the
--      SAME statement/transaction, can read back.
--   2. snapshot_team_data() (existing, migration 006) stays SECURITY
--      DEFINER — it has to be, to bypass RLS and write into the locked
--      team_data_history table. But that's exactly why it CAN'T read the
--      real caller's role directly: current_user inside a SECURITY DEFINER
--      function is already the function's owner (postgres) by the time the
--      body executes, not the caller. Hence trigger #1 doing the capture
--      *before* that context switch happens, and trigger #2 reading the
--      stashed value back out instead of reading current_user itself.
--
-- A single combined function was tried first and does NOT work — an
-- earlier draft of this migration used current_setting('role', true)
-- directly inside the SECURITY DEFINER function, on the assumption that
-- Postgres's SET ROLE value survives independently of current_user. It
-- doesn't: 'role' isn't a real Postgres GUC name, current_setting('role')
-- silently returns NULL (missing_ok), and the coalesce fell straight to
-- 'unknown' every time. Caught by testing against a real PostgREST request
-- (not simulated via SQL Editor SET LOCAL ROLE, which behaved inconsistently
-- through the Supabase Management API's query execution and wasn't a
-- reliable way to verify this) — a live POST through the actual backend
-- route (SUPABASE_TARGET=dev, real service_role key) against this two-
-- trigger version correctly recorded write_source='service_role'. Verified
-- 2026-08-28; test row cleaned up after.
--
-- app.write_source is left as the first choice in the coalesce — harmless,
-- and would still take priority if teamData.js's RPC+upsert are ever
-- combined into a single transactional call (a separate, larger follow-up,
-- not done here). This migration only fixes the FALLBACK, from a bare
-- 'unknown' string to the real calling role.
--
-- SECURITY DEFINER and SET search_path = public on snapshot_team_data() are
-- re-declared explicitly, not omitted: CREATE OR REPLACE FUNCTION does not
-- carry these forward automatically — a plain re-declaration without them
-- would silently revert to SECURITY INVOKER with no search_path pin, undoing
-- migration 006's fix and re-breaking every coach's roster save (the exact
-- failure mode 006's own header warns about at length). The function body is
-- otherwise byte-identical to migration 006's version; only the coalesce's
-- fallback argument changed.

CREATE OR REPLACE FUNCTION public.capture_write_source_role()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
  perform set_config('app.calling_role', current_user::text, true);
  return NEW;
end;
$function$;

DROP TRIGGER IF EXISTS trg_capture_write_source_role ON team_data;
CREATE TRIGGER trg_capture_write_source_role
  BEFORE INSERT OR UPDATE ON team_data
  FOR EACH ROW EXECUTE FUNCTION capture_write_source_role();

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
    coalesce(
      current_setting('app.write_source', true),
      current_setting('app.calling_role', true),
      'unknown'
    )
  );
  return NEW;
end;
$function$;

-- trg_snapshot_team_data itself needs no DROP/CREATE: CREATE OR REPLACE
-- FUNCTION updates the body in place and the existing trigger already points
-- at this function by name.

-- ---------------------------------------------------------------------------
-- ACCEPTANCE
-- ---------------------------------------------------------------------------
-- SET LOCAL ROLE-based simulation through the SQL Editor is NOT a reliable
-- way to verify this (see FIX section above) — it produced inconsistent
-- results in testing that didn't match real request behavior. Verify
-- against a real write instead:
--
--   1. Start the backend locally against the target project
--      (SUPABASE_TARGET=dev for DEV, or point at prod's own env for a prod
--      check) and POST a real team_data write through
--      POST /api/v1/teams/:teamId/data.
--   2. SELECT write_source FROM team_data_history WHERE team_id = '<id>'
--      ORDER BY written_at DESC LIMIT 1; — expect 'service_role' (the
--      backend always writes with the service-role key).
--   3. For the (dominant, in production) direct-frontend path, the same
--      query after a real coach save should show 'authenticated' (or
--      'anon' pre-login) instead of 'unknown'.
--
-- ---------------------------------------------------------------------------
-- ROLLBACK
-- ---------------------------------------------------------------------------
-- Drop the new trigger/function and restore migration 006's version of
-- snapshot_team_data() verbatim:
--
--   DROP TRIGGER IF EXISTS trg_capture_write_source_role ON team_data;
--   DROP FUNCTION IF EXISTS public.capture_write_source_role();
--
--   CREATE OR REPLACE FUNCTION public.snapshot_team_data()
--   RETURNS trigger LANGUAGE plpgsql
--   SECURITY DEFINER SET search_path = public
--   AS $function$
--   begin
--     insert into team_data_history (team_id, snapshot, write_source)
--     values (
--       NEW.team_id,
--       jsonb_build_object(
--         'roster',        coalesce(NEW.roster,        '[]'::jsonb),
--         'schedule',      coalesce(NEW.schedule,      '[]'::jsonb),
--         'practices',     coalesce(NEW.practices,     '[]'::jsonb),
--         'batting_order', coalesce(NEW.batting_order, '[]'::jsonb),
--         'grid',          coalesce(NEW.grid,          '{}'::jsonb),
--         'innings',       NEW.innings,
--         'locked',        NEW.locked
--       ),
--       coalesce(current_setting('app.write_source', true), 'unknown')
--     );
--     return NEW;
--   end;
--   $function$;
--
-- Related: #379, migration 002 (original trigger), migration 006 (SECURITY
-- DEFINER + search_path pin this preserves), migration 012 (the pinned-
-- search_path convention this follows), migration 017 (same class of fix —
-- CREATE OR REPLACE FUNCTION on an existing trigger, applied DEV then PROD).
