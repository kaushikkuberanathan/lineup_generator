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

## Auth Architecture

> **Rewritten 2026-08-04 (Doc Audit Spike Story 5).** This section previously
> described auth as "deployed but not yet gated," with the gate "bypassed in
> production pending Phase 2 cutover." That was true once; it has not been true
> since **v2.6.0 (2026-07-20)**. The auth gate is live in prod: **editing requires
> a session; viewing and share links never do.** Two further releases shipped on
> top of the cutover before this rewrite: Google Sign-In + an Account tab
> (v2.7.0), and self-serve profile names via `PATCH /me` (v2.8.0). None of that
> was reflected here until now.

### Strategy

- **Supabase email magic link + Google OAuth** — no passwords, no SMS. Both are
  live sign-in options today, not a planned Option A/B.
- Twilio / phone OTP permanently removed — no phone or SMS dependency anywhere in the stack
- **Supabase service role key** lives only in the backend — never sent to the client
- Frontend uses the anon key for reads/writes; once a coach is signed in, the
  same shared Supabase client (`frontend/src/supabase.js`) attaches the session
  JWT to every subsequent `.from()` call automatically — so writes go through as
  `authenticated`, not `anon`, for any logged-in coach. `useAuth.js` establishes
  the session via `supabase.auth.getSession()` / `onAuthStateChange()`.

### Auth Flow (live)

```
Coach visits app
    ↓
App renders LoginScreen (viewing/share-links skip this entirely - never gated)
    ↓
Coach signs in:
  ┌─────────────────────────────────────────────┐
  │  Option A: Email magic link                  │
  │  POST /api/v1/auth/magic-link (rate-limited) │
  │  → Supabase sends magic link email           │
  │  → Coach clicks link → session established   │
  └─────────────────────────────────────────────┘
  ┌─────────────────────────────────────────────┐
  │  Option B: Google OAuth                      │
  │  → Supabase OAuth redirect → Google          │
  │  → Session established on return             │
  └─────────────────────────────────────────────┘
    ↓
Session established → does this user have an active team_memberships row?
    │
    ├── YES → Home screen, their team(s) visible, can edit
    │
    └── NO  → NoMembershipScreen
                  ↓
              Coach taps "Request Access" → RequestAccessScreen
                  ↓
              POST /api/v1/auth/request-access → creates access_requests row
                  ↓
              PendingApprovalScreen shown until reviewed
                  ↓
              platform_admin reviews at /admin.html (icoachyouthball@gmail.com)
              → GET /api/v1/admin/approve-link (1-tap email link) or the
                admin.html dashboard → POST /api/v1/approve
                  ↓
              team_memberships row activated (or created, for a brand-new team -
              team provisioning is still admin-side, per the Phase 4 MVP model)
                  ↓
              Coach signs in again → Home screen, team visible
```

Once signed in, `GET /api/v1/auth/me` returns the profile + memberships shape;
`PATCH /api/v1/auth/me` (v2.8.0) lets a coach set their display name; `POST
/api/v1/auth/logout` ends the session.

### Database Tables (Auth)

```sql
access_requests (
  id              uuid PRIMARY KEY,
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  email           text,
  phone_e164      text,          -- contact_required CHECK: email OR phone_e164
  status          text NOT NULL, -- 'pending' | 'approved' | 'denied' | 'ignored'
  team_id         text,
  requested_role  text,          -- 7 allowed values, same set as team_memberships.role
  reviewed_at     timestamptz,
  reviewed_by     uuid REFERENCES auth.users(id),
  requested_at    timestamptz NOT NULL DEFAULT now()
  -- + device/platform/app_version telemetry columns, see docs/db/schema.sql
)

profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id),
  first_name  text NOT NULL,
  last_name   text NOT NULL,
  email       text,
  phone_e164  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
)

team_memberships (
  id           uuid PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id),
  team_id      text NOT NULL,
  role         text NOT NULL,   -- 7 values live: admin/viewer/team_admin/coordinator/coach/scorekeeper/parent
                                 -- normalizeRole() targets 4 (admin/coach/scorekeeper/viewer) at the code layer -
                                 -- see docs/product/AUTH_SECURITY_AUDIT_ROADMAP.md § THE ROLE MODEL
  status       text NOT NULL,   -- 'invited' | 'active' | 'suspended'
  invited_at   timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz
)

feedback (
  id           uuid PRIMARY KEY,
  type         text NOT NULL,   -- 'feedback' | 'bug'
  body         text NOT NULL,
  coach_id     uuid REFERENCES auth.users(id),
  category     text, location text, severity text, app_version text,
  submitted_at timestamptz NOT NULL DEFAULT now()
)
```

### Backend Route Inventory

> Regenerated 2026-08-04 directly from `backend/src/routes/*.js` — the previous
> table was hand-transcribed and had drifted on both path names and completeness.
> See `backend/CLAUDE.md` § Routes for the canonical, maintained version of this
> table (including the admin.js mount-path gotcha below); this copy should be
> treated as a snapshot of it, not a second source of truth.

| Method | Path | Auth Required | Purpose |
|--------|------|--------------|---------|
| POST | `/api/v1/auth/request-access` | No | Submit access request |
| POST | `/api/v1/auth/magic-link` | No (rate-limited) | Send magic link email — replaces the old two-step OTP flow |
| GET | `/api/v1/auth/me` | Yes | Current user profile + memberships |
| PATCH | `/api/v1/auth/me` | Yes | Set display name (v2.8.0) |
| POST | `/api/v1/auth/logout` | Yes | End session |
| GET | `/api/v1/admin/approve-link` | No (public, 1-tap email link) | Approve an access request from the admin's inbox |
| GET | `/api/v1/admin/deny-link` | No (public, 1-tap email link) | Deny an access request from the admin's inbox |
| GET | `/api/v1/requests` | Admin | List pending access requests |
| POST | `/api/v1/approve` | Admin | Approve request, activate/create membership |
| POST | `/api/v1/reject` | Admin | Reject access request |
| GET | `/api/v1/members` | Admin | List all team members |
| POST | `/api/v1/update-role` | Admin | Change member role |
| POST | `/api/v1/reset-access` | Admin | Reset member to invited state |
| POST | `/api/v1/suspend` | Admin | Suspend member access |
| POST | `/api/v1/feedback` | Yes (any signed-in coach) | Submit coach feedback or bug report |

**⚠️ Admin route paths are NOT under `/api/v1/admin/`** except the two public
1-tap email links above — the rest mount bare at `/api/v1` (`admin.js`'s
`router.use(requireAuth, requireAdmin)` gate is path-agnostic and sits after the
two public links). `feedbackRouter` must mount before `adminRouter` on the
shared `/api/v1` base, or every feedback submission 403s against the admin
gate — this exact regression shipped and was fixed in v2.8.3 (see backend/CLAUDE.md).

### Admin UI

`frontend/public/admin.html` — deployed as a static page at `/admin.html` on Vercel.

Six-tab admin interface: Pending Requests | Members | Feedback | Teams | Settings | Audit.

Login via Google OAuth or email magic link. Checks `/me` for `memberships[0].role === 'admin'`.

### RLS Policy Map (live, re-verified 2026-08-04)

> **This section previously described RLS on `team_data`/`teams`/`roster_snapshots`
> as a "Phase 4 target state," not yet applied.** That shipped in **v2.6.0**
> (WS-3, 2026-07-20) and was re-verified directly against live prod via a
> `pg_policies` query on 2026-08-04 (see `docs/db/schema.sql` §8, Doc Audit Spike
> Story 1). The table below reflects what is actually enforced today, not a plan.

| Table | anon SELECT | anon INSERT/UPDATE | auth SELECT | auth INSERT/UPDATE | Notes |
|-------|-------------|---------------------|-------------|---------------------|-------|
| `share_links` | ✓ (all rows) | ✓ INSERT only | ✓ | ✓ | Token entropy (~4.3B) is enumeration guard - correct, non-negotiable per Auth Principle |
| `teams` | ✗ (no anon policy - RLS default-denies despite a leftover GRANT) | ✗ | ✓ own team | ✓ (INSERT unconditional - first-team creation; UPDATE/DELETE admin-only) | Gated via `team_memberships` join |
| `team_data` | ✗ (no anon policy) | ✗ | ✓ own team | ✓ coach/admin only | Highest-risk table — direct frontend writes, now RLS-gated not just app-gated |
| `roster_snapshots` | ✗ (no anon policy) | ✗ | ✓ own team | ✓ INSERT coach/admin only (no UPDATE/DELETE policy for anyone but service_role) | Snapshot safety net |
| `team_data_history` | ✗ | ✗ | ✗ | ✗ | service_role + trigger only; no REST access |
| `live_game_state` / `game_scoring_sessions` / `scoring_audit_log` | ✓ (public read policy) | **✓ ALL commands, unrestricted** (`allow_scorer_writes`, `qual: true`) | same | same | **STILL OPEN — #355, not fixed.** Unlike the rows above, RLS here does not meaningfully restrict anything: `roles: public, cmd: ALL, qual: true` permits any unauthenticated caller to read/write/delete any team's live scoring data. See `docs/product/AUTH_SECURITY_AUDIT_ROADMAP.md` WS-3 row. |
| Auth tables (`access_requests`, `team_memberships`, `profiles`) | ✗ | anon INSERT (request-access only) | ✓ own row | via backend only | RLS from migrations 001/003/007 |

**Key architectural insight for viewer mode:** Share links store the full lineup payload
inline in `share_links.payload`. Viewer mode reads `share_links` by id — it never reads
`team_data` directly. `team_data`'s anon SELECT was already blocked by RLS before this
rewrite, and the viewer experience is unaffected, confirming this design held up.

**Backend bypasses RLS entirely:** All routes in `src/routes/` use `supabaseAdmin`
(service role key). Service role bypasses RLS. Application-level auth is enforced by
`requireAuth` and `requireAdmin` middleware — RLS is defence-in-depth, not the
primary gate for backend routes.

Migration file: `backend/migrations/004_rls_fixes.sql` (idempotent, safe to
re-run — its policies are already live, so re-running is a no-op, not a re-application)

### Auth Shims Still Outstanding (Phase 4C, scoring tables only)

The auth cutover above is complete for `team_data`/`teams`/`roster_snapshots` and
the sign-in flow generally. What's still deferred is narrower than "auth isn't
done" — it's specifically the live-scoring tables:

- `_effectiveUserId`/`_effectiveUserName` fallback in `useLiveScoring.js` (marked `AUTH TESTING SHIM`)
- `scoringUserId`/`scoringUserName` fallback + `isAdminTestMode` in `ScoringMode/`
- `var isEnabled = liveScoringEnabled || true` in `DugoutView.jsx` — forces live scoring on regardless of the real per-team flag (see Feature Flag System § `live_scoring` below)
- The scoring tables' own RLS (#355, table above) is not gated by `auth.uid()` yet

All four are scoped to Phase 4C, tracked in `docs/ops/PHASE4C_CUTOVER.md` and root `CLAUDE.md`'s Phase 4C checklist. Do not remove without walking that checklist.

---

## Frontend Architecture

### Stack

| Layer | Technology |
|---|---|
| Framework | React 18 (functional components + hooks) |
| Build | Vite 5 |
| Styling | Inline styles only — no Tailwind, no CSS modules. Design tokens defined in `theme/tokens.js` as plain JS constants; consumed via inline `style={{}}` references across components. Hex literals used at call sites until full token migration is complete. |
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
├── theme/
│   ├── tokens.js        ← Design token definitions (colors, spacing, typography constants)
│   └── index.js         ← Barrel export
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
    ├── BattingOrderStrip/  ← read-only batting order strip (Now Batting / On Deck / In Hole / +N more); used by DugoutView
    ├── ScoringMode/            ← 7 child components imported by DugoutView; index.jsx removed v2.5.11
    ├── game-mode/
    │   └── DugoutView.jsx   ← Combined game + scoring view (sole game-day surface since v2.5.9)
    ├── Shared/
    ├── Support/
    └── Viewer/
```

### Navigation Structure

> **Corrected 2026-08-04** — this table previously listed a "Season" tab that
> does not exist, and put Songs under "My Team" when it's actually a Game Day
> sub-tab. Regenerated directly from `PRIMARY_TABS`/`TEAM_SUBTABS`/
> `GAMEDAY_SUBTABS`/`MORE_SUBTABS` in `App.jsx`.

**4 primary tabs** in a fixed bottom nav bar (portrait) / sidebar (landscape): **Home, My Team, Game Day, Support.**

| Primary Tab | Sub-tabs | Responsibility |
|---|---|---|
| **Home** | — | Dashboard, team switcher, Create New Team |
| **My Team** | Roster / Schedule / Snacks | Player cards with V2 attribute editing, add/remove, constraints; game list + AI import + result logging + batting stat entry; per-game snack duty assignment |
| **Game Day** | Lineups / Songs / Dugout View | Lineups as default (v2.2.24 restructure); Songs sub-tab filtered to tonight's active batting order; Dugout View — unified game-day surface (lineup + live scoring) |
| **Support** | Account / FAQ / Feedback / Links / About / Updates / Legal | Sign-out + per-team cards (v2.7.0); FAQ; coach feedback + bug reports; external resources; app description + version history; legal docs (Privacy + Terms) |

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

### Design Tokens Architecture (Phase 1a, v2.5.6)

`frontend/src/theme/tokens.js` defines the semantic design token foundation: color palette, font sizes, spacing scale, z-index values, and border radii — all as a plain JS object. `theme/index.js` re-exports the token map as the barrel entry point. In Phase 1a there are zero consumers — the module tree-shakes out of the production bundle entirely and carries no runtime cost. Phase 1b (tracked in `docs/product/UX_REFACTOR_ROADMAP.md`) will wire tokens into components using CSS custom properties or inline style references. The token contract shape (top-level groups, palette structure, required keys) is enforced by `theme.tokens.test.js` (27 tests) so any structural regression is caught before it reaches consumers.

**v2.5.22 additions** (Stories 92+94, DefenseDiamond Tier A+B + MaintenanceScreen token migration): adds `tokens.borderWidth` (3 values: `hairline: '1px'`, `thin: '1.5px'`, `medium: '2px'`) and extends `tokens.color.overlay` with two alpha-tint values (`whiteMedium: 'rgba(255,255,255,0.25)'`, `whiteHeavy: 'rgba(255,255,255,0.6)'`). `theme.tokens.test.js` extended to cover the new shapes.

**v2.5.24 additions** (Story 93, DefenseDiamond Tier D + App.jsx POS_COLORS migration, PR #259): adds `tokens.color.position.*` (22 keys — 11 position fills + 11 header shades sub-group), `tokens.color.field.*` (7 keys — `grass`, `grassLight`, `dirt`, `dirtLight`, `mound`, `moundLight`, `chalk`), and extends `tokens.color.overlay` with 4 error-tint variants (`errorFaintest: 'rgba(220,38,38,0.04)'`, `errorFaint: 'rgba(220,38,38,0.05)'`, `errorSubtle: 'rgba(220,38,38,0.08)'`, `errorMedium: 'rgba(220,38,38,0.30)'`). POS_COLORS map and prop drilling removed from App.jsx → ParentView; DefenseDiamond, App.jsx renderFieldSVG, and ParentView unified on identical token contract. Single source of truth for position and field colors across all rendering surfaces. `theme.tokens.test.js` extended to cover the new shapes.

---

## UI Primitives

### Overview

A UI primitive in this codebase is an atomic, token-bound rendering component with no business logic, colocated with its test file in `frontend/src/components/ui/`. Primitives consume design tokens directly (`frontend/src/theme/tokens.js`) — no inline literals for color, spacing, radius, or shadow. Use a primitive at the call site when a recurring visual pattern emerges across 3+ sites; compose ad-hoc with `Stack` + `Text` until then. The pattern exists because `App.jsx` is a ~9,800-line monolith and a future call-site refactor (component split) is only safe once the token contract is enforced and the building blocks are tested in isolation. Primitives are the first layer of that contract.

### Primitive inventory

| Primitive | File | Tests | Introduced | Notes |
|---|---|---|---|---|
| Toast | `components/ui/Toast.jsx` | `Toast.test.jsx` | v2.4.x | Test added v2.5.2; top-anchored transient notifications |
| Badge | `components/ui/Badge.jsx` | `Badge.test.jsx` | v2.5.10 | Gained `context='light' \| 'dark'` prop in v2.5.12 (dark variants are token-driven) |
| Button | `components/ui/Button.jsx` | `Button.test.jsx` | v2.5.10 | Variants: primary, ghost; 44px touch-target floor |
| Card | `components/ui/Card.jsx` | `Card.test.jsx` | v2.5.10 | Surface container with token-bound padding + radius |
| Stack | `components/ui/Stack.jsx` | `Stack.test.jsx` | v2.5.10 | Vertical/horizontal layout via `gap` prop |
| Text | `components/ui/Text.jsx` | `Text.test.jsx` | v2.5.10 | Use `size` prop, not inline `fontSize` style overrides |
| Pill | `components/ui/Pill.jsx` | `Pill.test.jsx` | v2.5.14 | Compact toggle-chip; non-44px-floor by design |
| ListRow | `components/ui/ListRow.jsx` | `ListRow.test.jsx` | v2.5.14 | Full-width tappable row with 44px floor + optional divider |
| BottomSheet | `components/ui/BottomSheet.jsx` | `BottomSheet.test.jsx` | v2.5.21 | Overlay + focus trap + slide-up; scrim dismiss; LockFlow is first consumer |

### Adoption status

**Added 2026-08-04.** Phase 3 (call-site migration onto the primitives above —
no new primitive types were introduced) completed in **v2.8.4**: FairnessCheck,
NowBattingStrip, MaintenanceScreen, ParentView, BattingOrderStrip, LockFlow, and
DefenseDiamond all migrated to `Card`/`Text`/`Stack` (PRs #519–#526), and the
legacy `S.card` style object was retired across all 17 `App.jsx` call sites
(Story 117, #515). A related, separately-tracked effort — retiring the legacy
`var C` color-object in `App.jsx` region-by-region — is now **complete**:
all 9 originally-planned regions plus a follow-up slice 10 sweep of 5 render
functions outside that plan (renderSongs, renderSnackDuty, renderPinModal,
renderTeamTab, renderBottomNav) — `var C` has zero remaining call sites in
`App.jsx` as of v2.8.5 (2026-08-06, #606). Slice 8's own carve-out
(GameModeScreen/DugoutView, Story 116/#503) was not one of slice 10's swept
functions; whether its separate inheritance-verification methodology still
needs to run against that surface is unresolved, not claimed done here.
**Promoted to `main` 2026-08-07** (PR #619, regular merge, `06030c1`) —
verified as a genuine 2-parent merge, not squashed. `origin/main`'s
`APP_VERSION` confirmed at 2.8.5 directly, not assumed.

### BottomSheet pattern

`BottomSheet` provides a bottom-anchored modal surface with: a full-viewport scrim that dismisses on tap, a slide-up animation on mount, focus trapping within the sheet body, `role="dialog"` with `aria-modal="true"` for screen readers, and a11y F6 compliance (`aria-labelledby` wires to a passed-in heading id). Visual tokens consumed: `tokens.radius.sheet` (top-corner radius), `tokens.shadow.sheetTop` (upward shadow), `tokens.color.overlay.scrim` (backdrop tint). The whole primitive is 80 lines.

Consumer pattern: import the primitive, control its visibility via `isOpen` from parent state, pass an `onClose` callback, and put the sheet body as children. Example: see `frontend/src/components/GameDay/LockFlow.jsx` — the reference implementation. LockFlow used to inline its own modal shell (24 lines of fixed-position + backdrop + animation wiring); it now imports `<BottomSheet>` and passes its content as children. Future modals/pickers (settings sheet, multi-step confirmations) should use this primitive — do not re-derive the pattern.

### Conventions

- All primitives live in `frontend/src/components/ui/`.
- Each primitive has a colocated `*.test.jsx` (not in `src/tests/`).
- All color, spacing, radius, and shadow values come from `frontend/src/theme/tokens.js`. No inline literals.
- No business logic inside a primitive — data flows through props; callbacks bubble up via props.
- New primitives require: (a) a colocated test file with **named test IDs** (e.g. BS1–BS7, BD1–BD10) so tests can be referenced individually in PRs and DOC_TEST_DEBT; (b) a row in `docs/product/FEATURE_MAP.md`; (c) an entry in this section's inventory table.
- Before introducing a new primitive, first try composing with `Stack` + `Text` + an existing primitive. Only promote to a new primitive when the same shape recurs at 3+ call sites OR carries a non-trivial a11y / animation contract (BottomSheet qualifies on the second criterion).

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

### `live_scoring` is architecturally different from every other flag

**Added 2026-08-04.** The two-level (`FEATURE_FLAGS` object + localStorage) model
above describes 7 of the 8 flags. `live_scoring` does not follow it: it is read
through a separate hook, `useFeatureFlag('live_scoring', teamId)`, which queries
the Supabase `feature_flags` table directly per-team — it has no
`FEATURE_FLAGS.LIVE_SCORING` bundled-JS entry at all (confirmed: zero grep hits
for `LIVE_SCORING` anywhere in `frontend/src`). It fails closed (`false`) if the
table read fails or the row is absent — the only flag with that property. Two
call sites also hardcode `Mud Hens`/`Demo All-Stars` to always-true regardless
of the table (`App.jsx` ~line 1454, `DugoutView.jsx` ~line 58).

**Currently, none of this matters in practice:** `DugoutView.jsx` has
`var isEnabled = liveScoringEnabled || true` with a comment marking it an `AUTH
TESTING SHIM` pending removal — so live scoring is functionally on for every
team today, regardless of what the DB flag or team-name hardcode say. The real
gating scaffolding is still there, just bypassed. Do not remove the shim without
walking the Phase 4C checklist (root `CLAUDE.md`) — the DB flag and hardcode are
what take back over once it's gone. `docs/TROUBLESHOOTING.md` documents this
same distinction from the debugging-a-flag-that-won't-flip angle; this section
is the architectural-reference version of the same fact.

---

### COMBINED_GAMEMODE_AND_SCORING — rollout complete, section now historical

> **Corrected 2026-08-04.** This section described an in-progress rollout with
> "Slice 3 (planned)" and a live mutual-exclusion invariant between ScoringMode
> and DugoutView. The rollout finished in **v2.5.9** (Slice 3): the flag is GA
> default-on, the legacy Scoring tab and `ScoringMode/index.jsx` root component
> are deleted (Slice 4, v2.5.11), and `PRIMARY_TABS` is now a fixed 4-entry array
> with no `scoring` key at all — the three-site mutual-exclusion machinery below
> no longer exists in the code. Kept as historical record of the rollout
> mechanism; do not use it to reason about current behavior.

Introduced in v2.5.4 (Slice 0). During the rollout window (Slices 0–3), the legacy multi-tab ScoringMode UX and the new combined DugoutView surface coexisted in the codebase, and the flag enforced strict mutual exclusion between them at three sites in App.jsx (PRIMARY_TABS array, GAMEDAY_SUBTABS array, ScoringMode render branch) to prevent two scoring sessions being claimable for the same game from different entry points.

**Slice rollout history (complete):**

- Slice 0 (v2.5.4) — DugoutView lift, flag default-OFF, prod unchanged
- Slice 1 (v2.5.5) — BattingOrderStrip integration + currentBatterIndex prop wiring; ScoreboardRow test coverage; D017 resolved
- Slice 2 (v2.5.7) — DugoutView layout shell + dugoutFocusMode state machine; ScoreboardRow inning/halfInning props; BattingOrderStrip batter-source fix (Bug 8); 375px flex-column layout fix (Bugs 9/10); Story 46 + Story 50 resolved
- Slice 3 (v2.5.9) — flag flipped default-ON in prod; legacy ScoringMode tab retired
- Slice 4 (v2.5.11) — `ScoringMode/index.jsx` root component + `ViewerMode.jsx` deleted from the repo (7 live child components preserved, still imported directly by DugoutView — see root CLAUDE.md's Active Tracks note on the pending directory restructure)

DugoutView (Game Day → Dugout View) is now the sole game-day surface for every team.

---

### dugoutFocusMode state machine (v2.5.7, revised v2.5.13)

> **Updated 2026-08-04** — the snippet below previously showed only the v2.5.7
> original, missing the `scorerClaimed` clause added in the v2.5.13 revision.

Derived state inside `DugoutView.jsx`:

```js
var dugoutFocusMode = (currentAtBat !== null || scorerClaimed) ? 'scoring' : 'lineup';
```

- System-driven, NOT user-toggled. The coach does not pick a mode; it follows scoring engine state.
- `'lineup'` renders DefenseDiamond (visible by default and between at-bats)
- `'scoring'` renders LiveScoringPanel (visible during active at-bat, and for the
  whole session once a scorer claims the seat)

**Why the v2.5.13 revision (Story 16):** the original v2.5.7 machine created a
deadlock. A coach could claim scorer with `currentAtBat` still `null` — mode
resolved to `'lineup'`, LiveScoringPanel stayed hidden, and there was no UI
control to call `scoring.startAtBat()` from the lineup view. Mode got stuck on
`'lineup'` forever. Surfaced as Story 16 ("No batting order set") — the
empty-state copy was a misleading downstream symptom of the panel never
becoming startable. Adding `|| scorerClaimed` fixed it: a scorer stays in
`'scoring'` mode for the entire session once claimed, not just during an active
at-bat. Behavior by role:
- **Scorer** (`scorerClaimed = true`) — `'scoring'` for the whole session.
- **Viewer** (`viewerMode = true`, `scorerClaimed = false`) — original machine
  still applies: `'lineup'` between at-bats, `'scoring'` during.

### Panel mount convention (v2.5.7)

Both DefenseDiamond and LiveScoringPanel stay mounted across mode switches. Visibility is toggled via CSS `display:none`, NOT via React conditional unmounting.

Rationale: preserves DefenseDiamond inning-scrub state across at-bat boundaries (coach scrubbing to inning 5 in lineup mode does not reset when an at-bat starts and resolves).

### DugoutView layout shell (v2.5.7)

Flex column at full viewport height. Fixed-height regions:
- ScoreboardRow header (top)
- BattingOrderStrip sub-header (below ScoreboardRow)
- Body region (`flex:1`, `overflow-y:auto`) renders one of: DefenseDiamond OR LiveScoringPanel based on `dugoutFocusMode`

This is the 375px viewport fix pattern (Bugs 9/10 from v2.5.5 smoke test).

### ScoreboardRow inning + halfInning props (v2.5.7)

Two new optional props added in v2.5.7:
- `inning`: number, 0-indexed
- `halfInning`: `'top'` | `'bottom'`

When both provided, renders an ordinal indicator near the score colon ("Top 3rd", "Bot 5th"). When omitted, no indicator renders — backward compatible with any pre-v2.5.7 mount site.

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
