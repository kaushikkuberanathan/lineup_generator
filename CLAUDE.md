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
npm run dev        # Dev server at http://localhost:5173
npm run build      # Production build to dist/
npm run lint       # ESLint with --max-warnings 0 (strict)
npm test           # Run lineup engine unit tests (engine.test.js)
```

### Backend (`backend/`)
```bash
node index.js      # Start Express server (default port 3001)
```

## Architecture

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
- RLS policies on all auth tables
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

#### BLOCKED: Twilio Toll-Free Verification
- Twilio toll-free number cannot send SMS until verified
- Verification submitted, takes 2-3 business days
- Error seen: "Toll-Free Number Has Not Been Verified"
- Once verified: real OTP SMS will work end to end
- Workaround for now: Supabase test OTP (phone: +14044930548, code: 123456) — set in Supabase Auth > Providers > Phone > Test phone numbers
- TODO: Once Twilio verified, remove test OTP entry from Supabase

#### BLOCKED: Admin UI Login (depends on Twilio)
- admin.html is built and deployed at /admin.html on frontend
- Login flow works mechanically but OTP never arrives due to Twilio toll-free block
- Once Twilio verified, log in at https://line-up-generator.vercel.app/admin.html
- Admin check: reads /me, looks for memberships[0].role === 'admin'
- Known issue: /me returns memberships:[] intermittently — suspect token expiry mid-session, needs monitoring once Twilio unblocked

#### TODO: Phase 4 Cutover (do after 2-3 coaches have tested successfully)
- Add requireAuth middleware to existing routes in index.js
- Deploy to Render
- Announce to coaches: "next login will ask you to verify your phone"
- Pre-cutover checklist is documented in CLAUDE.md implementation guide

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
- Admin UI URL (production): https://line-up-generator.vercel.app/admin.html
- Backend URL: https://lineup-generator-backend.onrender.com

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

## Version History

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
