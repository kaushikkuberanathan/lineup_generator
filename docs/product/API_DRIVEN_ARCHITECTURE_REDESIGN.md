# API-Driven Architecture Redesign

> **Status:** Baseline approved for planning; implementation not started
>
> **Baseline date:** 2026-09-02
>
> **Initiative:** [#1012](https://github.com/kaushikkuberanathan/lineup_generator/issues/1012)
>
> **Phase 0:** [#1013](https://github.com/kaushikkuberanathan/lineup_generator/issues/1013)
>
> **Phase 1:** [#1014](https://github.com/kaushikkuberanathan/lineup_generator/issues/1014)
>
> **Milestone:** [API-Driven Architecture Redesign — Phases 0-1](https://github.com/kaushikkuberanathan/lineup_generator/milestone/1)

## 1. Purpose

Dugout Lineup will migrate to an API-driven application one production-safe screen at a time, beginning with a redesigned multi-team Home screen. The Home vertical slice establishes the reusable contracts for every later tab: backend-owned identity and authorization, canonical team-scoped routes, explicit server-state boundaries, resilient local caching, granular command APIs, and reversible rollout.

This is the architectural baseline moving forward. Later implementation decisions should conform to it or update this document through an explicit, evidence-backed decision.

## 2. Executive decision

The target ownership model is:

> **Backend owns truth, permissions, summaries, actions, destinations, commands, concurrency, idempotency, and auditability.**
>
> **URLs own navigation context.**
>
> **React owns responsive presentation and transient interaction state.**
>
> **Local persistence owns resilience, not authority.**

Two qualifications are non-negotiable:

1. **API-driven does not mean backend-dependent.** Cached and offline game-day behavior remains a product requirement.
2. **API-driven does not mean server-defined visual layout.** APIs return product semantics; the frontend design system owns composition and appearance.

## 3. Problem statement

Application behavior is currently distributed across `App.jsx`, local storage, direct frontend-to-Supabase calls, backend routes, Supabase RLS, feature flags, and manually coordinated React tab changes. This makes multi-team navigation, role behavior, authorization, offline state, and failure recovery harder to reason about and test.

The current Home screen compounds this by combining greeting/account state, next-game urgency, team administration, and navigation while deriving much of its state in the frontend. Existing Home actions generally call `loadTeam(team)`, persist `ui:activeTeam`, and then change local React tab state—sometimes using timed callbacks. Those transitions are contextual during one session, but they are not canonical, reloadable deep links.

## 4. Goals

### 4.1 User goals

- A coach, parent, or scorekeeper with multiple teams always knows which team an action affects.
- Every CTA lands on the intended team, game, lineup, roster, or schedule after navigation, refresh, authentication, or app restart.
- Available actions reflect the user's actual active membership, role, and resource state.
- Home remains fast and useful during backend latency or temporary disconnection.
- Game-day workflows retain offline resilience.

### 4.2 Engineering goals

- Move authorization and capability decisions behind authenticated APIs.
- Establish canonical, reloadable application routes.
- Prevent previously active local state from overriding route identity.
- Replace broad frontend orchestration with purpose-built read models.
- Gradually replace broad `team_data` writes with granular command APIs.
- Separate server, URL, UI, and offline/synchronization state.
- Decompose each migrated screen out of the `App.jsx` monolith where safe.
- Preserve legacy compatibility until a migrated surface is proven in production.

### 4.3 Initial success targets

- 100% of migrated CTAs include a team-scoped destination.
- Zero cross-team navigation errors in route and browser tests.
- Zero UI-only authorization decisions for migrated actions.
- Returning-user cached Home can render within 300 ms on representative devices.
- Home API server-processing p95 target: under 300 ms in normal conditions.
- Home API payload target: under 50 KB for a user with ten teams.
- Duplicate-sensitive commands are retry-safe.
- Direct Supabase orchestration declines screen by screen as replacements prove safe.

## 5. Non-goals for Phases 0-1

- No full-application rewrite.
- No removal of offline support.
- No server-defined colors, spacing, component types, or layout.
- No replacement of Supabase as the database or authentication provider.
- No lineup-engine rewrite during Home migration.
- No Game Mode or ScoringMode behavior changes before their dedicated phase and approvals.
- No immediate removal of all local-storage state.
- No broad removal of direct Supabase access outside the migrated Home surface.
- No production rollout combined with legacy fallback removal in the same change.

## 6. Architecture principles

### 6.1 Backend authority

The backend owns:

- Authenticated user identity
- Active memberships
- Role normalization
- Resource-aware capabilities
- Team, event, and readiness summaries
- Canonical action discovery
- Destination and command authorization
- Resource ownership validation
- Input validation
- Concurrency and revision handling
- Idempotency
- Audit records

An action returned by Home supports discovery; it is not authorization. Every destination and command must reauthorize independently.

### 6.2 URL authority

Canonical paths identify the requested context:

```text
/app
/app/teams/:teamId
/app/teams/:teamId/roster
/app/teams/:teamId/schedule
/app/teams/:teamId/lineups
/app/teams/:teamId/lineups/:lineupId
/app/teams/:teamId/games/:gameId
/app/teams/:teamId/games/:gameId/mode
/app/teams/:teamId/games/:gameId/score
```

When a route supplies `teamId`, the application must never silently substitute `ui:activeTeam`. Nested `gameId` and `lineupId` values must be verified as belonging to that team.

Existing unauthenticated share-link routes remain above the auth gate and must not regress.

### 6.3 React responsibility

React owns:

- Expanded team card
- All-teams versus selected-team filtering
- Open sheets and dialogs
- Skeleton and transition states
- Accessible focus management
- Optimistic visual feedback where rollback is safe
- Pending navigation
- Form input before submission
- Cached/offline presentation

React must not independently infer permissions from raw roles or join domain resources to invent business actions already represented by the API.

### 6.4 Local persistence responsibility

Local persistence owns:

- Last successful private API snapshots
- Game-day resources explicitly required offline
- Unsynced permitted mutations
- Sync metadata
- Conflict metadata
- Appropriate draft state

Local persistence does not own current membership authorization, canonical role, resource ownership, or route identity.

### 6.5 Semantic APIs

Good API response:

```json
{
  "id": "view_schedule",
  "label": "View Knights schedule",
  "href": "/app/teams/knights/schedule",
  "enabled": true
}
```

Rejected coupling:

```json
{
  "component": "YellowTwoColumnButton",
  "marginBottom": 12
}
```

The API owns meaning. The design system owns rendering.

## 7. State model

### 7.1 URL state

```js
{
  teamId,
  destination,
  gameId,
  lineupId
}
```

### 7.2 Server state

```js
{
  user,
  memberships,
  homeSummary,
  team,
  roster,
  schedule,
  lineup,
  game,
  capabilities
}
```

### 7.3 Transient UI state

```js
{
  expandedTeamId,
  teamFilter,
  openSheet,
  pendingAction,
  focusedElement
}
```

### 7.4 Offline and synchronization state

```js
{
  cachedAt,
  dataVersion,
  syncStatus,
  pendingCommands,
  lastSyncError,
  conflict
}
```

These categories must not be collapsed back into a single monolithic component state model.

## 8. API conventions

### 8.1 Query/read APIs

```text
GET /api/v1/home
GET /api/v1/teams/:teamId
GET /api/v1/teams/:teamId/roster
GET /api/v1/teams/:teamId/schedule
GET /api/v1/teams/:teamId/lineups
GET /api/v1/teams/:teamId/games/:gameId
```

### 8.2 Command APIs

```text
POST   /api/v1/teams/:teamId/lineups
PATCH  /api/v1/teams/:teamId/lineups/:lineupId
POST   /api/v1/teams/:teamId/games/:gameId/scoring-sessions
PATCH  /api/v1/teams/:teamId/games/:gameId/attendance
POST   /api/v1/teams/:teamId/games/:gameId/finalize
POST   /api/v1/teams/:teamId/roster/players
PATCH  /api/v1/teams/:teamId/roster/players/:playerId
DELETE /api/v1/teams/:teamId/roster/players/:playerId
```

### 8.3 Command requirements

- Authenticate the caller.
- Resolve membership server-side.
- Validate capability.
- Verify nested resource ownership.
- Validate request shape.
- Reject stale revisions where necessary.
- Require `Idempotency-Key` when duplicate execution is harmful.
- Return the authoritative updated resource or summary.
- Produce structured audit and error records.

### 8.4 Standard error envelope

```json
{
  "error": {
    "code": "TEAM_ACCESS_DENIED",
    "message": "You no longer have access to this team.",
    "requestId": "req_123",
    "retryable": false
  }
}
```

The Phase 0 contract must define authentication, authorization, validation, conflict, rate-limit, timeout, and server-error behavior.

### 8.5 Concurrency and idempotency

- Use a resource revision, ETag, or equivalent authoritative version.
- Use `If-Match` for mutation paths where stale overwrites are unsafe.
- Return `409` or `412` with enough information to refresh safely.
- Require idempotency for create-lineup, start-scoring-session, finalize-game, create-team, schedule import, and comparable commands.

## 9. Phase 0 — Foundation and governance

Phase 0 is tracked by [#1013](https://github.com/kaushikkuberanathan/lineup_generator/issues/1013).

| Order | Story | Outcome |
|---:|---|---|
| 1 | [#1015](https://github.com/kaushikkuberanathan/lineup_generator/issues/1015) | Architecture ownership and migration ADR |
| 2 | [#1016](https://github.com/kaushikkuberanathan/lineup_generator/issues/1016) | API, versioning, errors, retry, concurrency, idempotency |
| 3 | [#1017](https://github.com/kaushikkuberanathan/lineup_generator/issues/1017) | Role normalization and capability policy |
| 4 | [#1018](https://github.com/kaushikkuberanathan/lineup_generator/issues/1018) | Canonical team-scoped route contract |
| 5 | [#1019](https://github.com/kaushikkuberanathan/lineup_generator/issues/1019) | React/server/URL/offline state boundaries |
| 6 | [#1020](https://github.com/kaushikkuberanathan/lineup_generator/issues/1020) | Cross-cutting test, accessibility, analytics, and observability gates |
| 7 | [#1021](https://github.com/kaushikkuberanathan/lineup_generator/issues/1021) | Full screen/direct-Supabase/local-storage migration inventory |

### Phase 0 exit gate

- Ownership boundaries are internally consistent.
- API conventions and capability vocabulary are approved.
- Canonical routes and auth-resume behavior are specified.
- Cache and offline authority are explicit.
- Performance, test, accessibility, observability, rollout, and rollback gates are defined.
- Every screen, direct-Supabase dependency, local-storage key, locked path, and migration wave is inventoried.
- No application behavior change is required to complete this phase.

## 10. Phase 1 — API-driven Home and Team Hub

Phase 1 is tracked by [#1014](https://github.com/kaushikkuberanathan/lineup_generator/issues/1014).

| Wave | Story | Outcome |
|---:|---|---|
| 1 | [#1022](https://github.com/kaushikkuberanathan/lineup_generator/issues/1022) | Versioned Home read-model contract |
| 1 | [#1023](https://github.com/kaushikkuberanathan/lineup_generator/issues/1023) | Authenticated aggregation without N+1 queries |
| 1 | [#1024](https://github.com/kaushikkuberanathan/lineup_generator/issues/1024) | Server-owned capabilities and contextual actions |
| 1 | [#1025](https://github.com/kaushikkuberanathan/lineup_generator/issues/1025) | Contract, auth, isolation, caching, and performance coverage |
| 2 | [#1026](https://github.com/kaushikkuberanathan/lineup_generator/issues/1026) | Authenticated frontend API client and private Home cache |
| 2 | [#1027](https://github.com/kaushikkuberanathan/lineup_generator/issues/1027) | Route parser and authenticated destination resolver |
| 3 | [#1028](https://github.com/kaushikkuberanathan/lineup_generator/issues/1028) | Extracted Home shell and single-expanded-team Team Hub |
| 3 | [#1029](https://github.com/kaushikkuberanathan/lineup_generator/issues/1029) | Mixed-role, multi-team states and explanations |
| 3 | [#1030](https://github.com/kaushikkuberanathan/lineup_generator/issues/1030) | Contextual CTA deep links and legacy destination adapters |
| 4 | [#1031](https://github.com/kaushikkuberanathan/lineup_generator/issues/1031) | Loading, cache, offline, slow-backend, empty, and access-loss states |
| 4 | [#1032](https://github.com/kaushikkuberanathan/lineup_generator/issues/1032) | Analytics, accessibility, components, and end-to-end verification |
| 5 | [#1033](https://github.com/kaushikkuberanathan/lineup_generator/issues/1033) | Feature-flag rollout, soak, docs, and later legacy retirement |

## 11. Home read model

### 11.1 Endpoint

```http
GET /api/v1/home
Authorization: Bearer <token>
Accept: application/json
If-None-Match: "<etag>"
X-Time-Zone: America/New_York
```

### 11.2 Proposed response

```json
{
  "version": 1,
  "generatedAt": "2026-09-02T18:12:00Z",
  "defaultTeamId": "1774297491626",
  "teams": [
    {
      "id": "1774297491626",
      "name": "Mud Hens",
      "ageGroup": "8U",
      "season": "Fall",
      "year": 2026,
      "sport": "baseball",
      "role": {
        "code": "coach",
        "label": "Coach"
      },
      "capabilities": [
        "team.view",
        "roster.view",
        "roster.manage",
        "schedule.view",
        "lineup.view",
        "lineup.create",
        "game.start_mode"
      ],
      "nextEvent": {
        "id": "game_123",
        "type": "game",
        "opponent": "Braves",
        "startsAt": "2026-09-02T22:00:00Z",
        "location": "Riverside Field",
        "homeAway": "home"
      },
      "readiness": {
        "rosterCount": 11,
        "confirmedCount": 9,
        "lineupStatus": "ready",
        "lineupId": "lineup_456"
      },
      "actions": [
        {
          "id": "start_game_mode",
          "label": "Start Mud Hens Game Mode",
          "href": "/app/teams/1774297491626/games/game_123/mode",
          "enabled": true,
          "disabledReason": null
        }
      ]
    }
  ]
}
```

### 11.3 Query implementation guidance

1. Resolve active memberships for the authenticated user.
2. Fetch associated teams in a batch.
3. Fetch relevant schedules and summary data using batched team IDs.
4. Compute next events and readiness in a service layer.
5. Map capabilities through the canonical server policy.
6. Build canonical contextual actions.
7. Return summaries only.

Measure before introducing denormalized views or stored summary tables. The endpoint must avoid per-team query amplification.

### 11.4 Normative schema, fixtures, and exclusions (Story #1022)

- `backend/src/contracts/homeReadModel.v1.schema.json` is the normative JSON
  Schema for this response. Section 11.2's response above is illustrative;
  the schema file is authoritative for required fields, enums (role codes,
  capability vocabulary per section 26.1, lineup status, home/away), and
  the `requestId`/`version` framing required by section 25.1/25.4.
- `backend/src/contracts/fixtures/home/*.json` are representative fixtures,
  each structurally validated against the schema (required keys, role/
  capability enums, action `href` shape) without adding a schema-validation
  library dependency — that wiring is #1023/#1025's job, not this story's:
  - `one-team.json` — single admin-role team, full readiness, all actions enabled.
  - `many-teams-duplicate-names.json` — three teams, two sharing the name
    "Mud Hens" across two seasons; demonstrates `displayName` disambiguation.
  - `mixed-roles.json` — scorekeeper and viewer roles on different teams in
    one response, including a `scoring.claim` action advertised but disabled
    (section 26.1's footnote: a viewer's scoring capability is a per-game
    lock state, never a bare role grant).
  - `empty-events.json` — a team with no upcoming game or practice
    (`nextEvent: null`, `lineupStatus: "none"`); no game-mode action is
    offered at all rather than a disabled action pointing at a fake game ID.
  - `unavailable-actions.json` — a locked lineup and an under-roster team,
    each producing a real, real-destination action with `enabled: false`
    and a human-readable `disabledReason`.
- **Duplicate-name disambiguation rule:** `team.name` is the raw stored
  value and may collide across a caller's teams (e.g. two seasons of the
  same club). `team.displayName` is server-computed and equals `name`
  unless another team in the *same response* shares it, in which case
  season/year (and age group if still colliding) is appended. This keeps
  the disambiguation logic in one place per section 6.3 — React renders
  `displayName`, it never re-derives collision handling client-side.
- **Explicit exclusions:** this contract never returns full roster arrays,
  defense/batting grids, roster-snapshot history, or any live-scoring
  table content (`live_game_state`, `game_scoring_sessions`,
  `scoring_audit_log`). Those remain behind their own screen-scoped read
  APIs in later migration waves (section 30, "Live migration inventory"). This is a summary/discovery contract, not a data export —
  keeping it small is also how the 50 KB/ten-team payload budget in
  section 4.3 stays achievable.

## 12. Home UX contract

### 12.1 Team Hub model

- Exactly one team is expanded.
- `defaultTeamId` determines the initial expanded team.
- Other teams remain compact.
- `All teams` is a view filter, not an active team.
- Team cards show name, season/year, age group, role, and next event.
- Actions are visually contained within a team context.
- Duplicate team names are disambiguated.
- Parent, coach, and scorekeeper roles are visible and understandable.
- React renders backend actions rather than recreating role policy.

### 12.2 CTA rule

Every action carries its team context. Examples:

- `Start Mud Hens Game Mode`
- `View Mud Hens lineup`
- `View Knights schedule`
- `Score Eagles game`

Where the visual team container makes repetition excessive, accessible labels and destination metadata must still carry full team context.

### 12.3 Destination resolution

```text
Parse route
   ↓
Restore/authenticate session
   ↓
Verify active membership
   ↓
Load the route team, not the cached active team
   ↓
Verify nested game/lineup ownership
   ↓
Hydrate destination server state
   ↓
Render
```

During incremental migration, canonical routes may enter legacy screens through compatibility adapters. Those adapters must explicitly load the route team before changing legacy screen state.

## 13. Frontend implementation shape

Suggested modules:

```text
frontend/src/api/client.js
frontend/src/api/errors.js
frontend/src/api/home.js
frontend/src/api/routes.js
frontend/src/api/contracts/

frontend/src/features/home/HomeScreen.jsx
frontend/src/features/home/HomeHeader.jsx
frontend/src/features/home/TeamHub.jsx
frontend/src/features/home/ExpandedTeamCard.jsx
frontend/src/features/home/CompactTeamCard.jsx
frontend/src/features/home/TeamAction.jsx
frontend/src/features/home/HomeSkeleton.jsx
frontend/src/features/home/HomeErrorState.jsx
frontend/src/features/home/HomeOfflineState.jsx
frontend/src/features/home/useHomeScreen.js
```

This is a proposed organization, not pre-approval to edit locked paths or packages. The Home integration point in `App.jsx` still requires the literal approval phrase documented by the repository.

## 14. Resilience and failure states

### Loading

- Show accessible structural skeletons.
- Never display a cached team as if it were the route destination while resolution is pending.

### Cached return

- Render the last successful private snapshot promptly.
- Revalidate in the background.
- Track freshness and schema version.

### Offline

- Show the last successful snapshot.
- Identify stale state without overwhelming the coach.
- Permit navigation only to locally available read surfaces.
- Do not imply a server-required command has started.

### Slow or warming backend

- Keep cached Home useful.
- Preserve the existing server-status communication pattern.
- Avoid blanking the whole screen.

### No membership

- Route to the existing discovery/request-access journey.
- Do not show a broken-looking empty Team Hub.
- Preserve the existing post-create `refreshMemberships()` behavior so a newly created team does not disappear until reload.

### Access loss

- Remove revoked teams after authoritative refresh.
- If the user is currently viewing the revoked team, show an explicit access-loss state.
- Never silently redirect a mutation to another team.

## 15. Testing baseline

Every migrated screen must include contract, authorization, route, component, offline, and browser evidence. A test that never demonstrated RED does not satisfy the repository's test-first gate; use the established mutation-test substitute when normal RED is not possible.

### 15.1 Home backend unit scenarios

- One active team
- Multiple active teams
- Mixed roles
- Inactive membership excluded
- Email-linked membership handled
- Missing profile with valid membership
- Duplicate team names
- No upcoming event
- No lineup
- Ready lineup
- Parent capability set
- Scorekeeper capability set
- Cross-team game or lineup rejected
- Stable canonical action destinations
- ETag and `304 Not Modified`
- Query failure returns the standard error envelope

### 15.2 Home backend integration and contract scenarios

- Authenticated request
- Unauthenticated request returns `401`
- Malformed and expired token behavior
- Revoked membership
- Ten-team response
- Nested resources belong to the advertised team
- No service-role data leakage
- Schema validation
- Private-cache behavior
- Query-count/performance budget

### 15.3 Home component scenarios

- One expanded team
- Compact alternate teams
- Team expansion switching
- Same team name across seasons
- Coach, parent, and scorekeeper combinations
- Backend-disabled action with reason
- Cached state
- Offline state
- Slow-backend state
- Empty/no-membership state
- API error state
- Access-loss state
- Accessible names, focus order, contrast, and 44px targets
- Rapid team switching cancels stale work

### 15.4 Deep-link browser scenarios

- Open roster directly.
- Refresh roster route.
- Open schedule for a different team.
- Resume a pending destination after authentication.
- Previously active Team A does not override Team B URL.
- Parent cannot enter a coach-only destination.
- Cross-team game or lineup ID is rejected.
- Browser Back returns to Home with the expected team expanded.
- Browser Forward restores the destination.
- App restart preserves the canonical destination.
- Existing share links remain accessible without login.

### 15.5 Regression and device scenarios

- Current Home membership visibility golden paths remain intact.
- Create-team persistence refreshes memberships.
- Existing roster, schedule, lineup, share, and Game Mode entry paths do not regress.
- Preview is verified at representative mobile widths.
- Real-device validation is required for any release touching Game Day behavior.

## 16. Observability and analytics

### 16.1 Backend telemetry

- Request ID
- Status and stable error code
- Total latency
- Query/service latency
- Team count
- Payload size
- Cache/ETag outcome
- Retry/idempotency outcome where applicable

Do not log child names, roster contents, tokens, or sensitive membership fields.

### 16.2 Home analytics

Suggested events:

```text
home_api_loaded
home_api_cache_rendered
home_api_failed
home_team_expanded
home_team_filter_changed
home_action_selected
home_deep_link_resolved
home_deep_link_denied
home_offline_rendered
```

Suggested non-PII properties:

```text
team_id
role
action_id
destination_type
source
cache_state
network_state
app_version
```

## 17. Rollout plan

The production migration is gradual. It is not a big-bang replacement and it is
not controlled by one global `API_DRIVEN_APP` switch. Three independently
reversible flags separate backend comparison, route/client adoption, and visible
Home adoption:

| Flag | Safe default | Responsibility | Failure/offline behavior |
|---|---|---|---|
| `API_HOME_SHADOW_READ` | Off | Authenticated legacy Home sessions request the new Home read model in the background and compare it with the legacy result without rendering it. | Skip the comparison when offline; timeout, abort, or service failure must not delay or alter legacy Home. |
| `API_DRIVEN_ROUTES` | Off | Enables the authenticated API client, canonical route parser, destination resolver, and legacy-screen compatibility adapters. | Invalid, denied, timed-out, or unavailable resolutions fail closed to a safe route error or the known legacy entry point; cached team identity never authorizes a destination. |
| `API_DRIVEN_HOME` | Off | Selects the visible API-driven Team Hub for an eligible cohort. | Render the identity-private last successful snapshot when safe, label it stale/offline, disable server-required actions, and retain the tested legacy Home kill-switch path. |

Unknown, missing, malformed, or unreachable flag configuration resolves to the
safe Off state. A flag service or network outage must not enable a migration
stage, block unauthenticated share links, or make offline Game Day depend on the
Home API. Rollback disables only the affected boundary; it does not require a
database rollback.

### Release 0 — Foundation only

- Land the ownership ADR, API standards, capability policy, route contract,
  client-state boundaries, cross-cutting gates, and migration inventory.
- Add only backward-compatible database structures needed by later releases.
- For schema work, use expand-and-contract sequencing: add nullable/additive
  columns, tables, indexes, functions, policies, or grants first; deploy readers
  and dual-compatible writers second; backfill and verify third; enforce tighter
  constraints fourth; contract old schema and privileges only in a later release.
- No visible behavior changes and all three flags remain Off.

### Release 1 — Dark Home backend

- Deploy the versioned Home contract, aggregation service, capabilities, and
  observability with no frontend dependency on the response.
- Enable `API_HOME_SHADOW_READ` only for internal accounts, then a bounded cohort.
- Compare legacy and API outcomes for membership/team sets, normalized roles,
  default team, next event, lineup readiness, available actions, latency, errors,
  payload size, and request IDs. Emit counts/hashes and reason codes without
  child, roster, or other user PII.
- Shadow mismatches and failures are telemetry, never user-visible authority;
  the legacy result continues to drive Home.

### Release 2 — Dark API client and routes

- Ship the authenticated client, private cache boundary, canonical parser,
  destination resolver, and legacy adapters behind `API_DRIVEN_ROUTES`.
- Exercise direct open, refresh, auth resume, Back/Forward, cancellation, wrong
  cached team, revoked membership, and cross-team nested-resource denial in
  local and preview environments while legacy Home remains visible.
- Keep unauthenticated share-link routing above the auth gate and unchanged.

### Release 3 — Internal Team Hub

- Enable `API_DRIVEN_HOME` only for internal/admin accounts, the Mud Hens, and
  representative one-team, multi-team, duplicate-name, and mixed-role fixtures.
- Validate mobile interaction, exactly-one-expanded-team behavior, contextual
  actions, cache/offline states, accessibility, and legacy fallback.
- Review shadow comparison, API latency/error, denial, fallback, route-resolution,
  cache, and navigation telemetry before expanding exposure.

### Release 4 — Limited cohort

- Enable API-driven routes and Home for a small authenticated cohort after the
  internal evidence gates pass.
- Preserve all kill switches and the legacy Home implementation.
- Monitor access loss, stale-cache use, fallback rate, route-resolution failure,
  authorization denial, payload budget, and backend latency/error thresholds.

### Release 5 — Default-on cutover

- Make `API_DRIVEN_HOME` default-on for authenticated users only after the
  agreed acceptance thresholds and normal release gates are satisfied.
- Preserve independently controllable flags, the legacy Home, compatibility
  adapters, additive schema, and existing grants through a defined production
  soak. Default-on is not authorization to delete fallback code.

### Release 6 — Separate legacy retirement

- Begin only in a later tracked change after production evidence demonstrates
  the default-on path is stable and no deployed caller depends on legacy paths.
- Remove replaced Home orchestration, direct Home-specific Supabase access,
  obsolete local-storage keys, compatibility adapters, and shadow comparison
  code in explicit, reviewable steps.
- Contract database schema and revoke legacy grants only after caller inventory,
  live telemetry, migration/backfill verification, and rollback planning prove
  they are unused.

The first backend deployment, default-on UI cutover, legacy-code deletion, and
database grant revocation are four separate release boundaries. They must never
be combined into one PR, deployment, or authorization decision. Normal Ship
Gate, preview, soak, explicit branch-specific push authorization, production
smoke, and reverse-sync rituals remain required for every applicable boundary.

## 18. Later screen migration plan

| Order | Surface | Primary architectural proof |
|---:|---|---|
| 1 | Home | Read model, multi-team actions, routes, cache, rollout |
| 2 | Account and team shell | Shared identity, membership, capability, route context |
| 3 | Roster | Granular mutation APIs, concurrency, offline edits |
| 4 | Schedule, practices, snack duty | Event identity and Home-summary consistency |
| 5 | Lineups | Revisions, locking, engine persistence |
| 6 | Game Mode and scoring | Idempotent events, offline queue, deterministic replay |
| 7 | Songs and remaining support tabs | Complete architectural coverage without unnecessary APIs |
| 8 | Legacy retirement | Remove compatibility and direct paths safely |

Static content does not need an API merely to satisfy the initiative name. Stable presentation content may remain bundled in the frontend.

## 19. Technical-debt ledger

The following debt is either exposed by the initiative or intentionally deferred until a safe migration phase. Items must be reconciled into `DOC_TEST_DEBT.md` and/or dedicated issues as Phase 0 verifies the live inventory.

| ID | Priority | Debt | Disposition |
|---|---|---|---|
| ADR-01 | P1 | No single ownership ADR for backend, URL, React, and offline authority | Resolve in #1015 |
| API-01 | P1 | No standard versioned error/retry/concurrency/idempotency contract | Resolve in #1016 |
| AUTH-01 | P1 | Frontend surfaces still infer behavior from roles in multiple places | Define capability policy in #1017; remove per screen |
| ROUTE-01 | P1 | Most application destinations are React state, not canonical routes | Define in #1018; implement Home subset in #1027/#1030 |
| STATE-01 | P1 | Server, URL, UI, and offline state are intermingled in `App.jsx` | Define in #1019; extract per screen |
| INV-01 | P1 | No complete inventory of direct Supabase and local-storage dependencies by screen | Resolve in #1021 |
| HOME-01 | P1 | Home computes next game/readiness/action behavior in the frontend | Replace through #1022-#1024 |
| HOME-02 | P1 | Home navigation uses `loadTeam()` plus tab setters/timers | Replace Home entry points through #1027/#1030 |
| HOME-03 | P1 | Home has no formal private API snapshot cache contract | Resolve through #1026/#1031 |
| PERF-01 | P1 | Home aggregation has no query-count, payload, or p95 budget | Establish and test in #1025 |
| TEST-01 | P1 | No full mixed-role, multi-team Home contract matrix | Add in #1025/#1032 |
| TEST-02 | P1 | No canonical deep-link auth-resume/cross-team browser suite | Add in #1032 |
| A11Y-01 | P1 | New Team Hub needs explicit focus, touch-target, and screen-reader proof | Add in #1028/#1032 |
| OBS-01 | P1 | No shared request-ID/error/latency telemetry contract across screens | Define in #1020; implement in Home |
| DOC-01 | P1 | Product/architecture docs do not yet describe this ownership model | This baseline plus Phase 0 reconciliation |
| DOC-02 | P1 | `FEATURE_MAP.md`, `ROADMAP.md`, and solution-design references will drift unless updated per rollout | Required in #1033 |
| MONO-01 | P2 | `App.jsx` remains a structural risk and integration choke point | Extract migrated screens; coordinate with #943 |
| DATA-01 | P1 | Broad `team_data` document upserts remain in client paths | Replace only during the owning screen's command migration |
| DATA-02 | P1 | Roster identity historically relies on names, complicating player resource URLs | Resolve before granular Roster command APIs |
| OFFLINE-01 | P1 | No general versioned offline mutation queue/conflict model | Define in Phase 0; implement when first needed by Roster/Game Day |
| GRANT-01 | P1 | Database grants cannot be tightened until all callers leave direct paths | Defer per table until replacement proof and live verification |
| LEGACY-01 | P1 | Compatibility adapters and old Home must coexist during rollout | Retire only through a separate post-soak change in #1033 |
| PACKAGE-01 | P2 | Router/server-state library choice is unresolved | Decide from Phase 0 requirements; do not add a dependency by reflex |

## 20. Documentation update obligations

### Phase 0

- This document becomes the baseline architecture reference.
- Add or reconcile an architecture decision record if the repo's convention requires a separate ADR.
- Update `DOC_TEST_DEBT.md` with verified debt from the inventory.
- Reconcile `MASTER_DEV_REFERENCE.md` where operating rules need a stable pointer.
- Add a `FEATURE_MAP.md` row when the architecture becomes a user-facing capability rather than planning only.
- Record the initiative and execution waves in `ROADMAP.md` when implementation enters the roadmap.

### Phase 1 implementation

- Update `FEATURE_MAP.md` for API-driven Home, multi-team Team Hub, and deep-link coverage.
- Update `ROADMAP.md` with shipped stories, PRs, validation, and rollout state.
- Update `DOC_TEST_DEBT.md` for closed and remaining gaps.
- Update the live solution-design document with Home endpoint, route resolver, capability assembly, and cache behavior.
- Update `MASTER_DEV_REFERENCE.md` with deep-link and rollback operations if they become operationally relevant.
- Update FAQs only for user-visible navigation or role behavior that needs support guidance.
- Update analytics documentation with new Home events and properties.
- Update `frontend/CLAUDE.md` and `backend/CLAUDE.md` only when their architecture, commands, route inventory, or test baselines actually change—and only with applicable approval.
- Update release notes and version history at the release boundary.

### Each later screen

- Update the screen's API contract and capability map.
- Reconcile direct-Supabase and local-storage inventory.
- Document offline behavior and command retry semantics.
- Add the screen's contract, authorization, route, component, and browser tests.
- Remove replaced debt only after production proof.

## 21. Governance and approval constraints

- Every implementation change begins with a GitHub issue and an approved feature/fix branch.
- `App.jsx` requires the literal phrase: `all clear — App.jsx editing approved`.
- Game Mode files require: `all clear — game-mode editing approved`.
- ScoringMode files require: `all clear — ScoringMode editing approved`.
- Package changes require their applicable package approval.
- Push authorization is separate from edit authorization.
- RED evidence is required before behavioral fixes; use mutation proof only when normal RED is unavailable.
- Worktrees owned by other sessions must not be switched, cleaned, rebased, or modified.
- Database migrations and grant changes require environment-specific verification and authorization.
- No production promotion occurs without the normal Ship Gate and explicit push authorization.

## 22. Phase 1 definition of done

API-driven Home is complete when:

- `GET /api/v1/home` drives the authenticated Home screen.
- Multiple teams and mixed roles render correctly.
- Exactly one team is expanded.
- Every CTA has explicit team context.
- Every CTA uses a canonical backend-provided destination.
- Refresh and auth resume preserve the correct team/resource.
- Previously active local state cannot override route context.
- Backend capability checks control action discovery.
- Destination and command layers reauthorize independently.
- Cached Home remains useful during latency or disconnection.
- Newly created membership-backed teams remain visible after refresh.
- Role revocation and access loss are safe and explicit.
- Contract, authorization, component, route, accessibility, and browser tests pass.
- Preview is verified at representative mobile widths.
- Rollout is feature-flagged and reversible.
- Documentation and analytics are current.
- Legacy Home remains available through the defined production soak.
- Legacy retirement occurs in a separate, evidence-backed change.

## 23. Decision log

| Date | Decision |
|---|---|
| 2026-09-02 | Name the initiative **API-Driven Architecture Redesign**. |
| 2026-09-02 | Begin with Home as the reference vertical slice. |
| 2026-09-02 | Use the Team Hub model with exactly one expanded team. |
| 2026-09-02 | Every action must carry team context and resolve through a canonical deep link. |
| 2026-09-02 | Backend owns capabilities and action discovery; destination/command layers reauthorize. |
| 2026-09-02 | Preserve offline resilience; local cache is not authority. |
| 2026-09-02 | Migrate later screens independently using the Home patterns. |
| 2026-09-02 | Rollout and legacy retirement are separate changes. |

## 24. Change control

Changes to this baseline should record:

1. The decision being changed.
2. New live evidence or constraint.
3. Impacted stories, contracts, tests, and documentation.
4. Migration and rollback consequences.
5. Approval required for affected locked paths, database changes, or releases.

## 25. Phase 0 HTTP and compatibility standard

This section is normative for every `/api/v1` screen migration.

### 25.1 Success, errors, and request identity

- Successful reads return the resource/read model directly, with `version` and
  `generatedAt` in the representation. Successful commands return the new
  authoritative representation plus its revision.
- Every request accepts a caller-generated `X-Request-ID` that matches
  `^[A-Za-z0-9._:-]{1,128}$`; the backend generates one when absent or invalid.
  `X-Request-ID` is returned on successes, `304` responses, and errors.
- Errors use the section 8.4 envelope. `code` is stable and machine-readable;
  `message` is safe for a user or support log; `retryable` is authoritative for
  automated retry decisions. Validation errors may add field-level `details`
  but must not echo secrets or sensitive payloads.

| Status | Meaning | Example stable code | Client behavior |
|---:|---|---|---|
| 400 | Malformed input or unsupported API version | `VALIDATION_FAILED`, `API_VERSION_UNSUPPORTED` | Correct the request; do not retry unchanged. |
| 401 | Missing, expired, or malformed authentication | `AUTH_REQUIRED`, `TOKEN_INVALID` | Restore/refresh auth once, then stop or resume the pending route. |
| 403 | Authenticated but not authorized for the team/resource/action | `TEAM_ACCESS_DENIED`, `CAPABILITY_DENIED` | Fail closed; never substitute another team. |
| 404 | Resource absent or deliberately concealed across a trust boundary | `RESOURCE_NOT_FOUND` | Show the safe destination error; do not infer ownership. |
| 409 | Current state conflicts with the command | `STATE_CONFLICT`, `IDEMPOTENCY_CONFLICT` | Refresh authoritative state before a user-led retry. |
| 412 | `If-Match` revision is stale | `REVISION_STALE` | Fetch the latest representation and reconcile explicitly. |
| 422 | Shape is valid but a domain rule rejects it | `DOMAIN_RULE_FAILED` | Show the safe reason; do not retry unchanged. |
| 429 | Rate limit exhausted | `RATE_LIMITED` | Honor `Retry-After`; bounded retry only for safe reads. |
| 500 | Unexpected server failure | `INTERNAL_ERROR` | Preserve cached UI; retry only under the policy below. |
| 503 | Dependency unavailable or warming | `SERVICE_UNAVAILABLE` | Preserve cached UI and use bounded backoff. |
| 504 | Server/dependency deadline exceeded | `UPSTREAM_TIMEOUT` | Treat outcome as unknown for commands; never blindly replay. |

### 25.2 Deadlines and retries

- Home/read requests use a 5-second client deadline in foreground navigation and
  a 3-second deadline for shadow reads. Abort superseded requests immediately.
- Retry GET/HEAD at most twice for network failure, `429`, `503`, or `504`, using
  jittered backoff and `Retry-After` when present. Do not retry `400`, `401`,
  `403`, `404`, `409`, `412`, or `422` unchanged.
- Mutating requests are never automatically retried unless the endpoint requires
  and has received an `Idempotency-Key`. A timeout after a command is an unknown
  outcome: query by idempotency key or refetch the resource before retrying.
- Offline detection short-circuits network retries and selects the documented
  cache/offline state. Reconnection triggers revalidation, not queued command
  replay unless that command has a separately specified offline protocol.

### 25.3 Idempotency and optimistic concurrency

- Duplicate-sensitive POST/PATCH commands require an opaque, unpredictable
  `Idempotency-Key` scoped to authenticated user, endpoint, and canonical team.
- Reuse with the same normalized request returns the original status/body;
  reuse with a different request returns `409 IDEMPOTENCY_CONFLICT`.
- Records persist long enough to cover client retry and offline-reconnect windows;
  the endpoint contract states the exact retention period before implementation.
- Mutable resources expose a strong revision through `ETag` and the response
  body. Unsafe overwrites require `If-Match`; missing preconditions return `428
  PRECONDITION_REQUIRED`, stale revisions return `412 REVISION_STALE`.

### 25.4 Private caching and version compatibility

- Authenticated responses use `Cache-Control: private, no-cache` and `Vary:
  Authorization`. Browser/shared-CDN storage is not an authorization boundary.
- Reads may return `ETag`; matching `If-None-Match` returns `304` with request ID
  and cache headers but no body.
- Persistent frontend snapshots are partitioned by authenticated user ID and
  contract version. Logout removes or makes prior-user snapshots unreachable.
- Additive fields are backward compatible within `/api/v1`; clients ignore
  unknown fields. Removing/renaming fields or changing meaning requires a new API
  version or a measured compatibility window. The server rejects versions it
  cannot safely serve with `400 API_VERSION_UNSUPPORTED`.
- Deprecation requires caller telemetry, a published sunset boundary, and proof
  that supported clients no longer depend on the old contract.

## 26. Canonical role and capability policy

The live normalization boundary is `backend/src/lib/normalizeRole.js`. The
database currently tolerates seven historical values, while API policy always
normalizes them before capability evaluation:

| Stored or submitted value | API role | Product label |
|---|---|---|
| `admin`, `team_admin` | `admin` | Team Admin / Head Coach |
| `coach`, `coordinator` | `coach` | Coach / Coordinator |
| `scorekeeper` | `scorekeeper` | Scorekeeper |
| `viewer`, `parent` | `viewer` | Team Member / Parent |
| `platform_admin` | forbidden as a team role | Global capability evaluated separately |

Unknown roles fail closed with `ROLE_UNKNOWN`; `platform_admin` at a team-role
boundary fails with `ROLE_FORBIDDEN`. Only `status=active` memberships contribute
team capabilities. Invited, suspended, inactive, revoked, missing, or
un-normalizable memberships advertise no team actions.

### 26.1 Capability vocabulary and baseline matrix

`V` means discover/view, `M` means mutate/manage, and `-` means the capability is
not advertised by default. Resource state can further remove or disable an
action; it can never add a role capability.

| Domain | Capability | Admin | Coach | Scorekeeper | Viewer |
|---|---|:---:|:---:|:---:|:---:|
| Team | `team.view` | V | V | V | V |
| Team | `team.manage` | M | - | - | - |
| Membership | `membership.manage` | M | - | - | - |
| Roster | `roster.view` | V | V | V | V |
| Roster | `roster.manage` | M | M | - | - |
| Schedule/practice | `schedule.view` | V | V | V | V |
| Schedule/practice | `schedule.manage` | M | M | - | - |
| Lineup | `lineup.view` | V | V | V | V |
| Lineup | `lineup.create`, `lineup.manage`, `lineup.lock` | M | M | - | - |
| Game Mode | `game.view_mode` | V | V | V | V |
| Game Mode | `game.start_mode` | M | M | M | - |
| Scoring | `scoring.view` | V | V | V | V |
| Scoring | `scoring.claim`, `scoring.record` | M | M | M | M* |
| Scoring | `scoring.finalize` | M | M | M | - |

`*` Scoring is ultimately a per-game capability and lock, not merely a team-role
shortcut. A viewer/parent may claim scoring only when the specific game policy
allows it. The Home response must not advertise that action from role alone.

This is the restrictive Phase 0 baseline for new APIs, not permission to narrow
legacy production behavior silently. Before implementing each domain, compare
the matrix with live UI behavior, RLS, and product intent; record any compatible
exception or update this decision explicitly.

### 26.2 Three authorization checkpoints

1. **Discovery:** Home returns capabilities and enabled/disabled actions derived
   from verified identity, active normalized membership, and resource state.
2. **Destination:** Opening an href re-verifies membership and nested resource
   ownership. Possessing an advertised or cached href grants nothing.
3. **Command:** The mutating endpoint independently re-verifies identity,
   membership, capability, current resource state, revision, and idempotency.

Global platform-administration capability is evaluated outside this team matrix
and does not imply membership in every team. Cross-team IDs are rejected or
concealed even when the caller holds a capability on a different team.

### 26.3 Reusable authorization fixtures

Every migrated API supplies fixtures for canonical and legacy inputs, all
membership states, every matrix role, global-admin-without-membership, mixed
roles across multiple teams, revoked access, cross-team nested resources, and
resource states that disable otherwise permitted actions. Tests assert both the
capability list and the independently reauthorized destination/command result.

## 27. Canonical route and deep-link contract

The paths in section 6.2 are the canonical application vocabulary. IDs are
opaque path segments, decoded once, length/character validated, and never used
as display text. Query parameters may hold presentation filters but may not
replace required `teamId`, `gameId`, or `lineupId` identity.

### 27.1 Resolution rules

1. Parse and validate the URL before reading cached active-team state.
2. Preserve the full internal destination as `pendingDestination` when an auth
   session is required. Accept only same-origin `/app...` paths; reject external
   URLs and encoded redirects.
3. Restore or obtain authentication, then replace the login callback URL with
   the preserved canonical path without adding a duplicate history entry.
4. Verify active membership for `teamId`; then verify every nested resource
   belongs to that same team; then load destination data.
5. Cache/UI state may hydrate the verified route team but may never replace it.
6. A legacy adapter explicitly calls the existing team-load boundary for the
   verified route team before selecting the legacy tab/subtab. Timers and the
   previously active team are not route authority.

### 27.2 Navigation and failure behavior

- Direct open, refresh, and PWA restart resolve the same canonical resource.
- Home-to-destination navigation pushes one history entry. Browser Back returns
  to `/app` and restores the team encoded in Home navigation state as the
  expanded card; Forward re-resolves the destination authoritatively.
- Team-card expansion and `All teams` filtering are replace-state UI choices,
  not new resource destinations and not active-team mutations.
- Malformed IDs return a safe invalid-link state. Missing resources return `404`.
  Inactive/revoked membership returns `403` and removes that team from current
  private caches. Cross-team nested IDs fail without revealing which ID exists.
- Concurrent navigations cancel prior fetches; only the latest route generation
  may commit server state. A late Team A response cannot overwrite Team B.
- Logout clears the pending authenticated destination unless logout was caused
  by an explicit auth-refresh flow that is permitted to resume it.

Existing public share entry (`?s=<share-id>`) remains a separate, unauthenticated
route evaluated before the application auth gate. It is not rewritten under
`/app`, does not consume `ui:activeTeam`, and receives regression coverage in
every routing release.

## 28. Frontend state and cache boundary

| Category | Examples | Authority | Persistence |
|---|---|---|---|
| URL state | team, destination, game, lineup | Current canonical URL after validation | Browser history |
| Server state | identity, memberships, summaries, roles, capabilities, resources | Latest authorized API response | Memory plus identity-private versioned snapshot where specified |
| UI state | expanded team, filter, dialog, focus, draft input | Current React feature shell | Memory; selected harmless preferences only |
| Offline/sync state | cachedAt, fetchedAt, pending command, conflict, last error | Sync protocol metadata, never permission | Versioned local storage/IndexedDB boundary |

Home uses stale-while-revalidate. A matching private snapshot may render
immediately with `generatedAt`, `fetchedAt`, contract version, user ID, and stale
status. Network success atomically replaces it. Membership/auth changes,
contract-version mismatch, explicit access denial, or logout invalidate it.
Focus/reconnect triggers revalidation; it does not turn stale capabilities into
current authorization. The initial target is a 60-second fresh window and a
24-hour stale display window, subject to measured tuning; older snapshots are
unavailable, not silently accepted.

Optimistic UI is allowed for reversible presentation choices and commands whose
contract defines rollback plus reconciliation. Team expansion is local and
immediate. Permission, membership, route ownership, lineup finalization, and
scoring-session ownership are never optimistically invented. Unknown command
outcomes refetch before allowing replay.

Each request owns an `AbortController` and monotonically increasing generation.
Route change, team change, logout, or component disposal aborts obsolete work;
response application also checks identity, route key, and generation so a late
response cannot cross users or teams.

The reusable client is deliberately narrow: base URL, bearer token, request ID,
JSON/error-envelope parsing, deadline/abort, retry classification, ETag support,
and typed endpoint modules. It does not own React rendering, navigation policy,
role inference, global state, toast copy, or a new data-framework dependency.
Adopt a broader library only through a separate evidence-backed package decision
and the package-file approval gate.

## 29. Cross-cutting graduation gate

Every migrated surface must attach an evidence record to its story/PR. A checked
box without the named artifact does not satisfy this gate.

| Gate | Required evidence |
|---|---|
| Contract | Schema validation for success/error/`304`, supported-version compatibility, and payload fixture snapshots. |
| Authentication | No token, malformed/expired token, refresh/resume, logout, and identity-private cache separation. |
| Authorization | Canonical/legacy role matrix, inactive/revoked membership, global admin without membership, and destination/command reauthorization. |
| Isolation | Wrong-team cache plus cross-team game/lineup IDs prove no existence or data leakage. |
| Routing | Direct open, refresh, auth resume, Back/Forward, restart, invalid IDs, and unchanged public share link. |
| Offline/resilience | Cold offline, cached offline, slow backend, retry exhaustion, reconnect/revalidate, cache-version mismatch, and unknown command outcome. |
| Concurrency | Aborted/superseded navigation, stale response suppression, `If-Match`, and idempotency replay/conflict. |
| Accessibility | Keyboard/focus order, semantic names/status announcements, contrast, reduced motion where applicable, and 44px targets at representative mobile widths. |
| Observability | Structured request/result telemetry verified without token, child, roster, schedule-detail, or free-text PII. |
| Regression | Existing surface golden paths, offline Game Day, and unauthenticated share links remain green. |

Behavioral tests record the failing RED output before implementation and GREEN
output after it. When pre-existing correct behavior prevents normal RED, mutate
one relevant boundary, capture the failure, restore it, and capture GREEN.

### 29.1 Telemetry and analytics convention

Backend logs include timestamp, environment, API/contract version, request ID,
route template, status, stable error code, retryability, total/query latency,
query count, team count, payload bytes, cache/ETag result, and rollout cohort.
Raw IDs may be one-way hashed for comparison; child names, roster contents,
tokens, email, schedule details, and arbitrary request bodies are prohibited.

Analytics distinguish `source=cache|network`, `cache_state=fresh|stale|miss`,
`network_state=online|offline|timeout|error`, route-resolution outcome, denial
reason code, fallback reason, and flag/cohort state. Shadow telemetry records
field-level mismatch categories and counts, not full compared payloads.

### 29.2 Budgets and evidence thresholds

- Home server processing: p95 below 300 ms under representative ten-team data.
- Home payload: below 50 KB uncompressed for ten teams; no roster/grid/history or
  scoring-state payloads.
- Query count is bounded and constant by query class as team count grows; tests
  fail on per-team amplification.
- Cached returning Home paints useful content within 300 ms on a representative
  mobile device; route changes promptly abort obsolete work.
- Accessibility has zero serious/critical automated findings plus manual focus,
  screen-reader label, and touch-target verification.
- Rollout advances only when the cohort has no confirmed cross-team exposure or
  auth bypass, error/latency/fallback trends meet the story's recorded threshold,
  and shadow mismatches are understood or accepted explicitly.

Each rollout boundary records commit SHA, flag values/cohort, environment,
deployment SHA, test/preview evidence, telemetry window and query, observed
thresholds, decision, rollback owner/action, and soak start/end. Legacy retirement
additionally requires caller-usage evidence and live database grant/policy checks.

**Status update, 2026-09-04 ([#1072](https://github.com/kaushikkuberanathan/lineup_generator/issues/1072), open):**
the Home server-processing budget above was measured against real production
data for the first time (41 real `GET /api/v1/home` requests, Render logs,
2026-09-03 to 2026-09-04) and **failed**: median 386ms, p95 816ms, both over
the 300ms target — at only 1-2 teams, well under the ten-team scenario the
budget is framed around. Root cause, confirmed directly against live infra
(not just hypothesized): the Render backend (both `lineup-generator-backend`
and `lineup-generator-dev-backend`) runs in Render's `oregon` region; both
Supabase projects (`hzaajccyurlyeweekvma` prod, `psqvzppphdedqkpmarwx` dev)
run in `us-east-1` — a cross-country hop on every Supabase call, doubled by
the route's two *sequential* round trips (`team_memberships`, then
`teams`+`team_data`, which could not start until the first round trip
returned team IDs). A same-region mismatch on both prod and dev pairs, not a
one-off — rules out a prod-only anomaly. **Partial mitigation shipped in
code, not yet deployed:** migration `034_home_read_model_rpc.sql` adds
`public.home_read_model()`, collapsing the two sequential round trips into
one RPC call; `backend/src/routes/home.js` updated to call it;
`home.route.test.js`/`homeSchema.contract.test.js` updated and passing
(361/361 backend unit). **This removes one of the two round trips, not the
underlying region mismatch** — real budget compliance likely also needs
Render/Supabase colocation, a separate infra decision (cost/downtime
implications) requiring an explicit choice, not made here. Migration 034 has
not been applied to DEV or PROD — per this repo's own migration-apply
convention (`backend/CLAUDE.md` → Migration Notes), that needs its own
explicit go-ahead before either apply, then a live re-measurement using
#1072's exact methodology to see how much of the gap it closes. See #1072
for full detail and next steps.

## 30. Live migration inventory

Inventory snapshot: repository commit `76523b7`, reconciled 2026-09-02. This is a
caller map, not authorization to remove any path. Re-run the searches for
`loadJSON|saveJSON|localStorage`, `supabase|dbLoad|dbSave`, and render/tab owners
before each migration because parallel work can change it.

### 30.1 Screen and state-owner inventory

| Surface | Current render owner | Reads and writes | Local keys | Authorization assumption and current proof | Migration wave / prerequisite |
|---|---|---|---|---|---|
| Home / multi-team cards | `App.jsx::renderHome` plus `components/Home/*` | `dbLoadTeams`, per-team `dbLoadTeamData`; team create/edit/delete; derives next game/readiness/actions in React | `app:teams`, `ui:activeTeam`, team roster/schedule/grid/locked keys, `lg_name_nudge_dismissed` | Membership filtering from `useAuth`; local data still influences visible teams/actions. App Home golden-path and membership tests exist. | **1 Home**: `/api/v1/home`, capability/action assembly, private cache, routes. Highest navigation/authority risk. |
| Account/auth/team discovery | `renderAccount`, `components/Auth/*`, `components/Home/TeamSearch` | Supabase Auth session/OAuth; backend auth `/me`, access request/profile/logout; membership refresh | `lg_team_id`, `lg_pending_email`, auth callback URL state | Backend verifies token for `/me`; public share remains outside gate. Auth/session/request-access tests exist. | **2 account/team shell**: identity/membership API and pending-destination contract after Home. |
| Team > People / Roster | `App.jsx::renderTeamPeopleTab` → `renderRoster` | `teams`, broad `team_data.roster` load/upsert, `roster_snapshots`; local-first edits | `team:<id>:roster`, `attendanceOverrides` | UI role/membership checks plus RLS; player name remains legacy identity. Roster golden-path, persistence, snapshot, RLS tests exist. | **3 roster**: player identity decision, granular roster commands, offline conflict/revision protocol. |
| Team > Schedule (games) | `App.jsx::renderPrimaryScheduleTab` → `renderSchedule` | broad `team_data.schedule` load/upsert; finalization helper/pending sync also writes `team_data` | `team:<id>:schedule`, `pending_sync:<id>:finalize`, `ignoredWarnings_<date>` | Team context comes from active local team; RLS protects direct writes. Schedule/finalization/hydration tests exist. | **4 schedule/practices**: event IDs, read API, granular commands, offline queue. |
| Team > Practices | `renderPrimaryScheduleTab` / practice controls in `App.jsx` | broad `team_data.practices` upsert | `team:<id>:practices` | Same active-team/RLS boundary as schedule. Practice/isolation tests exist. | **4 schedule/practices**: shared event contract and offline writes. |
| Team > Snack duty | `App.jsx::renderSnackDuty` | snack assignments embedded in schedule and broad `team_data.schedule` upsert | `team:<id>:schedule` | Active-team state and RLS; bidirectional schedule/snack handlers. Schedule tests are partial proof. | **4 schedule/practices**: event-scoped command and conflict behavior. |
| Game Day > Lineups > Defense | `renderLineups` → `renderGrid` | broad `team_data.grid`, innings, locked and PIN fields; lineup generation derives from roster | `team:<id>:grid`, `:innings`, `:locked`, `:pin`, `:roster` | App/PIN checks and RLS; local state is offline authority for work-in-progress. Engine, grid, PIN and App golden-path tests exist. | **5 lineups**: versioned lineup resource, lock/revision commands, offline reconciliation. |
| Game Day > Lineups > Batting | `renderLineups` → `renderBatting` | broad `team_data.batting_order` upsert | `team:<id>:batting`, `:batterIndex`, `:roster` | Active-team state and RLS; lineup lock gates UI. Engine/batting/attendance tests exist. | **5 lineups**: shares lineup resource/revision and offline protocol. |
| Game Day > Songs | `App.jsx::renderSongs` | roster walk-up-song fields through broad roster/team-data update | `team:<id>:roster` | Active-team state and roster permissions inferred in legacy UI. Songs golden-path exists. | **7 remaining tabs**, unless roster migration absorbs song-field commands. |
| Game Mode | `components/game-mode/DugoutView` and children | local lineup/game state plus scoring hooks; direct realtime scoring reads | `team:<id>:gameModeInning`, lineup keys | Must remain offline-capable; game-mode directory is locked. DugoutView/GameMode component tests exist. | **6 Game Mode/scoring**: game route/resource, offline event protocol; literal edit approval. |
| Live scoring | `useLiveScoring`, `useLiveScore`, `components/ScoringMode/*` | direct `live_game_state`, `game_scoring_sessions`, `scoring_audit_log` reads/writes/realtime | component/hook state plus team game context | Membership/RLS and per-game scorer lock; ScoringMode directory is locked. Scoring, hook, RLS tests exist. | **6 Game Mode/scoring**: idempotent event API, lock, replay, audit; literal edit approval. |
| Public share viewer | `App.jsx` share branch plus shared/game-mode viewer components | direct `share_links` read; share creation writes `share_links` | payload/session presentation only; `?s=<id>` is URL identity | Intentionally unauthenticated and evaluated above auth gate. Share-link tests and health smoke exist. | Preserve throughout; migrate only with an explicit public contract and regression proof. |
| More > Feedback | `App.jsx::renderFeedback` | backend feedback routes; local fallback queues | `feedback:submissions`, `feedback:bugs` | Backend auth/validation varies by submission type. Backend feedback tests exist. | **7 remaining tabs**: reconcile queue/retry semantics; no API merely for static UI. |
| More > Account/Help/About/Legal | `renderAccount`, `renderAbout`, Support/Legal components | auth/profile API for Account; bundled content/external links for static views | PWA/first-launch/consent and harmless preference keys | Account uses authenticated identity; static/legal/help need no domain API. Auth and component tests provide partial proof. | **2 Account** for identity actions; **7** or no migration for static content. |

### 30.2 Direct frontend Supabase caller inventory

| Caller | Tables/service | Classification and retirement condition |
|---|---|---|
| `frontend/src/supabase.js` consumed heavily by `App.jsx` | `teams`, `team_data`, `roster_snapshots`, `share_links` | High-risk broad screen orchestration. Retire per owning screen only after API, offline, shadow/production, and caller-usage proof. Preserve public share semantics. |
| `hooks/useAuth.js`, `Auth/LoginScreen.jsx`, direct session reads in `App.jsx` | Supabase Auth | Supported authentication SDK boundary, not a data-authorization shortcut. May remain while backend APIs verify bearer tokens. |
| `hooks/useFeatureFlag.js`, `hooks/useFeatureFlags.js` | `feature_flags` | Configuration read/write path. New migration flags must fail Off; admin mutation stays backend-authorized. Revisit with rollout service design. |
| `utils/finalizeSchedule.js`, `utils/pendingFinalizationSync.js` | `team_data` | High-risk schedule write/retry path. Replace in Schedule wave with idempotent event command and explicit offline reconciliation. |
| `hooks/useLiveScoring.js`, `hooks/useLiveScore.js` | scoring state/session/audit plus Realtime | Game-critical and offline/realtime-sensitive. Do not remove before dedicated Game Mode/scoring protocol, soak, and locked-path approval. |
| `components/ScoringMode/RestoreScoreModal.jsx` | scoring state | Game recovery read. Migrate only with the same scoring-state read/replay contract. |

### 30.3 Local persistence key registry

| Key/pattern | Current owner | Authority classification / retirement rule |
|---|---|---|
| `app:teams` | App bootstrap/Home | Legacy cached team list; never membership authority. Replace Home usage with user-private versioned snapshot. |
| `ui:activeTeam` | App navigation/loadTeam | Legacy convenience only; canonical route wins. Retire after all destination adapters stop reading it. |
| `team:<id>:roster|schedule|practices|batting|grid|innings|locked|pin` | Team, Schedule, Lineups | Offline/domain cache and drafts. Migrate field-by-field with owning screen; do not bulk-delete. PIN treatment requires separate security review. |
| `team:<id>:batterIndex|gameModeInning` | Game Day/Game Mode | Transient game progress needed offline; retain until game protocol proves replacement. |
| `attendanceOverrides`, `ignoredWarnings_<date>` | Game Day readiness | Local game-day behavior; use local calendar dates and reconcile during Schedule/Game Mode waves. |
| `pending_sync:<id>:finalize` | schedule finalization sync | Unsynced command marker; replace only with idempotency/status-query proof. |
| `lg_team_id`, `lg_pending_email`, pending destination | auth/access flow | Discovery/auth-resume hints only; never grant access. Partition/clear on identity change as applicable. |
| `flag:*`, `flag_*`, `bypass:maintenance`, dev `auth_bypass` | rollout/dev bootstrap | Configuration only. Migration flags default Off; dev bypass remains DEV-only. `flagBootstrap.js` is locked. |
| `feedback:submissions`, `feedback:bugs` | feedback fallback | Retry queue; document expiry/dedup before migration. |
| `app:first_launched`, `pwa_installed`, `lg_name_nudge_dismissed` | onboarding/PWA/Home UI | Harmless preferences/telemetry, not authorization. |

### 30.4 Locked paths, worktree risks, and waves

Locked integration paths include `frontend/src/App.jsx`,
`frontend/src/components/game-mode/*`, `frontend/src/components/ScoringMode/*`,
`frontend/src/utils/migrations.js`, `frontend/src/utils/formatters.js`,
`frontend/src/utils/flagBootstrap.js`, both package files, and `CLAUDE.md` files;
each retains its literal approval phrase. `App.jsx` and the frontend package can
also carry `skip-worktree`, so verify index flags before trusting a missing diff.

Registered worktrees at this snapshot include the initiative owner, develop UX,
release, scoring-security, two detached read/reconciliation trees, and this
isolated Codex tree. Fresh status/branch/worktree inspection is required before
every mutation; no other worktree may be switched, cleaned, rebased, or edited.

The evidence-backed order remains: Home; Account/team shell; Roster;
Schedule/practices/snacks; Lineups; Game Mode/scoring; remaining dynamic tabs;
then legacy retirement. Static content stays bundled unless a real server-owned
requirement appears. Every wave requires its read API/capability/route contract
first and its named offline behavior before replacing a direct path.
