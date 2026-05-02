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
8. [Auth Architecture (Phase 2)](#auth-architecture-phase-2)
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
  "version": "2.2.38",
  "uptime": 3820,
  "db": "ok",
  "db_latency_ms": 12
}
```

---

## Auth Architecture (Phase 2)

The auth system is **deployed but not yet gated** — backend infrastructure is live on Render, frontend cutover pending.

### Strategy

- **Supabase email magic link + Google OAuth** — no passwords, no SMS
- Twilio / phone OTP permanently removed — no phone or SMS dependency anywhere in the stack
- **Supabase service role key** lives only in the backend — never sent to the client
- Frontend continues using the anon key for all existing data operations

### Auth Flow

```
Coach visits app
    ↓
POST /api/v1/auth/request-access  ← name + email → creates access_request row
    ↓
Admin reviews at /admin.html       ← approves or rejects request
    ↓
POST /api/v1/admin/approve         ← creates team_memberships row, activates profile
    ↓
Coach signs in:
  ┌─────────────────────────────────────────────┐
  │  Option A: Email magic link                  │
  │  POST /api/v1/auth/request-magic-link        │
  │  → Supabase sends magic link email           │
  │  → Coach clicks link                         │
  │  → GET /api/v1/auth/callback                 │
  └─────────────────────────────────────────────┘
  ┌─────────────────────────────────────────────┐
  │  Option B: Google OAuth                      │
  │  → Supabase OAuth redirect → Google          │
  │  → Callback with access_token                │
  │  → GET /api/v1/auth/callback                 │
  └─────────────────────────────────────────────┘
    ↓
GET  /api/v1/auth/me               ← returns user profile + team memberships
```

### Database Tables (Auth)

```sql
access_requests (
  id          uuid PRIMARY KEY,
  name        text,
  email       text,           -- used for magic link delivery
  status      text,           -- 'pending' | 'approved' | 'rejected'
  team_id     text,
  created_at  timestamptz
)

profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id),
  first_name  text,
  last_name   text,
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
| POST | `/api/v1/auth/request-access` | No | Submit access request (email) |
| POST | `/api/v1/auth/request-magic-link` | No | Send magic link email (rate-limited) |
| GET | `/api/v1/auth/callback` | No | Handle Supabase auth callback |
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

Six-tab admin interface: Pending Requests | Members | Feedback | Teams | Settings | Audit.

Login via Google OAuth or email magic link. Checks `/me` for `memberships[0].role === 'admin'`.

### RLS Policy Map (Phase 4 target state)

All frontend data calls use the anon Supabase key. Until Phase 4 cutover, RLS on
team data tables is permissive (or disabled) to allow unauthenticated writes. After
cutover, `004_rls_fixes.sql` applies the following policy set:

| Table | anon SELECT | anon INSERT | auth SELECT | auth INSERT/UPDATE | Notes |
|-------|-------------|-------------|-------------|---------------------|-------|
| `share_links` | ✓ (all rows) | ✗ | ✓ | ✓ | Token entropy (~4.3B) is enumeration guard |
| `teams` | ✗ | ✗ | ✓ own team | ✓ | Gated via team_memberships join |
| `team_data` | ✗ | ✗ | ✓ own team | ✓ coach/admin only | Highest-risk table — direct frontend writes |
| `roster_snapshots` | ✗ | ✗ | ✓ own team | ✓ coach/admin only | Snapshot safety net |
| `team_data_history` | ✗ | ✗ | ✗ | ✗ | service_role + trigger only; no REST access |
| Auth tables | ✗ | anon INSERT (request-access) | ✓ own row | via backend only | RLS from migrations 001/003 |

**Key architectural insight for viewer mode:** Share links store the full lineup payload
inline in `share_links.payload`. Viewer mode reads `share_links` by id — it never reads
`team_data` directly. This means anon SELECT on `team_data` can be fully blocked post-Phase 4
without breaking the viewer experience.

**Backend bypasses RLS entirely:** All routes in `src/routes/` use `supabaseAdmin`
(service role key). Service role bypasses RLS. Application-level auth is enforced by
`requireAuth` and `requireAdmin` middleware — RLS is defence-in-depth, not the
primary gate for backend routes.

Migration file: `backend/migrations/004_rls_fixes.sql`
Pre-cutover checklist: `docs/ops/PHASE4_PRECHECK.md`

### Current Blockers

| Blocker | Status |
|---------|--------|
| Phase 2 auth cutover (add `requireAuth` to existing routes) | Pending 2–3 coach pilot users |

### Workaround (Prod — Pre-Cutover)

Auth gate is currently bypassed in production (v2.2.22 hotfix) pending Phase 2 cutover. Editing works unauthenticated for now using the `_effectiveUserId` shim in `useLiveScoring.js` and `ScoringMode/index.jsx`. These shims are marked `AUTH TESTING SHIM` and must be removed at cutover — see removal checklist in `CLAUDE.md`.

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
├── App.jsx              ← Main application (~9,834 lines — file split is P3 backlog)
├── supabase.js          ← DB client + read/write helpers
├── main.jsx             ← React entry point
├── config/
│   └── featureFlags.js  ← Feature flag registry + evaluation
├── content/
│   └── faqs.js          ← FAQ content (categories + items)
├── utils/
│   ├── lineupEngineV2.js
│   ├── scoringEngine.js
│   ├── playerMapper.js
│   ├── analytics.js
│   ├── trackingUrl.js
│   ├── migrations.js
│   ├── formatters.js
│   ├── deviceContext.js
│   ├── flagBootstrap.js
│   └── leagueRules.js
└── components/
    ├── Auth/
    ├── GameDay/
    ├── ScoringMode/
    ├── game-mode/
    ├── Shared/
    ├── Support/
    └── Viewer/
```

### Navigation Structure (v2.2.24+)

5 primary tabs in a fixed bottom nav bar (portrait) / sidebar (landscape):

| Primary Tab | Sub-tabs | Responsibility |
|---|---|---|
| **My Team** | Players / Songs | Player cards with V2 attribute editing, add/remove, constraints; Walk-up song management per player |
| **Game Day** | Lineups / Songs / Game Mode | Lineups as default (v2.2.24 restructure); Songs sub-tab filtered to tonight's active batting order; Full-screen Game Mode dugout view |
| **Season** | Schedule / Snacks | Game list, AI import, result logging, batting stat entry; Per-game snack duty assignment |
| **Scoring** | — | Live scoring tab (pilot teams: Mud Hens, Demo All-Stars); Claim Scorer Role, inning-by-inning run entry |
| **More** | About / Updates / Links / Feedback / Support | App description + info; Version history; External resources; Coach feedback + bug reports; FAQ |

### State Management

All state lives in `App.jsx` via `useState` / `useReducer`. No external state library — scope doesn't warrant it at this scale. Will revisit if multi-team or realtime sync complexity increases.

### Version Display

`APP_VERSION` constant in `App.jsx` (~line 131) drives the "Current" badge in the About tab. The constant must match a `VERSION_HISTORY` entry to display correctly.

### Walk-up Songs Architecture

Per-player song data (title, artist, url, startTime) is stored in the player object inside the roster JSONB. The Play button navigates via `window.location` to the stored URL.

Native app deep-link behavior is OS-mediated — there is no client-side detection of which apps are installed:

- **Spotify:** The Spotify app intercepts `open.spotify.com` links when installed and signed in on both iOS and Android. On Android, the user may need to set Spotify as the default handler for Spotify links (Settings → Apps → Spotify → Open by default).
- **Apple Music:** Same behavior — the Music app intercepts `music.apple.com` links when installed.
- **YouTube:** Same behavior — the YouTube app intercepts `youtube.com` links when installed.
- **Browser fallback:** Any URL scheme not handled by an installed app opens in the mobile browser, where web players are available for Spotify, Apple Music, and YouTube.

The Songs sub-tab in Game Day → Batting filters to tonight's active batting order only — players marked Out Tonight are excluded.

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

### Database Schema (`feature_flags` table)

```sql
feature_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name   text NOT NULL,
  enabled     boolean NOT NULL DEFAULT false,
  team_id     text,                    -- NULL = global flag; non-null = team-scoped override
  description text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(flag_name, team_id)
);
-- RLS: anon role has SELECT only; no public INSERT/UPDATE/DELETE
-- Team-scoped flag (team_id NOT NULL) overrides global (team_id IS NULL) for that team
```

Evaluation priority: compile-time default → localStorage per-user override → Supabase table per-team override (highest).

---

### COMBINED_GAMEMODE_AND_SCORING — mutual-exclusion gating pattern

Introduced in v2.5.4 (Slice 0). The combined Game View feature replaces the legacy multi-tab scoring UX with a single DugoutView surface. During the rollout window (Slices 0–3), both surfaces coexist in the codebase. To prevent dual-surface user confusion, the COMBINED_GAMEMODE_AND_SCORING flag enforces strict mutual exclusion at three sites in App.jsx.

**Three invariants — must hold at all times, future slices must not break:**

1. **Flag OFF → ScoringMode + Scoring tab** are reachable; **DugoutView via the GameDay pill is NOT reachable**. This is the legacy path. Production users land here today.
2. **Flag ON → DugoutView + DUGOUT VIEW pill** are reachable; **ScoringMode + Scoring tab are NOT reachable**. This is the future path.
3. The two states are mutually exclusive — at no flag combination should both surfaces be simultaneously reachable. Both reachable would mean two scoring sessions could be claimed for the same game from different entry points, with attendant double-write and double-subscribe risks.

**Three enforcement sites in App.jsx:**

| Site | Code shape | Behavior |
|---|---|---|
| PRIMARY_TABS array | `liveScoringEnabled && !combinedGamemodeAndScoringEnabled ? { key:"scoring", ... } : null` | Hides Scoring bottom-nav tab when flag ON |
| GAMEDAY_SUBTABS array | `combinedGamemodeAndScoringEnabled ? { key:"dugout", label:"DUGOUT VIEW", launcher:true } : null` | Hides DUGOUT VIEW pill when flag OFF |
| ScoringMode render branch | `{primaryTab === "scoring" && liveScoringEnabled && !combinedGamemodeAndScoringEnabled ? <ScoringMode ... /> : null}` | Blocks ScoringMode mount when flag ON, even if user navigated via stale URL or refresh |

**Flag mechanics:**

COMBINED_GAMEMODE_AND_SCORING is a static FEATURE_FLAGS object value plus localStorage override (`flag:combined_gamemode_and_scoring=1`). It is NOT Supabase-backed (unlike `live_scoring`). This means flipping it in production requires a redeploy. See Story 30 (P2 backlog) for the runtime-flip limitation and Story 41 (P1 backlog) for the local-test-gate constraint that affects flag deployment validation.

**Slice rollout context:**

- Slice 0 (v2.5.4) — DugoutView lift, flag default-OFF, prod unchanged
- Slice 1 (planned) — Scoreboard wiring inside DugoutView
- Slice 2 (planned) — Lineup wiring inside DugoutView
- Slice 3 (planned) — Scoring controls integration
- Post-Slice 3 — flag flips ON, ScoringMode deleted from repo

Until ScoringMode is deleted, all three invariants must be preserved. Any change touching PRIMARY_TABS, GAMEDAY_SUBTABS, or the ScoringMode render branch must be evaluated against the invariants above.

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

## Live Scoring Framework

In-game scoring with real-time sync across devices. Designed specifically for 8U youth baseball — focused on what a coach needs to track during a game, not full MLB-style pitch-by-pitch analytics.

### Tier 1 — Shipped

Current production state at v2.3.3. Enabled for Mud Hens and Demo All-Stars by team name; full rollout gates on `LIVE_SCORING` feature flag.

**Game-level state**
- Score (home runs, opponent runs)
- Current inning (1-6 for 8U)
- Half-inning (top/bottom) via `halfInning` field; `myTeamHalf` toggle determines which half is our at-bat

**Half-inning state**
- `runsThisHalf` / `oppRunsThisHalf`
- `outs` (0-2; at 3, auto-flip)
- Mercy rule banner when `runsThisHalf >= 5` (5-run cap per half)

**Our team at-bat state**
- `currentBatter` (player object with id, name, orderPosition)
- `battingOrderIndex` (position in batting order)
- `runners` array (each: `runnerId` (player name), `base` 1-3)
- Pitch counters: `balls`, `strikes`, `pitchesThisAtBat`

**Opponent at-bat state (v2.3.2)**
- `oppCurrentBatterNumber` (1-11, wraps via modulo)
- `opp_balls`, `opp_strikes` (pitch counters)
- `opp_current_batter_pitches` (per-batter for 5-and-out rule)
- `opp_inning_pitches`, `opp_game_pitches` (rollup counters)
- No individual opponent runner tracking — coach records +1 OPP for runs, Out for outs

**Per-pitch tracking (both halves)**
- Ball / Strike / Foul buttons
- Contact button (our half only; triggers outcome sheet)
- Out button
- Foul counts as pitch but not as strike

**Half-inning flip triggers**
- 3 outs auto-flip (four code sites converge on this — Story 20 in backlog to extract to single `flipHalfInning(gs, cause)` helper)
- Manual flip via gear menu Hand off

**Scorer lock model**
- Single-scorer-per-game; `claimScorerLock` with heartbeat
- Other devices see read-only "Someone else is scoring" view
- Lock expires automatically after heartbeat gap
- Audit trail: every action written to `scoring_audit_log`

**Practice mode (v2.3.3)**
- `isPractice` flag branches all write paths
- Zero Supabase writes: `persist()`, `audit()`, heartbeat, Realtime subscription all skipped
- Full UI works (runs, outs, runners, flips) but local-only
- Use case: pre-game walkthrough, assistant coach training, scenario testing

**Realtime race guard (v2.3.3)**
- `lastAppliedAtRef` tracks the most recent `updated_at` we've persisted or applied from Realtime
- Handler rejects events where `row.updated_at <= ref`
- Resolves v2.3.2 regression where stale echoes could re-populate runners after a half-flip

**Runner identity (architectural convention)**
- Player name is the primary key throughout scoring state (roster entries have no `.id` field in pre-auth app)
- Pattern: `player ? (player.id || name) : name` everywhere
- See `CLAUDE.md` "Roster identity" section for full rationale

**Real-time cross-device sync**
- Supabase Realtime subscription on `live_game_state` `postgres_changes` events
- Restore modal rolls back to last saved snapshot if state corrupts

**Schema (Supabase table `live_game_state`)**
- Primary keys: `game_id`, `team_id`
- 21 columns total including 6 `opp_*` columns added in v2.3.2
- Write path: upsert with `updated_at` timestamp
- Read path: select on `game_id + team_id`

**Test coverage (v2.3.3)**
- `liveStateMerge.test.js` — field merge contract
- `runnerPlacement.test.js` (8 tests) — runner placement, run scoring, runner-out, half-flip, diamond rendering
- `practiceModeIsolation.test.js` (7 tests) — zero Supabase writes guarantee
- `realtimeRaceGuard.test.js` (3 tests) — stale/fresh/echo event handling
- `finalizeSchedule.test.js`, `undoHalfInning.test.js`, `newGameTemplate.test.js` — supporting coverage

### Tier 2 — Backlog (Feature-Flagged or Future)

- **At-Bat Outcome Tracking:** per-plate-appearance outcomes (H, BB, K, etc.) and cross-game stat aggregation (batting AVG, OBP). Gates on a future `AT_BAT_TRACKING` feature flag.
- **Opponent runners on bases (Story 19):** diamond parity with home team during opponent half.
- **`flipHalfInning(gs, cause)` helper extraction (Story 20):** consolidate 4 flip sites to prevent state drift.
- **"No pitches yet" stale copy (Story 21):** minor UX when pitches exist mid-at-bat.
- **Per-pitch undo:** currently only half-inning-level `undoHalfInning` exists.

### Design Rationale

The three-tier taxonomy separates what coaches must have at launch (Tier 1: outcome-level scoring with runs, outs, batter tracking) from what's a nice addition later (Tier 2: per-pitch stats, advanced aggregation). v2.3.x consolidated most of the per-pitch tracking into Tier 1 because it proved useful enough during early testing to warrant shipping to all users rather than gating behind feature flags. At-bat outcome classification (single/double/triple vs. just "hit") remains Tier 2 because 8U coaches have not needed it during real games.

### Non-Goals

- **Per-pitch at-bat outcomes:** we track per-pitch COUNTS (B/S/F tally) but not per-pitch OUTCOMES (type of hit, where it landed). At-bat outcomes are recorded at the at-bat level only, not pitch level.
- **Advanced statistical splits:** BABIP, exit velocity, launch angle, spin rate. Not relevant for youth rec coaching.
- **Real-time opponent scouting or external score reporting:** score reporting is manual via the Schedule tab post-game.
- **Full box score reconstruction:** post-game, coach fills key plays via Schedule tab, not the scoring app.

---

## CI/CD Pipeline

### Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production. Auto-deploys to Vercel (frontend) and Render (backend). Branch-protected. |
| `develop` | Integration branch. Merges to `main` per release. |
| `feature/*` | Feature work. PR to `develop`. |
| `fix/*` | Bug fixes. PR to `develop` or `main`. |
| `hotfix/*` | Emergency prod fix. PR direct to `main` with `[hotfix-exception]` in commit message. |

### GitHub Actions

| Workflow | Trigger | Jobs |
|---|---|---|
| `ci.yml` | Push to `develop`, PR to `main` | Frontend build, Vitest suite (306 pass / 1 skip target), ESLint |
| `health.yml` | Daily cron (03:00 UTC) | HTTP GET to `/health`, validate `status: "healthy"` and `db: "ok"` |

### Pre-push Hook (Husky)

`.husky/pre-push` runs `cd frontend && npm test` on every `git push`. Blocks push if tests fail.  
Pool: `forks`, global environment: `jsdom` (eliminates per-file worker spawn that caused Windows timeouts in the threads pool — fixed v2.2.36).

### Smoke Test (`scripts/smoke-test.js`)

Validates reachability and schema health:
- `/health` returns HTTP 200 with `db: "ok"`
- `/ping` returns HTTP 200
- Supabase `team_data` and `teams` tables are reachable
- Key schema columns present in both tables

### Dev Environment

- Frontend: `dev.dugoutlineup.com` → Vercel preview deploy
- Backend: `lineup-generator-backend-dev.onrender.com` (Render free tier)
- Wait-for-Render race fix: 90s sleep + `/ping` polling before smoke tests run (added v2.2.12 — Render free-tier cold-start takes up to 60s)

### Deployment Gate

1. `npm test` must pass (Vitest, all 306+)
2. `npm run build` must complete clean (no errors)
3. Ship Gate four-question checklist answered (CLAUDE.md § Ship Gate)
4. Explicit push phrase: "confirmed — push to main"

---

## Analytics Architecture

### Identity Model

- `mixpanel.identify(teamId)` called on every `loadTeam()` invocation
- Before identify: events tracked anonymously (install, first launch)
- After identify: all events associate to the numeric Supabase team ID
- No PII in Mixpanel — team ID is a numeric ID, not a coach name or email

### Super Properties (Auto-Injected on Every Event)

| Property | Source |
|---|---|
| `os` | `window.navigator.userAgent` parsing |
| `device_type` | `mobile` / `tablet` / `desktop` |
| `platform` | `pwa` / `browser` |
| `is_pwa` | `window.matchMedia("(display-mode: standalone)")` |
| `screen_width` / `screen_height` | `window.screen` |
| `app_version` | `__APP_VERSION__` — injected at build time via `vite.config.js` define; no manual env var sync needed |

### Event Naming Convention

Present-tense past-event naming: `lineup_generated`, `share_link_opened`, `game_mode_opened`, `player_marked_out`, `song_play_tapped`. Properties always include `team_id` and relevant entity context.

### SSR / Offline Guards

`analytics.js` wraps all `mixpanel.track()` calls with `typeof window !== "undefined"` guards. This prevents crashes in SSR-like environments and in the PWA service worker context (which runs in a headless worker without `window`).

### Full Event Inventory

See `docs/analytics/ANALYTICS.md` for the complete list of 32+ Mixpanel events and 4 Vercel Analytics events, including full property schemas per event and the UTM campaign registry.

---

## Known Tradeoffs & Future Considerations

| Decision | Current Rationale | When to Revisit |
|---|---|---|
| All logic in `App.jsx` (~9,834 lines) | Single-file build simplified early iteration | Before Phase 3 auth ships — file split is P3 backlog, will reduce feature velocity by ~40% if not done first |
| No auth in MVP | Single-coach, single-device scope; share link is read-only | Phase 2 auth cutover — Supabase email magic-link + Google OAuth, pending 2–3 pilot users |
| Render free tier | Zero cost for personal tool | Upgrade if cold-start latency becomes user-facing despite UptimeRobot |
| JSONB for all team data | Mirrors localStorage, zero transformation overhead | Normalize if query patterns require filtering inside game/player arrays |
| Backtracking solver in frontend | Fast enough at 11-player / 6-inning scale | Move server-side if multi-game batch generation or 20+ player rosters are added |
| No TypeScript | Moved fast in MVP phase | Increasing tech debt — migration is a Phase 4 quality item |
| GitHub Actions CI on develop + Husky pre-push | Full Vitest suite runs before every push; health check cron daily | Add branch protection requiring CI green before main merge |
| Roster snapshots (last 10 per team) | Recovery net for migration wipes and accidental deletes | Scale snapshot retention if teams request longer history |
