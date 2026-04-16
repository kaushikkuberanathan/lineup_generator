# Dugout Lineup — Doc & Test Debt Ledger

> **Purpose:** Running ledger of known documentation and test coverage gaps. The debt backlog — not the backlog of features, but the backlog of things that *should* be documented or tested and aren't.
> **Rule:** Items over 30 days old must be addressed or explicitly deferred (with a reason) before the next minor version bump (x.Y.0).
> **Cadence:** Scanned every Friday (~5 min) during the weekly audit. Grown from FEATURE_MAP.md gaps and from session retros.
> **Owner:** KK (solo).

---

## How to Use This File

1. **When a gap is identified** (during a feature session, an audit, or a retro) — add a row here with priority, age, and target version.
2. **When a gap is resolved** — move the row to the Resolved section at the bottom with the resolution version and date.
3. **At every weekly audit** — bump age, re-prioritize, and escalate anything over 30 days old.
4. **At every minor version bump** — any P0 items must be resolved or explicitly deferred with justification.

**Priority definitions:**
- **P0** — blocks confidence in a North Star capability (share link, Game Mode, onboarding). Cannot ship a minor version with P0 debt open.
- **P1** — material gap in a shipped feature that could regress silently; resolve within 60 days.
- **P2** — nice-to-have coverage; resolve opportunistically, no hard deadline.

---

## Open — Test Gaps

### 🔴 P0 — Share Link Payload Integrity

| | |
|---|---|
| **Description** | No automated test validates that a share link generated from a locked lineup renders correctly in Viewer mode with (a) full defensive grid, (b) full batting order, (c) absent players filtered, (d) walk-up song links. |
| **Risk if unfixed** | Silent regression breaks the #1 Strategic North Star ("share link bulletproof"). A future refactor of `shareCurrentLineup` or `SharedView.jsx` could ship with the link returning stale or incomplete data and we would not catch it pre-deploy. |
| **Proposed test** | `frontend/src/tests/shareLink.test.js` — build a lineup fixture, call `shareCurrentLineup`, parse the `share_links.payload` JSONB, assert every expected field is present and correctly filtered. Also a DOM test that `SharedView` renders all sections without errors given the payload. |
| **Opened** | 2026-04-17 |
| **Age** | 0 days |
| **Target** | v2.2.35 |

### 🔴 P0 — Game Mode Rendering + State

| | |
|---|---|
| **Description** | No tests cover GameModeScreen rendering, inning advance, batter advance, or QuickSwap candidate filtering. The QuickSwap `onClick` regression in March 2026 (DefenseDiamond missing handlers) would not have been caught by tests. |
| **Risk if unfixed** | Silent regression breaks the #2 Strategic North Star ("Game Mode dugout-ready under pressure"). |
| **Proposed test** | `frontend/src/tests/gameMode.test.js` — render GameModeScreen with fixture lineup, simulate inning advance, simulate QuickSwap tap, assert state transitions and candidate filtering (including absent-player exclusion). |
| **Opened** | 2026-04-17 |
| **Age** | 0 days |
| **Target** | v2.2.35 |

### 🟠 P1 — Live Scoring Scorer-Lock Regression

| | |
|---|---|
| **Description** | The v2.2.29 bug — `claimScorerLock` passing raw `userId` (null under shim) and violating NOT NULL constraint — has no regression test. If the shim is removed or modified, this class of silent failure can recur. |
| **Risk if unfixed** | Scoring users silently unable to claim the role with no surfaced error — exactly what v2.2.29 had to fix in prod. |
| **Proposed test** | Add to `frontend/src/tests/scoring.test.js` — assert `claimScorerLock` rejects null `scorer_user_id` before issuing the upsert, OR asserts that the shim fallback produces a non-null value in all code paths. |
| **Opened** | 2026-04-17 |
| **Age** | 0 days |
| **Target** | v2.2.35 |

### 🟠 P1 — Auth Flow End-to-End (Magic Link + Google OAuth)

| | |
|---|---|
| **Description** | No tests cover the magic link request → callback handling → team membership hydration flow. Same for Google OAuth. |
| **Risk if unfixed** | Phase 2 auth cutover (planned) cannot ship safely without regression coverage. An auth-gate re-activation that silently blocks unauthenticated viewers would reproduce the v2.2.22 hotfix scenario. |
| **Proposed test** | `frontend/src/tests/auth.test.js` — mock Supabase client, simulate magic link flow, assert `useAuth` state transitions correctly through `pending → authenticated`. Also test: share link renders when `authState === unauthenticated`. |
| **Opened** | 2026-04-17 |
| **Age** | 0 days |
| **Target** | Before Phase 2 auth cutover (not version-pinned) |

### 🟠 P1 — Roster-Wipe Guard + Recovery Endpoint

| | |
|---|---|
| **Description** | The backend `POST /api/teams/:teamId/data` has a wipe-guard (409 on empty roster over existing). The `GET /api/teams/:teamId/history` has `X-Admin-Key` auth. Neither path is tested. |
| **Risk if unfixed** | Two roster-wipe incidents already happened (Jan, Feb 2026). The guard is the primary prevention; if it silently stops working, we're back to paper recovery. |
| **Proposed test** | `backend/src/tests/teamData.test.js` — test the guard returns 409, test force-override returns 200, test history endpoint rejects without ADMIN_KEY, test history endpoint returns snapshots with ADMIN_KEY. |
| **Opened** | 2026-04-17 |
| **Age** | 0 days |
| **Target** | v2.2.37 |

### 🟡 P2 — Walk-Up Song Navigation

| | |
|---|---|
| **Description** | No test that Songs tab filters to active players only, or that Play button invokes navigation with correct URL. Deep-link to native apps is OS-mediated (untestable at unit level) but the call site is testable. |
| **Risk if unfixed** | A future refactor of `activeBattingOrder` filtering could silently unfilter Songs view — would go unnoticed until a DJ parent complains about absent kids in the playlist. |
| **Proposed test** | Add to existing test or new `frontend/src/tests/songs.test.js` — assert Songs renders only `activeBattingOrder` players, assert Play button's href matches `player.walkUpSong.url`. |
| **Opened** | 2026-04-17 |
| **Age** | 0 days |
| **Target** | v2.2.37+ (opportunistic) |

### 🟡 P2 — PWA Install Prompt Logic

| | |
|---|---|
| **Description** | Install banner has platform branches (Android `beforeinstallprompt` vs iOS `standalone` detection vs already-installed) that are untested. |
| **Risk if unfixed** | Platform-specific install UX regressions; user confusion on a non-critical path. |
| **Proposed test** | `frontend/src/tests/pwaInstall.test.js` — mock `window.navigator.standalone`, `window.matchMedia("(display-mode: standalone)")`, and `beforeinstallprompt` event, assert correct banner variant renders. |
| **Opened** | 2026-04-17 |
| **Age** | 0 days |
| **Target** | v2.2.37+ (opportunistic) |

### 🟡 P2 — Analytics track() Wrapper + SSR Guards

| | |
|---|---|
| **Description** | `analytics.js` has SSR guards (window/navigator) added in v2.2.7/v2.2.8 but no tests cover the guard branches. |
| **Risk if unfixed** | A future refactor could remove the guard and break CI if any test environment lacks window/navigator. |
| **Proposed test** | Add to existing fixtures — assert `track()` is a no-op when window is undefined, assert `getDeviceContext()` returns safe defaults in SSR-like env. |
| **Opened** | 2026-04-17 |
| **Age** | 0 days |
| **Target** | v2.2.38+ (opportunistic) |

### 🟡 P2 — AI Photo Import End-to-End

| | |
|---|---|
| **Description** | The Claude API proxy path (schedule import, score card parse) has no integration test covering request body size limit (10mb), client-side canvas resize, or error handling. |
| **Risk if unfixed** | The v2.2.4 bug (large phone photos exceeding 5MB after base64) was a real prod incident; no regression test was added with the fix. |
| **Proposed test** | `backend/src/tests/aiProxy.test.js` — mock Anthropic API, test POST /api/ai with oversize payload returns 413, test valid payload returns parsed structure. |
| **Opened** | 2026-04-17 |
| **Age** | 0 days |
| **Target** | v2.2.37+ |

---

## Open — Doc Gaps

### 🟠 P1 — SOLUTION_DESIGN.md §Scoring Framework

| | |
|---|---|
| **Description** | Three-tier scoring framework (designed March 2026) is not documented in SOLUTION_DESIGN.md. Tier-1 ships in Live Scoring (v2.2.28+) but readers of the solution design can't find it. |
| **Proposed action** | Add a new section after §Scoring Engine (V2): "§Live Scoring Framework" covering Tier 1 (game results), Tier 2 (inning-by-inning, backlog), Tier 3 (at-bat outcomes, backlog + feature-flagged). |
| **Opened** | 2026-04-17 |
| **Target** | v2.2.37 (bundled with drift repair) |

### 🟠 P1 — SOLUTION_DESIGN.md §CI/CD Pipeline

| | |
|---|---|
| **Description** | Full CI/CD setup (ci.yml, health.yml, smoke-test.js, branch strategy, Dev environment) is operational but undocumented in SOLUTION_DESIGN.md. It's referenced in MASTER_DEV_REFERENCE.md but not explained architecturally. |
| **Proposed action** | Add a section under §Deployment & Infrastructure summarizing: branch strategy, CI jobs, smoke test scope, Dev environment URLs, and the wait-for-Render race fix. |
| **Opened** | 2026-04-17 |
| **Target** | v2.2.37 |

### 🟠 P1 — SOLUTION_DESIGN.md §Analytics Event Inventory

| | |
|---|---|
| **Description** | 32+ Mixpanel events exist but are cataloged only in `docs/analytics/ANALYTICS.md`. SOLUTION_DESIGN.md should at minimum reference ANALYTICS.md with a short pointer and the identity model. |
| **Proposed action** | Add a "§Analytics Architecture" subsection that describes the identity model (`mixpanel.identify()` on team load), super properties, and points readers to ANALYTICS.md for the full event list. |
| **Opened** | 2026-04-17 |
| **Target** | v2.2.37 |

### 🟡 P2 — SOLUTION_DESIGN.md `feature_flags` Table Schema

| | |
|---|---|
| **Description** | §Feature Flag System describes evaluation logic but doesn't include the `feature_flags` table schema that backs it (with `flag_name`, `enabled`, `team_id`, `description` columns + RLS posture). |
| **Proposed action** | Add the SQL schema block to §Feature Flag System. |
| **Opened** | 2026-04-17 |
| **Target** | v2.2.37+ |

### 🟡 P2 — SOLUTION_DESIGN.md §Test Suite Inventory

| | |
|---|---|
| **Description** | 306 tests exist across frontend and backend but there's no doc-side map of what they cover. |
| **Proposed action** | Add a §Test Suite Inventory section listing test files and what each covers; cross-reference FEATURE_MAP.md. |
| **Opened** | 2026-04-17 |
| **Target** | v2.2.37+ |

### 🟡 P2 — ROADMAP.md Feature Summary Header

| | |
|---|---|
| **Description** | ROADMAP.md is a version-by-version log; it's hard for a new reader to understand what shipped as coherent initiatives (Attendance, Live Scoring, PWA install funnel). |
| **Proposed action** | Add a "Feature Summary" section at the top of ROADMAP.md grouping v2.2.x ranges into coherent initiatives, with links to the individual version entries. |
| **Opened** | 2026-04-17 |
| **Target** | v2.2.37 |

### 🟡 P2 — ONE_PAGER.md Data Source Check

| | |
|---|---|
| **Description** | Success metrics on the 1-pager ("share link open rate >60%", etc.) are placeholder targets, not measured baselines. |
| **Proposed action** | Pull actual Mixpanel baselines for the five metrics; replace placeholder targets with evidence-based targets + 20% stretch. |
| **Opened** | 2026-04-17 |
| **Target** | v2.2.37+ |

### 🟡 P2 — Legal Content Regulatory Posture

| | |
|---|---|
| **Description** | CHARTER.md §9 mentions minimal PII and no payment data but doesn't explicitly address COPPA / child data minimization considerations given 8U audience. |
| **Proposed action** | Review legal.js content against COPPA posture; document findings in CHARTER.md governance section. If material gap found, spawn a P1 item. |
| **Opened** | 2026-04-17 |
| **Target** | v2.2.37 |

---

## Open — Tooling / Process Gaps

### 🟠 P1 — Auto-Staging Git Hook

| | |
|---|---|
| **Description** | During v2.2.31 session, a git hook silently staged files that were intentionally unstaged. The scope-creep was caught at the gate but would have shipped otherwise. |
| **Proposed action** | Investigate `.git/hooks/pre-commit`, husky config, or Claude Code hook config. Remove auto-staging. If a hook is needed, restrict it to the deploy-checklist files only. |
| **Opened** | 2026-04-17 |
| **Target** | v2.2.37 (blocks further release sessions) |

### 🟡 P2 — Orphan Stash Cleanup

| | |
|---|---|
| **Description** | Stashes accumulate silently across sessions. No convention for reviewing or dropping orphan stashes. |
| **Proposed action** | Review stash list at every session start. Establish a rule: if a stash is more than 2 sessions old with no active use, drop it. |
| **Opened** | 2026-04-17 |
| **Target** | v2.2.37 (opportunistic cleanup) |

### 🟡 P2 — FAQ Linter

| | |
|---|---|
| **Description** | No automated check that FAQ categories correspond to real personas and that no persona is missing FAQ coverage. |
| **Proposed action** | Write a small Vitest fixture that asserts every FAQ category in faqs.js has a matching persona in PERSONAS.md. Low priority because manual audit just happened. |
| **Opened** | 2026-04-17 |
| **Target** | v2.2.38+ |

### 🟡 P2 — FEATURE_MAP.md Sync Linter

| | |
|---|---|
| **Description** | FEATURE_MAP.md claims test files exist for each feature. No automated check that the referenced test files actually exist or contain tests. |
| **Proposed action** | Write a lint script that scans FEATURE_MAP.md for test file paths, verifies they exist on disk, and warns on broken references. Run in CI. |
| **Opened** | 2026-04-17 |
| **Target** | v2.2.38+ |

---

## Resolved

*(Items move here once shipped. Format: date, version, original description summary, resolution commit.)*

- None yet — ledger opens with v2.2.36 governance activation.

---

## Debt Summary Dashboard

**Current counts (auto-update on every audit):**

| Priority | Test Gaps | Doc Gaps | Process Gaps | Total |
|---|---|---|---|---|
| 🔴 P0 | 2 | 0 | 0 | **2** |
| 🟠 P1 | 3 | 3 | 1 | **7** |
| 🟡 P2 | 4 | 4 | 3 | **11** |
| **Total** | **9** | **7** | **4** | **20** |

**Age distribution:**
- 0–30 days: 20
- 31–60 days: 0
- 60+ days: 0

**Ship blockers:**
- Next minor (v2.3.0) — must resolve all P0 before bump

---

## Revision History

- **v1.0 — April 17, 2026** — Initial ledger authored alongside FEATURE_MAP.md as part of v2.2.33 governance infrastructure release. Seeded with 21 known gaps from the v2.2.29 → v2.2.31 audit.
- **v2.0 — April 2026 (v2.2.36)** — Ledger replaced with enhanced format: emoji priority markers (🔴/🟠/🟡), table-based item layout, Test/Doc/Process gap categories, Debt Summary Dashboard, Revision History. `.gitignore` and auto-staging items resolved via v2.2.36 governance release.
