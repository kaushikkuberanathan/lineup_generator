-- Migration 031: table-level GRANT revocation for the 4 live-scoring tables
-- (Phase 4C, #355 — the companion migration 019 Section B itself flags as
-- "not drafted as of this note").
--
-- DRAFTED 2026-08-30, NOT APPLIED ANYWHERE. Do not apply until migration
-- 019 Section B has actually run (or is being run in the same maintenance
-- window) — see docs/product/PHASE4C_SCORING_RLS_PROPOSAL.md §3 step 4.
--
-- ---------------------------------------------------------------------------
-- WHY THIS IS A SEPARATE MIGRATION FROM 019 SECTION B
-- ---------------------------------------------------------------------------
-- RLS policies and Postgres GRANTs are independent layers. Dropping the
-- permissive anon/catch-all RLS policies in migration 019 Section B does
-- NOT revoke the table-level grants underneath them. Confirmed by a direct
-- read-only query against PROD (2026-08-15, recorded in the proposal doc):
-- `anon` and `authenticated` both currently hold full TRUNCATE / DELETE /
-- INSERT / UPDATE grants on all four scoring tables. Once Section B removes
-- every anon-usable policy, `anon` is left holding grants it has no policy
-- to exercise legitimately — RLS-only would technically block ordinary
-- reads/writes, but TRUNCATE bypasses RLS entirely (no policy can stop it),
-- and a future policy misconfiguration would silently re-open the door if
-- the grant is still sitting there unrevoked. Same reasoning migration 004
-- already applied to team_data/teams/roster_snapshots — no new pattern
-- invented here, just extended to the four scoring tables.
--
-- ---------------------------------------------------------------------------
-- PRECONDITION — same STOP as 019 Section B
-- ---------------------------------------------------------------------------
-- Running this before the frontend shim is flipped and soaked (proposal doc
-- steps 2-3) has the identical worst-case failure mode as running Section B
-- early: every coach's live scoring write starts failing mid-game, only via
-- a GRANT-level 42501 instead of an RLS-level one — same outage, different
-- error surface. Apply this in the SAME maintenance window as Section B,
-- after (not before) Section B's DROP POLICY statements, never standalone.
--
-- ---------------------------------------------------------------------------
-- PER-TABLE REASONING — matched to migration 019 Section A's actual policies
-- ---------------------------------------------------------------------------
-- anon: after Section B also drops the four public_read_* SELECT policies
--   (confirmed by KK 2026-08-07 as un-narrowed leftovers, no real anon
--   viewer route exists — see proposal doc §1.4), anon has ZERO usable
--   policies of any kind on any of these four tables. Revoke everything.
--
-- authenticated: keep only what Section A's own policies actually grant —
--   live_game_state:       SELECT, INSERT, UPDATE (no DELETE policy exists)
--   game_scoring_sessions: SELECT, INSERT, UPDATE, DELETE (all four exist)
--   scoring_audit_log:     SELECT, INSERT only (append-only by design)
--   at_bats:               SELECT, INSERT only (append-only by design)
--   TRUNCATE is revoked from authenticated on all four regardless — RLS
--   cannot stop it, matching migration 004's blanket TRUNCATE revocation.
--
-- ---------------------------------------------------------------------------
-- ACCEPTANCE TEST
-- ---------------------------------------------------------------------------
-- backend/src/__tests__/rls/policies.test.js's LS1-LS7 (un-skipped by
-- proposal doc step 5, after this migration and 019 Section B both land)
-- must stay GREEN. Add a grant-level assertion alongside them confirming
-- `information_schema.role_table_grants` no longer lists any privilege for
-- `anon` on these four tables, and that `authenticated` only holds the
-- privileges enumerated above per table — mirrors the existing pattern for
-- team_data/teams/roster_snapshots's grant coverage.
--
-- Related: #355, migration 019 (Section B), migration 004 (the pattern this
-- one extends).

-- ═══════════════════════════════════════════════════════════════════════════
-- anon — revoke everything on all four tables
-- ═══════════════════════════════════════════════════════════════════════════
REVOKE ALL PRIVILEGES ON public.live_game_state       FROM anon;
REVOKE ALL PRIVILEGES ON public.game_scoring_sessions FROM anon;
REVOKE ALL PRIVILEGES ON public.scoring_audit_log     FROM anon;
REVOKE ALL PRIVILEGES ON public.at_bats               FROM anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- authenticated — revoke TRUNCATE everywhere, then trim DML down to exactly
-- what migration 019 Section A's policies grant per table
-- ═══════════════════════════════════════════════════════════════════════════
REVOKE TRUNCATE ON public.live_game_state       FROM authenticated;
REVOKE TRUNCATE ON public.game_scoring_sessions FROM authenticated;
REVOKE TRUNCATE ON public.scoring_audit_log     FROM authenticated;
REVOKE TRUNCATE ON public.at_bats               FROM authenticated;

-- live_game_state: no DELETE policy in Section A — revoke DELETE too.
REVOKE DELETE ON public.live_game_state FROM authenticated;

-- scoring_audit_log / at_bats: append-only by design — SELECT + INSERT
-- policies only in Section A. Revoke UPDATE and DELETE.
REVOKE UPDATE, DELETE ON public.scoring_audit_log FROM authenticated;
REVOKE UPDATE, DELETE ON public.at_bats           FROM authenticated;

-- game_scoring_sessions keeps its full SELECT/INSERT/UPDATE/DELETE grant —
-- Section A defines a real policy for all four commands (the DELETE policy
-- backs releaseScorerLock()'s "Hand off scoring" flow). No REVOKE needed
-- here beyond the blanket TRUNCATE revocation above.

-- ---------------------------------------------------------------------------
-- Rollback (only if a legitimate path needs these back — it should not once
-- 019 Section B has shipped; if Section B itself is rolled back, this must
-- be rolled back in the same transaction/window, not independently):
-- ---------------------------------------------------------------------------
--   GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON public.live_game_state       TO anon;
--   GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON public.game_scoring_sessions TO anon;
--   GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON public.scoring_audit_log     TO anon;
--   GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON public.at_bats               TO anon;
--   GRANT DELETE, TRUNCATE ON public.live_game_state         TO authenticated;
--   GRANT UPDATE, DELETE, TRUNCATE ON public.scoring_audit_log TO authenticated;
--   GRANT UPDATE, DELETE, TRUNCATE ON public.at_bats           TO authenticated;
--   GRANT TRUNCATE ON public.game_scoring_sessions TO authenticated;
