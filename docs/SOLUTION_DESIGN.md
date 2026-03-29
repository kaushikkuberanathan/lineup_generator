# Solution Design — Lineup Generator

> Technical architecture, system design, data models, scoring engine, API contracts, and deployment details.
>
> For product overview, user stories, and the vibe coding story — see the **[README](../../README.md)**.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Data Layer](#data-layer)
4. [Database Schema](#database-schema)
5. [Scoring Engine (V2)](#scoring-engine-v2)
6. [Field Layout — Diamond View](#field-layout--diamond-view)
7. [API Design](#api-design)
8. [Auth Architecture (Phase 3)](#auth-architecture-phase-3)
9. [Frontend Architecture](#frontend-architecture)
10. [PWA Setup](#pwa-setup)
11. [Deployment & Infrastructure](#deployment--infrastructure)
12. [Version Management](#version-management)
13. [Known Tradeoffs & Future Considerations](#known-tradeoffs--future-considerations)

---

## System Overview

A two-tier Progressive Web App:

- **Frontend** — React 18 + Vite 5, deployed on Vercel
- **Backend** — Node.js / Express, deployed on Render (free tier)
- **Database** — Supabase (Postgres + JSONB)
- **AI** — Anthropic Claude API (proxied through backend)
- **Offline layer** — localStorage as cache; Supabase as source of truth

---

## Architecture

```
┌───────────────────────────────────────────┐
│              Vercel (CDN)                 │
│           React + Vite PWA                │
│  - Roster + player profile input          │
│  - Auto-assign trigger + override UI      │
│  - Diamond view (SVG)                     │
│  - Schedule + game logging                │
│  - Print / PDF / share link               │
└──────────────────┬────────────────────────┘
                   │ HTTPS
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌───────────────┐   ┌──────────────────────┐
│   Supabase    │   │  Render (Node.js)    │
│  Postgres +   │   │  Express API Server  │
│  JSONB        │   │  /api/ai proxy       │
│  (primary DB) │   │  CORS handler        │
└───────────────┘   └──────────────────────┘
                              ▲
                              │ Ping every 5 min
                   ┌──────────────────────┐
                   │      UptimeRobot     │
                   │  Cold-start mitigation│
                   └──────────────────────┘
```

### Why This Split

- Constraint scoring and AI calls live server-side to keep API keys out of the browser
- Supabase handles persistence and will support auth + realtime in Phase 3 without infrastructure changes
- Render free tier is sufficient for current load; cold-start risk mitigated by UptimeRobot keep-alive

---

## Data Layer

Data flows through three layers simultaneously on every save:

```
User action
    ↓
React state      ← instant, UI never waits on network
    ↓
localStorage     ← instant write, offline fallback cache
    ↓
Supabase         ← async, fire-and-forget, cloud persistence
```

**On app load:**
1. Read from localStorage instantly (app is immediately interactive)
2. Supabase hydrates state in the background (~500ms)
3. Supabase data wins on conflict — it's the source of truth

This means coaches at a field with no signal still have their full lineup and can make changes. Those changes sync when connectivity returns.

---

## Database Schema

```sql
-- Team registry
teams (
  id          uuid PRIMARY KEY,
  name        text,
  age_group   text,
  year        int,
  sport       text,           -- 'baseball' | 'softball'
  owner_id    uuid,           -- reserved for Phase 3 auth
  created_at  timestamptz
)

-- All team data in a single JSONB row per team
team_data (
  team_id       uuid REFERENCES teams(id),
  roster        jsonb,         -- player array with V2 attributes
  schedule      jsonb,         -- games array with results
  practices     jsonb,
  batting_order jsonb,
  grid          jsonb,         -- defensive assignment matrix
  innings       int,           -- 4 | 5 | 6
  locked        boolean,       -- lineup finalized flag
  snack_duty    jsonb          -- deprecated as of v1.4.0; snack data now stored in schedule JSONB (game.snackDuty / game.snackNote per game object)
)
```

**Design rationale:** All team data in one JSONB row mirrors the localStorage key structure exactly, requires no transformation on read/write, and simplifies the sync logic. Schema versioning + auto-migration handles field evolution (V1→V2 player attribute migration as of v1.3.0).

**Schema versioning:** A `schemaVersion` field on `team_data` drives `migrateRoster()`, which remaps V1 fields to V2 equivalents with safe defaults. CF→LC migration (schema v2) is an example — all existing `CF` position references are auto-remapped on load.

```sql
-- Roster safety net (v1.3.3)
roster_snapshots (id, team_id, team_name, roster, player_count,
                  snapshot_at, trigger_event)
-- Auto-pruned to 10 most recent per team via Postgres trigger
-- Views: roster_snapshots_latest
-- trigger_event: 'auto_save' | 'app_load' | 'pre_migration' | 'manual_export'
```

---

## Scoring Engine (V2)

The lineup engine is a **constraint-satisfaction solver** that assigns players to positions across all innings simultaneously.

### Architecture

```
lineupEngineV2.js    ← main engine, position assignment per inning
scoringEngine.js     ← 11 shared scoring functions
playerMapper.js      ← safe V1→V2 field mapping with defaults
featureFlags.js      ← USE_NEW_LINEUP_ENGINE=true (V1 fallback on error)
```

### Player Attributes (V2)

Each player carries structured scoring attributes:

| Category | Attributes |
|---|---|
| **Fielding** | Reliability, Reaction Timing, Arm Strength, Ball Type Fit, Field Awareness |
| **Batting** | Contact, Power, Swing Discipline, Batting Awareness |
| **Running** | Speed |
| **Constraints** | Skip Bench, Out This Game, Preferred Positions, Avoid Positions |

### Scoring Layers (Phase 1 — Bench Selection)

Players beyond the field capacity are benched per inning. Selection priority:

1. Players flagged `benchOnce` can only sit once per game — never benched twice
2. Players who sat last inning must play this inning (hard rule)
3. Among remaining candidates: sorted by bench equity (fewest prior bench innings)

### Scoring Layers (Phase 2 — Field Assignment)

Outfield is filled first (LC → RC → LF → RF) to enforce the hard outfield-repeat block. Then infield, most-constrained-first.

Each position slot is scored with 8 layers:

| Layer | Weight | Type |
|---|---|---|
| Outfield repeat block | −999 | Hard |
| Consecutive infield block | −998 | Hard |
| Position dislike penalty | −50 | Hard-ish |
| Skill badge / V2 attribute weights | Computed | Soft |
| Preferred position bonus | +30 / +24 / +18 / +12 / +8 (by rank) | Soft |
| Coach tag modifiers | Additive | Soft |
| Spread penalty | −10 per prior inning at same position | Soft |
| Bench equity bonus | +4 per prior bench inning | Soft |

The engine runs up to **8 attempts with shuffled roster order**, returns the attempt with the fewest validation violations, and surfaces warnings for any that couldn't be resolved.

### V2 Position Scoring Functions

`scoringEngine.js` provides 11 shared functions consumed by `lineupEngineV2.js`:

- `fieldScore(player, position)` — weighted fielding attribute fit for position
- `battingScore(player)` — batting lineup slot affinity
- `runningScore(player)` — base-running suitability
- `positionScore(player, position)` — composite fit (fielding + constraints)
- `benchCandidateScore(player, priorBenchInnings)` — bench equity + constraints
- `getBallTypeFit(player, position)` — baseball vs softball ball type matching
- `awarenessScore(player, position)` — field/batting awareness composite
- Plus 4 supporting helpers

### 10-Player Field Configuration

8U leagues use 4 outfield positions: **LF, LC, RC, RF** — no CF. The engine enforces exactly 10 fielded players per inning with 1 bench slot for 11-player rosters. This is hardcoded in the position set and validated on every auto-assign run.

---

## Field Layout — Diamond View

The diamond view renders an **SVG field** with:

- Green background, outfield arc, dirt infield ellipse, base diamond, pitcher mound
- All 10 position boxes using dual-zone design: dark header band (per position-group color) + player name area
- **Single-inning mode** (`680×640 viewBox`): large name (14px bold), inning badge pill, bench player pill
- **All-innings mode** (`680×680 viewBox`): compact first names per inning slot, taller 82px boxes

Position colors by group:

| Group | Positions | Color |
|---|---|---|
| Battery | P, C | Red |
| Infield | 1B, 2B, 3B, SS | Green |
| Outfield | LF, LC, RC, RF | Blue / Purple (LC, RC high-contrast) |

First-name-only display is enforced in all views — diamond, grid, print, and share link.

---

## API Design

The backend is a thin proxy. Business logic lives in the frontend scoring engine for now; the backend handles API key security and CORS.

### `POST /api/ai`

Proxies requests to the Anthropic Claude API. Used for:
- Schedule import from photo (base64 image → structured game array)
- Schedule import from text paste → structured game array
- Batting scorecard parsing from photo or text dump

**Request:**
```json
{
  "type": "schedule_import" | "scorecard_parse",
  "content": "<text or base64 image>",
  "context": { "teamName": "Mud Hens", "year": 2026 }
}
```

**Response:** Structured JSON array — game objects or batting stat objects — ready to merge into team state.

### `GET /ping`

Keep-alive endpoint. Returns `{ "status": "ok" }`.
Polled by UptimeRobot every 5 minutes to prevent Render free-tier cold starts.

### `GET /health`

Returns server version and uptime. Used for deploy verification.

```json
{
  "status": "healthy",
  "version": "1.4.0",
  "uptime": 3820
}
```

---

## Auth Architecture (Phase 3)

The auth system is **deployed but not yet gated** — backend infrastructure is live on Render, frontend cutover pending Twilio toll-free verification.

### Strategy

- **Phone OTP via Supabase Auth** — no passwords; coaches receive a one-time SMS code
- Phone numbers stored and validated in **E.164 format** (`libphonenumber-js`)
- **Supabase service role key** lives only in the backend — never sent to the client
- Frontend continues using the anon key for all existing data operations

### Auth Flow

```
Coach visits app
    ↓
POST /api/v1/auth/request-access  ← name + phone → creates access_request row
    ↓
Admin reviews at /admin.html       ← approves or rejects request
    ↓
POST /api/v1/admin/approve         ← creates team_memberships row, activates profile
    ↓
Coach receives SMS OTP
    ↓
POST /api/v1/auth/login            ← sends OTP via Supabase phone auth (rate-limited)
    ↓
POST /api/v1/auth/verify           ← verifies OTP, returns access_token + refresh_token
    ↓
GET  /api/v1/auth/me               ← returns user profile + team memberships
```

### Database Tables (Auth)

```sql
access_requests (
  id          uuid PRIMARY KEY,
  name        text,
  phone       text,           -- E.164 format
  status      text,           -- 'pending' | 'approved' | 'rejected'
  team_id     text,
  created_at  timestamptz
)

profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id),
  name        text,
  phone       text,
  created_at  timestamptz
)

team_memberships (
  id          uuid PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id),
  team_id     text,
  role        text,           -- 'admin' | 'coach' | 'viewer'
  status      text,           -- 'active' | 'invited' | 'suspended'
  created_at  timestamptz
)

feedback (
  id          uuid PRIMARY KEY,
  type        text,           -- 'feedback' | 'bug'
  message     text,
  user_id     uuid,
  created_at  timestamptz
)
```

### Backend Route Inventory

| Method | Path | Auth Required | Purpose |
|--------|------|--------------|---------|
| POST | `/api/v1/auth/request-access` | No | Submit access request |
| POST | `/api/v1/auth/login` | No | Send OTP (rate-limited) |
| POST | `/api/v1/auth/verify` | No | Verify OTP, return tokens |
| GET | `/api/v1/auth/me` | Yes | Current user + memberships |
| GET | `/api/v1/admin/requests` | Admin | List pending access requests |
| POST | `/api/v1/admin/approve` | Admin | Approve request, activate membership |
| POST | `/api/v1/admin/reject` | Admin | Reject access request |
| GET | `/api/v1/admin/members` | Admin | List all team members |
| POST | `/api/v1/admin/update-role` | Admin | Change member role |
| POST | `/api/v1/admin/reset-access` | Admin | Reset member to invited state |
| POST | `/api/v1/admin/suspend` | Admin | Suspend member access |
| GET | `/api/v1/admin/feedback` | Admin | View submitted feedback |
| POST | `/api/v1/feedback` | No | Submit coach feedback |

### Admin UI

`frontend/public/admin.html` — deployed as a static page at `/admin.html` on Vercel.

4-tab admin interface: Pending Requests | Members | Feedback | Settings.

Login via phone OTP. Checks `/me` for `memberships[0].role === 'admin'`.

### Current Blockers

| Blocker | Status |
|---------|--------|
| Twilio toll-free verification | Submitted — 2–3 business day SLA |
| Phase 4 cutover (add `requireAuth` to existing routes) | Pending Twilio + 2–3 coach pilot users |

### Workaround (Dev/Test)

Supabase test OTP: phone `+14044930548`, code `123456` — set in Supabase Auth > Providers > Phone > Test phone numbers. Remove after Twilio verified.

---

## Frontend Architecture

### Stack

| Layer | Technology |
|---|---|
| Framework | React 18 (functional components + hooks) |
| Build | Vite 5 |
| Styling | Inline styles + CSS vars (no Tailwind; single-file constraint) |
| PDF | jsPDF (loaded on demand, not bundled) |
| Analytics | Vercel Analytics + Mixpanel |
| Hosting | Vercel with CI/CD on push to `main` |

### Application Structure

```
frontend/src/
├── App.jsx              ← Main application (~6,600+ lines — file split is P3 backlog)
├── supabase.js          ← DB client + read/write helpers
├── main.jsx             ← React entry point
├── config/
│   └── featureFlags.js  ← USE_NEW_LINEUP_ENGINE toggle
└── utils/
    ├── lineupEngineV2.js
    ├── scoringEngine.js
    └── playerMapper.js
```

### Navigation Structure (v1.4.0+)

4 primary tabs in a fixed bottom nav bar (portrait) / sidebar (landscape):

| Primary Tab | Sub-tabs | Responsibility |
|---|---|---|
| **Roster** | Players / Songs | Player cards with V2 attribute editing, add/remove, constraints; Walk-up song management per player |
| **Game Day** | Defense / Batting / Lineups | Defensive assignment matrix + auto-assign; Batting order (drag) + season stats; PDF export, diamond view, share link |
| **Season** | Schedule / Snacks | Game list, AI import, result logging, batting stat entry; Per-game snack duty assignment |
| **More** | About / Updates / Links / Feedback | App description + info; Version history; External resources; Coach feedback + bug reports |

### State Management

All state lives in `App.jsx` via `useState` / `useReducer`. No external state library — scope doesn't warrant it at this scale. Will revisit if multi-team or realtime sync complexity increases.

### Version Display

`APP_VERSION` constant in `App.jsx` (~line 131) drives the "Current" badge in the About tab. The constant must match a `VERSION_HISTORY` entry to display correctly.

---

## PWA Setup

- **Plugin:** `vite-plugin-pwa` with Workbox
- **Manifest:** `vite.config.js` — app name, icons, theme color, display mode
- **Service worker strategy:** Cache-first for static assets, network-first for API calls
- **Installable:** "Add to Home Screen" prompt on iOS Safari and Android Chrome
- **Offline:** Full app usable after first visit — localStorage layer serves all cached data

---

## Deployment & Infrastructure

### Frontend — Vercel

- Auto-deploys on push to `main`
- Preview deployments on all PRs
- `frontend/vercel.json` handles build config
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Backend — Render (Free Tier)

- Node.js web service, root directory: `backend/`
- Auto-deploys on push to `main`
- Spins down after 15 minutes of inactivity
- Env vars: `ANTHROPIC_API_KEY`
- **Cold-start mitigation:** UptimeRobot pings `/ping` every 5 minutes

**UptimeRobot setup:**
1. Create free account at [uptimerobot.com](https://uptimerobot.com)
2. New monitor → HTTP(S) type
3. URL: `https://lineup-generator-backend.onrender.com/ping`
4. Interval: 5 minutes

### Database — Supabase

- Run schema SQL from `SUPABASE-IMPLEMENTATION.md` in the Supabase SQL Editor
- Anon key used for client access (RLS policies will gate this in Phase 3 auth)

### Deploy Checklist

Every production release requires:

- [ ] Bump `APP_VERSION` in `frontend/src/App.jsx` (~line 131)
- [ ] Prepend new entry to `VERSION_HISTORY` array (~line 133) — include version, date, changes array
- [ ] Bump version in `frontend/package.json`
- [ ] Bump version in `backend/package.json`
- [ ] Add entry to `docs/product/ROADMAP.md`
- [ ] Update `CLAUDE.md` version history section

---

## Feature Flag System

Flags control progressive rollout and safe-to-ship-but-not-activate features. Evaluated at render time using a two-level check.

### File

`frontend/src/config/featureFlags.js` — compiled into the bundle. Changing a value requires a frontend deploy.

### Evaluation

```
FEATURE_FLAGS.<NAME>  (global, compile-time)
  OR
localStorage.getItem("flag:<name>") === "1"  (per-user, runtime)
```

### URL Param Bootstrap

`?enable_flag=<name>` / `?disable_flag=<name>` — app sets the localStorage key on mount and redirects to the clean URL. Enables zero-deploy per-user flag activation via a shared link.

### Upgrade Path

| When | Approach |
|---|---|
| Single tester | `localStorage.setItem("flag:name", "1")` or `?enable_flag=name` link |
| 2–5 coaches | URL param bootstrap link per coach |
| Broader rollout | Supabase `feature_flags` table (query on load, no deploy) |
| Multi-team with targeting | PostHog / Flagsmith / GrowthBook |

Full How-To: `docs/features/feature-flags.md`

---

## Version Management

Versions follow **semver** (`MAJOR.MINOR.PATCH`):

| Bump | When |
|---|---|
| `PATCH` | Bug fixes, copy changes, minor UI tweaks |
| `MINOR` | New features, engine changes, UX improvements |
| `MAJOR` | Breaking API contract or data model changes |

The `VERSION_HISTORY` array in `App.jsx` powers the in-app changelog. The "Current" badge renders only when `APP_VERSION` matches the first entry in the array.

---

## Data Protection

Two mechanisms guard against the roster-wipe class of incidents that occurred twice before:

### 1. Postgres Snapshot Trigger (`team_data_history`)

Every `INSERT` or `UPDATE` on the `team_data` table fires a trigger that writes an append-only row to `team_data_history`. The snapshot captures the full team state (roster, schedule, grid, etc.) as JSONB alongside metadata:

```sql
team_data_history (
  id            bigserial PRIMARY KEY,
  team_id       text,
  snapshot      jsonb,           -- full team_data row as JSONB
  roster_count  int GENERATED,   -- jsonb_array_length(snapshot->'roster')
  written_at    timestamptz,
  write_source  text             -- 'app' | 'migration' | 'manual' | 'seed' | 'unknown'
)
```

The `write_source` value is set via a Postgres session variable (`app.write_source`) so the trigger knows whether a write came from the app, a script, or a manual operation.

Auto-prune keeps the last 20 snapshots per team (`prune_team_data_history()` — run weekly or on demand).

Migration file: `backend/migrations/002_team_data_history.sql`

### 2. Roster-Wipe Guard (Backend API)

The `POST /api/teams/:teamId/data` endpoint enforces a guard before any write:

- If current DB roster has ≥ 1 player AND incoming roster is empty → returns `409 ROSTER_WIPE_GUARD`
- Pass `force: true` in the body to bypass (explicit override, logged)
- All guard triggers are logged to console with timestamp and team_id

Used by scripts and manual data operations. Frontend writes go direct-to-Supabase via anon key (and are covered by the Postgres trigger on the database side).

### 3. Recovery Endpoint

```
GET /api/teams/:teamId/history?limit=5
GET /api/teams/:teamId/history?limit=5&full=true   ← includes full snapshot JSONB
```

Restricted to localhost or `X-Admin-Key` header (env: `ADMIN_KEY`).

Returns `{ snapshots: [{ id, roster_count, written_at, write_source }] }` — or full snapshot when `?full=true`.

Full recovery workflow: `backend/migrations/README.md`

---

## Known Tradeoffs & Future Considerations

| Decision | Current Rationale | When to Revisit |
|---|---|---|
| All logic in `App.jsx` (~6,600 lines) | Single-file build simplified early iteration | Before Phase 3 auth ships — file split is P3 backlog, will reduce feature velocity by ~40% if not done first |
| No auth in MVP | Single-coach, single-device scope; share link is read-only | Phase 3 — Supabase OTP (Twilio toll-free verification pending) |
| Render free tier | Zero cost for personal tool | Upgrade if cold-start latency becomes user-facing despite UptimeRobot |
| JSONB for all team data | Mirrors localStorage, zero transformation overhead | Normalize if query patterns require filtering inside game/player arrays |
| Backtracking solver in frontend | Fast enough at 11-player / 6-inning scale | Move server-side if multi-game batch generation or 20+ player rosters are added |
| No TypeScript | Moved fast in MVP phase | Increasing tech debt — migration is a Phase 4 quality item |
| No CI/CD pipeline | Manual deploy checklist covers it today | GitHub Actions CI is next sprint — block Vercel auto-deploy on failing engine tests |
| Roster snapshots (last 10 per team) | Recovery net for migration wipes and accidental deletes | Scale snapshot retention if teams request longer history |
