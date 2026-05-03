# frontend/CLAUDE.md

Frontend-specific guidance for Claude Code sessions working in the `frontend/` directory.
Root project rules (branch strategy, Ship Gate, auth principle, deployment, git discipline) live in `CLAUDE.md` at the repo root.

---

## Commands

```bash
npm run dev          # Dev server at http://localhost:5173
npm run build        # Production build to dist/
npm run lint         # ESLint with --max-warnings 0 (strict)
npm test             # Run Vitest regression suite (vitest run)
npm run test:watch   # Watch mode for TDD
npm run test:ui      # Browser UI (vitest --ui)
```

---

## Frontend Structure

All UI and business logic lives in `frontend/src/App.jsx` (~5,000 lines). Extracted modules: `migrations.js`, `formatters.js`, `flagBootstrap.js`, `versionHistory.js` (imported by App.jsx).

Key sections within App.jsx:
- **~1–457**: Constants (SKILLS, TAGS, BAT_SKILLS, position colors, field layouts)
- **~458–720**: Lineup engine (`scorePosition`, `autoAssign`)
- **~720–900**: Helper functions (`validateGrid`, `initGrid`, etc.)
- **~900–1197**: State initialization and Supabase hydration
- **~1197+**: JSX render (tabs: Roster, Defense, Batting, Schedule, Print, Share, Links, Feedback, About)

---

## Lineup Engine

Located at App.jsx ~458–720. Two-phase auto-assign algorithm:
1. **Bench selection**: Players beyond 10 benched using bench equity logic
2. **Field assignment**: Outfield first (LC→RC→LF→RF), then infield most-constrained-first, using 8 scoring layers. Runs 8 attempts with shuffled player order; returns best result (fewest violations).

---

## Live Scoring Architecture

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

#### Auth shims (remove at Phase 4C cutover)

- `frontend/src/hooks/useLiveScoring.js` — `_effectiveUserId`/`_effectiveUserName` fallback block (marked `AUTH TESTING SHIM`)
- `frontend/src/components/ScoringMode/index.jsx` — `scoringUserId`/`scoringUserName` fallback + `isAdminTestMode`; also remove `|| true` from `var isEnabled = liveScoringEnabled || true`

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

- **Framework**: Vitest
- **CI target**: 452 passed / 1 skipped / 0 failed (as of v2.5.5, May 2, 2026)
- **Known skip**: engine.v2 test 2.3 (7-player roster produces no warning — fix in separate session)

#### Test files

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

#### Rules

- Never use `kaushik.kuberanathan@gmail.com` in automated test suites (Supabase rate limits OTP per address)

#### Test-First Discipline (RED → GREEN)

New tests must fail before the fix is applied. RED output is a required deliverable, not an implementation detail.

#### RED Checkpoint — non-negotiable

Any Claude Code prompt that includes a test-first step must produce explicit RED output as a deliverable before the fix step.

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

#### Current flags

| Flag | Default | Description |
|---|---|---|
| `USE_NEW_LINEUP_ENGINE` | `true` | V2 scoring engine (not overridable) |
| `MAINTENANCE_MODE` | `false` | Show maintenance screen during deploys |
| `VIEWER_MODE` | `false` | Read-only swipeable inning cards; Share Viewer Link button |
| `GAME_MODE` | `true` | Full-screen game day mode |
| `ACCESSIBILITY_V1` | `false` | Font floors, touch targets, contrast uplift, aria labels |
| `SCORING_SHEET_V2` | `true` | Outcome sheet semantic cleanup: Foul→PITCH OUTCOME, Strikeout removed, opp-half +1 buttons hidden |

---

## Error Boundaries

All major sections wrapped with `<ErrorBoundary>` (`src/components/Shared/ErrorBoundary.jsx`). On crash: renders inline amber fallback card instead of white-screening.

**Rule**: Wrap new components at the call site in App.jsx — NOT inside the component definition. Do NOT wrap nav bar, tab bar, or top-level app shell.

---

## UI Primitives

Reusable components in `frontend/src/components/ui/`. Use these instead of one-off inline implementations.

**Toast** (`src/components/ui/Toast.jsx`) — Transient notifications use the Toast primitive. Top-anchored below safe-area inset (`env(safe-area-inset-top, 0px) + 8px`), `role=status` + `aria-live=polite`, ≥44×44px tap targets, auto-dismiss with hover/focus pause, optional action button. Do not implement custom fixed-position notification divs — wire to Toast instead.

---

## Date Keys in localStorage

Any date used as a localStorage lookup key (e.g. attendanceOverrides) MUST use local calendar date, NOT `toISOString()` which returns UTC. Evening games in ET are after midnight UTC — `toISOString()` returns tomorrow's date, breaking key lookups.

Correct pattern:
```js
var _td = new Date();
var todayDate = _td.getFullYear() + '-'
  + String(_td.getMonth() + 1).padStart(2, '0') + '-'
  + String(_td.getDate()).padStart(2, '0');
```

`toISOString()` is acceptable ONLY for cleanup thresholds and filename timestamps where 1-day drift is irrelevant.

---

## Known Platform Limitation — Android PWA Screenshots

Screenshots are blocked on Android when the app is installed as a PWA in standalone mode. This is an OS-level restriction — not a code issue. No web-level fix exists without degrading the full-screen coaching UX (switching display to "browser" mode would break Game Mode).

Resolution: closed as won't-fix. Workaround: use Share Link feature. iOS screenshots work normally.

Do not spend time debugging this. It cannot be fixed in web code.
