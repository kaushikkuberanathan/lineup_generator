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

**Enforcement: every change starts on a feature/fix/hotfix branch.** Direct commits to develop or main are not permitted except for declared hotfixes that branch off main. The branch strategy applies to docs-only changes too — small commits on develop have caused real release-notes coordination bugs (see PR #29 retrospective). No exceptions because the work feels small.

### Infrastructure notes

- Vitest v4 pool: `pool: 'threads'`, `maxWorkers: 1` — switched from `pool: 'forks'` + `singleFork: true` in Story 41 fix. Cox Defender endpoint security blocked child_process.fork IPC in git hook context; worker_threads are intra-process and unaffected. `maxWorkers: 1` enforces single-worker execution to prevent thread-race test isolation failures (same safety rationale as the former `singleFork: true`).
**Pre-push hook (v2.5.3):** `.husky/pre-push` runs `cd frontend && npm test` (no retry) and includes a branch guard rejecting direct pushes to `develop` and `main`. Override for declared hotfixes only: `ALLOW_DIRECT_PUSH=1 git push`. The earlier `|| npm test` retry was removed because it was duplicated (ran tests up to four times) and masked first-run failures.

**`--no-verify` exception:** Acceptable only when all three conditions are true: (a) commit is docs-only or meta-governance — zero app code, zero `frontend/` files changed; (b) pre-push failure is the documented Bug #7 worker-timeout flake; (c) CI is running on the PR as the authoritative gate. Any usage outside these conditions requires explicit justification in the commit message body. See also: MASTER_DEV_REFERENCE.md § GitHub Operating System.

---

## Commands
> See `frontend/CLAUDE.md` → **## Commands** for frontend (npm scripts, dev/build/test).
> See `backend/CLAUDE.md` → **## Commands** for backend (node index.js, runner).

---

## Architecture

### Multi-team design (Phase 5)
- One Supabase auth.users record per person regardless of how many teams
- One team_memberships row per (user, team) combination
- `team_admin` is team-scoped; `platform_admin` is global (KK only)
- Phase 4 MVP: platform_admin manually creates teams in Supabase
- Approval routing: ALL requests → platform_admin (icoachyouthball@gmail.com)

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
- **`loginLimiter`** is active on `POST /magic-link`: 15-minute window, max 5 requests per IP. Added in commit `91aaf43` (April 6, 2026, v2.2.18). Returns `429 TOO_MANY_ATTEMPTS` when exceeded. Do NOT assume this was removed — the removal was planned but never landed. See Story 26 + Story 35 for test fragility implications.

### Auth Principle (non-negotiable)
Viewing lineup and share links must **never** require login. Auth must never block Game Mode or share link rendering.

### Current Users in team_memberships
- Kaushik K: kaushik.kuberanathan@gmail.com, user_id: `951f66cc-afec-41b2-8c1a-58fc61f1b847`, role=platform_admin, team=Mud Hens (1774297491626), status=active
- Stan Hoover: role=coach, team=Mud Hens (1774297491626), status=invited → set active before Phase 4 cutover

### Phase 4 Cutover (parked)
Full checklist: `docs/ops/PHASE4_PRECHECK.md`. Do NOT run `backend/migrations/004_rls_fixes.sql` until cutover — will break anon writes coaches rely on today.

### Phase 4C Auth Cutover — Live Scoring cleanup (do at cutover, not before)
> Full shim removal checklist: see **## Phase 4C Auth Cutover — Scoring Shim Removal Checklist** below.

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
10. [ ] Run `npm test` — confirm 734 passed / 1 skipped (as of v2.5.14, May 16, 2026) / 0 failed

### VERSION_HISTORY Schema (dual-layer — both required)
```js
{
  version: "x.x.x",
  date: "Month YYYY",

  // USER-FACING — rendered in Updates tab
  headline: "One sentence: what the coach gets, not what was built",
  userChanges: [
    "Plain English benefit — what does the coach experience differently?",
  ],
  techNote: "Bug fixes and performance improvements",
  // techNote must be one of:
  //   "Bug fixes and performance improvements"
  //   "Under-the-hood stability improvements"
  //   "Performance and reliability improvements"
  //   "Minor fixes and internal improvements"

  // INTERNAL — NOT rendered, audit trail only
  internalChanges: [
    "Exact technical detail — file, function, or system affected",
  ],
}
```
**RULE**: `userChanges` answers "What does the coach experience differently?" — never expose refactors, CI, migrations, or internal tooling there.

### UPDATES TAB CONTENT RULE

The Updates tab is coach-facing. `headline` and `userChanges` must be plain-English coach benefits. Technical detail belongs in `internalChanges`, git commit messages, and ROADMAP.md only. The `techNote` field must be one of the four approved strings listed above. `internalChanges` is never rendered.

Enforced by: `frontend/src/__tests__/versionHistory.test.js`

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

---

## Analytics
> See `frontend/CLAUDE.md` → **## Analytics**

---

## Test Suite
Changes to `lineupEngineV2.js`, `scoringEngine.js`, or `playerMapper.js` → must pass frontend `npm test` (Vitest, 654 tests passing / 1 skipped).
Changes to `featureFlags.js` or `positions.js` → must pass frontend `npm test`.
Changes to backend code → must pass backend custom runner (`backend/scripts/tests/test-runner.js`, 13 suites).
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

---

## Key Infrastructure
- **Supabase project**: `hzaajccyurlyeweekvma.supabase.co`
- **Production backend**: `lineup-generator-backend.onrender.com` (Render Starter plan, $7/mo, no spin-down)
- **DEV backend**: deleted April 27, 2026 — local dev uses `npm run dev` from backend/
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

| # | Bug / Item | Notes |
|---|------------|-------|
| 1 | **Absent player auto-assign** | Out Tonight players (e.g. Aiden) occasionally still assigned to a field position when auto-assign runs. `activeBattingOrder` filters the batting order correctly; gap likely in lineup engine's absent exclusion path. |
| 2 | **Game Ball "—" display bug** | Schedule card shows "—" dash instead of recipient names after multi-player game ball selection. Read path may not be normalizing the `gameBall` array correctly at render. |
| 3 | **OOM contract test** | ✅ Resolved — `useLiveScore.contract.test.js` runs correctly in the warm-worker suite (7 tests, all passing, contributing to the 734 total). Cold-start isolation timeout is a Bug #7 symptom (Windows worker handshake), not a property of this file. No exclude needed. |
| 4 | **Phase 4C deferred** | Auth gate activation (`requireAuth` middleware on existing routes), RLS enforcement on scoring tables (`auth.uid()` policies), HMAC-signed approve/deny links in admin emails — all parked until Phase 4 auth cutover. |
| 5 | **MERGE_FIELDS test-file copies** | Three test files (`migration.test.js:267`, `scheduleIntegrity.test.js:113`, `scheduleIntegrity.test.js:181`) each define their own local MERGE_FIELDS copy. These are kept in sync manually. Future: extract to a shared test fixture and import. |
| 6 | **pending_sync not re-attempted** | `finalizeSchedule.js` writes `pending_sync:<teamId>:finalize` to localStorage on Supabase failure but no retry mechanism exists yet. Coach must re-open the app while online for the next write to succeed. |
| 7 | **Windows Vitest cold-start worker-timeout flake** | Environmental — not a code issue. Presents as worker-startup timeout (may also cascade as OOM under low memory). See Branch Strategy → Infrastructure notes for workaround. `--no-verify` acceptable only when: (a) commit is docs-only or meta-governance, (b) this is the confirmed failure cause, (c) CI is running as authoritative gate. Not a general escape hatch. |
| 8 | ~~**BattingOrderStrip static when scoring engine advances batters (flag ON only)**~~ | **Resolved v2.5.7** — `battingIdxForStrip` switches source: `gameState.battingOrderIndex` (flag ON) vs App prop (flag OFF). |
| 9 | ~~**Bases diamond clips at bottom at 375px viewport (flag ON only)**~~ | **Resolved v2.5.7** — DugoutView flex-column shell with `overflow-y:auto` body eliminates vertical clipping. |
| 10 | ~~**Pitch map masked by scoring CTAs at 375px viewport (flag ON only)**~~ | **Resolved v2.5.7** — same flex-column layout fix as Bug 9; scoring-panel-mount scrolls within bounded body. |

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
When auth goes live, remove these three shims IN ORDER:

1. `frontend/src/hooks/useLiveScoring.js`
   Search: `"AUTH TESTING SHIM"`
   Remove: `_effectiveUserId` and `_effectiveUserName` fallback block
   Restore: all `userId`/`userName` references back to direct param use

2. `frontend/src/components/ScoringMode/index.jsx`
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

---

## Security Practices

The phased security roadmap lives in `docs/product/SECURITY_FRAMEWORK.md`. Standing Practices listed in that doc become permanent rules here as items ship. Currently no items have shipped — section will be populated incrementally.

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
14. Pre-push hook runs `npm test` and passes on the release branch before PR opens

### Final gate

15. Vercel preview deployed and phone-smoke-tested on a real device and network (DevTools simulation does not replace this)
16. Branch protection on `main` enforces CI checks + preview deployment green — no bypass

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
**v2.5.15** — May 2026. Full version history in `VERSION_HISTORY` constant in `frontend/src/data/versionHistory.js`.

- v2.5.15 (2026-05-19): Share Lineup CTA restored on Game Day → Lineups tab (Story 67, PR #99); Support tab polish — FAQ default, full-row link tap targets, longer toast duration (PR #94).
- v2.5.14 (2026-05-16): UX Phase 3 primitives — Pill, ListRow, 4 component migrations, 80 new tests.
- v2.5.13 (2026-05-15): Scoring restoration. (1) `leagueRules.getRules`: alias normalization (10U/9U/10U-minor/9U-minor → canonical) + fallback to `baseball:9-10U`/`softball:9-10U` with `console.warn` instead of throwing on unknown age groups — fixes hook-init crash that blocked the scoring surface entirely. (2) `DugoutView.dugoutFocusMode`: formula revised to `(currentAtBat !== null || scorerClaimed) ? 'scoring' : 'lineup'` — closes the deadlock where a coach claimed scorer, `currentAtBat` was null, mode stayed `'lineup'`, LiveScoringPanel was `display:none`, no UI to call `startAtBat()`. (3) `DugoutView.test.jsx`: two state-machine tests rewritten to assert the v2.5.13 contract; viewer-path transitions left for a follow-up scope. (4) Docs: root `CLAUDE.md` `dugoutFocusMode` entry rewritten with new formula, per-role behaviour, and deadlock rationale; Story 48 named as follow-up for the in-DugoutView defense-view toggle. Closes Stories 15, 16. Suite stayed at 654 passed + 1 skipped.
- v2.5.12 (2026-05-14): Multi-PR release. (1) UX Phase 3 — Badge context prop + PlayerHandBadge consolidation (PR #73): Badge primitive gained `context='light'|'dark'` prop with token-driven dark variants; PlayerHandBadge.jsx extended to forward context; Shared/PlayerHandBadge.jsx deleted (stale precursor, filename collision resolved); NowBattingStrip.jsx repointed to root PlayerHandBadge with context="dark"; integration regression guard NowBattingStrip.test.jsx (new file, 63 lines) + 5 Badge tests + 4 PlayerHandBadge tests; Story 63 (P2) logged. (2) Backlog hygiene pass (PR #74, closes Story 34): Story 27 → 61 renumber (5 references), P2 row 47 → Story 62 promotion, Gaps 17/18/25/52 retired, 13 resolved headings marked ✅. Suite 644 → 654 passed + 1 skipped. No user-facing change.
- v2.5.11 (2026-05-13): Multi-PR release. (1) Slice 4 dead-code cleanup (Story 54, PR #67): removed legacy `ScoringMode/index.jsx` + `ScoringMode/README.md` (both unreferenced since Slice 3); removed `Viewer/ViewerMode.jsx` + colocated test (replaced by DugoutView isViewer=true in Slice 3). ScoringMode/ directory PRESERVED — still holds 7 live child components DugoutView imports directly (directory restructure deferred to a separate refactor PR). (2) UX Phase 3 Step 2 (PR #68): EmptyState.jsx migrated to Stack/Text/Button primitives; Story 59 closed (PlayerHandBadge unused tokens import removed); token coverage gaps filed as Story 60. (3) UX track docs catchup (PR #69): UX_REFACTOR_ROADMAP, CLAUDE.md Active Tracks, ROADMAP brought current with Phase 2 + Phase 3 Step 1/2 ship status. No user-facing change.
- v2.5.10 (2026-05-08): Phase 2 — UI primitives (Badge, Button, Card, Stack, Text) added to frontend/src/components/ui/; +107 component tests; LockFlow.jsx duplicate fontSize cleanup (no visual change); Phase 3 Step 1 — PlayerHandBadge.jsx migrated to Badge primitive (PR #62, first consumer, pure refactor).
- v2.5.9 (2026-05-07): Slice 3 — COMBINED_GAMEMODE_AND_SCORING flipped default-ON; legacy ScoringMode import + render block + Scoring tab removed; DUGOUT VIEW is now sole game-day launcher; ViewerMode share-link path simplified to DugoutView isViewer=true.
- v2.5.8 (2026-05-07): Infrastructure stability — Story 41 resolved (Vitest pool: forks → threads; Cox Defender fork-spawn block eliminated; pre-push test gate functional without --no-verify); Stories 45+53 resolved (hook stdin refspec fix + Husky shebang cleanup).
- v2.5.7 (2026-05-04): Slice 2 — DefenseDiamond lifted into DugoutView body; dugoutFocusMode state machine ('lineup'/'scoring'); ScoreboardRow inning+halfInning indicator; Bug 8 fix (BattingOrderStrip batter source); Bugs 9/10 fix (flex-column 375px layout); Story 46 resolved; + fix-up Story 50 (exit button on ScoreboardRow, persistent across modes); suite 499→516.
- v2.5.6 (2026-05-03): UX Track Phase 1a — ACCESSIBILITY_V1 promoted to GA (default-on); F1-F7 component a11y fixes; design tokens scaffolding (theme/tokens.js); ESLint pipeline restored; 39 new tests (a11y-fixes ×11, tokens ×27, accessibility.v1 +1); suite 452→499.
- v2.5.5 (2026-05-02): Slice 1 of combined game view — BattingOrderStrip component added; integrated into DugoutView (entry + active states); currentBatterIndex prop wired from App.jsx. 15 new tests (BattingOrderStrip ×6, DugoutView ×5, ScoreboardRow ×4); D017 resolved; suite 437→452.
- v2.5.4 (2026-05-01): Slice 0 of combined game view — ScoringMode logic lifted into DugoutView.jsx under COMBINED_GAMEMODE_AND_SCORING flag (default OFF). No user-facing change in prod. Stories 27, 40–44 captured in backlog.
- v2.5.3 docs addendum (2026-04-30): Added SECURITY_FRAMEWORK.md reference and Security Practices section.
- v2.5.3 (2026-04-28): Meta-governance patch — VERSION_HISTORY extracted to src/data/versionHistory.js; versionHistory.test.js (3 tests) enforces approved techNote strings; 24 historical techNote violations corrected; UPDATES TAB CONTENT RULE named heading added to CLAUDE.md; versionHistory.js added to extracted-modules list; Meta-governance techNote example corrected to approved string.
- v2.5.2 (2026-04-28): Game Mode polish — count strip redesigned into two scope-grouped pills (Count + Outs) with stacked label-above-value cells (INNING / BALLS / STRIKES / OUTS). Single render surface: top pill binds dynamically to active batter via `isHomeBatting`; legacy bottom opponent count strip removed. Toast primitive added (top-anchored, dismissable, auto-clearing); half-inning notifications migrated to Toast. Mercy banner symmetric across home and opponent halves. @testing-library/jest-dom added; vitest glob expanded to .jsx; 10 tests (Toast.test.jsx); suite 421→431.
- v2.5.1 (2026-04-24): ACCESSIBILITY_V1 follow-up + UX consolidation — Game Mode scoreboard polish: truncateTeamName word-boundary aware (cap 12 default, cap 10 for ScoreboardRow); GameContextHeader removed, game number chip + HomeAwayChip (amber @ Away / neutral Home) inline in all 3 header strips; STATE 1 subtitle home/away connector restored (was hardcoded 'vs'); ScoreboardRow labels 16px/#e2e8f0/700; gold borderTop accent; overflow backstop. Tests: opponentNameLabel.test.js + gameHeader.test.js updated; suite 419→421.

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
- Recent: Phase 1a–1c + R1 Roster Polish (v2.5.6) · Phase 2 UI Primitives + Phase 3 Step 1 PlayerHandBadge → Badge (v2.5.10, PRs #61–#63) · Phase 3 Step 2 EmptyState → Stack/Text/Button + Story 59 cleanup (PR #68 on develop, pending next promotion) · v2.5.14 — Pill + ListRow primitives, FAQSection/LegalSection/ValidationBanner/OfflineIndicator migrated (PRs #83–#85)
- Next: Phase 3 — App.jsx component split (post-token + post-primitive work); Support tab P1 behavioral fixes (App.jsx gate required)

### Cross-track discipline
- At session start on either track, read this section + `git log` since last session
- User-visible work on either track ships behind a flag default-OFF, soaks, then GA-promotes in a separate release
- Track manifest gets updated whenever a track-related PR merges or current work changes
