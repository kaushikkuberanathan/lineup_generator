-- Migration 017: pin prune_roster_snapshots() as SECURITY DEFINER
--
-- APPLIED TO DEV: 2026-08-01 (psqvzppphdedqkpmarwx), via Supabase Dashboard
-- SQL Editor - "Success. No rows returned." Verified by re-running
-- `npm run test:rls` directly against DEV (not the ephemeral CI stack):
-- 15 pass / 0 fail, RS5 included - confirms the fix holds against a real,
-- persistent database, not just CI's throwaway Postgres instance.
--
-- NOT YET APPLIED TO PROD. Same DEV-first convention as migrations 005-016 -
-- PROD is a deliberate, separate step, not bundled into this one.
--
-- ---------------------------------------------------------------------------
-- WHY (#477 — discovered while writing roster_snapshots RLS test coverage)
-- ---------------------------------------------------------------------------
-- prune_roster_snapshots() (docs/db/schema.sql:529, and its un-numbered
-- ancestor backend/migrations/roster_snapshots.sql) is a plain INVOKER-rights
-- trigger function — no SECURITY DEFINER. It fires AFTER INSERT ON
-- roster_snapshots and DELETEs the rows past the most-recent 10 for that
-- team, running as whichever role performed the triggering INSERT.
--
-- Migration 004 (WS-3, shipped v2.6.0, 2026-07-20) revoked DELETE on
-- roster_snapshots FROM anon, authenticated — deliberately, since neither
-- role has a DELETE policy and revoking makes that intent explicit (004's own
-- comment: "no frontend path deletes them directly"). That reasoning
-- correctly covers direct client DELETEs. It did not account for this
-- trigger, which performs its OWN internal DELETE as a side effect of every
-- INSERT — and as an invoker-rights function, that DELETE is subject to the
-- SAME revoked grant.
--
-- Net effect: ANY insert into roster_snapshots by anon or authenticated now
-- fails outright with "permission denied for table roster_snapshots" (42501)
-- — the trigger's DELETE aborts the whole transaction, including the
-- original INSERT. Confirmed via backend/src/__tests__/rls/policies.test.js
-- RS5 (a coach inserting a snapshot for their own team, which
-- roster_snapshots_auth_insert's policy explicitly permits) — RS5 failed
-- with exactly this error against the CI ephemeral stack, not an RLS
-- rejection.
--
-- This is a LIVE production bug, not a hypothetical one: dbSnapshotRoster()
-- (frontend/src/supabase.js) is called from App.jsx on app load and on every
-- roster auto-save (5 call sites), using the same shared supabase-js client
-- that attaches a signed-in coach's session — so it runs as `authenticated`
-- for any logged-in coach, same as dbSaveTeamData/dbSaveTeams (see root
-- CLAUDE.md's Phase 4 Cutover section). Its insert is wrapped in a silent
-- catch ("snapshot is safety net, not critical path"), so this has been
-- failing on every app load and roster edit, for every team, with zero
-- surfaced error, since migration 004 shipped (2026-07-20) — about 12 days
-- as of this writing. The roster-snapshot recovery safety net has not
-- captured a single new snapshot in that window.
--
-- ---------------------------------------------------------------------------
-- FIX
-- ---------------------------------------------------------------------------
-- Mark the function SECURITY DEFINER with a pinned search_path, the same
-- pattern migration 012 already applied to every other trigger/RPC function
-- in this schema (restore_game_state, handle_new_user, etc.) — an unpinned
-- search_path on a SECURITY DEFINER function is a privilege-escalation
-- vector, so the pin travels with the DEFINER change, never one without the
-- other. As the table owner (service_role-equivalent for DDL purposes), the
-- function's internal DELETE no longer depends on the calling role's own
-- grants — exactly like the table's other maintenance triggers already work.
--
-- This does NOT reopen any exposure: RLS + the anon/authenticated REVOKE
-- still fully govern what a CLIENT can directly DELETE from this table. Only
-- the trigger's own internal housekeeping delete (10-row retention, silent,
-- no data exposed to the caller) runs with elevated rights.

CREATE OR REPLACE FUNCTION public.prune_roster_snapshots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM roster_snapshots
  WHERE team_id = NEW.team_id
    AND id NOT IN (
      SELECT id FROM roster_snapshots
      WHERE team_id = NEW.team_id
      ORDER BY snapshot_at DESC
      LIMIT 10
    );
  RETURN NEW;
END;
$$;

-- No DROP/CREATE TRIGGER needed: CREATE OR REPLACE FUNCTION updates the
-- function body in place, and the existing trg_prune_roster_snapshots
-- trigger (schema.sql:658-660) already points at this function by name.

-- ---------------------------------------------------------------------------
-- ACCEPTANCE
-- ---------------------------------------------------------------------------
-- backend/src/__tests__/rls/policies.test.js RS5 ("coach A CAN insert a
-- roster_snapshots row for own team A") must go from RED (42501 permission
-- denied) to GREEN once this is applied. RS1-RS4 are unaffected (they assert
-- rejection, which is unchanged by this fix).

-- ---------------------------------------------------------------------------
-- ROLLBACK
-- ---------------------------------------------------------------------------
-- Restores the pre-migration (currently-live, broken) behavior:
--   CREATE OR REPLACE FUNCTION public.prune_roster_snapshots()
--   RETURNS trigger LANGUAGE plpgsql AS $$
--   BEGIN
--     DELETE FROM roster_snapshots
--     WHERE team_id = NEW.team_id
--       AND id NOT IN (
--         SELECT id FROM roster_snapshots
--         WHERE team_id = NEW.team_id
--         ORDER BY snapshot_at DESC
--         LIMIT 10
--       );
--     RETURN NEW;
--   END;
--   $$;
-- There should be no reason to roll this back — it restores intended
-- behavior, not a behavior change coaches would notice or depend on.
--
-- Related: #477, #342 (original RLS-off exposure), migration 004 (the
-- REVOKE that exposed this), migration 012 (the SECURITY DEFINER + pinned
-- search_path convention this follows).
