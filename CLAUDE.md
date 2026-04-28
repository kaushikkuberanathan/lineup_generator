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

- Vitest v4 syntax: fork options live at top level
  (`pool: 'forks'`, `forks: { singleFork: true }`), NOT inside
  `poolOptions` (which was deprecated in v4).
- Windows test environment requires singleFork for scoring tests
  to avoid OOM cascade. If OOM returns, check test weight before
  excluding.
**Pre-push hook (v2.5.3):** `.husky/pre-push` runs `cd frontend && npm test` (no retry) and includes a branch guard rejecting direct pushes to `develop` and `main`. Override for declared hotfixes only: `ALLOW_DIRECT_PUSH=1 git push`. The earlier `|| npm test` retry was removed because it was duplicated (ran tests up to four times) and masked first-run failures.

### Known issue: Windows Vitest cold-start OOM

On Windows with <4GB free RAM, Vitest's single-fork pool may
cascade-OOM 10+ files during cold-start. Symptoms: "FetchStream
closed early" or worker timeouts across many files.

Workaround:
1. Close other memory-hungry apps
2. Run `cd frontend && npm test` directly once to warm module cache
3. Re-attempt git push

This is environmental. Do NOT add retry logic to the pre-push hook
(`|| npm test`). Retries hide real failures because the second attempt
runs a subset of files after OOM, producing false-positive exit 0.

If this becomes frequent, investigate splitting the suite: a
lightweight pre-push subset + full GitHub Actions CI run on push.

---

## Commands

### Frontend (`frontend/`)
```bash
npm run dev          # Dev server at http://localhost:5173
npm run build        # Production build to dist/
npm run lint         # ESLint with --max-warnings 0 (strict)
npm test             # Run Vitest regression suite (vitest run)
npm run test:watch   # Watch mode for TDD
npm run test:ui      # Browser UI (vitest --ui)
```

### Backend (`backend/`)
```bash
node index.js      # Start Express server (default port 3001)
```

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

### Frontend Structure
All UI and business logic lives in `frontend/src/App.jsx` (~5,000 lines). Extracted modules: `migrations.js`, `formatters.js`, `flagBootstrap.js`, `versionHistory.js` (imported by App.jsx).

Key sections within App.jsx:
- **~1–457**: Constants (SKILLS, TAGS, BAT_SKILLS, position colors, field layouts)
- **~458–720**: Lineup engine (`scorePosition`, `autoAssign`)
- **~720–900**: Helper functions (`validateGrid`, `initGrid`, etc.)
- **~900–1197**: State initialization and Supabase hydration
- **~1197+**: JSX render (tabs: Roster, Defense, Batting, Schedule, Print, Share, Links, Feedback, About)

### Lineup Engine (App.jsx ~458–720)
Two-phase auto-assign algorithm:
1. **Bench selection**: Players beyond 10 benched using bench equity logic
2. **Field assignment**: Outfield first (LC→RC→LF→RF), then infield most-constrained-first, using 8 scoring layers. Runs 8 attempts with shuffled player order; returns best result (fewest violations).

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
- **Feature gate**: `live_scoring` flag from Supabase `feature_flags` table. Overridden to `true` by team name match for "Mud Hens" and "Demo All-Stars" regardless of flag state (see v2.2.29).
- **Tables**: `live_game_state` (one row per game+team, upserted on every event), `game_scoring_sessions` (scorer lock + heartbeat), `scoring_audit_log` (append-only action trail).
- **Scorer identity**: `scorer_local_id` stored in localStorage as UUID v4; generated once per device. Used as `scorer_user_id` until real auth is active. Phase 4C: replaced by `user.id` from auth session.
- **Session lock**: scorer claims lock via `game_scoring_sessions` upsert; heartbeat every 20 s. Realtime subscription on `game_scoring_sessions` lets viewers see who is scoring. Lock expires if heartbeat stops.
- **State persistence**: `useLiveScoring` hook upserts `live_game_state` on every pitch/run/outcome (fire-and-forget). Hydrated from Supabase on mount. Realtime pushes changes to all connected subscribers.
- **myTeamHalf**: `'top'` or `'bottom'` — selected at entry screen, stored in `ScoringMode` component state. Gates batter area and pitch bar: pitch buttons shown during our half; opponent B/S/O pip tracker + 5 pitch buttons shown during their half.
- **Opponent tracking**: `oppBalls`, `oppStrikes`, `oppRunsThisHalf` in gameState; `recordOppPitch()` in `useLiveScoring`. Auto-flips half-inning at 3 outs. `opp_runs_this_half` persisted to Supabase.
- **Mercy rule**: banner at `runsThisHalf >= 5` (our half) or `oppRunsThisHalf >= 5` (their half); shows End Inning + End Game buttons.
- **Hook location**: `frontend/src/hooks/useLiveScoring.js`. UI: `frontend/src/components/ScoringMode/`.
- **Single render surface for count/outs (added v2.5.2):** Game Mode count and outs render in exactly one place — the top pill in `LiveScoringPanel.jsx`. The pill binds dynamically to the active batter via `const isHomeBatting = gs.halfInning === myTeamHalf`. BALLS reads `gs.balls` when home is batting, `gs.oppBalls || 0` otherwise. STRIKES uses the symmetric pattern. OUTS reads `gs.outs` (shared across halves). Stacked label-above-value pattern (INNING / BALLS / STRIKES / OUTS) is the convention for scoring strips. Future scoring UI must NOT introduce a parallel count display.

### Backend (`backend/`)
Existing routes in `index.js`:
- `GET /health` — health check (async DB connectivity check; 503 on DB failure)
- `GET /ping` — uptime ping (UptimeRobot monitor #802733786, every 5 min)
- `POST /api/ai` — Claude API proxy (`claude-sonnet-4-6`, max 1000 tokens, 25s timeout)

Auth routes (additive only — do not modify existing handlers):
- `POST /api/v1/auth/*` — auth routes (`src/routes/auth.js`)
- `GET/POST /api/v1/admin/*` — admin routes (`src/routes/admin.js`)

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
Three shims to remove when real auth goes live:

1. **`frontend/src/hooks/useLiveScoring.js`** — remove `_effectiveUserId`/`_effectiveUserName` fallback block (marked `AUTH TESTING SHIM`). After removal, `userId`/`userName` from params flow directly into all Supabase writes.

2. **`frontend/src/components/ScoringMode/index.jsx`** — remove `scoringUserId`/`scoringUserName` fallback block + `isAdminTestMode` (marked `AUTH TESTING SHIM`). Replace with `var scoringUserId = user.id` and `var scoringUserName = user.profile.first_name`. Also remove `|| true` from `var isEnabled = liveScoringEnabled || true` — flag must be the sole gate.

3. **Supabase SQL** — swap anon RLS policies on live scoring tables for proper `auth.uid()` policies:
   ```sql
   DROP POLICY "scorer_lock_anon_test" ON game_scoring_sessions;
   -- repeat for live_game_state, scoring_audit_log, and any other live scoring tables
   -- Re-add policies scoped to auth.uid() matching scorer_user_id/team membership
   ```

---

## Zero-Downtime Constraint (CRITICAL)
Until Phase 4 cutover, all backend changes are **additive only**:
- Do NOT modify existing route handlers in `index.js`
- Do NOT add middleware to existing routes
- Do NOT alter existing tables or columns

---

## Data Protection (CRITICAL)
**NEVER write `roster: []` to a team that already has players without `force: true`.**

Three guards in place:
1. **Postgres trigger** — every write to `team_data` snapshotted in `team_data_history` (last 20 per team). Migration: `backend/migrations/002_team_data_history.sql` — confirmed applied.
2. **Backend write guard** — `POST /api/teams/:teamId/data` returns `409 ROSTER_WIPE_GUARD` if incoming roster is empty and DB row has players. Pass `force: true` to override (logged).
3. **Recovery endpoint** — `GET /api/teams/:teamId/history?limit=5&full=true` (localhost or `X-Admin-Key` header required).

---

## Environment Variables

**Frontend** (`.env` / Vercel):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MIXPANEL_TOKEN`

**Backend** (`.env` / Render):
- `ANTHROPIC_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_KEY`
- `RESEND_API_KEY`
- `APP_URL`, `BACKEND_URL`, `ADMIN_EMAIL`
- `RESEND_DOMAIN_VERIFIED`, `RESEND_TEST_RECIPIENT`
- `PORT` (default 3001)

---

## Deployment

- **Frontend**: Vercel auto-deploys from `main` (config: `frontend/vercel.json`)
- **Backend**: Render auto-deploys from `main` (root dir: `backend/`)
- **DEV**: `dev.dugoutlineup.com` (Vercel preview branches per PR — backend dev deleted April 27, 2026; local backend via `npm run dev` for testing)

> Historical (v2.3.2 era — retained for reference): DEV Supabase migration applied 2026-04-21 (`supabase/migrations/20260421_add_opponent_pitch_tracking.sql`). Prod migration was required before v2.3.2 frontend deploy and has been applied. The six `opp_*` columns now exist in prod.

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
10. [ ] Run `npm test` — confirm 434 passed / 1 skipped (as of v2.5.3, April 28, 2026) / 0 failed

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

End-to-end ordered sequence for promoting work from develop to production. Follow top-to-bottom; each step has its own gate. Established April 27, 2026.

### Phase 1: Pre-flight (before any commits)

1. **Branch hygiene audit** — Run `git status`, `git fetch --prune`, `git branch -vv`. Confirm clean working tree, identify stale branches.
2. **Verify local mirrors remote** — Both `main` and `develop` should be in sync with `origin/*`. Pull if behind.
3. **Confirm starting branch** — Feature branches always cut from `develop`, never from `main`.

### Phase 2: Feature branch workflow

4. **Create feature branch** from `develop`: `git checkout -b feature/<descriptive-name>`
5. **Rebase if needed** — If develop has moved since branch was conceived, rebase onto current `origin/develop` BEFORE making changes (clean tree required, use `git stash` if needed).
6. **Make changes, run all local gates** — Tests pass, build clean, manual UI verification per surface area changed.
7. **Stage with explicit paths** — Never `git add -A` or `git add .`. List specific files. See ## Git Staging Discipline.
8. **Commit with descriptive message** — Multi-line message describing user impact + technical detail. See VERSION_HISTORY schema for guidance on userChanges vs internalChanges framing.
9. **Push feature branch** — Pre-push hook runs full test suite. If hook OOM-cascades on Windows, follow workaround in ### Known issue: Windows Vitest cold-start OOM.

### Phase 3: PR to develop

10. **Open PR as DRAFT** — Always draft first. Triggers Vercel preview deployment without merge risk.
11. **Verify CI checks pass** — All required checks must be green. NEVER bypass via admin override (branch protection enforces this on `main`; same discipline applies to `develop`).
12. **Validate on Vercel preview** — Real device testing on iPhone SE / iPad / desktop. Run ### Game-Day Validation if deploy touches lineup/game mode/share.
13. **Mark ready for review** — Only after preview validation passes.
14. **Squash-merge to develop** — Keeps develop history clean (1 commit per feature). Delete branch when GitHub prompts.

### Phase 4: Develop soak

15. **Sync local develop** — `git checkout develop && git pull origin develop`
16. **Soak period** — Minimum 24 hours of develop time before promoting to main. Use the app naturally. Game-day testing is the gold standard.
17. **Watch UptimeRobot** — Confirm prod stays green during soak. (UptimeRobot push notifications must be enabled — see ## Key Infrastructure.)

### Phase 5: PR to main

18. **Repeat pre-flight audit** — `git fetch --prune`, confirm both develop and main in sync with remotes.
19. **Run ### Pre-deploy Checklist** — Version bumps, VERSION_HISTORY, ROADMAP, CLAUDE.md updates. Test suite passes.
20. **Run ## Pre-release Docs Checklist** — All doc artifacts current.
21. **Confirm ## Ship Gate** — All four questions answered.
22. **Open PR develop → main as DRAFT** — Same draft-first discipline.
23. **Verify CI green on develop's preview** — Vercel auto-deploys per branch.
24. **Mark ready, merge** — Squash-merge or merge-commit (squash recommended). Render auto-deploy fires for backend; Vercel auto-deploy fires for frontend.

### Phase 6: Production verification (within 10 min of merge)

25. **Smoke test prod** — `dugoutlineup.com` loads, `/ping` <2s, login works (or auth-not-required path), share link works, Game Mode renders, SCORING_SHEET_V2 (or current scoring sheet) renders correctly.
26. **Watch UptimeRobot** — Confirm green during the 10-min window.
27. **If anything fails** — Execute ### Rollback Procedure immediately.

### Phase 7: Post-deploy cleanup

28. **Sync local main** — `git checkout main && git pull origin main`
29. **Delete merged branches** — Both local and remote: `git branch -D <feature-branch>` and `git push origin --delete <feature-branch>` if not auto-deleted.
30. **Log v(N+1) backlog items** — Anything surfaced during deploy that didn't get fixed: stale docs, lint warnings, infra paper cuts.
31. **Update memory/notes** — Record what worked, what was friction, what's next session's first task.

### Anti-patterns (DO NOT)

- ❌ Push directly to `main` (branch protection blocks; admin bypass disabled)
- ❌ Cut feature branch from `main` (always from `develop`)
- ❌ Merge a PR with failing CI checks via admin override
- ❌ Skip the 24-hour develop soak unless it's a hotfix (see ## Ship Gate exempt types)
- ❌ Use `git add -A` for staging — explicit paths only
- ❌ Promote multiple unrelated versions in one PR without explicit awareness — discovered April 27, 2026 that develop was 12 commits ahead of main, bundling v2.4.0 + v2.5.0 + v2.5.1 in one promotion. This is acceptable in retrospect but should be a deliberate decision, not a discovery.

---

## Analytics
- 32+ Mixpanel events + 4 Vercel Analytics events
- Full reference: `docs/analytics/ANALYTICS.md`
- `track()` helper + `deviceContext`: `src/utils/analytics.js`
- Super properties (auto on every event): os, device_type, platform, is_pwa, screen_width, screen_height, app_version
- `app_version` auto-injected from `package.json` at build time via `vite.config.js` — no manual env var sync needed
- Mixpanel identity: established in `loadTeam()` via `mixpanel.identify()`

---

## Test Suite

Tests: `frontend/src/tests/` (frontend), `backend/scripts/tests/` (backend integration).

- **Framework**: Vitest (frontend), custom test-runner.js (backend)
- **Total**: 435 tests. CI target: 434 passed / 1 skipped / 0 failed (frontend, as of v2.5.3 — April 28, 2026)
- Known failing: **engine.v2 test 2.3** (7-player roster produces no warning — fix in separate session)

### Frontend test files
| File | Covers |
|------|--------|
| `engine.v2.test.js` | V2 lineup engine: assignment, bench, batting order, fallback, output shape; Group 6 — absent player bench exclusion |
| `lineupEngineV2-unit.test.js` | 35 tests — shape, assignment, bench, batting order, edge cases; Group X — absent player exclusion (tags pathway) |
| `bench-equity.test.js` | Bench count correctness, exclusivity, rotation fairness; absent-player equity (reduced roster) |
| `scoring.test.js` | 28 parameterized scoring function tests |
| `accessibility.v1.test.js` | POSITION_LABELS, FEATURE_FLAGS registry, isFlagEnabled defaults + overrides |
| `migrations.test.js` | Schedule migration, roster normalization, field backfill |
| `formatters.test.js` | fmtAvg, fmtStat, time formatting helpers |
| `flagBootstrap.test.js` | Feature flag bootstrap, localStorage override, URL param enable/disable |
| `trackingUrl.test.js` | UTM outboundLinkProps, CAMPAIGNS registry, medium auto-detection (17 tests) |

### Backend integration suite (~50 tests, 9 categories)
Auth middleware, team data, feedback, contracts, schedule integrity, idempotency, rate limiting, audit events, admin flows. Runs in `CI_SAFE` mode in GitHub Actions.

### Rules
- Changes to `lineupEngineV2.js`, `scoringEngine.js`, or `playerMapper.js` → must pass `npm test`
- Changes to `featureFlags.js` or `positions.js` → must pass `npm test`
- Never use `kaushik.kuberanathan@gmail.com` in automated test suites (Supabase rate limits OTP per address)

### Test-First Discipline (RED → GREEN)

New tests must fail before the fix is applied. RED output is a required deliverable, not an implementation detail.

### RED Checkpoint — non-negotiable

Any Claude Code prompt that includes a test-first step must produce explicit RED output as a deliverable before the fix step.

Rules:
1. RED output is mandatory evidence. The prompt owner verifies it — not the agent. Agent self-reports of "test passes" without RED evidence do not satisfy the gate.
2. If RED was missed (e.g. tests authored against already-corrected data), a mutation test is the substitute: temporarily inject a known violation, confirm RED, restore, confirm GREEN. Document both outputs.
3. Untracked test files survive `git stash` — when running a stash-based RED check on a freshly-extracted module, stash will be a no-op. Mutation tests are the correct tool in that case.

Rationale: A test that has never failed is a test that may never fail. Without RED evidence we are trusting the assertion is enforcing what we believe it enforces. The v2.5.3 techNote guard release proved both halves of this rule — RED was skipped, mutation test caught the gap.

---

## Feature Flags

Flags live in `frontend/src/config/featureFlags.js`. Two-level evaluation: global default + per-user localStorage override.

**Guard pattern:**
```js
var on = FEATURE_FLAGS.MY_FLAG || localStorage.getItem("flag:my_flag") === "1";
```

**Enable for one user without a deploy:**
```
https://dugoutlineup.com/?enable_flag=<flag_name>
```
Use `?disable_flag=<name>` to revert. Full guide: `docs/features/feature-flags.md`

### Current flags
| Flag | Default | Description |
|---|---|---|
| `VIEWER_MODE` | `false` | Read-only swipeable inning cards; Share Viewer Link button |
| `USE_NEW_LINEUP_ENGINE` | `true` | V2 scoring engine (not overridable) |
| `ACCESSIBILITY_V1` | `true` | Font floors, touch targets, contrast uplift, aria labels |
| `GAME_MODE` | `true` | Full-screen game day mode |

---

## Error Boundaries

All major sections wrapped with `<ErrorBoundary>` (`src/components/Shared/ErrorBoundary.jsx`). On crash: renders inline amber fallback card instead of white-screening.

**Rule**: Wrap new components at the call site in App.jsx — NOT inside the component definition. Do NOT wrap nav bar, tab bar, or top-level app shell.

---

## UI Primitives

Reusable components in `frontend/src/components/ui/`. Use these instead of one-off inline implementations.

**Toast** (`src/components/ui/Toast.jsx`) — Transient notifications use the Toast primitive. Top-anchored below safe-area inset (`env(safe-area-inset-top, 0px) + 8px`), `role=status` + `aria-live=polite`, ≥44×44px tap targets, auto-dismiss with hover/focus pause, optional action button. Do not implement custom fixed-position notification divs — wire to Toast instead.

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
- Canonical migration directory: `backend/src/db/migrations/` only — no new files in `backend/migrations/`
- Two files share the `004_` prefix in different dirs — do not confuse:
  - `backend/src/db/migrations/004_rls_policies.sql` — already applied
  - `backend/migrations/004_rls_fixes.sql` — parked until Phase 4 cutover

## Score Reporting Automation
- Microsoft Forms URL pre-fill does not work — confirmed by testing
- Direct backend POST blocked by session CSRF token (`__RequestVerificationToken` + `FormsWebSessionId` cookie)
- Chosen approach: n8n webhook orchestration (GET token → POST submission)
- All field IDs and endpoint documented in `docs/product/ROADMAP.md` under Backlog → Automated Score Reporting
- Power Automate webhook (county-side) documented as long-term fallback
- Schema migration needed: split `location` field into `parkName` + `fieldNumber` before implementation

---

## Date Keys in localStorage
Any date used as a localStorage lookup key (e.g. attendanceOverrides)
MUST use local calendar date, NOT toISOString() which returns UTC.
Evening games in ET are after midnight UTC — toISOString() returns
tomorrow's date, breaking key lookups.

Correct pattern:
```js
var _td = new Date();
var todayDate = _td.getFullYear() + '-'
  + String(_td.getMonth() + 1).padStart(2, '0') + '-'
  + String(_td.getDate()).padStart(2, '0');
```

toISOString() is acceptable ONLY for cleanup thresholds and
filename timestamps where 1-day drift is irrelevant.

---

## Known Open Bugs / Deferred Work

| # | Bug / Item | Notes |
|---|------------|-------|
| 1 | **Absent player auto-assign** | Out Tonight players (e.g. Aiden) occasionally still assigned to a field position when auto-assign runs. `activeBattingOrder` filters the batting order correctly; gap likely in lineup engine's absent exclusion path. |
| 2 | **Game Ball "—" display bug** | Schedule card shows "—" dash instead of recipient names after multi-player game ball selection. Read path may not be normalizing the `gameBall` array correctly at render. |
| 3 | **OOM contract test** | ~~`useLiveScore.contract.test.js` causes vitest worker OOM on Windows.~~ Fixed v2.3.0: added to `exclude` list in `vite.config.js` — file still exists but is not run in CI. |
| 4 | **Phase 4C deferred** | Auth gate activation (`requireAuth` middleware on existing routes), RLS enforcement on scoring tables (`auth.uid()` policies), HMAC-signed approve/deny links in admin emails — all parked until Phase 4 auth cutover. |
| 5 | **MERGE_FIELDS test-file copies** | Three test files (`migration.test.js:267`, `scheduleIntegrity.test.js:113`, `scheduleIntegrity.test.js:181`) each define their own local MERGE_FIELDS copy. These are kept in sync manually. Future: extract to a shared test fixture and import. |
| 6 | **pending_sync not re-attempted** | `finalizeSchedule.js` writes `pending_sync:<teamId>:finalize` to localStorage on Supabase failure but no retry mechanism exists yet. Coach must re-open the app while online for the next write to succeed. |
| 7 | **Windows Vitest cold-start OOM cascade** | Environmental — not a code issue. See Branch Strategy → Infrastructure notes → "Known issue: Windows Vitest cold-start OOM" for workaround. |

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
Screenshots are blocked on Android when the app is installed
as a PWA in standalone mode. This is an OS-level restriction —
not a code issue. No web-level fix exists without degrading the
full-screen coaching UX (switching display to "browser" mode
would break Game Mode).

Resolution: closed as won't-fix.
Workaround: use Share Link feature. iOS screenshots work normally.

Do not spend time debugging this. It cannot be fixed in web code.

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

Run this checklist every other session (minimum once per week):

1. Open `docs/product/DOC_TEST_DEBT.md`
2. Are any P0 items still open? → Block next code release for that feature until resolved
3. Are any P1 items now resolved? → Add `✅ Resolved vX.X.X — [what fixed it]` and move to Resolved section
4. Did this session introduce any new documentation or test gaps? → Add debt items now, not later
5. Did this session change any feature's behavior? → Update `docs/product/FEATURE_MAP.md` row for that feature

This audit takes 5 minutes and saves hours of confusion at the next session start.

---

## Feature Map Update Rules

`docs/product/FEATURE_MAP.md` is the authoritative feature-to-doc-to-test registry.

**Update it whenever:**
- A new feature ships → add a row with honest Doc/Test status
- A feature's behavior changes → set Doc Status to `⚠ Stale` until docs are repaired
- Documentation for a feature is repaired → flip Doc Status to `✅ Current`
- Tests for a feature are added or changed → flip Test Status to `✅ Yes` or `⚠ Partial`
- A debt item is created → add the ID to the Debt column
- A debt item is resolved → remove the ID and update Test/Doc status

**Column meanings:**
- **Doc Status**: `✅ Current` = docs match current behavior · `⚠ Stale` = docs lag behind code · `❌ Missing` = no docs exist
- **Test Status**: `✅ Yes` = golden path covered · `⚠ Partial` = some paths covered · `❌ None` = no automated tests

---

## Current Version
**v2.5.3** — April 2026. Full version history in `VERSION_HISTORY` constant in `frontend/src/data/versionHistory.js`.

- v2.5.3 (2026-04-28): Meta-governance patch — VERSION_HISTORY extracted to src/data/versionHistory.js; versionHistory.test.js (3 tests) enforces approved techNote strings; 24 historical techNote violations corrected; UPDATES TAB CONTENT RULE named heading added to CLAUDE.md; versionHistory.js added to extracted-modules list; Meta-governance techNote example corrected to approved string.
- v2.5.2 (2026-04-28): Game Mode polish — count strip redesigned into two scope-grouped pills (Count + Outs) with stacked label-above-value cells (INNING / BALLS / STRIKES / OUTS). Single render surface: top pill binds dynamically to active batter via `isHomeBatting`; legacy bottom opponent count strip removed. Toast primitive added (top-anchored, dismissable, auto-clearing); half-inning notifications migrated to Toast. Mercy banner symmetric across home and opponent halves. @testing-library/jest-dom added; vitest glob expanded to .jsx; 10 tests (Toast.test.jsx); suite 421→431.
- v2.5.1 (2026-04-24): ACCESSIBILITY_V1 follow-up + UX consolidation — Game Mode scoreboard polish: truncateTeamName word-boundary aware (cap 12 default, cap 10 for ScoreboardRow); GameContextHeader removed, game number chip + HomeAwayChip (amber @ Away / neutral Home) inline in all 3 header strips; STATE 1 subtitle home/away connector restored (was hardcoded 'vs'); ScoreboardRow labels 16px/#e2e8f0/700; gold borderTop accent; overflow backstop. Tests: opponentNameLabel.test.js + gameHeader.test.js updated; suite 419→421.
- v2.5.0 (2026-04-24): Feature — scoring outcome sheet semantic cleanup: Strikeout removed, Foul promoted to PITCH OUTCOME header, Out@1st+Flyout in 2-button top row, Home Run full-width. SCORING_SHEET_V2 flag (default true); opp-half +1 Run buttons hidden. OUTCOME_ROWS_V2 export; 8 tests (scoringSheetV2.test.js); suite 411→419. Story 29 resolved; Story 30 logged (isFlagEnabled DB-read refactor).
- v2.4.0 (2026-04-24): Feature — game context header, per-team +1 buttons on dedicated scoreboard row, home team name replaces "Us"/"US" (Stories 27 + 28 bundled + layout restructure). Manual run modal removed. deriveGameHeader util; GameContextHeader + ScoreboardRow components.
- v2.3.4 (2026-04-24): UX — opponent team name replaces "Opponent"/"OPP"/"Player #N" throughout scoring view; truncateTeamName util (12 cap, 10+"..").
- v2.3.3 (2026-04-23): Fix/Feature — live scoring accuracy + visual consistency: runner placement fix (player ID fallback, id||name); Realtime race guard (lastAppliedAtRef + updated_at <=); practice mode local-only path (no Supabase writes); opponent batter card unified with home-team card; runner pills absolute-positioned on diamond; layout dead space + 2B collision resolved; 354→395 tests (realtimeRaceGuard, practiceModeIsolation, liveStateMerge).
- v2.3.2 (2026-04-21): Feature — opposing pitcher pitch counts: per-batter/inning/game; opponent batter number (#1–#11); Foul button (amber); 6 new live_game_state columns (opp_balls, opp_strikes, opp_current_batter_number, opp_current_batter_pitches, opp_inning_pitches, opp_game_pitches); EXPECTED_LGS_KEYS 15→21; +6 contract tests; suite: 377/1/0. DEV migration applied 2026-04-21 — prod migration MUST be applied during v2.3.2 deploy window (see deployment note below).
- v2.3.1 (2026-04-21): Fix/Feature — runner conflict prompt (RunnerConflictModal: Score / Hold / Cancel play); detectRunnerConflict + applyConflictResolution pure helpers; preResolveSnapshot for CANCEL_PLAY; Exit Scoring in gear menu; header ← pauses; matchMedia jsdom stub (vite.config.js setupFiles); 10 tests (runnerAdvancement.test.js).
- v2.3.0 (2026-04-21): Feature — Game Mode action clarity + schedule finalization: X (pause), gear menu (Hand off / Finish Game), FinishGameModal, endGame() writes final score to team_data.schedule, undoHalfInning + 10s toast, MERGE_FIELDS extended with 4 finalization fields, 13 new tests.
- v2.2.45 (2026-04-21): Feature — live scoring opponent half: B/S/O pip tracker, 5-pitch buttons, 3-out auto-flip, mercy banner; myTeamHalf toggle at entry; scoring prop wired to LiveScoringPanel; all debug logs removed.
- v2.2.44 (2026-04-20): Fix — scoring pitch buttons position:fixed bottom:60px; always visible; outer container paddingBottom:160px; flex spacer removed.
- v2.2.43 (2026-04-20): Fix — scoring layout (flex spacer), empty batting order message, RestoreScoreModal UUID guard (null for local-xxx IDs).
- v2.2.42 (2026-04-20): Fix — scoring screen dead space removed; absent players excluded from scoring batting order (activeBattingOrder); diamond flexShrink:0; pitch buttons marginTop:auto.
- v2.2.41 (2026-04-20): Fix — LiveScoringPanel pitch buttons always visible; outer container height:100vh+overflow:hidden; diamond section flex:1; pitch bar 72px bottom clearance.
- v2.2.40 (2026-04-20): Fix — `team: activeTeam` added to useLiveScoring() call in ScoringMode/index.jsx; resolves permanent "Loading rules..." hang in Live Scoring pitch UI.
- v2.2.39 (2026-04-17): Debt ledger — FEATURE_MAP.md structural + missing-row gaps logged as two P1 items (P1: 4→6, total open: 17→19). Prerequisite for v2.2.40 restructure and v2.2.41 Backlog Adjacency System.
- v2.2.38 (2026-04-17): Drift repair — FAQs (Scorekeeper category, Out Tonight, Spotify deep-link), PERSONAS.md 8 personas, SOLUTION_DESIGN.md sections (Live Scoring, CI/CD, Analytics, feature_flags schema), DOC_TEST_DEBT.md Area fields + 4 resolved, FEATURE_MAP.md Governance row.
- v2.2.37 (2026-04-17): Scoring session — stable local scorer ID fallback; isAdminTestMode=false; 4 null guards removed from useLiveScoring.js.
- v2.2.36 (2026-04-17): Meta-governance — enhanced DOC_TEST_DEBT.md (new format, 20 items), debt-helpers scripts, CLAUDE.md Git Staging Discipline + debt-p0 gate, .gitignore hardening.
- v2.2.35 (2026-04-16): Test suite — attendance.test.js Group 9 (share payload, 10 tests) + Group 10 (Out detection, 7 tests). Total: 306/1/0.
- v2.2.34 (2026-04-16): Scoring session fix — scoringUserId falls back to session.user.id; null guards on all 4 useLiveScoring Supabase write sites.
- v2.2.33 (2026-04-16): Meta-governance — Feature Map (18 features), Debt Ledger (21 gaps), Ship Gate ritual, 8-step Session Start Command, settings.local.json untracked.
- v2.2.31 (2026-04-16): Docs-only — FAQ repaired (Attendance, Game Ball, Scorekeeper category, Spotify deep-link, install banner, Google sign-in). PERSONAS.md rewritten to 8 personas. SOLUTION_DESIGN.md Auth Architecture section rewritten (Phase 2, Twilio tags removed).
- v2.2.30 (2026-04-16): Out Tonight players visible in red across all 11 lineup surfaces — diamond SVG, defense grid, Game Mode strip, share link, PDF.