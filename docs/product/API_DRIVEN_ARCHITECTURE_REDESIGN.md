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

Use an `API_DRIVEN_HOME` feature flag with a tested legacy fallback.

### Stage 1 — Local development

- Contract and service implementation
- Component implementation
- Focused unit and contract tests
- Browser-route verification

### Stage 2 — Preview

- Authenticated preview deployment
- Multi-team and mixed-role fixtures
- Mobile browser validation
- Existing share-link regression validation

### Stage 3 — Internal cohort

- Internal/admin account
- Mud Hens and representative multi-team accounts
- Review latency, errors, denials, cache usage, and navigation outcomes

### Stage 4 — Limited authenticated cohort

- Small opted-in/default-enabled cohort
- Legacy fallback remains available
- Monitor access loss, stale cache, and route-resolution failures

### Stage 5 — Default on

- Enable for all authenticated users after acceptance thresholds are met
- Preserve kill switch and legacy Home through a defined soak

### Stage 6 — Legacy retirement

- Separate later change after production evidence
- Remove replaced Home orchestration and direct Home-specific paths
- Reconcile local-storage keys and compatibility adapters
- Tighten database grants only after deployed callers no longer depend on them

Normal Ship Gate, preview, soak, explicit push authorization, production smoke, and reverse-sync rituals remain required.

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
