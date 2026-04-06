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

## Architecture

## Multi-team design (Phase 5 — established Phase 4C session)
- One Supabase auth.users record per person regardless of how many teams
- One team_memberships row per (user, team) combination
- team_admin role is team-scoped — a user can be team_admin on Team A 
  and coach on Team B simultaneously
- platform_admin is the only truly global role — stored separately from 
  team_memberships
- team_id in team_memberships is the join key — always a text field matching teams.id
- Phase 4 MVP: platform_admin manually creates teams in Supabase
- Phase 5A: self-service team creation replaces manual process
- Approval routing in Phase 4: ALL requests → platform_admin (icoachyouthball@gmail.com)
- Approval routing in Phase 5B: coach/coordinator → team_admin, team_admin → platform_admin

### Persistence: Three-Layer Pattern
```
User Action → React state (instant) → localStorage (instant) → Supabase (async, fire-and-forget)
```
On load, app hydrates from localStorage first (instant/offline), then syncs with Supabase in background. All Supabase calls are non-blocking — the app is fully functional offline.

### Frontend: Monolithic Component
All UI and business logic lives in `frontend/src/App.jsx` (~5,000 lines). This is intentional — no component library, no separate files per tab. The component manages ~40 `useState` hooks covering team data, UI state, form state, drag/touch, feedback, and onboarding.

Key sections within App.jsx:
- **Lines ~1–457**: Constants (SKILLS, TAGS, BAT_SKILLS, position colors, field layouts)
- **Lines ~458–720**: Lineup engine (`scorePosition`, `autoAssign`)
- **Lines ~720–900**: Helper functions (`validateGrid`, `initGrid`, etc.)
- **Lines ~900–1197**: State initialization and Supabase hydration
- **Lines ~1197+**: JSX render (tabs: Roster, Defense, Batting, Schedule, Print, Share, Links, Feedback, About)

### Lineup Engine (App.jsx ~458–720)
Two-phase auto-assign algorithm:
1. **Bench selection**: Players beyond 10 are benched using bench equity logic
2. **Field assignment**: Outfield first (LC→RC→LF→RF), then infield most-constrained-first, using 8 scoring layers:
   - Hard blocks → skill badges → preferred positions → coach tags → dislikes → consecutive inning blocks → spread penalty → bench equity bonus
   - Runs 8 attempts with shuffled player order; returns best result (fewest violations)

### Database Schema (Supabase)
```sql
teams      (id, name, age_group, year, sport, owner_id, created_at)
team_data  (team_id, roster, schedule, practices, batting_order, grid, innings, locked)
```
All `team_data` columns are JSONB — structure matches localStorage exactly, no transformation layer.

### Backend (`backend/`)
Existing routes in `index.js` (do not modify — see zero-downtime constraint below):
- `GET /health` — health check
- `POST /api/ai` — Claude API proxy (`claude-sonnet-4-6`, max 1000 tokens, 25s timeout)
  - Allowed `type` values: `schedule` (parse schedule text), `result` (parse game result)

New routes being added (additive only, no changes to existing handlers):
- `POST /api/v1/auth/*` — auth routes (`src/routes/auth.js`)
- `GET/POST /api/v1/admin/*` — admin routes (`src/routes/admin.js`)

New backend file structure:
```
backend/
  src/
    routes/
      auth.js          # OTP send/verify endpoints
      admin.js         # Admin-only endpoints
    middleware/
      requireAuth.js   # Validates Supabase session
      requireAdmin.js  # Checks admin role
    lib/
      supabase.js      # Service-role Supabase client (server-side only)
      phone.js         # E.164 validation via libphonenumber-js
    db/
      migrations/      # SQL migration files
  scripts/
    backfill-members.js
    test-auth-flow.js
    test-admin-flow.js
```

### Auth Strategy
- **OTP via Supabase phone auth** — no passwords; coaches receive a one-time code via SMS
- Phone numbers enforced in **E.164 format** server-side using `libphonenumber-js` (`src/lib/phone.js`)
- **Supabase service role key** lives only in backend environment — never sent to the client
- Frontend continues using the anon key for existing data operations

## Auth System — Current Status (as of March 2026)

### What Is Built and Deployed
- Full phone OTP auth framework deployed to Render
- Supabase tables: access_requests, profiles, team_memberships, feedback
- RLS policies on all auth tables (access_requests, profiles, team_memberships, feedback) — verified 2026-03-30
- RLS audit complete — `backend/migrations/004_rls_fixes.sql` written and ready (NOT YET RUN — run at Phase 4 cutover only)
- Pre-cutover checklist: `docs/ops/PHASE4_PRECHECK.md`
- activate_membership Postgres function (atomic profile upsert + membership activation)
- Backend endpoints:
  - POST /api/v1/auth/request-access
  - POST /api/v1/auth/login (rate-limited)
  - POST /api/v1/auth/verify
  - GET /api/v1/auth/me
  - GET/POST /api/v1/admin/requests
  - POST /api/v1/admin/approve
  - POST /api/v1/admin/reject
  - GET /api/v1/admin/members
  - POST /api/v1/admin/update-role
  - POST /api/v1/admin/reset-access
  - POST /api/v1/admin/suspend
  - GET /api/v1/admin/feedback
  - POST /api/v1/feedback
- Admin UI page: frontend/public/admin.html
- Feedback collection: backend endpoint built, frontend submitFeedback/submitBug wired to POST to backend
- Backfill script: scripts/backfill-members.js
- Existing users pre-approved in team_memberships (Kaushik + Stan Hoover)

### Current Users in team_memberships
- Kaushik K: +14044930548, role=admin, team=Mud Hens (1774297491626), status=active
- Stan Hoover: +15705155156, role=coach, team=Mud Hens (1774297491626), status=invited

### What Is NOT Done Yet (Parking Lot)

#### Phone OTP — Removed
Twilio phone OTP was planned but abandoned. Verification process failed. Auth is now email magic-link + Google OAuth (admin console). No phone/SMS dependency anywhere in the stack.

#### TODO: Phase 4 Cutover (do after 2-3 coaches have tested successfully)
Full step-by-step checklist: **`docs/ops/PHASE4_PRECHECK.md`**

Pre-flight (fix first):
- Fix admin.js teamId UUID validation bug (see BUG below)
- Remove debug logs from auth.js + supabase.js
- Set Stan Hoover team_memberships.status = 'active' (currently 'invited' — will be blocked from team_data after RLS is applied)

Cutover steps (in order):
1. Run `backend/migrations/004_rls_fixes.sql` in Supabase SQL Editor
2. Add requireAuth middleware to existing routes in index.js
3. Deploy to Render
4. Announce to coaches: "next login will ask you to verify your phone"

#### BUG: admin.js approve route rejects numeric team IDs
- `body('teamId').isUUID()` in `backend/src/routes/admin.js` rejects `1774297491626`
- This means admin CANNOT approve access requests for Mud Hens (or any legacy numeric team)
- Fix: change validator to `body('teamId').notEmpty().trim()`
- Must fix before any real coach tries to request access

#### TODO: Apply RLS hardening migration (004_rls_fixes.sql)
- Migration created: `backend/migrations/004_rls_fixes.sql`
- DO NOT run before Phase 4 cutover — will break anon writes that coaches rely on today
- Run AT cutover, after requireAuth is added to existing index.js routes
- Covers: share_links, teams, team_data, roster_snapshots, team_data_history
- Viewer mode (share links) safe: payload is self-contained in share_links table

#### TODO: Mobile UI Screens
- Request Access form (screen for coaches to submit their name + phone)
- OTP Login screen (enter phone → get code → verify)
- These are React Native screens, not yet built
- Designs are documented in the auth framework conversation

#### TODO: Fix /me memberships bug
- /me endpoint returns memberships:[] intermittently
- Root cause: token expiry not handled gracefully in admin.html
- Fix: add token refresh logic using refresh_token before calling /me
- Also: add id to team_memberships select in /me handler (needed for admin UI action buttons)

#### TODO: team_memberships.team_id type migration
- Column was UUID, altered to TEXT to support non-UUID team IDs from existing teams table
- Need to update migration file 003_create_team_memberships.sql to reflect TEXT type
- Also update DEFAULT_TEAM_ID in .env and Render to: 1774297491626

#### TODO: Remove debug logging before production
- [login debug] logs in src/routes/auth.js
- [me debug] logs in src/routes/auth.js
- [supabase] admin key prefix log in src/lib/supabase.js
- Remove all before Phase 4 cutover

#### TODO: Email notifications for new access requests
- No notification system built yet
- Admin must manually check Supabase or admin UI for pending requests
- Recommended: add Resend (resend.com) integration to /request-access endpoint
- Free tier: 3,000 emails/month, ~30 min to implement

### Key Credentials and IDs (reference)
- Supabase project: hzaajccyurlyeweekvma.supabase.co
- Mud Hens team ID: 1774297491626
- Kaushik user_id: 7ba2bd81-9e08-40b0-bb2b-f96a82ab9e9a
- Supabase test OTP: phone +14044930548, code 123456
- Admin UI URL (production): https://dugoutlineup.com/admin.html
- Backend URL: https://lineup-generator-backend.onrender.com

### Data Protection (CRITICAL)

**NEVER write `roster: []` to a team that already has players without `force: true`.**

The roster-wipe incident has occurred twice. Two guards are now in place:

1. **Postgres trigger** — every write to `team_data` is snapshotted in `team_data_history` (last 20 per team). Migration: `backend/migrations/002_team_data_history.sql` — run in Supabase SQL Editor before next data operation.

2. **Backend write guard** — `POST /api/teams/:teamId/data` returns `409 ROSTER_WIPE_GUARD` if incoming `roster` is empty and current DB row has players. Pass `force: true` to override (logged).

3. **Recovery endpoint** — `GET /api/teams/:teamId/history?limit=5&full=true` (localhost or `X-Admin-Key` header required). Returns snapshots with full JSONB. See `backend/migrations/README.md`.

For scripts/migrations: check existing roster before writing. If `roster.length > 0`, skip and log:
`SKIPPED team_id=[N]: roster already has [M] players, not overwriting`

Add `ADMIN_KEY` to backend `.env` and Render environment to protect the recovery endpoint.

---

## Migration naming collision — important
Two files share the 004_ prefix but live in different directories
and serve different purposes:

- `backend/src/db/migrations/004_rls_policies.sql`
  RLS on auth tables (access_requests, profiles, team_memberships)
  STATUS: Already applied

- `backend/migrations/004_rls_fixes.sql`
  RLS hardening on existing tables (teams, team_data, share_links)
  STATUS: Parked — do not run until Phase 4C cutover
  BLOCKS ON: Frontend auth screens (LoginScreen, AuthGate) being live
  REASON: Will break anon writes that coaches rely on today

`backend/migrations/` is the legacy directory — no new files go there.
All future migrations go in `backend/src/db/migrations/` only.

---

### Zero-Downtime Constraint (CRITICAL)
**Until Phase 4 cutover, all backend changes are additive only:**
- Do NOT modify existing route handlers in `index.js`
- Do NOT add middleware to existing routes
- Do NOT alter existing tables or columns
- New routes, middleware, and files are added alongside existing code, not replacing it

### Environment Variables
**Frontend** (`.env` / Vercel):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Backend** (`.env` / Render):
- `ANTHROPIC_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — service role key, server-side only
- `PORT` (default 3001)

## Deployment
- **Frontend**: Vercel auto-deploys from `main` (config: `frontend/vercel.json`)
- **Backend**: Render auto-deploys from `main` (root dir: `backend/`)

## Pre-deploy checklist additions (Phase 4B)
- [ ] loginLimiter: 15min window, max 5, applied to POST /magic-link in backend/src/routes/auth.js (already set — verify before prod auth launch)
- [ ] Confirm RESEND_DOMAIN_VERIFIED=true in Render env vars
      (only after custom domain is verified — enables emails to all recipients)
- [ ] Run npm test and confirm 204 passed / 1 skipped / 0 failed before pushing
- [ ] Never use kaushik.kuberanathan@gmail.com in automated test suites
      (Supabase rate limits OTP sends per address — use dedicated test emails)
- Note: app_version in analytics is derived automatically from frontend/package.json at build time via vite.config.js define. No manual env var sync needed — bumping package.json is sufficient.
- [ ] Prepend to VERSION_HISTORY in frontend/src/App.jsx. Use the dual-layer schema — both layers required:

  ```js
  {
    version: "x.x.x",
    date: "Month YYYY",

    // USER-FACING — rendered in the app Updates tab
    headline: "One sentence: what the coach gets, not what was built",
    userChanges: [
      "Plain English benefit — what does the coach experience differently?",
    ],
    techNote: "Bug fixes and performance improvements",
    // techNote must be one of these four strings:
    //   "Bug fixes and performance improvements"
    //   "Under-the-hood stability improvements"
    //   "Performance and reliability improvements"
    //   "Minor fixes and internal improvements"
    // Omit techNote only for pure user-facing releases with zero tech changes.

    // INTERNAL — NOT rendered, preserved for audit trail
    internalChanges: [
      "Exact technical detail — what was built/changed/fixed",
      "Specific file, function, or system affected",
    ],
  }
  ```

  RULE: userChanges answers "What does the coach experience differently tomorrow?" — never expose refactors, hooks, middleware, CI, migrations, or internal tooling in userChanges. Those go in internalChanges only.

  RULE: internalChanges is the canonical technical record for this version. It replaces the old `changes` array and should be as detailed as the prior entries were. GitHub commit messages and ROADMAP.md remain unchanged.

> UPDATES TAB CONTENT RULE: The Updates tab is coach-facing.
> `headline` and `userChanges` must be written in plain English as coach benefits. Technical details belong in
> `internalChanges`, git commit messages, and ROADMAP.md only.
> The `internalChanges` field is never rendered in the UI.

## Analytics
- 27 Mixpanel events + 4 Vercel Analytics events
- Full reference: docs/analytics/ANALYTICS.md
- track() helper and deviceContext: src/utils/analytics.js
- Super properties (auto on every event): os, device_type, platform, is_pwa, screen_width, screen_height, app_version
- Mixpanel identity: established in loadTeam() via mixpanel.identify()
- Auth events wired but gated — activate with auth gate in App.jsx
- loginLimiter: 15min window, max 5 — applied to POST /magic-link (v2.2.18)

## Test Suite

Tests live in `frontend/src/tests/`. Run with `npm test` from `frontend/`.

- **Framework**: Vitest (configured in `vite.config.js` under the `test` key)
- **Fixtures**: `src/tests/fixtures/mockRoster.js`, `mockConfig.js`
- **Docs**: `src/tests/README.md`

### Test files

| File | Groups | Tests | Covers |
|------|--------|-------|--------|
| `engine.v2.test.js` | 5 | 11 | V2 lineup engine: position assignment, bench, batting order keys, fallback guard, output shape |
| `accessibility.v1.test.js` | 4 | 19 | POSITION_LABELS shape + engine coverage; FEATURE_FLAGS registry; isFlagEnabled defaults + localStorage overrides |

**Total: 30 tests across 2 files.**

Known failing test: **engine.v2 test 2.3** (7-player roster produces no warning — confirmed bug, fix in separate session).

### Rules
- Any change to `src/utils/lineupEngineV2.js`, `scoringEngine.js`, or `playerMapper.js` must pass `npm test` before commit.
- Any change to `src/config/featureFlags.js` or `src/constants/positions.js` must pass `npm test` before commit.

Known failing test: **2.3** (7-player roster produces no warning — confirmed bug, fix in separate session).

## Key Conventions
- Display **first names only** throughout the UI (enforced, not optional) — coaches use this on the sideline where brevity matters
- `touchDrag` state is a mutable ref (not `useState`) to avoid stale closure issues in touch event handlers
- The `grid` state is a 2D array `[inning][fieldPosition]` mapping to player IDs
- Supabase helpers are in `frontend/src/supabase.js` — use `dbSaveTeamData()` / `dbLoadTeamData()` for all team data persistence

## Roadmap Context
- **Phase 3a**: Supabase Auth — switching from magic link to **phone OTP**; `owner_id` column exists but auth is not yet wired up to the frontend
- **Role-based access** (Coach/Assistant/Viewer): in progress — delete team button is hidden until this ships (see recent commit)
- **Phase 4 cutover**: when auth ships fully, existing `index.js` routes will be consolidated; until then, all new code is additive only
- **Realtime multi-device sync**: planned via Supabase Realtime

## Feature Flags

Feature flags live in `frontend/src/config/featureFlags.js`. Two-level evaluation: global default in the file, per-user localStorage override.

**Guard pattern:**
```js
var on = FEATURE_FLAGS.MY_FLAG || localStorage.getItem("flag:my_flag") === "1";
```

**Enable for one user without a deploy** — send them:
```
https://dugoutlineup.com/?enable_flag=<flag_name>
```
The app sets the localStorage key and redirects cleanly. Use `?disable_flag=<name>` to revert.

**Full guide:** `docs/features/feature-flags.md`

### Current flags

| Flag | Default | localStorage key | Description |
|---|---|---|---|
| `VIEWER_MODE` | `false` | `flag:viewer_mode` | Read-only swipeable inning cards; Share Viewer Link button |
| `USE_NEW_LINEUP_ENGINE` | `true` | *(not overridable)* | V2 scoring engine |

---

## Error Boundaries

All major sections are wrapped with `<ErrorBoundary>` (class component). On crash, they render an inline amber fallback card instead of white-screening. Tapping resets the section; if it crashes again, the card says "try refreshing the page."

**Component:** `src/components/Shared/ErrorBoundary.jsx`

**Sections wrapped:** Game Day (outer), Parent View, Now Batting (NowBattingBar component — real catch), Lock Flow (LockFlow component — real catch), Viewer Mode, Validation Banner, Fairness Check, Offline Status, Team List

**Rule:** New components must be wrapped at the call site in App.jsx, not inside the component definition itself. Do NOT wrap the nav bar, tab bar, or top-level app shell.

**Note on inline sections:** ErrorBoundary only catches errors thrown during the render of child COMPONENTS (`<ComponentName />`). Inline IIFE/render-function calls run as part of the parent's render and are not caught by boundaries placed around them — they are caught by a boundary higher in the tree. The boundaries here provide real protection for named components and are infrastructure for future extraction.

---

## Version History

### v2.2.18 — April 6, 2026
- Fix: MERGE_FIELDS extracted to single shared const (was duplicated at boot hydration and loadTeam hydration)
- Fix: division migration block now saves mergeLocalScheduleFields result instead of raw seed — gameBall/snackDuty/scoreReported no longer overwritten on migration run
- Fix: boot hydration now merges DB + local schedules instead of preferring local blindly — new Supabase games no longer silently dropped
- Feat: loginLimiter (15min window, max 5) created and applied to POST /magic-link — express-rate-limit was imported but never instantiated

### v2.2.17 — April 6, 2026
- Docs: legal content refresh — removed stale phone OTP references, updated auth description to email magic link + Google sign-in, fixed phantom About page email reference, updated all legal doc dates to April 2026

### v2.2.16 — April 5, 2026
- Analytics: full PWA install funnel — pwa_banner_shown (platform, prompt_ready, browser), pwa_install_clicked, pwa_install_accepted, pwa_install_declined, pwa_installed with platform property

### v2.2.15 — April 5, 2026
- Feat: persistent PWA install banner fixed above bottom nav on all tabs — Android shows Install button or Chrome menu instructions; iOS shows Share → Add to Home Screen; no dismiss/snooze; hidden in standalone + game mode
- Fix: overscroll-behavior: none on html + body (index.css) — prevents pull-to-refresh bounce on Android and rubber-band scroll on iOS

### v2.2.14 — April 5, 2026
- UTM tracking framework: trackingUrl.js — outboundLinkProps, CAMPAIGNS, CONTENT registries, pwa/web medium auto-detection
- All 7 LINKS array outbound links migrated to outboundLinkProps (utm_source=dugoutlineup)
- 17-test Vitest suite; vite.config.js include widened to src/**/*.test.js

### v2.2.13 — April 5, 2026
- Fix: TD-04 pre-condition uses /history endpoint, CI wait step uses hardcoded backend URL, migration 002 snapshot trigger applied to Supabase (roster_count=11 confirmed)

### v2.2.12 — April 4, 2026
- Ops: ci.yml backend job — wait-for-Render step added before test suite; 90s sleep + 5-attempt /ping poll (15s intervals) ensures backend is live before integration tests run

### v2.2.11 — April 4, 2026
- Fix: replace .catch() chain on supabaseAdmin.rpc() with nested try/catch block in teamData.js POST handler

### v2.2.10 — April 4, 2026
- Fix: TD-04 CI auth — X-Admin-Key header added to all teamData test fetches; ADMIN_KEY secret wired into ci.yml backend job
- Fix: debug logging removed from suite-team-data.js

### v2.2.9 — April 4, 2026
- Fix: teamData.js POST + GET handlers wrapped in try/catch — Express 4 does not auto-catch async errors
- Fix: global error handler in index.js respects err.status for non-500 errors
- Ops: timing-attack-safe key comparison TODO comment added above isAdminRequest()

### v2.2.8 — April 4, 2026
- Ops: __APP_VERSION__ auto-injected from package.json at build time via vite.config.js define — eliminates VITE_APP_VERSION env var and manual sync

### v2.2.7 — April 4, 2026
- Fix: smoke-test.js Category 3 table name corrected (roster_history → team_data_history; roster_snapshots added)
- Fix: smoke-test.js Category 5 CI guard + AbortController 8s timeout — prevents hang in GitHub Actions
- Fix: analytics.js SSR guard — getDeviceContext() + mixpanel.register() wrapped in typeof window checks

### v2.2.6 — April 4, 2026
- Analytics: device context super properties (os, device_type, platform, is_pwa, screen_width/height, app_version) via mixpanel.register()
- Analytics: PWA install events (pwa_install_prompted, pwa_installed); super property override on install
- Analytics: first launch detection — is_first_launch on app_opened; first_launch event
- Analytics: VITE_APP_VERSION wired as build-time env var
- Docs: docs/analytics/ANALYTICS.md created — full event reference, identity model, dashboard configs

### v2.2.5 — April 4, 2026
- Analytics: 15 new Mixpanel events across Game Mode, QuickSwap, share link, auth funnel, batting hand, game result, app open, identity on team load
- Analytics: Vercel Analytics screen events (app_loaded, game_mode_entered, share_link_viewed, lineup_finalized)
- Analytics: track() extracted to src/utils/analytics.js — shared utility across all instrumented files

### v2.2.4 — April 3, 2026
- Ops: activated Mixpanel analytics — wired VITE_MIXPANEL_TOKEN env var; 14 existing track() call sites now live in production

### v2.2.3 — April 3, 2026
- Feat: personalized home screen greeting uses coach first name from user.profile; falls back to "Coach" for guests/unauthenticated
- Fix: time bands corrected — Good night covers 9pm–5am; Good morning now starts at 5am (was midnight)
- Ops: 22 schedule integrity tests (suite-schedule-integrity.js) — Phase 1 complete; 233 tests total across frontend + backend
- Ops: scripts/smoke-test.js — 5-category post-deploy smoke script (env config, /ping health, Supabase tables, schedule fields, share link); node scripts/smoke-test.js --env=dev|prod
- Ops: CI smoke job added to ci.yml — runs after frontend + backend on main only; requires DEV_BACKEND_URL + DEV_FRONTEND_URL secrets
- Ops: .env.smoke.example added at repo root (safe to commit); .env.smoke already gitignored

### v2.2.2 — April 3, 2026
- Fix: newGame useState initializer + both setNewGame reset calls now include gameBall:"" and scoreReported:false
- Fix: non-active team boot hydration (App.jsx ~1931) wraps Supabase schedule with migrateSchedule + mergeLocalScheduleFields before writing localStorage
- Fix: Mud Hens migration patch (App.jsx ~2090) now preserves snackDuty, gameBall, scoreReported from prior game data

### v2.2.1 — April 3, 2026
- Ops: develop branch created with GitHub branch protection rules
- Ops: Render DEV service + dev.dugoutlineup.com environment planned
- Ops: backend envGuard middleware (backend/src/middleware/envGuard.js) — rejectTestDataInProd blocks TEST_TEAM_IDS in production, warns on real teamId in non-prod
- Ops: ci.yml triggers on both main and develop branches

### v2.2.0 — April 3, 2026
- Chore: test suite cleanup — deleted 7 stale OTP tests (VAL-10/11/12/13, AUTH-06, AUD-04, RATE-02); updated AUD-02/03 skip reasons
- Chore: VAL-07 XSS assertion tightened; RATE-01 split into RATE-01a (403 no membership) + RATE-01b (429 rapid-fire)
- Chore: suite-idempotency.js refactored — upfront seed block + seedFailed guard removes inter-test dependency chain
- Chore: suite-auth-middleware.js added (AUTH-MW-01–08) — all protected endpoints verified to reject without token
- Chore: scoring.test.js Group 1 parameterized — 28 individual tests via forEach table
- Chore: lineupEngineV2-unit.test.js added — 30 tests across Groups A–E (shape, assignment, bench, batting order, edge cases)
- Chore: frontend test total 205 (204 passed / 1 skipped) across 8 files
- Ops: ci.yml — frontend build step added before Vitest; compile errors now block CI
- Ops: /health endpoint upgraded — async DB connectivity check (Supabase teams read); db:ok/error + db_latency_ms; 503 on DB failure
- Ops: health-check.yml — new 6h cron with /health db:ok check, share link smoke (HEALTH_SHARE_KEY secret), /generate-lineup shape check
- Docs: MASTER_DEV_REFERENCE.md — UptimeRobot gap documented; health-check.yml referenced

### v2.1.9 — April 3, 2026
- Fix: admin magic link redirectTo /admin.html
- Fix: Add Result button invisible on game day (gameDate <= today)

### v2.1.8 — April 3, 2026
- Chore: full automated test suite (suite-team-data, suite-feedback, suite-contracts) + GitHub Actions CI + health monitor cron

### v2.1.7 — April 3, 2026
- Fix: admin approve writes email + user_id to team_memberships; members endpoint returns both fields
- Fix: all four admin email notifications look up team name from DB (no hardcoded team name)

### v2.1.6 — April 2, 2026
- Fix: Rules of Hooks violation — renderSharedView extracted into proper SharedView component
- Fix: non-active team card hydration — eager Supabase fetch on boot, skeleton while pending

### v2.1.5 — April 2, 2026
- Supabase-backed runtime feature flags — all flags now toggle from dashboard without a deploy
- Maintenance mode screen + coach bypass (?coach_access=mudhen2026)
- All legacy line-up-generator.vercel.app URLs replaced with dugoutlineup.com
- GAME_MODE global default set to true; flag name normalized to uppercase in Supabase

### v2.1.4 — April 2, 2026
- 154 frontend tests across 7 files — migration, scoring, formatters, flag bootstrap, bench equity
- Extracted migrations.js, formatters.js, flagBootstrap.js from App.jsx; App.jsx imports them
- Husky pre-push hook — tests run before every push; failing tests block the push

### v2.1.3 — April 2, 2026
- Rebrand: all customer-facing surfaces renamed from Lineup Generator to Dugout Lineup — PWA manifest, index.html, login/access screens, legal docs, admin UI, About tab, PDF header, share text, and install banner

### v2.1.2 — April 2, 2026
- Fix: bottom nav fixed to viewport on mobile (position:fixed)
- Fix: bottom nav and Now Batting bar hidden during Game Mode for full-screen clarity

### v2.1.0 — April 1, 2026
- Phase 4B complete: email OTP auth, Resend notifications, auth_events
- Migrations 008-012 applied
- Backend test suite added (scripts/tests/)
- npm test wired to test-runner.js
- New lib files: authEvents.js, email.js
- New routes: approve-link, deny-link (unauthenticated GET)
- Env vars added: RESEND_API_KEY, APP_URL, BACKEND_URL, ADMIN_EMAIL,
  RESEND_TEST_RECIPIENT, RESEND_DOMAIN_VERIFIED
- CLAUDE.md rule: canonical migration directory is backend/src/db/migrations/ only
- TODO: approve-link security hardening in docs/TODO_approve_link_security.md

### v2.0.5 — March 31, 2026
Fix: Complete Roster badge no longer truncated — removed whiteSpace:nowrap, wraps within grid column

### v2.0.4 — March 31, 2026
Fix: home screen team card top row → CSS grid (1fr auto auto); badges fully constrained, can never bleed into Open button

### v2.0.3 — March 31, 2026
Fix: Open button no longer bleeds into status badge (flex-start on top row) · Rename "Game View Mode" → "Game Mode" everywhere

### v2.0.2 — March 31, 2026
Fix: home screen team card — Game Mode button in its own full-width bottom row; no overlap with READY badge on narrow screens

### v2.0.1 — March 31, 2026
Fix: home screen team card — Game Mode button / READY badge overlap resolved; card alignItems flex-start

### v2.0.0 — March 31, 2026
Mobile browser layout fix · App shell uses 100svh in browser mode (vs 100dvh in standalone PWA) · Bottom nav no longer clipped by Edge/Safari mobile address bar · isStandalone detection via matchMedia display-mode

### v1.9.9 — March 31, 2026
Game Mode icons overhaul · Baseball bat (GiBaseballBat) for all batting indicators · Sport-aware fielding icon: glove (GiBaseballGlove) for baseball, 🥎 for softball · Applied across DEFENSE/BATTING tabs, What's Next modal, Game Ball label, and Needs Attention dashboard card · react-icons dependency added

### v1.9.8 — March 31, 2026
MyPlayer View renamed from Parent View · toggle moved to persistent Game Day subtab bar header · always visible across all Game Day subtabs

### v1.9.7 — March 31, 2026
Accessibility Phase 2 (ACCESSIBILITY_V1) · NowBattingStrip 3-tier hierarchy · Now Batting 36px gold dominant · On Deck 22px / In the Hole 17px muted · Aria-live batter announcer · InningModal batting preview upgrade · Position label aria-label expansion

### v1.9.6 — March 30, 2026
Support: FAQ sub-tab — 6 role-based categories (Head Coach, Dugout Parent, DJ Parent, Catcher Parent, Base Coaches, Setup & Sharing), accordion Q&A · Game Mode: dynamic inning transition modal (batting order after defense, field positions after batting) · Game Mode: half-completion gate — both DEFENSE + BATTING must be marked done before Next → unlocks · Fix: graceful exit sheet on Home/logo tap from Team or Game Day (warns if dirty) · Fix: deleted teams no longer restored from Supabase on hydration · Fix: duplicate Demo All-Stars guard

### v1.9.5 — March 30, 2026
Accessibility Phase 1 (ACCESSIBILITY_V1 flag): font floor 12–14px in Game Mode overlays · touch targets ≥44px on advance/pill buttons · contrast uplift (#475569→#e2e8f0 etc.) in InningModal · aria labels on all Game Mode buttons and modal · position abbreviation labels · prefers-reduced-motion CSS global · isFlagEnabled() utility in featureFlags.js

### v1.9.4 — March 30, 2026
UX: Home screen — 'View/Update Lineup' button renamed to 'View Lineup'

### v1.9.3 — March 30, 2026
Create Team form: labels darker + bolder, field text larger and near-black, borders more visible, placeholder shows example team name

### v1.9.2 — March 30, 2026
Game Mode available for any team with roster + schedule (no longer gated on upcoming game date) · Demo All-Stars pre-seeded team loadable from home screen · Create Team form fields use white background for readability

### v1.9.1 — March 30, 2026
Game Mode bench: players stacked in infield box, batting hand badges on bench cards, duplicate strip removed · Now Batting/On Deck/In Hole: batting hand L/R badge inline · Schedule: Snack Note → Game Ball picker (⚾); also on Snacks tab · Snacks tab: Note field removed · Team/Roster: player count bar removed (redundant) · Fix: normalizeBattingHand import on Add Player · Onboarding: Step 4 + 7 updated to Team tab

### v1.9.0 — March 30, 2026
Batting Hand — optional player attribute (L/R/U); normalizeBattingHand util; BattingHandSelector toggle in Add Player + player card; PlayerHandBadge inline badge in roster list, batting order editor, Now Batting/On Deck/In Hole strips; migration 005 backfills existing roster

### v1.8.6 — March 30, 2026
TEAM tab dashboard polish — emoji stat icons (👥 🏆 📅) with dividers; W/L record colors match Schedule tab; Needs attention box replaced with icon cards

### v1.8.5 — March 30, 2026
Home screen: 'View Lineup' → 'View/Update Lineup' · Added 'Game View Mode' CTA (always visible when lineup locked) — launches directly into Game Mode

### v1.8.4 — March 30, 2026
PWA: autoUpdate service worker — new versions apply immediately without user confirmation · skipWaiting + clientsClaim enabled · resolves stale cache issue

### v1.8.3 — March 30, 2026
Support tab: Legal section — Privacy Policy, Terms of Use, Child Safety, Content Standards, Access & Accounts, Report a Problem · No new dependencies (react-markdown not used)

### v1.8.2 — March 30, 2026
Game Mode enabled for all users — feature flag gate removed · ▶ Game Mode button always visible on Game Day tab

### v1.8.1 — March 30, 2026
UX: Team dashboard — removed Add Player, Add Game, Snacks quick-action buttons

### v1.8.0 — March 30, 2026
Nav restructure: Roster + Season tabs merged into TEAM tab · TEAM subtabs: Roster / Schedule / Snacks · Team dashboard header (player count, record, next game) · Status warnings: missing positions, unassigned snacks · Season renamed to Schedule throughout

### v1.7.4 — March 30, 2026
UX: "More" tab renamed to "Support"

### v1.7.3 — March 30, 2026
UX: Defense tab — removed redundant INN OK summary boxes at bottom; ✓ in column headers already covers this

### v1.7.2 — March 30, 2026
Fix: Fairness Check bench rule — flags players benched more than once (was: never benched) · Fix: consecutive rule — consecutive C only, P no longer flagged · Feat: new rule — catcher assigned more than once per game · Component: src/components/GameDay/FairnessCheck.jsx

### v1.7.1 — March 29, 2026
Platform: React Error Boundaries on all major sections — prevents white screen when a section crashes on game day · Component: src/components/Shared/ErrorBoundary.jsx

### v1.7.0 — March 29, 2026
Fix: lineup engine under-roster guard — sub-10 rosters now warn instead of silently leaving positions unassigned · Test: all 11 V2 engine regression tests passing (first clean all-green run) · Ops: /ping + /health endpoints hardened (timestamp, uptime, version) · UX: useBackendHealth hook — cold-start pill on home screen, inline share sheet warning · Docs: docs/ops/UPTIME_MONITORING.md with UptimeRobot setup guide

### v1.6.9 — March 29, 2026
Now Batting inning label above pill strip (syncs with active inning, "INNING —" when none selected) · Fairness Check card post-finalization (bench equity, P/C balance, no back-to-back) with green/amber border · Offline Ready header pill (green/amber/red based on connectivity + local cache state; text hidden in landscape) · Parent View Mode toggle in Game Day (player picker + per-player inning card with color-coded positions)

### v1.6.8 — March 29, 2026
Home screen — "Missing Roster" badge replaced with actionable button: "Add Players →" (0 players) or "Complete Roster (N/10) →" (1–9 players); navigates directly to roster tab · Home screen — empty state with contextual icon + copy + "+ Create Team" CTA when no teams exist or search returns nothing

### v1.6.7 — March 29, 2026
Viewer Mode (feature-flagged OFF) — read-only swipeable inning cards (?s=…&view=true) for parents/players · Feature flag system — featureFlags.js global toggles + localStorage per-user override + URL param bootstrap (?enable_flag / ?disable_flag) · Share as Link + Share Viewer Link both fall back to base64 URL encoding when Supabase unavailable (local dev) · Team season batting totals mini-block (G/AB/H/AVG/R/RBI) in Batting stats box · Suggest Order + 6/7 selector disabled when finalized · Batting order Undo after Suggest Order or ▲▼ arrow · Finalize CTA blocked until batting order saved · Generate Lineup blocked on all surfaces when finalized

### v1.6.6 — March 29, 2026
Now Batting Bar — sticky 3-pill strip (Now Batting / On Deck / In Hole) above bottom nav on Game Day tab; ‹ › nav buttons; index persisted to localStorage · Player Filter Toggle — viewer mode pill list highlights selected player across diamond, table view, and batting order

### v1.6.5 — March 28, 2026
Lineup Finalized experience consistent across all 4 Game Day subtabs · Lineups tab gains ✓ Finalize button · Songs tab (Game Day) hides Edit mode when locked

### v1.6.4 — March 27, 2026
Defense tab accept/ignore warnings (localStorage persistence by game date) · Sub-tab button width standardization · Global content centering (S.body 600px + 480px inner wrapper) · Home cream background fix · Team card 3-zone flex refactor (120px fixed badge, ellipsis truncation) · Hydration merge extended to snackDuty + snackNote · Supabase backfill covers all three merge fields

### v1.6.3 — March 27, 2026
- UX: Defense tab — inning column headers show green ✓ when all 10 field positions + bench are filled for that inning
- UX: Defense tab (By Player view) — position dropdown disables already-taken positions per inning; Bench locks after 1 player assigned

### v1.6.2 — March 27, 2026
- UX: Status badges use 6px CSS colored circles instead of emoji dots
- UX: Team card alert date uses ▸ symbol instead of 📅 emoji
- UX: Per-card Generate Lineup button — removed ⚡ emoji prefix

### v1.6.1 — March 27, 2026
- Fix: scoreReported flag preserved across Supabase hydration — no longer resets on team reopen
- UX: Home screen team card — "Missing Schedule" badge + italic CTA hints for missing roster/schedule
- UX: Home screen — per-team ⚡ Generate Lineup button on every Ready team card with an upcoming game
- Fix: Generate Lineup CTA only shown for Ready teams (both roster + schedule present)

### v1.6.0 — March 27, 2026
- Feat: short share links — 8-char Supabase-backed IDs (?s=xxxxxxxx); mobile share sheet; share_links table with public read + insert RLS
- Feat: Quick Summary enhancements — sortable Player/R/AVG columns; Games (G) column; AVG color coding
- Feat: county score report checkbox per completed game; persisted to schedule state
- Feat: home screen team search bar (appears at 3+ teams; filters by name, age group, sport)
- Feat: create team sport (Baseball/Softball) + age group (5U–12U) dropdowns; form resets on open/cancel/save
- Feat: edit team modal via ··· context menu — update name, sport, age group; saved to localStorage + Supabase
- Feat: backup export includes coachPin; restored on import
- Fix: homeMode resets to 'welcome' on all Home nav paths
- Fix: stale schedule closure no longer overwrites battingPerf on county checkbox toggle
- Fix: app-shell flex column layout replaces position:fixed bottom nav (fixes iOS keyboard push-up + scroll)

### v1.5.1 — March 26, 2026
- Fix: Quick Summary season totals now calculate correctly — was string-concatenating instead of summing (AB/H/R/RBI)
- Fix: parseInt applied to all batting stat accumulations in Quick Summary
- Fix: only completed games (result logged) counted toward season totals

### v1.5.0 — March 27, 2026
- Feat: coach PIN protection — 4-digit PIN gates Finalize and Unlock; set/change/remove from Lineups tab; coach_pin persisted per team to localStorage + Supabase (migration 007_add_coach_pin.sql)
- Feat: locked roster read-only — all player cards collapse when lineup finalized; expand toggle disabled; Add Player and Remove buttons hidden; attribute editing blocked (pointerEvents: none)
- Feat: batting Save Order button — appears only after manual drag reorder; amber unsaved indicator; ✓ Saved confirmation fades 2s; Suggest Order auto-clears dirty state
- Feat: sortable season stats table — Player / R / AVG columns sortable; ↑ ↓ ↕ indicators; 0 AB always bottom on AVG sort
- UX: home screen redesign — compact header with greeting + date; gold Open button; left-strip game alert (red = today, amber = tomorrow); dot-separated metadata; roster hint on empty teams

### v1.4.0 — March 26, 2026
- UX: primary tabs moved to fixed bottom nav bar (portrait) — 4 primary tabs with gold active indicator
- UX: Roster tab — Players and Songs sub-tabs; walk-up song management moved from Game Day → Roster → Songs
- UX: Game Day — Songs sub-tab replaced by Lineups (print/PDF view absorbed into Game Day as sub-tab)
- UX: More tab — Updates sub-tab added; What's New version history moved there; reordered to About / Updates / Links / Feedback
- UX: About tab — coach-friendly description at top; version inline on heading; Open in Browser link; Share App Now CTA
- UX: What's New — previous versions collapsed by default, current version auto-expanded
- UX: Songs tab — Game Day View first and default landing; redundant Edit button removed
- UX: Lineups (Print) — Bench displays as X; position legend added; buttons renamed Download as PDF / Share as Link / Share as PDF; Grid/Diamond toggle in top row
- Fix: onboarding guide updated with correct tab references for new nav structure
- Fix: game day pill shows GAME DAY not TOMORROW (Math.round → Math.floor)

### v1.3.9 — March 26, 2026
- Fix: Open button on Home tab blocked by ··· context menu overlay (zIndex fix)
- Fix: data persistence audit — migrateSchedule spread, snackDuty consolidated onto game objects, importTeamData restores locked state
- UX: nav restructure — 5 primary tabs with nested sub-tabs (Game Day, Season, More)
- Fix: migrateBattingPerf — remaps old initial+lastName batting stat keys to full player names on load
- Fix: roster sorted alphabetically by firstName at render time (Roster tab, Snacks dropdown, Schedule dropdown)

### v1.3.8 — March 26, 2026
- Feat: Snack Duty tab — per-game player assignment with dropdown and note field
- Feat: Today badge + gold border on game day card
- Feat: Past games de-emphasized, canceled games hidden
- Feat: Summary header showing assigned count and next upcoming assignment
- Feat: snackDuty persisted to localStorage, Supabase, export backup, and import restore
- Fix: game time display strips leading zero from hour (7:00 PM not 07:00 PM)

### v1.3.7 — March 26, 2026
- Feat: snack duty field on game — add/edit in schedule form, shown on game card with 🍎
- Feat: walk-up song link field — URL per player, clickable in Game Day View, included in share text and PDF
- Feat: smart time printing — default times (0:00/0:10) suppressed in PDF and Game Day View; asterisk note added when applicable
- Feat: Songs tab opens in Game Day View by default with sync warning banner
- Feat: batting order note in all print views — on-screen print card and generated PDF
- Feat: team context menu (···) on home screen — backup and delete available for any team, not just active
- Feat: restore from backup file available on empty roster screen (no Supabase required)
- Fix: battingPerf migration merge now checks localStorage before Supabase — prevents empty {} overwriting local stats

### v1.3.6 — March 26, 2026
- Feat: walkup songs — per-player field with title, artist, start/end time
- Feat: walkup song display on player card (hidden when empty)
- Feat: walkup song edit form in player profile editor
- Fix: migrateRoster now spreads all existing player fields before normalizing
- Fix: any future player fields are no longer silently dropped on app load, team switch, or Supabase hydration
- Fix: walkup song and all V2 attributes now survive full round-trip through migrateRoster

### v1.3.5 — March 25, 2026
- Fix: diamond view all-innings mode now shows all coach-configured innings (4, 5, or 6)
- Fix: removed Math.min(4) cap that was cutting display to 4 innings regardless of config
- Fix: position box height and SVG viewBox now scale dynamically with inning count

### v1.3.4 — March 25, 2026
- Fix: batting averages no longer show leading zero (.333 not 0.333)
- Fix: zero at-bats now shows --- instead of 0.000 or NaN
- Fix: counting stats (AB, H, R, RBI) always display as integers
- fmtAvg and fmtStat helpers applied across all 6 display locations

### v1.3.3 — March 25, 2026
- Roster protection: migration never overwrites existing roster data
- Auto-snapshot on every roster add, remove, and edit
- Snapshot on Supabase hydration at app load
- Recover UI: restore previous roster link appears when roster is empty
- Up to 5 snapshots shown in recovery modal with timestamp and player count
- Auto-prune: Supabase keeps last 10 snapshots per team

### v1.3.2 — March 25, 2026
- Navigation restructured: two-row portrait nav, explicit ← Home button
- Quick Summary table: AB/H/R/RBI columns
- Add Player form: collapsible
- Supabase hydration race condition fix
- Data-loss guard on all persist helpers during hydration

### v1.3.1 — March 25, 2026
- Fixed V2 lineup engine: LC/RC positions now assign correctly
- Batting order updates automatically after every auto-assign

### v1.3.0 — March 25, 2026
- Player profile UI completely rebuilt with V2 scoring-driven tag system
- New collapsible card sections: Fielding, Batting, Base Running, Effort, Lineup Constraints, Development Focus
- Sub-groups within each section (Reliability, Reaction Timing, Arm Strength, etc.)
- Lineup Constraints card expanded by default with Skip Bench, Out This Game, Preferred Positions, Avoid Positions
- Legacy Skills, Coach Notes, Batting Skills sections removed from player card UI
- V2 lineup engine (`lineupEngineV2.js`) with position-specific scoring
- `scoringEngine.js` — 11 scoring functions: fieldScore, battingScore, runningScore, battingOrderScore, positionScore, benchCandidateScore
- `playerMapper.js` — V1→V2 field mapping with safe defaults
- `featureFlags.js` — `USE_NEW_LINEUP_ENGINE: true` (V2 active)
- `migrateRoster()` updated to preserve all V2 fields across team switches
- Add Player form split into separate First Name + Last Name fields
- `firstName`/`lastName` stored as separate fields on player object
- Last Updated timestamp added to player cards
- `vite.config.js` — added `@/` path alias for `src/`
