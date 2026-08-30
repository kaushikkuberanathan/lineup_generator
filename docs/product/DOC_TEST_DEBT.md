# Dugout Lineup — Doc & Test Debt Ledger

> **Purpose:** Running ledger of known documentation and test coverage gaps. The debt backlog — not the backlog of features, but the backlog of things that *should* be documented or tested and aren't.
> **Rule:** Items over 30 days old must be addressed or explicitly deferred (with a reason) before the next minor version bump (x.Y.0).
> **Cadence:** Scanned every Friday (~5 min) during the weekly audit. Grown from FEATURE_MAP.md gaps and from session retros.
> **Owner:** KK (solo).

---

## v3.1.0 Release Test Inventory Additions

Recorded during release prep so the PR checklist does not rely on a drifting
aggregate count alone. New dedicated test files since v3.0.0:

- Backend: `legalConsent.test.js`, `email.test.js`, `ops.health.test.js`.
- Frontend behavior: `pendingFinalizationSync.test.js`,
  `scheduleHydrationFields.test.js`, `playerName.test.js`,
  `components/Support/LinksTab.test.jsx`, and
  `components/Support/UpdatesTab.test.jsx`.
- Frontend legal flow: `content/legal.test.js` and
  `utils/legalConsent.test.js`; existing `RequestAccessScreen.test.jsx` and
  `LegalSection.test.jsx` also grew consent/rendering coverage.
- CI confidence: `scripts/verify-vitest-file-inventory.test.mjs` tests the
  executable guard that proves every discovered frontend test file ran.
- Post-prep engine coverage: `bench-equity.test.js` Test 2.1 is now active and
  guards the #942 fair-rotation fix.
- QA sweep (PR #956): `LegalDocBody.test.jsx`, `LegalDocSheet.test.jsx`,
  `featureFlags.test.js`, `positions.test.js`, `analytics.test.js`,
  `deviceContext.test.js`, `roleLabels.test.js`, and backend `phone.test.js`.

Final-candidate totals at `1da474e`: 1486 frontend tests passed across 136
files; 295 backend unit tests passed.

- QA Coverage Scope follow-up (#965): `playerMapper.test.js` closes #945 —
  34 new tests covering each `mapPlayerToV2` inference branch individually,
  including a lock-in for the deliberately-unwired V1 speed/contact/power
  bridges. `useAuth.logout.test.js` closes #944 — 5 new tests covering
  `logout()` (the one exported function of `useAuth.js` with zero prior
  coverage; `checkSession`/`onAuthStateChange`/`sendMagicLink` were already
  covered by `auth.test.js`, and `requestAccess`/`updateProfileName`/
  `refreshMemberships` by their own dedicated files) plus a lock-in that an
  unhandled `onAuthStateChange` event type is a no-op. New totals: 1525
  frontend tests across 138 files.

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

### ✅ RESOLVED — useAuth.js `onAuthStateChange` silently strands user on failed `/me` call after `SIGNED_IN`

- **Discovered:** 2026-08-05 (Sprint 2 Story 6, Auth Flow End-to-End)
- **Resolved:** 2026-08-23 (test-coverage-analysis session) — merged to `develop` via PR [#767](https://github.com/kaushikkuberanathan/lineup_generator/pull/767), a genuine 2-parent merge commit (`996640a`), not squashed; feature branch `claude/test-coverage-analysis-ufzbj5` deleted post-merge
- **Fix:** `frontend/src/hooks/useAuth.js`'s `onAuthStateChange` SIGNED_IN handler now has an explicit `else` branch (mirroring `checkSession`'s existing `/me`-rejected handling) that logs the failure, sets the hook's `error` state to a user-facing message, and explicitly re-settles `authState` to `'unauthenticated'` instead of leaving it unchanged. The same fallback (`setError` + `setAuthState('unauthenticated')`) was added to the surrounding `catch` block for thrown/network errors, which previously only logged.
- **Test:** `frontend/src/tests/auth.test.js` test B4 rewritten to assert the fixed behavior (RED confirmed against the pre-fix code before applying the fix, then GREEN after).
- **Residual gap closed same day:** the hook's `error` field was not initially wired into `LoginScreen.jsx`'s UI (that would touch the locked `App.jsx` prop-wiring) — PR [#782](https://github.com/kaushikkuberanathan/lineup_generator/pull/782) closed this later the same session (2026-08-23), wiring `authError` into `LoginScreen`'s existing error display via a `useEffect`, reusing the form's existing error state and clear-on-edit behavior. `LoginScreen.test.jsx` gained 24 lines of coverage for the new wiring. A real user now sees the surfaced error, not just an internally-consistent `authState`.
- **Issue** | [#579](https://github.com/kaushikkuberanathan/lineup_generator/issues/579) — had been auto-closed by PR #580 (docs-only filing, not a fix); reopened 2026-08-23 and closed for real by PR #767's merge. Tracked alongside the rest of this session's coverage work under [#766](https://github.com/kaushikkuberanathan/lineup_generator/issues/766), also closed by #767.

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
| **Status** | Open — deferred to a dedicated session |
| **Type** | Refactor |
| **Opened** | 2026-04-17 |
| **Target** | Needs re-targeting when picked up (2026-08-05: deliberately not started this session) |
| **Summary** | FEATURE_MAP.md currently uses a flat numbered table (`\| 1 \| **Feature Name** \| MVP \|`). Adjacency tooling and AI cross-referencing require per-feature sections with structured fields: Code Surfaces, Doc Surfaces, FAQ Categories, Personas, Test Surfaces. Restructure adds `### <Feature Title>` sections below the existing summary table; table becomes TOC, sections become data. Same information, parseable by scripts. Required prerequisite for v2.2.41 Backlog Adjacency System. |
| **2026-08-05 scope check** | Re-read against current `FEATURE_MAP.md` (now 37 rows) before starting: 2 of the 5 proposed fields (Doc Surfaces, Test Surfaces) map directly from existing columns, but Code Surfaces, FAQ Categories, and Personas exist nowhere in the current table — each needs real per-feature investigation, not a reformat. Comparable in size to the App.jsx decomposition work this repo already treats as its own dedicated session (Story 104). Deferred per KK's explicit decision rather than attempted or silently shrunk within this batch. Issue: [#577](https://github.com/kaushikkuberanathan/lineup_generator/issues/577). |

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

### 🟡 P2 — Orphan Stash Cleanup

| | |
|---|---|
| **Area** | Governance |
| **Description** | Stashes accumulate silently across sessions. No convention for reviewing or dropping orphan stashes. |
| **Proposed action** | Review stash list at every session start. Establish a rule: if a stash is more than 2 sessions old with no active use, drop it. |
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

### 🟡 P2 — CI workflow `BACKEND_URL` audit

- **What:** Both backend integration test job and smoke test job hardcode prod URL in `.github/workflows/ci.yml`. Smoke job has misleading variable named `DEV_BACKEND_URL` that points to prod URL.
- **Decisions needed:** Should CI hit a dev/preview backend, or is prod read-only correct? If prod read-only is correct, rename variable for clarity.
- **Target:** v2.6.0 P2
- **Source:** Audited during v2.5.1 deploy, April 27, 2026.
- **Partial mitigation (Story 99, PR #272):** the new `backend-unit` CI job runs in-process supertest tests with no `BACKEND_URL` / prod dependency — admin auth-rejection coverage is now prod-URL-free. The hardcoded-prod-URL concern remains only for the live integration `backend` job and the smoke job.

### 🟡 P2 — InningModal.jsx `POS_COLORS.LC` diverges from canonical `color.position.LC` token

| | |
|---|---|
| **Area** | Game Mode / design tokens (game-mode/*, Story 133) |
| **Description** | `InningModal.jsx`'s local `POS_COLORS.LC` is `#27ae60` (green), diverging from the canonical `color.position.LC` token (`#2980b9`, blue) used everywhere else — DefenseDiamond, DugoutView, etc. Found during Story 133's (#698) 13-slice design-token migration and deliberately preserved byte-exact, since that migration was a zero-intended-visual-change reference swap; fixing a pre-existing color inconsistency was out of scope. |
| **Risk if unfixed** | Low — cosmetic only. One field (LC) renders a different color in this one modal than everywhere else in the app; no functional impact. |
| **Proposed fix** | Update `InningModal.jsx`'s `POS_COLORS.LC` to reference `color.position.LC` directly. Small, isolated visual fix. |
| **Opened** | 2026-08-23 (Story 133 code-complete pass) |
| **Age** | 0 days |
| **Target** | Opportunistic — no hard deadline, cosmetic only |
| **Issue** | [#794](https://github.com/kaushikkuberanathan/lineup_generator/issues/794) |

### 🟡 P2 — `snack_duty` column drop blocked on codebase audit

- **What:** Column verified present in Supabase as jsonb on April 27, 2026 (logged in MASTER_DEV_REFERENCE.md as outstanding manual action). **Not the same thing as** the live `renderSnackDuty()` UI feature in App.jsx — that feature reads/writes a plain string field (`game.snackDuty`) on each game object in the schedule array, a completely different storage location from this `team_data.snack_duty` jsonb column. Confirmed distinct during the Phase 4b slice 10 scoping spike (`docs/product/PHASE4B_SLICE10_SCOPING.md` § 3) so this item is not accidentally read as "the snack duty feature is being removed."
- **Prerequisite work:** grep frontend/ and backend/ for any read/write references to `snack_duty`. If clean, run `ALTER TABLE team_data DROP COLUMN snack_duty;` in Supabase SQL Editor. If references exist, remove them first.
- **Audit re-run 2026-08-06:** `grep -rn "snack_duty" frontend/src backend` returns one unrelated hit (`SNACK_DUTY_TAB: 'snack_duty_tab'`, a Mixpanel analytics event key in `trackingUrl.js`, not a DB read/write). The jsonb column itself is unreferenced in code — prerequisite is satisfied. **Unblocked for the manual `ALTER TABLE` DDL** — not run here (schema-affecting DDL is a manual Supabase SQL Editor action per project convention, not something to execute unattended).
- **Target:** v2.6.0 P2
- **Source:** Surfaced during MASTER_DEV_REFERENCE.md audit, April 27, 2026.

---

## Resolved

*(Items move here once shipped. Format: date, version, original description summary, resolution commit.)*

### August 28, 2026 — D-S31: FEATURE_MAP.md Coverage Summary denominator drift

- ✅ **P2 — D-S31: FEATURE_MAP.md Coverage Summary denominator drift** — Resolved, not by a dedicated fix — superseded by the repeated "direct recount before any edit" standing practice this ledger already enforces, which has been applied to `FEATURE_MAP.md`'s Coverage Summary on every row addition/status change since this item was opened (most recently the 967ef07 D-S30 closure, 2026-08-27). This item's original complaint (`/ 27` denominators against a "29 features" heading, later "drift increased from 1 line to 2" per the v2.12 refresh note above) no longer describes the file: confirmed by direct grep just now — `## Feature Registry (40 features)` and all six Coverage Summary lines read `/ 40` uniformly, zero mismatch. No standalone GitHub issue existed for this item (opened 2026-05-15, predates this repo's issue-per-debt-item convention) — none filed retroactively since there's no remaining gap to track.

### August 27, 2026 — D-S30: isFlagEnabled has no DB-read path (#112)

- ✅ **P2 — D-S30: isFlagEnabled has no DB-read path** — Resolved. `isFlagEnabled()` gains a module-level runtime cache (`setRuntimeFlagCache`, `featureFlags.js`) that App.jsx populates from `useFeatureFlags()`'s existing Supabase fetch (no new query) via a `useEffect`. Precedence: localStorage override > DB cache > static default — matches this item's own recommended fix (Option B: keep `isFlagEnabled()` synchronous at call sites, move the async fetch to bootstrap). Closes the actual gap this item described: previously `useFeatureFlags()`'s result was only consulted for `VIEWER_MODE`/`MAINTENANCE_MODE`, so a DB flag flip for any other flag (`ACCESSIBILITY_V1`, `SCORING_SHEET_V2`, `COMBINED_GAMEMODE_AND_SCORING`) genuinely had no runtime effect without a redeploy, confirmed by direct source read before starting. 6 new tests in `accessibility.v1.test.js` (Group 6), RED→GREEN mutation-verified (reverted the cache wiring, confirmed the import itself broke all 30 tests in that file, restored, confirmed 30/30 green). Full frontend suite clean (120 files, 1390 passed / 1 skipped). Landed together with Story 49/#120 (same PR) since both touch `featureFlags.js`. Issue: [#112](https://github.com/kaushikkuberanathan/lineup_generator/issues/112).

### August 27, 2026 — FAQ × Feature Flag coverage audit (superseded) + FAQ Linter (retired) — Story 333/#865

- ✅ **P3 — FAQ × Feature Flag coverage audit** — Superseded, not separately fixed. The persona-taxonomy `faqs.js` this item described (48 entries across 7 personas, one describing `liveScoringEnabled`-gated behavior without acknowledging the gate) was fully restructured into task-oriented `HELP_CATEGORIES` (Story 333). The rewritten scoring content ("Start scoring") now opens with an explicit flag-awareness caveat ("Live scoring is on for teams it's enabled for") rather than presenting it as universal. The specific line-191 entry this item pointed at no longer exists in that form.
- ✅ **P2 — FAQ Linter** — Retired, not built. This proposal asserted every FAQ category has "a matching persona in PERSONAS.md" — the persona taxonomy it depended on no longer exists after Story 333's task-oriented redesign, so the proposed linter's premise is gone. A future content-integrity check (if wanted) would need a different shape — e.g. asserting every `HELP_CATEGORIES` item has a unique `id`, which `FAQSection.test.jsx`'s H13 now covers directly.
- Issue: [#865](https://github.com/kaushikkuberanathan/lineup_generator/issues/865).

### August 27, 2026 — Dependency currency: 4 Dependabot bumps held (eslint, jsdom, react-dom, supabase-js) (#632-636)

- ✅ **P2 — Dependency currency: 4 Dependabot bumps held** — Resolved, all 4 root causes cleared, found stale during v2.15.0 post-promote docs audit (this entry sat as "open" after every underlying issue had already closed). `jsdom` 29→30 (#634) and `@supabase/supabase-js` 2.100→2.112 (#635) were both root-caused to CI's Node 20 pin — the v2.10.0 CI Node 20→22 bump (PR #678, 2026-08-15) cleared both blockers; issues closed 2026-08-16, `frontend/package.json`/`backend/package.json` already carry the bumped versions. `react-dom` 18→19 (#633) was resolved in v2.15.0 (PR #834) — `react` and `react-dom` bumped together to 19.2.8, closing the partial-bump mismatch this item was filed to track. `eslint` 8→10 (#632) only partially resolved on its original terms — landed at 9.39.5 instead of 10 (PR #834), since `eslint-plugin-react@7.37.5` still caps its peer range at `^9.7` (confirmed live against the npm registry during the v2.15.0 work, not assumed stale). #632 was closed on that basis. **Not fully closed:** the ESLint 10 bump itself remains blocked on the same peer-dep ceiling — Dependabot PR [#673](https://github.com/kaushikkuberanathan/lineup_generator/pull/673) is open against this exact bump and its "Frontend Tests (Vitest)" check is failing for that reason; per the reopened #636 umbrella's own instructions ("breaking-change surface, blocked peer-dep chains... get filed as their own issue"), this should get its own tracking issue rather than sitting on the umbrella. Issues: [#632](https://github.com/kaushikkuberanathan/lineup_generator/issues/632), [#633](https://github.com/kaushikkuberanathan/lineup_generator/issues/633), [#634](https://github.com/kaushikkuberanathan/lineup_generator/issues/634), [#635](https://github.com/kaushikkuberanathan/lineup_generator/issues/635) — umbrella [#636](https://github.com/kaushikkuberanathan/lineup_generator/issues/636) stays open by design.

### August 26, 2026 — RequestAccessScreen `submitted` confirmation state test coverage (#664)

- ✅ **P1 — RequestAccessScreen `submitted` confirmation state has no dedicated test coverage** — Resolved. Added 3 cases to `RequestAccessScreen.test.jsx`: `preserveSession:true` + successful submit renders the "Request Sent" confirmation card (not the form); `preserveSession:true` + a failed submit (`already_approved`) shows the form's error state instead, not the confirmation card; `preserveSession:false` (default) never shows the confirmation card at all, since that path routes through App.jsx to `PendingApprovalScreen` instead. Found and closed during the #406/#410 test-health survey's #664 closure pass — this item had been folded into the same #664 issue number as a separate, unrelated 5-item list (Story 124/#655 backend rate-limit + integration-test debt), untangled and both closed in the same PR (#849) since they were adjacent enough to fix together. PR: #849.

### August 17, 2026 — PendingApprovalScreen test coverage (#696)

- ✅ **P2 — PendingApprovalScreen has no test coverage** — Resolved. Added `frontend/src/components/Auth/PendingApprovalScreen.test.jsx` (5 tests), mirroring `NoMembershipScreen.test.jsx`'s shape (D-S428b/#481 precedent): confirmation heading + step-list render (both "Request submitted" occurrences — the `<h1>` and step 1's own label — selector-scoped since the bare text collides), pending email from `localStorage.getItem('lg_pending_email')` shown when present and its whole clause omitted when absent, `onTryLogin` wiring on "Try logging in", and an affordance-count check (exactly one button). **RED-checkpoint (mutation-test substitute — coverage-after-the-fact for an already-shipped, already-correct component, not a bug fix, so no natural RED state exists to capture)**: two mutations in one pass, matching D-S428b's precedent — inverted the `pendingEmail &&` conditional to `!pendingEmail &&`, and replaced the button's `onClick={onTryLogin}` with a no-op. 3 of 5 tests went red (the two email-presence tests plus the click-wiring test — exactly the ones touching either mutation); the render/step-list test and the button-count test correctly stayed green (neither mutation touches what they assert). Reverted both mutations, confirmed `git diff` on `PendingApprovalScreen.jsx` empty, re-ran and confirmed 5/5 green again. Full Auth suite re-run clean (4 files, 29 tests) and `npm run build` clean. No real production bug found — this closes a coverage gap only. Issue: [#696](https://github.com/kaushikkuberanathan/lineup_generator/issues/696).

### August 5, 2026 — FEATURE_MAP.md Missing Feature Rows (Analytics, PWA, Governance)

- ✅ **P1 — FEATURE_MAP.md Missing Feature Rows** — Resolved, structural-restructure half deliberately split off and deferred (see the still-open entry above). Added row 36 (Analytics — Mixpanel + Vercel Analytics + UTM) and row 37 (PWA Setup — install prompt + service worker), both citing existing doc sections (`docs/analytics/ANALYTICS.md` + `SOLUTION_DESIGN.md` §§ Analytics Architecture / PWA Setup) and both correctly marked `❌ None` for tests (confirmed by direct file search — no `analytics.test.js`/`pwaInstall.test.js` exists; PWA install logic lives inline in `App.jsx` around lines 1608–1774, no dedicated file). Renamed row 22 from "Governance infrastructure" to "Governance" for the exact Area-value string match the original ticket asked for — no other change to that row. Recounted `FEATURE_MAP.md`'s own Coverage Summary by direct tally against the table, not propagated arithmetic: 35→37 rows, Doc Current 30→32, No Tests 11→13, Doc Stale/Doc Missing/Tests Exist/Tests Partial unchanged. Issue: [#576](https://github.com/kaushikkuberanathan/lineup_generator/issues/576).

### August 5, 2026 — Box-score AI parser test coverage (teamName fix, PR #229)

- ✅ **P1 — Box-score AI parser test coverage** — Resolved. The parser's `systemPrompt`/`userContent` construction was inline in `App.jsx`'s `parseGameResult()`, closure-scoped over `activeTeam`/`roster` state, with no way to unit-test it independently of rendering the whole App — exactly the extraction gap this item's proposed test called out. Extracted to `frontend/src/utils/buildBoxScorePrompt.js` (App.jsx locked-file edit, gate phrase granted this session), mirroring `buildSharePayload.js`'s established pattern for this repo's App.jsx-testability problem. `parseGameResult()` itself is now a two-line call to the extracted function plus the existing fetch/AbortController/timeout plumbing, which was left untouched (out of scope — that's network wiring, not the teamName resolution logic this item was about). Added `frontend/src/utils/buildBoxScorePrompt.test.js` (8 tests): happy-path teamName extraction into the system prompt; a direct regression guard that `activeTeam === null` never produces the literal string `"undefined"` (the exact v2.5.20 bug shape Story 84/PR #178→#228→#229 fixed) in either the system prompt or user content; the same guard for `activeTeam` present but `.name` falsy; empty-roster handling; and userContent shape correctness for all three `sourceType` variants (`image` incl. default `media_type` fallback, `pdf`, `text`). **Mutation-test RED checkpoint** (file is untracked, so a `git stash` RED check doesn't apply — mutation substitute used, per this doc's own rule): reverted the `teamName` guard from `(activeTeam && activeTeam.name) ? activeTeam.name : ""` to a bare `activeTeam.name` — the null-guard test failed RED with a real `TypeError: Cannot read properties of null` (a stronger failure signature than a silent `"undefined"` string, and arguably a better regression trap than the original bug shape). Reverted, confirmed `git diff --stat` on the util file empty, re-ran and confirmed 8/8 green again. Also ran `npx eslint src/App.jsx src/utils/buildBoxScorePrompt.js` (clean) and `npm run build` (clean production build, pre-existing chunk-size warning unrelated) to verify the extraction didn't regress anything beyond the unit tests. No real production bug found in the current (already-fixed) behavior — this closes a coverage gap only. Branch: `issue/10-boxscore-parser-coverage`. Issue: [#570](https://github.com/kaushikkuberanathan/lineup_generator/issues/570) (filed retroactively, closed same session).

### August 5, 2026 — AppShareLinkRouting.test.jsx / AppNoMembershipRouting.test.jsx incomplete Supabase mocks fixed (Story 121, #535)

- ✅ **P0 — Incomplete Supabase mocks fire real network writes/deletes** — Resolved, and the blast radius was larger than this ticket originally scoped. Investigated as a hard-stop item per this repo's standing severity tier for live-data-mutation findings (same tier as D-S355) before any fix was attempted. **Confirmed by direct evidence, not assumption:** `frontend/.env`'s `VITE_SUPABASE_URL` (`hzaajccyurlyeweekvma.supabase.co` — the one real Supabase project this app uses, per `CLAUDE.md`'s own infra section) plus a real anon key are loaded by Vite for `test` mode (no test-mode override exists, `src/tests/setup.js` stubs only `window.matchMedia`), so `isSupabaseEnabled` is genuinely `true` under Vitest in this worktree — nothing neutralizes it. `App.jsx`'s boot-hydration effect ([App.jsx:1170](frontend/src/App.jsx:1170)) runs unconditionally on the first render of a fresh `<App/>`, gated only by `window._lineupDbBooted` (fresh per test file — Vitest's default `isolate: true`) and `isSupabaseEnabled`; when local `app:teams` storage is empty (true at the start of both affected files) it seeds/migrates 5 hardcoded real team IDs (the actual division rivals named in `CLAUDE.md`) and runs a one-time "Mud Hens" schedule-patch — real writes against the real coaching team's record, not a coverage abstraction. **A second file, `AppNoMembershipRouting.test.jsx`, had zero Supabase mocking at all** (not scoped in the original ticket) — its own second test even uses the real Mud Hens team ID (`1774297491626`) as a fixture. **CI is not exposed**: `frontend/.env` is gitignored and CI's `frontend` job injects no Supabase secrets, so `isSupabaseEnabled` is `false` there — the original ticket's "including in CI" framing was incorrect. **Confirmed not an active incident**: a read-only probe against the real REST endpoint (`teams?select=id&limit=1`, same anon key) returned `401 Legacy API keys are disabled` — disabled 2026-07-14T17:11:14Z, over three weeks before this investigation. Every write attempt through this path, past and present, fails identically; no real data was ever successfully mutated via this path. **Fix**: both files' `../supabase.js` mocks replaced with a fully self-contained mock (no `importOriginal` spread) listing every export (`supabase: null`, `isSupabaseEnabled: false`, and a `vi.fn()` stub for every `db*` function) — spreading `actual` doesn't get fixed by only overriding the `isSupabaseEnabled`/`supabase` export names, since `actual.dbSaveTeams` etc. are the real functions closed over the real module's own internal `supabase` binding, unaffected by what the mock factory returns under those names. **RED→GREEN evidence, real not synthetic**: reverted both fixes via `git stash` (files were tracked) and re-ran — 19 unhandled `Error: Legacy API keys are disabled` rejections fired from `src/supabase.js`'s real `dbSaveTeams`/`dbSaveTeamData` call sites, with all 8 tests still reporting "passed" throughout (proving the original defect: a broken mock that no assertion catches). Restored the fix, re-ran — 0 unhandled errors, same 8/8 passed. **Also traces and corrects a mischaracterization from earlier this same session**: the "11/16/18/19 errors" seen at the end of several `npx vitest run` full-suite executions during Sprint 2 work were attributed to the documented Bug #7 unhandled-rejection flake without verifying the source — they were actually these exact 401'd real-network-call attempts, not Bug #7 at all. Issue: [#535](https://github.com/kaushikkuberanathan/lineup_generator/issues/535). Branch: `issue/535-appsharelinkrouting-mock-fix`.

### August 5, 2026 — Auto-Staging Git Hook re-triaged as stale

- ✅ **P1 — Auto-Staging Git Hook** — Closed as stale, not fixed fresh. Opened 2026-04-17 against a git hook that "silently staged files that were intentionally unstaged" during the v2.2.31 session. Re-verified directly against current source: `.husky/pre-commit` does not exist at all (only `.husky/pre-push` exists, and per Story 75/PR #155 it validates the branch guard only — it does not touch the index). `.claude/settings.local.json` has no `hooks` key of any kind — no Claude-Code-level hook config exists either. Neither of the two mechanisms the original ticket's proposed action named as suspects (`.git/hooks`/husky, or Claude Code hook config) is present today; no git or tooling mechanism in this repo currently stages files on a user's behalf. The actual root cause — Claude Code's own file-creation/edit side effects landing in the working tree, then getting swept up by a blanket `git add -A`/`git add .` — was independently addressed by policy, not by removing a hook: root `CLAUDE.md`'s "Git Staging Discipline" section (mandatory explicit-path `git add`, `git add -A`/`git add .` banned outright) traces to the same v2.2.31→v2.2.36 governance-activation window (`d66eba9`, "governance activation: enhanced debt ledger, staging discipline, shell helpers") and has been the enforced convention in every commit since, including every Sprint 1/2 item this session and the prior one. No code change made — this closes a stale debt entry whose originally-suspected technical cause no longer exists and whose actual root cause was already fixed by a standing rule, years of commits deep, never cross-referenced back to this ticket. Investigated per KK's explicit direction (Sprint 2 continuation, 2026-08-05) before assuming a hook fix was still needed. Issue: [#568](https://github.com/kaushikkuberanathan/lineup_generator/issues/568) (filed retroactively, closed same session). Branch: `issue/8-auto-staging-hook-stale`.

### August 5, 2026 — Auth Flow End-to-End test coverage (magic link + Google OAuth)

- ✅ **P1 — Auth Flow End-to-End (Magic Link + Google OAuth)** — Resolved. `frontend/src/hooks/useAuth.js` had zero coverage for its session-hydration effect, its `onAuthStateChange` listener, or `sendMagicLink` — `AppShareLinkRouting.test.jsx` and `AppNoMembershipRouting.test.jsx` both mock `useAuth` entirely, so none of the hook's internal logic had ever run under test. Magic link and Google OAuth converge on the exact same post-redirect code path (both land back via Supabase with a session that fires `SIGNED_IN`), so one file covers both providers' shared hydration logic. Added `frontend/src/tests/auth.test.js` (15 tests, mirroring `useAuth.updateProfileName.test.js`'s `vi.hoisted` Supabase-mock + `renderHook` harness): Group A (7) — mount-time `checkSession()` for no-session/authenticated/no_membership/backend-401-signs-out/magic-link-hash-error-short-circuits/magic-link-hash-success-falls-through/network-throw-doesn't-hang-on-loading. Group B (4) — `onAuthStateChange` SIGNED_IN (with and without memberships) and SIGNED_OUT. Group C (4) — `sendMagicLink` success/`NOT_AUTHORIZED`/other-error/network-throw. Also added `frontend/src/components/Auth/LoginScreen.test.jsx` (6 tests) — the actual click-triggered Google OAuth entry point (`handleGoogleSignIn` → `supabase.auth.signInWithOAuth`) that `auth.test.js` starts downstream of; plus 2 magic-link submit-form tests. **Verified the Auth Principle directly against source rather than assuming it**: `App.jsx` calls `useAuth()` unconditionally on every mount, but the render tree checks `sharePayload` (share-link routing) before it ever checks `authState` — confirmed by reading the actual render order (share-link branches return early at lines ~7382/7403, the `authState==='loading'`/`'unauthenticated'` gates don't appear until ~7414+). Auth's async effects run in parallel with share-link rendering but never block it; this is the same invariant Story 61's `AppShareLinkRouting.test.jsx` already asserts from the App.jsx side, now corroborated from the hook side too. **No live/exploitable auth gap found** — the elevated-caution threshold from this item's D-S355-adjacent risk framing was not triggered. **One reliability gap found and flagged, not fixed** (test B4, `auth.test.js`): if Supabase fires `SIGNED_IN` but the backend `/me` call then fails, the `onAuthStateChange` handler's bare `if (res.ok)` guard means no state update happens at all — the user is left on the login screen with a live Supabase session and no error shown, silently. This is a UX/reliability stall, not an auth bypass (no unauthorized access results) — FLAGGED FOR KK REVIEW in `SPRINT2_EXECUTION_LOG.md`, out of scope for this coverage-only item. **Mutation-test RED checkpoints** (both new files are untracked and so cannot use a `git stash` RED check per this doc's own rule — mutation substitutes used instead): (1) inverted `useAuth.js`'s `memberships.length === 0` membership-gate check — 4 of 15 `auth.test.js` tests went red (A2, A3, A6, B3 — exactly the ones touching that branch), reverted, confirmed `git diff --stat` empty, re-ran 15/15 green. (2) inverted `LoginScreen.jsx`'s `handleGoogleSignIn` error-guard (`if (error)` → `if (!error)`) — 2 of 6 `LoginScreen.test.jsx` tests went red, reverted, confirmed `git diff --stat` empty, re-ran 6/6 green. Full frontend suite re-run after both reverts: 82 files / 996 passed + 1 skipped (exactly baseline 975+1 plus the 21 new tests) — the one nonzero-exit retry hit the documented Bug #7-adjacent unhandled-rejection noise from `AppNoMembershipRouting.test.jsx`'s mock, unrelated to this change; all tests passed both times. Branch: `issue/6-auth-flow-e2e-coverage`. Issue: [#566](https://github.com/kaushikkuberanathan/lineup_generator/issues/566) (filed retroactively — this item predates the issue-per-debt-item convention, resolved same session it was filed in).

### August 4, 2026 — Windows Vitest pre-push hook OOM cascade

- ✅ **P1 — Pre-push hook running full vitest suite OOM-cascades on Windows** — Resolved on two independent fronts. First, Story 75 (PR #155, v2.5.18) removed the Vitest/lint run from `.husky/pre-push` entirely — the hook now only validates the branch guard, so the specific failure mode this item described (pre-push OOM-cascading) can no longer happen; CI (GitHub Actions) is the sole authoritative test gate. Second, the underlying flake this item's mitigations were reaching for (cold-start worker-spawn timeouts, Bug #7) got a permanent mitigation via `fileParallelism: false` in `frontend/vite.config.js`'s `test:` block (Story 118/#517) — **this second fix is currently develop-only (v2.8.4), not yet promoted to main** as of this entry. The pre-push-specific resolution (front one) is live everywhere already and is sufficient on its own to close this exact item.

### August 4, 2026 — Roster-Wipe Guard + Recovery Endpoint test coverage

- ✅ **P1 — Backend wipe-guard and recovery/history endpoint were untested** — Resolved via Story 99 Phase 2 tranche 1 (PR #282, landed by v2.5.26). `backend/src/__tests__/teamData.guard.test.js` (12 tests) covers the `rosterWipeGuard` unit behavior and the `isAdminRequest` truth table directly. `backend/src/__tests__/teamData.routes.test.js` (6 tests) covers the route-level `POST/GET /api/v1/teams/:id` (+ legacy `/api/teams` dual-mount): 409 wipe-guard, `force` override, DB-error 500, and history-limit clamp. This closes the item's originally-proposed test scope (guard returns 409, force-override returns 200, history endpoint's `ADMIN_KEY` accept/reject truth table) — all four cases are covered, just not in a single file named exactly as the original ticket suggested. **Not covered by this closure:** the frontend's "Restore Previous Roster" UI itself remains untested — tracked separately in `FEATURE_MAP.md` row 18.

### August 2, 2026 — Live Scoring Scorer-Lock Regression (scorer_user_id null-safety)

- ✅ **P1 — `claimScorerLock` had no regression test for the v2.2.29 NOT NULL bug shape** — Resolved. Added `frontend/src/tests/scorerLockIdentity.test.js` (4 tests), mocking the Supabase client the same way `realtimeRaceGuard.test.js`/`practiceModeIsolation.test.js` do (per-table `.from()` dispatch, `renderHook` helper) rather than the ticket's literal suggested location `frontend/src/tests/scoring.test.js` — that file only covers `scoringEngine.js`'s pure functions and has no Supabase-mock/hook-rendering convention at all, so a new dedicated file was the better fit. Covers: (1) `claimScorerLock` upserts a non-null `scorer_user_id` matching a real authenticated `userId`; (2) same for the local-device shim identity used when there is no login; (3) `scoring_audit_log.actor_user_id` carries the same resolved identity, never diverges; (4) the 20s heartbeat re-upsert still carries the same non-null identity. **Mutation-test RED checkpoint** (substitute for RED-before-fix, since this is coverage-after-the-fact for an already-shipped v2.2.29 fix): temporarily changed `useLiveScoring.js`'s `_effectiveUserId` from `userId || null` to a hardcoded `null` (reproducing "the resolved identity is null regardless of what the caller passes in" — the v2.2.29 bug shape). All 4 tests failed RED (`expected null to be '<id>'`). Reverted; `git diff` on the hook came back empty; re-ran and confirmed 4/4 GREEN again. **Investigation finding, not a live bug:** `_effectiveUserId` in `useLiveScoring.js` has been a pure passthrough (`userId || null`) with no fallback of its own since v2.2.37 — the hook's own hardcoded `'admin-coach-mud-hens'` fallback and its paired null-guards (v2.2.28→v2.2.36) were both removed once a call-site fallback shipped. The real non-null guarantee today lives entirely in `frontend/src/components/game-mode/DugoutView.jsx`'s `scoringUserId` computation (`user.id` → `session.user.id` → a `scorer_local_id` UUID persisted in `localStorage`, itself hardcoded-fallback-safe if `localStorage` throws). DugoutView is the sole production caller of `useLiveScoring`, and this chain is unconditionally non-null, so **no shipped code path reaches `claimScorerLock` with a null identity today** — confirmed by grepping every call site of `useLiveScoring(` in `frontend/src/`. If a future refactor of that fallback chain, or a new caller that doesn't replicate it, drops the guarantee, this exact NOT NULL violation can recur with zero defense inside the hook itself (verified: no `!_effectiveUserId` guard exists anywhere in the current file). Flagged here for anyone touching that call site — not treated as a live incident, since it isn't reachable today. No production code was changed as part of this resolution — test-only, per this item's scope. Branch: `issue/scorer-lock-regression-test` (no pre-existing GitHub issue number — this item predates the issue-per-debt-item convention, same as Story 61's follow-up above).

### August 2, 2026 — Share-link routing render path test coverage (Story 61 follow-up)

- ✅ **P1 — Share-link routing render path had no automated coverage** — Resolved. Story 61 (v2.5.16) removed the `VIEWER_MODE` flag gate from `isViewer`/`isViewer64` and was verified only via a real-device Vercel preview smoke test — no render-test harness existed for either branch. Added `frontend/src/__tests__/AppShareLinkRouting.test.jsx` (6 tests), rendering the real `<App />` with `window.history.pushState` stubbing `window.location.search` (no existing precedent for URL stubbing in this repo; this file establishes it — `history.pushState` chosen over reassigning `window.location` since jsdom already updates `location.search` from it without needing `delete window.location`). Covers all three of the ticket's originally-named variants plus a fourth added for logical symmetry once the actual code was read: `?s=abc` (no params) → `SharedView`; `?s=abc&view=true` → `DugoutView`; `?s=abc&role=viewer` → `DugoutView` (added — both branches check `view==="true" || role==="viewer"` identically, so `role=viewer` is an equally-valid trigger and was worth asserting explicitly); `?share=<base64>` (no params) → `SharedView`; `?share=<base64>&view=true` → `DugoutView`; `?share=<base64>&role=viewer` → `DugoutView`. Confirmed by reading `App.jsx` directly that the `?s=` branch requires an async Supabase lookup (`dbLoadShareLink`) to resolve before the routing decision is even reachable (`sharePayload` must be set) — `dbLoadShareLink` is mocked via `vi.mock('../supabase.js', ...)` with `importOriginal` passthrough for everything else; the legacy `?share=` branch decodes synchronously in the render body so needed no async mock. `useAuth` and `virtual:pwa-register/react` mocked for hook stability only (matching `AppNoMembershipRouting.test.jsx`'s precedent) — neither branch's routing decision depends on auth state; both share-link branches return before the auth-gate code runs. `DugoutView` mocked to a marker div (it pulls in `useLiveScoring`, `ScoringModeEntry`, `LiveScoringPanel`, `DefenseDiamond`, etc. — mocking it matches `DugoutView.test.jsx`'s own convention of mocking its heavy children); `SharedView` was NOT mocked — it's the existing named export off `App.jsx` (see `SharedView.test.jsx`), and asserting its real rendered team-name/`Print` text is a stronger signal than a marker div. **No App.jsx edit was needed or made** — both routing decisions were already reachable through the existing `export default function App()` surface, matching the `NoMembershipScreen`-routing precedent exactly (unlike `SharedView`, which had needed a one-line export addition earlier the same night). **RED-checkpoint (mutation-test substitute, both branches in one pass, since this is coverage-after-the-fact for Story 61's already-shipped fix):** temporarily inverted both `isViewer` and `isViewer64` (`===` `→` a `!==`/`&&` negation, swapping which component each renders for every input) — all 6 tests went red. Reverted both mutations, confirmed `git diff --stat frontend/src/App.jsx` empty, re-ran and confirmed 6/6 green again. Test file placed in `frontend/src/__tests__/` (not the ticket's literally-suggested `frontend/src/tests/`) to match `SharedView.test.jsx`/`AppNoMembershipRouting.test.jsx`'s established location. No real production bug found — Story 61's fix is correct as shipped; this closes a coverage gap only. Branch: `issue/story61-share-link-routing-render-path` (no pre-existing GitHub issue number — ticket predates the issue-per-debt-item convention).

### August 2, 2026 — D-S428b: NoMembershipScreen gate-first routing test coverage (#481)

- ✅ **D-S428b — `NoMembershipScreen` (Google sign-in gate-first routing) had zero tests** — Resolved. Two files added, covering both halves of the original ticket. **Component half:** `frontend/src/components/Auth/NoMembershipScreen.test.jsx` (5 tests) — renders the gate-first heading and the signed-in email, omits the "as `<email>`" clause when no email is given, wires "Request access" → `onRequestAccess` and "Use a different account" → `onSignOut`, and asserts no team-data affordance (roster/schedule/batting-order text, more than 2 buttons) is present. **Routing-decision half:** `frontend/src/__tests__/AppNoMembershipRouting.test.jsx` (2 tests) — the gate-first invariant actually lives inline in `App.jsx`'s render (`if (authState === 'no_membership') return <NoMembershipScreen ... />`), gated on `useAuth()`'s return value, not in a standalone function. `useAuth` is mocked directly (`vi.mock('../hooks/useAuth', ...)`) rather than its Supabase/fetch internals, matching the boundary App.jsx itself relies on. No App.jsx export change was needed — `App` was already `export default function App()` (unlike the `SharedView` precedent, which did need a one-line export addition). Asserts: `authState: 'no_membership'`/`memberships: []` renders `NoMembershipScreen` with no bottom-nav/team-data surface reachable; `authState: 'authenticated'`/non-empty `memberships` routes straight past it to the primary tab bar, and the gate-first copy never renders. Both files colocate with this repo's established convention — colocated `ComponentName.test.jsx` next to the component (matching `LockFlow.test.jsx`, `AboutTab.test.jsx`, etc.) for the component half, and `frontend/src/__tests__/` (matching `SharedView.test.jsx`) for the App.jsx-level routing half — rather than the ticket's literal suggested single-file path. **RED-checkpoint (mutation-test substitute, both halves in one pass):** temporarily swapped the two `onClick` handlers in `NoMembershipScreen.jsx` (Request access → `onSignOut`, Use a different account → `onRequestAccess`) AND inverted the App.jsx gate to `if (authState !== 'no_membership')` at the same time; re-ran both files — 4 of 7 tests went red (both button-wiring tests in the component file, both routing-decision tests in the App file; the 3 non-wiring/non-routing component tests stayed green, as expected). Reverted both mutations, confirmed `git diff` clean against develop for both `App.jsx` and `NoMembershipScreen.jsx`, re-ran and confirmed 7/7 green again. No real production bug found — `useAuth.js`'s `memberships.length === 0` → `'no_membership'` gate and App.jsx's inline routing on it are correct as shipped; this closes a coverage gap only, not a fix. Branch: `issue/481-nomembershipscreen-coverage`.

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
| 🟠 P1 | 0 | 1 | 0 | **1** |
| 🟡 P2 | 7 | 4 | 7 | **18** |
| **Total** | **7** | **5** | **7** | **19** |

*(2026-08-29, v3.0.0-prep release-readiness audit: `debt-p0` re-run fresh against `develop` HEAD (`bf097f0`, post #899) — 0 open P0, gate clear. Direct recount of every `### 🔴`/`### 🟠`/`### 🟡` heading actually present in each Open section matched this table exactly (0/0/0 P0, 0/1/0 P1, 7/4/7 P2) — no drift found, no table edit needed. This audit predates a full re-scan for new gaps opened by #893-#899 (the Phase 4C shim-removal and auth-bug-fix batch) — those PRs each shipped with their own test coverage per their descriptions, but no dedicated debt-ledger pass has verified that coverage the way this ledger's own standing practice expects; flagging as the one open item before this release's Ship Gate can be called fully clear, not assuming it silently. Fresh suite counts this pass: frontend 1401 passed / 1 skipped (122 files, up from 1377/1/120), backend unit 269/269 (up from 254) — both run locally with CI's exact dummy-env pattern, not carried forward from a stale figure. CI itself re-confirmed green on `bf097f0`: Backend Integration (CI_SAFE, prod read-only), RLS Policy Suite (ephemeral), Frontend Vitest, Backend Unit, and Sync-script jobs all `success`.)*

*(2026-08-28: D-S31 (FEATURE_MAP.md Coverage Summary denominator drift) resolved, moved to Resolved section — see that entry. Direct recount of every `### 🟠`/`### 🟡` heading actually present in `## Open — Doc Gaps` immediately before this edit matched the prior table exactly (1 P1 + 5 P2 = 6) — clean single-item removal, not a drift correction. Doc Gaps P2 5→4, Total Doc Gaps 6→5, P2 row 19→18, Grand Total 20→19.)*

*(2026-08-27: D-S30 (isFlagEnabled DB-read path, #112) resolved, moved to Resolved section — see that entry; Test Gaps P2 8→7. While doing the direct recount this ledger's own standing practice requires before any edit, found the Process Gaps column was ALSO already drifted, independent of this change: the prior table claimed 9 P2 Process Gaps, but a line-by-line count of every `### 🟡`/`### 🟠`/`### 🔴` heading actually present in `## Open — Tooling / Process Gaps` (line 198 onward) found only 7 — `Confirm intentional default-branch=develop setting`, `Share payload songs-map divergence`, `Orphan Stash Cleanup`, `FEATURE_MAP.md Sync Linter`, `CI workflow BACKEND_URL audit`, `InningModal.jsx POS_COLORS.LC divergence`, `snack_duty column drop` — no 8th or 9th heading exists in that section today. Root cause not identified (same "silently diverging from a prior arithmetic propagation" failure class as D-S31 and the 2026-08-23 Test Gaps correction above); not investigating further, just correcting the count as found, per this ledger's own established practice when this recurs. Doc Gaps (1 P1 + 5 P2 = 6) matched the prior table exactly, untouched. Net: Test Gaps P2 8→7 (Total Test Gaps 8→7), Process Gaps P2 9→7 (Total Process Gaps 9→7, drift correction), P2 row 22→19, Grand Total 23→20.)*

*(2026-08-26: RequestAccessScreen `submitted`-state test gap (#664) resolved, moved to Resolved section — see that entry. Direct recount of every `### 🔴`/`### 🟠`/`### 🟡` heading actually present in each Open section immediately before this edit matched the prior table exactly (0/1/8 Test Gaps P0/P1/P2, Doc Gaps and Process Gaps both untouched) — clean single-item removal, not a drift correction. Test Gaps P1 1→0, Total Test Gaps 9→8, P1 Total 2→1, Grand Total 24→23.)*

*(2026-08-23, v2.13.0 release-prep audit: direct recount of every `### 🔴`/`### 🟠`/`### 🟡` heading actually present in each Open section, by line number, before this edit — Test Gaps: 1 P1 + 8 P2 = 9, not the 10 the prior table claimed (the P2 Test Gaps figure had drifted to 9 sometime after the 2026-08-19 entry without a matching 9th heading ever being added; root cause not identified, flagging as found rather than guessed). Doc Gaps (1 P1 + 5 P2 = 6) and Process Gaps (0 + 8 = 8, pre-this-edit) both matched the prior table exactly. New P2 process gap added this pass — InningModal.jsx `POS_COLORS.LC` token divergence, #794, found during the Story 133 code-complete pass, see Open — Tooling / Process Gaps above. Net: Test Gaps P2 corrected 9→8 (drift fix, Total Test Gaps 10→9), Process Gaps P2 8→9 (new item, Total Process Gaps 8→9); both changes cancel in the Grand Total (24→24) but the per-column Total row changes from 10/6/8 to 9/6/9. Also updated this pass: the #579 entry's "residual gap" note, now closed by PR #782 (LoginScreen error wiring) — no count change, that item was already excluded from these tallies as `✅ RESOLVED`. `debt-p0` gate re-confirmed clear (0 P0) before the v2.13.0 minor version bump.)*

*(2026-08-07: new P2 process gap added — Dependency currency: 4 Dependabot bumps held (eslint/jsdom/react-dom/supabase-js), #632-#636 — see the Open — Tooling / Process Gaps section. Direct recount of every `### 🔴`/`### 🟠`/`### 🟡` heading actually present in each Open section immediately before this edit matched the prior table exactly (9/1/7, P2 9/5/7 = 21, Total 9/6/7 = 22), so this is a clean single-item addition, not a correction of pre-existing drift. Process Gaps P2 7→8, Total Process Gaps 7→8, P2 row 21→22, Grand Total 22→23.)*

*(2026-08-05: table repaired after a squash-merge left two overlapping, malformed table fragments in this file (PR #574/#575/#578 each carried their own dashboard edit against a diverging base, all landed via squash). This merge additionally folds in PR #580's useAuth.js P2 test-gap addition (#579), which landed on `develop` after the table-repair branch was cut. Values confirmed by direct count of every `### 🔴`/`### 🟠`/`### 🟡` heading actually present in Open just now — not propagated from either side's own arithmetic: 0 P0; 1 P1 (FEATURE_MAP.md Structural Restructure, the only item still open); 21 P2 (9 Test Gaps incl. the useAuth.js finding + 5 Doc Gaps + 7 Process Gaps). Grand Total 22. Clears the `debt-p0` gate — zero open P0 items.)*

*(2026-08-05, branch-hygiene audit: corrected an arithmetic error in the prior entry below — its Test Gaps column total and Grand Total both dropped the existing P0 item (`AppShareLinkRouting.test.jsx` mock) when recomputing after item 10's closure, undercounting both by exactly 1. Direct recount of every `### 🔴`/`### 🟠`/`### 🟡` heading actually present in Open — Test Gaps: 1 P0 + 0 P1 + 8 P2 = 9 (not 8). Doc Gaps (7) and Process Gaps (7) were already correct. Corrected: Total row 9/7/7 = 23, not 8/7/7 = 22. This was a column-sum-vs-row-sum mismatch inside the table itself (P0 1 + P1 2 + P2 20 = 23 by row, but the old Total row said 22) — exactly the kind of drift this ledger's own standing practice exists to catch.)*

*(2026-08-05, merge-conflict resolution combining item 10's own closure (Box-score AI parser test coverage) with the already-merged closures of items 6 (Auth Flow End-to-End, PR #567) and 8 (Auto-Staging Git Hook, PR #569) inherited via this merge from `develop`: direct recount of every `### 🟠`/`### 🟡` heading actually present in each Open section on this branch, post-merge — Doc Gaps 2 P1 + 5 P2 = 7 (untouched by any of the three closures); Process Gaps 0 P1 (Box-score AI parser test coverage now closed, Auto-Staging Git Hook already closed) + 7 P2 = 7. Neither this branch's nor `develop`'s pre-merge dashboard edit was correct in isolation post-merge — each only accounted for its own closure against a now-stale baseline. Combined: P1 0/2/0 = 2, P2 8/5/7 = 20.)*

*(2026-08-04, Doc Audit Spike Story 8: two P1 items resolved — Roster-Wipe Guard + Recovery Endpoint (Test Gaps; tests exist via PR #282) and Windows Vitest pre-push hook OOM cascade (Process Gaps; pre-push no longer runs Vitest at all, Story 75) — both moved to Resolved section. Direct recount of every `### 🔴`/`### 🟠`/`### 🟡` heading actually present in each Open section immediately before this edit matched the prior table exactly (1/2/8 Test Gaps, 0/2/5 Doc Gaps, 0/3/7 Process Gaps = 28), so this is a clean two-item removal, not a correction of pre-existing drift. Test Gaps P1 2→1 (11→10 total); Process Gaps P1 3→2 (10→9 total); P1 row 7→5; Grand Total 28→26. Also re-targeted the Box-score AI parser item's stale "v2.6.0" Target to "v2.9.0" (current version is v2.8.4/v2.8.3) — no count change, still open.)*

*(2026-08-04: new P0 test gap added — `AppShareLinkRouting.test.jsx` incomplete Supabase mock, live-data-mutation risk, discovered while diagnosing an unrelated Vitest flake (Story 118/#517) on the Dugout worktree. Direct count re-verified against every `### 🔴`/`### 🟠`/`### 🟡` heading actually present in Open — Test Gaps before this edit (0 P0, 3 P1, 8 P2 = 11 unchanged aside from the new P0), matching this table's prior state exactly. Test Gaps 10→11, P0 Total 0→1, Grand Total 27→28. This item's own priority definition ("Cannot ship a minor version with P0 debt open") does not block the release this was filed ahead of — that release is a PATCH bump (v2.8.3→v2.8.4), not a minor bump (x.Y.0); the project's own `debt-p0` gate is explicitly scoped to minor bumps only. Logged here per KK's explicit instruction to patch the ledger before that release, not because the release itself required it.)*

*(2026-08-02: recomputed by DIRECT COUNT of every `###` item actually present in each Open section, not by propagating prior arithmetic — this merge combined two branches that each edited this dashboard independently (see conflict-resolution note below), and direct counting is the only way to be sure the combined number is real rather than a doubled or dropped delta. This surfaced a genuine pre-existing drift, unrelated to tonight's work: Process Gaps had been under-counted for some time — 3 P1 items (Auto-Staging Git Hook, Windows Vitest pre-push hook OOM cascade, Box-score AI parser test coverage) and most of the 7 P2 process items were apparently never reflected in this table's counts, even though the items themselves were correctly listed in the Open section the whole time. Same failure class as D-S31 (FEATURE_MAP.md denominator drift) — a summary table silently diverging from the content it's supposed to summarize. Not fixed beyond correcting the count here; if a recurring drift-prevention mechanism is wanted, that's a new debt item, not something to silently add mid-merge.)*

*(2026-08-02: both P0 items resolved — Game Mode Rendering + State and Share Link Payload Integrity, merged from sibling branches `fix/game-mode-p0-coverage` and `fix/share-link-payload-coverage` — see Resolved section. First time this ledger has shown zero open P0s since the 2026-04-17 seed.)*

*(2026-08-02: "Diagnose share/print broken in production" resolved as stale — see Resolved section — so it no longer counts in Open Process Gaps.)*

*(2026-08-02: new P2 process gap — share payload songs-map divergence + absent-player song leakage, #502 — surfaced during the Share Link Payload Integrity P0 extraction, flag-only per KK's instruction.)*

*(2026-08-02: D-S348b — migration 007 admin-panel recursion regression test — resolved on a sibling branch, merged here — AND D-S355 — live-scoring anon-backdoor RED-by-design spec (resolved as a test-debt item; #355 itself remains open, see the Resolved entry and the note below) — both resolved same day, both merges combined in this conflict resolution.)*

*(D-S411b, D-S415, D-S348a, D-S348b, and D-S355 all resolved — see Resolved section — so none count in Open anymore (D-S348a and the other two same-day 2026-08-01; D-S348b and D-S355 both 2026-08-02). Remaining open P1 test gaps: Story 61 follow-up, Live Scoring Scorer-Lock Regression, Auth Flow End-to-End, Roster-Wipe Guard + Recovery Endpoint. D-S348c (issue #482) remains the only named open P2. New 2026-08-01: default-branch=develop confirmation, #488 — the branch-cleanup audit's real cross-terminal finding, not a footnote.)*

*(2026-08-02: D-S428b — `NoMembershipScreen` gate-first routing test coverage, #481 — resolved, moved to Resolved section. P1 Test Gaps 5→4, Total Test Gaps 13→12, P1 Total 10→9, Grand Total 30→29. Direct count of every `### 🟠`/`### 🟡` heading actually present in each Open section, cross-checked against the table rather than trusting only prior arithmetic (per this ledger's own standing practice, restated below): Test Gaps — 4 P1 (Share-link routing render path, Live Scoring Scorer-Lock Regression, Auth Flow End-to-End, Roster-Wipe Guard + Recovery Endpoint) + 8 P2 (Walk-Up Song Navigation, PWA Install Prompt Logic, Analytics track() Wrapper, D-S30, SW update banner lifecycle, sync-stories-to-issues.js guard, D-S332, D-S348c) = 12. Doc Gaps — 2 P1 (FEATURE_MAP.md Structural Restructure, FEATURE_MAP.md Missing Feature Rows) + 5 P2 (SOLUTION_DESIGN.md Test Suite Inventory, ROADMAP.md Feature Summary Header, ONE_PAGER.md Data Source Check, Legal Content Regulatory Posture, D-S31) = 7 (the FAQ × Feature Flag P3 item is tracked in-section but, consistent with the existing table shape, has no P3 row in the dashboard). Process Gaps — 3 P1 (Auto-Staging Git Hook, Windows Vitest pre-push hook OOM cascade, Box-score AI parser test coverage) + 7 P2 (default-branch=develop confirmation, songs-map divergence #502, Orphan Stash Cleanup, FAQ Linter, FEATURE_MAP.md Sync Linter, CI workflow BACKEND_URL audit, snack_duty column drop) = 10. All three section counts match the table above exactly both before and after this edit — no further drift found this pass.)*

*(2026-08-02: Share-link routing render path (Story 61 follow-up) — resolved, moved to Resolved section. P1 Test Gaps 4→3, Total Test Gaps 12→11, P1 Total 9→8, Grand Total 29→28. This branch (`issue/story61-share-link-routing-render-path`) was cut from `origin/develop` at commit `db6efbc` (post D-S428b), so this edit starts from that merge's already-corrected baseline rather than re-deriving it independently. Direct re-count of every `### 🟠`/`### 🟡` heading actually present in each Open section immediately before this edit, cross-checked against the then-current table (4/2/3 P1, 8/5/7 P2 — matched exactly, no drift found this pass): Test Gaps — 3 P1 remaining (Live Scoring Scorer-Lock Regression, Auth Flow End-to-End, Roster-Wipe Guard + Recovery Endpoint) + 8 P2 (unchanged) = 11. Doc Gaps — 2 P1 + 5 P2 = 7 (untouched by this item, unchanged). Process Gaps — 3 P1 + 7 P2 = 10 (untouched by this item, unchanged). New table: P1 3/2/3 = 8, P2 8/5/7 = 20, Totals 11/7/10 = 28.)*

*(2026-08-02: Live Scoring Scorer-Lock Regression — resolved, moved to Resolved section. This branch (`issue/scorer-lock-regression-test`) was cut from `origin/develop` at commit `82c3e9c` (post Story 61 follow-up, itself post D-S428b) — note for anyone reviewing branch history: this item's first draft was accidentally authored against a stale local checkout ~24 commits behind `origin/develop` (missed 12 commits' worth of DOC_TEST_DEBT.md edits, including both P0 closures, D-S348b, D-S355, D-S428b, and Story 61's own resolution); caught before pushing by comparing `git log HEAD..origin/develop -- docs/product/DOC_TEST_DEBT.md`, discarded, and redone from a fresh branch off `origin/develop` — this entry reflects the redone version only. Direct re-count of every `### 🟠`/`### 🟡` heading actually present in each Open section immediately before this edit, cross-checked against the then-current table (3/2/3 P1, 8/5/7 P2 — matched exactly, no drift found this pass): Test Gaps — 2 P1 remaining (Auth Flow End-to-End, Roster-Wipe Guard + Recovery Endpoint) + 8 P2 (unchanged) = 10. Doc Gaps — 2 P1 + 5 P2 = 7 (untouched, unchanged). Process Gaps — 3 P1 + 7 P2 = 10 (untouched, unchanged). New table: P1 2/2/3 = 7, P2 8/5/7 = 20, Totals 10/7/10 = 27. P1 Test Gaps 3→2, Total Test Gaps 11→10, P1 Total 8→7, Grand Total 28→27.)*

**Note on D-S355's resolution scope:** closing this debt item means "the executable spec now exists," NOT "the vulnerability is fixed." #355 itself is still open and live in prod, tracked in ROADMAP.md/SECURITY_FRAMEWORK.md/AUTH_SECURITY_AUDIT_ROADMAP.md — see the Resolved section entry for the full CI-required-check tension this surfaced and how it was resolved (skip-with-tracking, not a fix).

**Age distribution:**
- 0–30 days: 5 (all opened 2026-08-01 — Test-Health Survey Passes 3 & 4; D-S348b and D-S355, both opened 2026-08-01, resolved 2026-08-02 and moved to Resolved, no longer counted here)
- 31–90 days: not recomputed this pass — the previous 31–60 / 60+ buckets were already stale relative to today; several P0/P1 items opened 2026-04-17 are now ~106 days old (see the corrected age on the Game Mode Rendering + State item above as one example). Flagged for the next full audit sweep per Audit Cadence rather than guessed here.
- 60+ days: not recomputed this pass (see above)

**Ship blockers:**
- **0 P0 open as of 2026-08-05** — the one open P0, `AppShareLinkRouting.test.jsx` / `AppNoMembershipRouting.test.jsx` incomplete Supabase mocks (Story 121, #535), is now resolved — see the Resolved section entry for full evidence (both files' mocks fully self-contained, real RED→GREEN via `git stash`, confirmed not an active incident since the anon key has been dead since 2026-07-14). Matches the Debt Summary Dashboard table above (0/0/0/**0**), which this section had drifted out of sync with. `debt-p0` gate is clear again for the next minor version bump.
- Prior to this: **1 P0 open as of 2026-08-04** — the same `AppShareLinkRouting.test.jsx` item, filed that day, did not block the v2.8.4 patch release (the `debt-p0` gate only applies to minor version bumps, not patches). Before that: none open — the previous minor version bump was gated on both P0 items — Share Link Payload Integrity and Game Mode Rendering + State, both resolved 2026-08-02 (see Resolved section) — plus D-S411b and D-S348a, both resolved same-day 2026-08-01 (see Resolved section).

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

- **v2.20 — August 2026 (Live Scoring Scorer-Lock Regression resolved)**
  - New test file: `frontend/src/tests/scorerLockIdentity.test.js` (4 tests) — `claimScorerLock`'s `scorer_user_id`/`actor_user_id` non-null contract for the real-auth case, the no-login local-device-shim case, the audit log, and the heartbeat re-upsert. Mutation-test RED→GREEN checkpoint run and documented in the Resolved entry (coverage-after-the-fact for the already-shipped v2.2.29 fix, not new test-first work).
  - Investigation finding (not a new debt item, folded into the Resolved entry): `useLiveScoring.js`'s own `_effectiveUserId` shim has had no independent fallback since v2.2.37 — it is a passthrough; the real non-null guarantee now lives in `DugoutView.jsx`'s `scoringUserId` fallback chain. No live/reachable bug found (DugoutView is the sole caller and always supplies a non-null identity, confirmed by grepping every `useLiveScoring(` call site) — flagged as the item's residual fragility for anyone touching that call site in the future, not acted on.
  - Branch (`issue/scorer-lock-regression-test`) was first drafted against a stale local worktree checkout ~24 commits behind `origin/develop` — missed the two P0 closures, D-S348b, D-S355, D-S428b, and Story 61's own resolution, all already merged. Caught via `git log HEAD..origin/develop -- docs/product/DOC_TEST_DEBT.md` before pushing; discarded the stale edit and re-cut the branch from `origin/develop` at `82c3e9c` before redoing the DOC_TEST_DEBT.md edit. Flagging the near-miss here since it's exactly the failure mode this ledger's own "read the file FRESH" convention exists to prevent, and a worktree can silently drift behind `origin/develop` when several sibling agents are merging in parallel.
  - Direct count performed per this item's own instruction (see dashboard footnote above for the full breakdown): no drift found this pass — the table matched a direct re-count of every `### 🟠`/`### 🟡` heading exactly, both before and after this resolution.
  - Dashboard: P1 test gaps 3→2, test gaps total 11→10, P1 total 8→7, overall total 28→27.

- **v2.21 — August 2026 (v2.8.5 release — Phase 4 slices 4-9, Story 104.1, Story 119)**
  - New test files: `frontend/src/__tests__/SharedViewColorTokens.test.jsx` (12 tests, mutation-tested RED→GREEN) — Story 120 region slice 9's `SharedView()` color-token equivalence; `frontend/src/components/Shared/PlayerFilterToggle.test.jsx` (6 tests) — Story 104 slice 4.1's extraction characterization suite.
  - This entry does not attempt to backfill the Revision History gap between v2.20 and this release (Story 117, Story 121, and other work in between landed without their own Revision History entries — see those items' own Resolved-section entries for detail) — out of scope for this release's own housekeeping.
  - No new debt items opened by this release. Dashboard unchanged (0 P0, per the `debt-p0` gate check run fresh for the v2.8.5 release-readiness audit).
