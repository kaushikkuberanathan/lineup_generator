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
| **Area** | Share links (8-char Supabase-backed) |
| **Description** | No automated test validates that a share link generated from a locked lineup renders correctly in Viewer mode with (a) full defensive grid, (b) full batting order, (c) absent players filtered, (d) walk-up song links. |
| **Risk if unfixed** | Silent regression breaks the #1 Strategic North Star ("share link bulletproof"). A future refactor of `shareCurrentLineup` or `SharedView.jsx` could ship with the link returning stale or incomplete data and we would not catch it pre-deploy. |
| **Proposed test** | `frontend/src/tests/shareLink.test.js` — build a lineup fixture, call `shareCurrentLineup`, parse the `share_links.payload` JSONB, assert every expected field is present and correctly filtered. Also a DOM test that `SharedView` renders all sections without errors given the payload. |
| **Opened** | 2026-04-17 |
| **Age** | 7 days |
| **Target** | v2.3.4 |

### 🔴 P0 — Game Mode Rendering + State

| | |
|---|---|
| **Area** | Game Mode (full-screen dugout view) |
| **Description** | No tests cover GameModeScreen rendering, inning advance, batter advance, or QuickSwap candidate filtering. The QuickSwap `onClick` regression in March 2026 (DefenseDiamond missing handlers) would not have been caught by tests. |
| **Risk if unfixed** | Silent regression breaks the #2 Strategic North Star ("Game Mode dugout-ready under pressure"). |
| **Proposed test** | `frontend/src/tests/gameMode.test.js` — render GameModeScreen with fixture lineup, simulate inning advance, simulate QuickSwap tap, assert state transitions and candidate filtering (including absent-player exclusion). |
| **Opened** | 2026-04-17 |
| **Age** | 7 days |
| **Target** | v2.3.4 |

### 🟠 P1 — Live Scoring Scorer-Lock Regression

| | |
|---|---|
| **Area** | Live scoring (scorer lock, inning entry) |
| **Description** | The v2.2.29 bug — `claimScorerLock` passing raw `userId` (null under shim) and violating NOT NULL constraint — has no regression test. If the shim is removed or modified, this class of silent failure can recur. Note: v2.3.3 added `realtimeRaceGuard.test.js`, `practiceModeIsolation.test.js`, and `runnerPlacement.test.js` — these add live scoring coverage but do not test the scorer-lock null check specifically. This item remains open. |
| **Risk if unfixed** | Scoring users silently unable to claim the role with no surfaced error — exactly what v2.2.29 had to fix in prod. |
| **Proposed test** | Add to `frontend/src/tests/scoring.test.js` — assert `claimScorerLock` rejects null `scorer_user_id` before issuing the upsert, OR assert that the shim fallback produces a non-null value in all code paths. |
| **Opened** | 2026-04-17 |
| **Age** | 7 days |
| **Target** | v2.3.4 |

### 🟠 P1 — Auth Flow End-to-End (Magic Link + Google OAuth)

| | |
|---|---|
| **Area** | Auth system (magic link + Google OAuth) |
| **Description** | No tests cover the magic link request → callback handling → team membership hydration flow. Same for Google OAuth. |
| **Risk if unfixed** | Phase 2 auth cutover (planned) cannot ship safely without regression coverage. An auth-gate re-activation that silently blocks unauthenticated viewers would reproduce the v2.2.22 hotfix scenario. |
| **Proposed test** | `frontend/src/tests/auth.test.js` — mock Supabase client, simulate magic link flow, assert `useAuth` state transitions correctly through `pending → authenticated`. Also test: share link renders when `authState === unauthenticated`. |
| **Opened** | 2026-04-17 |
| **Age** | 7 days |
| **Target** | Before Phase 2 auth cutover (not version-pinned) |

### 🟠 P1 — Roster-Wipe Guard + Recovery Endpoint

| | |
|---|---|
| **Area** | Roster backup/restore |
| **Description** | The backend `POST /api/teams/:teamId/data` has a wipe-guard (409 on empty roster over existing). The `GET /api/teams/:teamId/history` has `X-Admin-Key` auth. Neither path is tested. |
| **Risk if unfixed** | Two roster-wipe incidents already happened (Jan, Feb 2026). The guard is the primary prevention; if it silently stops working, we're back to paper recovery. |
| **Proposed test** | `backend/src/tests/teamData.test.js` — test the guard returns 409, test force-override returns 200, test history endpoint rejects without ADMIN_KEY, test history endpoint returns snapshots with ADMIN_KEY. |
| **Opened** | 2026-04-17 |
| **Age** | 7 days |
| **Target** | v2.3.4 |

### 🟡 P2 — Walk-Up Song Navigation

| | |
|---|---|
| **Area** | Walk-up songs per player |
| **Description** | No test that Songs tab filters to active players only, or that Play button invokes navigation with correct URL. Deep-link to native apps is OS-mediated (untestable at unit level) but the call site is testable. |
| **Risk if unfixed** | A future refactor of `activeBattingOrder` filtering could silently unfilter Songs view — would go unnoticed until a DJ parent complains about absent kids in the playlist. |
| **Proposed test** | Add to existing test or new `frontend/src/tests/songs.test.js` — assert Songs renders only `activeBattingOrder` players, assert Play button's href matches `player.walkUpSong.url`. |
| **Opened** | 2026-04-17 |
| **Age** | 7 days |
| **Target** | v2.4.0 |

### 🟡 P2 — PWA Install Prompt Logic

| | |
|---|---|
| **Area** | PWA Setup |
| **Description** | Install banner has platform branches (Android `beforeinstallprompt` vs iOS `standalone` detection vs already-installed) that are untested. |
| **Risk if unfixed** | Platform-specific install UX regressions; user confusion on a non-critical path. |
| **Proposed test** | `frontend/src/tests/pwaInstall.test.js` — mock `window.navigator.standalone`, `window.matchMedia("(display-mode: standalone)")`, and `beforeinstallprompt` event, assert correct banner variant renders. |
| **Opened** | 2026-04-17 |
| **Age** | 7 days |
| **Target** | v2.4.0 |

### 🟡 P2 — Analytics track() Wrapper + SSR Guards

| | |
|---|---|
| **Area** | Analytics (Mixpanel + Vercel Analytics + UTM) |
| **Description** | `analytics.js` has SSR guards (window/navigator) added in v2.2.7/v2.2.8 but no tests cover the guard branches. |
| **Risk if unfixed** | A future refactor could remove the guard and break CI if any test environment lacks window/navigator. |
| **Proposed test** | Add to existing fixtures — assert `track()` is a no-op when window is undefined, assert `getDeviceContext()` returns safe defaults in SSR-like env. |
| **Opened** | 2026-04-17 |
| **Age** | 7 days |
| **Target** | v2.4.0 |

### 🟡 P2 — AI Photo Import End-to-End

| | |
|---|---|
| **Area** | Schedule management + AI import |
| **Description** | The Claude API proxy path (schedule import, score card parse) has no integration test covering request body size limit (10mb), client-side canvas resize, or error handling. |
| **Risk if unfixed** | The v2.2.4 bug (large phone photos exceeding 5MB after base64) was a real prod incident; no regression test was added with the fix. |
| **Proposed test** | `backend/src/tests/aiProxy.test.js` — mock Anthropic API, test POST /api/ai with oversize payload returns 413, test valid payload returns parsed structure. |
| **Opened** | 2026-04-17 |
| **Age** | 7 days |
| **Target** | v2.4.0 |

### 🟡 P2 — D-S30: isFlagEnabled has no DB-read path (Story 30)

| | |
|---|---|
| **Area** | Feature flag system |
| **Description** | `isFlagEnabled(flagName)` is synchronous: reads `FEATURE_FLAGS[flagName]` from JS bundle default + `localStorage` override only. Does NOT query the Supabase `feature_flags` table at runtime. Flipping a DB row has no effect on active users without a code redeploy. Discovered April 2026 when SCORING_SHEET_V2 DB row was flipped expecting a runtime change. |
| **Risk if unfixed** | Any ops flag-flip procedure documented as "flip the DB row" is silently ineffective. Risk of mis-communication and delayed rollbacks. |
| **Proposed fix** | Extend `flagBootstrap.js` to fetch Supabase `feature_flags` table at app boot and merge into a runtime registry. `isFlagEnabled()` stays synchronous at call sites — async fetch happens once in the bootstrap path. Recommend (B) from Story 30 write-up in ROADMAP.md. |
| **Opened** | 2026-04-24 |
| **Age** | 0 days |
| **Target** | v2.6.x |

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
| **Description** | 306 tests existed when this item was opened; suite is now 395 across frontend + backend. There is still no doc-side map of what each test file covers. |
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

### 🟡 P2 — CI workflow `BACKEND_URL` audit

- **What:** Both backend integration test job and smoke test job hardcode prod URL in `.github/workflows/ci.yml`. Smoke job has misleading variable named `DEV_BACKEND_URL` that points to prod URL.
- **Decisions needed:** Should CI hit a dev/preview backend, or is prod read-only correct? If prod read-only is correct, rename variable for clarity.
- **Target:** v2.6.0 P2
- **Source:** Audited during v2.5.1 deploy, April 27, 2026.

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
| 🟡 P2 | 5 | 4 | 3 | **12** |
| **Total** | **10** | **6** | **4** | **20** |

**Age distribution:**
- 0–30 days: 20
- 31–60 days: 0
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
