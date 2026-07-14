-- Migration 012: P1 - pin SECURITY DEFINER search_path; drop dead activate_membership
--
-- APPLIED TO PRODUCTION: 2026-07-13 (Supabase ledger 20260713195606)
-- Repo record of a migration applied directly to prod.
--
-- Idempotent: CREATE OR REPLACE + DROP IF EXISTS.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE VECTOR
-- ─────────────────────────────────────────────────────────────────────────────
-- A SECURITY DEFINER function runs as its OWNER (postgres). Without a pinned
-- search_path it resolves UNQUALIFIED table names against whatever schema the CALLER
-- puts first.
--
-- A caller can create their own `at_bats` or `live_game_state` in a schema they
-- control, prepend it to search_path, and the function - running with postgres
-- privileges - reads from or writes to THEIR table.
--
-- Two functions in prod had SECURITY DEFINER with NO search_path:
--
--   restore_game_state   - the sharp one. Called FROM THE CLIENT
--                          (frontend/src/components/ScoringMode/RestoreScoreModal.jsx:57,
--                          via supabase.rpc), takes p_actor_id from the caller, and
--                          writes to live_game_state and scoring_audit_log.
--
--   activate_membership  - dead code (see below).
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. restore_game_state -> KEEP AND PIN
-- ─────────────────────────────────────────────────────────────────────────────
-- One live caller. Pinning search_path changes name resolution INSIDE the body, not
-- the RPC interface - the caller is unaffected.
--
-- !! THIS FUNCTION HAD NO DEFINITION IN THE REPO.
-- !!
-- !! It existed ONLY in prod, hand-applied. Grep found its caller and its changelog
-- !! entries, but no CREATE FUNCTION restore_game_state anywhere in either migration
-- !! tree.
-- !!
-- !! So this migration CREATE OR REPLACEs the FULL definition captured from prod -
-- !! not just `ALTER FUNCTION ... SET search_path`. Otherwise we would have pinned a
-- !! function the repo still could not reproduce, and ground truth would stay broken.
-- !!
-- !! The body below is byte-identical to the live definition. Only SET search_path is
-- !! added.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 2. activate_membership -> DROPPED
-- ─────────────────────────────────────────────────────────────────────────────
-- Dead code. ZERO callers - no .rpc('activate_membership') anywhere in the repo.
--
-- Phone-era residue: its lookup key is phone_e164, and phone auth was permanently
-- removed. CLAUDE.md is explicit: "Twilio / phone OTP permanently removed - no phone
-- or SMS dependency anywhere in the stack." The live UI (RequestAccessScreen.jsx)
-- collects no phone field at all.
--
-- It is ALSO broken: it declares RETURNS TABLE(..., team_id uuid, ...) but
-- team_memberships.team_id is TEXT in prod. It would error on the first returned row.
-- It has almost certainly never successfully executed.
--
-- docs/product/ROADMAP.md:1324 states it plainly: "originally built for phone-only
-- auth ... Phase 4B added email auth without an RPC update; current code uses a direct
-- .update() workaround in backend/src/routes/auth.js."
--
-- Pinning an uncalled, broken function preserves a vector for no benefit. Dropped.
--
-- !! STALE FILE WARNING
-- !! Its definition lives at backend/src/db/migrations/005_atomic_verify_function.sql.
-- !! That file is now DANGEROUS: rebuilding from it re-creates this vulnerable, broken
-- !! function. A warning header has been added to it.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- NOT A VECTOR (for the record)
-- ─────────────────────────────────────────────────────────────────────────────
-- prune_roster_snapshots, set_updated_at and update_updated_at also have no pinned
-- search_path - but they are SECURITY INVOKER, so they run as the CALLER with the
-- CALLER's privileges. An unpinned search_path on an invoker function is not an
-- escalation vector. Only DEFINER functions escalate. No action needed.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- POST-STATE: every SECURITY DEFINER function in prod is now pinned
-- ─────────────────────────────────────────────────────────────────────────────
--   is_active_admin          SECURITY DEFINER  search_path=public   (migration 007)
--   snapshot_team_data       SECURITY DEFINER  search_path=public   (migration 006)
--   prune_team_data_history  SECURITY DEFINER  search_path=public   (migration 006)
--   restore_game_state       SECURITY DEFINER  search_path=public   (THIS migration)
--   activate_membership      DROPPED                                (THIS migration)
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK
-- ─────────────────────────────────────────────────────────────────────────────
--   restore_game_state:  re-run the body below WITHOUT `SET search_path = public`
--                        (re-opens the vector)
--   activate_membership: re-run backend/src/db/migrations/005_atomic_verify_function.sql
--                        (re-creates a broken, vulnerable, uncalled function - do not)
--
-- Related: #351, #355


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. restore_game_state - FULL definition, captured from prod, now pinned.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.restore_game_state(
  p_game_id    text,
  p_team_id    text,
  p_actor_id   uuid,
  p_actor_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  last_ab       at_bats%ROWTYPE;
  my_runs       integer := 0;
  last_inning   integer := 1;
  last_half     text    := 'top';
  last_index    integer := 0;
BEGIN
  -- Get most recent resolved at-bat
  SELECT * INTO last_ab
  FROM at_bats
  WHERE game_id = p_game_id
    AND team_id = p_team_id
    AND outcome IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    last_inning := last_ab.inning;
    last_half   := last_ab.half_inning;
    last_index  := COALESCE(last_ab.batting_order_pos, 0);
  END IF;

  -- Recount runs: batter scored (base=4) + runners who scored
  SELECT COALESCE(SUM(
    CASE WHEN (outcome->>'baseReached')::int = 4 THEN 1 ELSE 0 END
    +
    (SELECT COUNT(*)
     FROM jsonb_array_elements(COALESCE(runner_advances, '[]')) ra
     WHERE (ra->>'result') = 'scored')
  ), 0)
  INTO my_runs
  FROM at_bats
  WHERE game_id = p_game_id
    AND team_id = p_team_id
    AND outcome IS NOT NULL;

  -- Upsert restored state (clears in-progress AB - safest recovery)
  INSERT INTO live_game_state (
    game_id, team_id, inning, half_inning,
    outs, balls, strikes,
    my_score, opponent_score,
    runners, current_batter,
    batting_order_index, last_at_bat_id,
    updated_at
  )
  VALUES (
    p_game_id, p_team_id,
    last_inning, last_half,
    0, 0, 0,
    my_runs, 0,
    '[]', NULL,
    last_index,
    last_ab.id,
    now()
  )
  ON CONFLICT (game_id, team_id) DO UPDATE SET
    inning              = EXCLUDED.inning,
    half_inning         = EXCLUDED.half_inning,
    outs                = 0,
    balls               = 0,
    strikes             = 0,
    my_score            = EXCLUDED.my_score,
    runners             = '[]',
    current_batter      = NULL,
    batting_order_index = EXCLUDED.batting_order_index,
    last_at_bat_id      = EXCLUDED.last_at_bat_id,
    updated_at          = now();

  -- Write audit entry for the restore
  INSERT INTO scoring_audit_log (
    game_id, team_id, action,
    actor_user_id, actor_name,
    payload, recorded_at
  )
  VALUES (
    p_game_id, p_team_id, 'state_restored',
    p_actor_id, p_actor_name,
    jsonb_build_object(
      'restored_to_inning', last_inning,
      'restored_my_score', my_runs,
      'at_bats_replayed', (
        SELECT COUNT(*) FROM at_bats
        WHERE game_id = p_game_id AND team_id = p_team_id
      )
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'restored_inning', last_inning,
    'restored_score', my_runs,
    'message', 'Game state restored from scorebook'
  );
END;
$function$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. activate_membership - DROP. Dead, broken, and a live escalation vector.
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.activate_membership(uuid, text, text, text);


-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION (run after applying)
-- ─────────────────────────────────────────────────────────────────────────────
-- Expect: all four SECURITY DEFINER functions show search_path=public, and
-- activate_membership is gone.
--
--   SELECT p.proname,
--          p.prosecdef AS sec_definer,
--          COALESCE(array_to_string(p.proconfig, ', '), 'NONE') AS search_path
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname='public'
--   ORDER BY p.prosecdef DESC, p.proname;
--
-- The three SECURITY INVOKER functions (prune_roster_snapshots, set_updated_at,
-- update_updated_at) will show search_path=NONE. That is FINE - invoker functions do
-- not escalate.
--
-- Also verify the live caller still works: open a game in Scoring Mode and use the
-- Restore flow (RestoreScoreModal). Pinning does not change the RPC interface, so it
-- should behave identically.
