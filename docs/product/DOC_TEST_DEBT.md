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

### 🟡 P2 — D-S332: Demo team seeding + seed-version upgrade (loadDemoTeam)

| | |
|---|---|
| **Area** | Demo team seeding + seed-version upgrade (`loadDemoTeam`) |
| **Description** | `loadDemoTeam()` now seeds from `demoSeed.js` and has a `demoSeedVersion` upgrade path (older/unversioned demos cleared + rebuilt on next open). NO automated test covers: (a) fresh demo creation builds 11-player roster + grid + 11-game schedule correctly, (b) the upgrade path clears old per-team keys + `deleteTeam` + rebuilds as v2 without duplicating the team, (c) the dedup guard still prevents double-create at the same version. Verified manually in dev (fresh-create path only; upgrade path reviewed but not runtime-tested). |
| **Risk if unfixed** | A refactor of `loadDemoTeam` could silently break demo onboarding (Strategic North Star #4: frictionless onboarding) or, worse, the upgrade path could clobber/duplicate teams for existing users. The upgrade branch is the least-exercised code and hits every existing demo user. |
| **Proposed test** | `frontend/src/tests/demoTeam.test.js` — assert fresh load creates correct roster/grid/schedule counts + `demoSeedVersion` stamp; assert upgrade path (seed a v1 demo → `loadDemoTeam` → old keys cleared, single team, v2 stamp); assert dedup no-op at current version. |
| **Opened** | 2026-06-15 |
| **Age** | 0 days |
| **Target** | v2.6.x |

### 🟡 P2 — D-S348c: `access_requests`, `profiles`, `feedback`, `feature_flags` RLS policies untested (Test-Health Survey Pass 3)

| | |
|---|---|
| **Area** | RLS / Security — defense-in-depth tables |
| **Description** | `004_rls_fixes.sql` explicitly frames these tables as defense-in-depth (all writes go through backend routes using `supabaseAdmin`; RLS here is not the primary gate), so a coverage gap is lower risk than on `team_data`/`teams`/`roster_snapshots`. Still zero coverage in `policies.test.js`. |
| **Risk if unfixed** | Low relative to the P0/P1 items above — the primary control (backend route auth) is separately covered by `backend/src/__tests__/admin.auth.test.js` etc. RLS here is a second line of defense that could silently stop working without anyone noticing. |
| **Proposed test** | Opportunistic — add when touching these tables for other reasons, no dedicated sprint needed. |
| **Opened** | 2026-08-01 |
| **Age** | 0 days |
| **Target** | Opportunistic, no version target |
| **Issue** | [#482](https://github.com/kaushikkuberanathan/lineup_generator/issues/482) |

### 🟠 P1 — D-S428b: `NoMembershipScreen` (Google sign-in gate-first routing) has zero tests (Test-Health Survey Pass 4)

| | |
|---|---|
| **Area** | Auth — `frontend/src/components/Auth/NoMembershipScreen.jsx` |
| **Description** | v2.7.0 shipped Google sign-in "gate-first — memberless sessions route to `NoMembershipScreen`." This is a real security/UX gate: a Google-authenticated user with no `team_memberships` row must never fall through to team data. No test file exists for this component. The existing umbrella item (D003, "Auth Flow End-to-End") predates the Google sign-in ship and doesn't name this specific gate-first invariant. |
| **Risk if unfixed** | A refactor of the auth-hydration path in `useAuth.js` could accidentally treat an empty memberships array the same as a populated one, and a memberless Google sign-in could see a stale/cached team's data instead of `NoMembershipScreen`. Nothing would catch this today. |
| **Proposed test** | `frontend/src/tests/noMembershipScreen.test.jsx` — mock `useAuth` to return a session with `memberships: []`, assert `NoMembershipScreen` renders and no team-data surface is reachable; assert the reverse (non-empty memberships) routes past it. |
| **Opened** | 2026-08-01 |
| **Age** | 0 days |
| **Target** | v2.9.x |
| **Issue** | [#481](https://github.com/kaushikkuberanathan/lineup_generator/issues/481) — filed as a standalone issue but folded under the existing D003 auth umbrella per KK's direction; no separate urgency |

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

### 🟡 P2 — Confirm intentional default-branch=develop setting, reconcile with release docs

| | |
|---|---|
| **Area** | Governance / repo settings |
| **Description** | Discovered 2026-08-01 during a branch/issue-cleanup audit: this repo's GitHub default branch is `develop`, not `main`. That's why "Closes #N" auto-closed #252 and #476 on merge into `develop` tonight — GitHub's closing-keyword behavior triggers on whatever branch is configured as default. Root `CLAUDE.md`'s Branch Strategy describes `main` as "Production" and frames the whole Release Ritual around a `develop -> main` promotion, implying `main` is the conceptually primary branch — but whether `develop`-as-GitHub-default is intentional or a leftover has never been explicitly decided or documented. |
| **Risk if unfixed** | Same category as tonight's `allow_auto_merge` and required-status-check changes: a repo setting that materially changes behavior (auto-close target, fresh-clone checkout, default PR base) sitting undocumented, waiting to be re-discovered as a surprise in a future session instead of a known, deliberate choice. |
| **Proposed action** | Decide whether `develop` should stay the GitHub default or be switched to `main`. Whichever way, document the decision explicitly in `CLAUDE.md`'s Branch Strategy section. |
| **Opened** | 2026-08-01 |
| **Target** | Next session — flagged as a real item, not a footnote (KK's explicit instruction) |
| **Issue** | [#488](https://github.com/kaushikkuberanathan/lineup_generator/issues/488) |

### 🟡 P2 — Share payload: songs-map divergence + absent-player song leakage (product decision needed)

| | |
|---|---|
| **Area** | Share links — `buildSharePayload()` (`frontend/src/utils/buildSharePayload.js`), extracted from App.jsx's `shareCurrentLineup()`/`shareViewerLink()` |
| **Description** | Two pre-existing behaviors surfaced 2026-08-02 while extracting the payload-building logic for P0 test coverage (Share Link Payload Integrity) — both are exactly what's shipped today, not introduced by the extraction, which preserved them precisely (see `buildSharePayload.test.js`'s comments on both). (1) `shareViewerLink()` hardcodes `songs: {}` while `shareCurrentLineup()` computes the real walk-up song map — the two share paths otherwise build near-identical payloads, with no comment explaining the divergence. (2) Both paths build the songs map from the *full, unfiltered* roster, independent of the `absentTonight` filter applied to the `roster` name list — an absent player's walk-up song can still appear in the payload even though their name is excluded from `roster`. |
| **Risk if unfixed** | Not a code defect — a product-intent question. Undocumented, it's the kind of thing that gets "corrected" by a future refactor without anyone realizing it was intentional (if it was), or stays quietly wrong (if it wasn't). |
| **Proposed action** | KK decides both: is the songs-map divergence intentional, and should absent players' songs be excluded like their names are? Then either update `buildSharePayload()` + its tests to match, or add a one-line comment recording the decision so it isn't re-discovered as a mystery. |
| **Opened** | 2026-08-02 |
| **Target** | Opportunistic — flag only, do not fix without a decision (KK's explicit instruction) |
| **Issue** | [#502](https://github.com/kaushikkuberanathan/lineup_generator/issues/502) |

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

### August 2, 2026 — D-S355 RED-by-design spec added (#479)

- ✅ **D-S355 — Live-scoring anon-test backdoors (#355) had zero test surface** — Resolved as a test-debt item (the underlying #355 vulnerability itself is NOT fixed — see below). Added an `LS` describe block to `backend/src/__tests__/rls/policies.test.js` (LS1–LS7 + LS7-control, 8 scenarios) covering all four hardcoded `*_anon_test` backdoors (`at_bats_anon_test`, `game_state_anon_test`, `scorer_lock_anon_test`, `audit_log_anon_test`) plus the three `allow_scorer_writes USING(true) WITH CHECK(true)` catch-alls on `live_game_state`/`game_scoring_sessions`/`scoring_audit_log`, mirroring S1b/S3/S4a's established RED-by-design convention exactly. Uses `LS_BACKDOOR_TEAM_ID` ('9000000000001', the "Demo All-Stars" fixture team — the second of the two hardcoded ids in the backdoor array) rather than the real Mud Hens id, and `LS_ARBITRARY_TEAM_ID` to prove `allow_scorer_writes` has zero team scoping at all — strictly broader than the four named backdoors. LS7-control (an arbitrary team against `at_bats`) is the one scenario in the block expected to stay green, documenting that `at_bats` has no catch-all and so its exposure is narrower than the other three tables'. **7 of the 8 new scenarios (LS1–LS7) are red-by-design specs for a REAL, CONFIRMED-LIVE-IN-PROD vulnerability** — confirmed directly against `docs/db/schema.sql`'s own "captured from prod" header, not assumed. **CI-required-check tension surfaced and decided:** the `rls` job was promoted to a required status check the same release (#480); merging LS1–LS7 as permanently-failing tests would fail `rls` on every subsequent PR until #355 is actually fixed, blocking all merges. Escalated to KK (2026-08-02) rather than decided unilaterally — KK confirmed the vulnerability is genuinely live in prod but chose **not** to attempt an urgent same-night fix (the real fix requires wiring actual auth into the Live Scoring write path, a Phase-4C-scale change, not a quick patch like migration 017). Decision: LS1–LS7 are `{ skip: '#355 tracked, unfixed — see PR #506' }` so the `rls` required check stays green for everyone else's PRs; the executable spec stays visible in source (not deleted) for whoever eventually fixes #355 to un-skip and turn green. LS7-control is NOT skipped — it asserts already-secure behavior (`at_bats` has no catch-all) and stays green today. **#355 itself remains open and unfixed** — this entry closes only the test-debt gap, per its own original scope. Validated via `node --check` (syntax) and a live `node --test` run against an unreachable local endpoint with the correct `RLS_TEST_SUPABASE_*` env var names (structural correctness — node:test reports all 7 LS tests as genuinely `skipped` with the exact tracking reason shown, LS7-control fails identically to every other real test in the suite via the shared `before()` hook's network call, no reference/syntax errors) — full RLS-semantics validation still depends on CI's `rls` job (ephemeral Docker stack), unavailable in this sandbox. Issue: [#479](https://github.com/kaushikkuberanathan/lineup_generator/issues/479).

### August 2, 2026 — dotenv self-promotional tip output suppressed (P3)

- ✅ **P3 — `dotenv`'s self-promotional "tip" output not suppressed in RLS test client** — Added `quiet: true` to `clients.js:28`'s `dotenv.config({...})` call. Investigated as a potential security incident earlier the same session (a `vestauth.com` line in the random-tip output looked like a possible prompt-injection/phishing string targeting AI agents) — confirmed benign via `npm view dotenv@17.4.2` against the real npm registry: legitimate package, real maintainer (`motdotla`), no compromise, no typosquat, published 3 months prior. The string is static marketing copy baked into the official package's own "tips" array, not a dynamic or network-triggered payload. Fixed same-day per KK's direction once confirmed benign.

### August 2, 2026 — Both P0 ship-blockers closed (Share Link Payload Integrity + Game Mode Rendering + State)

- ✅ **P0 — Game Mode Rendering + State** — `frontend/src/components/game-mode/GameModeScreen.test.jsx` (15 tests) and `frontend/src/components/game-mode/QuickSwap.test.jsx` (13 tests) added, 28 total. Covers: initial render + `initialInning` restore, Exit button, the defense/batting half-completion state machine (including the inning modal not opening until BOTH halves are marked done), the 200ms inning-advance transition, last-inning-exits-instead-of-advancing, QuickSwap open/close/swap wiring, the Out Tonight strip's absent-player visibility rules, and QuickSwap's candidate-list absent-player exclusion (including excluding the current occupant if they're marked absent). Genuine RED evidence surfaced while authoring, not synthetic: the `completeBothHalves()` test helper's assumed 2-click sequence was wrong (actual behavior needs 3 — the 2nd click reads the pre-click `bothHalvesDone` value and just re-calls `handleEndHalf()`), and an ambiguous `getByText('SS')` query collided between the header and an occupied position's badge — both caught the tests failing for a real reason before being fixed, satisfying the RED-checkpoint rule without needing a separate mutation pass. Re-verified 28/28 passing directly on this branch before writing this entry. Branch: `fix/game-mode-p0-coverage` (renamed from `fix/share-print-debt-stale`, which undersold what the branch now carries).
- ✅ **P0 — Share Link Payload Integrity** — Both halves of the ticket's proposed test now exist. **Payload-building half:** `shareCurrentLineup()`'s and `shareViewerLink()`'s near-duplicate inline payload construction extracted to `frontend/src/utils/buildSharePayload.js`; `buildSharePayload.test.js` (19 tests) covers field shape, absent-player filtering of the roster name list, `absentNames` presence/copy semantics, and walk-up song preservation. Mutation-tested: temporarily inverted the absent-player filter, confirmed exactly the 3 filtering-related tests went red (16/19 unaffected), reverted, confirmed 19/19 green again. **Render half:** `SharedView` (App.jsx) — previously a top-level but unexported function — made a named export with a one-line change (`export function SharedView(...)`; no other change) so it could be rendered in isolation. `frontend/src/__tests__/SharedView.test.jsx` (12 tests) renders it directly with a fixture payload and asserts every major section (header/team name/Print button, game-info vs. fallback line, player-filter pills present/absent, inning filter controls, diamond view + Bench/Out table, table-view toggle with per-inning position badges, Batting Order card with walk-up song details, absent-player footnote, footer) without throwing. Mutation-tested: temporarily short-circuited the absent-player footnote condition, confirmed exactly that 1 test went red (11/12 unaffected), reverted, confirmed 12/12 green again. Two pre-existing behavioral quirks surfaced during the extraction (songs-map divergence between the two share paths; absent players' walk-up songs still included despite name exclusion) were deliberately NOT fixed — flagged as a product-decision item, see [#502](https://github.com/kaushikkuberanathan/lineup_generator/issues/502) and the P2 entry above. Landed via PR #504 (merged into `develop` 2026-08-02, prior to this branch's own merge).
- Resolved independently on two deliberately separate branches per KK's branch-scoping instruction (different risk tiers — Game Mode's branch also carried the `App.jsx` locked-file extraction and the share/print stale-bug fix below; Share Link's branch was scoped tighter). Both are now genuinely present together as of this merge — the "both P0s clear" hedge in each branch's own copy of this ledger no longer applies.

### August 2, 2026 — Share/print production bug re-triaged as stale

- ✅ **P1 — Diagnose share/print broken in production** — Closed as stale, not fixed fresh. Opened April 27, 2026 against `renderPrint()`/`shareCurrentLineup()` being orphaned/dead — the exact defect class Story 67 (v2.5.15, 2026-05-19) fixed weeks later; the debt entry was simply never closed out or cross-referenced afterward. Re-verified directly against current `App.jsx`: `shareCurrentLineup()` (line 2123) builds the payload, calls `dbSaveShareLink`, and constructs the URL correctly, wired to a real button (line 4351); the shared-view `Print` button (line 867) is a plain `window.print()` call, also correctly wired. Neither shows the orphaned-function/dead-handler pattern the original entry described. Triggered by KK's explicit instruction to check whether this P1 was live before prioritizing the two P0 test-coverage items below it — it was not.
- **Separate finding surfaced during this check, not yet acted on:** `frontend/CLAUDE.md`'s "Key sections within App.jsx" documents a "Roster, Defense, Batting, Schedule, Print, Share, Links, Feedback, About" tab list that no longer exists — current navigation is `PRIMARY_TABS` (Home/My Team/Game Day/Support) with `GAMEDAY_SUBTABS` (Lineups/Songs/Dugout View) and `MORE_SUBTABS` (Account/FAQ/Feedback/Links/About/Updates/Legal). Share and Print are no longer tabs at all — Share is a sheet/modal, Print is a button on the shared-view page. This doc section needs a rewrite; flagging rather than fixing inline since it's out of scope for this pass.

### August 1, 2026 — Test-Health Survey Pass 3 (#476, #477, #480)

- ✅ **D-S411b — `docs/db/PROD_SCHEMA_BASELINE.md` stale, unflagged, contradicted its own designated successor doc** — Resolved same-day. Staleness banners added to `docs/db/PROD_SCHEMA_BASELINE.md` (RLS STATE section) and `PROD_SCHEMA_BASELINE_ADDENDUM_1.md` (doc-level, covering every RLS-off restatement in the file), each citing a direct read-only prod probe (2026-08-01): anon SELECT against prod `teams`/`roster_snapshots` returned zero rows with no error (the RLS-filtered signature), confirming the "RLS OFF, full CRUD+TRUNCATE" claim in both docs is stale and the WS-3 lockdown (v2.6.0) is actually live. Issue: [#476](https://github.com/kaushikkuberanathan/lineup_generator/issues/476).
- ✅ **D-S415 — `rls` CI job promoted to a required status check** — Resolved same-day, deliberately sequenced *before* D-S348a's coverage work (#477), reversing this ledger's original recommendation: KK's reasoning was that gating first means #477's new test scenarios land already protected by the required check, rather than being added to a suite that still wasn't gating anything. Verified #415's own "stable across several consecutive runs" precondition directly via the GitHub Actions API before promoting: 13 consecutive green runs of the `rls` job on `develop` since it was added to `ci.yml` (2026-07-31 20:13 onward, commit `1e52f0b`), zero failures. `RLS Policy Suite (ephemeral)` added to `required_status_checks.contexts` on both `main` and `develop` branch protection (alongside the existing `Frontend Tests (Vitest)` and `Backend Integration Tests (CI_SAFE, prod read-only)` — neither removed or altered). Stale "NOT yet a required status check" comment in `.github/workflows/ci.yml` corrected. Issue: [#480](https://github.com/kaushikkuberanathan/lineup_generator/issues/480), closed.
- ✅ **D-S348a — `teams` and `roster_snapshots` had zero RLS test coverage** — Resolved same-day, both halves, sequenced deliberately (higher-stakes `roster_snapshots` first, `teams` second). `roster_snapshots`: RS1-RS5 added, surfaced and fixed a live production bug along the way — the auto-prune trigger had no `SECURITY DEFINER`, so every roster-snapshot insert had been silently failing since v2.6.0 (2026-07-20); migration 017 fixed it, applied to DEV, verified 15/15 against the real database. `teams`: T1-T7 plus five positive controls added, covering all four operations (SELECT/INSERT/UPDATE/DELETE) against the actual policy shape read from migration 004 (not assumed) — including `teams_auth_insert`'s deliberately unscoped `WITH CHECK (true)` and `teams_auth_delete`'s stricter admin-only role check, distinct from UPDATE's admin/coach. Mutation-tested via a throwaway, never-merged branch: weakened `teams_auth_delete` to admin-or-coach, confirmed T7 alone went red (25/26, nothing else affected), reverted, confirmed 26/26 green again — proving the test detects a real regression, not just asserting a fixture. Re-verified 26/26 against DEV directly, not just CI's ephemeral stack. Issue: [#477](https://github.com/kaushikkuberanathan/lineup_generator/issues/477), closed.

### August 2, 2026 — Migration 007 admin-panel recursion regression test (#478)

- ✅ **D-S348b — Migration 007's admin-panel recursion fix had no regression test** — Resolved. Added `M1`–`M4` to `backend/src/__tests__/rls/policies.test.js`, plus a new `seedAdminRecursionFixture()` in `seed.js` (throwaway team + a real admin-role, active `team_memberships` row, cleaned up via the same self-contained/single-test-use pattern as `seedAdminDeleteFixture()`). Authenticates via the suite's existing `authedClient()` helper. **M1** proves a NON-admin authenticated read of `team_memberships` succeeds without error — Postgres evaluates BOTH permissive SELECT policies for that read (`user_sees_own_membership` OR `admin_manages_memberships`), so this is the broadest-reach guard: pre-007, EVERY authenticated reader recursed, not only admins. **M2** reproduces the exact scenario 007's own header names — an admin authenticating and reading `team_memberships`, which evaluates `admin_manages_memberships`'s `is_active_admin()` call, the self-referential shape that recursed before 007's `SECURITY DEFINER` fix. **M3**/**M4** extend the same guard to `access_requests` and `feedback` — the two tables 007's header calls out as sharing the same cross-table blast radius (reading them requires evaluating a `team_memberships` read internally, which tripped that table's own recursive policy pre-007). All four GREEN today (007's fix already applied) — a regression guard, not a RED-by-design spec. Verified via `node --check` only (no Docker in the authoring sandbox to run `supabase start` locally); live pass/fail depends on CI's `rls` job. Issue: [#478](https://github.com/kaushikkuberanathan/lineup_generator/issues/478), closed.

### June 12, 2026 — Story 99 Phase 2 tranche 2 (#252)

- ✅ **P2 — AI Photo Import End-to-End** — Resolved. `backend/src/__tests__/aiProxy.test.js` (6 tests, AI-1–AI-6) covers `POST /api/ai`: 503 unconfigured, **413 oversize body (the v2.2.4 regression guard)**, 400 invalid type, 200 happy-path with upstream status/body relay + call-shape assertions (model `claude-sonnet-4-6`, max_tokens, content forwarded), 504 AbortError timeout, 502 upstream-unreachable. Hermetic — `global.fetch` stubbed, `ANTHROPIC_API_KEY` save/override/restore; never bills Anthropic on a rejected request. (Story 99 / #252)

: `feature_flags` table schema (columns, RLS posture, evaluation priority) added.** Previously missing from the doc.
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
| 🔴 P0 | 0 | 0 | 0 | **0** |
| 🟠 P1 | 5 | 2 | 3 | **10** |
| 🟡 P2 | 8 | 5 | 7 | **20** |
| **Total** | **13** | **7** | **10** | **30** |

*(2026-08-02: recomputed by DIRECT COUNT of every `###` item actually present in each Open section, not by propagating prior arithmetic — this merge combined two branches that each edited this dashboard independently (see conflict-resolution note below), and direct counting is the only way to be sure the combined number is real rather than a doubled or dropped delta. This surfaced a genuine pre-existing drift, unrelated to tonight's work: Process Gaps had been under-counted for some time — 3 P1 items (Auto-Staging Git Hook, Windows Vitest pre-push hook OOM cascade, Box-score AI parser test coverage) and most of the 7 P2 process items were apparently never reflected in this table's counts, even though the items themselves were correctly listed in the Open section the whole time. Same failure class as D-S31 (FEATURE_MAP.md denominator drift) — a summary table silently diverging from the content it's supposed to summarize. Not fixed beyond correcting the count here; if a recurring drift-prevention mechanism is wanted, that's a new debt item, not something to silently add mid-merge.)*

*(2026-08-02: both P0 items resolved — Game Mode Rendering + State and Share Link Payload Integrity, merged from sibling branches `fix/game-mode-p0-coverage` and `fix/share-link-payload-coverage` — see Resolved section. First time this ledger has shown zero open P0s since the 2026-04-17 seed.)*

*(2026-08-02: "Diagnose share/print broken in production" resolved as stale — see Resolved section — so it no longer counts in Open Process Gaps.)*

*(2026-08-02: new P2 process gap — share payload songs-map divergence + absent-player song leakage, #502 — surfaced during the Share Link Payload Integrity P0 extraction, flag-only per KK's instruction.)*

*(2026-08-02: D-S348b — migration 007 admin-panel recursion regression test — resolved on a sibling branch, merged here — AND D-S355 — live-scoring anon-backdoor RED-by-design spec (resolved as a test-debt item; #355 itself remains open, see the Resolved entry and the note below) — both resolved same day, both merges combined in this conflict resolution.)*

*(D-S411b, D-S415, D-S348a, D-S348b, and D-S355 all resolved — see Resolved section — so none count in Open anymore (D-S348a and the other two same-day 2026-08-01; D-S348b and D-S355 both 2026-08-02). Remaining open P1 test gaps: Story 61 follow-up, Live Scoring Scorer-Lock Regression, Auth Flow End-to-End, Roster-Wipe Guard + Recovery Endpoint, D-S428b (issue #481). D-S348c (issue #482) remains the only named open P2. New 2026-08-01: default-branch=develop confirmation, #488 — the branch-cleanup audit's real cross-terminal finding, not a footnote.)*

**Note on D-S355's resolution scope:** closing this debt item means "the executable spec now exists," NOT "the vulnerability is fixed." #355 itself is still open and live in prod, tracked in ROADMAP.md/SECURITY_FRAMEWORK.md/AUTH_SECURITY_AUDIT_ROADMAP.md — see the Resolved section entry for the full CI-required-check tension this surfaced and how it was resolved (skip-with-tracking, not a fix).

**Age distribution:**
- 0–30 days: 5 (all opened 2026-08-01 — Test-Health Survey Passes 3 & 4; D-S348b and D-S355, both opened 2026-08-01, resolved 2026-08-02 and moved to Resolved, no longer counted here)
- 31–90 days: not recomputed this pass — the previous 31–60 / 60+ buckets were already stale relative to today; several P0/P1 items opened 2026-04-17 are now ~106 days old (see the corrected age on the Game Mode Rendering + State item above as one example). Flagged for the next full audit sweep per Audit Cadence rather than guessed here.
- 60+ days: not recomputed this pass (see above)

**Ship blockers:**
- None currently open. Next minor version bump was gated on both P0 items — Share Link Payload Integrity and Game Mode Rendering + State, both resolved 2026-08-02 (see Resolved section) — plus D-S411b and D-S348a, both resolved same-day 2026-08-01 (see Resolved section). Run `debt-p0` to confirm the gate before actually bumping the minor version, per the project's own minor-version-gate rule.

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

- **v2.16 — June 2026 (v2.5.26 release — About tab + regression guards)**
  - New test file: `frontend/src/components/Support/AboutTab.test.jsx` — 13 tests (AT1–AT13) covering all five About cards: smoke render, Card 1 headline + 6 feature bullets + Share button, Card 2 eyebrow/headline/credential, Card 3 email + LinkedIn hrefs, Card 4 APP_VERSION prop, Card 5 collapsible toggle behavior (Story 106, PR #290).
  - New test file: `frontend/src/__tests__/appImports.test.js` — 3 tests (Story 83 regression guard): asserts the `supabase` named import is present in App.jsx so submitFeedback()/submitBug() cannot throw a swallowed ReferenceError; includes a negative detector test proving the assertion is not vacuous (PR #289).
  - FEATURE_MAP row #34 updated: About tab Test File(s) None → `AboutTab.test.jsx` (13 tests); Test Status ❌ None → ✅ Yes. Registry count 33 → 34.
  - Backend teamData coverage expanded via Story 99 Phase 2 tranche 1 (PR #282): wipe-guard, envGuard, isAdminRequest.
  - Suite count: 815 passing / 1 skipped — 786 frontend (Vitest) + 29 backend (supertest); +16 frontend this release — AboutTab 13 + appImports 3.
  - Dashboard impact: no new debt items opened. About tab `AboutTab.test.jsx` pending debt (row #34) resolved.

- **v2.17 — June 2026 (Story 99 Phase 2 tranche 2, #252)**
  - New test file: `backend/src/__tests__/aiProxy.test.js` — 6 tests (AI-1–AI-6) covering `POST /api/ai`. Closes the P2 "AI Photo Import End-to-End" debt (moved to Resolved); the 413 oversize-body case is the missing v2.2.4 regression guard.
  - New test file: `backend/src/__tests__/auth.happy.test.js` — 4 tests (AUTH-1–AUTH-4) covering the `request-access` (201/409) and `magic-link` (200/403) primary paths. Hermetic via shared-`supabaseAdmin` singleton patch (also intercepts `logAuthEvent`), `signInWithOtp` stub, and `global.fetch` stub for the Resend send. Closes the "auth happy-path" half of #252.
  - #252 coverage now complete: wipe-guard (tranche 1) + AI proxy + auth happy-path.
  - Backend unit suite: 29 → 39 (+10). Dashboard: P2 test gaps 7 → 6, total open 22 → 21.

- **v2.18 — August 2026 (Test-Health Survey Passes 3 & 4)**
  - Survey-only pass, no code changes — assessment logged per KK's explicit "assessment and review only, no implementation without approval" instruction.
  - **Pass 3 (RLS/schema)** verdict: the dedicated RLS suite (`backend/src/__tests__/rls/policies.test.js`) is genuinely rigorous — real ephemeral Postgres, correct grant/RLS/empty-table distinction, unconditional prod-rejection fence — and does **not** repeat the Passes 1–2 fake-green pattern. Real gaps found instead: **D-S411b** (P0, new) — `docs/db/PROD_SCHEMA_BASELINE.md` is stale, unflagged, and contradicts its own designated successor doc, recreating the #342/#411 "acted on a description, not the database" failure class one document over; **D-S348a** (P0, new) — `teams` and `roster_snapshots` (2 of 3 tables originally exposed by #342) have zero anon/authenticated-client RLS test coverage; **D-S348b** (P1, new) — migration 007's admin-panel recursion fix has no regression test despite its own header requesting one; **D-S355** (P1, new) — the already-tracked #355 live-scoring anon-backdoors have no test surface to turn green when fixed; **D-S415** (P1, new, process) — the `rls` CI job isn't a required status check yet; **D-S348c** (P2, new) — `access_requests`/`profiles`/`feedback`/`feature_flags` RLS policies untested (lower risk, defense-in-depth only per `004_rls_fixes.sql`'s own framing).
  - **Pass 4 (frontend screens/data)** verdict: confirmed all pre-existing P0/P1 DOC_TEST_DEBT items (Share Link Payload Integrity, Game Mode Rendering + State, Share-link routing render path) are still accurate against current source — no fake-green pattern found there either. One new item opened: **D-S428b** (P1, new) — `NoMembershipScreen` (Google sign-in gate-first routing, shipped v2.7.0) has zero tests and wasn't specifically named under the existing D003 auth umbrella. Corrected a stale age field on the Game Mode Rendering + State item (was showing 43 days from its v2.5.5 origin; actually 106 days).
  - Dashboard: Test gaps 11 → 16, Doc gaps 6 → 7 → 6 (net, after same-day resolution), Process gaps 4 → 5. Total open 21 → 27. P0 total 2 → 3.
  - Age distribution not fully recomputed this pass (see dashboard note) — flagged as drift for the next full Audit Cadence sweep, consistent with the v2.13 precedent of flagging rather than guessing.
  - **Follow-up same day (2026-08-01):** KK directed running #428's read-only `pg_policies` ground-truth check before filing anything. No Supabase MCP auth or direct Postgres connection was available in-session, so a substitute read-only prod probe was run instead (`backend/spike-428-teams-roster-probe.js`, gitignored, mirrors the existing `spike-prod-authrole.js`/`spike-grants.js` convention): anon SELECT against prod `teams`/`roster_snapshots` returned `EMPTY-NO-ERROR` (RLS-filtered, not exposure) — reads confirmed clean. The `rls_test_anon_grants` RPC (migration 013) does not exist in prod (`PGRST202`); the underlying REVOKE statements live in migration 004 (confirmed applied to prod for WS-3), so this reads as a verification-tooling gap, not a live incident — treated as "clean enough to proceed," not silently rounded to either extreme.
  - Based on that result: **D-S411b resolved same-day** (see Resolved section, issue #476). Issues filed for the remaining six: D-S348a **#477** (teams/roster_snapshots coverage, `roster_snapshots` prioritized first), D-S348b **#478**, D-S355 **#479**, D-S415 **#480**, D-S428b **#481** (folded under D003 umbrella, no separate urgency), D-S348c **#482**.
  - **Second follow-up same day (2026-08-01):** KK deliberately reversed this ledger's original sequencing and asked for D-S415 (#480) done *before* D-S348a's coverage work (#477), reasoning that gating first means #477's new tests land already protected rather than added to a still-non-gating suite. Verified #415's "stable across several consecutive runs" precondition via the GitHub Actions API (13/13 green `rls` runs on `develop` since the job was added) before promoting — not assumed. `RLS Policy Suite (ephemeral)` added to required status checks on both `main` and `develop`; stale ci.yml comment corrected; **D-S415 resolved same-day**, issue #480 closed. Dashboard: Process gaps 5 → 4, P1 total 10 → 9, overall total 27 → 26.

- **v2.19 — August 2026 (D-S348b closure, #478)**
  - `M1`–`M4` added to `backend/src/__tests__/rls/policies.test.js`: admin-authenticated (and, for M1, non-admin-authenticated) regression coverage for migration 007's recursion fix on `team_memberships`/`access_requests`/`feedback`. New `seedAdminRecursionFixture()` + `TEAM_E`/`ADMIN_RECURSION_EMAIL` added to `seed.js`, same self-contained/single-test-use pattern as `seedAdminDeleteFixture()`/`TEAM_C`.
  - D-S348b moved to Resolved (see above). Validated via `node --check` only in this sandbox (no Docker to run `supabase start`); live pass/fail depends on CI's `rls` job on the PR.
  - Branch cut from `develop` after two sibling branches (`fix/game-mode-p0-coverage`, `fix/share-link-payload-coverage`) had already merged and resolved both P0 items — this ledger's dashboard picked up their numbers as the new baseline (P0 2→0, process P1 1→0/P2 +1) before this entry's own delta is applied. Net dashboard change from this entry alone: P1 test gaps 6→5, test gaps total 13→12, P1 total 8→7, overall total 24→23. (The upstream P0-resolution work did not add its own Revision History entry — flagged here rather than silently absorbed, but not backfilled as out of scope for this ticket.)
