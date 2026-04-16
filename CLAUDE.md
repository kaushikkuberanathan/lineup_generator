# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Rules
- NEVER commit or push to main without explicit confirmation from KK
- Always test locally first — start dev server, verify in browser, then ask for confirmation
- The confirmation phrase is: "confirmed — push to main"
- If KK has not said "confirmed — push to main", only make local file changes

## Project Overview

Youth baseball/softball lineup generator — a mobile-first PWA for coaches to manage rosters, auto-assign field positions, track batting order, and manage schedules. Stack: React 18 + Vite (frontend on Vercel), Express (backend on Render), Supabase (Postgres + JSONB).

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
All UI and business logic lives in `frontend/src/App.jsx` (~5,000 lines). Extracted modules: `migrations.js`, `formatters.js`, `flagBootstrap.js` (imported by App.jsx).

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
```
All `team_data` columns are JSONB — structure matches localStorage exactly, no transformation layer.

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
- **DEV**: `dev.dugoutlineup.com` → `lineup-generator-backend-dev.onrender.com`

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
10. [ ] Run `npm test` — confirm 261 passed / 1 skipped / 0 failed

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
- **Total**: ~310 tests. CI target: 306 passed / 1 skipped / 0 failed (frontend)
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

## Key Conventions
- Display **first names only** throughout the UI — coaches use this on the sideline
- `touchDrag` state is a mutable ref (not `useState`) — avoids stale closure issues in touch handlers
- `grid` state is a 2D array `[inning][fieldPosition]` mapping to player IDs
- Supabase helpers: `frontend/src/supabase.js` — use `dbSaveTeamData()` / `dbLoadTeamData()` for all team data persistence
- `MERGE_FIELDS` is defined once as a shared const — do not duplicate at boot hydration and loadTeam hydration

---

## Key Infrastructure
- **Supabase project**: `hzaajccyurlyeweekvma.supabase.co`
- **Production backend**: `lineup-generator-backend.onrender.com`
- **DEV backend**: `lineup-generator-backend-dev.onrender.com`
- **Mud Hens team ID**: `1774297491626`
- **UptimeRobot**: monitor #802733786 pings `/ping` every 5 minutes
- **Admin UI**: `https://dugoutlineup.com/admin.html`
- **Master ops doc**: `docs/product/MASTER_DEV_REFERENCE.md`

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
- **Meta-governance** — docs-only, zero app code changes. Use `techNote: "Meta-governance release."` in VERSION_HISTORY.
- **Hotfix** — must include `[hotfix-exception]` in the commit message body with one sentence explaining why the gate is bypassed.

The Ship Gate exists because we've shipped broken features before. Treat it as a ritual, not bureaucracy.

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
**v2.2.36** — April 2026. Full version history in `VERSION_HISTORY` constant in `frontend/src/App.jsx`.

- v2.2.36 (2026-04-17): Meta-governance — enhanced DOC_TEST_DEBT.md (new format, 20 items), debt-helpers scripts, CLAUDE.md Git Staging Discipline + debt-p0 gate, .gitignore hardening.
- v2.2.35 (2026-04-16): Test suite — attendance.test.js Group 9 (share payload, 10 tests) + Group 10 (Out detection, 7 tests). Total: 306/1/0.
- v2.2.34 (2026-04-16): Scoring session fix — scoringUserId falls back to session.user.id; null guards on all 4 useLiveScoring Supabase write sites.
- v2.2.33 (2026-04-16): Meta-governance — Feature Map (18 features), Debt Ledger (21 gaps), Ship Gate ritual, 8-step Session Start Command, settings.local.json untracked.
- v2.2.31 (2026-04-16): Docs-only — FAQ repaired (Attendance, Game Ball, Scorekeeper category, Spotify deep-link, install banner, Google sign-in). PERSONAS.md rewritten to 8 personas. SOLUTION_DESIGN.md Auth Architecture section rewritten (Phase 2, Twilio tags removed).
- v2.2.30 (2026-04-16): Out Tonight players visible in red across all 11 lineup surfaces — diamond SVG, defense grid, Game Mode strip, share link, PDF.