-- Migration 026: write_source role-based fallback (#379)
--
-- APPLIED TO DEV and PROD 2026-08-28. The final live implementation was
-- simplified after the first two-trigger attempt: PostgREST exposes the caller
-- role in request.jwt.claims, so the SECURITY DEFINER history trigger can read
-- that claim directly. This file is the canonical, replayable form of the live
-- function verified byte-for-byte on both projects on 2026-08-30.
--
-- The DROP statements remove the abandoned capture_write_source_role trigger
-- and function if an earlier revision of migration 026 was replayed locally.
-- They are safe no-ops against the final live DEV/PROD state.

DROP TRIGGER IF EXISTS trg_capture_write_source_role ON public.team_data;
DROP FUNCTION IF EXISTS public.capture_write_source_role();

CREATE OR REPLACE FUNCTION public.snapshot_team_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_role text;
begin
  BEGIN
    v_role := current_setting('request.jwt.claims', true)::json ->> 'role';
  EXCEPTION WHEN others THEN
    v_role := NULL;
  END;

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
      v_role,
      'unknown'
    )
  );
  return NEW;
end;
$function$;

-- Verification must use real PostgREST clients, not SET ROLE simulation:
-- service_role writes record service_role; authenticated writes record
-- authenticated. See writeSourceRoleFallback.test.js.
