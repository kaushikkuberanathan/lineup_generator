-- Migration 019: auth.uid()-scoped RLS for the 4 live-scoring tables (Phase 4C, #355)
--
-- DRAFTED 2026-08-06, recon + proposal only at the time (that session's explicit
--   constraint). CORRECTED 2026-08-17: Section A (lines 88-284) was applied to DEV
--   (psqvzppphdedqkpmarwx) on 2026-08-15T23:08:27Z, per KK go-ahead, Section A scope
--   only -- confirmed via direct DEV policy query and the raw apply log. PROD has NOT
--   been touched (confirmed via direct PROD policy query). Section B (below, its own
--   STOP banner) has not run anywhere. See docs/product/PHASE4C_SCORING_RLS_PROPOSAL.md
--   for the full correction. Do not run Section A on PROD or Section B anywhere until
--   the shim-removal sequence in that doc has reached the step that names it.
--
-- Repo record of a migration authored ahead of its own apply — same
-- "commit first, apply later" convention as every file in this tree, just an
-- extra step earlier than usual (013-018 were all DEV-verified before commit;
-- this one is committed with ZERO live verification, by design, tonight).
--
-- ---------------------------------------------------------------------------
-- WHY — see docs/product/PHASE4C_SCORING_RLS_PROPOSAL.md for the full audit.
-- ---------------------------------------------------------------------------
-- live_game_state, game_scoring_sessions, scoring_audit_log currently carry
-- BOTH a scoped-but-hardcoded "*_anon_test" backdoor policy (2 hardcoded team
-- ids: '1774297491626' Mud Hens, '9000000000001' Demo All-Stars) AND an
-- unconditional "allow_scorer_writes" catch-all (USING(true) WITH
-- CHECK(true), FOR ALL, TO public) with NO team scoping whatsoever — broader
-- than the four named backdoors. at_bats has only its own scoped backdoor
-- ("at_bats_anon_test"), no catch-all. All of this is the ALREADY-TRACKED,
-- ALREADY-DOCUMENTED #355 finding (backend/src/__tests__/rls/policies.test.js
-- LS1-LS7, skipped RED-by-design pending this fix) — confirmed live again
-- tonight via the same read-only `pg_policies` query Track 1 used for #428,
-- nothing new or worse than documented.
--
-- ---------------------------------------------------------------------------
-- TWO-SECTION STRUCTURE — DO NOT RUN SECTION B UNTIL THE SHIM IS FLIPPED
-- ---------------------------------------------------------------------------
-- Section A (below) is ADDITIVE ONLY: it creates the new auth.uid()-scoped
--   policies ALONGSIDE the existing anon/catch-all ones. Postgres combines
--   multiple PERMISSIVE policies for the same command with OR, so adding
--   these does NOT restrict anything yet — the old wide-open policies remain
--   the operative (more permissive) gate until Section B runs. Section A is
--   safe to apply at any time, independent of the frontend shim's state.
--
-- Section B (bottom, behind its own STOP banner) DROPS the four anon
--   backdoors and three allow_scorer_writes catch-alls — this is the actual
--   security fix. Running Section B before the frontend shim is flipped (see
--   proposal doc step 2) breaks every coach's live scoring mid-game: the
--   shimmed frontend does not send a real authenticated identity, so once
--   the old permissive policies are gone, nothing satisfies the new
--   auth.uid()-scoped policies and every scoring write is denied. THIS IS
--   THE SINGLE WORST FAILURE MODE IN THE WHOLE SEQUENCE — see the proposal
--   doc's "what could go wrong" section.
--
-- ---------------------------------------------------------------------------
-- ROLE CHOICE: role IN ('admin', 'coach', 'scorekeeper')
-- ---------------------------------------------------------------------------
-- 'scorekeeper' is one of the seven canonical team_memberships roles
-- (docs/db/schema.sql's team_memberships_role_check) and exists specifically
-- for this purpose — not yet exercised by any policy in this tree. Including
-- it here is this migration's only behavior change beyond "what admin/coach
-- already do" — CONFIRMED by KK 2026-08-07: a non-admin/non-coach scorekeeper
-- is an intended near-term user, not dead code being wired up early.
--
-- ---------------------------------------------------------------------------
-- WITH CHECK identity binding — closes the WS-4 forgeable-identity gap
-- ---------------------------------------------------------------------------
-- scoring_audit_log.actor_user_id and at_bats.recorded_by_id are TEXT, not
-- yet UUID/FK'd (root CLAUDE.md's own WS-4 note; schema.sql's inline warning
-- on both columns). This migration's INSERT policies bind
-- `actor_user_id = auth.uid()::text` / `recorded_by_id = auth.uid()::text`
-- so a coach can no longer forge an audit entry under another user's
-- identity — the exact gap the LS5/LS6 test comments already name. Once the
-- proposal doc's step 6 (column type restore) lands, drop the `::text` cast
-- and compare directly against the now-UUID column.
--
-- ---------------------------------------------------------------------------
-- ROLLBACK (Section A only — Section B has its own rollback in its own block)
-- ---------------------------------------------------------------------------
--   DROP POLICY IF EXISTS "live_game_state_auth_select"      ON public.live_game_state;
--   DROP POLICY IF EXISTS "live_game_state_auth_upsert"      ON public.live_game_state;
--   DROP POLICY IF EXISTS "live_game_state_auth_update"      ON public.live_game_state;
--   DROP POLICY IF EXISTS "scoring_sessions_auth_select"     ON public.game_scoring_sessions;
--   DROP POLICY IF EXISTS "scoring_sessions_auth_upsert"     ON public.game_scoring_sessions;
--   DROP POLICY IF EXISTS "scoring_sessions_auth_update"     ON public.game_scoring_sessions;
--   DROP POLICY IF EXISTS "scoring_sessions_auth_delete"     ON public.game_scoring_sessions;
--   DROP POLICY IF EXISTS "scoring_audit_log_auth_select"    ON public.scoring_audit_log;
--   DROP POLICY IF EXISTS "scoring_audit_log_auth_insert"    ON public.scoring_audit_log;
--   DROP POLICY IF EXISTS "at_bats_auth_select"              ON public.at_bats;
--   DROP POLICY IF EXISTS "at_bats_auth_insert"              ON public.at_bats;
--
-- Related: #355

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION A — additive, safe to run at any time
-- ═══════════════════════════════════════════════════════════════════════════

-- ── live_game_state ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "live_game_state_auth_select" ON public.live_game_state;
CREATE POLICY "live_game_state_auth_select"
  ON public.live_game_state FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = public.live_game_state.team_id
        AND tm.status  = 'active'
    )
  );

DROP POLICY IF EXISTS "live_game_state_auth_upsert" ON public.live_game_state;
CREATE POLICY "live_game_state_auth_upsert"
  ON public.live_game_state FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = public.live_game_state.team_id
        AND tm.role    IN ('admin', 'coach', 'scorekeeper')
        AND tm.status  = 'active'
    )
  );

DROP POLICY IF EXISTS "live_game_state_auth_update" ON public.live_game_state;
CREATE POLICY "live_game_state_auth_update"
  ON public.live_game_state FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = public.live_game_state.team_id
        AND tm.role    IN ('admin', 'coach', 'scorekeeper')
        AND tm.status  = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = public.live_game_state.team_id
        AND tm.role    IN ('admin', 'coach', 'scorekeeper')
        AND tm.status  = 'active'
    )
  );

-- ── game_scoring_sessions (scorer lock) ──────────────────────────────────
DROP POLICY IF EXISTS "scoring_sessions_auth_select" ON public.game_scoring_sessions;
CREATE POLICY "scoring_sessions_auth_select"
  ON public.game_scoring_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = public.game_scoring_sessions.team_id
        AND tm.status  = 'active'
    )
  );

DROP POLICY IF EXISTS "scoring_sessions_auth_upsert" ON public.game_scoring_sessions;
CREATE POLICY "scoring_sessions_auth_upsert"
  ON public.game_scoring_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = public.game_scoring_sessions.team_id
        AND tm.role    IN ('admin', 'coach', 'scorekeeper')
        AND tm.status  = 'active'
    )
  );

-- Heartbeat + lock claim both go through this same upsert-shaped write —
-- UPDATE needs the same scoping as INSERT, not a stricter "must be the
-- current scorer" check: claiming a lock away from a stale/expired session
-- (the app's "Hand off scoring" flow) is a legitimate UPDATE by a DIFFERENT
-- team member, not just the row's own scorer_user_id.
DROP POLICY IF EXISTS "scoring_sessions_auth_update" ON public.game_scoring_sessions;
CREATE POLICY "scoring_sessions_auth_update"
  ON public.game_scoring_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = public.game_scoring_sessions.team_id
        AND tm.role    IN ('admin', 'coach', 'scorekeeper')
        AND tm.status  = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = public.game_scoring_sessions.team_id
        AND tm.role    IN ('admin', 'coach', 'scorekeeper')
        AND tm.status  = 'active'
    )
  );

-- releaseScorerLock() (useLiveScoring.js) deletes scoped to the caller's own
-- scorer_user_id already at the application layer — this policy makes that
-- the enforced floor, not just app-level convention. scorer_user_id is still
-- TEXT (WS-4) — cast auth.uid() to text for the comparison; drop the cast
-- once the column type is restored to uuid (proposal doc step 6).
DROP POLICY IF EXISTS "scoring_sessions_auth_delete" ON public.game_scoring_sessions;
CREATE POLICY "scoring_sessions_auth_delete"
  ON public.game_scoring_sessions FOR DELETE
  TO authenticated
  USING (
    scorer_user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id  = public.game_scoring_sessions.team_id
        AND tm.role     = 'admin'
        AND tm.status   = 'active'
    )
  );

-- ── scoring_audit_log (append-only) ──────────────────────────────────────
DROP POLICY IF EXISTS "scoring_audit_log_auth_select" ON public.scoring_audit_log;
CREATE POLICY "scoring_audit_log_auth_select"
  ON public.scoring_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = public.scoring_audit_log.team_id
        AND tm.status  = 'active'
    )
  );

-- actor_user_id binding closes WS-4's forgeable-identity gap for this table
-- (see header). No UPDATE/DELETE policy — append-only by design, matches
-- root CLAUDE.md's Game Mode Action Tiers and the existing table comment.
DROP POLICY IF EXISTS "scoring_audit_log_auth_insert" ON public.scoring_audit_log;
CREATE POLICY "scoring_audit_log_auth_insert"
  ON public.scoring_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = public.scoring_audit_log.team_id
        AND tm.role    IN ('admin', 'coach', 'scorekeeper')
        AND tm.status  = 'active'
    )
  );

-- ── at_bats ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "at_bats_auth_select" ON public.at_bats;
CREATE POLICY "at_bats_auth_select"
  ON public.at_bats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = public.at_bats.team_id
        AND tm.status  = 'active'
    )
  );

-- recorded_by_id binding closes the same forgeable-identity gap as
-- scoring_audit_log. No UPDATE/DELETE policy — undo/correction flows write
-- NEW live_game_state, they do not mutate historical at_bats rows (confirmed
-- against useLiveScoring.js's undoLastPitch()/undoHalfInning(), neither of
-- which touches the at_bats table).
DROP POLICY IF EXISTS "at_bats_auth_insert" ON public.at_bats;
CREATE POLICY "at_bats_auth_insert"
  ON public.at_bats FOR INSERT
  TO authenticated
  WITH CHECK (
    recorded_by_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = public.at_bats.team_id
        AND tm.role    IN ('admin', 'coach', 'scorekeeper')
        AND tm.status  = 'active'
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION B — !! STOP !! DO NOT RUN until the frontend shim is flipped AND
-- soaked in prod (proposal doc steps 2-3). Running this before then breaks
-- every coach's live scoring mid-game. Commented out deliberately — this is
-- not a guard the file enforces for you, it is a human decision gate.
-- ═══════════════════════════════════════════════════════════════════════════

-- DROP POLICY IF EXISTS "scorer_lock_anon_test" ON public.game_scoring_sessions;
-- DROP POLICY IF EXISTS "game_state_anon_test"  ON public.live_game_state;
-- DROP POLICY IF EXISTS "audit_log_anon_test"   ON public.scoring_audit_log;
-- DROP POLICY IF EXISTS "at_bats_anon_test"     ON public.at_bats;
-- DROP POLICY IF EXISTS "allow_scorer_writes"   ON public.game_scoring_sessions;
-- DROP POLICY IF EXISTS "allow_scorer_writes"   ON public.live_game_state;
-- DROP POLICY IF EXISTS "allow_scorer_writes"   ON public.scoring_audit_log;
--
-- Also consider at that time: public_read_scoring_sessions / public_read_live_state /
-- public_read_audit_log / public_read_at_bats currently grant SELECT TO
-- public (broader than the authenticated-only SELECT policies Section A
-- adds). No public/anon live-score viewer surface was found in this repo's
-- current UI (LiveScoreViewer.jsx renders from props/the authenticated
-- useLiveScoring() hook state, not a public share-link route) — these four
-- appear to be Section A's SELECT policies' un-narrowed predecessors, not a
-- deliberate anon-read design (unlike share_links, which genuinely needs
-- anon SELECT for the viewer-mode share link). Confirm this with KK before
-- dropping — if wrong, dropping these would break a real anon viewer flow.
-- DROP POLICY IF EXISTS "public_read_scoring_sessions" ON public.game_scoring_sessions;
-- DROP POLICY IF EXISTS "public_read_live_state"       ON public.live_game_state;
-- DROP POLICY IF EXISTS "public_read_audit_log"        ON public.scoring_audit_log;
-- DROP POLICY IF EXISTS "public_read_at_bats"           ON public.at_bats;
