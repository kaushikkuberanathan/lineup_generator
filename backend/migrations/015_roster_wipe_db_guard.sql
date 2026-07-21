-- Migration 015: database-layer roster-wipe guard on team_data
--
-- APPLIED TO DEV: 2026-07-20 (psqvzppphdedqkpmarwx) - verified: blocks empty-over-nonempty on Mud Hens and Bananas, allows normal saves.
-- APPLIED TO PROD: 2026-07-20 (hzaajccyurlyeweekvma) - verified: blocks empty-over-nonempty (11 players on Mud Hens), allows non-empty writes.
--
-- Repo record of a trigger to be created DEV-first, committed after
-- verification. Same convention as migrations 005-014.
--
-- ---------------------------------------------------------------------------
-- WHY
-- ---------------------------------------------------------------------------
-- rosterWipeGuard in backend/src/routes/teamData.js only protects the backend
-- route POST /api/teams/:teamId/data. The frontend's dbSaveTeamData
-- (frontend/src/supabase.js) writes DIRECT to PostgREST via the anon/authed
-- client and bypasses that route entirely, so the PRIMARY save path is
-- unguarded. team_data.roster is `jsonb NOT NULL DEFAULT '[]'::jsonb` with no
-- CHECK, so an empty-roster write over a live team succeeds regardless of
-- client. See #386: a real 11-player team took an incoming roster=0 write.
--
-- This trigger moves the guarantee to the database layer, where every client
-- path (frontend direct-to-PostgREST, scripts, manual SQL) is subject to it.
--
-- ---------------------------------------------------------------------------
-- WHAT THIS DOES NOT COVER
-- ---------------------------------------------------------------------------
-- - Partial shrinkage (e.g. 11 -> 2 players) is NOT blocked. This guard fires
--   ONLY on the total-wipe case: incoming roster empty over a non-empty
--   existing roster. Delta/ratio shrink detection is out of scope.
-- - schedule, grid, batting_order, practices are NOT guarded. An empty
--   schedule or grid over a populated one still writes without objection.
--   This mirrors the route guard, which is roster-only.
--
-- ---------------------------------------------------------------------------
-- SERVICE_ROLE EXEMPTION
-- ---------------------------------------------------------------------------
-- The backend service_role path is exempt: the backend route has its own
-- rosterWipeGuard with an explicit `force: true` override for legitimate
-- admin/recovery wipes (e.g. deleting a team's data intentionally). Blocking
-- service_role here would break that override and the recovery endpoint. All
-- frontend/user writes run as anon or authenticated and remain fully guarded.
--
-- The claim is read from request.jwt.claims. If that setting is absent or
-- unparseable (non-PostgREST context, malformed JWT), we FAIL CLOSED: the
-- write is treated as NOT service_role and the guard applies. A missing claim
-- must never silently exempt a write.
--
-- ---------------------------------------------------------------------------
-- DESIGN NOTES
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER + pinned search_path per the schema.sql convention for all
--   definer functions (an unpinned search_path on a DEFINER function is a
--   privilege-escalation vector).
-- BEFORE UPDATE only: an INSERT with an empty roster is a legitimate new team
--   and must be allowed. Only an UPDATE can destroy an existing roster.
-- RAISE EXCEPTION uses ERRCODE 'P0001' (raise_exception) so the client sees a
--   distinct, catchable error naming the team and the count that was protected.
--
-- ---------------------------------------------------------------------------
-- ROLLBACK
-- ---------------------------------------------------------------------------
--   DROP TRIGGER IF EXISTS trg_guard_roster_wipe ON public.team_data;
--   DROP FUNCTION IF EXISTS public.guard_roster_wipe();
--
-- Related: #386

CREATE OR REPLACE FUNCTION public.guard_roster_wipe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_existing_count int;
BEGIN
  -- service_role is exempt (backend route owns its own force-flag guard).
  -- Fail closed: absent or unparseable claims are treated as NOT service_role.
  BEGIN
    v_role := current_setting('request.jwt.claims', true)::json ->> 'role';
  EXCEPTION WHEN others THEN
    v_role := NULL;
  END;

  IF v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Incoming roster has players — not an empty write, nothing to guard.
  IF jsonb_array_length(COALESCE(NEW.roster, '[]'::jsonb)) > 0 THEN
    RETURN NEW;
  END IF;

  -- Existing roster is already empty — nothing to lose.
  v_existing_count := jsonb_array_length(COALESCE(OLD.roster, '[]'::jsonb));
  IF v_existing_count = 0 THEN
    RETURN NEW;
  END IF;

  -- Empty incoming over a non-empty existing roster — block it.
  RAISE EXCEPTION
    'ROSTER_WIPE_BLOCKED: refusing to write an empty roster over % existing players for team %',
    v_existing_count, OLD.team_id
    USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_roster_wipe ON public.team_data;
CREATE TRIGGER trg_guard_roster_wipe
  BEFORE UPDATE ON public.team_data
  FOR EACH ROW EXECUTE FUNCTION public.guard_roster_wipe();
