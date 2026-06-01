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
- **P3** — cosmetic or edge-case gap; no deadline, address when convenient.

---

## Open — Test Gaps

### 🔴 P0 — Share Link Payload Integrity

| | |
|---|---|
| **Area** | Share links (8-char Supabase-backed) |
| **Description** | No automated test validates that a share link generated from a locked lineup renders correctly in Viewer mode with (a) full defensive grid, (b) full batting order, (c) absent players filtered, (d) walk-up song links. Root cause of missing link generation confirmed May 18, 2026: renderPrint() orphaned at App.jsx:7564, shareCurrentLineup() dead. Fix tracked in Story 67. shareCurrentLineup() is now live and reachable from the Lineups tab (Story 67, v2.5.15) — this test gap is now urgent, not hypothetical. Priority elevated. **Update v2.5.16 (2026-05-19):** `frontend/src/tests/shareLink.test.js` now exists — 3 specs cover `dbLoadShareLink` timeout + happy path + Supabase error (Story 61 Bug A). Payload-integrity scope (generated payload shape, absent-player filtering, song link preservation) remains open in the same file. |
| **Risk if unfixed** | Silent regression breaks the #1 Strategic North Star ("share link bulletproof"). A future refactor of `shareCurrentLineup` or `SharedView.jsx` could ship with the link returning stale or incomplete data and we would not catch it pre-deploy. |
| **Proposed test** | `frontend/src/tests/shareLink.test.js` — **file exists, partial coverage**. Still needed: build a lineup fixture, call `shareCurrentLineup`, parse the `share_links.payload` JSONB, assert every expected field is present and correctly filtered. Also a DOM test that `SharedView` renders all sections without errors given the payload. |
| **Opened** | 2026-04-17 |
| **Age** | 43 days |
| **Target** | v2.6.x |

### 🟠 P1 — Share-link routing render path (Story 61 follow-up)

| | |
|---|---|
| **Area** | Share-link routing branches in `App.jsx` |
| **Description** | Story 61 (v2.5.16) removed the `VIEWER_MODE` flag gate from `isViewer` (`App.jsx:8001`) and `isViewer64` (`App.jsx:8063`). The viewer-routing fix was verified via Vercel preview smoke test on a real device, not via automated test — `App.jsx` has no existing render-test harness. A future refactor of either share-link branch (or a re-introduction of a flag gate) could silently regress recipient-side routing again. |
| **Risk if unfixed** | Silent regression on Strategic North Star #1 ("share link bulletproof"). Bug B is a two-character JSX conditional; the next refactor could re-introduce it without anyone noticing until a parent reports a broken link. |
| **Proposed test** | Render-path integration test in `frontend/src/tests/` — render `<App />` (or extract the share-link branch into a small testable surface) with `window.location.search` stubbed for `?s=abc`, `?s=abc&view=true`, and `?share=<base64>` variants. Assert routing lands on `SharedView` vs `DugoutView` per URL. Requires standing up an `App.jsx` render-test harness for the first time — explicit cost the v2.5.16 PR opted not to pay. |
| **Opened** | 2026-05-19 |
| **Age** | 11 days |
| **Target** | v2.6.x |

### 🔴 P0 — Game Mode Rendering + State

| | |
|---|---|
| **Area** | Game Mode (full-screen dugout view) |
| **Description** | No tests cover GameModeScreen rendering, inning advance, batter advance, or QuickSwap candidate filtering. The QuickSwap `onClick` regression in March 2026 (DefenseDiamond missing handlers) would not have been caught by tests. Scope expanded in v2.5.4: now includes DugoutView's flag-ON render path (mounts ScoringModeEntry + LiveScoringPanel + RestoreScoreModal under feature flag COMBINED_GAMEMODE_AND_SCORING). Coverage gaps are inherited from ScoringMode, not new — but the new container surface needs at least a smoke test before flag flips ON in production. **Update v2.5.5:** `DugoutView.test.jsx` (5 smoke tests) added — "smoke test before flag flip" threshold met for the DugoutView container. GameModeScreen itself remains untested. |
| **Risk if unfixed** | Silent regression breaks the #2 Strategic North Star ("Game Mode dugout-ready under pressure"). |
| **Proposed test** | `frontend/src/tests/gameMode.test.js` — render GameModeScreen with fixture lineup, simulate inning advance, simulate QuickSwap tap, assert state transitions and candidate filtering (including absent-player exclusion). |
| **Opened** | 2026-04-17 |
| **Age** | 43 days |
| **Target** | v2.6.x |

### 🟠 P1 — Live Scoring Scorer-Lock Regression

| | |
|---|---|
| **Area** | Live scoring (scorer lock, inning entry) |
| **Description** | The v2.2.29 bug — `claimScorerLock` passing raw `userId` (null under shim) and violating NOT NULL constraint — has no regression test. If the shim is removed or modified, this class of silent failure can recur. Note: v2.3.3 added `realtimeRaceGuard.test.js`, `practiceModeIsolation.test.js`, and `runnerPlacement.test.js` — these add live scoring coverage but do not test the scorer-lock null check specifically. This item remains open. |
| **Risk if unfixed** | Scoring users silently unable to claim the role with no surfaced error — exactly what v2.2.29 had to fix in prod. |
| **Proposed test** | Add to `frontend/src/tests/scoring.test.js` — assert `claimScorerLock` rejects null `scorer_user_id` before issuing the upsert, OR assert that the shim fallback produces a non-null value in all code paths. |
| **Opened** | 2026-04-17 |
| **Age** | 43 days |
| **Target** | v2.6.x |

### 🟠 P1 — Auth Flow End-to-End (Magic Link + Google OAuth)

| | |
|---|---|
| **Area** | Auth system (magic link + Google OAuth) |
| **Description** | No tests cover the magic link request → callback handling → team membership hydration flow. Same for Google OAuth. |
| **Risk if unfixed** | Phase 2 auth cutover (planned) cannot ship safely without regression coverage. An auth-gate re-activation that silently blocks unauthenticated viewers would reproduce the v2.2.22 hotfix scenario. |
| **Proposed test** | `frontend/src/tests/auth.test.js` — mock Supabase client, simulate magic link flow, assert `useAuth` state transitions correctly through `pending → authenticated`. Also test: share link renders when `authState === unauthenticated`. |
| **Opened** | 2026-04-17 |
| **Age** | 43 days |
| **Target** | Before Phase 2 auth cutover (not version-pinned) |

### 🟠 P1 — Roster-Wipe Guard + Recovery Endpoint

| | |
|---|---|
| **Area** | Roster backup/restore |
| **Description** | The backend `POST /api/teams/:teamId/data` has a wipe-guard (409 on empty roster over existing). The `GET /api/teams/:teamId/history` has `X-Admin-Key` auth. Neither path is tested. |
| **Risk if unfixed** | Two roster-wipe incidents already happened (Jan, Feb 2026). The guard is the primary prevention; if it silently stops working, we're back to paper recovery. |
| **Proposed test** | `backend/src/__tests__/teamData.test.js` — test the guard returns 409, test force-override returns 200, test history endpoint rejects without ADMIN_KEY, test history endpoint returns snapshots with ADMIN_KEY. |
| **Opened** | 2026-04-17 |
| **Age** | 43 days |
| **Target** | v2.6.x |

### 🟡 P2 — Walk-Up Song Navigation

| | |
|---|---|
| **Area** | Walk-up songs per player |
| **Description** | No test that Songs tab filters to active players only, or that Play button invokes navigation with correct URL. Deep-link to native apps is OS-mediated (untestable at unit level) but the call site is testable. |
| **Risk if unfixed** | A future refactor of `activeBattingOrder` filtering could silently unfilter Songs view — would go unnoticed until a DJ parent complains about absent kids in the playlist. |
| **Proposed test** | Add to existing test or new `frontend/src/tests/songs.test.js` — assert Songs renders only `activeBattingOrder` players, assert Play button's href matches `player.walkUpSong.url`. |
| **Opened** | 2026-04-17 |
| **Age** | 43 days |
| **Target** | v2.4.0 |

### 🟡 P2 — PWA Install Prompt Logic

| | |
|---|---|
| **Area** | PWA Setup |
| **Description** | Install banner has platform branches (Android `beforeinstallprompt` vs iOS `standalone` detection vs already-installed) that are untested. |
| **Risk if unfixed** | Platform-specific install UX regressions; user confusion on a non-critical path. |
| **Proposed test** | `frontend/src/tests/pwaInstall.test.js` — mock `window.navigator.standalone`, `window.matchMedia("(display-mode: standalone)")`, and `beforeinstallprompt` event, assert correct banner variant renders. |
| **Opened** | 2026-04-17 |
| **Age** | 43 days |
| **Target** | v2.4.0 |

### 🟡 P2 — Analytics track() Wrapper + SSR Guards

| | |
|---|---|
| **Area** | Analytics (Mixpanel + Vercel Analytics + UTM) |
| **Description** | `analytics.js` has SSR guards (window/navigator) added in v2.2.7/v2.2.8 but no tests cover the guard branches. |
| **Risk if unfixed** | A future refactor could remove the guard and break CI if any test environment lacks window/navigator. |
| **Proposed test** | Add to existing fixtures — assert `track()` is a no-op when window is undefined, assert `getDeviceContext()` returns safe defaults in SSR-like env. |
| **Opened** | 2026-04-17 |
| **Age** | 43 days |
| **Target** | v2.4.0 |

### 🟡 P2 — AI Photo Import End-to-End

| | |
|---|---|
| **Area** | Schedule management + AI import |
| **Description** | The Claude API proxy path (schedule import, score card parse) has no integration test covering request body size limit (10mb), client-side canvas resize, or error handling. |
| **Risk if unfixed** | The v2.2.4 bug (large phone photos exceeding 5MB after base64) was a real prod incident; no regression test was added with the fix. |
| **Proposed test** | `backend/src/__tests__/aiProxy.test.js` — mock Anthropic API, test POST /api/ai with oversize payload returns 413, test valid payload returns parsed structure. |
| **Opened** | 2026-04-17 |
| **Age** | 43 days |
| **Target** | v2.4.0 |

### 🟡 P2 — D-S30: isFlagEnabled has no DB-read path (Story 30)

| | |
|---|---|
| **Area** | Feature flag system |
| **Description** | `isFlagEnabled(flagName)` is synchronous: reads `FEATURE_FLAGS[flagName]` from JS bundle default + `localStorage` override only. Does NOT query the Supabase `feature_flags` table at runtime. Flipping a DB row has no effect on active users without a code redeploy. Discovered April 2026 when SCORING_SHEET_V2 DB row was flipped expecting a runtime change. |
| **Risk if unfixed** | Any ops flag-flip procedure documented as "flip the DB row" is silently ineffective. Risk of mis-communication and delayed rollbacks. |
| **Proposed fix** | Extend `flagBootstrap.js` to fetch Supabase `feature_flags` table at app boot and merge into a runtime registry. `isFlagEnabled()` stays synchronous at call sites — async fetch happens once in the bootstrap path. Recommend (B) from Story 30 write-up in ROADMAP.md. |
| **Opened** | 2026-04-24 |
| **Age** | 36 days |
| **Target** | v2.6.x |

### 🟡 P2 — SW update banner lifecycle (Story 85 follow-up)

| | |
|---|---|
| **Area** | PWA Setup / Service Worker |
| **Description** | Story 85 (v2.5.21) restored `updateServiceWorker` via `useRegisterSW` destructure. The banner now appears when `needRefresh === true`. No automated test covers the lifecycle: SW activation → `needRefresh` flip → banner render → click → `updateServiceWorker(true)` → page reload. Runtime is jsdom-incompatible (real ServiceWorker required) — needs Playwright/Cypress E2E or a vitest-mock harness for the hook. |
| **Risk if unfixed** | A future refactor of the SW lifecycle wiring could silently re-introduce the v2.5.21 regression (banner never rendered). Coaches would again revert to PWA close+reopen as the only update path. |
| **Proposed test** | E2E test with mocked SW registration: simulate `needRefresh: true`, assert banner renders, assert click invokes `updateServiceWorker(true)`. OR vitest unit test that mocks `virtual:pwa-register/react` and verifies destructure shape + click-handler wiring. |
| **Opened** | 2026-05-27 |
| **Age** | 3 days |
| **Target** | v2.6.x |

### 🟡 P2 — sync-stories-to-issues.js: no unit harness for typeof issueNum guard (Story 91 follow-up)

| | |
|---|---|
| **Area** | Tooling (governance scripts) |
| **Description** | Story 91 (v2.5.21) added `typeof issueNum === "number"` guard to skip the ROADMAP patch block when POST fails. The script has no unit test harness at all — neither the guard nor the surrounding logic (issue creation, ROADMAP regex patch, de-dup check from Story 90) is covered. Each fix has been verified manually via dry-run + retroactive ROADMAP inspection. |
| **Risk if unfixed** | A future refactor (token-handling, error-class change, response-shape drift from GitHub API) could silently break the script. ROADMAP corruption like the `<!-- #undefined -->` symptom would only be caught by post-run inspection. |
| **Proposed test** | `scripts/__tests__/sync-stories-to-issues.test.js` — mock `fetch`, exercise: (a) happy path creates issue + patches marker, (b) 401 returns failure object — guard prevents ROADMAP write, (c) de-dup check skips on existing issue. Node test runner (node:test) is sufficient — no Vitest pull-in needed for a tools-side test. |
| **Opened** | 2026-05-27 |
| **Age** | 3 days |
| **Target** | v2.6.x |

### ✅ RESOLVED — D017: ScoreboardRow primitive has no test coverage

- **Discovered:** 2026-05-01 (during Slice 0 / v2.5.4 Pre-release Docs Checklist walk)
- **Resolved:** 2026-05-02 (Slice 1 / v2.5.5 — `ScoreboardRow.test.jsx` added, 4 tests)
- **Component:** `frontend/src/components/game-mode/ScoreboardRow.jsx`
- **Test file:** `frontend/src/components/game-mode/ScoreboardRow.test.jsx`
- **Coverage:** scores from props, team labels, +1 button visibility (isScorer), default prop fallbacks

---

## Open — Doc Gaps

### 🟠 P1 — FEATURE_MAP.md Structural Restructure for Adjacency Support

| | |
|---|---|
| **Area** | Governance |
| **Status** | Open |
| **Type** | Refactor |
| **Opened** | 2026-04-17 |
| **Target** | v2.3.4 |
| **Summary** | FEATURE_MAP.md currently uses a flat numbered table (`\| 1 \| **Feature Name** \| MVP \|`). Adjacency tooling and AI cross-referencing require per-feature sections with structured fields: Code Surfaces, Doc Surfaces, FAQ Categories, Personas, Test Surfaces. Restructure adds `### <Feature Title>` sections below the existing summary table; table becomes TOC, sections become data. Same information, parseable by scripts. Required prerequisite for v2.2.41 Backlog Adjacency System. |

### 🟠 P1 — FEATURE_MAP.md Missing Feature Rows (Analytics, PWA, Governance)

| | |
|---|---|
| **Area** | Governance |
| **Status** | Open |
| **Type** | Doc gap |
| **Opened** | 2026-04-17 |
| **Target** | v2.3.4 |
| **Summary** | Three Area values in DOC_TEST_DEBT.md have no matching row in FEATURE_MAP.md: "Analytics (Mixpanel + Vercel Analytics + UTM)", "PWA Setup", and "Governance" (exists as "Governance infrastructure" — not exact match, breaks mechanical lookup). Add dedicated rows for each during the restructure. Each row must include full Code Surfaces, Doc Surfaces, FAQ Categories, Personas, Test Surfaces fields so adjacency tooling works mechanically. Note: v2.3.3 hygiene patch added Practice Mode, Runner Placement, and Opponent Half Tracking rows — remaining gap is Analytics, PWA, and exact Governance match. |

### 🟡 P2 — SOLUTION_DESIGN.md §Test Suite Inventory

| | |
|---|---|
| **Area** | Governance |
| **Description** | 306 tests existed when this item was opened; the suite is now 771 frontend (Vitest), plus a separate backend layer counted independently: 13 integration suites (custom runner, `test-runner.js`) and 9 in-process unit tests (`backend/src/__tests__/admin.auth.test.js`, node:test + supertest). There is still no doc-side map of what each test file covers. |
| **Proposed action** | Add a §Test Suite Inventory section listing test files and what each covers; cross-reference FEATURE_MAP.md. |
| **Opened** | 2026-04-17 |
| **Target** | v2.4.0 |

### 🟡 P2 — ROADMAP.md Feature Summary Header

| | |
|---|---|
| **Area** | Governance |
| **Description** | ROADMAP.md is a version-by-version log; it's hard for a new reader to understand what shipped as coherent initiatives (Attendance, Live Scoring, PWA install funnel). |
| **Proposed action** | Add a "Feature Summary" section at the top of ROADMAP.md grouping v2.2.x ranges into coherent initiatives, with links to the individual version entries. |
| **Opened** | 2026-04-17 |
| **Target** | v2.4.0 |

### 🟡 P2 — ONE_PAGER.md Data Source Check

| | |
|---|---|
| **Area** | Governance |
| **Description** | Success metrics on the 1-pager ("share link open rate >60%", etc.) are placeholder targets, not measured baselines. |
| **Proposed action** | Pull actual Mixpanel baselines for the five metrics; replace placeholder targets with evidence-based targets + 20% stretch. |
| **Opened** | 2026-04-17 |
| **Target** | v2.4.0 |

### 🟡 P2 — Legal Content Regulatory Posture

| | |
|---|---|
| **Area** | Governance |
| **Description** | CHARTER.md §9 mentions minimal PII and no payment data but doesn't explicitly address COPPA / child data minimization considerations given 8U audience. |
| **Proposed action** | Review legal.js content against COPPA posture; document findings in CHARTER.md governance section. If material gap found, spawn a P1 item. |
| **Opened** | 2026-04-17 |
| **Target** | v2.4.0 |

### 🟡 P3 — FAQ × Feature Flag coverage audit

- **What:** `frontend/src/content/faqs.js` contains 48 FAQ entries across 7 personas. At least one entry (line 191, scorekeeper category) describes a feature gated by `liveScoringEnabled` flag without acknowledging the gate. Coaches without the flag enabled see referenced UI elements that don't exist for them.
- **Scope:** Full audit of all 48 entries against current feature flag state. Identify entries describing gated features. Decide on a consistent presentation pattern (caveat language? group flag-gated entries? prefix like "If live scoring is enabled..."?). Apply consistently.
- **Target:** v2.6.0 P3 (or v2.7.0 if scope creeps)
- **Source:** Surfaced during v2.6.0 documentation foundation sweep on April 27, 2026.
- **Why P3:** Not actively misleading — coaches without the flag never reach the relevant FAQ answer expecting it to apply. But represents a content quality gap worth resolving once flag count grows.

### 🟡 P2 — D-S31: FEATURE_MAP.md Coverage Summary denominator drift

| | |
|---|---|
| **Area** | Governance (Feature Map) |
| **Status** | Open |
| **Type** | Doc gap |
| **Opened** | 2026-05-15 |
| **Target** | (opportunistic — no version target) |
| **Summary** | FEATURE_MAP.md Coverage Summary denominators show `/ 27` (lines 60–65) but heading reads "Feature Registry (29 features)" and row recount confirms 29 (row #29 BottomSheet added in v2.5.21). Six summary lines need denominator bump to `/ 29` AND category counts likely need recount across all rows. Cosmetic mismatch but accumulates each release. Discovered during v2.5.9 GA-state reconciliation patch (commit c97d5ae); drift widened by v2.5.21 release-prep. |

---

## Open — Tooling / Process Gaps

### 🟠 P1 — Auto-Staging Git Hook

| | |
|---|---|
| **Area** | Governance |
| **Description** | During v2.2.31 session, a git hook silently staged files that were intentionally unstaged. The scope-creep was caught at the gate but would have shipped otherwise. |
| **Proposed action** | Investigate `.git/hooks/pre-commit`, husky config, or Claude Code hook config. Remove auto-staging. If a hook is needed, restrict it to the deploy-checklist files only. |
| **Opened** | 2026-04-17 |
| **Target** | v2.3.4 |

### 🟡 P2 — Orphan Stash Cleanup

| | |
|---|---|
| **Area** | Governance |
| **Description** | Stashes accumulate silently across sessions. No convention for reviewing or dropping orphan stashes. |
| **Proposed action** | Review stash list at every session start. Establish a rule: if a stash is more than 2 sessions old with no active use, drop it. |
| **Opened** | 2026-04-17 |
| **Target** | v2.4.0 |

### 🟡 P2 — FAQ Linter

| | |
|---|---|
| **Area** | Governance |
| **Description** | No automated check that FAQ categories correspond to real personas and that no persona is missing FAQ coverage. |
| **Proposed action** | Write a small Vitest fixture that asserts every FAQ category in faqs.js has a matching persona in PERSONAS.md. Low priority because manual audit just happened. |
| **Opened** | 2026-04-17 |
| **Target** | v2.4.0 |

### 🟡 P2 — FEATURE_MAP.md Sync Linter

| | |
|---|---|
| **Area** | Governance |
| **Description** | FEATURE_MAP.md claims test files exist for each feature. No automated check that the referenced test files actually exist or contain tests. |
| **Proposed action** | Write a lint script that scans FEATURE_MAP.md for test file paths, verifies they exist on disk, and warns on broken references. Run in CI. |
| **Opened** | 2026-04-17 |
| **Target** | v2.4.0 |

### 🟠 P1 — Diagnose share/print broken in production

- **What:** Share/print functionality confirmed broken on April 24, 2026 (game day) and again April 27, 2026 (post-v2.5.1 prod smoke test). Root cause UNKNOWN.
- **What it is NOT:** Not the `renderSharedView` hooks violation — that fix shipped in v2.1.6 (commit `46f071a`, `SharedView` component at App.jsx:2560).
- **Investigation steps:** Reproduce locally → check browser console errors on `?s=` URLs → verify share/print buttons render → determine if share payload generation or share view rendering is failing.
- **Target:** v2.6.0 P0
- **Source:** Surfaced during v2.5.1 production smoke test, April 27, 2026.

### 🟠 P1 — Windows Vitest pre-push hook OOM cascade

- **What:** Pre-push hook running full vitest suite OOM-cascades on Windows when module cache is cold (22 worker timeouts, 5/27 files run). Currently mitigated by warm-up workaround in CLAUDE.md.
- **Real fix paths:** (a) reduce vitest worker count for hook runs, (b) skip pre-push test and rely on CI gate, (c) configure vitest pool to avoid worker-thread cold-start, (d) move hook to pre-commit instead of pre-push (amortize cost across smaller commits).
- **Target:** v2.6.0 P1
- **Source:** Surfaced during scoring-updates branch deletion, April 27, 2026.

### 🟠 P1 — Box-score AI parser test coverage (teamName fix, PR #229)

- **What:** The box-score AI parser code path in `App.jsx` was patched in v2.5.20/v2.5.21 to replace undefined `teamName` references with `activeTeam.name` (Story 84, PR #178; chore cleanup PR #228; fix PR #229). No regression test exists for this code path — a future refactor that re-introduces the `teamName` undefined reference, or breaks the `activeTeam.name` fallback, would ship silently because the parser is invoked only when a coach uploads a box-score image (low-frequency manual flow).
- **What it is NOT:** Not a test for the Anthropic API call itself — that path is covered indirectly by backend integration tests. Specifically the parser's local variable resolution inside App.jsx's response-handling block.
- **Proposed test:** Mock the Anthropic API response shape, invoke the parser function (currently inline in App.jsx; will need light extraction to be testable), assert `teamName` extracts correctly from `activeTeam.name` for the happy path and from explicit response fields when present. Vitest with `vi.mock('fetch')` is sufficient — no API key required at test time.
- **Why deferred from v2.5.22:** The fix landed via three PRs (#178, #228, #229) with manual validation against real box-score images during the chore-sprint. The test gap was not caught at the time. For a patch release (Z bump), manual validation is acceptable; the full test scaffold (parser extraction + mock harness) is more work than v2.5.22 scope allows. Sets a debt-with-justification precedent for parser-path coverage in v2.6.0.
- **Target:** v2.6.0 P1 (alongside the App.jsx component split — parser extraction is a natural piece of that work).
- **Source:** Ship Gate Q1 verification during v2.5.22 release packaging, 2026-05-29.

### 🟡 P2 — CI workflow `BACKEND_URL` audit

- **What:** Both backend integration test job and smoke test job hardcode prod URL in `.github/workflows/ci.yml`. Smoke job has misleading variable named `DEV_BACKEND_URL` that points to prod URL.
- **Decisions needed:** Should CI hit a dev/preview backend, or is prod read-only correct? If prod read-only is correct, rename variable for clarity.
- **Target:** v2.6.0 P2
- **Source:** Audited during v2.5.1 deploy, April 27, 2026.
- **Partial mitigation (Story 99, PR #272):** the new `backend-unit` CI job runs in-process supertest tests with no `BACKEND_URL` / prod dependency — admin auth-rejection coverage is now prod-URL-free. The hardcoded-prod-URL concern remains only for the live integration `backend` job and the smoke job.

### 🟡 P2 — `snack_duty` column drop blocked on codebase audit

- **What:** Column verified present in Supabase as jsonb on April 27, 2026 (logged in MASTER_DEV_REFERENCE.md as outstanding manual action).
- **Prerequisite work:** grep frontend/ and backend/ for any read/write references to `snack_duty`. If clean, run `ALTER TABLE team_data DROP COLUMN snack_duty;` in Supabase SQL Editor. If references exist, remove them first.
- **Target:** v2.6.0 P2
- **Source:** Surfaced during MASTER_DEV_REFERENCE.md audit, April 27, 2026.

---

## Resolved

*(Items move here once shipped. Format: date, version, original description summary, resolution commit.)*

- **2026-04-17 (v2.2.38)** — **SOLUTION_DESIGN.md §Feature Flag System: `feature_flags` table schema (columns, RLS posture, evaluation priority) added.** Previously missing from the doc.
- **2026-04-17 (v2.2.38)** — **SOLUTION_DESIGN.md §Analytics Architecture: identity model, super properties, SSR guards, and pointer to ANALYTICS.md added.** Previously not documented architecturally.
- **2026-04-17 (v2.2.38)** — **SOLUTION_DESIGN.md §CI/CD Pipeline: branch strategy, GitHub Actions workflows, Husky pre-push hook, smoke test scope, Dev environment URLs added.** Previously marked "No CI/CD pipeline" in Known Tradeoffs despite infrastructure being live.
- **2026-04-17 (v2.2.38)** — **SOLUTION_DESIGN.md §Live Scoring Framework: Tier 1/2/3 breakdown, scorer lock rationale, non-goals documented.** Previously undocumented.

### May 4, 2026 — v2.5.7 (Slice 2)

- ✅ **D018 — BattingOrderStrip batter index sync** — Resolved. `BattingOrderStrip` now reads `gameState.battingOrderIndex` from `useLiveScoring` when `COMBINED_GAMEMODE_AND_SCORING` flag is ON, and App-passed `currentBatterIndex` when OFF. Bug 8 fix. (`DugoutView.jsx` + `DugoutView.test.jsx` regression test ×2)
- ✅ **D019 — 375px viewport vertical space (combined view)** — Resolved. DugoutView flex-column layout shell with fixed-height header regions and `overflow-y:auto` body eliminates diamond clip and pitch map masking. Bug 9/10 fix. (`DugoutView.viewport.test.jsx` ×3 viewport tests)
- ✅ **D020 — dugoutFocusMode state machine untested** — Resolved. State machine (`currentAtBat !== null ? 'scoring' : 'lineup'`) tested for all three transitions + null/non-null boundary. (`DugoutView.test.jsx` ×3 state machine tests + `ScoreboardRow.test.jsx` inning rendering ×3)

### April 27, 2026 — v2.5.1 deploy session

- ✅ **Add ADMIN_KEY to Render production env vars** — verified present in prod Render dashboard during deploy verification.
- ✅ **`.isUUID()` rejects numeric team ID — silent admin approval bug** — fixed in earlier release. Confirmed by K during v2.6.0 foundation audit.
- ✅ **`scoring-updates` long-lived exploratory branch** — deleted local + remote on April 27, 2026. No novel work was on the branch beyond a stale sync commit. CLAUDE.md updated.
- ✅ **`lineup-generator-backend-dev` Render service** — deleted entirely on April 27, 2026. Local dev uses `npm run dev` (per K's existing workflow). Only unique env var (`RESEND_TEST_RECIPIENT`) preserved in local `backend/.env`.
- ✅ **GitHub branch protection on `main`** — enabled April 27, 2026. Status checks required, admin bypass disabled, force pushes blocked. Prevents the "merge with failing CI" pattern that almost shipped during v2.5.1 deploy.
- ✅ **UptimeRobot push notification alerting** — added April 27, 2026 after a 2-day production outage went unnoticed on email-only alerts. Mobile app installed, push contact attached to monitor #802733786.
- ✅ **Render free-tier hosting trap documented** — `CLAUDE.md ## Key Infrastructure` now has a "Free-tier hosting trap (LESSON LEARNED)" subsection. Triggered by April 25-27 outage when UptimeRobot 5-min pings × two free-tier services × 24/7 keep-alive exceeded 750h/month cap.

---

## Debt Summary Dashboard

**Current counts (auto-update on every audit):**

| Priority | Test Gaps | Doc Gaps | Process Gaps | Total |
|---|---|---|---|---|
| 🔴 P0 | 2 | 0 | 0 | **2** |
| 🟠 P1 | 3 | 2 | 1 | **6** |
| 🟡 P2 | 7 | 4 | 3 | **14** |
| **Total** | **12** | **6** | **4** | **22** |

**Age distribution:**
- 0–30 days: 4
- 31–60 days: 18
- 60+ days: 0

**Ship blockers:**
- Next minor (v2.6.0) — must resolve all P0 before bump

---

## Revision History

- **v1.0 — April 17, 2026** — Initial ledger authored alongside FEATURE_MAP.md as part of v2.2.33 governance infrastructure release. Seeded with 21 known gaps from the v2.2.29 → v2.2.31 audit.
- **v2.0 — April 2026 (v2.2.36)** — Ledger replaced with enhanced format: emoji priority markers (🔴/🟠/🟡), table-based item layout, Test/Doc/Process gap categories, Debt Summary Dashboard.
- **v2.1 — April 2026 (v2.2.38)** — Area field added to all items (FEATURE_MAP.md row alignment for v2.2.39 adjacency system). Stale Target fields slid to v2.2.40. 4 SOLUTION_DESIGN.md doc gaps resolved and moved to Resolved section. Dashboard corrected: 17 open (P0:2, P1:4, P2:11).
- **v2.2 — April 2026 (v2.3.3 hygiene patch)** — Age fields updated (0→7 days). All stale v2.2.40/v2.2.39 target fields corrected: P0/P1 items → v2.3.4, P2 items → v2.4.0. Ship blocker updated to v2.4.0. Age distribution corrected to 19 (was 17 — prior undercounting). Scorer-Lock item (D001) annotated: v2.3.3 test additions add live scoring coverage but do not resolve the scorer-lock null check specifically. FEATURE_MAP Missing Rows item updated to note v2.3.3 added 3 new rows; remaining gap is Analytics, PWA, Governance exact-match.
- **v2.3 — April 2026 (v2.5.0 release)** — Added D-S30 (P2 test gap): isFlagEnabled has no DB-read path. Dashboard updated: P2 test gaps 4→5, total 19→20. Ship blocker updated to v2.6.0.
- **v2.4 — April 2026 (v2.5.2 release)** — Toast.test.jsx added (`src/components/ui/Toast.test.jsx`, 10 tests); suite 421→431. FEATURE_MAP.md row 24 added (Toast UI primitive, ✅ Doc Current, ✅ Yes tests). Dashboard unchanged — no new debt items opened.
- **v2.5 — May 2026 (v2.5.4 release)** — P0 #2 (Game Mode Rendering + State) scope expanded to include DugoutView flag-ON render path (COMBINED_GAMEMODE_AND_SCORING). New P2 test gap D017 added: ScoreboardRow primitive untested. FEATURE_MAP.md row #25 added (Combined Game View / DugoutView, ✅ Doc Current, ❌ No Tests). Dashboard updated: P2 test gaps 5→6, total 20→21.
- **v2.6 — May 2026 (v2.5.5 + v2.5.6 releases)**

  v2.5.5 docs patch (forward-ported to develop):
  - D017 resolved (ScoreboardRow.test.jsx, 4 tests)
  - D018/D019/D020 added (P1, Slice 2 scope)
  - Age sweep: open items 7→16 days
  - Dashboard: P1 3→6, P2 6→5, total 21→23

  v2.5.6 release patch:
  - Test inventory updates: BattingOrderStrip (6), DugoutView (5), ScoreboardRow (4), a11y-component-fixes (11), theme.tokens (34)
  - accessibility.v1.test.js: 22→23 tests
  - Suite count: 452 → 498 (Slice 1 +15, PR #39 +39, PR #41 Phase 1c +7 net)
  - Phase 1c shadow tokens: theme.tokens.test.js expanded 27→34

- **v2.7 — May 2026 (v2.5.7 Slice 2 release)**
  - D018/D019/D020 resolved and moved to Resolved section (all three: P1, Combined Game View area)
  - New test file: `DugoutView.viewport.test.jsx` (3 tests — establishes 375px viewport test pattern for the suite)
  - Dashboard: P1 test gaps 6→3, P1 total 9→6, overall total 23→20, age distribution 23→20
  - Suite count: 499 → 516 (Slice 2 +11 net: state machine ×3, ScoreboardRow inning ×3, Bug 8 regression ×2, viewport ×3; Story 50 fix-up +6)

- **v2.8 — May 2026 (v2.5.10 release — Phase 2 primitives + Phase 3 Step 1)**
  - 5 new primitive test files: `Badge.test.jsx`, `Button.test.jsx`, `Card.test.jsx`, `Stack.test.jsx`, `Text.test.jsx` (+107 tests)
  - PR #62 (Phase 3 Step 1): `PlayerHandBadge.test.jsx` modified for Badge primitive composition; no net test count change
  - FEATURE_MAP.md row #28 added (UI primitives — Badge / Button / Card / Stack / Text, ⚠ Partial — primitives covered, 1 consumer migrated)
  - Suite count: 658 post-v2.5.10 (Phase 2 +107 from primitives; PR #62 no net change; v2.5.8/v2.5.9 deltas not tracked in this dashboard)
  - Dashboard unchanged — no new debt items opened (consumer-test gap captured in row 28's Debt column, not as a separate item)

- **v2.9 — May 2026 (v2.5.11 release — Slice 4 cleanup + UX Phase 3 Step 2 + docs catchup)**
  - Slice 4 (PR #67): `Viewer/ViewerMode.test.jsx` deleted (−14 tests). `ScoringMode/index.jsx` deleted but had no associated tests (legacy root component; only the preserved live children have tests, all untouched and passing).
  - PR #68 (Phase 3 Step 2): `EmptyState.test.jsx` modified — R1.5 query updated for new DOM shape (`button > span` traversal post-migration to Button primitive); 8 tests passing, no net count change. `PlayerHandBadge.jsx` dead `tokens` import removed (Story 59 closure); no test impact.
  - PR #69 (docs catchup): Documentation-only changes — `UX_REFACTOR_ROADMAP.md`, `CLAUDE.md`, `ROADMAP.md` updated; no test impact. Story 59 closed; Story 60 filed (token coverage gaps).
  - FEATURE_MAP.md row #28 updated: consumer-migration count 1 → 2 (EmptyState added as second primitive consumer).
  - Suite count: 658 (post-v2.5.10) → 644 + 1 skipped (post-v2.5.11; Slice 4 dropped 14 ViewerMode tests; PR #68 + #69 net 0).
  - Dashboard impact: no new debt items opened. No existing open items resolved by v2.5.11 work.

- **v2.10 — May 2026 (v2.5.12 release — Badge/PlayerHandBadge consolidation + backlog hygiene)**
  - PR #73 (Phase 3 — Badge/PlayerHandBadge consolidation): New test file `frontend/src/components/GameDay/NowBattingStrip.test.jsx` added (63 lines, integration regression guard for the consolidation). Test additions: `Badge.test.jsx` +5 (BD8.1–BD10.1), `PlayerHandBadge.test.jsx` +4 (R3.8–R3.11). Story 63 (P2) filed in ROADMAP backlog: pre-existing now-batting strip badge data-path bug (out of scope for the release).
  - PR #74 (Backlog hygiene, Story 34 closed): ROADMAP.md docs-only — Story 27 → 61 renumber, P2 row 47 → Story 62 promotion, Gaps 17/18/25/52 retired, 13 resolved headings marked ✅. No test impact.
  - Age sweep: open P0/P1 items refreshed to 27 days (most opened 2026-04-17); D-S30 P2 item refreshed to 20 days (opened 2026-04-24). Already written in the working tree from the prior fan-out — not re-edited.
  - Suite count: 644 + 1 skipped (post-v2.5.11) → 654 + 1 skipped (post-v2.5.12; PR #73 +10 net: NowBattingStrip new file + 5 Badge + 4 PlayerHandBadge).
  - Dashboard impact: no new debt items opened (Story 63 lives in ROADMAP P2 backlog, not DOC_TEST_DEBT). No existing open items resolved by v2.5.12 work. Age distribution unchanged (max age 27 days; still 0–30 bucket).

- **v2.11 — May 2026 (v2.5.13 + v2.5.14 — scoring fix + UX Phase 3 primitives)**
  - PR #76: DugoutView.test.jsx updated (dugoutFocusMode contract)
  - PR #83: Pill.test.jsx (22 tests), ListRow.test.jsx (23 tests),
    ValidationBanner.test.jsx (12 tests), OfflineIndicator.test.jsx (14 tests) — new
  - PR #85: FAQSection.test.jsx (4 tests), LegalSection.test.jsx (5 tests) — new
  - Suite count: 654 → 734 passing / 1 skipped / 0 failed

- **v2.12 — May 2026 (v2.5.21 release — SW update banner + BottomSheet primitive + UX token families)**
  - New test file: `frontend/src/components/ui/BottomSheet.test.jsx` (7 tests, BS1–BS7, colocated with primitive — Story 87)
  - `theme.tokens.test.js`: 34 → 40 tests (+6 for `radius.sheet` + `shadow.sheetTop` tokens — Story 87)
  - New P2 test gaps logged: SW update banner integration (Story 85), sync-stories-to-issues script unit harness (Story 91)
  - D-S31 description refreshed: FEATURE_MAP registry now 29 rows; Coverage Summary still `/ 27` — drift increased from 1 line to 2 (this release added row #29 for BottomSheet)
  - P0 #1 + P0 #2 ages refreshed to 40 days; P0 #2 target slid v2.3.4 → v2.6.x (stale)
  - Suite count: 751 (CLAUDE.md baseline) → 759 passing / 1 skipped / 0 failed (Story 87 +13 nominal, net +8 — minor reconciliations elsewhere; the +1 skipped is the long-standing `bench-equity` 2.1 test, baseline doc was stale on that count)
  - Dashboard updated: P2 test gaps 5 → 7, P2 total 12 → 14, overall total 20 → 22, age distribution 0–30 days 20 → 22

- **v2.13 — May 2026 (v2.5.22 + v2.5.23 release pass)**
  - New test file (v2.5.22): `scripts/__tests__/sync-patch.test.js` — 4 regression tests via `node:test` runner covering CRLF-safe split, dead-code unwrap fix, and `patchHeading()` extraction (Story 97, PR #236). Runs in new CI `sync-script` job.
  - v2.5.23 ROADMAP cleanup: Story 77 (P2) flipped Resolved — App.jsx ESLint debt fully cleared across 5 phases (PRs #237 #244 #245). Story 81 (P2) retroactively flipped Resolved — Vite ^5→^6.4.2 upgrade shipped in v2.5.22 PR #235. Story 98 (P3) Resolved — ci.yml sync-script job gained `permissions: { contents: read }` (PR #243).
  - Age sweep: items opened 2026-04-17 refreshed 27/40 → 43 days; D-S30 (2026-04-24) refreshed 20 → 36 days; Story 61 follow-up (2026-05-19) 0 → 11 days; SW banner + sync-stories follow-ups (2026-05-27) 0 → 3 days.
  - Stale target retargets: P1 Scorer-Lock and P1 Roster-Wipe both slid v2.3.4 → v2.6.x.
  - Dashboard impact: no new debt items opened or resolved in DOC_TEST_DEBT (resolutions tracked in ROADMAP for Stories 77/81/98). Age distribution shifts: 0–30 days bucket drops to 4 (Story 61 + 2 SW/sync + D-S30 partial), 31–60 days bucket grows to 18 (was 0). Dashboard table at L398–401 not edited this pass — flagged as drift for a follow-up touch.

- **v2.14 — May 2026 (v2.5.24 release pass)**
  - versionHistory.test.js: 6 tests now (2 original + 4 new enforcement rules via PRs #257 #258). Tests enforce: techNote approved-strings, no PR/Story refs in userChanges, headline required (not title), date format recognized (ISO/MonthYear/LongDate).
  - DefenseDiamond FEATURE_MAP row #30: updated to reflect Story 93 Tier D shipped v2.5.24 (PR #259).
  - CLAUDE.md test count corrected: 759 → 771 (as of v2.5.24).
  - Age sweep: all items reflect 2026-05-31 as current date.
  - Dashboard table at L398–401 corrected to match v2.13 drift note (0–30: 4, 31–60: 18).

- **v2.15 — June 2026 (Story 99 backend test foundation, PR #272)**
  - Story 99 foundation shipped: supertest devDep, app/server split (`app.js` extracted from `index.js`, 5-line boot), `admin.auth.test.js` (9 in-process tests), `npm run test:unit`, hermetic `backend-unit` CI job.
  - Test inventory: backend now has TWO systems — 13 integration suites (custom runner) + 9 supertest unit tests (`admin.auth.test.js`). Frontend 771 (Vitest) unchanged. L222 count line updated to note all three separately.
  - Path convention fixed: backend specs live in `src/__tests__/` (was `src/tests/` in the teamData + aiProxy proposed-test entries — corrected this pass to match the `test:unit` glob).
  - Story 99 ROADMAP entry corrected: removed 3 false premises (rate limiter removed / CI doesn't run backend tests / zero coverage); status Open → In Progress.
  - backend/CLAUDE.md: documented app/server split, `test:unit`, `backend-unit` job; corrected the `/api/v1/admin/*` route-path doc bug that had reinforced the vacuous suite.
  - FEATURE_MAP row #33 added (Backend test foundation).
  - CI `BACKEND_URL` audit item: noted `backend-unit` as partial prod-URL-free mitigation.
