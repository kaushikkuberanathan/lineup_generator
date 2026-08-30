# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Rules
- NEVER commit or push to main without explicit confirmation from KK
- Always test locally first — start dev server, verify in browser, then ask for confirmation
- The confirmation phrase is: "confirmed — push to main"
- If KK has not said "confirmed — push to main", only make local file changes

## Project Overview

Youth baseball/softball lineup generator — a mobile-first PWA for coaches to manage rosters, auto-assign field positions, track batting order, and manage schedules. Stack: React 18 + Vite (frontend on Vercel), Express (backend on Render), Supabase (Postgres + JSONB).

## Branch Strategy

- **main** — Production. Auto-deploys to Vercel (frontend) and Render
  (backend) on push. Gate phrase required before any push:
  "confirmed — push to main". Pre-push hook runs the full test
  suite; any failure blocks the push.

- **develop** — Integration branch. Kept in sync with main periodically.
  Feature branches cut from here merge back via PR when ready.

- (long-lived exploratory branches: pattern reserved for future use; none active as of v2.5.1)

- **feature/\<topic\>** — Short-lived, cut from develop, back to develop
  via PR.

- **fix/\<topic\>** — Short-lived bugfix, same lifecycle as feature/.

- **hotfix/\<topic\>** — Production hotfix, cut from main, merged to both
  main and develop.

Default base for new work: develop.

**GitHub default branch is `develop`, not `main` — confirmed intentional (#488).** `main` is still Production (auto-deploys on push, per the Deployment section) and remains the conceptual "primary" branch in the sense that matters for releases — this setting is about where GitHub itself points day-to-day mechanics, not about which branch is authoritative. Flagged 2026-08-01 as an undocumented repo setting worth an explicit decision rather than a rediscovered surprise; decided 2026-08-26 (KK): **keep `develop` as default**, since nearly all day-to-day activity — commits, new PRs, `git clone`'s initial checkout, "Closes #N" auto-close on merge — happens against `develop`, while `main` only receives infrequent promote merges. Re-verified directly via `GET /repos/{owner}/{repo}` before writing this (`default_branch: "develop"`), not restated from the original 2026-08-01 finding. **Concrete, current-session evidence of the mechanism this setting drives:** on 2026-08-26, `develop`→`main` had not been promoted since v2.14.0 (`main` HEAD `29a29b5`, `develop` 69 commits ahead) — yet PRs merged only to `develop` that same session (e.g. #849, #850, #839) auto-closed their linked issues (#664, #474, #122/#317/#124) immediately on merge, before any of that work had reached `main`. Confirms the auto-close keyword genuinely triggers off whichever branch is configured as default, not off `main`/production — exactly as #488 originally described, and still true today.

**Enforcement: every change starts on a feature/fix/hotfix branch.** Direct commits to develop or main are not permitted except for declared hotfixes that branch off main. The branch strategy applies to docs-only changes too — small commits on develop have caused real release-notes coordination bugs (see PR #29 retrospective). No exceptions because the work feels small.

**Merge-type policy (feature/\*→develop AND develop→main):** Always select **"Create a merge commit"** on the PR merge dropdown — never squash. **As of 2026-08-26, this is enforced at the platform level, not just by convention:** repo Settings → General → Pull Requests has "Allow squash merging" and "Allow rebase merging" both disabled, leaving merge commits as the only option the dropdown can even offer. This recurred twice under the old convention-only regime despite stated intent: PR #100 / v2.5.15 (2026-05-19) and the Sprint 2 P1 debt-closure PRs #567/#569/#571 (2026-08-05) both squash-landed anyway — see [#573](https://github.com/kaushikkuberanathan/lineup_generator/issues/573) (closed) for the full incident history and the decision to move from detection to real prevention. `.github/workflows/merge-policy-guard.yml` still runs as a belt-and-suspenders detection check (comments on the originating PR + fails if a squash signature is somehow found post-push), but the platform-level setting is now the actual safety mechanism. Still verify the actual commit shape after merging (`git show -s --format=%P HEAD` — should show 2 parents) as a matter of habit, not because the dropdown can currently produce anything else.

### Infrastructure notes

- Vitest v4 pool: `pool: 'threads'`, `maxWorkers: 1` — switched from `pool: 'forks'` + `singleFork: true` in Story 41 fix. Cox Defender endpoint security blocked child_process.fork IPC in git hook context; worker_threads are intra-process and unaffected. `maxWorkers: 1` enforces single-worker execution to prevent thread-race test isolation failures (same safety rationale as the former `singleFork: true`).
- **`fileParallelism: false`** (Story 118/#517, v2.8.4) — permanent default in `frontend/vite.config.js`'s `test:` block, config-level equivalent of the `--no-file-parallelism` CLI flag. Added because Bug #7 (a Windows Vitest worker cold-start flake — intermittently drops 1-2 test files per run to a worker-spawn timeout, passing exit code, not a failure) was costing repeated manual retries. Reduces the flake rate; does NOT eliminate it — an isolated single-file drop can still occur, one retry has always cleared it so far. `pool: 'forks'` + `singleFork: true` was tried and empirically rejected as a fix (7 real timeout failures, 4x+ duration blowup, consistent with the same Cox Defender `child_process.fork` IPC blocking noted above) — do not retry that path.
**Pre-push hook (v2.5.18):** `.husky/pre-push` enforces a branch guard rejecting direct pushes to `develop` and `main`, with a skip-on-deletion fast path. The Vitest suite was removed in Story 75 (PR #155) — CI (GitHub Actions) is now the authoritative test gate. Override for declared hotfixes only: ALLOW_DIRECT_PUSH=1 git push.

**Worktree setup before first push:** Run `npm install` at the **repo root** (not `frontend/`) when a worktree is first created. Husky's wrapper at `.husky/_/` is generated by the root `package.json`'s `prepare: husky` script and is `.gitignore`d — so it never ships with a fresh worktree. Without the wrapper, `git push` silently bypasses the pre-push hook (no error, no test run, just push). Verify after install with `ls .husky/_/pre-push` — the file should exist. Discovered PR #144 / 2026-05-20 — two refactor commits pushed without test validation because the wrapper was missing.

**Pre-pull branch check:** Always run `git branch --show-current` before any `git pull` in a worktree. If the worktree is not on the intended target branch, do NOT pull — `git pull origin <branch>` from the wrong branch merges the remote branch INTO the feature branch, creating an unintended merge commit. Instead use `git fetch origin && git log origin/<branch> --oneline -3` to inspect state. (Story 80, 2026-05-21 — hit twice in session, recovered via `git reset --hard` both times)

**`--no-verify` exception:** Acceptable only when all three conditions are true: (a) commit is docs-only or meta-governance — zero app code, zero `frontend/` files changed; (b) pre-push failure is the documented Bug #7 worker-timeout flake; (c) CI is running on the PR as the authoritative gate. Any usage outside these conditions requires explicit justification in the commit message body. See also: MASTER_DEV_REFERENCE.md § GitHub Operating System.

**Conflict resolution when develop ↔ main diverge (#124):** The v2.5.10 promotion invented this decision tree on the fly and lost ~45 min recovering from the wrong choice. Use this instead of rediscovering it:
- **Mechanical conflicts** (one side wins everywhere, no substantive review needed): resolve directly on the destination PR via the GitHub web editor. Creates a real merge commit, preserves ancestry.
- **Conflicts needing substantive review/audit:** cut a sync branch off the destination branch, merge the source branch into it, then PR sync-branch → destination. Use "Create a merge commit" on that PR — NOT squash — to preserve ancestry (see Merge-type policy above).
- **Avoid:** sync-branch + squash-merge. This erases the ancestry the destination PR needs to see the conflict as resolved, and the destination PR re-conflicts.
- **Avoid:** direct push to `develop`/`main` with `ALLOW_DIRECT_PUSH=1` to route around a divergence. That override exists for declared hotfixes, not as a shortcut past merge conflicts — it bypasses the safety gates that exist for exactly this kind of pressure.

---

## Commands
> See `frontend/CLAUDE.md` → **## Commands** for frontend (npm scripts, dev/build/test).
> See `backend/CLAUDE.md` → **## Commands** for backend (node index.js, runner).

---

## Architecture

### Multi-team design (Phase 5)
- One Supabase auth.users record per person regardless of how many teams
- One team_memberships row per (user, team) combination
- **!! CORRECTED 2026-07-13. The previous version of this line said the CHECK constraint enforces FOUR canonical roles. IT DOES NOT. Prod enforces SEVEN.** Building on the four-role claim **broke the public signup form** - WS-1's ingestion normalization wrote `admin` and `viewer` to `access_requests`, values the live CHECK **rejected**. Head Coach and Parent signups returned 500 until migration 009 widened it.
- **What prod ACTUALLY enforces** (verified by query, see `docs/db/schema.sql`): `team_memberships.role` CHECK allows **SEVEN** values - `admin`, `viewer`, `team_admin`, `coordinator`, `coach`, `scorekeeper`, `parent`. `access_requests.requested_role` allows the same seven (widened by migration 009).
- **The four-role model is the TARGET, enforced in CODE** by `normalizeRole()` - not by the database. The DB tolerates legacy values because 596 existing rows hold them. Tightening the CHECK is a data migration, not a doc edit.
- `platform_admin` is a GLOBAL capability and is NEVER written to `team_memberships` (`normalizeRole` throws `ROLE_FORBIDDEN`). Richer concepts (Head Coach, Team Coordinator) are LABELS on top of the canonical strings.
- **Never trust a role constraint written in a doc or a migration file. Query the database.** Full role model: `docs/product/AUTH_SECURITY_AUDIT_ROADMAP.md`. Ground truth: `docs/db/schema.sql`.
- Phase 4 MVP: platform_admin manually creates teams in Supabase
- Approval routing: ALL requests → platform_admin (icoachyouthball@gmail.com)
- **2026-08-08 — Story A (role vocabulary reconciliation) investigated and
  dropped, not filed.** The role-access-model-evolution initiative's original
  brief assumed `/admin/approve-link` still 500s on `coordinator`/`team_admin`/
  `parent` and that `viewer` was missing from `/request-access`'s validator.
  Recon found both already fixed by WS-1/#336 (`normalizeRole.js`) well before
  this session — no code change was needed. Coordinator-as-label (Option B,
  this section's model above) was explicitly reconfirmed rather than reversed;
  promoting it to a distinct canonical role (Option A) is deferred to Story 125
  (#656, blocked on Phase 4C) — see that issue for the named precondition.

### Persistence: Three-Layer Pattern
```
User Action → React state (instant) → localStorage (instant) → Supabase (async, fire-and-forget)
```
App hydrates from localStorage first (instant/offline), then syncs with Supabase in background. All Supabase calls are non-blocking — app is fully functional offline.

> See `frontend/CLAUDE.md` → **## Frontend Structure** and **## Lineup Engine**

### Database Schema (Supabase)
```sql
teams      (id, name, age_group, year, sport, owner_id, created_at)
team_data  (team_id, roster, schedule, practices, batting_order, grid, innings, locked)

-- Live Scoring tables
live_game_state       (game_id, team_id, inning, half_inning, outs, balls, strikes,
                       my_score, opponent_score, batting_order_index, runners jsonb,
                       current_batter jsonb, runs_this_half, opp_runs_this_half,
                       updated_at)
game_scoring_sessions (game_id, team_id, scorer_user_id text, scorer_name,
                       last_heartbeat timestamptz)
scoring_audit_log     (game_id, team_id, actor_user_id text, action, payload jsonb,
                       recorded_at)
```
All `team_data` columns are JSONB — structure matches localStorage exactly, no transformation layer.

`scorer_user_id` (game_scoring_sessions) and `actor_user_id` (scoring_audit_log) are `text` type — FK to `auth.users` dropped for pre-auth testing. Restore at Phase 4C cutover. RLS policy `allow_scorer_writes` on all three scoring tables is open (anon write); replace with `auth.uid()` scoped policies at Phase 4C.

### Live Scoring Architecture
- **Hook**: `frontend/src/hooks/useLiveScoring.js`. UI: `frontend/src/components/ScoringMode/` (directory retained post-Slice 4 for 7 live child components imported by `game-mode/DugoutView.jsx`; pending future restructure into `game-mode/scoring/`)
- **Tables**: `live_game_state` (upserted per event), `game_scoring_sessions` (scorer lock + heartbeat), `scoring_audit_log` (append-only)
- **Auth shims active** (until Phase 4C cutover) — `_effectiveUserId` in hook, `scoringUserId` fallback in ScoringMode.
> Full architecture detail: see `frontend/CLAUDE.md` → **## Live Scoring Architecture**

> See `backend/CLAUDE.md` → **## Routes**

---

## Auth Strategy
- **Email magic link + Google OAuth** — no passwords, no SMS
- Twilio / phone OTP permanently removed — no phone or SMS dependency anywhere in the stack
- **Supabase service role key** lives only in backend environment — never sent to the client
- Frontend continues using anon key for existing data operations
- Admin UI: `frontend/public/admin.html` — Google OAuth + magic link, six management tabs
- **`loginLimiter`** is active on `POST /magic-link`: 15-minute window, max 5 requests, keyed by **email** (falls back to IP only when no email is present on the request). Added in commit `91aaf43` (April 6, 2026, v2.2.18); re-keyed from IP to email in Story 99's closure (2026-07-31) — the IP-keyed version shared one budget across every caller behind the same CI runner address, producing real 429s in CI (see Story 26). Returns `429 TOO_MANY_ATTEMPTS` when exceeded. Do NOT assume this was removed — the removal was planned but never landed. See Story 26 + Story 35 for test fragility implications.

### Auth Principle (non-negotiable)
Viewing lineup and share links must **never** require login. Auth must never block Game Mode or share link rendering.

### Current Users in team_memberships
- Kaushik K: kaushik.kuberanathan@gmail.com, user_id: `951f66cc-afec-41b2-8c1a-58fc61f1b847`, role=admin, team=Mud Hens (1774297491626), status=active
- NOTE: `platform_admin` is NOT a valid team_memberships value - the CHECK constraint forbids it. DB-verified 2026-07-13: three `admin` rows exist for KK across three email identities (kaushik.kuberanathan@, kaushikkuberanathan@ without the dot, icoachyouthball@).
- Stan Hoover: role=coach, team=Mud Hens (1774297491626), status=invited → set active before Phase 4 cutover

### Phase 4 Cutover — likely already happened, docs never caught up (#428)
**`docs/ops/PHASE4_PRECHECK.md` is itself header-marked "archived for reference only... Phase 4 phone OTP cutover abandoned."** The cutover this line used to gate on, in its originally-planned form, never happened. The cutover that actually shipped — magic-link + Google OAuth, "Auth gate live in prod: editing requires a session" — landed in **v2.6.0 (2026-07-20)**, one day after `004_rls_fixes.sql`'s own header recorded the gate as "on develop (904abb5) but NOT promoted to main" (2026-07-19). On the migration file's own stated terms, its precondition looks satisfied.

**Evidence 004's SELECT-side policies (or a full functional equivalent) are already live in prod**, gathered 2026-07-31 without any write probe:
- Live anon-key reads against prod `teams`, `roster_snapshots`, and `team_data` (schedule read) all return `200` + zero rows — RLS-filtered, not grant-denied. That is exactly what 004's `TO authenticated` policies with no anon policy produce; it is not consistent with RLS still being off.
- `frontend/src/supabase.js` exports one shared `supabase` client; `frontend/src/hooks/useAuth.js` calls `supabase.auth.getSession()`/`onAuthStateChange()` on that same client, not a separate one. Once a coach is signed in, supabase-js attaches the session JWT to every subsequent `.from()` call on that client automatically — so `dbSaveTeamData`/`dbSaveTeams` (which reuse the same singleton) write as `authenticated`, not `anon`, for any logged-in coach. Combined with v2.6.0's "editing requires a session" gate, the write path should no longer be able to reach Postgres as `anon` for any edit action.

**Not verified — deliberately not probed:** the GRANT-revocation half (`REVOKE TRUNCATE, DELETE` on `team_data`/`teams`/`roster_snapshots`). The read-only introspection RPC for this (`rls_test_anon_grants`, migration 013) is `EXECUTE`-gated to `service_role` only. Confirming it would require either an anon write-probe against live prod data (real risk: if the hypothesis is wrong, the write either pollutes production or can't be cleaned up afterward, since 004 also revokes DELETE) or running the read-only query already in `004_rls_fixes.sql`'s own header (`SELECT ... FROM pg_policies WHERE schemaname = 'public'`) in the Supabase dashboard SQL Editor — zero risk, settles this definitively. Recommend the latter before treating this as fully closed.

**Until that final check lands: do not re-run `004_rls_fixes.sql` on the assumption it wasn't applied.** If its policies are already live (as the evidence above suggests), re-running it is a harmless no-op — the file's own `DROP POLICY IF EXISTS` guards make it idempotent. But don't run it as a "let's just apply it now" action either — confirm via the read-only query first, since a wrong assumption in either direction has real cost.

### Phase 4C Auth Cutover — Live Scoring cleanup (do at cutover, not before)
> Full shim removal checklist: see [docs/ops/PHASE4C_CUTOVER.md](docs/ops/PHASE4C_CUTOVER.md).

---

## Zero-Downtime Constraint (CRITICAL)
> See `backend/CLAUDE.md` → **## Zero-Downtime Constraint (CRITICAL)**

---

## Data Protection (CRITICAL)
> See `backend/CLAUDE.md` → **## Data Protection (CRITICAL)**

---

## Environment Variables

**Frontend** (`.env` / Vercel):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MIXPANEL_TOKEN`

**Backend** (`.env` / Render):
> See `backend/CLAUDE.md` → **## Environment Variables** for full list and descriptions.

---

## Deployment

- **Frontend**: Vercel auto-deploys from `main` (config: `frontend/vercel.json`)
- **Backend**: Render auto-deploys from `main` (root dir: `backend/`)
- **DEV**: `dev.dugoutlineup.com` (Vercel preview branches per PR — backend dev deleted April 27, 2026; local backend via `npm run dev` for testing)

### Pre-deploy Checklist (all required)

**STEP 0 — Ship Gate (answer before anything else):**
Is this release exempt from Ship Gate?
  - Exempt types: meta-governance (docs-only, no app code changes) · hotfix (`[hotfix-exception]` in commit message)
  - Not exempt: answer the four Ship Gate questions below before proceeding

Four questions (non-exempt releases only):
1. Does every feature touched in this release have a golden-path test?
2. Does every touched feature have documentation reflecting current behavior?
3. Does `docs/product/FEATURE_MAP.md` have a current row for every touched feature?
4. Are all P0 items in `docs/product/DOC_TEST_DEBT.md` resolved or explicitly unblocked for this change?

If any answer is "no": stop. Document the gap in DOC_TEST_DEBT.md, then decide whether to proceed.

**Remaining steps:**
1. Bump `APP_VERSION` in `frontend/src/App.jsx`
2. Prepend to `VERSION_HISTORY` (dual-layer schema — see below)
3. Bump version in `frontend/package.json` AND `backend/package.json`
4. Update `docs/product/ROADMAP.md`
5. Update `CLAUDE.md` version entry
6. Run `cd frontend && npm run build` — must be clean
7. Stage **specific files by path** — never `git add -A` (risks picking up unrelated untracked files)
8. [x] loginLimiter: 15min window, max 5 — applied to POST /magic-link ✓
9. [ ] Confirm `RESEND_DOMAIN_VERIFIED=true` in Render env vars (only after domain verified)
10. [ ] Verify backend Supabase keys are new-style (`sb_secret_...` / `sb_publishable_...`, not a legacy `eyJ...` JWT) in every environment's Render env vars — the specific gap behind the 2026-07-20 cutover incident (#387): a stale legacy `SUPABASE_ANON_KEY` on Render broke every login for ~15min with no startup-time signal. `backend/src/lib/env.js` now warns at boot if either Supabase key looks like a legacy JWT, so this is largely self-checking — confirm via Render logs that the warning hasn't fired, rather than reading the key value directly.
11. [ ] Run `npm test` in `frontend` and `npm run test:unit` in `backend`; record the observed counts in the release PR instead of copying a historical count. Note: Bug #7 worker cold-start flake may drop 1-2 files locally on Windows (passing exit code, not a failure); one retry has always cleared it — `fileParallelism:false` is now the standing default to reduce (not eliminate) this.

### VERSION_HISTORY Schema

> Full schema + Updates Tab Content Rule: [docs/product/VERSION_HISTORY_SCHEMA.md](docs/product/VERSION_HISTORY_SCHEMA.md)

### Game-Day Validation (required before deploys touching lineup/game mode/share)
- Generate lineup <60s
- Open Game Mode, advance inning, positions visible at a glance
- Batting order clear
- Share link opens on mobile without login
- Bottom nav pinned while scrolling
- Game Mode full-screen with nav hidden

### Rollback Procedure
1. `git log --oneline -10` → find last stable commit
2. `git revert <hash>`
3. Run full deploy checklist
4. Verify `/ping` <2s + site loads + share link works
Target: resolved within 10 min of detection.

**Rolling back a merge commit (PRs to main):** Use `git revert -m 1 <merge-commit-hash>`. The `-m 1` flag tells git to keep the first parent (main's prior state) and revert the merge. Without `-m 1`, git fails because it doesn't know which parent to keep.

---

## Release Ritual — Develop to Main Promotion

> Full 7-phase ordered sequence: see `docs/product/MASTER_DEV_REFERENCE.md` → **## Release Ritual — Develop to Main Promotion**
>
> Summary: feature branch (from develop) → PR to develop (draft, CI green, Vercel preview on real device) → 24h soak → PR to main (Ship Gate + docs checklist) → prod smoke test within 10 min → branch cleanup. Never push directly to main. Never cut from main. Never skip the soak (hotfix exemption only).

**Post-promote sync (required):** After every develop → main promote merges, immediately open a `sync/main-into-develop` PR to absorb the merge commit back into develop. Skipping causes 8-file conflict on the next promote. (Story 86, 2026-05-23)

---

## Analytics
> See `frontend/CLAUDE.md` → **## Analytics**

---

## Test Suite
Changes to `lineupEngineV2.js`, `scoringEngine.js`, or `playerMapper.js` → must pass frontend `npm test` (Vitest, **1444 passing / 1 skipped across 129 files** as of the v3.1.0 release-prep run on 2026-08-29 — fewer may be observed locally on Windows due to Bug #7 cold-start flake). Backend unit suite is **287/287** (see `backend/CLAUDE.md` § Test Suite). The v3.1.0 recount supersedes the post-ToS 1422/1 frontend and 276 backend figures after the scoring, sync, extraction, and test-inventory PRs merged.
Changes to `featureFlags.js` or `positions.js` → must pass frontend `npm test`.
Changes to backend code → must pass **both** backend test systems: the custom integration runner (`backend/scripts/tests/test-runner.js`, 13 suites, requires a running server) and the in-process unit suite (`npm run test:unit` — node:test + supertest, `backend/src/__tests__/*.test.js`, no server). The unit suite is enforced in CI by the `backend-unit` job; the integration suite by the `backend` job (CI_SAFE, prod read-only).
> Full suite detail: see `frontend/CLAUDE.md` → **## Test Suite** and `backend/CLAUDE.md` → **## Test Suite**

---

## Feature Flags
> See `frontend/CLAUDE.md` → **## Feature Flags**

---

## Error Boundaries
> See `frontend/CLAUDE.md` → **## Error Boundaries**

---

## UI Primitives
> See `frontend/CLAUDE.md` → **## UI Primitives**

---

## Git Staging Discipline

**Always stage specific files by path. Never `git add -A` or `git add .`.**

Blanket staging picks up unintended files silently — Claude Code hooks and other tooling can add files to the working tree mid-session that should not ship.

Correct pattern:
```bash
git add frontend/src/App.jsx frontend/package.json backend/package.json
git add docs/product/ROADMAP.md CLAUDE.md
```

If you over-stage, use `git restore --staged <file>` to unstage before committing.

---

## Roster identity — player name is the primary key

The pre-auth app uses player name as the stable identifier throughout: roster entries, batting order arrays, fielding grid, lineup engine, scoring state. Roster entries do NOT have an `.id` field.

Code that touches scoring or batter state must use:
```js
player ? (player.id || name) : name
```

NOT just `player.id` — that produces `undefined` for every roster entry and silently breaks downstream logic (advanceRunners, runner display, scoring math).

This convention is a pre-auth design choice. Once auth ships and players have stable user IDs, this pattern should be revisited and the entire app refactored to use proper IDs.

Story 1 (April 22, 2026) was the regression that surfaced this — every batter flowed through scoring with `id: undefined`, and runner placement, scoring, and diamond display were all silently broken in v2.3.2 prod. The one-line fallback resolved all four symptoms. Trust this convention.

---

## Key Conventions
- Display **first names only** throughout the UI — coaches use this on the sideline
- `touchDrag` state is a mutable ref (not `useState`) — avoids stale closure issues in touch handlers
- `grid` state is a 2D array `[inning][fieldPosition]` mapping to player IDs
- Supabase helpers: `frontend/src/supabase.js` — use `dbSaveTeamData()` / `dbLoadTeamData()` for all team data persistence
- `MERGE_FIELDS` is defined once as a shared const — do not duplicate at boot hydration and loadTeam hydration
- `truncateTeamName()` in `formatters.js` handles all team name display in compact contexts (scoreboard, headers, chips). It is word-boundary aware — never bypass it with raw team names. Default cap is 12 chars; use cap=10 for scoreboard contexts where horizontal space is tight on 375px viewports.
- Home/away semantic is first-class scoring context. Use `selectedGame.home` directly with a dedicated `HomeAwayChip` component — never bury it as metadata inside another element. Away games render with amber accent (`#f5c842`); home games render neutral (`#94a3b8`). Guard: `selectedGame && typeof selectedGame.home === 'boolean'` (excludes practice mode and legacy orphan games without the field).
- COMBINED_GAMEMODE_AND_SCORING — GA default-on as of Slice 3 (v2.5.9). Legacy ScoringMode and its Scoring tab removed. DugoutView is now the sole game-day surface. See `docs/SOLUTION_DESIGN.md` § Feature Flag System for full architectural history.
- **dugoutFocusMode** (v2.5.7+, revised v2.5.13) — Derived state machine inside DugoutView: `(currentAtBat !== null || scorerClaimed) ? 'scoring' : 'lineup'`. System-driven, not user-toggled. Behaviour by role:
  - **Scorer (`scorerClaimed=true`)** — `'scoring'` for the entire session. LiveScoringPanel stays visible so the coach can see the suggestedBatter card and start the first at-bat. DefenseDiamond is mounted but `display:none` and has no in-DugoutView toggle today; coach must exit DugoutView to review defense between at-bats. Scorer-side defense-view toggle is the designated follow-up — see Story 48.
  - **Viewer (`viewerMode=true`, `scorerClaimed=false`)** — original state machine still applies: `'lineup'` (DefenseDiamond) between at-bats, `'scoring'` (LiveScoringPanel) during. Unchanged from v2.5.7.
  - Both panels stay mounted; visibility toggled via CSS `display:none` to preserve DefenseDiamond inning-scrub state across at-bat boundaries. See `docs/SOLUTION_DESIGN.md` § dugoutFocusMode state machine for full architectural notes. **Rationale for revision:** v2.5.7 design created a deadlock — coach claimed scorer, `currentAtBat` was null, mode resolved to `'lineup'`, LiveScoringPanel was hidden, no UI to call `scoring.startAtBat()`, mode stuck on `'lineup'` forever. Surfaced as Story 16 ("No batting order set") — the empty-state copy was a misleading downstream symptom of the panel never becoming startable.
- **Badge context prop** (v2.5.12+) — Use `context="dark"` on `PlayerHandBadge` (or `Badge` directly) for dark surfaces like Game Mode and the scoring strip. Default `context="light"` applies to all light/cream backgrounds. Dark variants are token-driven: `tokens.color.overlay.whiteLight` background + `tokens.color.text.onDark` text. See `frontend/src/components/ui/Badge.jsx`.
- **Self-styled Support components** (v2.5.14+) — FAQSection, LegalSection, ValidationBanner, OfflineIndicator are self-styled via design tokens. Do not add C or S prop threading to these components. Pattern: import primitives + tokens directly; no external color/style props.
- **Primitive sizing via prop, not style** (Phase 3+) — Use the primitive's size prop; do not override via style. Example: `<Text size="body">`, not `<Text style={{fontSize:"13px"}}>`. Style-prop overrides bypass the token contract and re-introduce raw px values the design system explicitly enumerates. Anti-pattern caught by F5 regression guard in `FAQSection.test.jsx` (PR #144). See `frontend/src/components/ui/Text.jsx` for available size values.

---

## Key Infrastructure
- **Supabase project**: `hzaajccyurlyeweekvma.supabase.co`
- **Production backend**: `lineup-generator-backend.onrender.com` (Render Starter plan, $7/mo, no spin-down)
- **DEV backend**: **Corrected 2026-08-25 — this line was stale.** A persistent DEV backend exists on Render (`lineup-generator-dev-backend`, `srv-da2c7fqjnfac73aefmv0`, auto-deploys from `develop`, boots with `SUPABASE_TARGET=dev`); found running but crash-looping (missing `APPROVE_LINK_HMAC_SECRET` after #337 landed on `develop`, prod's own env var never having been copied to this service), fixed same session. `admin.dev.html` (#645) now points at it by default. Origin/owner of the service itself unconfirmed — it predates the #645 PR by a week (created 2026-08-18) and nothing in this repo's history documents who stood it up. For local backend testing instead: `cd backend && SUPABASE_TARGET=dev node index.js` — there is no `npm run dev` script in `backend/package.json` despite this line previously claiming one (found while investigating, #645/PR #825).
- **Mud Hens team ID**: `1774297491626`
- **UptimeRobot**: monitor #802733786 pings prod `/ping` every 5 minutes; alerts via email + push notification (mobile app)
- **Admin UI**: `https://dugoutlineup.com/admin.html`
- **Master ops doc**: `docs/product/MASTER_DEV_REFERENCE.md`

### Free-tier hosting trap (LESSON LEARNED — April 25-27, 2026)

UptimeRobot pinging a free-tier Render service every 5 min keeps it awake 24/7 ≈ 720h/month. Render free tier caps at 750h/month per workspace. With two services (prod + dev) on free tier, combined usage hits ~1440h — nearly double the cap. Render silently suspends services when the cap is reached.

**Symptoms:** Backend returns 503. Render dashboard shows "Free usage limit reached. Your service is now suspended until the next billing period." CI Backend Integration Tests fail at the health check step.

**Prevention rules:**
- Production-critical backends MUST run on Starter plan ($7/mo) or higher — never free tier
- If a deployed dev/staging backend is needed, EITHER upgrade it OR remove UptimeRobot monitoring on it (so it spins down between dev sessions and stays well under the cap)
- Do not run two free-tier services on the same Render workspace with 24/7 pinging — the math doesn't work

**Recovery:** Upgrade plan in Render dashboard (instant reactivation) OR wait until next billing cycle (auto-reactivates on the 1st of the month).

**Detection:** UptimeRobot alerts MUST go to a channel that physically interrupts (push notification, SMS, or both). Email-only alerts get missed — discovered the hard way during a 2-day prod outage that went unnoticed despite UptimeRobot correctly emailing alerts.

---

## Migration Notes
> See `backend/CLAUDE.md` → **## Migration Notes**

## Score Reporting Automation
> See `backend/CLAUDE.md` → **## Score Reporting Automation**

---

## Date Keys in localStorage
> See `frontend/CLAUDE.md` → **## Date Keys in localStorage**

---

## Known Open Bugs / Deferred Work

**Reviewed 2026-08-30 against `origin/develop` HEAD `6292a97` (v3.1.0 release candidate), prompted by the same-day QA & Reliability Audit ([#941](https://github.com/kaushikkuberanathan/lineup_generator/issues/941)).** Rows 1, 2, 5, 6, 12 were stale — closed or superseded upstream without this table being updated; corrected below. Row 4 updated to current Phase 4C step count and #355's reopened status. New row 14 added for a real bug the audit confirmed, then patched same-day when PR #952 fixed it within the hour — a live example of how fast this table can go stale. Rows 3, 7, 8, 9, 10, 11, 13 unchanged — still accurate.

| # | Bug / Item | Notes |
|---|------------|-------|
| 1 | ~~**Absent player auto-assign**~~ | **Resolved (code-inspection confidence, not re-verified live).** `engine.v2.test.js` Group 6 ("Absent player bench exclusion") asserts an absent-tagged player gets no grid entry at all — correctly excluded from every inning, not just under-benched. `USE_NEW_LINEUP_ENGINE` is `true` and not overridable, so the V2 engine is the only reachable path; the original report's V1-engine gap (`autoAssignWithRetryFallback` inside `App.jsx`) is moot in practice. |
| 2 | ~~**Game Ball "—" display bug**~~ | **No repro found in current code.** `normalizeGameBall()` coerces both legacy string and array forms; render logic shows the dash only when the array is genuinely empty; `gameBall` is one of the fields `MERGE_FIELDS` rescues on hydration. No dedicated fix commit was found for this specific report — flagging as "could not reproduce" rather than a confirmed fix. |
| 3 | **OOM contract test** | ✅ Resolved — `useLiveScore.contract.test.js` runs correctly in the warm-worker suite (7 tests, all passing, contributing to the 734 total). Cold-start isolation timeout is a Bug #7 symptom (Windows worker handshake), not a property of this file. No exclude needed. |
| 4 | **Phase 4C deferred** | **Updated 2026-08-30 — was stale.** Steps 1-2 of 7 are done (Story 129/#688): migration 019 Section A applied to PROD, auth-testing shims removed from `useLiveScoring.js`/`DugoutView.jsx`. 5 steps remain. **[#355](https://github.com/kaushikkuberanathan/lineup_generator/issues/355) was reopened 2026-08-30** by the QA & Reliability Audit: the four `*_anon_test` RLS policies AND a wide-open `allow_scorer_writes FOR ALL USING (true)` are still live in prod on `at_bats`/`live_game_state`/`game_scoring_sessions`/`scoring_audit_log` — anyone with the public anon key can rewrite scores, forge/delete at-bats, or steal the scorer lock for the real Mud Hens team. The audit log itself is anon-deletable and `actor_user_id`/`scorer_user_id` are untrusted TEXT, not FK'd to `auth.users`, so the trail is forgeable. Fixing this is WS-3 (requireAuth cutover) + WS-4 (FK restore) — parked until the full 7-step sequence lands. |
| 5 | ~~**MERGE_FIELDS test-file copies**~~ | **Resolved** — centralized into `frontend/src/utils/scheduleHydrationFields.js` (frozen `MERGE_FIELDS` export); `App.jsx`, `migrations.js`, and all three test files (`migration.test.js`, `scheduleIntegrity.test.js`, `scheduleHydrationFields.test.js`) import the single shared array. ([#920](https://github.com/kaushikkuberanathan/lineup_generator/issues/920), commit `75b42e4`, part of the v3.1.0 batch) |
| 6 | ~~**pending_sync not re-attempted**~~ | **Resolved** — `frontend/src/utils/pendingFinalizationSync.js` now retries automatically on the browser `online` event plus an install-time sweep (`installPendingFinalizationRecovery()`), in addition to the original localStorage marker. ([#921](https://github.com/kaushikkuberanathan/lineup_generator/issues/921), commit `152cd81`, part of the v3.1.0 batch) |
| 7 | **Windows Vitest cold-start worker-timeout flake** | Environmental — not a code issue. Presents as worker-startup timeout (may also cascade as OOM under low memory). See Branch Strategy → Infrastructure notes for workaround. `--no-verify` acceptable only when: (a) commit is docs-only or meta-governance, (b) this is the confirmed failure cause, (c) CI is running as authoritative gate. Not a general escape hatch. **Recurrence (2026-07-31):** `npm run test` on the dependabot-alerts fix branch silently dropped 2 test files under parallel workers (67/778 observed vs. 69/880 actual) — no error surfaced in the file/test counts, only in the unrelated "Unhandled Error" block. `npx vitest run --no-file-parallelism` recovered the full 69/880. Symptom signature: dropped file count with a passing exit code, not a failing one — treat any file-count drop between runs as this bug before treating it as a regression. Tracked as a permanent known-limitation in [#517](https://github.com/kaushikkuberanathan/lineup_generator/issues/517) — its own comment thread instructs against re-litigating the `pool: 'forks'` alternative. |
| 8 | ~~**BattingOrderStrip static when scoring engine advances batters (flag ON only)**~~ | **Resolved v2.5.7** — `battingIdxForStrip` switches source: `gameState.battingOrderIndex` (flag ON) vs App prop (flag OFF). |
| 9 | ~~**Bases diamond clips at bottom at 375px viewport (flag ON only)**~~ | **Resolved v2.5.7** — DugoutView flex-column shell with `overflow-y:auto` body eliminates vertical clipping. |
| 10 | ~~**Pitch map masked by scoring CTAs at 375px viewport (flag ON only)**~~ | **Resolved v2.5.7** — same flex-column layout fix as Bug 9; scoring-panel-mount scrolls within bounded body. |
| 11 | **App.jsx skip-worktree trap** | `frontend/src/App.jsx` has `skip-worktree` set as the physical gate enforcement mechanism. When unlocked for editing, `git diff` and `git status` show 0 changes even though edits ARE on disk. Symptom: `git diff frontend/src/App.jsx` returns nothing despite visible edits. Fix: `git update-index --no-skip-worktree frontend/src/App.jsx`, then re-run `git diff`. Re-lock after commit with `git update-index --skip-worktree frontend/src/App.jsx`. Verify lock state with `git ls-files -v frontend/src/App.jsx` — `S` prefix means skip-worktree is active. Hit in Story 67 and Story 61. **Check the S flag first whenever App.jsx diffs look empty.** |
| 12 | ~~**New team missing from Account tab until reload**~~ ([#729](https://github.com/kaushikkuberanathan/lineup_generator/issues/729)) | **Resolved 2026-08-22** — this row was stale; the fix shipped in v2.12.0 but the table was never updated. `useAuth.js` gained `refreshMemberships()` (re-fetches `GET /api/v1/auth/me`), wired into `createTeam()`'s save chain so a just-created team appears in Account/Home immediately, no reload needed. Story 135, PR #743. |
| 13 | ~~**`auth_events` CHECK constraint rejects `magic_link_requested`**~~ ([#736](https://github.com/kaushikkuberanathan/lineup_generator/issues/736)) | **Resolved 2026-08-29** — migration 027 (`backend/migrations/027_add_magic_link_requested_to_auth_events.sql`) widens `auth_events_event_type_check` to add `magic_link_requested`. Applied to DEV (`psqvzppphdedqkpmarwx`) and PROD (`hzaajccyurlyeweekvma`) same session; both verified with a real insert + cleanup against the live constraint (not just a query against `pg_constraint`), and `get_advisors` re-run clean on both with no new findings. See `backend/CLAUDE.md` → Migration Notes for full detail. |
| 14 | ~~**Bench-rotation fairness bug**~~ ([#942](https://github.com/kaushikkuberanathan/lineup_generator/issues/942)) | **Found and resolved same day, 2026-08-30.** Found by the QA & Reliability Audit ([#941](https://github.com/kaushikkuberanathan/lineup_generator/issues/941)): the V2 lineup engine's bench selection was deterministic and score-based with no rotation-history tracking, so statistically-identical players (an ordinary youth-league roster shape) benched the same 2 lowest-index players every single inning while others never sat at all — exactly the failure mode `FairnessCheck.jsx`'s own "no player benched more than once" card exists to catch. **Fixed within the hour** by PR [#952](https://github.com/kaushikkuberanathan/lineup_generator/pull/952) — `lineupEngineV2.js`'s bench selection now tracks rotation history; `bench-equity.test.js` Test 2.1 is un-skipped and passing on `develop`. This row was itself briefly stale — the fix landed 2 minutes after this table's own 2026-08-30 audit pass merged, catch documented in a same-day release-planning handoff. |

---

## Game Mode Action Tiers

Three distinct intents in the scoring screen — each maps to a different control:

| Intent | Control | Result |
|--------|---------|--------|
| **Pause** | ✕ icon (top-right) | Exits panel, lock held, heartbeat continues, can resume |
| **Hand off** | Gear → Hand off scoring | Releases lock, opens to next scorer, score preserved |
| **Finish** | Gear → Finish Game… | Writes final score to schedule, releases lock, idempotent |

Heartbeat TTL note: The heartbeat (20s interval) survives pause because `ScoringMode` stays mounted. It stops if the user navigates away to a different tab — the `useEffect` cleanup calls `stopHeartbeat()`. The lock row persists in `game_scoring_sessions` but becomes stale (no `last_heartbeat` update). No TTL auto-expiry exists on the backend.

---

## Known Platform Limitation — Android PWA Screenshots
> See `frontend/CLAUDE.md` → **## Known Platform Limitation — Android PWA Screenshots**

---

## Phase 4C Auth Cutover — Scoring Shim Removal Checklist

> Full checklist: [docs/ops/PHASE4C_CUTOVER.md](docs/ops/PHASE4C_CUTOVER.md)

---

## Security Practices

The phased security roadmap lives in `docs/product/SECURITY_FRAMEWORK.md`. Standing Practices listed in that doc become permanent rules here as items ship. Currently no items have shipped — section will be populated incrementally. **Clarified 2026-08-04:** this refers specifically to the 6 enumerated Cross-Phase Standing Practice candidates in that doc (still not started) — it does not mean no security work has shipped at all. Real, live security fixes (RLS on team_data/teams/roster_snapshots, roster-wipe guard, OAuth membership gate, request-access validator) have shipped as emergency remediation outside the planned phase sequence — see `SECURITY_FRAMEWORK.md`'s Status Tracker, Phase 4 row.

---

## Locked Files

The following files require a gate phrase before any edit. This prevents accidental modification of high-risk surfaces during multi-step sessions.

| File / Path | Gate phrase |
|---|---|
| `frontend/src/App.jsx` | *"all clear — App.jsx editing approved"* |
| `frontend/src/utils/migrations.js` | *"all clear — migrations.js editing approved"* |
| `frontend/src/utils/formatters.js` | *"all clear — formatters.js editing approved"* |
| `frontend/src/utils/flagBootstrap.js` | *"all clear — flagBootstrap.js editing approved"* |
| `frontend/src/components/game-mode/*` | *"all clear — game-mode editing approved"* |
| `frontend/src/components/ScoringMode/*` | *"all clear — ScoringMode editing approved"* |
| `frontend/package.json` | *"all clear — frontend/package.json editing approved"* |
| `backend/package.json` | *"all clear — backend/package.json editing approved"* |
| `CLAUDE.md` | *"all clear — CLAUDE.md editing approved"* |

**Push gate phrase:** *"confirmed — push to [branch-name]"* — required before any `git push` to a named branch. Never push without the explicit gate phrase AND a clean local build.

**Why these files:** App.jsx is a 10,000+ line monolith where accidental edits cause hard-to-detect regressions. migrations.js, formatters.js, and flagBootstrap.js are extracted utilities with their own test suites — changes here have cross-cutting impact. game-mode/ and ScoringMode/ are the live game-day surface. Both package.json files gate the version bump ritual.

---

## Issue & Backlog Hygiene

Every Story in ROADMAP.md must have a corresponding GitHub Issue. This is non-negotiable — it enables `closes #N` in commits, label-based filtering, and automation hooks.

### Rules (enforce every session)

1. **New story → GitHub Issue same session.** Use the Story issue template at github.com/kaushikkuberanathan/lineup_generator/issues/new/choose. Never leave a story in ROADMAP.md with a bare `<!-- #N -->` placeholder — the marker must contain a real issue number before session close. If file-time issue creation isn't done, run `node scripts/sync-stories-to-issues.js` before ending the session.

2. **Batch sync.** When stories accumulate without issues, run:
$env:GITHUB_TOKEN = $TOKEN
node scripts/sync-stories-to-issues.js --dry-run   ← review first
node scripts/sync-stories-to-issues.js              ← create
   Script is idempotent — safe to re-run, skips already-linked stories.

3. **Commit message convention.** Any commit that resolves a story must include `closes #N` or `fixes #N` in the message body. GitHub auto-closes the issue on merge to main.

4. **PR body convention.** The Related Issue field in every PR body must reference the issue number(s) the PR resolves. Never leave it as N/A if a story is being closed.

5. **Label discipline.** All issues must carry at minimum one `priority:*` label and one `type:*` label. Area labels are strongly recommended. Labels follow `prefix:name` convention (no spaces). Full taxonomy in `docs/process/ISSUE_TRACKING.md`.

6. **DOC_TEST_DEBT items** also get GitHub Issues using the Governance template. Reference the issue number in the debt ledger entry.

7. **Session-close sync gate.** Before ending any session where ROADMAP.md was modified: run `node scripts/sync-stories-to-issues.js` to patch any remaining `<!-- #N -->` placeholders. Then commit the patched ROADMAP.md. Prevents multi-session marker debt (9 stories accumulated without issue numbers — discovered 2026-05-26).

### Scripts

| Script | Purpose |
|---|---|
| `scripts/sync-stories-to-issues.js` | Parse ROADMAP.md → create GitHub Issues → patch `<!-- #N -->` markers |
| `scripts/setup-github-labels.ps1` | Bootstrap/reset all 31 labels (run after repo clone or label drift) |

### Label taxonomy quick reference

| Group | Labels |
|---|---|
| Priority | `priority:p0` `priority:p1` `priority:p2` `priority:p3` |
| Type | `type:bug` `type:feature` `type:chore` `type:governance` `type:hotfix` `type:incident` `type:docs` `type:refactor` |
| Area | `area:scoring` `area:auth` `area:ux` `area:backend` `area:ci-ops` `area:game-mode` `area:share-link` `area:roster` `area:supabase` `area:analytics` |
| Status | `status:blocked` `status:in-progress` `status:deferred` `status:needs-repro` `status:ready-for-review` |
| Meta | `auto-created` `source:coach-feedback` `needs-overnight-soak` `hotfix-exception` |

Full label definitions and inference rules: `docs/process/ISSUE_TRACKING.md`.

---

## Ship Gate

Before shipping any non-exempt release, answer these four questions:

1. Does every feature touched in this release have a test covering the golden path?
2. Does every touched feature have documentation reflecting current behavior?
3. Does `docs/product/FEATURE_MAP.md` have a current row for every touched feature?
4. Are all P0 items in `docs/product/DOC_TEST_DEBT.md` resolved or explicitly unblocked?

If any answer is "no" — **stop**. Document the debt, then decide whether to proceed.

**Minor version gate (x.Y.0 bumps only):** Before bumping minor version, run `debt-p0` from repo root (bash: `source scripts/debt-helpers.sh && debt-p0`; PowerShell: `. .\scripts\debt-helpers.ps1; debt-p0`). Must return "P0 gate clear" before proceeding.

**Exempt release types** (no Ship Gate required):
- **Meta-governance** — docs-only, zero app code changes. Use `techNote: "Minor fixes and internal improvements"` in VERSION_HISTORY.
- **Hotfix** — must include `[hotfix-exception]` in the commit message body with one sentence explaining why the gate is bypassed.

The Ship Gate exists because we've shipped broken features before. Treat it as a ritual, not bureaucracy.

---

## Pre-release Docs Checklist

Before opening a `develop → main` PR, walk through these items. For each, answer: "Is this relevant to what this release touches, and is it current?"

### Version and changelog

1. `APP_VERSION` bumped in `frontend/src/App.jsx`
2. `version` bumped in `frontend/package.json` and `backend/package.json`
3. `VERSION_HISTORY` entry prepended in `frontend/src/data/versionHistory.js` with `userChanges` (coach-readable), `internalChanges` (file-level specificity), and `techNote` (one-line summary)
   - `techNote` must be one of the four approved strings in `APPROVED_TECH_NOTES` — see `frontend/src/__tests__/versionHistory.test.js`. Free-form techNote values fail CI.
4. `CLAUDE.md` "Current Version" line updated + changelog bullet added

### Backlog and roadmap

5. `docs/product/ROADMAP.md` — release entry at top, completed stories moved to shipped section, new backlog items logged
6. `docs/product/FEATURE_MAP.md` — row for every touched feature, test file lists current, coverage summary recounted
7. `docs/product/DOC_TEST_DEBT.md` — ages updated, targets corrected, new test files recognized, resolved items moved to Resolved

### Architecture and convention

8. `docs/SOLUTION_DESIGN.md` updated if architecture changed (new hooks, state fields, guards, schema columns, conventions)
9. `CLAUDE.md` updated with new architectural conventions, pitfalls, or "trust this pattern" notes

### User-facing

10. `frontend/src/content/faqs.js` — new FAQs for any feature coaches interact with; existing FAQs updated if their answers are no longer accurate
11. `README.md` updated if install/deploy/usage changed

### Test hygiene

12. New test files listed in `docs/product/DOC_TEST_DEBT.md` test inventory
13. Test count in `CLAUDE.md` matches actual suite total
14. Pre-push hook runs and passes on the release branch before PR opens (hook validates branch guard + skip-on-deletion only — Vitest suite removed by Story 75, PR #155; CI is the authoritative test gate)

### Final gate

15. Vercel preview deployed and phone-smoke-tested on a real device and network (DevTools simulation does not replace this)
16. Branch protection on `main` enforces CI checks + preview deployment green — no bypass
17. On the PR merge dropdown — select **Create a merge commit**, not Squash and merge. Promote PRs (develop → main) must preserve the individual develop commit history on main. Squash collapses all develop work into one commit, losing PR-level granularity. (Story 79, 2026-05-21)
18. Run `node scripts/sync-stories-to-issues.js` — confirm all `<!-- #N -->` markers in ROADMAP.md are patched with real issue numbers before promote. Commit any patches as a docs-only PR to develop first.
19. Any roadmap/changelog entry describing work that hasn't promoted from develop to main must carry a `(develop only — not yet promoted)` tag until the next promote lands. (Added 2026-08-04, Doc Audit Spike Systemic Issue #1 — several docs described v2.8.4-era work as flatly shipped while main was still on v2.8.3, with no way for a reader to tell the difference.)

If any relevant item is "no" — **stop**. Open a docs patch first. This patch was introduced because v2.3.3 shipped without docs updates, requiring a catch-up hygiene patch (commit `2652ed7`, April 24 2026).

**Scope judgment:** Not every item applies to every PR. A scoring feature PR typically needs items 1–11 and 13–16. A typo-fix PR needs items 1–4 and 15–16 only. Use judgment. The rule: if an item is relevant and the answer is no, block the merge.

**Exempt release types** (same as Ship Gate):
- **Meta-governance** — docs-only, zero app code changes. Items 1–4 can be skipped (no version bump for pure doc touchups).
- **Hotfix** — must include `[hotfix-exception]` in the commit message body. May skip items 10–11 if no user-facing behavior changed.

The Pre-release Docs Checklist exists because we've shipped features without matching documentation updates. It's a parallel gate to Ship Gate — Ship Gate asks "is this release ready?", this checklist asks "did you actually update the doc files?"

---

## Audit Cadence

Every other session: open `docs/product/DOC_TEST_DEBT.md` — close P0s, promote resolved P1s, log new gaps. Update `docs/product/FEATURE_MAP.md` for any feature whose behavior changed this session.

---

## Feature Map Update Rules

`docs/product/FEATURE_MAP.md` — update whenever a feature ships, changes, or gets its docs/tests repaired. Column meanings: **Doc Status** `✅ Current` · `⚠ Stale` · `❌ Missing`; **Test Status** `✅ Yes` · `⚠ Partial` · `❌ None`.

---

## Current Version
**v3.1.0 release candidate** — August 2026, on `develop`, not yet promoted. Release tracker: #939. This minor release adds versioned Terms/Privacy consent to registration, improves the Game Day scoreboard and batting-order navigation, and retries pending completed-game synchronization. Migration 028 is applied and verified on DEV/PROD. The 2026-08-30 migration reconciliation also completed migration 023 on PROD, restricted migration 013's DEV-only helper through migration 029, ledgered the already-live teams DELETE revocation through migration 030, and reconciled migration 026's committed definition with the identical live DEV/PROD implementation. Migration 024 remains intentionally DEV-only and migration 019 Section B remains intentionally deferred. Automated release evidence must be recorded on the final candidate SHA; the 24-hour soak and real-device Game-Day Validation remain open. Production promotion still requires `confirmed — push to main`. Full version history lives in `frontend/src/data/versionHistory.js`.

- v3.1.0 (2026-08-29, **release candidate on `develop`, not promoted**): versioned legal-doc experience + registration consent gate (PRs #907/#910/#913), with service-role-only version audit records through migration 028; Game Day scoreboard/batting-order fixes (#922/#924/#925, PR #923); pending completed-game retry (#921, PR #933); behavior-preserving SharedView/Support extraction and schedule-hydration cleanup (PRs #934-#937); executable Vitest file-inventory guard plus email/ops contract coverage (PRs #929-#931). Feature/docs/test mapping is current in `FEATURE_MAP.md` row 41 and `AUTH_SECURITY_AUDIT_ROADMAP.md`. Release tracker #939 remains open through production verification. #698 remains open until KK records the required real-device Game-Day Validation. Version files are aligned at 3.1.0; soak starts only after the release-prep PR merges and the candidate SHA is frozen.
- v3.0.0 (2026-08-29, **promoted to `main`, live in prod**): **Major version bump, a deliberate departure from this repo's own "size the bump to the release's actual scope" convention** — every prior release this size or bigger (v2.9.0, v2.14.0) was still sized minor. Decided by KK 2026-08-29, explicitly NOT gated on Phase 4C completion (2 of 7 shim-removal steps done, 5 remain) — recorded here so this isn't misread later as "the auth cutover finished." 104 commits / 34 top-level PRs merged to `develop` since v2.15.0 promoted to `main` (`5a38b08`, 2026-08-27). **Phase 4C auth cutover, steps 1-2 of 7** (Story 129/#688, under #355): migration 019 Section A applied to PROD (PR #898); auth testing shims removed from `useLiveScoring.js`/`DugoutView.jsx` — no more zero-UUID/device-id fallback for an unauthenticated scorer (PR #899). The permissive RLS policies (`allow_scorer_writes`, the `*_anon_test` backdoors) are still live in prod; #355 stays open. **Security debt closed** (both flagged open since v2.9.0's CodeQL batch): share-link ID generation now uses `crypto.getRandomValues()` instead of `Math.random()` (#650, PR #886); `GET /me`/`POST /logout` rate-limited by user id (#651, PR #885); plus new RLS test coverage for non-admin membership isolation (#348, PR #887). **Real bugs fixed:** Gmail dot-variant email lockout at login (#374, PR #894); magic-link validation now runs before `loginLimiter` on `POST /magic-link` (#329, PR #891); `auth_events` CHECK constraint widened for `magic_link_requested` (#736, migration 027, PR #893); Home team card's Edit/Delete menu items role-gated (#666, PR #895); share-link error-mode surfacing on load failure (#127, PR #889); song-payload parity restored between the two share paths (#502, PR #888). **UX:** Support → "Help" redesign (Story 333/#865, PR #867/#869) folds into this release's real version number — see the v2.15.1 entry below for full detail, that label was always documentation-only. **Backend/infra:** CORS rejections now return 403 and log the origin (#389, PR #881); `write_source` role-based fallback for `team_data_history` (#379, PR #880); DEV protection health-check (#314, PR #884); DEV rebuild seeded with synthetic roster (PR #883); test/CI environment safety fixes for #339/#368. **Dependencies:** routine Dependabot bumps — `@supabase/supabase-js` (both packages), `@vitejs/plugin-react`, `mixpanel-browser`, `vitest`/`@vitest/ui`. **Verification (2026-08-29, re-run fresh against `develop` HEAD `bf097f0`, not carried forward):** `debt-p0` gate 0 open P0 (direct recount matched `DOC_TEST_DEBT.md`'s dashboard exactly — no drift). Frontend 1401 passed / 1 skipped (122 files, up from 1377/1/120). Backend unit 269/269 (up from 254), run with CI's own dummy-env pattern (`SUPABASE_URL=https://ci-hermetic.invalid`, etc.). CI re-confirmed green via the GitHub Actions API on `bf097f0`: Backend Integration (CI_SAFE, prod read-only), RLS Policy Suite (ephemeral), Frontend Vitest, Backend Unit, Sync-script — all `success`. `FEATURE_MAP.md` row 40 (Help) already current; no other touched surface is a discrete coach-facing feature needing its own row. Version bumped to 3.0.0 on `develop` (PR #900, merge `426d052`) and soak-freeze banner added (PR #901, merge `08c54f0`) same session. **Soak explicitly overridden 2026-08-29T11:07:18Z by KK** — ~9h40m into the 24h window (~14h20m remaining), same pattern as v2.9.0/v2.10.0/v2.11.0/v2.12.0/v2.14.0's overrides. **Promoted to `main` 2026-08-29** (PR [#903](https://github.com/kaushikkuberanathan/lineup_generator/pull/903), regular merge, `c865d4e`) — confirmed a genuine 2-parent merge via `git log --format='%P'`. One real CI-blocking finding surfaced during the promote: CodeQL flagged a high-severity `js/incomplete-url-substring-sanitization` alert on `backend/src/__tests__/cors.test.js`'s C9 test — verified false positive (the assertion checks a `console.warn` call happened, not a security decision) and fixed via exact-match instead of substring `.includes()` (PR [#904](https://github.com/kaushikkuberanathan/lineup_generator/pull/904), RED→GREEN mutation-verified). Prod smoke test same session, verified via the Render/Vercel platform APIs (not curl, blocked by this remote session's egress policy): Render backend deploy `dep-da9c3irl550s739rlc6g` for `c865d4e` status `live`; Vercel production deployment `READY`, `githubCommitSha` matching. **Real-device phone smoke test confirmed passing by KK** same session. Post-promote sync (PR [#905](https://github.com/kaushikkuberanathan/lineup_generator/pull/905)) merged the same session, `0d24c30` — `main` and `develop` confirmed content-identical after the sync. Full branch hygiene performed same session (5 feature branches auto-deleted remotely, local branches + stale remote-tracking refs pruned); `scripts/sync-stories-to-issues.js` found zero unlinked ROADMAP.md stories. See `docs/product/ROADMAP.md`'s matching v3.0.0 entry for the full PR-by-PR breakdown.
- v2.15.1 (2026-08-28, **documentation-only label, no version bump executed — develop only**): Support redesigned from a 7-persona FAQ list into a task-oriented "Help" experience (Story 333/#865, PR #867), following a product review of a GameChanger-style Help Center proposal. Decision: adopt the information architecture, not hosted infrastructure — content stays bundled and precached by the existing Workbox config, preserving the offline-first guarantee. `content/faqs.js` restructured into a flat `HELP_ARTICLES` list (`id`/`category`/`title`/`answer`/`gameDayCritical`/`keywords`) + `HELP_CATEGORY_META` for 6 task-oriented categories (Getting Started, Players & Roster, Lineups, Game Day, Sharing & Scoring, Account & Troubleshooting). New Game-Day Help quick-access section and a client-side search box (no library/server/AI), plus privacy-safe analytics (`help_search`, `help_article_open`, `help_category_view` — never raw query text). **Content-accuracy pass against actual code, not the prior FAQ text:** verified `QuickSwap.jsx`/`toggleAbsentTonight` directly and found the old FAQ implied a late/injured player could be added to or pulled from an active game in one step — there is no such action, only a per-inning manual Quick Swap; rewrote the three affected Game Day articles accordingly. Known product gap surfaced, not fixed: no single action removes a player from all remaining innings and rebalances the lineup automatically. `App.jsx`'s `MORE_SUBTABS` "faq" label changed "FAQ"→"Help" (locked-file edit under explicit gate-phrase approval). Hosted external Help Center evaluated and explicitly rejected for now. **Verification:** frontend 1368→1377 passed / 1 skipped (120 files, `FAQSection.test.jsx` grown 6→15 tests), backend unit unchanged 254/254, lint/build clean. Merged to `develop` as a genuine 2-parent merge commit (confirmed via `git log` parents, not squashed). **Not promoted; version not bumped** — `APP_VERSION`/both `package.json` files remain `2.15.0` pending an explicit release-cut decision (KK's explicit choice: document now, decide the real version number later). See `docs/product/ROADMAP.md` § Story 333 and `docs/product/FEATURE_MAP.md` row 40 for full detail.
- v2.15.0 (2026-08-26): **Minor bump** — three unrelated consolidation passes bundled together (dependency currency, git/governance, Test Health & Regression Protection), sized above patch per the established convention: real dependency major-version migrations plus a real repo-governance settings change are enough surface area to justify it even with zero new coach-facing features. **Dependency currency:** ESLint 8→9.39.5 with the required flat-config rewrite (`.eslintrc.cjs`→`eslint.config.js`, `eslint-plugin-react`'s peer-dep ceiling is the reason 10 isn't reachable yet), React 18→19.2.8 (both `react`+`react-dom` bumped together — a prior Dependabot PR had only bumped `react-dom`, a real mismatch). A 9-issue backlog closed to these 2 real items plus 6 stale/duplicate/already-fixed closures (#135, #321, #322, #371, #469, #473); #636 reopened and retitled as a standing umbrella tracker rather than a one-off. **Git/governance:** repo settings now disable squash and rebase merging entirely (Settings → General → Pull Requests) — real prevention, not just the existing squash-detection CI guard (`.github/workflows/merge-policy-guard.yml`). New `.github/workflows/pr-target-branch-guard.yml` catches a PR title declaring one merge direction while its base branch says another (the exact #122 incident shape). Conflict-resolution decision tree for develop/main divergence added to this file's Branch Strategy section. An 11-issue-plus-label-search backlog closed to these 2 real items, 9 stale closures, and the 1 settings change. **Test Health & Regression Protection:** consolidated 8 fragmented testing issues into umbrella #840 with a false-confidence/critical-path-gaps/test-infrastructure tranche structure (KK's own proposed shape). Completed Passes 2 and 4 of an in-progress 4-pass test-drift-and-coverage survey (#406/#410) — found and fixed a real "replica divergence" bug: `utils/flagBootstrap.js` was extracted from an `App.jsx` `useEffect` specifically to be unit-tested, but the extraction was never wired back in, so its green test suite asserted behavior the running app didn't execute (the same anti-pattern as this file's own documented Bug #5, found fresh in a new subsystem). Also closed: `GET /api/v1/feedback` (an admin route with zero coverage of any kind, absent from `backend/CLAUDE.md`'s own route list), 2 untested auth/roles assumptions (`requireAdmin`'s exact-match legacy-role behavior, `GET /me`'s raw role passthrough), 3 previously-untested components (`BrandMark.jsx`, `game-mode/BenchStrip.jsx`, `storage.js`), the last 3 of #474's 6 flagged admin routes, and #664 (untangled — it conflated 2 unrelated asks under one issue number). **Dead code removed:** `POST /request-access`'s phone-channel path (`detectChannel`/`normalizeContact`) — the frontend never sent a `phone` field, and it contradicted this file's own Auth Strategy section ("no phone or SMS dependency anywhere in the stack"); historical DB rows already holding `phone_e164` are untouched. **Default-branch decision (#488):** confirmed `develop` stays GitHub's default branch — an intentional call, not a leftover — verified directly via the API and reconciled against live evidence (issues auto-closing on develop-only merges while `main` sat 71 commits behind) rather than restated from the original 2026-08-01 finding. **Verification:** backend unit 220→250, frontend 1301→1368 passed / 1 skipped (120 files), lint/build clean, `debt-p0` gate clear (0 open P0s). **Soak: not overridden this time** — KK explicitly chose to wait the full 24h rather than override, a break from the v2.9.0-v2.14.0 pattern of every prior release overriding it. Soak clock started at `develop` HEAD `b7bbe25` (2026-08-26T09:01:59-04:00); cleared 2026-08-27T09:01:59-04:00. **Promoted to `main` 2026-08-27** (PR [#857](https://github.com/kaushikkuberanathan/lineup_generator/pull/857), regular merge, `5a38b08`) — confirmed a genuine 2-parent merge via `git show -s --format=%P`. Prod smoke test same session: backend `/ping` 200 OK, frontend loads clean; Render (`lineup-generator-backend`) and Vercel (`line-up-generator`, alias `dugoutlineup.com`) both confirmed serving the exact promoted commit via direct deploy-record queries (Render deploy `dep-da8c0mjtqb8s73crluj0` status `live`; Vercel deployment `READY`, `githubCommitSha` matching). Post-promote sync (PR [#858](https://github.com/kaushikkuberanathan/lineup_generator/pull/858)) merged the same session — no real diff (`main` and `develop` were already content-identical), so it landed as a pure ancestry-linking merge commit. Full branch hygiene performed same session: sync branch deleted (local + remote, remote auto-deleted), one already-merged local branch (`docs/2026-08-25-session-retro`) deleted, local `main` ref fast-forwarded. `scripts/sync-stories-to-issues.js --dry-run` found zero unlinked ROADMAP.md stories — no patch needed. On-device Game-Day Validation (Game Mode, lineup generation, share link) not independently re-run this session — no user-facing behavior changed in this release, but the React 18→19 bump touches the render path; recommend a quick manual pass.
- v2.14.0 (2026-08-25): **Minor bump** — bundles a completed security remediation (admin.html, #338/#787), a real security vulnerability fix (unsigned/replayable approve-deny links, #337), and three smaller security/reliability/docs items (#346, #347, #350, #645) that landed on `develop` in the same window, per KK's explicit "bundle it all now" call. **admin.html Supabase-bypass remediation complete — #338 and #787 both closed.** Following up on PR #780 (Approve/Deny, in v2.13.0), the remaining 6 mutating admin.html actions were routed through the backend, one PR per endpoint per `docs/product/ADMIN_HTML_BYPASS_REMEDIATION_PLAN.md`: **#788** feature-flag toggle → `PATCH /api/v1/feature-flags/:flagName` (PR #811); **#789** Remove Coach → `DELETE /api/v1/coaches/:membershipId`, hard-delete semantics preserved exactly (PR #815); **#790** Add Coach → `POST /api/v1/coaches`, role validated against `CANONICAL_ROLES`, membership status changed to `'invited'` (deliberate, matches `/admin/approve`'s semantics) with a duplicate-membership pre-check added since `team_memberships` has no DB constraint for it (PR #817); **#791** Add Team → `POST /api/v1/teams`, fixes a live bug for free (the platform admin no longer silently becomes a member of every team they create, since the route runs service-role) plus server-generates the team id (PR #818); **#792** Roster save → `POST /api/v1/teams/:teamId/roster`, reuses `teamData.js`'s already-exported `rosterWipeGuard` rather than duplicating it — zero changes to that file (PR #819); **#793** Schedule save → `POST /api/v1/teams/:teamId/schedule`, deliberately has no wipe guard since Clear Schedule is an intentional wipe (PR #820). 38 new backend tests across the 6 routes, every one RED→GREEN mutation-verified. **Manual DEV check (2026-08-25):** KK ran the manual checklist against `dev.dugoutlineup.com/admin.html` and hit real errors on 3 of 6 flows — root-caused to `admin.html`'s hardcoded prod `BACKEND_URL` (none of the 6 new routes exist on `main` yet, so every call 404s), not a defect in the routes themselves; resolves once this release promotes. **HMAC-signed approve/deny links (#337, PR #822):** the public 1-tap approve/deny email links previously trusted raw unsigned `requestId`/`teamId` query params with no expiry (a forwarded/guessed link could be replayed indefinitely) and never set `reviewed_by`; now HMAC-SHA256 signed, 24h-expiring, action-bound tokens, `reviewed_by` resolved to the real admin at click time. New required env var `APPROVE_LINK_HMAC_SECRET` — **confirmed set in Render prod and GitHub Actions secrets before this promote.** Same PR added rate limiting to both link routes per a CodeQL finding. Backend unit suite 199→220. **Admin panel usability fix (#346, PR #823):** Pending Requests/Coaches tabs no longer show ~600 automated test-suite rows by default — real requests were getting buried; hidden behind a toggle, not deleted. **Schema FK-integrity test (#347, PR #824):** new test suite asserts the `team_memberships`→`teams` FK (fixed in prod by migration 008, but never asserted) plus a deliberate known-gap assertion for `access_requests.team_id`. **DEV admin panel variant (#645, PR #825):** new `admin.dev.html`, points at the DEV Supabase project + local backend, so admin changes can be rehearsed off prod data. **Docs currency pass (#350, PR #826):** `SOLUTION_DESIGN.md` § Admin UI corrected, `SECURITY_FRAMEWORK.md` Status Tracker corrected on 4 items after direct code verification. **Also this pass:** #698 was found silently auto-closed one second after its own migration PR merged despite that PR's explicit no-closing-keyword intent — reopened with evidence (still open, pending the real on-device Game-Day Validation pass); v2.13.0's promotion status corrected in this file and `ROADMAP.md` from a stale "not yet promoted" freeze notice to the real, already-live state (PR #808); `backend/CLAUDE.md`'s Routes section and Unit-suite table brought current; `docs/TROUBLESHOOTING.md` and `docs/product/AUTH_SECURITY_AUDIT_ROADMAP.md` corrected to stop describing admin.html as bypassing the backend. **Post-merge fix, same session:** the previously-undocumented `lineup-generator-dev-backend` Render service (see § Key Infrastructure) was found crash-looping — missing `APPROVE_LINK_HMAC_SECRET`, which had only been set on the actual prod service. Fixed (KK supplied the value, reused on the dev service), redeployed clean (`Server running on port 10000`), `admin.dev.html` repointed to it as the default `BACKEND_URL` instead of localhost-only, and both this file's and `admin.dev.html`'s stale "no persistent DEV backend" claims corrected. **Verification:** backend unit 220/220, frontend 1301 passed / 1 skipped (115 files), lint/build clean, `debt-p0` gate clear. **Soak explicitly overridden 2026-08-26 by KK** — ~21.5h into the 24h soak when asked, KK chose to override rather than wait the remaining ~2.5h, same pattern as v2.9.0/v2.11.0/v2.12.0. **Promoted to `main` 2026-08-26** (PR [#829](https://github.com/kaushikkuberanathan/lineup_generator/pull/829), regular merge, `29a29b5`) — confirmed a genuine 2-parent merge via `git show -s --format=%P`, not just the GitHub UI. Prod smoke test same session: backend booted clean with no thrown errors (`Server running on port 3000`, `Your service is live 🎉` — confirms `APPROVE_LINK_HMAC_SECRET` really is set on the prod Render service, not just asserted), Vercel production deployment `READY` on the promoted commit (confirmed via direct deploy-record queries, not the dashboard). Post-promote sync (PR [#830](https://github.com/kaushikkuberanathan/lineup_generator/pull/830)) merged the same session — its first CI run surfaced one genuine, unrelated-to-the-sync-itself failure: `VAL-16` (`backend/scripts/tests/suite-validation.js`, live-prod integration suite) still called `/admin/approve-link` with the pre-#337 raw-query-param shape, so it 400'd instead of reaching the 404 path it was checking, now that prod was actually running #337's new signed-token contract for the first time. Fixed by signing a real token via `approveLinkToken.sign()`, verified in-process before pushing; `VAL-14`/`VAL-15` still pass today but have stale descriptions post-#337 — logged as non-blocking test debt, not fixed in that pass. Full local + remote branch hygiene performed same session: 3 merged local branches deleted (`claude/dev-prod-migration-assess-ckgefe`, `fix/dev-backend-hmac-secret-and-docs`, `sync/main-into-develop-v2140`), stale remote-tracking refs pruned — remote itself was already clean (this repo auto-deletes merged PR head branches).
- v2.13.0 (2026-08-23): **Minor bump** — completes a multi-week design-token migration on two Locked, live-game-day files plus a real auth bug fix, sized above a patch per the v2.9.0-v2.12.0 "size the bump to the release's actual scope" convention. **Story 133 (#698) code-complete (PR #764):** all 13 of 13 slices for the `game-mode/*` + `ScoringMode/*` design-token migration (384 literal-hex color occurrences across 14 files) merged to `develop`, plus a bonus `components/ui/*` primitives token migration (PR #759). Slices 5-13 were built on an isolated `feature/story133-slices5-13-sandbox` branch per KK's instruction (kept off `develop`/`main` during the v2.12.0 soak), independently re-verified per slice, then promoted as one PR. **Does not close #698** — closure requires a full real on-device Game-Day Validation pass across the complete migration, done manually by KK, not yet performed. **Correction, 2026-08-24: #698 auto-closed anyway** one second after PR #764 merged despite that PR's body explicitly carrying no closing keyword — the same premature-closure failure mode #698 was filed to track (see #503). Reopened 2026-08-24 by explicit KK instruction; stays open until the real on-device validation pass is performed and recorded on the issue. One known finding preserved on purpose, not yet fixed: `InningModal.jsx`'s `POS_COLORS.LC` is `#27ae60` (green), diverging from the canonical `color.position.LC` (`#2980b9`, blue) used everywhere else. **admin.html Approve/Deny bypass fix (partial fix for #338, PR #780):** both handlers now route through `POST /api/v1/approve`/`POST /api/v1/reject` (Bearer-token authenticated) instead of writing `team_memberships`/`access_requests` directly via the Supabase client SDK — restores role validation, `reviewed_by` attribution, and the approval/denial emails the direct writes silently skipped. Still bypassing the backend: Add Coach, Remove Coach, Add Team, roster writes, schedule writes, feature-flag toggles — each needs its own backend route built first; #338 stays open (see `docs/product/ADMIN_HTML_BYPASS_REMEDIATION_PLAN.md`, scoped 2026-08-23, sub-issues #788-793, for the implementation plan covering the remainder). **Correction, 2026-08-25: this is now fully resolved** — see the develop-only entry above this one for the remaining 6 routes; #338 and #787 are both closed. **useAuth silent-stall fix (#579/#766, PRs #767 + #782):** `onAuthStateChange`'s `SIGNED_IN` handler no longer leaves a user in an ambiguous auth state after a failed `/me` call — explicitly resolves to `'unauthenticated'` with a surfaced error, mirroring `checkSession`'s existing handling; the surfaced error is now wired into `LoginScreen`'s existing error display (closes the residual gap #767 itself left open). **Test coverage batch:** `GameModeGearMenu`, `RunnerConflictModal`, `LiveScoringPanel` (19 tests across its 3 render states plus scorer interactions — the one substantial gap flagged in `FEATURE_MAP.md` row 11 as of the prior pass), `leagueRules`, `ErrorBoundary`, `useBackendHealth`, ScoringMode finalize/restore, batting order, schedule, `flipHalfInning`, `useFeatureFlag`, `playerUtils`; deleted a dead `leagueRules_corrections.js` scratch file. **CI flake fix (#785, PR #786):** `suite-validation.js`'s `VAL-01`–`05` used 5 hardcoded emails against prod on every CI run forever, which `requestAccessLimiter`'s per-email rate limit could exhaust into false 429s (diagnosed after it blocked two PR runs) — switched to the same per-run-unique-email pattern already used elsewhere in the suite. **Docs staleness remediation batch 1 (#773, #774, PR e32c4ff):** corrected the Privacy Policy's analytics disclosure and access-request path (`legal.js`), replaced a false blanket migration-idempotency claim with a real per-migration table (`backend/migrations/README.md`), rebuilt the analytics event reference from current call sites (`docs/analytics/ANALYTICS.md`), documented the two coexisting feature-flag override schemes plus the Supabase runtime layer (`docs/features/feature-flags.md`), and corrected several other stale docs. **Routine:** synced `backend/package-lock.json`'s version field (was already drifted to 2.12.0 pre-bump); found and fixed `frontend/package-lock.json` also stale, a full release behind at 2.11.0. **Verification (CI run at `develop` HEAD `bce6ba9`, 2026-08-23):** frontend 1227 passed / 1 skipped (108 files), backend unit 147/147, `debt-p0` gate clear (0 open P0s). **Soak explicitly overridden 2026-08-23/24 by KK** — per PR #799's own body, after reviewing a Pass/Blocked validation report KK instructed "document these as proof and let's do prod release v2.13 now," deliberately overriding both the remaining soak time and the real-device promotion gate (not just an early-but-complete pass). Explicitly not executed before promotion: real-phone visual pass (B1-B11), live magic-link (C1-C3), PROD admin (D1-D3), interactive seeded Game-Day golden path — PR #799 itself instructs keeping #698 and #338 open. **Promoted to `main` 2026-08-24** (PR [#799](https://github.com/kaushikkuberanathan/lineup_generator/pull/799), regular merge — confirmed a genuine 2-parent merge, parents `43b0b75` + `28cd2e5`). Direct live-PROD smoke test not independently re-run as part of this correction pass — recommend doing so before treating this release as fully closed out.
- v2.12.0 (2026-08-22): **Minor bump** — Story 134 is a genuine new coach-facing feature (Home redesign to match Account's team visibility), following the v2.9.0-v2.11.0 "size the bump to the release's actual scope" convention. **Home membership teams + unified Find your team entry (#740, Story 134, PR #741):** Home's "Your Teams" list now filters through `memberships[].team_id`, matching the Account tab's existing reconciliation pattern, instead of showing every team cached on the device. One always-visible "Find your team…" bar replaces the old conditional local-filter field plus a separate "Don't see your team? Search for one" link, routing into the existing Story 124 discovery flow. Newest-season-first sorting and existing card actions preserved. App-level golden-path coverage added (`AppHomeMembershipTeams.test.jsx`). **Post-merge follow-up fix (#742, Story 135, PR #743):** review of Story 134 found it expanded the blast radius of the pre-existing #729 gap — `createTeam()` never refreshed the client-side `memberships` array, so previously only the Account tab was affected, but once Home started filtering by memberships too, a just-created team briefly vanished from Home as well until reload. Added `refreshMemberships()` to `useAuth.js` (re-fetches `/api/v1/auth/me`, updates `memberships`/`membership` only) and wired it into `createTeam()`'s existing save-then-load chain; verified live on `dev.dugoutlineup.com` by KK (a newly created test team appeared in "Your Teams" immediately, no reload). Also fixed two docs still referencing the removed link (`faqs.js`, a `TeamSearch.jsx` header comment). Does **not** close #729 — that issue's broader Account-tab gap outside the create-team path stays open. RED→GREEN verified for both the hook unit test and the App-level wiring via mutation checkpoints. **Duplicate Vercel project deleted (#744, Story 136):** `lineup-generator` (no hyphen) was a second Vercel project accidentally linked to this repo's GitHub integration alongside the real `line-up-generator` project, producing a failing check on most PRs since before this release with zero functional impact (owned no custom domain). Verified via direct Vercel API lookups — `dev.dugoutlineup.com` resolves to a `develop`-branch build on `line-up-generator` only — before deleting the duplicate from the dashboard. **Production auth incident prevention (#738, PR #739):** 2026-08-22 — Supabase disabled legacy JWT-format API keys for this project, but Vercel's `VITE_SUPABASE_ANON_KEY` still held the old key, silently breaking magic-link and Google sign-in for every user with zero server-side trace. Already fixed live in Vercel directly (key rotated, redeployed, verified) before this code landed; this PR is the prevention/observability follow-up — `vite.config.js` now fails real Vercel builds (`VERCEL=1` only) if the anon key looks like a legacy JWT, and three previously-silent auth failure paths in `useAuth.js`/`LoginScreen.jsx` now log sanitized diagnostics instead of swallowing everything. Full incident timeline in `docs/TROUBLESHOOTING.md`. No automated test — verified manually in both directions. Routine dependency updates: `@supabase/supabase-js`, `mixpanel-browser`, `libphonenumber-js` (backend), `@testing-library/jest-dom`. **Verification (re-run directly, 2026-08-22):** frontend 1090 passed / 1 skipped (95 files), lint clean, `npm run build` clean, `debt-p0` gate clear (0 open P0s). **24h soak explicitly overridden 2026-08-23** by KK, citing fall season readiness — not a hotfix, a deliberate exception, same pattern as v2.9.0's and v2.11.0's overrides. **Promoted to `main` 2026-08-23** (PR [#760](https://github.com/kaushikkuberanathan/lineup_generator/pull/760), regular merge, `43b0b75`) — confirmed a genuine 2-parent merge via direct API check. Prod smoke test same session: backend `/ping` 200 OK (708ms), frontend loads clean; both Render and Vercel confirmed serving the exact promoted commit via direct deploy-record queries. Post-promote sync (PR #761) merged the same session.
- v2.11.0 (2026-08-19): **Minor bump** — team season tracking is a genuine new coach-facing feature, following the v2.9.0/v2.10.0 "size the bump to the release's actual scope" convention. **Team season tracking (#713, closes #719):** new `teams.season` column (`Spring`/`Fall`, paired with the existing `year`) surfaced across team creation, editing, display, switching, sharing, PDF export, `admin.html`, and team search (independent season/year filters, newest-first ordering). **⚠️ DEV only — two-phase PROD rollout not yet run:** per the Zero-Downtime Constraint, split into `022_add_team_season.sql` (nullable, backfilled — applied to DEV only, 2026-08-18) and `023_enforce_team_season_not_null.sql` (NOT NULL + CHECK — cannot run until this release is live in PROD and a zero-NULL-seasons check passes); see `backend/CLAUDE.md` § Migration Notes for the full sequence — 022 applied to PROD 2026-08-19, ahead of the promote below (verified 6/6 teams, 0 NULL). **DEV acceptance pass completed 2026-08-21** by KK against `dev.dugoutlineup.com` with a real authenticated session — create/edit/search/switch/reload for the season feature all passed clean. One real but pre-existing, unrelated, non-blocking bug found during the pass: newly created teams don't appear in the Account tab's "Your Teams" list until reload, root-caused to `createTeam()` never refreshing the `memberships` state `useAuth.js` uses for that list — filed as [#729](https://github.com/kaushikkuberanathan/lineup_generator/issues/729), logged in this file's Known Open Bugs table (row 12). **Fixes found during the rollout:** the legacy "seed the whole division" local migration had no `season` field on its hardcoded team objects, picking up a date-based guess instead of a fixed value (PR #717); a new-team first-save persistence race where `loadTeam()` could start its first RLS-protected `team_data` write before the `teams` insert's membership-provisioning trigger finished, producing a real `42501` denial — now sequenced to wait (PR #720). **Test coverage (PR #722, closes #721):** extracted `currentSeasonGuess`/`formatSeason`/`compareTeamsNewestFirst` out of App.jsx into `frontend/src/utils/season.js` (12 tests, replacing 3 inline copies), an `admin.html` behavioral-parity test (extracts its real inline function source, not a hand-copied restatement), and backend `INT-06` (DB rejects invalid season values, CI_SAFE-skipped like the rest of that integration suite); deliberately did not add migration-file tests, matching this repo's existing convention that no migration has one. Frontend 1069→1084 (+15); backend unit unchanged at 147. **CORS fix (PR #714, closes #715):** `dev.dugoutlineup.com` added to the backend allowlist — the DEV custom-domain rollout above needed it. **Story 133 (#698) — live game-day surface token migration, slices 1-4 of 13 merged:** PR #705 (slice 1, mints `color.gameDay.*`, migrates `BenchStrip`/`ScoreboardRow`), #707 (slice 2, `DugoutView`), #709 (slice 3, `DiamondView`), #712 (slice 4, `QuickSwap`) — all byte-preserving, zero-intended-visual-change reference swaps. A full-directory survey (2026-08-17) found the real scope is much larger than the original ticket — `game-mode/*` + `ScoringMode/*` combined have 384 literal-hex color occurrences across 14 files, none previously tokenized; 9 slices remain, tracked in `docs/product/ROADMAP.md`. **Slice 4 is partially, not fully, validated** — automated coverage green, one manual QuickSwap flow confirmed on a real mobile device, full multi-device/layout visual coverage deliberately deferred as an accepted residual risk per KK's explicit 2026-08-19 release-bar call (token refactor, not new behavior), not completed; do not describe it as fully tested in future entries. **Also on develop:** Auth screens' remaining exact-match colors converged onto canonical design tokens (PR #693, UX Phase 5); backend CORS extended to accept this team's Vercel preview domains (PR #706); `PendingApprovalScreen` test coverage added (closes #696, PR #700); `vite` 8.2.1 + `@vitejs/plugin-react` 6.0.5 dependency bump; `env-health-check` skill + script added (prod checks read-only). New test-debt item logged, not new: `RequestAccessScreen.jsx`'s `submitted` confirmation state (#664, shipped v2.10.0) had never been formally logged in `DOC_TEST_DEBT.md` until this pass. **Verification (re-run directly during this release prep, not carried forward):** frontend 1084 passed / 1 skipped (93 files), backend unit 147/147, `npm run build` clean, `debt-p0` gate clear (0 open P0s). **24h soak explicitly overridden 2026-08-21** by KK, citing fall season readiness (coaches need season tagging live before fall rosters start) — not a hotfix, a deliberate exception, same pattern as v2.9.0's override. **Promoted to `main` 2026-08-21** (PR [#731](https://github.com/kaushikkuberanathan/lineup_generator/pull/731), regular merge, `102c8ca4`) — confirmed a genuine 2-parent merge via direct API check. Prod smoke test same session: backend `/ping` 200 OK (0.8s), frontend loads clean with zero console errors, both Render and Vercel confirmed serving the exact promoted commit via direct deploy-record queries. Post-promote sync (PR #732) merged the same session.
- v2.10.0 (2026-08-15): **Minor bump** — Story 124 is a genuine new user-facing feature, not just a fix batch, so this follows v2.9.0's "size the bump to the release's actual scope" convention. **Team search + request-access discovery (#655, Story 124):** new `GET /api/v1/teams/search` backend route (service-role mediated, returns only `id`/`name`/`age_group`/`sport`/`year`, never `owner_id`), Home tab search entry point, role picker submitting into the existing `POST /request-access` (PR #663, backend route PR #657). **Confirmation fix (#665, Story 126):** `RequestAccessScreen.jsx`'s `preserveSession=true` success path (an already-authenticated coach requesting a 2nd team) previously gave no visible confirmation — it relied on a `useAuth` authState transition that doesn't apply when the session is preserved. Added a `submitted` state rendering an inline confirmation card (PR #667); no dedicated test yet, tracked as #664. **Local dev tooling (#668, Story 128):** optional `SUPABASE_TARGET` env toggle for local backend testing against DEV Supabase, no production code path affected (PR #669). Routine dependency updates: express-rate-limit, @vitest/ui, jsdom, @supabase/supabase-js (PRs #671, #672, #627, #670). **CI Node 20 → 22 (PR #678):** jsdom 30 and the current @supabase/supabase-js sub-packages both raised their engines floor to Node >=22, which the frontend/backend/backend-unit/sync-script/rls CI jobs (pinned to Node 20) could no longer satisfy — a runtime-floor problem, not a code regression. Verified behavior-neutral before merging (134/134 backend unit, 1056/1057 frontend on Node 22 against unmodified develop); unblocked #627 and #670 above, both of which went fully green once Dependabot auto-rebased them onto it. **Docs accuracy pass:** corrected three stale ROADMAP.md story statuses (Stories 120, 124, 126 — PR #675), fixed a stale file path in the Phase 4C shim-removal checklist left over from the Slice 4 ScoringMode refactor, and flagged an independent grant-level gap on the live-scoring tables, separate from the RLS-policy work tracked under #355 (PR #676) — plus the two v2.9.0 corrections captured in that entry below, found while preparing this release. The four commits landed after the initial version-bump commit (PR #676, #678, #627, #670, all merged 2026-08-15 evening) have now genuinely cleared the 24h soak — confirmed 2026-08-17, ~37h elapsed on the newest of the four, no override needed. **Promoted to `main` 2026-08-17** (PR [#682](https://github.com/kaushikkuberanathan/lineup_generator/pull/682), regular merge, `9401126`) — confirmed a genuine 2-parent merge via direct API check, not the merge-button dropdown. Prod smoke test same session: backend `/ping` 200 OK (304ms), frontend loads clean, both Render and Vercel confirmed serving the exact promoted commit via direct deploy-record queries. Post-promote sync (PR #683) merged the same session.
- v2.9.0 (2026-08-08): **Minor bump, not patch** — bundles more than the security-hardening batch it started as: a database schema change (#375), a backend routing change and a security-policy change (#380), plus routine dependency bumps, on top of the CodeQL remediation batch below. First time this repo has deliberately sized a version bump to the release's actual scope rather than defaulting to the smallest label. Security hardening batch: 12 of 14 open CodeQL alerts resolved. Added an email-keyed rate limiter (10 req/60 min) to the previously-unlimited `POST /request-access` (backend/src/routes/auth.js), matching `loginLimiter`'s proven design. Fixed a log-injection risk (CWE-134 tainted-format-string) at 5 sites in `backend/src/routes/teamData.js` — an attacker-controlled team ID could be reinterpreted as a `util.format` specifier and corrupt the adjacent logged error field; changed to pass `{ teamId, error }` as a structured object instead of interpolating into the message string. Replaced `Math.random()` with `crypto.randomUUID()` (falling back to `crypto.getRandomValues()`, never `Math.random()`, for browsers without it) for the live-scoring `scorer_local_id` device identity in `DugoutView.jsx` — CI caught a fresh CodeQL alert on the deliberately-kept legacy-browser fallback branch even after the primary path was fixed, since taint tracking doesn't distinguish primary path from dead fallback; resolved by eliminating the insecure path in the fallback too rather than dismissing the alert. Added explicit `permissions: { contents: read }` to all 8 CI/health-check jobs across `.github/workflows/{ci,health-check,health}.yml` that lacked it. **Deliberately NOT fixed in this batch, tracked as open follow-up:** 2 of the original 14 alerts (`POST /logout`, `GET /me` — both js/missing-rate-limiting) remain open; both routes already sit behind `requireAuth` and need user-id-keyed limiting with their own budget, not a reuse of `/request-access`'s email-keyed design ([#651](https://github.com/kaushikkuberanathan/lineup_generator/issues/651), issue intentionally left open). Also filed, not fixed, as a separate standalone finding: the share-link ID generator (`App.jsx:generateShareId`) also uses `Math.random()` — locked file, needs its own dedicated session and gate phrase ([#650](https://github.com/kaushikkuberanathan/lineup_generator/issues/650)). Every fix RED→GREEN test-verified against reverted source; full suite clean (1027 frontend + 125 backend, 0 regressions). Merged to `develop` (PR [#652](https://github.com/kaushikkuberanathan/lineup_generator/pull/652), regular merge, `495cd5d`) — verified as a genuine 2-parent merge via both manual check and the repo's own squash-merge CI guardrail. **Team-deletion safety (#380):** team deletion now routes through a backend `service_role` endpoint instead of the client SDK (3 PRs: #642, #646, #647); `admin.html` updated to match. Migration 021 (revoke the anon/authenticated DELETE grant on `teams`) was applied to production once on 2026-08-08, then immediately reverted the same session — the backend route it depends on was only live on `develop`, not `main`, and Render deploys from `main`; revoking without that route live in production would have left team deletion with no working path at all, for every role. **Identity data integrity (#375):** migration 020, already applied to both DEV and PROD 2026-08-07, adds a CHECK constraint requiring every `team_memberships` row to carry a real identity (user_id or email); issue #375 is closed. Routine dependency updates: react-icons, csv-parse, libphonenumber-js, Supabase CLI GitHub Action. **Promoted to `main` 2026-08-09** (PR [#661](https://github.com/kaushikkuberanathan/lineup_generator/pull/661), regular merge, `832dd7d`) — verified as a genuine 2-parent merge; this line incorrectly read "develop only — not yet promoted to main" for a full week afterward, caught and corrected during v2.10.0 release prep (2026-08-15). **Also corrected the same day:** direct inspection of prod found migration 021's revoke is actually live (`anon`/`authenticated` currently hold no DELETE grant on `teams`), contrary to the "reverted, not currently live" claim above and in the migration file's own header — Render's live deploy has run the compensating service-role route since the promote (confirmed via deploy history). **Fully verified end-to-end against DEV the same day:** created a throwaway team and deleted it through the real `DELETE /api/v1/teams/:teamId` route with a real authenticated session (mirroring `dbSaveTeams()`/`dbDeleteTeam()` exactly, not raw SQL) — `200 {"ok":true}`, team confirmed gone. Separately confirmed the old direct-client delete path is genuinely closed: a second throwaway authenticated user's direct `.from('teams').delete()` attempt was rejected with `42501 permission denied for table teams`, a grant-layer denial. **Issue #380 is closed** ([comment](https://github.com/kaushikkuberanathan/lineup_generator/issues/380) with full evidence, closed 2026-08-15) — no longer open pending anything. Corrected two pre-existing documentation gaps found while updating these docs (unrelated to this release's own changes): `backend/CLAUDE.md`'s and `FEATURE_MAP.md`'s unit-test inventories were already missing `teamData.delete.test.js` (6 tests, pre-existing) from before this release, and both mislabeled `normalizeRole.test.js`'s count as 13 instead of its actual 34 — both corrected.
- v2.8.5 (2026-08-06): **Completed** the `var C` legacy color-object retirement in App.jsx: Schedule tab (slice 4, #545), Lineups + Links tabs (slice 5, #546), Feedback/About/Account/Updates tabs (slice 6, #547), Modals/overlays (slice 7), the public SharedView share-link page (slice 9, Story 120/#531), and a final slice 10 sweep of 5 render functions outside the original 9-region plan — renderSongs, renderSnackDuty, renderPinModal, renderTeamTab, renderBottomNav, plus 2 literal-hex sites (#606) — all zero-visible-change token swaps. `var C` now has zero remaining call sites in App.jsx. (Slice 8's own carve-out, GameModeScreen/DugoutView/Story 116/#503, wasn't one of slice 10's swept functions — whether its separate inheritance-verification methodology still needs to run is unresolved, not claimed done here.) Minted `color.brand.gradientDark` and swapped the app-shell root gradient's third stop to use it (Story 119/#530/#598). **Real regression found and fixed** during slice 6: `AboutTab.jsx`'s two cards had been silently rendering with `style={undefined}` since a prior release deleted the `S.card` object they referenced — live in production since v2.8.4 shipped, fixed with a token-driven replica (#547). Extracted `PlayerFilterToggle` from App.jsx into its own component (Story 104 slice 4.1, #592); slices 4.2-4.4 remain open. Pinned `ip-address` to `^10.4.0`, closing three Dependabot alerts (#583). Added a CI guardrail Action that detects a likely squash-merge on `develop`/`main` after the fact (#573/#588). Corrected stale documentation found during an audit pass: `frontend/CLAUDE.md`'s test count and outdated tab-list model, and a `DOC_TEST_DEBT.md` disambiguation note (#607/#608, #610/#611). 18 new/corrected tests added across the token-migration and extraction work, mutation-tested where value-preserving; slice 10 itself added no new tests (verified against the unchanged 85-file/1022-test baseline). Full release-readiness audit performed before promote-planning (build/lint/full-suite clean; `debt-p0` gate clear; doc-gap closure via #604, #616, and this entry). **Promoted to `main` 2026-08-07** (PR #619, regular merge, `06030c1`) — verified as a genuine 2-parent merge, not squashed. Post-promote smoke test: backend `/ping` 200 OK (487ms), frontend loads clean. Post-promote sync: PR #630.
- v2.8.4 (2026-08-04): Internal only, no user-facing change. Completed the Phase 3 UI-primitives migration — all remaining hand-styled components (FairnessCheck, NowBattingStrip, MaintenanceScreen, ParentView, BattingOrderStrip, LockFlow, DefenseDiamond) now use Card/Text/Stack primitives (PRs #519-#526). Retired the legacy `S.card` style object across all 17 App.jsx call sites (Story 117, #515) and deleted a related dead style object found along the way (Story 115, #523). Started the `var C` legacy color-object retirement in App.jsx region-by-region: 3 of 9 planned regions done — header/nav chrome (Story slice 1, #528), Roster tab (slice 2, #529), Defense/Batting grid tabs (slice 3, #537) — all zero-visible-change token swaps. (Note added 2026-08-04: this "region slice" work is unrelated to `docs/product/APPJSX_DECOMPOSITION_PLAN.md`'s own, separately-numbered "Phase 4" component/Context-extraction slices 4.0-4.7 — same vocabulary, different initiative; see that doc's disambiguation note.) Fixed a Windows Vitest worker-spawn flake (Bug #7, Story 118/#517) permanently via `fileParallelism:false`, applied to both worktrees (#533, #534). Added regression coverage for share-link payload construction, Game Mode rendering/state, live-scoring session security, and auth routing (#504, #505, #506, #507, #511, #512, #513). Filed but deliberately did not fix a P0 test-only live-data-mutation risk in `AppShareLinkRouting.test.jsx`'s incomplete Supabase mock (Story 121, #535) — flagged for the Dugout track, patched into `DOC_TEST_DEBT.md`'s P0 dashboard (#538). Reviewed all 4 open Dependabot alerts live (not from memory) — shipped with all open, tracked the two backend-runtime ones separately (Story 122, #539). Full release audit: `docs/product/RELEASE_AUDIT_2026-08-04.md`. **Promoted to `main` 2026-08-05** (PR #560, regular merge, `d113dbd`) — the promote surfaced one real, deterministic CI blocker along the way, not flaky: a Doc Audit Spike doc fix (Story 1/#549, unrelated initiative) collided with `backend/migrations/004_rls_fixes.sql`'s missing idempotency guards, failing `RLS Policy Suite (ephemeral)` on `develop` itself. Root-caused via actual CI log content, fixed narrowly (Story 123/#564, PR #562 — guards added to all 12 `CREATE POLICY` statements in `004`, not just the one that surfaced first), verified via the real ephemeral-DB CI job, T1 notified. Post-promote sync (PR #563) and prod smoke test (backend `/ping` 200 in 918ms, frontend loads clean) both confirmed same session.
- v2.8.3 (2026-08-01): Two silent production bugs fixed. Feedback/bug-report submissions were failing for most coaches — `admin.js`'s catch-all auth gate was mounted before `feedback.js` on the shared `/api/v1` base, 403-ing every non-admin coach's submission; fixed via mount order, found while closing Story 99's backend test coverage (unit suite 39 → 111, #252). Automatic roster snapshots (the safety net behind "Restore Previous Roster") had been silently failing since v2.6.0 (2026-07-20) — the auto-prune trigger had no `SECURITY DEFINER`, so its internal DELETE ran as the caller and hit migration 004's DELETE revocation; migration 017 fixes it, applied to DEV and PROD. Real-database RLS test coverage added for `roster_snapshots` and `teams` — the last two of the three tables #342 originally exposed (#477); `teams`' coverage mutation-tested to confirm it catches a real regression, not just a fixture assertion. `rls` CI job promoted to a required status check (#480). `loginLimiter` re-keyed IP → email (Story 26). OSS governance files added: LICENSE, SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md (#452). Design token cleanup, zero visible UI change (#296, #297).
- v2.8.2 (2026-07-31): Internal only, no user-facing change. Public activity feed now publishes actual production release notes instead of individual implementation-story links, with per-release summaries auto-derived from the version and its first shipping bullet (#442, #443). Switched public delivery metrics from merged-PR counts to individual non-merge commits classified as product or quality work (#445). Fixed recurring Vercel deployment failures on the generated `activity-data` branch (#445).
- v2.8.1 (2026-07-28): Internal only, no user-facing change. Extracted the home name-nudge and Account name field out of App.jsx into standalone tested components (#407). Added the write-error reject-path test for dbSaveTeamData (#418). Migrated App.jsx's loadJSON/saveJSON to the shared utils/storage.js (#416, App.jsx half; finalizeSchedule half tracked in #420). Excised fake-green admin-auth assertions (#412).
- v2.8.0 (2026-07-23): Set your name (#405) - self-scoped `PATCH /me` endpoint (id from verified token, never the body), `updateProfileName` in useAuth with a 5-case spec, Account-tab name field and dismissible home nudge (`first_name === ''`). Extraction + golden-path tests for the two App.jsx render surfaces tracked in #407. Excised 12 fake-green dead-path admin auth assertions from the backend suites (#410, #412) - real coverage confirmed via mutation check. Test-health survey passes 1-2 filed (#406, #410, #411).
- v2.7.0 (2026-07-21): Google sign-in (#394, gate-first - memberless sessions route to NoMembershipScreen). Session visibility (#395): home sign-out + Account tab with per-team cards and tap-to-switch. Roster-wipe DB guard (#386, migration 015 live in prod). Request-access validator fix (#397). See also #400 (lint).
- v2.6.0 (2026-07-20): Auth gate live in prod - editing requires a session, viewing does not. WS-3 RLS enabled on team_data/teams/roster_snapshots/share_links with membership-scoped policies; TRUNCATE revoked from anon and authenticated. Write failures now surface to the user. See #342, #377, #381.
- v2.5.32 (2026-07-14): **SECURITY.** A live production `service_role` key was found committed in `backend/.env.example` - **public repo, 113 days**. Rotated; legacy keys disabled. `admin.html` (the only hardcoded key) fixed. A VIEW was bypassing the RLS lock on `team_data_history` (migration 011). All SECURITY DEFINER functions now have a pinned `search_path` (012). `docs/db/schema.sql` - first executable ground truth. DEV rebuilt as a true mirror of prod. `docs/TROUBLESHOOTING.md` added; eight governing docs corrected.
- **NOTE: this changelog has a GAP.** v2.5.27 through v2.5.31 have no bullets. Not backfilled. See `frontend/src/data/versionHistory.js` for the complete history.
- v2.5.26 (2026-06-08): New About tab — builder profile, partnership CTA, and contact links (Story 105, PR #283). AboutTab.test.jsx golden-path 13 tests (Story 106, PR #290), backend teamData tests Story 99 Phase 2 tranche 1 (PR #282), Story 83 regression guard appImports.test.js + Stories 83/84 resolved (PR #289), UX Phase 4 App.jsx decomposition planning doc (Story 104, PR #280), Stories 106/107/108 filed (PR #287). Test suite 815 passing / 1 skipped — 786 frontend + 29 backend (pre-promote run).
- v2.5.25 (2026-06-01): Reliability and consistency improvements — Story 99 backend test foundation (supertest + app/server split + admin.auth.test.js 9 tests + hermetic backend-unit CI job, PR #272; In Progress, remaining coverage in #252), Story 102 App.jsx OUT-row error tint token migration with new errorMid token (zero visible change, PR #271), backend/CLAUDE.md routes-doc correction + FEATURE_MAP row #33. Test suite 771 frontend + 9 backend supertest passing / 1 skipped.
- v2.5.24 (2026-05-31): Reliability and consistency improvements — Story 93 DefenseDiamond Tier D token unification (zero visible color changes, PR #259), Story 100 backend qs 6.15.0→6.15.2 patch (Dependabot /21 cleared, PR #254), version history coach-language audit (16 entries rewritten) + 4 CI rules enforced (PRs #255 #257 #258). Test suite 771 passing / 1 skipped.
- v2.5.23 (2026-05-30): Internal stability improvements — Story 77 ESLint debt eliminated (0 warnings/0 errors after 5-phase cleanup, App.jsx ~650 net lines reduced, PRs #237 #244 #245), Story 81 Vite ^5.1→^6.4.2 + vite-plugin-pwa ^0.19→^1.0 (3 Dependabot moderate vulns cleared, PR #235 retroactive flip), Story 98 ci.yml sync-script CodeQL permissions block (PR #243), Stories 60/64/65 UX token cleanup with shadow.subtleCard + LegalSection Card drift (PR #247). Test suite 767 passing / 1 skipped (+8 net vs v2.5.22).
- v2.5.22 (2026-05-29): Stability and performance update — DefenseDiamond Tier A+B token migration with new `borderWidth.{hairline,thin,medium}` tokens (Story 92, PR #218 → #227), MaintenanceScreen token migration with new `color.overlay.{whiteMedium,whiteHeavy}` tokens (Story 94, PR #220 → #227), Story 96 ROADMAP CRLF cleanup + filing (PRs #233, #236), Story 97 sync-stories-to-issues.js CRLF byte-corruption fix + 4 regression tests via node:test + new sync-script CI job (PR #236), box-score AI parser teamName fix (PR #229), ESLint cleanup pass (PR #228), techNote approved-strings rule (PR #226).
- v2.5.21 (2026-05-27): SW update banner restored; BottomSheet primitive ships — useRegisterSW destructure restores in-app update prompt (Story 85, PR #188), BottomSheet primitive + LockFlow migration with radius.sheet/shadow.sheetTop tokens (Story 87, PR #190 → #217), status tint tokens + ValidationBanner second-pass (Story 88, PR #215), overlay alpha-tint tokens + OfflineIndicator second-pass (Story 89, PR #215), sync-stories-to-issues typeof issueNum guard (Story 91, PR #211), 48 embedded \r corruption artifacts scrubbed from ROADMAP.md headings via awk sweep (Story 76, this release). New `## UI Primitives` section added to SOLUTION_DESIGN.md.
- v2.5.20 (2026-05-26): Story 84 fix, UX Phase 5 token foundation, sync-script governance — box-score AI parser teamName fix (Story 84, PR #178), UX Phase 5 surface.chrome + GameDay/* migrations (PR #179), sync-stories-to-issues.js de-dup check (Story 90, PR #204), Release Ritual post-promote sync convention (Story 86, PR #177), CLAUDE.md Rules 1+7 + item 18 (PR #201), ValidationBanner/OfflineIndicator touch-ups + Stories 87-89+91 filed (PR #202, #209), session retrospective 2026-05-23-A (PR #176), Stories 77-91 issue markers synced (PRs #191, #201, #208).
- v2.5.19 (2026-05-22): Supabase import fix restores coach feedback; label schema, audit, governance — Story 83 (P1) resolved (PR #171), npm audit 12 of 15 vulns + Story 81 filed (PR #164), CLAUDE.md Stories 79+80 + stale hook description (PR #165), label taxonomy 28→31 (PRs #166, #168), Stories 83-85 filed (PR #169), session retrospective 2026-05-22-A (PR #170).
- v2.5.18 (2026-05-21): Pre-push hook fix, sync-script hardening, lint debt filed — Story 75 (P1) resolved (PR #155), sync-stories-to-issues.js hardened (PR #156), Stories 72–76 ROADMAP markers patched #150–#154, Story 77 (P2) filed for 132 ESLint problems.
- v2.5.17 (2026-05-21): Governance pass — SESSION_RETROSPECTIVES.md introduced (#139), CLAUDE.md trim 44.8k→35.4k chars (#143), UX Phase 3 Step 3 token migrations (#144), backend route modularization with ops.js + teamData dual-mount (#145), worktree Husky convention (#148), Stories 70–76 filed, Story 75 (P1 pre-push hook reliability) escalated.
- v2.5.16 (2026-05-19): Repo governance & GitHub settings hardening — Story 68 audit complete (2 AI apps revoked, Dependabot enabled), CODEOWNERS added (PR #133), 4 GitHub Issue templates, 27 ROADMAP stories bootstrapped to Issues (#105–#131), Story 69 opened for Dependabot triage.
- v2.5.15 (2026-05-19): Share Lineup CTA restored on Game Day → Lineups tab (Story 67, PR #99); Support tab polish — FAQ default, full-row link tap targets, longer toast duration (PR #94).
> Full release history: [docs/product/RELEASE_NOTES.md](docs/product/RELEASE_NOTES.md)

---

## Active Tracks

This project runs two parallel tracks. Each has its own roadmap; both promote to main via develop.

### Dugout Track — combined view rollout
- Tracker: `docs/product/ROADMAP.md` (main project roadmap)
- Worktree: `lineup-generator/` (this directory)
- Recent: Slice 0 (v2.5.4), Slice 1 (v2.5.5), Slice 2 (v2.5.7), Slice 3 (v2.5.9), Slice 4 (v2.5.11 — partial: legacy root + ViewerMode removed; ScoringMode/ directory preserved for 7 live children imported by DugoutView)
- Next: Optional follow-up — relocate live ScoringMode children into `components/game-mode/scoring/` then collapse the ScoringMode/ directory. Separate refactor PR; not gated on any v2.6.0 work.

### UX Track — accessibility, design tokens, primitives, call-site refactor
- Tracker: `docs/product/UX_REFACTOR_ROADMAP.md`
- Worktree: `lineup-generator-ux/` (separate working directory)
- UX history: Phase 1a–1c + R1 Roster Polish shipped in v2.5.6; UI primitives and the first consumer migrations shipped through v2.5.14; the full Phase 3 primitives migration shipped through v2.8.4 and Phase 4 legacy `C.*` color retirement through v2.8.5. Current details live in `docs/product/UX_REFACTOR_ROADMAP.md`.
- Next: Phase 3 — App.jsx component split (post-token + post-primitive work); Support tab P1 behavioral fixes (App.jsx gate required)

### Cross-track discipline
- At session start on either track, read this section + `git log` since last session
- User-visible work on either track ships behind a flag default-OFF, soaks, then GA-promotes in a separate release
- Track manifest gets updated whenever a track-related PR merges or current work changes
- **✅ v3.0.0 soak freeze on `develop` lifted 2026-08-29 — soak explicitly overridden by KK (~9h40m into the 24h window), promote to `main` in progress.** See `docs/product/ROADMAP.md`'s banner and this file's Current Version entry for the override note. Normal Branch Strategy rules resume.
