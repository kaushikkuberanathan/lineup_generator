# Phase 4C Auth Cutover — Scoring Shim Removal Checklist

**Status update, 2026-08-30:** items 1 and 2 below are **done** — PR
[#899](https://github.com/kaushikkuberanathan/lineup_generator/pull/899) (`fix/355-shim-removal-step2`,
merged 2026-08-29, v3.0.0) removed both frontend shims, verified directly against current code.
Item 3 (dropping the anon RLS policies) and item 4 (restoring uuid column types) remain open,
gated on a real prod game-day soak — see `docs/product/PHASE4C_SCORING_RLS_PROPOSAL.md` §3 for
the authoritative, more detailed version of this same sequence (that doc supersedes this one
where they conflict).

When auth goes live, remove these three shims IN ORDER:

1. `frontend/src/hooks/useLiveScoring.js`
   Search: `"AUTH TESTING SHIM"`
   Remove: `_effectiveUserId` and `_effectiveUserName` fallback block
   Restore: all `userId`/`userName` references back to direct param use

2. `frontend/src/components/game-mode/DugoutView.jsx` (corrected 2026-08-15 —
   Slice 4/v2.5.11 removed the legacy `ScoringMode/index.jsx` root this step
   used to name; the shim now lives here, per root `CLAUDE.md`'s Live Scoring
   Architecture section)
   Search: `"AUTH TESTING SHIM"`
   Remove: `scoringUserId`/`scoringUserName` fallback
   Change: `isEnabled = liveScoringEnabled || true`
       to: `isEnabled = liveScoringEnabled`

3. **Supabase SQL Editor** — replace anon RLS on 4 scoring tables:
   ```sql
   DROP POLICY "scorer_lock_anon_test"  ON game_scoring_sessions;
   DROP POLICY "game_state_anon_test"   ON live_game_state;
   DROP POLICY "at_bats_anon_test"      ON at_bats;
   DROP POLICY "audit_log_anon_test"    ON scoring_audit_log;
   ```
   Then re-add `auth.uid() = scorer_user_id` policies per original design.

Do not remove the admin badge (⚠ Admin Test Mode) until all
three shims are removed and auth is confirmed working end-to-end.

4. **Supabase SQL** — restore uuid types on scorer user ID columns
   (currently text for testing — drop shim data first):

   Tables affected:
   - `game_scoring_sessions.scorer_user_id` (text → uuid + FK to auth.users)
   - `scoring_audit_log.actor_user_id` (text → uuid + FK to auth.users)
   - `at_bats.recorded_by_id` (text → uuid + FK to auth.users)

   Steps: clear test rows with `actor='admin-coach-mud-hens'`,
   then `ALTER TYPE` back to uuid, then `ADD CONSTRAINT` FK.
   Full SQL in session history April 2026.
