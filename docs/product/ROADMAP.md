# Lineup Generator — Product Roadmap

> Last updated: 2026-08-30 (v3.1.0 candidate re-anchored to `1da474e` after the intentional post-prep scope batch, including bench-rotation fairness #942 and test PR #956); previously 2026-08-30 (Supabase reconciliation: migrations 023/029/030 applied and verified).
> MVP launched: March 24, 2026

---

## v3.1.0 RELEASE CANDIDATE (develop only — not yet promoted) — consent, Game Day, and sync reliability

Release tracker: [#939](https://github.com/kaushikkuberanathan/lineup_generator/issues/939). The Terms of Service experience landed as 3 PRs on `develop` (#907, #910, #913) on top of the v3.0.0 promote. This release cut also includes the Game Day and reliability work merged afterward. Version target is 3.1.0 because registration consent is a new coach-facing capability, not a patch-only change.

**What shipped:**
- **Versioned legal-doc content model** (`frontend/src/content/legal.js`): every doc in `LEGAL_DOCS` now carries a `versions[]` array (oldest first) instead of a single flat text blob. `getLegalDoc(id)` resolves to the latest version automatically; `getLegalDocVersion(id, version)` retrieves any prior version's exact text for audit purposes. Bumping a document going forward is one edit — append a new `versions[]` entry — with no component, route, or migration change required. The original April 2026 "Terms of Use" text is preserved verbatim as `terms` v1.0, not overwritten. `terms` has been rewritten to v2.0: a fuller, plain-spoken Terms of Service tailored to Dugout Lineup (replacing the prior third-party-template-adapted text), with a "Plain English" (`tldr[]`) summary card. 6 docs total: `privacy`, `terms`, `safety`, `content`, `access`, `report` — all others still at v1.0.
- **Shared rendering, two entry points:** `LegalDocBody` (new) is the single place every legal doc renders from — `LegalSection` (Support → Legal, pre-existing) and the new `LegalDocSheet` (a `BottomSheet`-based viewer) both consume it, so the registration screen and the Account tab always show identical text for a given doc, never a second copy.
- **Registration consent gate** (`RequestAccessScreen.jsx`): a required "I agree to the Terms of Service and Privacy Policy" checkbox (with inline links opening `LegalDocSheet` for `terms`/`privacy`) now gates the submit button — `agreedToTerms` must be true or submission is blocked with an inline error. `?terms=open` as a URL param auto-opens the sheet on load, for a Support-tab deep link. New analytics events `tos_consented` (with the accepted `terms` version) and `tos_link_opened` (with `source`/`doc`) — now documented in `docs/analytics/ANALYTICS.md`'s Auth Funnel table.
- **Consent persistence, not text persistence** (migration 028, `legal_consents` table — **applied to both DEV and PROD 2026-08-29**, KK confirmed go-ahead, verified live on both via a real insert + cleanup, security advisors re-run clean): a new, additive-only table + route (`POST /api/v1/auth/consent`, `frontend/src/utils/legalConsent.js`'s `logLegalConsent()`) records only the *version string* of each doc a coach accepted, keyed by email/doc_id/version/context/accepted_at — never the document text itself (the text lives in git; the version string is the pointer back to it). Deliberately a new table rather than new columns on `access_requests`, per the Zero-Downtime Constraint (still in force, Phase 4C is only 2/7 steps done) — that would have meant editing `POST /request-access`'s existing handler, which the constraint forbids. RLS enabled, zero policies (service-role only, same pattern as `team_data_history`) — a consent record must never be forgeable or readable via a client-side key. Fire-and-forget: a failed consent log never blocks or surfaces an error on registration. Rate-limited (`legalConsentLimiter`, email-keyed, 20/hour, mirrors `requestAccessLimiter`'s design).
- **Bugfix within the same feature** (PR #913): the Request Access submit button had no visual disabled state before the consent checkbox was checked — fixed.

**Test coverage added:** backend `legalConsent.test.js` (7 tests — multi-doc consent → 201 + one row per doc, email normalized the same way as `/request-access`, `context` defaults to `request_access`, validation failures → 400 with no insert attempted, DB error → 500); frontend `content/legal.test.js` (12), `utils/legalConsent.test.js` (3), plus growth in `RequestAccessScreen.test.jsx` and `LegalSection.test.jsx`. Backend unit suite 269→276, frontend 1401→1422 (122→124 files) — both already reconciled in `CLAUDE.md`/`backend/CLAUDE.md`/`frontend/CLAUDE.md` during the v3.0.0 release-ritual audit.

**Additional v3.1.0 scope:**
- Game Day presentation and navigation: duplicate live-scoring scoreboard removed (#922), batting order made fully swipeable (#924), and full team names restored on the scoreboard (#925), merged through PR #923.
- Offline reliability: pending completed-game finalization now retries after reconnect (#921, PR #933), with schedule hydration fields centralized to prevent merge-field drift (#920, PR #934).
- Behavior-preserving decomposition: SharedView and Support's Links/Updates surfaces extracted from `App.jsx` (PRs #935-#937).
- CI confidence: the Vitest inventory guard now verifies every frontend test file executed rather than trusting a green exit code alone (#918, PR #931); email-delivery and ops-health contracts gained dedicated coverage (#916/#917, PRs #929/#930).
- Branch ancestry repaired before the release cut through PR #938; its sync merge was content-identical to the pre-sync develop tree.
- **Intentional pre-soak scope addition (2026-08-30):** `develop` advanced after release-prep merge `6292a97` through PRs #950-#956. The only new coach-facing runtime behavior is PR #952/#942: Auto-Assign now tracks bench history and rotates statistically similar players fairly instead of benching the same one or two every inning. PR #950 reconciled already-applied Supabase state; PR #953 added draft-only migration 031 and applied it nowhere; PRs #951/#954/#955 were documentation/governance; PR #956 added tests only. Because the prior soak anchor did not contain #952, no override was assumed: the candidate and full 24-hour soak were restarted from two-parent merge `1da474e` at 2026-08-30T07:37:44-04:00.

**Release gates still open:**
- Candidate is frozen at `1da474e`; the restarted 24-hour soak is eligible no earlier than 2026-08-31T07:37:44-04:00 and remains active until the production SHA and health are verified.
- Real-device Game-Day Validation is required because this batch changes the live game surface; #698 remains open until that pass is recorded.
- Production promotion requires KK's explicit `confirmed — push to main` approval after the soak/manual evidence is reviewed.

---

## ✅ v3.0.0 PROMOTED AND LIVE IN PROD

- **Frozen at:** merge commit `426d052` (PR #900), `develop` HEAD as of the freeze. **Soak start:** 2026-08-29T01:27:53Z.
- **Soak explicitly overridden 2026-08-29T11:07:18Z by KK** — ~9h40m into the 24h window (~14h20m remaining), not waited out. Same pattern as every prior override (v2.9.0, v2.10.0, v2.11.0, v2.12.0, v2.14.0) — an explicit, logged decision, not a default.
- **Freeze on `develop` lifted** as of the override — the prior banner's restriction on merging into `develop` from either track/worktree no longer applied from that point on. Normal Branch Strategy rules resumed.
- **Promoted to `main` 2026-08-29** (PR [#903](https://github.com/kaushikkuberanathan/lineup_generator/pull/903), regular merge, `c865d4e`) — confirmed a genuine 2-parent merge via `git log --format='%P'`, not just the GitHub UI. One real CI-blocking finding surfaced during the promote, not a flake: CodeQL flagged a high-severity `js/incomplete-url-substring-sanitization` alert on `backend/src/__tests__/cors.test.js`'s C9 test (`develop` never showed it since CodeQL treats it as new relative to `main`'s pre-#881 baseline). Verified false positive — the assertion checks a `console.warn` call happened, not a security/trust decision — and fixed via exact-match instead of substring `.includes()` (PR [#904](https://github.com/kaushikkuberanathan/lineup_generator/pull/904), RED→GREEN mutation-verified), which cleared the alert on re-run.
- **Prod smoke test same session**, confirmed via the platform APIs directly (not curl, which this remote session's egress policy blocks for arbitrary external hosts): Render backend deploy `dep-da9c3irl550s739rlc6g` for `c865d4e` status `live`; Vercel production deployment `READY` on `line-up-generator`, `githubCommitSha` matching. **Real-device phone smoke test confirmed passing by KK** same session.
- **Post-promote sync** (PR [#905](https://github.com/kaushikkuberanathan/lineup_generator/pull/905)) merged the same session, `0d24c30` — `main` and `develop` confirmed content-identical (`git diff origin/main origin/develop` empty) after the sync.
- Full branch hygiene performed same session: all 5 feature branches from this release (`claude/dev-main-release-scope-n3ozt1`, `docs/v300-soak-freeze`, `docs/v300-soak-override`, `fix/cors-test-codeql-false-positive`, `sync/main-into-develop-v300`) auto-deleted remotely (repo's standing behavior); local branches and stale remote-tracking refs pruned. `scripts/sync-stories-to-issues.js --dry-run` and a real run both found zero unlinked ROADMAP.md stories — no patch needed.
- **On-device Game-Day Validation:** real-device smoke test confirmed passing by KK. The itemized checklist (share link opens on mobile without login, Game Mode advance-inning, lineup generation under 60s, bottom nav pinned) was not independently re-itemized in this session's own record — KK's confirmation is the standing evidence for this release.

---

## v3.0.0 — 2026-08-29 (develop only — not yet promoted) — Phase 4C auth-cutover start, security debt closures, Help redesign

**Major version bump — a deliberate departure from this repo's own "size the bump to the release's actual scope" convention, decided by KK 2026-08-29.** Every prior release of comparable or larger bundled scope was still sized minor (v2.9.0 bundled a schema change + routing change + security batch; v2.14.0 bundled 6 unrelated security PRs). This is the first major version this project has ever shipped. **Explicitly not gated on Phase 4C completion** — the shim-removal sequence (Story 129/#688) is 2 of 7 steps done; 5 remain. Recorded here in plain language so a future session doesn't read "v3.0.0" and assume the auth cutover finished — it didn't.

Scope: 104 commits / 34 top-level PRs merged to `develop` since v2.15.0 promoted to `main` (`5a38b08`, 2026-08-27). Full commit list: `git log --first-parent --oneline origin/main..origin/develop` as of `bf097f0`.

**Phase 4C auth cutover — steps 1-2 of 7 (Story 129/#688, tracked under #355):**
- Step 1 (PR #898): migration 019 Section A applied to PROD.
- Step 2 (PR #899): auth testing shims removed.
- 5 steps remain (#688). #355 (live-scoring anon backdoors) stays open — the full 7-step sequence is the precondition for closing it, not any individual step.

**Security debt closures — both flagged open since v2.9.0's original CodeQL batch:**
- #650: share-link ID generator switched from `Math.random()` to `crypto.getRandomValues()` (PR #886).
- #651: `GET /me` and `POST /logout` rate-limited by user id (PR #885).
- Plus new RLS test coverage for non-admin membership isolation (#348, PR #887).

**Real auth bugs fixed:** Gmail dot-variant email lockout at login (#374, PR #894); magic-link validation order — validation now runs before `loginLimiter` on `POST /magic-link` (#329, PR #891); `auth_events` CHECK constraint widened for `magic_link_requested` (#736, migration 027, PR #893 — already logged as resolved in root `CLAUDE.md`'s Known Open Bugs table); Home team card's Edit/Delete menu items now role-gated (#666, PR #895).

**Share link:** error-mode surfacing on load failure (#127, PR #889); song-payload parity restored between the two share paths (#502, PR #888).

**UX:** Support → "Help" redesign (Story 333/#865, PR #867 + follow-up #869) — previously logged in root `CLAUDE.md` as a provisional, un-promoted "v2.15.1" label; folds into this release's real version number, no separate bump needed.

**Backend/infra:** CORS rejections now return 403 and log the origin (#389, PR #881); `write_source` role-based fallback for `team_data_history` (#379, PR #880); DEV protection health-check (#314, PR #884); DEV rebuild seeded with synthetic roster instead of empty (PR #883); backend infra reliability batch (PR #870).

**Dependencies (routine Dependabot):** `@supabase/supabase-js` (both `frontend` and `backend` packages), `@vitejs/plugin-react`, `mixpanel-browser`, `vitest`/`@vitest/ui`.

**Governance/docs:** v2.15.0 promote-correction pass (#861), FEATURE_MAP/debt audit (#862), governance-flags docs batch (#871), two session retros (#872, #882), Story 333 roadmap-status fix (#873), GitHub label-count confirmation closing 7 drift gaps (#897).

**Verification (2026-08-29, this release-scoping pass, re-run fresh against `develop` HEAD `bf097f0`, not carried forward):**
- `debt-p0` gate: 0 open P0 — clear. Direct recount of every `### 🔴`/`### 🟠`/`### 🟡` heading in `DOC_TEST_DEBT.md` matched its dashboard table exactly (0/0/0 P0, 0/1/0 P1, 7/4/7 P2) — no drift found.
- Frontend: 1401 passed / 1 skipped (122 files) — up from the previously-documented 1377/1 (120 files).
- Backend unit: 269/269 — up from 254. Run locally with CI's exact dummy-env pattern (`SUPABASE_URL=https://ci-hermetic.invalid`, etc. — see `.github/workflows/ci.yml`'s `backend-unit` job), not against a real Supabase project.
- CI re-confirmed green on `bf097f0` via the GitHub Actions API (not assumed from the merge having gone through): Backend Integration Tests (CI_SAFE, prod read-only), RLS Policy Suite (ephemeral), Frontend Tests (Vitest), Backend Unit Tests (supertest), Sync-script unit tests — all `success`.
- `FEATURE_MAP.md`: row 40 (Help) already current from #865's own landing. No other surface in this batch is a discrete coach-facing feature warranting its own row — matches this file's own precedent of not mapping dependency/governance/infra-only work to feature rows.
- **Not yet done:** the actual version bump (`frontend/package.json`, `backend/package.json`, `APP_VERSION` in `App.jsx`, root `CLAUDE.md`, `VERSION_HISTORY` entry) — pending KK's gate phrases for those locked files. 24h soak not yet started. Real-device Vercel preview smoke test not yet run.

### Test/CI environment safety (#339, #368) — folded into this release

Internal-only, no user-facing behavior, no app code touched. Picked up the remaining 3 open issues on the Test Health & CI Governance board (#339, #368, #517) after finding the other 3 (#406, #410, and umbrella #840's own disposition table) were stale trackers for already-shipped v2.15.0 work — see the tracker-sync note below.

**#368 fixed (`.github/workflows/ci.yml`).** The "Smoke Test (dev)" job's `DEV_*` values had always resolved to the exact same project/backend as `PROD_*` (`DEV_SUPABASE_URL`/`ANON_KEY` aliased `secrets.SUPABASE_URL`/`SUPABASE_ANON_KEY` — prod's own — and `DEV_BACKEND_URL` was hardcoded to a copy-pasted literal of the prod Render URL, ignoring a `DEV_BACKEND_URL` secret that had existed for this exact purpose since before this session). Every "dev" smoke run has always actually been a second, mislabeled prod run. Audited `scripts/smoke-test.js` before fixing: every check is a GET, so this was a correctness/mislabeling bug, not a data-integrity incident. Fixed: `DEV_BACKEND_URL` now actually reads its own pre-existing secret; `DEV_SUPABASE_URL`/`ANON_KEY` now read new secrets pointed at the real DEV Supabase project (`psqvzppphdedqkpmarwx`). **KK added `DEV_SUPABASE_URL` and `DEV_SUPABASE_ANON_KEY` as new GitHub Actions repo secrets same session** — confirmed present alongside the pre-existing `DEV_BACKEND_URL`/`DEV_FRONTEND_URL`.

**#339 fixed (backend test suites).** Found the live mechanism behind the growing `access_requests` row count: `suite-validation.js`'s VAL-07 test runs unconditionally (even under `CI_SAFE`, even against prod — it's not one of the gated write-heavy suites) and can legitimately get a real `201` back, inserting a real row — but never tracked its email for the existing end-of-run cleanup. Fixed by pushing it into `state.testEmails` like every other suite's rows. Separately, added an unconditional blast-radius fence (`scripts/tests/prodGuard.js`, mirrors `src/__tests__/rls/clients.js`'s `assertDevProject()`) in front of the five write-heavy suites (auth-flow, idempotency, device-context, audit-trail, data-integrity) — they now refuse to run against the PROD project ref regardless of `CI_SAFE`, closing the gap where a crashed/interrupted local run (plausible before `SUPABASE_TARGET=dev` existed) could skip the existing cleanup and leave orphaned `team_memberships` rows, as it evidently did historically. Unit-tested (`prodGuard.test.js`, +4, backend unit suite 250→254). **No purge needed.** KK ran a scoped `email like '%@test.com'` check directly against PROD for both tables — zero rows in either. The historical orphaned rows this issue originally documented (10 `team_memberships`, ~584 `access_requests`) had already been cleaned up by someone/something before this session; the only real remaining work was fixing the mechanism that could still create new ones, which is what this fix does.

**#517** left untouched — its own comment thread explicitly documents it as a permanent known-limitation tracker, not something to close.

**Tracker sync (#406, #410, #840) — GitHub-only, no code:** #406 and #410's survey work (Pass 2 backend auth/roles/API, Pass 4 frontend screens/data) was already completed and shipped in v2.15.0 per this file's own entry above (PRs #842/#844/#846/#847/#848/#845) — the GitHub issues were just never closed. Closed both with a comment citing the shipped evidence. #840's disposition table also still showed #474 and #664 as open despite both already being `closed` on GitHub (verified live) — corrected.

---

## v2.15.0 — 2026-08-26 — Dependency currency, git governance, and test-health cleanup (promoted to `main` 2026-08-27, PR #857)

**Minor bump, dev-tooling/governance/test-infra only — zero new coach-facing features.** Sized above patch per the established "size the bump to the release's actual scope" convention: real dependency major-version migrations (React 18→19) plus a real repo-governance settings change are enough surface area to justify it even with no user-visible feature. Three unrelated consolidation passes bundled together, each following the same shape — audit a cluster of issues KK flagged as fragmented, verify current state directly rather than trust old issue text, consolidate, then execute the real remaining work.

### Dependency currency

A 9-issue dependency-currency cluster (#135, #321, #322, #371, #469, #473, #632, #633, #636) was flagged as "screaming for consolidation" — several of the older issues described vulnerability states that later issues explicitly said were already fixed. A closure audit (read every issue + its cross-references before touching anything) found the cluster resolved to exactly 3 real pieces of work, matching the predicted 2-4 range.

**Closed as stale/duplicate/already-resolved (6):** #135 (superseded by #371's later triage), #321 (literal duplicate of #322, filed 11s apart), #322 (decoupled esbuild fix that never landed, superseded by later audits), #371 (its 23-vuln triage was actually done via #468), #469 and #473 (both tracked Dependabot alerts #28/#30, which #636's own 2026-08-07 comment confirms were already `state=fixed`). Each closed with a comment citing what superseded it.

**#632 — ESLint 8 → 9 + flat-config migration (PR #834).** The originally attempted 8→10 bump (#626) was blocked by `eslint-plugin-react`'s peer-dep ceiling (`^9.7` max, still true as of this session — verified directly against the current npm registry, not assumed from the old issue). Landed ESLint 9.39.5 instead, plus the mandatory `.eslintrc.cjs` → `eslint.config.js` migration ESLint 9 requires. `eslint-plugin-react-hooks` bumped 4.6.2 → 7.1.1 (the only version with flat-config support) but deliberately scoped down to just `rules-of-hooks` + `exhaustive-deps` rather than its new `recommended-latest` preset, which bundles the React Compiler lint rules and flagged 9 real errors across existing code — out of scope for a lint-infra migration. Two ESLint 9 default-behavior changes were pinned back to old behavior for parity: `no-unused-vars`'s `caughtErrors` option (default flipped `'none'`→`'all'`, would have silently surfaced 31 new warnings) and `reportUnusedDisableDirectives` (new default `'warn'`, caught one genuinely stale directive in a file under the locked `game-mode/` path — pinned off rather than editing that file without its gate phrase). Verified: lint clean, build clean, full Vitest suite 1307 passed / 1 skipped.

**#633 — React 18 → 19.2.8 migration (PR #835).** A Dependabot PR (#623) had already bumped `react-dom` alone, leaving `react` itself on 18.2.0 — a genuine version mismatch that would have shipped broken (CI was failing on that branch for exactly this reason). Bumped both together. Pre-bump codebase audit found zero legacy patterns needing migration: no `ReactDOM.render`/`hydrate` (already on `createRoot`), no `.defaultProps`/`propTypes`/string refs/`forwardRef`, no `createFactory`/`findDOMNode`/`UNSAFE_` lifecycle methods, no `react-dom/test-utils` imports. The one class component (`ErrorBoundary.jsx`) uses only `getDerivedStateFromError`/`componentDidCatch`, both fully supported in 19. No app code changes were needed. Verified: lint clean, build clean (bundle ~50KB larger, expected), full Vitest suite 1307 passed / 1 skipped.

**Both merged to `develop`** as genuine 2-parent merge commits (verified via `git show -s --format=%P`, not the GitHub UI) — #834 first, #835 second (rebased onto #834's merge mid-flight after KK used GitHub's "Update branch"). Re-verified together post-merge: 1309 passed / 1 skipped (116/116 files), lint/build clean — no interaction issues between the two migrations. Both PRs labeled to match their source issues' taxonomy (`priority:p2`/`type:chore`/`area:ci-ops`) — labeling PRs, not just issues, had been missed before. Feature branches deleted both locally and remotely post-merge.

**#636 (the umbrella) closed, then reopened as a standing tracker per KK's instruction.** All 4 of its original 2026-08-07 sub-issues (#635, #634, #632, #633) plus a bonus 5th item it surfaced (#674) are now resolved, so it was closed — then reopened and retitled "Dependency modernization — umbrella tracker" to serve as the ongoing home for future dependency-currency work instead of being recreated each time. Its body now documents the resolved history and instructs closure-audit-first for future work, given this cluster's demonstrated track record of issues going stale once their scope lands elsewhere.

### Git / documentation / governance

An 11-issue cluster (#122, #124, #181, #182, #183, #207, #488, #573, #595, #644, plus 8 more found via `type:governance`/`area:governance` label search) got the same closure-audit treatment. Resolved to: **1 real settings change** — KK disabled "Allow squash merging" and "Allow rebase merging" at the repo level (Settings → General → Pull Requests), upgrading the existing squash-detection CI guard (`.github/workflows/merge-policy-guard.yml`, #573) to actual prevention, since this session's GitHub token lacked the `Administration: write` scope to do it via API; **9 stale closures** with evidence-cited comments (#181, #183, #207, #121, #595, #388, #125, #108, #256 — labels already existed and in active use, pre-pull check already in `CLAUDE.md`, sync-script dedup already fixed via PR #234, flag-docs already current, a stale branch write-up, a superseded release-ritual claim, 2 explicit deprioritizations, and 1 verified-not-reproducible via 15 consecutive CI runs with zero queue delay); and **4 small real fixes** in PR #839 — a new `.github/workflows/pr-target-branch-guard.yml` (the issue's own analysis rejected a PR-template checkbox as "weak, humans skip them," so this is a real automated check instead), a conflict-resolution decision tree added to root `CLAUDE.md`'s Branch Strategy section, a backfilled v2.5.27 `ROADMAP.md` entry, and a stale-wording correction to the v2.5.9 changelog entry. #182 closed as a duplicate of #573 (same capability — correct merge-strategy enforcement — competing for prioritization independently, exactly as KK's original framing called out).

### Test Health & Regression Protection

8 fragmented testing issues (#406, #410, #474, #479, #482, #664, #517, #115) consolidated into umbrella #840, using KK's own proposed 3-tranche structure: **A — false confidence** (fake-green, stale tests, incorrect assumptions), **B — critical-path gaps** (scoring, auth, RLS, admin, share link), **C — test infrastructure** (Vitest/Windows/CI/runtime reliability). #479 was found already closed (PR #506, pre-dated this session). #115 closed — its own recommended fix (rate-limit tests should be identity-keyed, not trigger-volume-dependent) was already shipped via Story 26 + PR #786's per-run-unique-email pattern, confirmed by reading the actual test code rather than the issue's stale description.

Ran the remaining 2 of 4 passes of an already-half-complete test-drift-and-coverage survey (#406/#410). **Pass 2 (backend auth/roles/API)** found `GET /api/v1/feedback` — reachable in prod, absent from `backend/CLAUDE.md`'s own route enumeration, zero test coverage of any kind (not even the 401-rejection baseline every other admin route had) — closed via PR #844. Also found 2 untested-but-presumed-correct assumptions, locked in (not changed) via PR #848: `requireAdmin`'s exact-match query excludes a legacy `team_admin`-labeled row before the middleware ever inspects it, and `GET /me` returns a membership's raw (unnormalized) role value by design. Also corrected a stale Pass-3 finding along the way — the RLS-suite-not-in-CI gap this survey itself had flagged as a priority was already fixed weeks earlier via #415/#480; caught and corrected in both #410's thread and umbrella #840 before it could propagate further. **Pass 4 (frontend screens/data)** found the session's headline bug: `utils/flagBootstrap.js` was extracted from an `App.jsx` `useEffect` specifically to be unit-tested, but the extraction was never wired back in — the real running code kept its own inline duplicate, which had since drifted 2 URL params ahead of what the "tested" module knew about. Same replica-divergence shape as root `CLAUDE.md`'s documented Bug #5, found fresh in a new subsystem; fixed via PR #842 (extended the module to handle all 4 params, then wired `App.jsx` to actually call it — RED→GREEN verified). Also closed via Pass 4: zero-coverage components `BrandMark.jsx` and `game-mode/BenchStrip.jsx` (PRs #846/#847), `storage.js`'s own `loadJSON`/`saveJSON` implementation never directly tested (PR #846), and 2 doc-drift corrections (`frontend/CLAUDE.md`'s test-table filenames, `FEATURE_MAP.md` row 9's stale share-link coverage claim — PR #845).

**#474** narrowed from 6 routes to 5 before writing anything new — `GET /admin/deny-link` turned out to already have real authorized-path coverage via `adminLinkToken.route.test.js`'s LT-7, landed as a side effect of the unrelated #337 HMAC work and never reflected back into #474's own tracking. The remaining 3 routes (`GET /requests`, `GET /members`, `POST /update-role`+`/reset-access`+`/suspend`) got new test files via PR #850. **#664** turned out to conflate 2 unrelated asks under one issue number — its own 5-item list (2 of which were already satisfied, verified directly) plus a separately-logged `DOC_TEST_DEBT.md` P1 item (the `RequestAccessScreen` `submitted`-state confirmation card, Story 126/#665) that had been cross-referenced to the same number by mistake. Both closed together via PR #849 since they were adjacent enough to fix in one pass. **#517** (Windows Vitest Bug #7) left open as a permanent known-limitation tracker per its own comment thread's explicit instruction not to re-litigate the `pool: 'forks'` alternative. **#482** (secondary RLS coverage) left open at its existing low priority — self-scoped opportunistic by its own text.

### Dead code removed + a repo-settings decision confirmed

**Phone-channel code deleted from `POST /request-access`** (PR #853, KK's explicit decision after the survey flagged it) — `detectChannel()`/`normalizeContact()` accepted phone as an alternative to email, but the frontend never sent a `phone` field, and it contradicted root `CLAUDE.md`'s Auth Strategy section ("no phone or SMS dependency anywhere in the stack"). `email` is now a declared `express-validator` field matching `POST /magic-link`'s existing pattern. Historical DB rows already holding `phone_e164` are untouched — only the ability to create a *new* request via phone is gone. Updated the one real test regression this surfaced (`requestAccessLimiter.test.js`'s RA-LIMIT-3 had asserted a phone-only request should succeed) plus 2 stale integration-test labels.

**Default-branch=develop confirmed intentional (#488, PR #854).** KK's decision: keep `develop` as GitHub's configured default branch — `main` stays Production/conceptually primary for releases, but day-to-day mechanics (clone checkout, new-PR target, "Closes #N" auto-close) should point at the active integration branch. Verified directly via `GET /repos/{owner}/{repo}` (`default_branch: "develop"`) rather than restated from the original 2026-08-01 finding, and reconciled against live evidence: `develop` sat 69-71 commits ahead of `main` (last promoted at v2.14.0) throughout this session, yet PRs merging only to `develop` (#849, #850, #839) immediately auto-closed their linked issues — proof the mechanism this issue described is real and current, not historical.

### Session-close hygiene

Full session retrospective logged in `docs/process/SESSION_RETROSPECTIVES.md` (2026-08-26-A). `docs/product/DOC_TEST_DEBT.md`'s #664 P1 entry moved to Resolved with a dashboard recount (P1 2→1, Total 24→23). `FEATURE_MAP.md` row 38 updated to reflect the `#664`/`#474` closures (Test Status Partial→Yes), row 9's stale share-link claim corrected separately (also Partial→Yes). Root `CLAUDE.md`'s frontend/backend test-count lines — flagged stale in both the 2026-08-24-B and 2026-08-26-A retros — finally reconciled to current totals as part of this release prep, rather than carried forward a third time.

### Verification and soak status

Backend unit 220→250 (`npm run test:unit`, `APPROVE_LINK_HMAC_SECRET` exported directly — the one local-only failure this session hit repeatedly, `teamData.envGuard.test.js`'s `NODE_ENV=production`/dotenv-skip interaction, is confirmed pre-existing and CI-unaffected). Frontend 1301→1368 passed / 1 skipped (120 files). Lint and build both clean. `debt-p0` gate clear (0 open P0s).

**Soak: not overridden this time.** Every prior release since v2.9.0 explicitly overrode the 24h develop-soak requirement; asked directly this time, KK chose to wait out the full period instead — a deliberate break from that pattern, not an oversight. Soak clock started at `develop` HEAD `b7bbe25` (2026-08-26T09:01:59-04:00), clears 2026-08-27T09:01:59-04:00. Version bump, `VERSION_HISTORY` entry, and this docs pass were prepared ahead of the soak clearing (per KK's explicit instruction) so the PR to `main` is ready to open the moment it does — but that PR itself will not open or merge until then.

---

## v2.14.0 — 2026-08-25 — admin.html fully routed through the backend, approve/deny link security fix (promoted to main 2026-08-26)

**Minor bump** — bundles a completed security remediation (admin.html, #338/#787), a real security vulnerability fix (unsigned/replayable approve-deny links, #337), and three smaller security/reliability/docs items (#346, #347, #350, #645) that landed on `develop` in the same window. Sized above a patch per the established "size the bump to the release's actual scope" convention.

### admin.html Supabase-bypass remediation complete (#338, #787 — both closed)

Follows up on PR #780 (Approve/Deny, already in v2.13.0/prod) by routing the remaining 6 mutating admin.html actions through the backend, per `docs/product/ADMIN_HTML_BYPASS_REMEDIATION_PLAN.md` — one PR per endpoint, lowest-risk first, exactly as that plan's §5 phasing proposed. That plan doc itself was new to `develop` as of this batch: it was scoped and written on an isolated branch (`docs/admin-html-bypass-remediation-plan-787`) that was deliberately never merged, so it existed only as an uncommitted design doc that every PR and issue comment in this batch cited by path — brought into `develop` once the work it describes was done, so the design record isn't permanently orphaned. That branch has since been deleted (KK, via GitHub UI) now that its content lives in `develop`.

**#788 Feature flag toggle (PR #811)** — `PATCH /api/v1/feature-flags/:flagName`, replacing `admin.html`'s direct `feature_flags` write. **#789 Remove Coach (PR #815)** — `DELETE /api/v1/coaches/:membershipId`, preserving the existing hard-delete semantics exactly (no soft-suspend change bundled in — that stays a separate, deliberate call if KK wants it). **#790 Add Coach (PR #817)** — `POST /api/v1/coaches`, `role` validated server-side against `CANONICAL_ROLES`; membership status is now `'invited'` not `'active'`, a deliberate behavior change matching `/admin/approve`'s existing semantics; a duplicate-membership pre-check was added after confirming directly against `docs/db/schema.sql` that `team_memberships` has no unique constraint on `(team_id, email)` to rely on instead. **#791 Add Team (PR #818)** — `POST /api/v1/teams`, fixes a live bug for free: the direct write ran under the platform admin's own session, so `018_auto_provision_team_membership_on_create.sql`'s trigger silently made the admin a member of every team they created; the new route runs `supabaseAdmin` (service-role), so the trigger correctly no-ops. Also server-generates the team id rather than trusting a client-supplied one. **#792 Roster save (PR #819)** — `POST /api/v1/teams/:teamId/roster`, reuses `teamData.js`'s already-exported `rosterWipeGuard` (`module.exports.rosterWipeGuard`) rather than duplicating it, per the plan's own §4.4 recommendation — the plan's "duplicate, don't extract" reasoning assumed that export didn't already exist; it did, so this route needed zero changes to `teamData.js`. **#793 Schedule save (PR #820)** — `POST /api/v1/teams/:teamId/schedule`, deliberately does **not** get the roster-wipe guard, since Clear Schedule is an intentional empty write; a dedicated negative test (S3) proves this.

**Testing:** 38 new backend unit tests across the 6 new spec files (`adminFeatureFlags.test.js` 6, `adminRemoveCoach.test.js` 3, `adminAddCoach.test.js` 8, `adminAddTeam.test.js` 8, `adminRosterSave.test.js` 8, `adminScheduleSave.test.js` 5), plus a 401-no-token case per route added to `admin.auth.test.js`, plus a RED→GREEN mutation-test checkpoint on every single PR (not just asserted green).

**Manual DEV check (2026-08-25):** KK ran the manual checklist against `dev.dugoutlineup.com/admin.html` for all 6 flows and got real errors on Feature Flags, Add Coach, and (per the screenshot) Remove Coach too. Root cause: `admin.html`'s `BACKEND_URL` is hardcoded to the **production** Render backend, and none of these 6 routes exist on `main` yet — every call 404s, the response isn't JSON, and the client's generic error-handling fallback produces an unhelpful message. This is an environment/process gap (the manual checklist should have flagged this before being handed over), not a code defect in the new routes themselves — confirmed by the RED→GREEN unit coverage on every route. Resolves once this release promotes to `main`; a real DEV-backend rehearsal is possible going forward via `admin.dev.html` (#645, below), which does not have this problem.

### HMAC-signed approve/deny links (#337, PR #822)

The public 1-tap approve/deny email links (`GET /api/v1/admin/approve-link`, `GET /api/v1/admin/deny-link`) previously trusted raw, unsigned `requestId`/`teamId` query params with no expiry — a forwarded or guessed link could be replayed indefinitely — and the one-tap path never set `reviewed_by`. Now HMAC-SHA256 signed, 24h-expiring tokens with the `action` (`approve`/`deny`) bound into the signed payload, so an approve token can't be replayed against the deny route or vice versa; `reviewed_by` now resolves to the platform admin's real auth user id at click time. Missing token → 400 (unchanged contract); tampered/wrong-action token → 401; expired token → 410. New required env var `APPROVE_LINK_HMAC_SECRET` (`backend/src/lib/env.js` throws at boot if unset) — **confirmed set in both Render prod and GitHub Actions repo secrets before this promote** (KK, 2026-08-25). Any approve/deny email sent before this deploys will 400 when clicked (no `token` param) — a one-time, low-impact cutover; the admin panel remains a fallback. Same-PR CodeQL follow-up: added `adminLinkLimiter` (20 req/15min, IP-keyed, shared budget across both routes) after CI flagged missing rate limiting on the newly-authenticated routes. Backend unit suite: 199 → 220 (29 new tests: `approveLinkToken.test.js` 9, `adminLinkToken.route.test.js` 11, `adminLinkLimiter.test.js`, plus `approveLink.role.test.js` updated to sign real tokens).

### Admin panel usability fix (#346, PR #823)

The Pending Requests tab was showing ~596 rows, ~593 of them automated test-suite artifacts (`val-suite-*@test.com` pattern) — three legitimate requests, pending since April, sat buried and unnoticed. The Coaches tab had the same problem with ~10 test memberships. New `isTestEmail()` helper (exact `@test.com` domain match, not a loose substring check) splits real vs. test rows client-side; test rows are hidden by default behind a "Show test X (N)" toggle, not deleted (the actual purge of test-suite writes to prod is separate scope, #339). New `adminHtml.testRowFilter.test.js` (7 tests).

### Schema FK-integrity test (#347, PR #824)

`team_memberships` had a declared FK to `auth.users(id)` but none to `teams(id)` — both columns were already `TEXT`, the FK simply never existed. `admin.html`'s Coaches tab does a PostgREST embed (`select('*, teams(name)')`) that silently failed with "Could not find a relationship" as a result; fixed in prod by migration 008 back on 2026-07-13, but nothing had ever asserted the FK inventory itself, so this survived hundreds of backend and frontend tests across multiple CI runs — it only surfaced because KK opened the admin panel. New `backend/src/__tests__/rls/schemaIntegrity.test.js` (SI-1/SI-2 direct FK enforcement, SI-3 the exact PostgREST embed shape that broke in prod, SI-4 a deliberate **known-gap** assertion for `access_requests.team_id`'s still-missing FK — written so it starts *failing* on purpose if a future migration adds that FK without updating this test).

### DEV-pointed admin panel variant (#645, PR #825)

New `frontend/public/admin.dev.html` — a separate file (not a runtime `?env=dev` switch, specifically to avoid ever silently defaulting to prod), pointed at the DEV Supabase project and a local backend (`SUPABASE_TARGET=dev node index.js`), with a sticky "DEV ENVIRONMENT" banner. Lets admin panel changes and rehearsals run against DEV data instead of always hitting production — would have avoided the manual-check confusion described above. New `adminDevHtmlSync.test.js` guards the accepted two-file-no-shared-code maintenance risk (asserts both files declare the same function inventory and each references only its own project).

### Docs currency pass (#350, PR #826)

Audited `CHARTER.md`, `SOLUTION_DESIGN.md`, `SECURITY_FRAMEWORK.md`, and `AUTH_SECURITY_AUDIT_ROADMAP.md` against current code and DB state. Most of the original findings (filed 2026-07-13) were already fixed by intervening "Doc Audit Spike" sessions — left those alone. Genuinely fixed here: `SOLUTION_DESIGN.md` § Admin UI now documents that every admin.html mutation goes through the Express API with a Bearer token (previously said it bypassed the backend entirely); `SECURITY_FRAMEWORK.md`'s Status Tracker flipped 4 items from "Not started" to Shipped after direct code verification (CORS allowlist, rate limiting, Dependabot, branch protection — the last flagged as asserted-not-independently-verified, this session's GitHub token lacks that API scope); `FEATURE_MAP.md` row 17 Doc Status flipped ⚠ Stale → ✅ Current.

**Also this pass:** #698 was found silently auto-closed one second after its own migration PR (#764) merged, despite that PR's explicit no-closing-keyword intent and PR #799's own instruction to keep it open — reopened with evidence; still open pending the real on-device Game-Day Validation pass. v2.13.0's promotion status in this file and root `CLAUDE.md` was corrected from a stale "not yet promoted, freeze in effect" state to the real, already-live one (PR #808). `docs/TROUBLESHOOTING.md` and `docs/product/AUTH_SECURITY_AUDIT_ROADMAP.md` corrected to stop describing admin.html as bypassing the backend entirely.

**Verification (this release-prep pass, `develop` HEAD `a0d1504`):** backend unit 220/220, frontend 1301 passed / 1 skipped (115 files), `npm run lint` clean (0 warnings), `npm run build` clean, `debt-p0` gate clear (0 open P0s).

**Soak explicitly overridden 2026-08-26 by KK** — ~21.5h into the 24h soak when asked, KK chose to override rather than wait the remaining ~2.5h, same pattern as v2.9.0/v2.11.0/v2.12.0. **Promoted to `main` 2026-08-26** (PR [#829](https://github.com/kaushikkuberanathan/lineup_generator/pull/829), regular merge, `29a29b5`) — confirmed a genuine 2-parent merge via `git show -s --format=%P`, not just the GitHub UI. Prod smoke test same session: Render backend booted clean with no thrown errors (`Server running on port 3000`, `Your service is live 🎉` — confirms `APPROVE_LINK_HMAC_SECRET` really is set on the prod service, not just asserted), Vercel production deployment `READY` on the promoted commit, both confirmed via direct deploy-record queries rather than the dashboard. Post-promote sync (PR [#830](https://github.com/kaushikkuberanathan/lineup_generator/pull/830)) merged the same session — its first CI run surfaced one genuine failure, unrelated to the sync itself: `VAL-16` in `backend/scripts/tests/suite-validation.js` (the live-prod integration suite) still called `/admin/approve-link` with the pre-#337 raw-query-param shape, so it 400'd instead of reaching the 404 path it was checking, now that prod was actually running #337's new signed-token contract for the first time (prod had only just been promoted). Fixed by signing a real token via `approveLinkToken.sign()`, verified in-process (supertest against `./app` with the DB lookup mocked to "not found") before pushing. `VAL-14`/`VAL-15` still pass today but now have stale descriptions post-#337 (they're effectively testing "missing token → 400", not their original premises) — logged as non-blocking test debt, not fixed in this pass to keep the fix scoped to the actual CI failure.

**Post-promote branch hygiene (2026-08-26):** remote was already clean (this repo auto-deletes merged PR head branches) — only `develop`, `main`, the unrelated `activity-data` automation branch, and the two pre-existing Dependabot PRs (`#673` ESLint major bump, `#623` react-dom major bump, both out of scope for this release) remained. Local worktree had 3 stale merged branches (`claude/dev-prod-migration-assess-ckgefe`, `fix/dev-backend-hmac-secret-and-docs`, `sync/main-into-develop-v2140`) — deleted, plus stale remote-tracking refs pruned.

**Post-merge fix, same session:** the previously-undocumented `lineup-generator-dev-backend` Render service (id `srv-da2c7fqjnfac73aefmv0`, branch `develop`, created 2026-08-18 — contradicted root `CLAUDE.md`'s "DEV backend deleted" claim and PR #825's own body) turned out to be real and deliberately configured (`SUPABASE_TARGET=dev` at boot), but was found crash-looping: its two most recent deploys had failed with `Error: Missing required environment variable: APPROVE_LINK_HMAC_SECRET`, since only the actual prod Render service had received that new required env var. KK supplied the value, it was applied to the dev service too, and it redeployed clean (`Server running on port 10000`, `Your service is live`). `admin.dev.html`'s `BACKEND_URL` was repointed from `http://localhost:5000` to `https://lineup-generator-dev-backend.onrender.com` as the new default (falls back to localhost for testing an uncommitted local change), and both its header comment and root `CLAUDE.md`'s Key Infrastructure entry were corrected. Origin/owner of the service itself is still unconfirmed — it predates PR #825 by a week and nothing in this repo documents who created it.

---

## v2.13.0 - 2026-08-23 - Story 133 complete, admin.html bypass fix, useAuth stall fix (promoted to main 2026-08-24, PR #799)

**Minor bump** — completes the multi-week Story 133 design-token migration across two Locked, live-game-day files, plus a real auth bug fix and a security-relevant admin.html fix, sized above a patch per the v2.9.0-v2.12.0 "size the bump to the release's actual scope" convention.

**Story 133 (#698) code-complete (PR #764)** — all 13 of 13 slices for the live game-day surface design-token migration (`game-mode/*` + `ScoringMode/*`, 384 literal-hex color occurrences across 14 files, none previously tokenized) merged to `develop`, plus a bonus `components/ui/*` primitives token migration bundled onto the same branch (PR #759). Slices 5-13 were developed on an isolated `feature/story133-slices5-13-sandbox` branch per KK's explicit instruction (kept off `develop`/`main` during the v2.12.0 release soak), independently re-verified after every sub-merge, then promoted as a single PR once that soak cleared — full mapping-decision reasoning and verification evidence for every slice is preserved in that branch's history and `docs/product/STORY133_SANDBOX_PROGRESS.md` (not yet copied into this repo's permanent docs). **Does not close #698** — per the standing rule, closure requires a full real on-device Game-Day Validation pass across the complete migration, done manually by KK, not yet performed. **Correction, 2026-08-24: #698 was auto-closed anyway** at 2026-08-23T04:53:32Z (one second after PR #764 merged), despite PR #764's own body explicitly stating it carries no closing keyword — the same premature-closure failure mode #698 was originally filed to track (see #503). Reopened 2026-08-24 by explicit KK instruction; stays open until the real on-device Game-Day Validation pass is actually performed and recorded on the issue — this is separate from, and not satisfied by, the promotion below. Two real findings surfaced during the migration, not yet acted on: `InningModal.jsx`'s `POS_COLORS.LC` is `#27ae60` (green), diverging from the shared `color.position.LC` (`#2980b9`, blue) used everywhere else — preserved byte-exact, a fix is planned as an immediate follow-up. A broader codebase audit (2026-08-23) found ~818 more untokenized occurrences beyond this story's scope (`App.jsx` alone: 693) — deliberately not pursued given no customer-facing lift and `App.jsx`'s own pending decomposition plan.

**admin.html Approve/Deny routed through backend (partial fix for #338, PR #780)** — both handlers previously wrote directly to `team_memberships`/`access_requests` via the Supabase client SDK, bypassing every backend guard: no role validation (a raw dropdown value went straight at the DB's CHECK constraint), no `reviewed_by` attribution, and no approval/denial email to the requester (the backend routes send these; the direct writes silently skipped that step). Both handlers now call `POST /api/v1/approve`/`POST /api/v1/reject` with a Bearer token, mirroring the pattern `deleteTeam()` already used for team deletion (#380). Verified by direct comparison against the real route handlers in `backend/src/routes/admin.js`; no automated test exists for `admin.html` (static file, no test harness in this repo) — manual verification against DEV recommended before treating this as fully closed. **Still bypassing the backend, unaddressed:** Add Coach, Remove Coach, Add Team, roster writes (add/remove player, CSV import), schedule writes (add game, CSV import, clear), and feature-flag toggles — none of these have a backend route to route through yet; building them is a separate, larger piece of work. #338 stays open pending that work. **Correction, 2026-08-25: this is now fully resolved** — see the top `develop only` entry above for the remaining 6 routes; #338 and #787 are both closed.

**useAuth silent-stall fix (#579/#766, PRs #767 + #782)** — `useAuth.js`'s `onAuthStateChange` `SIGNED_IN` handler previously left `authState` unchanged (stuck in an ambiguous state) if the background `/me` call failed right after sign-in, with no user-visible feedback. #579 had been auto-closed by PR #580 (a docs-only filing, not a fix) back on 2026-08-05 — reopened 2026-08-23 and closed for real by PR #767: the handler now has an explicit `else` branch mirroring `checkSession`'s existing `/me`-rejected handling, setting `error` and explicitly re-settling `authState` to `'unauthenticated'`. The same fallback was added to the surrounding `catch` block for thrown/network errors. `frontend/src/tests/auth.test.js` test B4 rewritten to assert the fixed behavior, RED-confirmed against the pre-fix code before applying the fix. PR #767 deliberately left the hook's `error` field unwired from any UI (would have touched the locked `App.jsx` prop-wiring) — PR #782 closed that residual gap same-day, wiring `authError` into `LoginScreen`'s existing error display via a `useEffect`, reusing the form's existing error state and clear-on-edit behavior rather than adding a second banner (`LoginScreen.test.jsx` +24 lines of coverage).

**Test coverage batch** — `GameModeGearMenu.test.jsx` (10), `RunnerConflictModal.test.jsx` (8), and `LiveScoringPanel.test.jsx` (19 tests across its 3 render states — no active scorer, another scorer active, I am scorer — plus pitch recording, Undo, contact-pitch outcome sheet, mercy-rule banner, roster swap, opponent-half pitch tracking, and header controls; children with their own test files mocked to keep this suite focused). Closes the "one substantial gap" `FEATURE_MAP.md` row 11 flagged after the prior test-coverage session (`LiveScoringPanel.jsx`, 1302 lines, previously zero direct coverage). Also added: `leagueRules`, `ErrorBoundary`, `useBackendHealth`, ScoringMode finalize/restore, batting order, schedule, `flipHalfInning`, `useFeatureFlag`, `playerUtils` — plus deletion of a dead `leagueRules_corrections.js` scratch file whose proposed corrections were already incorporated into `leagueRules.js`.

**CI flake fix (#785, PR #786)** — `backend/scripts/tests/suite-validation.js`'s `VAL-01` through `VAL-05` POSTed to prod `/request-access` using 5 hardcoded emails (`val01@test.com`...`val05@test.com`) on every CI run, forever. `requestAccessLimiter` rate-limits that endpoint per email at 10 req/60min, so normal CI traffic across the project's history could exhaust those fixed emails' budgets, turning 400-checks into false 429s — diagnosed after it blocked two PRs across multiple re-runs. Switched to the same per-run-unique-email (`state.runId`) pattern already used consistently across the other integration suites. Test-only change, no endpoint behavior change.

**Docs staleness remediation batch 1 (#773, #774)** — Privacy Policy now discloses the actual Mixpanel identity payload (coach_name, team_name, team_id) instead of claiming anonymity, and corrects the access-request path to the current team-search flow (`legal.js`). `backend/migrations/README.md` replaced a false blanket "idempotent, safe to re-run" claim with a per-migration status/idempotency table covering all 20 files, sourced from each file's own header — flags 008/020 as non-idempotent and 021/023 as currently NOT live on prod with re-apply preconditions. `docs/analytics/ANALYTICS.md` rebuilt from current `track()`/`vaTrack()` call sites, correcting the "Auth Funnel gated/dormant" claim (auth has been live since v2.6.0). `docs/features/feature-flags.md` now documents the two coexisting localStorage override schemes (`flag_NAME` vs `flag:name`) and the Supabase `feature_flags` runtime layer, neither previously documented. Also corrected: `docs/features/accessibility-v1.md` (default-off → GA default-on, test count 19→24), `frontend/src/tests/README.md` (stale known-failing-test claim replaced with the real current skip), `backend/scripts/tests/TEST_SETUP.md`, `.github/pull_request_template.md`, `docs/process/ISSUE_TRACKING.md`, `scripts/smoke-test.js` (example port fix), and `docs/features/ios-pwa-install-overlay.md` (marked superseded by the shipped implementation). `docs/product/RELEASE_NOTES.md` archived with a pointer to `versionHistory.js` as canonical (had stopped updating after v2.7.0). Not included in this batch: the Mixpanel/PII data-collection code itself (#774 is documentation-only here — no data-collection code changed) and `LiveScoreViewer.jsx` (#775, deferred to the regular fix path per KK).

**Routine:** synced `backend/package-lock.json`'s version field (was already drifted, still reading 2.12.0 before this bump). Found and fixed `frontend/package-lock.json` also stale — a full release behind at 2.11.0 — synced to match `frontend/package.json`.

**Verification (CI run at `develop` HEAD `bce6ba9`, 2026-08-23):** frontend 1227 passed / 1 skipped (108 files), backend unit 147/147, `debt-p0` gate clear (0 open P0s).

**Soak explicitly overridden, 2026-08-23/24.** Soak started 2026-08-23 19:35 EDT (PR #786 merge); normal 24h clearance would have been 2026-08-24 19:35 EDT. Per PR #799's own body, after reviewing a Pass/Blocked validation report KK instructed: **"document these as proof and let's do prod release v2.13 now"** — deliberately overriding both the remaining soak time and the real-device promotion gate, not just accepting an early-but-complete pass. Explicitly **not executed** before promotion: the real-phone visual pass (B1-B11), live magic-link flow (C1-C3), PROD admin checks (D1-D3), and the interactive seeded Game-Day golden path. PR #799 itself documents this does not convert any blocked check into a pass, and instructs keeping #698 and #338 open (see the #698 correction above and #338, which correctly remains open). This is a deliberate, recorded exception, not a silent gap — same pattern as the v2.9.0/v2.11.0/v2.12.0 soak overrides, but the first time the real-device gate specifically (not just the soak clock) was knowingly waived for a release touching Game Mode/Live Scoring this directly.

**Promoted to `main` 2026-08-24** (PR [#799](https://github.com/kaushikkuberanathan/lineup_generator/pull/799), regular merge — confirmed a genuine 2-parent merge, parents `43b0b75` + `28cd2e5`). Post-promote sync back into `develop` not yet separately verified in this entry; `develop`'s only commits beyond `main` as of this correction are 10 pure test-coverage additions (PRs #797/#798/#800-#807), no pending feature/version work. Direct live-PROD smoke test (`/ping`, frontend load, deploy-record cross-check against Render/Vercel) was not independently re-run as part of this correction pass — recommend doing so before treating this release as fully closed out, per this repo's standing practice for every prior promote.

**🔒 DEV/deploy freeze — lifted, 2026-08-24.** Declared 2026-08-23 ~21:50 EDT by KK to protect the soak; cleared under its own stated condition (b) — v2.13.0 is confirmed promoted to and live on `main`. `develop` has already accepted 10 commits since the promote without incident. Migration `023_enforce_team_season_not_null.sql` remains untouched, still gated on its own separate precondition (see `backend/CLAUDE.md` § Migration Notes) — the freeze lifting does not affect it.

---

## v2.12.0 - 2026-08-22 - Home membership visibility, unified team search, prod auth incident hardening (promoted to main 2026-08-23, PR #760)

**Minor bump** — Story 134 is a genuine new coach-facing feature (Home redesign to match Account's team visibility), not just a fix batch, following the "size the bump to the release's actual scope" convention established at v2.9.0-v2.11.0.

**Home membership teams + unified Find your team entry (Story 134, #740, PR #741)** — Home's "Your Teams" list now filters through `memberships[].team_id`, matching the Account tab's existing reconciliation pattern, instead of showing every team cached on the device. Replaced the conditional local-filter search field plus a separate "Don't see your team? Search for one" link with one always-visible "Find your team…" bar that opens the existing Story 124 discovery flow. Newest-season-first sorting and existing card actions preserved. App-level golden-path coverage added (`AppHomeMembershipTeams.test.jsx`).

**Post-merge follow-up fix (Story 135, #742, PR #743)** — review of Story 134 found it expanded the blast radius of the pre-existing #729 gap: `createTeam()` never refreshed the client-side `memberships` array, so previously only the Account tab was affected, but once Home started filtering by memberships too, a just-created team briefly vanished from Home as well until reload. Added `refreshMemberships()` to `useAuth.js` (re-fetches `/api/v1/auth/me`, updates `memberships`/`membership` only) and wired it into `createTeam()`'s existing save-then-load chain. Verified live on `dev.dugoutlineup.com` by KK — a newly created test team appeared in "Your Teams" immediately, no reload needed. Also corrected two docs still referencing the removed link (`faqs.js`, a `TeamSearch.jsx` header comment). Does **not** close #729 — that issue's broader Account-tab gap (membership staleness outside the create-team path) stays open. RED→GREEN verified for both the hook unit test (`useAuth.refreshMemberships.test.js`, 4 tests) and the App-level wiring (extended `AppHomeMembershipTeams.test.jsx`, +1 test) via mutation checkpoints.

**Duplicate Vercel project deleted (Story 136, #744)** — `lineup-generator` (no hyphen) was a second Vercel project accidentally linked to this repo's GitHub integration alongside the real `line-up-generator` project, producing a failing check on most PRs since before this release with zero functional impact (it owned no custom domain). Verified via direct Vercel API lookups — `dev.dugoutlineup.com` resolves to a `develop`-branch build on `line-up-generator` only — before deleting the duplicate from the dashboard.

**Production auth incident prevention (PR #739, closes #738)** — 2026-08-22: Supabase disabled legacy JWT-format API keys for this project, but Vercel's `VITE_SUPABASE_ANON_KEY` still held the old key, silently breaking both magic-link and Google sign-in for every user with zero server-side trace. Already fixed live in Vercel directly (key rotated to the `sb_publishable_` format, both Production and Preview, redeployed and verified) before this code landed; this PR is the prevention/observability follow-up — `vite.config.js` now fails real Vercel builds (`VERCEL=1` only, never CI or local dev) if `VITE_SUPABASE_ANON_KEY` looks like a legacy JWT, and three previously-silent auth failure paths in `useAuth.js`/`LoginScreen.jsx` now log sanitized diagnostics (error type/status only, never tokens) instead of swallowing everything. Full incident timeline in `docs/TROUBLESHOOTING.md`. No automated test added — verified manually in both directions (build fails with a legacy-shaped key under `VERCEL=1`, builds clean without it and in CI/local dev).

**Routine dependency updates**: `@supabase/supabase-js` (PR #725), `mixpanel-browser` (PR #727), `libphonenumber-js` backend (PR #726), `@testing-library/jest-dom` (PR #728).

**Verification (re-run directly, 2026-08-22):** frontend 1090 passed / 1 skipped (95 files), lint clean, `npm run build` clean, `debt-p0` gate clear (0 open P0s).

**24h soak explicitly overridden 2026-08-23** by KK, citing fall season readiness — not a hotfix, a deliberate exception, same pattern as v2.9.0's and v2.11.0's overrides. **Promoted to `main` 2026-08-23** (PR [#760](https://github.com/kaushikkuberanathan/lineup_generator/pull/760), regular merge, `43b0b75`) — confirmed a genuine 2-parent merge via direct API check. Prod smoke test same session: backend `/ping` 200 OK (708ms), frontend loads clean; both Render and Vercel confirmed serving the exact promoted commit via direct deploy-record queries. Post-promote sync (PR #761) merged the same session.

---

## v2.11.0 - 2026-08-19 - Team seasons, first-save race fix, Story 133 slices 1-4/13 (promoted to main 2026-08-21, PR #731)

**Minor bump** — team season tracking is a genuine new coach-facing feature (not a fix batch), matching the "size the bump to the release's actual scope" convention established at v2.9.0/v2.10.0.

**Team season tracking (#713, closes #719)** — new `teams.season` column (`Spring`/`Fall`, paired with the existing `year`), surfaced across team creation, editing, display, switching, sharing, PDF export, admin.html, and team search (season/year independent filters, newest-first ordering). Every team write path requires a valid season; Create/Save stay disabled until one is selected.

**Two-phase PROD rollout — complete.** Migration 022 applied to DEV 2026-08-18 and PROD 2026-08-19. Migration 023 applied to PROD 2026-08-30 after the season-aware runtime had been live since v2.11.0 and a fresh live precheck returned 6/6 teams, 0 NULL seasons, and 0 invalid seasons. Post-apply verification confirmed `NOT NULL`, `teams_season_check`, and unchanged valid data. **DEV acceptance pass — done, 2026-08-21.** KK ran create/edit/search/switch/reload manually against `dev.dugoutlineup.com` with a real authenticated session. Season create, edit, search (season + year filters), and reload-persistence all passed clean. One real but pre-existing, unrelated, non-blocking bug found and filed: newly created teams don't show up in the Account tab's "Your Teams" list until reload — root-caused to `createTeam()` never refreshing the separate `memberships` array `useAuth.js` uses for that list; server-side data (the membership row itself) was confirmed correct and instant. Filed as [#729](https://github.com/kaushikkuberanathan/lineup_generator/issues/729), logged in `CLAUDE.md`'s Known Open Bugs table (row 12).

**Fixes found during the season rollout:**
- Legacy division-seed migration (`migrationTargets`) had no `season` field, so it picked up a date-based guess instead of a fixed value — fixed (PR #717).
- New-team first-save persistence race: `loadTeam()` now waits for the `teams` insert and its membership-provisioning trigger to finish before starting the first RLS-protected `team_data` write, closing a window that produced a real `42501` RLS denial (PR #720).

**Test coverage (PR #722, closes #721)** — extracted `currentSeasonGuess`/`formatSeason`/`compareTeamsNewestFirst` out of `App.jsx` into `frontend/src/utils/season.js` (12 tests, replacing 3 inline copies); `admin.html` behavioral-parity test (extracts its real inline function source via brace-counting, not a hand-copied restatement); backend `INT-06` DB-constraint test (CI_SAFE-skipped, like the rest of that integration suite). Deliberately did not add migration-file tests — no migration in this repo has one; a new pattern for one column would be a separate architectural decision. Frontend 1069→1084 (+15), backend unit unchanged at 147 (INT-06 lives in the integration suite).

**CORS fix (PR #714, closes #715)** — `dev.dugoutlineup.com` added to the backend CORS allowlist; the DEV custom-domain rollout above needed it and every request including `/ping` was being blocked.

**Story 133 — live game-day surface token migration (#698): slices 1-4 of 13 merged**, PRs #705 (slice 1 — mints `color.gameDay.*` namespace, migrates `BenchStrip`/`ScoreboardRow`), #707 (slice 2 — `DugoutView`), #709 (slice 3 — `DiamondView`), #712 (slice 4 — `QuickSwap`). All byte-preserving, zero-intended-visual-change reference migrations. **Status corrected in this entry — the ROADMAP section for Story 133 still read "slice 4 branch cut, ready to start" as of the last edit; slice 4 has since merged.** Full-directory survey (2026-08-17) found the real scope is much larger than the original ticket: `game-mode/*` + `ScoringMode/*` combined have 384 literal-hex color occurrences across 14 files, none previously tokenized — 9 slices remain open, tracked in the Story 133 section below. **Slice 4 validation status: partially validated, not fully tested.** KK's 2026-08-19 release-bar call for this change (a token refactor, not new behavior): proceed given green automated coverage + full frontend CI, no regression found in a partial manual pass, one successful QuickSwap flow confirmed on a real mobile device, and no console/runtime errors — full multi-device/layout visual coverage was explicitly deferred as an accepted residual risk with a follow-up item, not completed. Do not describe slice 4 as fully validated in future release notes.

**Also on develop, unrelated to the above:** Auth screens' remaining exact-match colors converged onto canonical design tokens (PR #693, UX Phase 5). Backend CORS extended to accept this team's Vercel preview domains (PR #706). `PendingApprovalScreen` test coverage added (closes #696, PR #700). `vite` 8.2.1 + `@vitejs/plugin-react` 6.0.5 dependency bump. `env-health-check` skill + script added for verifying local Docker/worktree/test/env health and this repo's GitHub/prod state (prod checks read-only). Routine docs/governance: Story 133 scope-expansion recon and handoff docs, Phase 5/Phase 6 scoping audit (#699), session handoffs, and Stories 129-132 filed for the upcoming UX/Phase 4C work lineup.

**Verification (re-run directly, 2026-08-19):** frontend 1084 passed / 1 skipped (93 files), backend unit 147/147, `npm run build` clean, `debt-p0` gate clear (0 open P0s).

**24h soak override, 2026-08-21:** KK explicitly authorized promoting to `main` ahead of the standard 24h develop-soak window, citing fall season readiness — coaches need season tagging live before fall rosters start. Not a hotfix; a deliberate exception, same pattern as v2.9.0's override. **Promoted to `main` 2026-08-21** (PR [#731](https://github.com/kaushikkuberanathan/lineup_generator/pull/731), regular merge, `102c8ca4`) — confirmed a genuine 2-parent merge via direct API check. Prod smoke test same session: backend `/ping` 200 OK (0.8s), frontend loads clean with zero console errors, both Render and Vercel confirmed serving the exact promoted commit via direct deploy-record queries. Post-promote sync (PR #732) merged the same session.

---

## v2.10.0 - 2026-08-15 - Team search & request-access discovery, confirmation fix (promoted to main 2026-08-17, PR #682)

**Minor bump** — Story 124 is a genuine new user-facing feature (team search + request-access discovery), not just a fix batch, so this follows the same "size the bump to the release's actual scope" convention established at v2.9.0.

**Team search + request-access discovery (#655, Story 124)** — new `GET /api/v1/teams/search` backend route (service-role mediated, returns only `id`/`name`/`age_group`/`sport`/`year`, never `owner_id`), Home tab search entry point, role picker submitting into the existing `POST /request-access`. Frontend + backend shipped together (PR #663, backend route PR #657); see `docs/product/FEATURE_MAP.md` row 39 for test coverage (row 38 as of this release; renumbered 2026-08-27, #114).

**RequestAccessScreen confirmation fix (#665, Story 126)** — `preserveSession=true` submissions (an already-authenticated coach requesting a 2nd team) gave no visible confirmation; the success path relied on a `useAuth` authState transition that doesn't apply when the session is preserved. Added a `submitted` state that renders an inline confirmation card on that path (PR #667). Zero dedicated test coverage on the new state yet — tracked as test debt (#664), not blocking since it's UI-only and was verified by eye.

**Local dev tooling (#668, Story 128)** — optional `SUPABASE_TARGET` env toggle for local backend testing against `dugout-lineup-dev`, avoiding the need to overwrite production credentials in a single local `.env` file (PR #669). No production code path affected — Render never sets this variable.

**Routine dependency updates**: `express-rate-limit` (PR #672), `@vitest/ui` (PR #671), `jsdom` (PR #627), `@supabase/supabase-js` (PR #670).

**CI Node 20 → 22 (PR #678)** — `jsdom@30` and the current `@supabase/supabase-js` sub-packages both raised their `engines.node` floor to `>=22`, which the `frontend`/`backend`/`backend-unit`/`sync-script`/`rls` CI jobs (pinned to Node 20) could no longer satisfy — a runtime-floor problem, not a code regression. Verified behavior-neutral before merging: identical pass counts (134/134 backend unit, 1056/1057 frontend) on Node 22 against unmodified `develop`. This unblocked PRs #627 and #670 above, both of which were failing CI for exactly this reason until this landed; both went fully green (CI + both Vercel deployments) once Dependabot auto-rebased them onto it.

**Docs accuracy pass**: corrected three ROADMAP.md story statuses that still read "Open" after shipping — Stories 120, 124, 126 (PR #675) — fixed a stale file path in the Phase 4C shim-removal checklist left over from the Slice 4 ScoringMode refactor, and flagged a second, independent grant-level gap on the live-scoring tables separate from the RLS-policy work tracked under #355 (PR #676). Also corrected this file's own and `CLAUDE.md`'s v2.9.0 entries, which still described that release as "not yet promoted to main" a full week after it actually promoted (PR #661, 2026-08-09) — see that entry below for what else was stale as a result.

**Promoted to `main` 2026-08-17** (PR [#682](https://github.com/kaushikkuberanathan/lineup_generator/pull/682), regular merge, `9401126`) — confirmed a genuine 2-parent merge via direct API check (parents `832dd7d` + `6c52976`), not the merge-button dropdown. Prod smoke test same session: backend `/ping` 200 OK (304ms), frontend loads clean, both Render and Vercel confirmed serving the exact promoted commit (not stale cache) via direct deploy-record queries. Post-promote sync (PR #683) merged the same session. One checklist item not done by a human: real-device phone smoke test on the preview — recommended, not yet performed as of this entry.

---

## v2.9.0 - 2026-08-08 - Security hardening, team-deletion safety, identity data integrity (promoted to main 2026-08-09, PR #661)

**Minor bump, not patch** — this release bundles more than the security-hardening batch it started as: a database schema change (#375), a backend routing change and a security-policy change (#380), on top of the CodeQL remediation batch and routine dependency bumps below. First time this repo has deliberately sized a version bump to the release's actual scope rather than defaulting to the smallest label.

**Security hardening batch merged to `develop`** (PR [#652](https://github.com/kaushikkuberanathan/lineup_generator/pull/652), regular merge, `495cd5d`) — verified as a genuine 2-parent merge (manual check + the repo's own squash-merge CI guardrail, both green). 24h soak override issued 2026-08-08 (fall season readiness). **Promoted to `main` 2026-08-09** (PR [#661](https://github.com/kaushikkuberanathan/lineup_generator/pull/661), regular merge, `832dd7d`) — confirmed a genuine 2-parent merge. This line went uncorrected for a full week; caught during v2.10.0 release prep (2026-08-15).

- Resolved 12 of 14 open CodeQL security alerts:
  - **Rate limiting** — `POST /request-access` had none; added an email-keyed limiter (10 req/60min), mirroring `loginLimiter`'s proven design (alert #10).
  - **Log injection (CWE-134)** — 5 sites in `backend/src/routes/teamData.js` interpolated an attacker-controlled `teamId` into the first argument of `console.error` alongside a second argument; Node's `util.format` substitution could corrupt the logged error field. Changed to pass `{ teamId, error }` as a structured object (alerts #6, #7, #8, #18, #19).
  - **Insecure randomness** — `DugoutView.jsx`'s `scorer_local_id` generator used `Math.random()`. Replaced with `crypto.randomUUID()` (alert #9). **CI caught a fresh alert** on the legacy-browser fallback branch (deliberately kept per spec) — the fallback also used `Math.random()`, and CodeQL's taint tracking flags that regardless of whether the branch is a fallback. Fixed by using `crypto.getRandomValues()` in the fallback too, eliminating the insecure path entirely rather than dismissing the alert.
  - **CI workflow permissions** — 8 jobs across `.github/workflows/{ci,health-check,health}.yml` had no explicit `permissions:` block; added `contents: read` to each after tracing every step to confirm none need broader scope (alerts #1, #3, #14, #16, #17).
- **Deliberately deferred, tracked as open follow-up, NOT silently dropped**: 2 of the 14 alerts (`POST /logout`, `GET /me` — both js/missing-rate-limiting) remain open. Both routes already sit behind `requireAuth`; rate-limiting them needs user-id-keyed limiting with its own budget (GET /me is called on every session resume), not a reuse of `/request-access`'s email-keyed design. Tracked under [#651](https://github.com/kaushikkuberanathan/lineup_generator/issues/651) — that issue stays open until resolved or explicitly re-scoped.
- **Filed as a separate, standalone finding, NOT fixed here**: the share-link ID generator (`App.jsx:generateShareId`) also uses `Math.random()`. Share IDs are the sole access-control mechanism for unauthenticated team-data viewing per the Auth Principle, so this is a real finding — but `App.jsx` is a locked file and this needs its own dedicated, explicitly-gated session. Filed as [#650](https://github.com/kaushikkuberanathan/lineup_generator/issues/650).
- Every fix has a dedicated regression test, RED→GREEN-verified against the reverted source (not just "test passes now"). Full suite clean: 1027 frontend (85 files) + 125 backend unit, 0 regressions.
- **Doc corrections made during this release's docs pass, pre-existing and unrelated to this release's own changes**: `backend/CLAUDE.md` and `docs/product/FEATURE_MAP.md` were both missing `teamData.delete.test.js` (6 tests, pre-existing) from their backend test inventories, and both mislabeled `normalizeRole.test.js`'s count as 13 instead of its actual 34. Both corrected.

**Team-deletion safety (#380)** — 3 PRs (#642, #646, #647), also on `develop`:
- Team deletion now routes through a backend `service_role` endpoint instead of the anon/authenticated client SDK; `admin.html` updated to use the same backend route.
- Migration 021's original PROD apply was reverted on 2026-08-08 because its backend route had not promoted yet. Live reconciliation on 2026-08-30 found the revocation already active on DEV and PROD (`anon`/`authenticated` both lacked DELETE); migration 030 idempotently reasserted it and created durable history entries on both projects.
- **Correction, 2026-08-15 (v2.10.0 release-prep recon):** this release promoted to `main` on 2026-08-09 (see above) and Render's live deploy has run that code ever since (confirmed via Render's own deploy history, deploy `dep-d9ruuke417fc73alc5vg`, status `live`). A direct query against prod tonight found `anon`/`authenticated` currently hold **no** DELETE grant on `teams` — the revoke is live, not reverted, contrary to what this entry and migration 021's own header both claimed all week.
- **Verified end-to-end against DEV the same day, not just via inspection:** created a throwaway team and deleted it through the real `DELETE /api/v1/teams/:teamId` route with a real authenticated session — mirroring `dbSaveTeams()`/`dbDeleteTeam()` exactly (plain insert, no `.select()` read-back; real `Authorization: Bearer` header), not raw SQL. Result: `200 {"ok":true}`, team confirmed gone afterward. Separately, a second throwaway authenticated user's *direct* `.from('teams').delete()` attempt (the old, pre-#380 path) was rejected with `42501 permission denied for table teams` — a genuine grant-layer denial, and the team was confirmed still present. Both throwaway teams/users cleaned up; DEV verified back to zero test artifacts. **Issue #380 is closed** (2026-08-15, full evidence on the issue) — the net state described above is now proven, not just plausible.

**Identity data integrity (#375)** — migration 020, **already applied to both DEV and PROD 2026-08-07**: adds a CHECK constraint requiring every `team_memberships` row to carry a real identity (user_id or email) — closes the gap that let an orphaned admin-role row with neither exist. Issue #375 is closed; nothing outstanding.

**Routine dependency updates**: react-icons, csv-parse, libphonenumber-js, and the Supabase CLI GitHub Action.

---

## v2.8.5 - 2026-08-06 - Phase 4 var C legacy color-object retirement complete, Story 104.1, AboutTab regression fix

**Promoted to `main` 2026-08-07** (PR #619, regular merge, `06030c1`) — verified as a genuine 2-parent merge. Post-promote sync: PR #630.
- Internal only, no user-facing change, except one real bug fix (see below).
- **Phase 4 `var C` legacy color-object retirement complete** - all originally-planned regions plus a follow-up sweep migrated to the shared design-token system, all zero-visible-change reference swaps: Schedule tab (slice 4, #545), Lineups + Links tabs (slice 5, #546), Feedback/About/Account/Updates tabs (slice 6, #547), Modals/overlays (slice 7), SharedView public share-link page (slice 9, Story 120/#531). **Slice 10** (#606) retired the final 89 `C.*` occurrences across 5 render functions never assigned to any of the original 9 planned slices (renderSongs, renderSnackDuty, renderPinModal, renderTeamTab, renderBottomNav) plus 2 literal-hex bypass sites - `var C` now has zero remaining call sites anywhere in `App.jsx`. Slice 8 (GameModeScreen/DugoutView, Story 116/#503) - the one region formally carved out as its own numbered slice - is not itself part of slice 10's swept functions; whether its own separate inheritance-verification methodology (Story 114's Step 1/2) still needs to run against that surface is an open question this release does not resolve.
- **Story 119 resolved**: minted `color.brand.gradientDark` and swapped the app-shell root background gradient's third stop to use it (#530/#598).
- **Real regression found and fixed** during slice 6: `AboutTab.jsx`'s two cards had been silently rendering with `style={undefined}` (no background, padding, border-radius, or shadow) since a prior release deleted the `S.card` object they referenced via a prop — this bug has been live in production since v2.8.4 shipped. Fixed with a token-driven replica that reproduces the original appearance exactly (#547).
- **Story 104 slice 4.1**: extracted `PlayerFilterToggle` from App.jsx into its own component file, `frontend/src/components/Shared/PlayerFilterToggle.jsx` (#592). Slices 4.2-4.4 remain open.
- Dependency pin: `ip-address` pinned to `^10.4.0` via overrides, closing three Dependabot alerts (#583).
- CI guardrail Action added that detects a likely squash-merge on `develop`/`main` after the fact and comments on the originating PR (#573/#588).
- Stale-docs audit pass: corrected `frontend/CLAUDE.md`'s test count (to 1022 passed/1 skipped/85 files, backend unit 111/111, total 1133) and its stale flattened tab-list model (now describes the actual `primaryTab`/sub-tab structure); disambiguated the `snack_duty` jsonb column-drop debt item from the live `renderSnackDuty()` UI feature in `DOC_TEST_DEBT.md` (#607/#608, #610/#611).
- 18 new/corrected tests added across the token-migration and extraction work (mutation-tested where the change was value-preserving rather than behavior-changing); slice 10 itself added no new tests (token-swap only, verified against the unchanged 85-file/1022-test baseline).
- Patch bump 2.8.4 to 2.8.5.

## v2.8.4 - 2026-08-04 - Phase 3 primitives completion, Phase 4 color-token retirement (slices 1-3), Bug #7 permanent fix
- Internal only, no user-facing change.
- **Phase 3 UI-primitives migration completed**: remaining hand-styled components (FairnessCheck, NowBattingStrip, MaintenanceScreen, ParentView, BattingOrderStrip, LockFlow, DefenseDiamond) migrated to Card/Text/Stack primitives (PRs #519-#526).
- **Story 117 - `S.card` fully retired** across all 17 App.jsx call sites, replaced with the Card primitive (#515); a related dead style object (`S.app`) found and deleted (Story 115, #523).
- **Phase 4 `var C` legacy color-object retirement started** - 3 of 9 planned App.jsx regions migrated to the shared design-token system, all zero-visible-change reference swaps: header/nav chrome (slice 1, #528), Roster tab (slice 2, #529), Defense/Batting grid tabs (slice 3, #537).
- **Bug #7 fixed permanently** (Story 118, #517): the Windows Vitest worker-spawn cold-start flake that intermittently dropped test files from local/CI runs. `fileParallelism:false` is now the standing default in both worktrees' `vite.config.js` (#533, #534) - reduces, does not eliminate, the flake rate.
- Regression test coverage added for share-link payload construction, Game Mode rendering/state, live-scoring session security, and auth routing decisions (#504, #505, #506, #507, #511, #512, #513).
- **Story 121 (P0) filed, not fixed**: `AppShareLinkRouting.test.jsx`'s incomplete Supabase mock fires real network writes/deletes during local test runs (#535) - a live-data-mutation risk, flagged for the Dugout track's ownership, patched into `DOC_TEST_DEBT.md`'s P0 dashboard (#538).
- **Story 119/120 filed, not implemented**: app-shell gradient-token naming and a dedicated SharedView region slice (slice 9), both awaiting a naming/scoping decision.
- **Dependabot reviewed live**: 4 open alerts (2 dev-only `vite`, 2 backend-runtime `ip-address` via `express-rate-limit`) - shipped with all open; the two backend-runtime ones tracked separately (Story 122, #539).
- Full audit: `docs/product/RELEASE_AUDIT_2026-08-04.md`.
- Patch bump 2.8.3 to 2.8.4.

---

## v2.8.3 - 2026-08-01 - Backend test coverage closure, RLS hardening, two silent production bugs fixed
- **Feedback/bug-report submissions fixed (#252, Story 99)**: `admin.js`'s catch-all auth gate was mounted before `feedback.js` on the shared `/api/v1` base, so every non-admin coach's feedback submission silently returned 403. Fixed via mount order in `app.js`; found while closing out Story 99's backend test coverage (unit suite 39 → 111).
- **Automatic roster snapshots fixed (migration 017, #477)**: the `roster_snapshots` auto-prune trigger had no `SECURITY DEFINER`, so its internal DELETE ran as the caller — and migration 004 had revoked DELETE on that table from anon/authenticated. Every roster-snapshot insert had been silently failing since v2.6.0 (2026-07-20). Applied to DEV and PROD; the "Restore Previous Roster" safety net is capturing snapshots again.
- Real-database RLS test coverage added for `roster_snapshots` and `teams` (#477) — the last two of the three tables originally exposed by #342 to gain dedicated coverage. `teams`' coverage was mutation-tested (a temporarily weakened policy confirmed the test catches a real regression, not just a fixture assertion) and re-verified directly against DEV, not just CI's ephemeral stack.
- The `rls` CI job is now a required status check on `main` and `develop` (#480).
- `loginLimiter` (magic-link rate limiting) re-keyed from IP to email, removing a source of cross-request test interference (Story 26).
- Design token cleanup: Stories 110/111 resolved, zero visible UI change (#296, #297).
- Added OSS governance files: LICENSE, SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md (#452).
- Routine CI hardening (Dependabot PR fixes, auto-update-PR-branches workflow) and dependency updates.
- Patch bump 2.8.2 to 2.8.3.

---

## v2.8.2 - 2026-07-31 - Public activity feed: release notes, commit metrics, deploy fix
- Public portfolio activity feed now publishes actual production release notes (#442) instead of individual implementation-story links, with per-release summaries auto-derived from the version and its first shipping bullet (#443).
- Public delivery metrics switched from merged-PR counts to individual non-merge commits, classified as product or quality work (#445); release PRs are still used for production release counts and release-note links.
- Fixed recurring Vercel deployment failures on the generated `activity-data` branch by disabling deployments for that branch and publishing a minimal `frontend/vercel.json` onto it, so the configured Root Directory always exists (#445).
- Tooling/portfolio-only change - no Dugout Lineup application runtime or user-facing behavior changed.
- Minor bump 2.8.1 to 2.8.2.

---

## v2.7.0 - 2026-07-21 - Google sign-in, session visibility, and roster-wipe protection
- **Google sign-in (#394)**: coaches can sign in with Google as well as the email link. Built gate-first - a memberless session (Google or magic link) routes to a NoMembershipScreen, not the app; RLS is the enforcement, the gate is UX. Fixed a pre-existing request-access validator (#397) that rejected canonical roles.
- **Session visibility (#395)**: a home Sign-out link and a Support > Account tab showing the signed-in email and one tappable card per team (tap to switch team and open it). Logout keeps local data.
- **Roster-wipe protection (#386)**: a database-level trigger (migration 015, already live in prod) blocks an empty roster overwriting a populated one for every client. Fixed a migration error-path that wrote an empty roster on a failed read; removed a mislabeled "Reset Roster" button.
- Removed two dead variables blocking the lint gate (#400).
- Minor bump 2.6.0 to 2.7.0.

---

## v2.6.0 - 2026-07-20 - Sign-in required for editing; RLS live in production
- **Auth gate live (#377)**: editing requires a session. Both share viewers (?s= and legacy ?share=) return above the gate, so viewing never requires an account.
- **WS-3 complete (#342)**: RLS enabled in production on team_data, teams, roster_snapshots and share_links with membership-scoped policies. TRUNCATE revoked from anon and authenticated on all three; DELETE revoked except on teams (deferred to #380). Closes the exposure where the publishable key could read, write and TRUNCATE every team's data.
- **Write failures surface (#381)**: Supabase write errors now reject and show a toast. Previously they resolved and the sync indicator turned green on a failed write.
- Prod prerequisites: migration 014 profile trigger applied, five missing profile rows backfilled, ten stale val-suite test memberships removed.
- Incident (#387): prod login was broken ~15 minutes after cutover - the Render backend held a legacy SUPABASE_ANON_KEY against a project with legacy keys disabled.
- Minor bump 2.5.32 to 2.6.0.

---

## v2.5.32 - 2026-07-14 - Leaked service_role key rotated; view RLS bypass closed
- **!! SECURITY INCIDENT.** A live PRODUCTION Supabase `service_role` key was found committed in `backend/.env.example`. It had been in a **PUBLIC repo since 2026-03-23 - 113 days**. `service_role` bypasses RLS on every table: rosters, children's names, memberships, auth. Remediated 2026-07-14 - new keys generated, all consumers updated, **legacy keys DISABLED**. The leaked value is dead. It remains in git history (`31b8d38`, `a79d1af`, `a72d37b`); rotation is what killed it, deletion would not have.
- No evidence of compromise: no unknown teams, admins, or auth users. **But `service_role` reads leave no trace and Supabase retains 24h of logs. 113 days is unauditable.** Absence of evidence is not evidence of absence.
- Found by ACCIDENT - the agent noticed real-looking JWTs in `.env.example` while reconning CI secrets for the drift-detection script (#351). Nobody was looking for it.
- `admin.html` had the anon key HARDCODED (a static file - Vite cannot inject env vars there), so the admin panel broke the moment the legacy keys were disabled. Fixed with the new publishable key. It was the ONLY hardcoded key in the repo.
- Migration 011 - a **VIEW was bypassing the RLS lock** on `team_data_history`. Views run with the OWNER's privileges by default and read straight through a lock verified working the day before. Both views now `security_invoker = true`.
- Migration 012 - pinned `search_path` on every SECURITY DEFINER function (an unpinned one is a privilege-escalation vector, and one is called from the client). Dropped `activate_membership()` - dead, phone-era, and it declared `team_id UUID` against a `TEXT` column, so it could never have worked.
- `docs/db/schema.sql` - the first **executable** ground truth this project has had, read from `pg_catalog` and **verified by execution**: 15 tables, 21 policies, 28 indexes, 7 functions, 7 triggers, 2 views.
- **DEV rebuilt as a true mirror of prod.** It was never a mirror - it was a fork, with a table prod lacks, a six-role CHECK containing values that exist nowhere else, and an event trigger that auto-enabled RLS. A migration rehearsed against it proved nothing. WS-3 finally has a rehearsal environment it can trust.
- `docs/TROUBLESHOOTING.md` added. Eight governing docs corrected - `CHARTER.md` claimed three guards prevent roster wipe; all three live in the backend, and the app writes `team_data` directly with the anon key.
- STILL OPEN: RLS is OFF on `team_data`, `teams`, `roster_snapshots` (#342). Four `*_anon_test` backdoors grant `anon` full write on the live scoring tables (#355). Neither is fixable without WS-3.
- Patch bump 2.5.31 to 2.5.32.
---
## v2.5.31 - 2026-07-13 - Security hardening: role normalization + RLS lock
- WS-1 (P1) resolved - Role vocabulary normalization: three layers disagreed on role strings. normalizeRole() is now the single source of truth; all write boundaries canonicalize. POST /admin/approve had omitted `admin` from its validator, so admins genuinely could not approve a Head Coach. 93 backend tests (PR #341). <!-- #336 -->
- **!! CORRECTION (2026-07-13, same day): the original entry claimed /admin/approve-link "threw a CHECK violation". IT COULD NOT HAVE.** Prod's CHECK allows SEVEN roles including `team_admin` - the four-role constraint we built against exists only in the repo, never in the database. **The real reason three access requests had been stuck since April is a UNIQUE INDEX on `(team_id, email)`** - two of the three were for emails that already had an active membership. It was a duplicate-membership violation, not a role problem. See `docs/TROUBLESHOOTING.md`.
- **!! And WS-1's fix BROKE THE PUBLIC SIGNUP FORM.** Ingestion normalization wrote `admin`/`viewer` to `access_requests.requested_role` - values the live CHECK rejected. Head Coach and Parent signups returned 500 from the moment v2.5.31 shipped until migration 009 widened the constraint. **The test suite passed throughout**, because every test asserts on a MOCKED insert payload and no test has ever hit a real constraint (#348).
- P0 (P0) resolved - RLS was DISABLED on five core tables with anon holding full CRUD + TRUNCATE. auth_events (560 rows) and team_data_history (2,811 rows - every roster edit ever made) are now locked: RLS enabled, anon grants revoked. Verified anon gets permission denied; roster saves proven still working (PR #343). <!-- #342 -->
- Corrected a false SECURITY DEFINER claim in 004_rls_fixes.sql. snapshot_team_data() was NOT SECURITY DEFINER; running 004 as written would have blocked the trigger's insert and failed every coach's roster save. Both trigger functions are now SECURITY DEFINER with a pinned search_path.
- STILL EXPOSED: team_data, teams, roster_snapshots cannot be locked until the requireAuth cutover (WS-3). The React app writes all three directly with the anon key, so any auth.uid() policy breaks roster saves today.
- Issues filed: #337 (approve-link HMAC), #338 (admin.html bypasses all backend guards), #339 (test suites pollute prod), #340 (OG meta duplicate), #342 (the P0).
- Patch bump 2.5.30 to 2.5.31.
---
## v2.5.30 - 2026-06-15 - New Demo All-Stars team (full clone of real team data)
- Story 332 (P2) resolved - Demo All-Stars: loadDemoTeam() seeds from frontend/src/data/demoSeed.js, a frozen clone of the Mud Hens team data (full roster with skills/walk-up songs/profiles, defensive grid, 11-game schedule) with all player and opponent names remapped to demo names; added grid persistence + 8U age group (PR #333). <!-- #332 -->
- Per-user copy model: the demo is created locally per device (local-only, never synced to Supabase); the "Try Demo Team" button + dedup guard unchanged.
- Seed-version upgrade path: the new team object is stamped with demoSeedVersion; older/unversioned demos are cleared (all per-team keys removed) and rebuilt on next open.
- Patch bump 2.5.29 to 2.5.30.
---
## v2.5.29 - 2026-06-14 - Brand mark on About tab + printed lineups
- Story 325 (P2) resolved - AboutTab.jsx: replaced baseball emoji with inline BrandMark beside app name/version (PR #326). <!-- #325 -->
- Story 325 (P2) - generatePDF: legacy red team-initial circle replaced with brand mark via jsPDF vector primitives + navy/gold team-initial badge matching the SharedView header; title/date offsets shifted to clear the wider header (PR #326).
- Closes the two remaining surfaces that still showed legacy/placeholder branding after v2.5.28.
- Patch bump 2.5.28 to 2.5.29.
---
## v2.5.28 - 2026-06-13 - Dugout Lineup brand mark across app + share surfaces
- Story 319 (P2) resolved - BrandMark.jsx inline-SVG diamond glyph added as always-present brand identity in the app header and the public SharedView share page; team initial demoted to a secondary badge beside the team name (PR #320). <!-- #319 -->
- Story 319 (P2) - PDF export: hardcoded M in generatePDF replaced with teamName.charAt(0).toUpperCase() - every team PDF header now shows its own initial (was always M) (PR #320).
- Release: APP_VERSION 2.5.26 to 2.5.28 and package.json 2.5.27 to 2.5.28, resolving the stale App.jsx constant left by the 2.5.27 icon/OG release.
- Note: 2.5.27 (icons, OG/Twitter meta, maskable-split) shipped via PRs #305/#309/#310/#311 but was never logged here - captured in versionHistory.js only.
- Deferred fast-follow: DugoutView viewer-path brand mark (flag-off); maskable-512 re-export (current PROD asset reads black-bg, 0% safe-zone); brand-mark image in PDF via addImage.
---
## v2.5.27 - 2026-06-12 - Fresh new look — app icon, share previews, refreshed auth screens

**Backfilled 2026-08-26 (closes #317).** This entry was deferred at release time — local VS Code's EOL/format-on-save setting flips this CRLF file to LF on save, corrupting the whole-file diff — and the release shipped without it rather than commit corruption. Content sourced from the existing `versionHistory.js` v2.5.27 entry and the promote commit (`5ab97c0`, PR #316) rather than re-derived from memory.

- Story 304 - Badge icon set: favicon, apple-touch, pwa-192/512, and a new maskable-512 replace placeholder SVGs; `vite.config` maskable-split (pwa-512 purpose `any`, dedicated maskable-512 purpose `maskable`) (PR #305).
- Story 306 - Removed 4 orphaned `.svg` icon sources from `public/` after the raster icon swap (PR #309).
- Story 307 - Open Graph + Twitter Card share-link meta tags + 1200x630 `og-image.png`; baseball emoji replaced with the badge image on `LoginScreen` + `RequestAccessScreen` (PR #310, PR #311).
- Story 99 - Backend test coverage: `aiProxy` + auth happy-path specs (PR #299).
- Governance - color-token disposition audit, MASTER staging discipline + RED-GREEN workflow (#298-#303).
- Infra - `dev.dugoutlineup.com` confirmed tracking `develop` (#308 closed, caching false alarm); Vercel Deployment Protection disabled for dev soak (#314).
- Promoted to `main` via PR #316 (merge commit `5ab97c0`).
- Root-cause CRLF/EOL tooling gap (also behind Stories 76/96/97) is likely moot going forward — this entry itself was added via Claude Code's Edit tool, which doesn't trigger VS Code's format-on-save conversion. No `.gitattributes` EOL pin added; revisit only if the corruption recurs through this same editing path.

---
## v2.5.26 — 2026-06-08 — New About tab (builder profile + partnership CTA)

- Story 105 (P2) resolved — About tab overhaul: AboutTab extracted from
  App.jsx to `frontend/src/components/Support/AboutTab.jsx`. Builder profile,
  feature bullets, partnership CTA, and email/LinkedIn contact links (PR #283).
- Story 106 (P2) resolved — `AboutTab.test.jsx` golden-path coverage: 13
  tests (AT1–AT13) across all five cards including the collapsible
  How-to-Use toggle (PR #290).
- Story 99 (P1, In Progress) — Backend teamData tests (Phase 2 tranche 1):
  wipe-guard, envGuard, isAdminRequest coverage (PR #282).
- Story 83 (P1) resolved — Regression guard `appImports.test.js` (3 tests)
  asserts the `supabase` named import is present in App.jsx so feedback and
  bug submission cannot fail silently; Stories 83/84 marked Resolved (PR #289).
- Story 104 — UX Phase 4 App.jsx decomposition planning doc (PR #280).
- Stories 106/107/108 filed (PR #287).
- Test suite: 815 passing / 1 skipped — 786 frontend + 29 backend (pre-promote run).

---

## v2.5.25 — 2026-06-01 — Backend test foundation + OUT-row error tint tokens

- Story 99 (P1) — Backend test foundation (In Progress): supertest devDep,
  app/server split (app.js extracted from index.js, import-safe for supertest),
  admin.auth.test.js (9 in-process tests closing the green-but-vacuous admin
  auth coverage gap), test:unit script, and a hermetic backend-unit CI job
  gating deploy. Remaining route coverage (teamData wipe-guard, AI proxy,
  auth happy-path) tracked in #252.
- Story 102 (P3) resolved — App.jsx OUT-row error tint migrated to
  tokens.color.overlay.error* tokens; errorMid token added
  (rgba(220,38,38,0.12)). Zero visible color changes (PR #271).
- Docs: backend/CLAUDE.md routes section corrected (admin paths are bare
  /api/v1, not /api/v1/admin/*); FEATURE_MAP row #33 added; backend test
  count reconciled (771 frontend + 9 backend supertest).

---

## v2.5.24 — 2026-05-31 — Token consistency, qs patch, version history enforcement

- Story 93 (P3) resolved — DefenseDiamond Tier D: all position and
  field colors now use design tokens. App.jsx POS_COLORS migrated
  to token system. Zero visible color changes; single source of truth
  for future theming.
- Story 100 (P3) resolved — Backend qs 6.15.0→6.15.2 patch bump
  (Dependabot /21 cleared).
- Version history standards enforced — 16 historical entries
  rewritten to coach language; 4 CI tests added to prevent
  regression (no PR/Story refs in userChanges, headline required,
  date format validated).

---

## v2.5.23 — 2026-05-30 — ESLint zero, Vite 6, token cleanup

- Story 77 (P2) resolved — ESLint debt fully cleared: 0 warnings
  0 errors across entire codebase after 5 phases (A–E). App.jsx
  reduced by ~650 net lines of dead code and lint fixes.
- Story 81 (P2) resolved — Vite ^5.1→^6.4.2 + vite-plugin-pwa
  ^0.19→^1.0. Clears 3 Dependabot moderate vulnerabilities.
  Shipped in v2.5.22 (PR #235); ROADMAP flip retroactive.
- Story 98 (P3) resolved — ci.yml sync-script job gained
  permissions: {contents: read} block (CodeQL compliance).
- Stories 60, 64, 65 (P3/P2) resolved — UX token cleanup bundle:
  LegalSection Card drift, shadow.subtleCard, related migrations
  (PR #247). Shipped v2.5.22/v2.5.23 cycle.

---

## v2.5.22 — 2026-05-29 — DefenseDiamond + MaintenanceScreen token migration; sync-script CRLF fix

- Story 92 (P3) resolved — DefenseDiamond Tier A+B token migration at `frontend/src/components/GameDay/DefenseDiamond.jsx`; new tokens `borderWidth.{hairline,thin,medium}` added to `frontend/src/theme/tokens.js` (PR #218 → #227)
- Story 94 (P3) resolved — MaintenanceScreen token migration at `frontend/src/components/Shared/MaintenanceScreen.jsx`; new tokens `color.overlay.{whiteMedium,whiteHeavy}` added (PR #220 → #227)
- Story 96 (P3) filed — ROADMAP CRLF heading artifact backlog item (PR #233); two known artifacts on Stories 92+94 headings cleaned via binary-mode byte patch this release (PR #236)
- Story 97 (P2) resolved — `scripts/sync-stories-to-issues.js` byte corruption fixed at line 87 (CRLF-safe split); `findExistingOpenIssue` response unwrap fixed (`res.items` → `res.body.items`, dead-code bug); `patchHeading()` shared function extracted (PR #236)
- Story 97 (P2) tests — `scripts/__tests__/sync-patch.test.js` with 4 regression tests via `node:test`; new `sync-script` CI job added to `.github/workflows/ci.yml` runs parallel with smoke, does not block deploy (PR #236)
- PR #229 (Story 84 follow-up) — box-score AI parser `teamName` fix: replaced undefined `teamName` references with `activeTeam.name` in App.jsx
- PR #228 — ESLint cleanup pass: non-App.jsx `no-unused-vars` and `no-unescaped-entities` resolved
- PR #230 — Story 61 marked Resolved in v2.5.16 (vTBD label replaced with shipped-version label)
- PR #226 — techNote approved-strings rule added to Pre-release Docs Checklist (CLAUDE.md governance hardening)
- Test suite: 759 effective passing / 1 skipped / 0 failed (755 observed today due to Bug #7 EmptyState.test.jsx worker-startup flake — environmental, documented in CLAUDE.md Known Open Bugs)

---

## v2.5.21 — 2026-05-27 — SW update banner restored; BottomSheet primitive ships

- Story 85 (P2) resolved — `useRegisterSW` return destructured at App.jsx:1838; `updateServiceWorker` now available to both banner click handlers (App.jsx:3518, 8633); manual `needRefresh` / `setNeedRefresh` stubs replaced with hook values. In-app update prompt visible for the first time since the stubs were introduced (PR #188 → promote PR #216)
- Story 87 (P2) resolved — BottomSheet primitive added at `frontend/src/components/ui/BottomSheet.jsx` (80 lines: overlay, focus trap, slide-up animation, scrim dismiss); LockFlow.jsx migrated from inline modal to BottomSheet consumer; `radius.sheet` + `shadow.sheetTop` tokens added to `frontend/src/theme/tokens.js`. 7 new BottomSheet tests (BS1–BS7) + 6 new theme.tokens tests (PR #190 → promote PR #217)
- Story 88 (P2) resolved — status tint token family added (success/warning backgrounds + borders + text variants); ValidationBanner second-pass binds to status tokens instead of inline literals (PR #215)
- Story 89 (P3) resolved — overlay alpha-tint token family added (`overlay.redFaint/redStrong`, `overlay.warnFaint/warnStrong`, `overlay.winFaint/winMid`); OfflineIndicator second-pass binds to overlay tokens (PR #215)
- Story 91 (P2) resolved — `scripts/sync-stories-to-issues.js` guards the ROADMAP patch block with `typeof issueNum === "number"` — failed POST no longer corrupts ROADMAP.md with `<!-- #undefined -->` markers (PR #211 → promote PR #216)
- Story 76 (P3) resolved — 48 embedded `\r` corruption artifacts scrubbed from ROADMAP.md story headings: 16 Variant A (double-marker `<!-- #N -->\r`, Stories 72–87) + 32 Variant B (single-marker `<title>\r <!-- #X -->`, Stories 19–22, 62, 64–65, and others). Fixed with one-pass awk sweep. Zero user-facing change.

---

## v2.5.20 — 2026-05-26 — Story 84 fix, UX Phase 5 token foundation, sync-script governance

- Story 84 (P2) resolved — box-score AI parser now sends correct team name to LLM; `teamName` undefined ref replaced with `activeTeam.name` closure read (PR #178)
- UX Phase 5 foundation — `surface.chrome` token + GameDay/* migrations (NowBattingStrip, BattingOrderStrip, Toast, FairnessCheck, LockFlow); zero `#1e3a5f` literals remain in frontend/src/ (PR #179)
- sync-stories-to-issues.js de-dup check — queries GitHub Search before creating; double-marker patch cleanup (Story 90, PR #204)
- Release Ritual: post-promote sync convention codified — `sync/main-into-develop` PR required after every develop → main merge (Story 86, PR #177)
- CLAUDE.md Issue & Backlog Hygiene tightened — Rule 1 reworded, new Rule 7 (session-close sync gate), new item 18 in Pre-release Docs Checklist (PR #201)
- ValidationBanner + OfflineIndicator token touch-ups (PR #202); Stories 87, 88, 89, 91 filed for future UX/tooling cleanup work
- Session retrospective 2026-05-23-A logged (PR #176)
- ROADMAP backlog hygiene — Stories 77-91 synced to GitHub Issues #180-#209; 9 duplicate issues cleaned up after sync-script ran on stale base (PRs #191, #201, #208)

---

## v2.5.19 — 2026-05-22 — Supabase import fix restores coach feedback; label schema, audit, governance

- Story 83 (P1) resolved — `supabase` client import added to App.jsx; restores silent feedback/bug POSTs (PR #171)
- npm audit fix — 12 of 15 frontend + all 3 backend vulns resolved; 3 esbuild/vite chain items deferred as dev-only (PR #164); Story 81 (P2) filed for Vite major upgrade
- CLAUDE.md updated — promote merge strategy (Story 79), worktree pre-pull convention (Story 80), stale pre-push hook description corrected (PR #165)
- Label schema expanded 28 → 31 — `type:docs`, `type:refactor`, `status:ready-for-review` added; `setup-github-labels.ps1` + 4 doc references synced (PRs #166, #168, Story 78)
- Stories 83-85 filed from Story 77 no-undef triage — supabase import gap (Story 83, resolved this release), `teamName` undefined in box-score parser (Story 84, P2), SW update ReferenceError (Story 85, P2) (PR #169)
- Session retrospective 2026-05-22-A logged (PR #170)

---

## v2.5.18 — 2026-05-21 — Pre-push hook fix, sync-script hardening, lint debt filed

- Story 75 (P1) resolved — Vitest + lint removed from `.husky/pre-push` hook; CI (GitHub Actions) is sole authoritative gate (PR #155)
- sync-stories-to-issues.js hardened — Fix A: strip `<!-- #N -->` placeholder from issue titles before GitHub API call; Fix B: word-boundary regex replaces `text.includes()` keyword matching; metachar escape prevents crash on `?s=` keyword (PR #156)
- Stories 72–76 ROADMAP markers updated from `<!-- #N -->` to real issue numbers (#150–#154) following live sync
- Story 77 (P2) filed — 132 ESLint problems block strict lint gate; `no-undef` errors on `supabase`, `teamName`, `updateServiceWorker` flagged as potential real bugs warranting triage

---

## v2.5.17 — 2026-05-21 — Governance pass — session retrospectives, CLAUDE.md trim, backend route modularization

- SESSION_RETROSPECTIVES.md introduced (PR #139) — sessions 2026-05-19-B and 2026-05-20-A logged
- CLAUDE.md trimmed 44.8k → 35.4k chars — RELEASE_NOTES.md, PHASE4C_CUTOVER.md, VERSION_HISTORY_SCHEMA.md extracted (PR #143)
- UX Phase 3 Step 3 — FAQSection + LegalSection token migrations (PR #144)
- Backend route modularization — `src/routes/ops.js` created with `/api/v1/ops/ping` + `/api/v1/ops/health`; `teamDataRouter` dual-mounted at `/api/v1/teams`; mount-order bug fixed (specific paths before generic); `/test-public` deleted (PR #145)
- Worktree Husky setup convention added — fixes pre-push hook misfire in non-primary worktrees (PR #148, Story 76)
- Stories 70–76 filed; Story 75 (P1) — pre-push hook Vitest reliability — escalated for next governance pass

---

## v2.5.16 — 2026-05-19 — Repo governance & GitHub settings hardening

- GitHub settings audit complete (Story 68) — ChatGPT Codex Connector and Grok revoked, Dependabot alerts enabled, CODEOWNERS added
- CODEOWNERS file — locked file gate convention now machine-enforced via GitHub PR review requests
- GitHub Issue templates — Bug Report, Story, Governance forms with label system
- 27 GitHub Issues bootstrapped from ROADMAP backlog (#105–#131)
- Story 69 opened — Dependabot vulnerability triage (18 alerts, 6 high 12 moderate)

---

## v2.5.14 — 2026-05-16 — UX Phase 3 — Design System Primitives

### UX Phase 3 Step 3 — Pill + ListRow primitives + Support page migrations (commit `40ad221`)

- `frontend/src/components/ui/Pill.jsx` — new compact toggle-chip primitive (variant via `active` prop; non-44px-floor by design; serves horizontal-scroll selector rows). 22 tests (PL-series).
- `frontend/src/components/ui/ListRow.jsx` — new full-width tappable row primitive (44px floor enforced, optional bottom divider). 23 tests (LR-series).
- `frontend/src/components/Support/FAQSection.jsx` — C/S props removed; category picker → Pill, accordion rows → ListRow, layout → Stack, typography → Text.
- `frontend/src/components/Support/LegalSection.jsx` — C/S props removed; doc list → ListRow, back nav → Button (ghost variant + style escape), viewer body → Card (full style escape — see Story 64), layout → Stack, typography → Text.
- `frontend/src/App.jsx` — dead C/S props removed from both Support render sites (lines 8207-8208).
- Token gaps surfaced inline: documented as Story 65 (token batch).

### UX Phase 3 Step 4 — ValidationBanner + OfflineIndicator migrations (commit `6f54757`)

- `frontend/src/components/Shared/ValidationBanner.jsx` — consumes Stack + Text; literal success/warning bg + border tints + dark-on-tint text colors preserved as style escapes (no token equivalents — see Story 65).
- `frontend/src/components/Shared/OfflineIndicator.jsx` — consumes Stack + Text; **4 token wins**: `brand.red`, `status.warning`, `status.success` for dot colors (exact matches) + `radius.pill` for the outer chip shape. rgba alpha tints stay literal. Non-interactive by contract (renders `<div>`, not Pill/Button — locked by OI6.1 test).
- 26 characterization tests added across both components (12 VB, 14 OI) — lock the visual contract for the migration.

### Release mechanics

- Suite: 725 passed + 1 skipped + 0 failed (48 test files) on the post-Step-4 commit.
- Bug #7 Windows worker-timeout flake observed on 4 separate files across this session's runs (a11y-component-fixes, attendance, scheduleIntegrity, a11y again). All transient; CI is the authoritative gate.

---

## v2.5.13 — 2026-05-15 — Scoring restoration

**Title:** Scoring restoration — leagueRules crash + DugoutView deadlock

Closes Stories 15 and 16.

### Changes

- **Fixed:** `getRules` no longer throws on unrecognized age group keys (e.g. `"10U"`). New alias map normalizes `10U`/`9U`/`10U-minor`/`9U-minor` to canonical `9-10U` / `9-10U-minor` keys. When normalization still doesn't match, falls back to `baseball:9-10U` (or `softball:9-10U`) and emits `console.warn('[leagueRules] Unknown profile "X" — falling back to default')`. Pre-v2.5.13 this throw at hook-init time blocked the scoring surface from rendering entirely.
- **Fixed:** `dugoutFocusMode` deadlock — LiveScoringPanel is now visible whenever the coach has claimed scorer (Practice Mode or real game). Formula revised: `(currentAtBat !== null || scorerClaimed) ? 'scoring' : 'lineup'`. Pre-v2.5.13 the state machine showed DefenseDiamond at the start of every scoring session, with no UI to call `startAtBat()` — locking the coach out of starting the first at-bat.
- **Updated:** Two `DugoutView.test.jsx` tests rewritten to assert the v2.5.13 contract. Viewer-path transitions (still currentAtBat-driven) untouched.
- **Docs:** Root `CLAUDE.md` `dugoutFocusMode` entry rewritten with the new formula, per-role behaviour, and the deadlock rationale. Story 48 named as the designated follow-up for the scorer-side defense-view toggle.

### Files changed

- `frontend/src/utils/leagueRules.js` — alias map + fallback return
- `frontend/src/components/game-mode/DugoutView.jsx` — `dugoutFocusMode` formula
- `frontend/src/components/game-mode/DugoutView.test.jsx` — two tests
- `CLAUDE.md` — `dugoutFocusMode` doc entry
- `frontend/src/App.jsx` — `APP_VERSION` bump
- `frontend/package.json` / `backend/package.json` — version bump
- `frontend/src/data/versionHistory.js` — release entry prepended

### Release mechanics

- Suite: 654 passed / 1 skipped / 0 failed (44 test files)
- Build: clean (module count reported at deploy step)

### Follow-up

- **Story 48** — in-session defense-view toggle for scorers. v2.5.13 leaves DefenseDiamond mounted but `display:none` for the entire scorer session; toggle should surface on ScoreboardRow so coaches can review positions between at-bats without exiting DugoutView.

---

## v2.5.12 — 2026-05-14 — Badge/PlayerHandBadge consolidation + backlog hygiene

No user-visible changes. Two PRs aggregated under v2.5.12 banner — internal primitive consolidation and backlog documentation.

### UX Phase 3 — Badge/PlayerHandBadge consolidation (PR #73, f6c4bc4)

- `frontend/src/components/ui/Badge.jsx`: new `context = 'light' | 'dark'` prop with token-driven dark variants
- `frontend/src/components/PlayerHandBadge.jsx`: extended with `context` prop, forwarded to Badge
- `frontend/src/components/Shared/PlayerHandBadge.jsx`: deleted (stale precursor; filename collision resolved)
- `frontend/src/components/GameDay/NowBattingStrip.jsx`: repointed to root PlayerHandBadge + `context="dark"` wired in
- `frontend/src/components/GameDay/NowBattingStrip.test.jsx`: new — integration regression guard (63 lines)
- `frontend/src/components/PlayerHandBadge.test.jsx`: +4 tests (R3.8–R3.11, RED → GREEN)
- `frontend/src/components/ui/Badge.test.jsx`: +5 tests (BD8.1–BD10.1, RED → GREEN)
- Story 63 (P2) logged: pre-existing now-batting strip badge data-path bug (out of scope for this release)

### Backlog hygiene pass (PR #74, 7c6f001, Story 34)

- `docs/product/ROADMAP.md`: Story 27 renumbered → Story 61 (5 references updated); P2 row 47 promoted → Story 62 with typed AC; Gaps 17/18/25/52 documented in Retired / Never Filed; 13 resolved headings marked ✅; scoring v2.4.x renamed from "candidates" → "completed"
- Story 34 closed (backlog hygiene scope complete)

---

## v2.5.11 — 2026-05-13 — Slice 4 cleanup + Phase 3 Step 2 + docs catchup

No user-visible changes. Three PRs aggregated under v2.5.11 banner — internal foundation work.

### Slice 4 dead-code cleanup (PR #67, Story 54 partial)

- Deleted: `frontend/src/components/ScoringMode/index.jsx` (legacy root component — last consumer removed in v2.5.9 Slice 3)
- Deleted: `frontend/src/components/ScoringMode/README.md`
- Deleted: `frontend/src/components/Viewer/ViewerMode.jsx` (only consumer was its colocated test; share-link path moved to `DugoutView isViewer={true}` in Slice 3)
- Deleted: `frontend/src/components/Viewer/ViewerMode.test.jsx`
- `frontend/src/components/Viewer/` directory removed (became empty after the two file deletions)
- `frontend/src/components/ScoringMode/` directory **preserved** — still holds 7 live child components that `game-mode/DugoutView.jsx` imports directly (`ScoringModeEntry`, `LiveScoringPanel`, `RestoreScoreModal`) plus their transitive imports (`FinishGameModal`, `GameModeGearMenu`, `LiveScoreViewer`, `RunnerConflictModal`). Original Story 54 plan called for full directory deletion; recon showed that would break the build because DugoutView depends on those children. Restructuring those children into `components/game-mode/scoring/` is a separate refactor PR.

### UX Phase 3 Step 2 — EmptyState → primitives (PR #68)

- `frontend/src/components/Home/EmptyState.jsx` migrated to consume Phase 2 UI primitives — outer flex → `<Stack>`, subtitle → `<Text>`, title → `<Text>`, button → `<Button variant="secondary">`. Removed direct `tokens` import (primitives consume tokens internally).
- `EmptyState.test.jsx` R1.5 query updated for new DOM shape (`button > span` traversal post-Button-migration); 8 tests passing.
- Story 59 closed: removed unused `tokens` import from `frontend/src/components/PlayerHandBadge.jsx` — auto-merge artifact from PR #64's web-editor conflict resolution.
- Token coverage gaps surfaced in EmptyState title styling (15px font size + #374151 text color used via raw passthroughs) — filed as Story 60 for future R-track patch.
- Validates Phase 2 primitive contract in second consumer (after Phase 3 Step 1's PlayerHandBadge → Badge in v2.5.10).

### UX track documentation catchup (PR #69)

- `docs/product/UX_REFACTOR_ROADMAP.md` Status header + §8 Done-So-Far Ledger + §9 Active Backlog updated to reflect Phase 2 + Phase 3 Step 1 + Phase 3 Step 2 ship status (previously 3 phases stale).
- `CLAUDE.md` Active Tracks → UX entry refreshed.
- `docs/product/ROADMAP.md` Story 59 marked Resolved; Story 60 (token coverage gaps) filed; Theme System Phase 3 header disambiguated from UX Refactor track's Phase 3 via inline blockquote note.

### Release mechanics

- Build: `npm run build` clean (520 modules transformed, same as Slice 4 baseline; PR #68 + #69 added no new modules).
- Tests: 644 passing + 1 skipped on develop @ `2b66710` (suite shifted from 658 post-v2.5.10 due to Slice 4's ViewerMode.test.jsx deletion; PR #68 + #69 net 0 test count change). 3 worker-spawn timeouts during local full-suite runs on Windows are the documented Known Bug #7 (Windows Vitest cold-start cascade — environmental, not code); CI on Linux confirms full GREEN.
- Version bump path: 2.5.10 → 2.5.11 (patch — internal foundation work, not a milestone; v2.6.0 reserved for share/print fix + snack_duty drop + other P0s).

---

## v2.5.10 — 2026-05-08 (feature/phase-2-primitives) — Phase 2: UI primitives foundation
No user-visible changes. Foundation for incremental migration of inline-styled components to shared primitives.
- `frontend/src/components/ui/` — added 5 primitives: `Badge.jsx`, `Button.jsx`, `Card.jsx`, `Stack.jsx`, `Text.jsx`
- `frontend/src/components/ui/` — added 5 corresponding test files: `Badge.test.jsx`, `Button.test.jsx`, `Card.test.jsx`, `Stack.test.jsx`, `Text.test.jsx` (107 new component tests)
- `frontend/src/components/GameDay/LockFlow.jsx` — removed dead duplicate `fontSize:"13px"` declaration in lock-confirmation header (second `fontSize:"10px"` was already winning, no visual change)
- PR #62 (Phase 3 Step 1: PlayerHandBadge.jsx migrated to Badge primitive — first consumer of the new primitives) already shipped in `b2cc6b5` on develop; promoted to main as part of this release.
---

## v2.5.9 — 2026-05-07 (feature/slice-3-flag-flip) — Slice 3: DUGOUT VIEW default-on

User-visible: DUGOUT VIEW is now the default game-day experience. Separate Scoring tab retired.

- `featureFlags.js` — `COMBINED_GAMEMODE_AND_SCORING: false` → `true` (GA default-on)
- `App.jsx` — removed `import ScoringMode`; removed `import { ViewerMode }`; removed `combinedGamemodeAndScoringEnabled` runtime var; removed Scoring tab from `PRIMARY_TABS`; replaced GAME MODE + conditional DUGOUT VIEW in `GAMEDAY_SUBTABS` with single DUGOUT VIEW launcher; removed ScoringMode render block; simplified viewer share-link paths to always route to `DugoutView isViewer={true}`
- Story 49 (flag key normalization) deferred — `combinedGamemodeAndScoringEnabled` runtime var removed, so the colon vs. underscore inconsistency is moot for this flag; other flags not touched
- Slice 4 logged below: ScoringMode component directory + ViewerMode component deletion

---

## v2.5.8 — 2026-05-07 (feature/story-41-threads-pool) — Infrastructure stability

No user-visible changes.

- `frontend/vite.config.js` — switched `pool: 'forks'` → `pool: 'threads'`. Cox Defender endpoint security blocked child_process.fork IPC handshake in git hook context. worker_threads are intra-process and unaffected. Pre-push test gate now functions without `--no-verify`. Story 41 resolved.
- `CLAUDE.md` — updated infrastructure note; removed Windows Vitest cold-start OOM section (no longer applicable).
- `ROADMAP.md` — Story 41 marked resolved in P1 table.
- Stories 45 + 53 (pre-push hook stdin fix + Husky shebang cleanup) already shipped in `487377c` on develop; promoted to main as part of this release.

---

## v2.5.7 — 2026-05-04 (feature/slice-2-combined-view) — Slice 2: combined view layout

Shipped behind COMBINED_GAMEMODE_AND_SCORING flag (default OFF). No user-visible change in production.

- `DugoutView.jsx` — DefenseDiamond lifted into body; dugoutFocusMode state machine (`'lineup'` when `currentAtBat===null`, `'scoring'` otherwise); both panels stay mounted via CSS `display:none` toggle; flex-column shell layout fills 100vh for 375px fix
- `ScoreboardRow.jsx` — added optional `inning` (0-indexed) + `halfInning` props; renders "Top 3rd / Bot 5th" indicator; backward-compat when omitted
- `LiveScoringPanel.jsx` — `data-testid="pitch-map"` added to pitch chips container
- `App.jsx` — DugoutView mount site: `grid={grid}` prop added
- Bug 8 resolved: `BattingOrderStrip` reads `gameState.battingOrderIndex` when flag ON (was always reading App prop)
- Bugs 9/10 resolved: flex-column layout with `overflow-y:auto` body eliminates 375px vertical clipping
- Story 46 (combined view layout shell) resolved
- Story 48 filed: defense view inning auto-sync to scoring inning (backlog, v2.6.x)
- Story 49 filed: feature flag key scheme normalization (backlog, v2.6.x)
- Story 51 filed: document flag enabling pattern in feature-flags.md (backlog, v2.6.x)
- Test additions: +11 tests (dugoutFocusMode state machine ×3, ScoreboardRow inning ×3, Bug 8 regression ×2, 375px viewport ×3); suite 499 → 510 / 1 skipped
- New test file: `DugoutView.viewport.test.jsx` establishes 375px viewport test pattern for the suite

---

## v2.5.6 — 2026-05-03 (develop staged; awaiting prod merge) — UX Track Phase 1a

Shipped:
- ACCESSIBILITY_V1 feature flag promoted to GA (default-on)
- Component a11y fixes F1-F7 (DefenseDiamond, OfflineIndicator, NowBattingStrip, LockFlow)
- Design tokens scaffolding (theme/tokens.js, theme/index.js barrel export, DESIGN_AUDIT.md)
- ESLint pipeline restoration + LINT_BASELINE.md (144 problems documented, 21 FIX-NOW resolved)
- 39 new tests (11 a11y-fixes + 27 tokens + 1 accessibility.v1 GA group); suite 452→491

For full UX track planning detail, see `docs/product/UX_REFACTOR_ROADMAP.md`.

---

## v2.5.5 — 2026-05-02 (develop staged; awaiting prod merge)

Slice 1 of combined game view. No user-facing changes — COMBINED_GAMEMODE_AND_SCORING flag defaults OFF in production.

- `BattingOrderStrip/index.jsx` (new) — read-only batting order display component (Now Batting / On Deck / In Hole / +N more badge); mirrors NowBattingBar visual language without navigation controls
- `DugoutView.jsx` — integrated BattingOrderStrip: renders below ScoringModeEntry (entry state) and above LiveScoringPanel (active scoring state); accepts new `currentBatterIndex` prop
- `App.jsx` — added `currentBatterIndex` to DugoutView call site prop spread
- `BattingOrderStrip.test.jsx` (new, 6 tests), `DugoutView.test.jsx` (new, 5 tests), `ScoreboardRow.test.jsx` (new, 4 tests — resolves D017)
- Test suite: 437 → 452 passing

## v2.5.4 — 2026-05-01 (develop staged; awaiting prod merge)

Slice 0 of combined game view. No user-facing changes — COMBINED_GAMEMODE_AND_SCORING flag defaults OFF in production.

- `DugoutView.jsx` — full rewrite: lifted ScoringMode state, hook, and handlers; renders under `COMBINED_GAMEMODE_AND_SCORING` flag
- `App.jsx` — 4 targeted changes: `PRIMARY_TABS` hides Scoring tab when flag ON; `GAMEDAY_SUBTABS` hides DUGOUT VIEW pill when flag OFF; ScoringMode render branch gated on flag OFF; DugoutView call site wired with 5 new props
- `ScoreboardRow.jsx` (new) — extracted scoring row primitive from LiveScoringPanel
- `useLiveScoring.js` — Story 20 refactor: `flipHalfInning()` helper extracted; `resolveAtBat`, `endHalfInning`, `recordOppPitch` (strikeout + direct-out paths), `confirmRunnerAdvancement` all consolidated onto helper
- `featureFlags.js` — `COMBINED_GAMEMODE_AND_SCORING: false` added
- Story 61 (P0) opened: share-link viewer routing broken in prod (pre-existing, separate hotfix)
- Stories 40–44 captured in backlog (pre-push hook, Defender fork-spawn, branch protection posture)

## v2.5.3 — 2026-04-28 (shipped to prod 2026-04-28)

Meta-governance patch. No user-facing changes.

- `VERSION_HISTORY` extracted to `frontend/src/data/versionHistory.js` (same pattern as `migrations.js`, `formatters.js`, `flagBootstrap.js`)
- New test: `frontend/src/__tests__/versionHistory.test.js` — 3 tests, enforces all `techNote` values are in the approved set
- 24 historical `techNote` strings corrected (v2.1.x–v2.4.0) to use the approved set
- Named `### UPDATES TAB CONTENT RULE` heading added to `CLAUDE.md` for grep auditability
- `versionHistory.js` added to extracted-modules list in `CLAUDE.md`; non-approved `'Meta-governance release.'` techNote example in deploy checklist replaced with approved string
- `.husky/pre-push` updated with branch guard blocking direct push to `develop`/`main`; `ALLOW_DIRECT_PUSH=1` escape for declared hotfixes (Story 37 — Resolved).
- `.husky/pre-push` retry removed — was duplicated `|| npm test` masking first-run failures (Story 32 — Resolved).
- `CLAUDE.md` corrected: `/magic-link` rate limiter is active and was never removed in v2.3.3 (Story 35 — Resolved).
- `backend/scripts/tests/suite-rate-limits.js`: RATE-01b comment corrected to reflect actual code state.

## v2.5.2 — 2026-04-28 (shipped to prod 2026-04-28)

Game Mode polish release + VERSION_HISTORY content governance patch:

**VERSION_HISTORY governance patch (this session)**
- `VERSION_HISTORY` extracted to `src/data/versionHistory.js` (mirrors `migrations.js`, `formatters.js`, `flagBootstrap.js` pattern)
- New test: `frontend/src/__tests__/versionHistory.test.js` — enforces all `techNote` strings are one of the four approved values
- 24 non-approved `techNote` strings corrected across VERSION_HISTORY (v2.4.0, v2.3.4, and 22 older entries that pre-dated the rule)
- Named `### UPDATES TAB CONTENT RULE` heading added to CLAUDE.md — grep-auditable

**Game Mode polish release covering three themes:**

Game Mode polish release covering three themes:

**Count strip overhaul**
- Two scope-grouped pills separate count (BALLS / STRIKES) from outs
- Stacked label-above-value cells: INNING / BALLS / STRIKES / OUTS — full label parity
- Outs pill uses warm tint (#FF8C42) to signal half-inning advancement
- Single render surface: top pill binds dynamically to active batter via `isHomeBatting`
- Removed legacy bottom opponent count strip (eliminated duplicate render surface)

**Toast primitive + half-inning notification**
- New Toast UI primitive: top-anchored, dismissable, auto-clearing
- Half-inning notifications migrated to Toast — appear at top, one-tap dismiss

**Mercy banner symmetry**
- Banner now renders symmetrically for both home and opponent halves

## v2.5.1 — 2026-04-27 (prod ship; develop merge 2026-04-24)
- ACCESSIBILITY_V1 follow-up + UX consolidation + v2.4.0 home/away preservation.
- `truncateTeamName()` upgraded: word-boundary-aware abbreviation ("Timber Rattlers" → "T. Rattlers"), unicode ellipsis for single-word overflow, default cap 12.
- `GameContextHeader` component removed; game number relocated as inline `Game N` chip in all 3 scoring header strips (conditional — hidden in practice/orphan games).
- New: `HomeAwayChip` component — amber `@ Away` chip for away games, neutral `Home` chip for home games; rendered adjacent to `Game N` chip at all 3 render sites. Guard: `typeof selectedGame.home === 'boolean'`.
- STATE 1 splash subtitle: home/away connector restored (was hardcoded `vs`; now `@ teamName` for away games); contrast: 12px `#64748b` → 14px `#cbd5e1` (12.21:1 ratio, AA+).
- `ScoreboardRow` typography: team labels 10px → 16px, `#aaa` → `#e2e8f0`, weight 700; gold `borderTop` accent added.
- `ScoreboardRow` overflow guardrail: cap=10 for label props, `minWidth:0` + `overflow:hidden` on container.
- `deriveGameHeader()`: `connector` and `homeIndicator` fields marked deprecated in JSDoc — no longer consumed in production after `GameContextHeader` removal.
- Tests: `opponentNameLabel.test.js` and `gameHeader.test.js` updated to new word-boundary expectations; 2 net new tests; suite 419 → 421.

## v2.5.0 — 2026-04-24
- Feature: Scoring outcome sheet semantic cleanup — gated behind SCORING_SHEET_V2 flag (default true).
- Strikeout button removed from at-bat outcomes — 3 Strike pitch buttons handle K automatically.
- Foul moved to dedicated PITCH OUTCOME section in outcome sheet with its own header.
- Out @ 1st and Flyout promoted to 2-button top row in AT-BAT OUTCOME section.
- Home Run preserved as full-width row (unchanged).
- Opp-half +1 Run buttons hidden (replaced by ScoreboardRow +1 chips from v2.4.0).
- New: SCORING_SHEET_V2 feature flag in featureFlags.js (default true); flag-off path preserves original OUTCOME_ROWS unchanged for rollback.
- New: OUTCOME_ROWS_V2 exported from LiveScoringPanel.jsx.
- Tests: scoringSheetV2.test.js (8 tests); suite 411 → 419.
- Story 29 resolved. Story 30 logged (isFlagEnabled DB-read refactor, deferred).

## v2.4.0 — 2026-04-24
- Feature: Game context header at top of scoring (STATE 1/2/3) —
  "GAME N · {MY TEAM} vs/@ {OPP} 🏠" format; home "vs" + 🏠, away "@";
  hidden in practice; truncates long names (10+"..").
- Feature: Scoreboard extracted to dedicated ScoreboardRow with per-team +1 buttons
  (addManualRun calls directly). Global +1 button and "Add run for which
  team?" modal removed.
- Feature: Home team name replaces "Us"/"US" throughout scoring;
  teamShort consolidated onto truncateTeamName.
- Util: deriveGameHeader(input) — pure function, null fallback.
- Tests: gameHeader.test.js (10 tests); suite 401 → 411.
- Stories 27 and 28 resolved.

## v2.3.4 — 2026-04-24
- Feature: Opponent team name shown throughout scoring — BATTING header + team
  name primary (e.g. "Bananas #1"), "+1 {Team} Run" button, {TEAM} scoreboard
  label replace generic "Opponent"/"OPP"/"Player #N".
- Util: truncateTeamName(name, max=12) — 10+".." truncation when >12; "Team"
  fallback on null/empty/non-string.
- Tests: opponentNameLabel.test.js (6 tests).

## v2.3.3 — 2026-04-23
- Fix: Runner placement broken since v2.3.2 — roster entries have no .id field; player ID now falls back to name throughout scoring state, resolving runner placement, run scoring, and diamond display
- Fix: Runner-on-3rd marked Out now increments outs counter and triggers half-inning flip correctly
- Fix: Runner pills anchored to base coordinates on DiamondSVG (absolute positioning); no longer rendered as a floating row below the diamond
- Fix: Diamond centered horizontally and vertically; Section 6 layout uses flex:1 + flex-column to eliminate dead space and 2B label collision with pitch info
- Feature: Practice mode — full scoring session with no Supabase writes; claimScorerLock sets isScorer locally; heartbeat suppressed; Realtime subscription skipped
- Fix: Realtime race condition — lastAppliedAtRef + updated_at timestamp guard rejects stale and echo events (<=); stamped async-after-success in persist() and claimScorerLock() seed upsert
- Fix: Opponent batter card unified with home-team card (gold border, OPPONENT BATTER header, Player #N primary, Pitches: X of 5); duplicate label removed from fixed pitch bar
- Tests: 354 → 395 passing (3 new files: realtimeRaceGuard.test.js, practiceModeIsolation.test.js, liveStateMerge additions)

## v2.3.2 — 2026-04-21
- Feature: Opposing pitcher pitch counts — per-batter, per-inning, per-game counters in opponent half; opponent batter number (#1–#11); color-coded pitch buttons (Ball blue, Strike red, Foul amber, Out grey, Contact green); Foul counts as pitch not strike; inning totals reset on half-flip, game total persists across innings. Schema: 6 new columns on live_game_state (opp_balls, opp_strikes, opp_current_batter_number, opp_current_batter_pitches, opp_inning_pitches, opp_game_pitches). EXPECTED_LGS_KEYS expanded 15→21; 6 new contract tests; suite: 377 passing.

## v2.3.1 — 2026-04-21
- Fix: Runner duplication — `advanceRunners()` helper uses base-map (back-to-front 3B→1B) guaranteeing no player ID occupies two bases after any hit
- Feature: Runner conflict prompt — when two runners would land on the same base, `RunnerConflictModal` presents three choices: Score blocking runner / Hold incoming runner / Cancel play (restores pre-play state via snapshot)
- Fix: `confirmRunnerAdvancement()` detects base collision and surfaces `runnerConflict` state instead of silently auto-scoring the pending runner
- Fix: Exit Scoring moved from header ← into gear menu (neutral styling); header ← now pauses (lock retained)
- Tests: 10 tests in `runnerAdvancement.test.js` — advanceRunners (1-5), conflict detection (6), SCORE_BLOCKING (7), HOLD_INCOMING (8), CANCEL_PLAY (9), analytics spy (10); jsdom `matchMedia` stub added via `setupFiles`

## v2.3.0 — 2026-04-21
- Feature: Game Mode action clarity + schedule finalization — X (pause) keeps scorer lock; gear menu with Hand off / Finish Game; FinishGameModal with score preview; endGame() writes final score to team_data.schedule before releasing lock; undoHalfInning + 10s undo toast; MERGE_FIELDS extended (usScore, oppScore, gameStatus, finalizedAt); 13 new tests (finalizeSchedule, undoHalfInning, newGameTemplate regression guard)

## v2.2.45 — 2026-04-21
- Feature: Live scoring — full game tracking with opponent half; track opponent B/S/O count; 5-run mercy banner for both teams; End Inning / End Game buttons; "We bat: Top/Bottom" toggle at game start; runner names on diamond; debug logs removed

## v2.2.44 — 2026-04-20
- Fix: Scoring pitch buttons (Ball/Strike/K/Foul/Contact) now position:fixed at bottom:60px — always visible regardless of content height; paddingBottom:160px on outer container prevents overlap

## v2.2.43 — 2026-04-20
- Fix: Scoring screen layout — explicit flex spacer replaces marginTop:auto; dead space eliminated
- Fix: Empty batting order state — clearer two-line message directing coach to Game Day → Lineups
- Fix: Restore Scorebook UUID error — `p_actor_id` now passes null for local-xxx IDs to satisfy Postgres uuid type on `restore_game_state` RPC

## v2.2.42 — 2026-04-20
- Fix: Scoring screen dead space removed — diamond section reverted to flexShrink:0; pitch buttons marginTop:auto pins to bottom
- Fix: Absent players excluded from batting order in scoring — ScoringMode now receives `activeBattingOrder` instead of `battingOrder`

## v2.2.41 — 2026-04-20
- Fix: Live scoring pitch buttons (Ball/Strike/K/Foul/Contact) now always visible without scrolling — outer container locked to `height:100vh + overflow:hidden`; diamond section absorbs slack via `flex:1`; pitch bar pinned at bottom with 72px nav clearance

## v2.2.40 — 2026-04-20
- Fix: Live scoring "Loading rules..." hang — `team` prop now wired from ScoringMode → useLiveScoring so `getRulesForTeam()` receives the team object and resolves pitchUIConfig on first render

## v2.2.39 — 2026-04-17
- Debt: logged FEATURE_MAP.md structural and content gaps for v2.2.40 repair (prerequisite for Backlog Adjacency System)

## v2.2.38 — 2026-04-17 — Drift repair: FAQs, PERSONAS, SOLUTION_DESIGN, debt ledger
- Docs: FAQs — Scorekeeper category added (3 items); head-coach Out Tonight + Game Ball answers added; dj-parent Spotify deep-link FAQ added; install banner + account answers updated
- Docs: PERSONAS.md rewritten — 8 personas (Head Coach, Assistant Coach, Parent, Scorer, DJ Parent, Admin, Viewer, Child Player) with Phase 2 auth notes
- Docs: SOLUTION_DESIGN.md — Live Scoring Framework section added (Tier 1/2/3 breakdown, scorer lock rationale); CI/CD Pipeline section added (branch strategy, GitHub Actions, Husky pre-push, smoke tests); Analytics Architecture section added (identity model, super properties, SSR guards); feature_flags table schema added to Feature Flag System; /health version bumped to v2.2.38; Known Tradeoffs CI row corrected
- Governance: DOC_TEST_DEBT.md — Area field added to all 17 open items; 4 resolved SOLUTION_DESIGN doc gaps moved to Resolved; dashboard corrected (17 open: P0:2, P1:4, P2:11)
- Governance: FEATURE_MAP.md — Governance row (#19) added; D018 debt cleared from Feature Flag System; Coverage Summary updated to 19 features

## v2.2.37 — 2026-04-17
- Fix: Claim Scorer now works without login — scoringUserId falls back to stable localStorage-persisted local ID; never null
- Fix: isAdminTestMode permanently false; amber badge removed
- Fix: removed 4 null guards from useLiveScoring.js write sites

## v2.2.36 — 2026-04-17 — Governance activation: enhanced debt ledger, staging discipline, shell helpers
- Governance: `docs/product/DOC_TEST_DEBT.md` replaced with enhanced format — emoji priority markers (🔴/🟠/🟡), table-based items, Test/Doc/Process gap categories, Debt Summary Dashboard (20 items: 2 P0, 7 P1, 11 P2)
- Tooling: `scripts/debt-helpers.sh` and `scripts/debt-helpers.ps1` added — `debt`, `debt-all`, `debt-p0`, `debt-next`, `debt-dashboard` shell commands
- CLAUDE.md: Git Staging Discipline section added; debt-p0 minor-bump gate added to Ship Gate; CI target corrected to 306/1/0
- Repo: `.gitignore` hardened — `.vscode/` and `.idea/` added

## v2.2.35 — 2026-04-16 — Test suite: Groups 9-10 share payload + Out detection
- Test: attendance.test.js Group 9 — buildSharePayload (10 tests) — batting/roster/absentNames shape, copy-safety
- Test: attendance.test.js Group 10 — computeOutByInning (7 tests) — per-inning Out detection, Bench-not-Out, missing grid entry
- Total suite: 306 passed / 1 skipped / 0 failed

## v2.2.34 — 2026-04-16
- Fix: scoringUserId now falls back to session.user.id instead of hardcoded admin-coach-mud-hens string
- Fix: null guards added to all 4 Supabase write sites in useLiveScoring.js (audit, startHeartbeat, claimScorerLock, releaseScorerLock)

## v2.2.33 — 2026-04-16 — Meta-governance: Feature Map, Debt Ledger, Ship Gate
- Added `docs/product/FEATURE_MAP.md` — authoritative feature-to-doc-to-test mapping (18 feature rows)
- Added `docs/product/DOC_TEST_DEBT.md` — debt ledger with 21 known gaps (2 P0, 8 P1, 11 P2)
- CLAUDE.md: Ship Gate four-question ritual, Audit Cadence, Feature Map Update Rules, 8-step Session Start Command, STEP 0 Ship Gate in Deploy Checklist
- MASTER_DEV_REFERENCE.md: 8-step Session Start Command, updated Document Governance table
- `.claude/settings.local.json` files untracked (already in .gitignore); v2.2.31 scope creep root cause documented

## v2.2.31 — 2026-04-16 — Docs-only: FAQ, Personas, Solution Design drift repaired
- FAQ: added Attendance and multi-player Game Ball answers (Head Coach category)
- FAQ: updated walk-up song location FAQ; added Spotify deep-link FAQ (DJ Parent category)
- FAQ: new Scorekeeper category (3 FAQs — Live Scoring, scorer role lock, inning correction)
- FAQ: updated install banner FAQ and Google sign-in FAQ (Setup & Sharing category)
- PERSONAS.md: rewritten to 8 personas — added Dugout Parent, DJ Parent, Catcher Parent, Base Coach; Live Scoring and Admin Dashboard flipped to MVP; Auth Required updated to Phase 2
- SOLUTION_DESIGN.md: Auth Architecture section rewritten (Phase 3 → Phase 2, all [Twilio removed] tags cleaned); /health example updated (v2.2.31, db fields added); App.jsx line count updated to ~9,834; utils/ and components/ trees expanded; navigation table updated; Walk-up Songs Architecture subsection added

## v2.2.30 — 2026-04-16
- Fix: Out-tonight players now visible with red indicator across all 11 surfaces — diamond SVG, defense grid, Game Mode strip, share link diamond/table/batting, PDF bench/grid/batting card

## v2.2.29 — 2026-04-16
- Feat: liveScoringEnabled overridden to true for Mud Hens and Demo All-Stars by team name; all other teams still require live_scoring feature flag

## v2.2.28 — 2026-04-16
- Fix: Boot team merge changed from local-wins-entirely to additive — Supabase teams whose ID is not in localStorage are appended; zero impact when no new teams exist
- Fix: String() cast on team IDs prevents bigint vs string mismatch during boot merge comparison

## v2.2.26 — 2026-04-16
- Feat: playerMapper.js V1→V2 skill shim — skills[]/batSkills[] arrays now inferred as V2 enum fields (reliability, reaction, armStrength, speed, contact, power, swingDiscipline)
- UX: gameBall edit removed from inline schedule card; moved into game Edit modal with search filter + multiselect pills
- UX: gameBall displays as read-only 🏆 label on schedule card

## v2.2.25 — 2026-04-16
- Feat: Game Ball award supports multiple players — gameBall migrated from string to array; normalizeGameBall() coerces legacy data on read
- UX: Team tab renamed to My Team in bottom nav

## v2.2.24 — 2026-04-16
- UX: Game Day restructured — Lineups tab is now the default view with Tonight's Attendance above Defense/Batting sub-tabs
- Fix: QuickSwap in Game Mode now excludes absent players from swap candidate list; absentTonight threaded App.jsx → GameModeScreen → QuickSwap

## v2.2.23 — 2026-04-16
- Fix: validateGrid skips "Out" slots — no false warnings for absent players
- Fix: todayDate switched from UTC to local calendar date to fix attendance key mismatch during evening games

## v2.2.22 — 2026-04-15 (HOTFIX)
- Hotfix: auth gate re-commented out — was inadvertently blocking all unauthenticated users in prod
- useAuth hook, LoginScreen, RequestAccessScreen, PendingApprovalScreen imports preserved for Phase 4C cutover

## v2.2.21 — 2026-04-15
- Feat: activeBattingOrder — absent players filtered from batting order across PDF, share links, print, songs, game mode, Now Batting strip
- SharedView: player filter pills exclude absent names; absent note in batting footer
- Feat (v2.2.19): Game Day Attendance panel — mark players out before lineup gen, persisted to Supabase attendance_overrides column
- Fix: PendingApprovalScreen "Try logging in" now correctly transitions auth state
- Fix: supabase.js attendance_overrides support in dbSaveTeamData/dbLoadTeamData

---

## v2.2.18 — 2026-04-06
- Fix: MERGE_FIELDS extracted to single shared const (was duplicated at boot hydration and loadTeam hydration)
- Fix: division migration block now saves mergeLocalScheduleFields result instead of raw seed — gameBall/snackDuty/scoreReported no longer overwritten on migration run
- Fix: boot hydration now merges DB + local schedules instead of preferring local blindly — new Supabase games no longer silently dropped
- Feat: loginLimiter (15min window, max 5) created and applied to POST /magic-link — express-rate-limit was imported but never instantiated

---

## v2.2.17 — 2026-04-06
- Docs: legal content refresh — removed stale phone OTP references, updated auth to email magic link + Google sign-in, fixed phantom email reference, updated all legal doc dates to April 2026

---

## v2.2.16 — 2026-04-05
- Analytics: full PWA install funnel — pwa_banner_shown (platform, prompt_ready, browser), pwa_install_clicked, pwa_install_accepted, pwa_install_declined, pwa_installed with platform property

---

## v2.2.15 — 2026-04-05
- Feat: persistent PWA install banner — fixed above bottom nav on all tabs, Android install button or Chrome instructions, iOS Share → Add to Home Screen, no dismiss/snooze
- Fix: overscroll-behavior: none on html + body — prevents pull-to-refresh bounce (Android) and rubber-band scroll (iOS)

---

## v2.2.14 — 2026-04-05
- UTM tracking framework (trackingUrl.js) — auto-detects pwa vs web for utm_medium; CAMPAIGNS + CONTENT registries
- Migrated all 7 LINKS array outbound links to outboundLinkProps (utm_source=dugoutlineup on every click)
- Click-side outbound_click event captured before navigation — attribution decoupled from destination redirect behavior
- 17-test Vitest suite for trackingUrl utility (co-located in src/utils/)
- vite.config.js include widened to src/**/*.test.js for co-located test files

---

## v2.2.6 — 2026-04-04
- Analytics: device context super properties (os, device_type, platform, is_pwa, screen_width, screen_height, app_version) registered via mixpanel.register()
- Analytics: PWA install events (pwa_install_prompted, pwa_installed); super property override on install
- Analytics: first launch detection (is_first_launch on app_opened; first_launch event)
- Analytics: VITE_APP_VERSION wired as build-time env var
- Docs: docs/analytics/ANALYTICS.md — full event reference, identity model, dashboard configs

---

## v2.2.5 — 2026-04-04
- Analytics: 15 new Mixpanel events — Game Mode, QuickSwap, share link, auth funnel, batting hand, game result, app open, Mixpanel identity on team load
- Analytics: Vercel Analytics screen events (app_loaded, game_mode_entered, share_link_viewed, lineup_finalized)
- Analytics: track() + mixpanel init extracted to src/utils/analytics.js; imported in 6 files

---

## v2.2.4 — 2026-04-03
- Ops: activated Mixpanel analytics — wired VITE_MIXPANEL_TOKEN env var; 14 existing track() call sites now live in production

---

## v2.2.3 — 2026-04-03
- Feat: personalized home screen greeting uses coach first name from user.profile; falls back to "Coach" for guests/unauthenticated
- Fix: time bands corrected — Good night covers 9pm–5am; Good morning now starts at 5am (was midnight)

---

## v2.2.2 — 2026-04-03
- Fix: newGame template initializer and both setNewGame reset calls now include gameBall:"" and scoreReported:false
- Fix: non-active team boot hydration applies migrateSchedule + mergeLocalScheduleFields before writing to localStorage
- Fix: Mud Hens migration patch preserves snackDuty, gameBall, scoreReported from existing game entries

---

## v2.2.1 — 2026-04-03
- Ops: develop branch created with GitHub branch protection rules
- Ops: Render DEV service + dev.dugoutlineup.com environment planned
- Ops: backend envGuard middleware — rejectTestDataInProd checks TEST_TEAM_IDS; 403 in prod, console.warn in dev for real team IDs
- Ops: ci.yml triggers on both main and develop branches

---

## v2.2.0 — 2026-04-03
- Chore: test suite cleanup — deleted 7 stale OTP tests; fixed VAL-07 XSS; split RATE-01a/b; updated AUD-02/03 skip reasons
- Chore: suite-idempotency.js — upfront seed block, seedFailed guard, no inter-test dependency chain
- Chore: suite-auth-middleware.js added (AUTH-MW-01–08) — 8 protected endpoint rejection tests
- Chore: scoring.test.js Group 1 parameterized (7 bundled → 28 individual forEach tests)
- Chore: lineupEngineV2-unit.test.js added (30 tests: Groups A–E — output shape, field assignment, bench logic, batting order, edge cases)
- Chore: frontend test suite 205 total (204 passed / 1 skipped) across 8 files
- Ops: ci.yml — frontend build step added before Vitest so compile errors block CI gate
- Ops: /health — async DB connectivity check via Supabase teams read; db:ok/error + db_latency_ms; returns 503 on DB failure
- Ops: health-check.yml — new 6-hour GitHub Actions cron: /health db:ok, share link smoke (HEALTH_SHARE_KEY), /generate-lineup shape
- Docs: MASTER_DEV_REFERENCE.md — UptimeRobot gap documented, health-check.yml referenced

---

## v2.1.9 — 2026-04-03
- Fix: admin magic link redirectTo /admin.html
- Fix: Add Result button invisible on game day (gameDate <= today)

---

## v2.1.8 — 2026-04-03
- Chore: suite-team-data.js (7 tests), suite-feedback.js (6 tests), suite-contracts.js (7 tests)
- Chore: GitHub Actions ci.yml — push-to-main gate (Vitest + backend CI_SAFE mode against Render prod)
- Chore: GitHub Actions health.yml — cron every other day 7am ET, /ping + frontend load + job summary

---

## v2.1.7 — 2026-04-03
- Fix: admin approve route writes email + user_id to team_memberships (phone_e164 null)
- Fix: admin members endpoint returns email and user_id fields
- Fix: all four admin email notifications (approve/deny links + approve/reject API) look up team name from DB

---

## v2.1.6 — 2026-04-02
- Fix: Rules of Hooks violation — extracted renderSharedView into proper SharedView component
- Fix: non-active team card hydration — eager Supabase fetch on boot, warm localStorage skip, skeleton state while pending

---

## v2.1.5 — 2026-04-02
- Feat: Supabase runtime feature flags (007 migration)
- Feat: maintenance mode + coach bypass (?coach_access=mudhen2026)
- Feat: VIEWER_MODE, GAME_MODE, ACCESSIBILITY_V1 all toggle from Supabase dashboard instantly — no deploy needed
- Chore: all legacy line-up-generator.vercel.app URLs replaced with dugoutlineup.com

---

## v2.1.4 — 2026-04-02
- 154 frontend tests across 7 files (migration, scoring, formatters, flag bootstrap, bench equity)
- Extracted migrations.js, formatters.js, flagBootstrap.js utilities from App.jsx
- Husky pre-push hook: test suite runs before every push; failing tests block the push

---

## v2.1.3 — 2026-04-02
- Rebrand: all customer-facing surfaces renamed from Lineup Generator to Dugout Lineup (PWA manifest, index.html, login/access screens, legal docs, admin UI, About tab, PDF header, share text, install banner)

---

## v2.1.2 — 2026-04-02
- Fix: bottom nav fixed to viewport on mobile
- Fix: bottom nav and Now Batting bar hidden during Game Mode

---

## v2.1.0 — Phase 4B: Email OTP Auth (2026-04-01)
### Shipped
- Email OTP authentication via Supabase + Resend
- Access request pipeline (submit → admin notified → 1-tap approve → user notified)
- auth_events audit table with full device context on every auth action
- Migrations 008-012: email columns, role expansion, partial unique indexes
- Backend test suite: 60 tests across 9 categories
- Approve/deny link security TODO documented (Phase 5 item)
- PORT env var fix, DEFAULT_TEAM_ID fix, debug log cleanup

### Outstanding (Phase 4C)
- Frontend auth screens (LoginScreen, RequestAccessScreen, AuthGate)
- requireAuth gate activation on protected routes
- RLS enforcement (004_rls_fixes.sql — parked until frontend auth complete)
- Auth: email magic-link + Google OAuth (Twilio removed)

---

## ✅ MVP — Launched 3/24

### Core Engine
- 11-constraint auto-assign scoring engine with retry fallback
- Manual cell edits with issue detection + Auto-Fix All
- Schema versioning + migration runner (v1→current)
- Hard blocks: back-to-back, outfield repeat, benchOnce enforcement

### Roster Tab
- Player cards with V2 scoring attributes (Fielding, Batting, Running, Constraints) ✅
- Preferred / avoid positions per player
- Add/remove player with confirmation
- Innings selector (4/5/6)

### Field Grid Tab
- Full defensive grid with auto-assign + manual overrides
- Per-inning coverage summary

### Batting Tab
- Suggest Order (stats-driven)
- Desktop drag-to-reorder
- Season stats table (AB, H, R, RBI, AVG with color coding)

### Schedule Tab
- AI schedule import — photo, paste/text, manual, bulk
- Game result logging (score + per-player batting stats)
- Parse batting scorecard from photo or text dump
- View-only share link (URL-encoded snapshot)

### Print / PDF
- Toggle: Both / Defense Only / Batting Only
- PDF bundled via npm (jsPDF — no CDN dependency)
- Diamond view, grid, and batting order

### Infrastructure
- Supabase backend (primary data store)
- Render backend for AI parsing
- UptimeRobot ping to keep Render warm (5-minute interval)
- Vercel frontend deploy with CI/CD
- PWA — installable on iOS + Android, offline-capable after first visit
- Export / Import backup (JSON)
- 10-player field configuration: LC + RC replace CF in outfield; 1 bench slot per inning (schema v2, migration auto-remaps saved CF→LC)
- First-time coach onboarding modal (5-step in-app walkthrough, localStorage completion tracking, always re-accessible via "Getting Started" button in Roster tab)

### v2.0.5 — March 31, 2026
- **Fix: home screen team card** — Complete Roster badge no longer truncated; text wraps within grid-constrained column

### v2.0.4 — March 31, 2026
- **Fix: home screen team card** — top row converted to CSS grid (`1fr auto auto`); Open button and ellipsis get fixed width, Zone 1 strictly constrained — badges can no longer bleed into Open button on any screen size

### v2.0.3 — March 31, 2026
- **Fix: home screen team card** — Open button no longer bleeds into status badge; top row uses `flex-start` alignment
- **UX: rename** — "Game View Mode" → "Game Mode" on Next Game CTA card; consistent naming across all screens

### v2.0.2 — March 31, 2026
- **Fix: home screen team card** — Game Mode button moved to its own full-width row below the top row (team info + Open + menu); no longer bleeds into READY badge on narrow screens (iPhone SE / 375px)

### v2.0.1 — March 31, 2026
- **Fix: home screen team card** — Game Mode button no longer overlaps READY badge; card `alignItems` changed from `center` to `flex-start` so all three zones (team info, buttons, menu) anchor to the top

### v2.0.0 — March 31, 2026
- **Fix: mobile browser layout** — App shell uses `100svh` (small viewport height) in non-standalone mode; bottom nav no longer clipped by Edge/Safari mobile address bar
- **Fix: bottom nav padding** — Extra buffer applied in browser mode to prevent toolbar overlap
- Installed PWA unaffected — continues to use `100dvh` in standalone mode

### v1.9.9 — March 31, 2026
- **Game Mode icons**: Baseball bat (GiBaseballBat via react-icons) replaces ⚾ for all batting indicators — BATTING tab, What's Next card label, Start Batting button
- **Sport-aware fielding icon**: DEFENSE tab, What's Next fielding card + Take the Field button now show GiBaseballGlove for baseball teams and 🥎 for softball teams
- **App-wide sport awareness**: Game Ball label (Schedule tab) and Needs Attention dashboard card now use ⚾ vs 🥎 based on team sport
- **What's Next — player sort**: Field players and bench players in the fielding preview card are now sorted alphabetically by first name
- **Dependency**: react-icons added (GiBaseballBat, GiBaseballGlove from game-icons set)

### v1.9.8 — March 31, 2026
- **MyPlayer View**: renamed from Parent View; toggle moved to persistent Game Day subtab bar header; always visible across all Game Day subtabs

### v1.9.7 — March 31, 2026
- **Now Batting**: 36px bold, gold border, dominant visual treatment (ACCESSIBILITY_V1)
- **Batting queue**: 3-tier size hierarchy — 36px / 22px / 17px, color-coded
- **Aria-live**: NowBattingStrip announces batter changes silently to screen readers
- **InningModal**: batting preview font tiers match NowBattingStrip
- **Position labels**: full name in aria-label throughout game-day view

### v1.9.6 — March 30, 2026
- **Support tab**: FAQ sub-tab — 6 role-based categories (Head Coach, Dugout Parent, DJ Parent, Catcher Parent, Base Coaches, Setup & Sharing); 36 real-field Q&As; accordion with category picker; answer panel uses distinct background for readability
- **Game Mode**: inning transition modal dynamically shows batting order (team just finished defense → now batting) or defensive positions (team just finished batting → now fielding); gold/green color themes per context; batting section shows lead-off, on deck, in hole with L/R badges and dugout cues
- **Game Mode**: half-completion gate — `End Defense →` / `End Batting →` button replaces `Next →` until both halves are marked done; pill shows green ✓ on each completed half; resets on inning advance
- **UX**: Graceful exit sheet when tapping Home tab or team logo while on Team or Game Day — slide-up bottom sheet shows team name, warns if lineup is dirty (`lineupDirty && !lineupLocked`), two actions: Keep Working (primary) or ← Go to Home Screen; tapping overlay dismisses
- **Fix**: Deleted teams no longer resurrected from Supabase on app reload — localStorage is authoritative when non-empty; Supabase only seeds an empty local store (new install / cleared storage)
- **Fix**: Duplicate Demo All-Stars teams — `Try Demo Team` button hidden when a demo team already exists; `loadDemoTeam()` guard opens existing demo instead of creating a duplicate

### v1.9.5 — March 30, 2026
- **Accessibility Phase 1** (`ACCESSIBILITY_V1` flag, localStorage override `flag_ACCESSIBILITY_V1=true`):
  - Font floor: section labels 12px min, advance/pill button text 13–14px min in Game Mode
  - Touch targets: advance button ≥44px (padding 13px), pill toggles wrapped in 44px hit area
  - Contrast uplift in InningModal (dark overlay): `#475569`→`#e2e8f0`, `#64748b`→`#cbd5e1`, `#334155`→`#94a3b8`
  - Aria labels: advance button (dynamic), defense/batting pill toggles (aria-pressed), modal (role=dialog), Cancel/Confirm buttons
  - Position abbreviation labels: `aria-label="Pitcher"` etc. on defensive position chips
  - Focus management: Confirm button focused on InningModal mount
  - **Full feature guide**: `docs/features/accessibility-v1.md`
- **Reduced motion**: `prefers-reduced-motion` media query in global CSS (`src/index.css`) — disables all animations/transitions when OS setting is active
- `isFlagEnabled(flagName)` utility exported from featureFlags.js with localStorage override support
- **Test coverage**: `src/tests/accessibility.v1.test.js` — 19 tests across 4 groups (POSITION_LABELS completeness, flag registry, isFlagEnabled defaults, localStorage overrides)

### v1.9.4 — March 30, 2026
- **UX**: Home screen — 'View/Update Lineup' button renamed to 'View Lineup'

### v1.9.3 — March 30, 2026
- **Create Team form**: labels darker and bolder, field text larger (14px) and near-black, borders more visible, placeholder shows example team name

### v1.9.2 — March 30, 2026
- **Game Mode**: now available for any team with roster + schedule set — no longer gated on having an upcoming game date
- **Demo All-Stars**: pre-seeded 12-player team loadable from home screen via "Try Demo Team" button — lets coaches explore all features without setup
- **Create Team form**: input fields now use white background with dark text for readability on the dark home screen

### v1.9.1 — March 30, 2026
- **Game Mode bench**: all bench players shown stacked in infield position box; batting hand badge visible on each bench card; duplicate bench strip removed
- **Batting strips**: `PlayerHandBadge` (L/R) shown inline in Now Batting, On Deck, In Hole pills — pulls from roster via `roster` prop on `NowBattingBar`
- **Game Ball**: Schedule tab Snack Note field replaced with Game Ball player picker (⚾); same field editable from Snacks tab with ✕ clear; persists via `gameBall` on game objects + `MERGE_FIELDS`
- **Snacks tab**: Note field removed; Game Ball row added below Snack Duty on every game card
- **Team tab / Roster**: redundant player count context bar removed (player count already in dashboard)
- **Fix**: `normalizeBattingHand` import error on Add Player resolved
- **Onboarding**: Steps 4 and 7 updated from "Season tab" to "Team tab" (nav restructure v1.8.0)

### v1.9.0 — March 30, 2026
- **Batting Hand attribute**: optional "L" / "R" capture per player; `normalizeBattingHand()` util normalizes all raw values; `migration 005` backfills existing roster; `PlayerHandBadge` inline badge component; displayed in roster list, batting order editor, Now Batting / On Deck / In Hole strips; `BattingHandSelector` toggle in Add Player form and player card Batting section

### v1.8.6 — March 30, 2026
- **TEAM tab dashboard**: stats row emoji icons (👥 Players · 🏆 Record · 📅 Next Game) with dividers; Next Game always visible; W/L record colors match Schedule tab; Needs attention box replaced with icon cards

### v1.8.5 — March 30, 2026
- **Home screen**: "View Lineup" renamed to "View/Update Lineup"; "Game View Mode" CTA added (always visible when lineup locked) — navigates directly to Game Mode

### v1.8.4 — March 30, 2026
- **PWA**: autoUpdate service worker — new versions apply immediately, no manual update step required; `skipWaiting` + `clientsClaim` enabled

### v1.8.3 — March 30, 2026
- **Legal section**: Support tab → Legal sub-tab with 6 documents — Privacy Policy, Terms of Use, Child Safety, Content Standards, Access & Accounts, Report a Problem; drill-down reader with ‹ Back nav; no new dependencies

### v1.8.2 — March 30, 2026
- **Game Mode**: enabled for all users, feature flag gate removed; ▶ Game Mode button always visible on Game Day tab

### v1.8.1 — March 30, 2026
- **Team dashboard**: removed Add Player, Add Game, Snacks quick-action buttons (redundant to dedicated tabs)

### v1.8.0 — March 30, 2026
- **Nav restructure**: Roster + Season tabs merged into single **Team** tab with subtabs: Roster / Schedule / Snacks
- **Team dashboard**: header with player count, W/L record, and next game; status warnings for missing positions and unassigned snacks
- "Season" renamed to "Schedule" throughout

### v1.7.1 — March 29, 2026
- **React Error Boundaries**: `ErrorBoundary` class component at `src/components/Shared/ErrorBoundary.jsx`; 9 sections wrapped — Game Day (outer), Parent View, Now Batting, Lock Flow, Viewer Mode, Validation, Fairness Check, Offline Status, Team List; amber inline fallback card with tap-to-reset

### v1.7.0 — March 29, 2026
- **Backend health check**: `useBackendHealth` hook polls `/ping` on mount + every 5 min; cold-start pill in home screen header (amber "warming up" / red "unavailable" / gray "Connecting..." for first 3s only); inline warning in share sheet when server slow or down
- **Backend `/ping` + `/health`**: `/ping` returns `{ status, timestamp }` in <100ms; `/health` returns `{ status, uptime, timestamp, version }` — both no-DB, safe for external monitoring
- **UptimeRobot ops docs**: `docs/ops/UPTIME_MONITORING.md` with setup guide, frontend UX table, verification commands
- **Vitest regression suite**: 11 engine tests across 5 groups; 10 passing, 1 confirmed bug (sub-10 roster warning guard)

### v1.6.9 — March 29, 2026
- **Now Batting inning label**: "INNING N" label displayed above Now Batting pill strip in Game Day tab; syncs with active inning selection; shows "INNING —" when no inning selected
- **Fairness Check card**: post-finalization card in Defense tab showing three checks — every player benched ≥1 inning, no player pitched/caught >2× average, no back-to-back P/C assignments; green border when all pass, amber when any fail
- **Offline Ready indicator**: connectivity pill in app header — "Offline Ready" (green, local cache present + online), "Offline Mode" (amber, offline but cached), "No Connection" (red, offline + no cache); text hidden in landscape, dot always visible
- **Parent View Mode**: "👪 Parent View" toggle in Game Day innings strip; player picker scrollable pill row; per-player card showing batting slot + inning-by-inning positions with color-coded left borders; "← Full View" to return

### v1.6.8 — March 29, 2026
- **Home screen actionable roster button**: "Missing Roster" badge replaced with "Add Players →" (0 players) or "Complete Roster (N/10) →" (1–9 players); tapping navigates directly to team roster; shown for all teams with fewer than 10 players
- **Home screen empty states**: when no teams exist or search returns no results, show contextual empty state with icon, copy, and "+ Create Team" CTA

### v1.6.7 — March 29, 2026
- **Viewer Mode** *(feature-flagged OFF)*: read-only swipeable inning cards for parents/players; opened via `?s=…&view=true`; shows inning header, field positions, bench, batting order; Prev/Next footer; dark themed
- **Feature flag system**: `featureFlags.js` for global compile-time toggles; localStorage per-user override (`flag:<name>`); URL param bootstrap (`?enable_flag=<name>` / `?disable_flag=<name>`) for zero-deploy per-user rollout; full How-To in `docs/features/feature-flags.md`
- **Share link fallback**: both "Share as Link" and "Share Viewer Link" fall back to base64 URL encoding when Supabase is unavailable (local dev parity)
- **Team batting totals**: G / AB / H / AVG / R / RBI mini-block at top of Season Batting Stats box in Batting subtab
- **Finalization guards**: Suggest Order + 6/7 innings selector disabled when lineup finalized; Generate Lineup blocked on all surfaces (home card shows ✓ View Lineup instead); Finalize CTA blocked until batting order is saved
- **Batting order Undo**: snapshot captured before Suggest Order OR first ▲▼ arrow move; ↩ Undo button appears; clears on Save/Finalize/manual drag

### v1.6.6 — March 29, 2026
- **Now Batting Bar**: sticky strip above bottom nav on Game Day tab; 3-pill layout (Now Batting / On Deck / In Hole); ‹ › buttons to navigate backward/forward; current batter index persisted to localStorage
- **Player Filter Toggle**: viewer mode (share link) horizontal pill list; selecting a player highlights their position boxes, table row, and batting order card in amber

### v1.6.5 — March 28, 2026
- **Lineup Finalized — all 4 Game Day subtabs**: locked experience now consistent across Defense, Batting, Lineups, and Songs
- **Lineups tab**: ✓ Finalize button added to print/share toolbar (was only accessible from Defense)
- **Songs tab (Game Day)**: Edit mode hidden when lineup is locked — read-only Game Day View enforced

### v1.6.4 — March 27, 2026
- **Defense tab warnings**: per-warning Accept + Ignore All/Restore All; ignored warnings persisted to localStorage by game date; panel header turns green when all accepted
- **Sub-tab consistency**: all 4 sub-tab bars now use label-width buttons (flex:0 0 auto); no more 2-tab vs 4-tab size mismatch
- **Layout centering**: S.body capped at 600px centered; inner content wrapper 480px — fixes left-alignment on all tabs
- **Home background**: cream background correctly applied to all tabs; dark gradient reserved for More tab only
- **Team cards**: refactored to single flex row (name zone / Open / Ellipsis); status badge fixed at 120px width; name truncates with ellipsis
- **Hydration merge**: snackDuty + snackNote now protected from Supabase overwrite during cold-start window
- **Supabase backfill**: extended to cover all merge fields (scoreReported, snackDuty, snackNote)

### v1.6.3 — March 27, 2026
#### Defense Tab — Inning Completion Indicators + Position Lock
- UX: Defense tab — inning column headers show green ✓ indicator (green text + green border wash) when all 10 field positions + at least 1 bench are filled for that inning
- UX: Defense tab (By Player view) — position dropdowns disable already-taken positions for that inning; Bench option locks after 1 player is assigned to bench

### v1.6.2 — March 27, 2026
#### Home Screen Icon Cleanup
- UX: Status badges use 6px CSS colored circles instead of emoji dots (product-grade look)
- UX: Team card game alert date uses ▸ symbol instead of 📅 emoji
- UX: Per-card Generate Lineup button — removed ⚡ emoji prefix

### v1.6.1 — March 27, 2026
#### Home Screen Polish + scoreReported Persistence Fix
- Fix: scoreReported flag no longer resets on team reopen — Supabase hydration now merges local `scoreReported: true` instead of overwriting it
- UX: Home screen team card — "Missing Schedule" badge (consistent with "Missing Roster"); italic CTA hints below card for each missing item
- UX: Home screen — per-team ⚡ Generate Lineup button on every Ready team card that has an upcoming game
- Fix: Generate Lineup CTA filtered to Ready teams only (both roster + schedule must be present)

### v1.6.0 — March 27, 2026
#### Share Links + Team Management + Quick Summary Enhancements
- Feat: Short share links — 8-character Supabase-backed IDs (`?s=xxxxxxxx`) replace long URL-encoded payloads; mobile share sheet (navigator.share) supported; Supabase `share_links` table with public read + insert RLS
- Feat: Quick Summary enhancements — sortable Player / R / AVG columns; Games (G) column; AVG color coding matches season stats table
- Feat: County score report checkbox — per completed game "I have reported the score to the County" checkbox; persisted to schedule state + Supabase
- Feat: Home screen team search bar — appears at 3+ teams; real-time filter by team name, age group, or sport
- Feat: Create team sport + age group — Baseball/Softball dropdown; 5U–12U age group dropdown; form fully resets on open, cancel, or save
- Feat: Edit team — ··· context menu on any team card opens edit modal to update name, sport, and age group; saved to localStorage + Supabase
- Feat: Backup export completeness — coachPin now included in backup JSON; restores on import
- Fix: homeMode resets to 'welcome' on all Home nav paths (Home tab click, logo click, delete team)
- Fix: stale schedule closure no longer overwrites battingPerf when county checkbox is toggled
- Fix: app-shell layout — replaced position:fixed bottom nav with flex column to fix scroll and iOS keyboard push-up

### v1.5.1 — March 26, 2026
#### Quick Summary Season Stats Bug Fix
- Fix: Quick Summary AB/H/R/RBI totals now calculate correctly — values were stored as strings from input fields and being string-concatenated instead of summed
- Fix: parseInt applied to all batting stat accumulations in Quick Summary (`getRosterSeasonStats`)
- Fix: only completed games (result logged) counted toward season totals, matching Season tab behavior

### v1.5.0 — March 27, 2026
#### Coach PIN Protection + Locked Roster + Batting Improvements
- Feat: coach PIN protection — 4-digit PIN gates Finalize and Unlock; set/change/remove from Game Day → Lineups tab; PIN persisted per team to localStorage + Supabase (`coach_pin` column, migration 007)
- Feat: locked roster read-only — all player cards auto-collapse when lineup finalized; expand toggle disabled; Add Player and Remove buttons hidden; attribute editing blocked with locked notice
- Feat: batting Save Order button — appears only after manual drag reorder; amber "● Unsaved changes" indicator; "✓ Saved" confirmation fades after 2s; Suggest Order auto-clears dirty state
- Feat: sortable season stats table — tap Player / R / AVG column headers to sort; ↑ ↓ ↕ direction indicators; 0 AB players always sort to bottom on AVG sort; AVG color coding preserved
- UX: home screen redesign — compact greeting + date header; gold Open button per team card; left-strip game alert (red = today, amber = tomorrow, muted = upcoming); dot-separated metadata row; "Tap Open to add your roster" hint on empty teams

### v1.4.0 — March 26, 2026
#### Nav Overhaul + About Tab + Lineups UX
- UX: primary tabs moved to fixed bottom nav bar (portrait) — standard iOS/Android pattern, 4 primary tabs (Roster, Game Day, Season, More), gold active indicator
- UX: Roster tab — Players and Songs sub-tabs; walk-up song management moved from Game Day to Roster → Songs
- UX: Game Day — Songs sub-tab replaced by Lineups sub-tab (print/PDF view absorbed into Game Day)
- UX: More tab — Updates sub-tab added; What's New version history moved there; sub-tabs reordered to About / Updates / Links / Feedback
- UX: About tab — coach/parent-friendly description at top; sections reordered; version badge inline; Open in Browser link; Getting Started → Share App Now
- UX: What's New — previous versions collapsed by default, current version auto-expanded
- UX: Songs tab — Game Day View is first and default landing; redundant Edit button removed
- UX: Lineups (Print) — Bench displays as X in grid; position legend added; buttons renamed Download as PDF / Share as Link / Share as PDF; Backup CTA removed; Grid/Diamond toggle moved to top row
- Fix: onboarding guide updated with correct tab references for new 4-tab nav structure
- Fix: game day pill shows GAME DAY not TOMORROW — Math.round → Math.floor for day diff

### v1.3.9 — March 26, 2026
#### Bug Fixes + Nav Restructure
- Fix: Open button on Home tab unclickable when ··· context menu overlay was active — zIndex fix
- Fix: data persistence audit — migrateSchedule spread preserves future game fields; snackDuty consolidated onto game objects (game.snackDuty / game.snackNote); importTeamData now restores locked state from backup
- UX: nav restructure — 5 primary tabs with nested sub-tabs (Game Day: Defense/Batting/Songs; Season: Schedule/Snacks; More: Feedback/Links/About)
- Fix: migrateBattingPerf — remaps old initial+lastName batting stat keys (e.g. "A Hwang" → "Aiden Hwang") to full player names on load
- Fix: roster players sorted alphabetically by firstName at render time in Roster tab, Snacks tab dropdown, and Schedule tab snack dropdown

### v1.3.8 — March 26, 2026
#### Snack Duty Tab
- New Snacks tab — per-game player assignment with roster dropdown and optional note field
- TODAY badge + gold border highlight on game day card
- Past games de-emphasized (opacity), canceled games hidden
- Summary header: assigned count out of total games
- snackDuty persisted to localStorage, Supabase (snack_duty JSONB column), export backup, and import restore
- Fix: game time strips leading zero (7:00 PM not 07:00 PM)

### v1.3.7 — March 26, 2026
#### Walk-Up Song Links + Smart Time Printing + Print Enhancements
- Snack duty field on game card — add/edit in schedule form, shown with 🍎
- Walk-up song link field — URL per player, clickable in Game Day View, included in share text and PDF
- Smart time printing — default times (0:00/0:10) suppressed in PDF and Game Day View; asterisk note added when applicable
- Songs tab opens in Game Day View by default with sync warning banner
- Batting order note added to all print views (on-screen print card and generated PDF)
- Team context menu (···) on home screen — backup and delete available for any team, not just active
- Restore from backup file available on empty roster screen (no Supabase required)
- Fix: battingPerf migration merge checks localStorage before Supabase — prevents empty {} overwriting local stats

### v1.3.6 — March 26, 2026
#### Walk-Up Songs + Player Data Preservation
- Walkup songs — per-player field with title, artist, start/end time, coordinator notes
- Walkup song display on player card (hidden when empty)
- Walkup song edit form in player profile editor
- Fix: migrateRoster now spreads all existing player fields before normalizing — any future player fields are no longer silently dropped on app load, team switch, or Supabase hydration
- Fix: walkup song and all V2 attributes now survive full round-trip through migrateRoster

### v1.3.5 — March 25, 2026
#### Diamond View Inning Fix
- Diamond view all-innings mode now shows all coach-configured innings (4, 5, or 6)
- Removed hardcoded Math.min(4) cap that silently cut display to 4 innings regardless of config
- Position box height and SVG viewBox now scale dynamically with inning count

### v1.3.4 — March 25, 2026
#### Batting Stat Display Fixes
- Batting averages no longer show leading zero (.333 not 0.333)
- Zero at-bats now shows --- instead of 0.000 or NaN
- Counting stats (AB, H, R, RBI) always display as integers, never as decimals
- `fmtAvg` and `fmtStat` helpers applied across all 6 display locations: player cards, Quick Summary table, batting tab season stats, batting order card, schedule game-entry AVG

### v1.3.3 — March 25, 2026
#### Roster Protection System
- Migration fix: schedule-only update for existing teams — roster never overwritten by re-seed
- `roster_snapshots` Supabase table with auto-prune trigger (keeps last 10 per team)
- Auto-snapshot on every player add, remove, and edit (`auto_save` event)
- Snapshot on Supabase hydration at app load (`app_load` event)
- In-app roster recovery UI: "Restore previous roster" link visible when roster is empty
- Recovery modal shows up to 5 snapshots with timestamp, player count, and trigger event
- Resolves Bananas roster loss incident

### v1.3.2 — March 25, 2026
#### UX Restructure + Data Integrity Guards
- Navigation: two-row portrait nav (team tabs / global tabs), explicit ← Home button
- Home screen: collapsible What's New, dark-styled Links section
- Quick Summary table: AB/H/R/RBI columns
- Add Player form: collapsible (hidden by default)
- Supabase hydration race fix: loading indicator, Auto-Assign disabled until roster loads
- Data-loss guard: empty roster never overwrites Supabase; persist helpers skip cloud sync during hydration

### v1.3.1 — March 25, 2026
- Fixed V2 lineup engine: LC/RC positions now assign correctly
- Batting order updates automatically after every auto-assign

### v1.3.0 — March 25, 2026
#### Player Profile & Scoring Engine Rebuild
- Rebuilt player profile UI with V2 collapsible card system
- New sections: Fielding (Reliability, Reaction Timing, Arm Strength, Ball Type, Field Awareness), Batting (Contact, Power, Swing Discipline, Batting Awareness), Base Running, Effort, Lineup Constraints, Development Focus
- Lineup Constraints card: Skip Bench flag, Out This Game flag, Preferred Positions, Avoid Positions — all in one place, expanded by default
- Removed legacy Skills, Coach Notes, and Batting Skills sections from player card UI (data preserved, engine still uses for V1)
- Add Player form: split into separate First Name + Last Name fields with capitalization
- `firstName`/`lastName` stored as separate fields on player object
- Last Updated timestamp on each player card
- V2 lineup engine (`lineupEngineV2.js`): position-specific scoring with 9 position formulas
- `scoringEngine.js`: 11 shared scoring functions (fieldScore, battingScore, runningScore, battingOrderScore, positionScore, benchCandidateScore, getBallTypeFit, awareness scores)
- `playerMapper.js`: safe V1→V2 field mapping with defaults for all missing fields
- `migrateRoster()` updated to preserve all V2 fields across team switches
- `featureFlags.js`: `USE_NEW_LINEUP_ENGINE=true` (V2 active, V1 fallback on error)
- Auth system (parallel, not yet gated): request access, email magic-link login, admin approval, admin UI at `/admin.html`

### v1.2.1 — March 24, 2026
- Added Sharon Springs Athletics link to Links tab (sharonspringsathletics.org)

### v1.2.0 — March 24, 2026
- Redesigned diamond view: SVG field with green background, outfield arc, dirt infield ellipse, base diamond, pitcher mound, and realistic position coordinates
- Dual-zone position boxes: dark header band (per position group color) + low-opacity player name area
- Single-inning mode: large name (14px bold), inning badge pill, bench player pill at bottom-right
- All-innings mode: compact first names per inning slot, taller 82px boxes, dynamic 680×680 viewBox
- First-name display enforced in all views — bench strips, grid, print tab, share link
- About tab: onboarding guide expanded by default, sections reordered (guide → app info → version history)
- Vercel Analytics + Mixpanel event tracking
- Schedule tab: computed batting average replaces BB column; stats legend added

### v1.1.0 — March 24, 2026
- Replaced Practice tab with Feedback tab (free-form feedback + bug reporting with localStorage persistence)
- Added About tab (app info, version history, inline onboarding guide)
- APP_VERSION constant + VERSION_HISTORY array in codebase
- Fixed LC/RC position colors (blue/purple, high contrast)
- Schema v2 + CF→LC migration
- 10-player field configuration (LC + RC replace CF)
- First-time coach onboarding modal (5-step)

---

## 🔴 P0 — Critical / Blocking

### Story 61 (P0) — Share-link viewer routing broken in prod <!-- #555 -->

**Status:** Resolved — v2.5.16 (shipped 2026-05-19)
**Discovered:** April 30, 2026 during Slice 0 (combined game view) dev test on Vercel preview
**Resolved:** May 19, 2026 via `fix/story-61-share-viewer-routing`

**Resolution:** Original framing was a misdiagnosis. `SharedView` already renders standalone (no coach shell, no nav, no tabs) via early-return at `App.jsx:7989`. Recon on May 19 confirmed the actual root cause was two separate bugs:

- **Bug A** — `dbLoadShareLink` (`frontend/src/supabase.js:145`) had no timeout. Stalled Supabase fetch left the spinner indefinite. Fixed by `Promise.race` against a 10s timer (`SHARE_LINK_FETCH_TIMEOUT_MS`).
- **Bug B** — `isViewer` at `App.jsx:8001` (and `isViewer64` at `App.jsx:8063`) was gated behind the `VIEWER_MODE` runtime flag, default-OFF in prod. `?view=true` / `?role=viewer` share links always fell through to `SharedView` instead of `DugoutView`. Fixed by removing the flag gate from both share paths.

Tests: `src/tests/shareLink.test.js` — 3 new specs (timeout-stall, happy path, Supabase error). Suite 734 → 737 passing / 1 skipped. Render-path integration test logged as P1 follow-up in DOC_TEST_DEBT.

**Original symptom (misdiagnosed):** Share links render the full authenticated app shell (bottom nav, editing UI, "Lineup Finalized — Unlock to make changes", "Install Dugout Lineup" PWA prompt) instead of the unauthenticated viewer experience.

**Original impact framing:** Violates the non-negotiable auth principle — viewing must never require login, share links must always work unauthenticated. Recipients see coach-side UI and editing affordances. P0 by stated principle, even though scope is pre-existing in prod.

**Root cause:** Unknown — likely URL parsing or `isViewer` / `isViewer64` detection at App.jsx top-level (~lines 7920–7950). Upstream of Slice 0 wiring; not caused by combined-game-view work.

**Confirmation it's not Slice 0:**
- Slice 0 only added DugoutView wiring inside the existing `isViewer` branch
- The bug is that `isViewer` itself isn't being set true on share-link load — upstream of any Slice 0 change
- Same failure mode whether combined flag is ON or OFF

**Proposed fixes:**
- Option A — URL-routing investigation: check share URL format, isViewer/isViewer64 logic, base64 payload extraction
- Option B — Add regression test for share-link rendering (no test exists today, hence silent breakage)
- Option C — Both, single hotfix

**Recommendation:** Option C. New branch `hotfix/share-link-viewer-routing` from main. Tests + fix together (RED → GREEN). Once merged, re-run Pass 3 from Slice 0 test plan as the regression gate.

**Blocks:** Final merge of feature/combined-game-view to main is NOT blocked — note in PR body that share-link viewer is broken in prod regardless of this change.

### Story 67 (P0) — Share CTA orphaned: shareCurrentLineup() unreachable from Lineups tab <!-- #556 -->
Status: Resolved — v2.5.15 (2026-05-19)
Resolved: renderPrint() action bar lifted into renderLineups() via PR #99 (commit a355b1a). shareCurrentLineup() now reachable from Lineups tab. All three share paths confirmed working in local smoke test and dev.dugoutlineup.com overnight soak.
Discovered: May 18, 2026 — root cause confirmed via code grep
Target: v2.5.15
Symptom: Coach finalizes lineup on the Lineups tab and finds no Share CTA.
  "Print / Share View" label appears but no button exists below it.
  shareCurrentLineup() has never been callable from this surface.
Impact: Share-link generation via the natural post-finalize path is non-functional
  in production for every coach. Schedule-card share (handleShareGame) still works
  and is the only live path to generating ?s= links, but discoverability is
  severely degraded. Compounds with Story 61 — even when a link is generated via
  schedule card, recipient-side rendering is broken.
Root cause: renderPrint() (App.jsx:7564) was disconnected from the tab tree during
  a prior refactor. Its Share Lineup button, share sheet JSX, and
  shareCurrentLineup() call are orphan code — never rendered. GAMEDAY_SUBTABS has
  no print/share key. renderLineups() (App.jsx:4489) has no share button.
  The contextLabel "Print / Share View" (App.jsx:8153) is a UI promise the code
  does not fulfill. The Lineup Finalized banner is not the cause — the Share CTA
  is absent in both locked and unlocked states.
Proposed fix: Option A — inline the renderPrint() action bar (App.jsx:7572-7643)
  into renderLineups(). Always renders regardless of lineupLocked state. No new
  functions needed; all state (showShareSheet, printOpt, etc.) is at component
  scope. Delete or clearly tombstone renderPrint() after inlining to prevent
  re-orphaning.
See also: Story 61 (P0) — recipient-side viewer routing broken (separate fix,
  separate code site).

---

## 🔴 P1 — Bugs / Critical Gaps

| # | Item | Notes |
|---|------|-------|
| 1 | **Mobile drag-to-reorder (batting)** | Touch drag is fragile — number circle as drag handle exists, but tap up/down arrow fallback is not yet implemented |
| 2 | **Sticky player name column (field grid)** | Horizontal scroll on mobile loses player names — original fix deferred in single-file build |
| 3 | **`Confident` vs `goodCoachability` weight parity** | Both tags have identical scoring mods — `Confident` should boost high-pressure positions (P, SS, C) more aggressively; `goodCoachability` should distribute more evenly |
| 4 | ✅ **Player absent flag (per game)** | Resolved in v1.3.0 — Out This Game flag in Lineup Constraints card |
| 5 | **Mud Hens g2 batting stats** | SQL restore in Supabase pending — two-query fix identified, not yet applied |
| 6 | **Absent player auto-assign** | Out Tonight players (e.g. Aiden) occasionally still assigned to a field position when auto-assign runs — `activeBattingOrder` filters batting order correctly but engine absent exclusion may have a gap |
| 7 | **Game Ball "—" display bug** | Schedule card shows "—" dash instead of recipient names after multi-player game ball selection — read path may not be normalizing the `gameBall` array at render |
| ~~41~~ | ~~**Local test gate broken by Defender fork-spawn scanning**~~ | ✅ **Resolved v2.5.8** — switched `pool: 'forks'` → `pool: 'threads'` in `vite.config.js`. worker_threads are intra-process; Defender does not intercept them. 516 tests pass. |

---

## 🟡 P2 — High-Value Enhancements

| # | Item | Notes |
|---|------|-------|
| 1 | **Print card metadata** | Team name, date, and opponent are hardcoded — should be pulled from team/game context |
| 2 | **"Revert to Generated" button** | After manual grid edits, no way to revert to the last auto-assigned state without full regeneration |
| 3 | **"Avoid Positions" collapsed by default** | 9 buttons per player adds excessive height on mobile; should be a disclosure, collapsed by default |
| 4 | **Reset Roster confirmation prompt** | Currently destructive with no warning dialog |
| 5 | **Per-game batting order** | Order should be regeneratable after each game using latest cumulative stats; stat-to-order feedback loop needs polish |
| 6 | **Practice Tab** | Session log with date, focus area, drill notes, and player attendance checkboxes — fully specced, not yet built |
| 42 | **Pre-push hook doesn't differentiate env-broken vs test-failure** | When hook fails, developer cannot tell if it's environmental OOM/spawn issue or real regression without manually reading Vitest output. Friction makes `--no-verify` more tempting. Proposed fix: hook detects timeout patterns and emits "ENVIRONMENT TIMEOUT" vs "TEST FAILURE" messages; logs bypass invocations for audit. P2 polish, address when hook touches happen. |
| 43 | **Branch protection allows admin bypass; main should be stricter than develop** | Push to develop on May 1 reported "Bypassed rule violations" for required PR + status checks. Standard GitHub behavior — owner has implicit bypass unless "Do not allow bypassing the above settings" is checked. Acceptable on develop for solo iteration; main should require explicit unlock. Proposed fix: enable strict toggle on main only. Blocks: requires Story 41 resolution first (otherwise can't merge to main without re-bypassing). |

### Story 62 (P2) — dbLoadShareLink silent null collapses three failure modes <!-- #127 -->

**Status:** Resolved — v2.15.1-prep (develop only, not yet promoted)

**Problem:** `dbLoadShareLink` returned null for at least three distinct failure modes (row not found, RLS block, malformed slug) and the caller could not distinguish them — all three collapsed into a single silent null, making the share-link error surface undiagnosable.

**Resolution:** `dbLoadShareLink` (`frontend/src/supabase.js`) now always resolves `{ payload, status }`, where `status` is one of `ok` / `not_found` / `rls_blocked` / `timeout` / `malformed_slug`. Malformed ids are caught client-side against `SHARE_LINK_ID_PATTERN` before ever touching the network; `42501`/`PGRST301` Supabase error codes map to `rls_blocked`, everything else to `not_found`. The `?s=` share-link error screen in `App.jsx` now shows a distinct, user-meaningful message per status instead of one generic "couldn't be found" for every case.

**Acceptance criteria:**
- [x] Caller receives a typed result or error code distinguishing: (a) not found, (b) RLS/auth block, (c) malformed slug
- [x] Share-link error UI surfaces a user-meaningful message per failure mode
- [x] Unit test covers all three paths — `shareLink.test.js` (6 tests) + new `AppShareLinkRouting.test.jsx` describe block (4 tests) asserting the rendered copy per status

**Priority:** P2 | **Connects to:** Story 61 (P0 share-link routing)

---

## 🟢 P3 — Code Quality / Observability

| # | Item | Notes |
|---|------|-------|
| 1 | **`autoAssign` / `autoAssignWithRetryFallback` contract** | Output should explicitly carry: final grid, warnings, attempts used, fallback-invoked flag — enables observability and easier future debugging |
| 2 | **UI component tests (React Testing Library)** | Engine unit + integration tests exist; UI layer has zero test coverage |
| 3 | **E2E tests (Playwright or Cypress)** | No end-to-end coverage — critical before auth ships |
| 4 | **File split — renderSchedule and large render functions** | `renderSchedule` is ~593 lines doing the work of 4–5 components; blocking future feature velocity |
| 5 | **TypeScript migration** | Still `.jsx`, no types — lower priority but growing tech debt |
| 6 | **ESLint config** | No linting enforcement in the repo |
| 7 | **OOM contract test** | `useLiveScore.contract.test.js` (untracked on main, committed on develop) causes pre-push hook worker OOM on Windows — fix vitest worker allocation or add to exclude list |
| 40 | **Pre-push hook misfires on legitimate feature→develop merges** | `.husky/pre-push` blocks all pushes to develop including `--no-ff` merges from feature branches. Workaround: `ALLOW_DIRECT_PUSH=1` env var per push. Low impact but training-wheels feel. Proposed fix: detect merge commits at HEAD via `git rev-parse HEAD^2`; allow when HEAD is a merge commit. P3 polish. |
| 44 | **Bypass events on protected branches not surfaced in commit history** | When admin bypasses branch protection, bypass logs to GitHub's server-side admin log but no indicator on commit page. Future audits require digging through admin logs. Proposed fix: convention — every bypassed push includes footer in merge commit message: `[Bypass: branch protection / reason: <one line>]`. Self-documents in `git log`. P3 polish, apply on next bypass. |
| 45 | **Husky v10 + doc drift cleanup** | Pre-push hook prints v10 deprecation warning; CLAUDE.md test count says 434 (actual 437); second worktree at `lineup-generator-ux` undocumented; hook fires false-positive on `--delete` and cross-worktree pushes. Bundle as one chore PR after a Slice ships. |

---

## 🚧 Blocked

| # | Item | Notes |
|---|------|-------|
| 1 | **Auth Phase 4 cutover** | Add requireAuth middleware to existing routes. Auth: email magic-link + Google OAuth (Twilio removed). |
| 2 | **Scoring: Phase 4C cleanup** | See Story 129 (7-step shim-removal sequence, step 1 of 7 done) and Story 130 (GRANT-revocation migration, design decision pending KK sign-off) for the current, detailed state — supersedes this row's older summary. |
| 3 | **Scoring: persist myTeamHalf** | `myTeamHalf` (top/bottom) currently lives only in ScoringMode React state — lost on page reload. Persist to `live_game_state` and hydrate on mount. |
| 4 | **Scoring: real-time multi-device sync** | Realtime subscription is wired but only viewers see state changes passively. Scorer and viewer full sync validation needed before broader rollout. |

---

## ✅ Resolved / Won't Fix

- **Android PWA screenshot restriction** — OS-level security policy on standalone PWA windows. Not fixable in web code without breaking Game Mode UX. Workaround: Share Link. iOS unaffected. Closed April 2026.

---

## 🗃️ Retired / Never Filed

Story numbers 17, 18, 25, and 52 were never allocated. No entries exist in this file for these numbers. This stub is intentional — it closes the gap so future audits do not re-investigate these numbers.

---

## 🅿️ Parking Lot / Future Considerations

### PIN Reset Flow
**Problem:** If a coach forgets their PIN, there is currently no recovery path — the lineup stays locked indefinitely.

**Proposed solution:** Add a "Forgot PIN?" link in the unlock modal. Since the app has no auth yet, recovery options are limited:
- **Option A (simple):** "Forgot PIN?" clears the PIN and unlocks after a `confirm()` dialog — accepts that anyone with the phone can bypass, but unblocks the coach.
- **Option B (better, post-auth):** Send a reset code to the coach's phone via Supabase OTP — only available after Phase 3 auth ships.
- **Option C (middle ground):** Show the team name + a prompt to contact the app admin, with an admin override endpoint that clears the PIN via the backend.

**When to do it:** Option A can be added in ~30 min at any time. Options B/C depend on Phase 3 auth.

---

### Theme System (Phase 3 — Post-Component Refactor)
> Note: this "Phase 3" is distinct from the **UX Refactor track's Phase 3** (call-site replacement, active — see `docs/product/UX_REFACTOR_ROADMAP.md`). Naming collision flagged for future doc disambiguation.

**Recommended approach:** Design tokens + ThemeContext + localStorage persistence
**Why deferred:** App.jsx is a 5,000+ line monolith with hundreds of hardcoded hex colors. A proper theme system requires finding and replacing every hardcoded color — a 2-3 day refactor with high regression risk. Best done alongside the planned App.jsx component split.

**When to do it:** After App.jsx is broken into components. Theme tokens and component split can be done together cleanly.

**Proposed themes:**
- Classic Navy (default) — current branding, #0f1f3d background
- Slate + Teal (recommended for usability) — #0f172a background, #14b8a6 primary
- Field Green (sports vibe) — #0d2818 background, #27ae60 primary

**Implementation plan (ready to execute when timing is right):**
1. /src/theme/themes.ts — design token definitions
2. /src/context/ThemeContext.tsx — React context + useState
3. localStorage persistence for user preference
4. Theme selector UI in Settings/About tab
5. Replace all hardcoded colors with theme.colors.* references

---

## 📦 Backlog — Ready to Implement

### v2.6.0 — Critical bugs (user-impacting, ship first)

- [ ] **Diagnose share/print not working in prod** — confirmed broken on April 24, 2026 (game day) and April 27, 2026 (production smoke test post-v2.5.1 deploy). Root cause UNKNOWN. NOT caused by `renderSharedView` hooks violation — that fix shipped in v2.1.6 (commit `46f071a`, `SharedView` component at App.jsx:2560). Investigation needed: reproduce locally, check browser console errors on `?s=` URLs, verify share/print buttons render, check whether share payload generation is failing or share view rendering is failing.
- [ ] **Audit `snack_duty` codebase usage** before dropping the column. Column verified present in Supabase on April 27, 2026 (jsonb type). Prerequisite for dropping — grep frontend/ and backend/ for any read/write references; if clean, run `ALTER TABLE team_data DROP COLUMN snack_duty;` in Supabase SQL Editor.

### v2.6.0 — Infrastructure (complete before next feature sprint)

- [ ] **CI workflow `BACKEND_URL` audit** — backend job + smoke job both hardcode prod URL (verified April 27, 2026). Evaluate whether to point at a dev/preview backend or make tests environment-aware. Note: smoke job has misleading variable named `DEV_BACKEND_URL` that points to prod URL — fix or rename.
- [ ] **Verify `RESEND_DOMAIN_VERIFIED=true`** in Render production environment variables (local `.env` confirmed April 27, 2026; Render dashboard not checked this session).
- [ ] **Investigate Windows Vitest pre-push hook OOM cascade** — currently mitigated by warm-up workaround in CLAUDE.md. Real fix paths: reduce vitest worker count for hook runs, skip pre-push test (rely on CI gate), configure pool to avoid worker-thread cold-start, or move hook to pre-commit instead of pre-push.
  - **Related:** See "Pre-push hook: skip test suite on docs-only changes" in the narrative Backlog section below for a complementary fast-path workaround.

### v2.6.0 — Quality of life

- [ ] Install `gh` CLI on Windows machine (`winget install --id GitHub.cli` then `gh auth login`)
- [ ] Fix `LockFlow.jsx` duplicate `fontSize` lint warning
- [ ] Bundle size investigation (1681 kB chunk → code splitting)
- [ ] Enable "Auto-delete head branches" GitHub repo setting

### v2.6.0+ — Auth migration cleanup (was: docs/TODO_activate_membership_rpc.md)

- [ ] **Fix `activate_membership` RPC for email auth (Migration 013)** — The Supabase RPC was originally built for phone-only auth (signature: `activate_membership(p_user_id uuid, p_phone_e164 text, p_first_name text, p_last_name text)`). Phase 4B added email auth without an RPC update; current code uses a direct `.update()` workaround on `team_memberships` in `backend/src/routes/auth.js`.
  - **Migration:** Add `backend/src/db/migrations/013_fix_activate_membership.sql` updating the RPC signature to accept email + team_id parameters.
  - **Code:** Restore RPC call in `backend/src/routes/auth.js`, remove the direct update workaround.
  - **Blocks on:** Nothing — safe to run anytime after Phase 4B is stable. Phase 4B has been stable since v2.x.
  - **Source:** Originally tracked in `docs/TODO_activate_membership_rpc.md` (now deleted, content migrated here April 27, 2026).
  - **Target:** v2.6.0 P3 or v2.7.0

### iOS PWA Install Coaching Overlay

**Status:** Ready to implement (spec complete)
**Effort:** Small — frontend only, no new packages, no backend changes
**Priority:** Medium — high-value for first-time iOS coaches
**Spec doc:** [`docs/features/ios-pwa-install-overlay.md`](../features/ios-pwa-install-overlay.md)

**Summary:** iOS Safari has no `beforeinstallprompt` event. Users must manually tap Share → Add to Home Screen. Without coaching UI, most iOS users never install the PWA. This feature adds a bottom-sheet overlay that guides coaches through the steps at the right moment.

**Trigger conditions:**
- iOS Safari only (detected via UA string)
- NOT already in standalone mode
- NOT previously dismissed
- Show on 2nd+ visit OR after lineup generation completes (intent signals)

**Files to create/modify when implementing:**

| File | Action |
|------|--------|
| `frontend/src/hooks/useIOSInstallPrompt.js` | CREATE |
| `frontend/src/components/IOSInstallBanner.jsx` | CREATE |
| `frontend/src/App.jsx` | MODIFY — hook + render + window trigger |
| `frontend/package.json` | MODIFY — bump version |

---

## 🔵 Phase 3 — Auth + Multi-Coach

> **Backend infrastructure deployed as of v1.3.0. Auth: email magic-link + Google OAuth (Twilio removed).**

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | **Email magic-link auth** | ✅ Backend live | No-password flow; magic link via Supabase + Resend; `request-access` → admin approval → magic-link login |
| 2 | **Admin UI** | ✅ Live at `/admin.html` | 4-tab UI: Pending Requests, Members, Feedback, Settings |
| 3 | **access_requests + profiles + team_memberships tables** | ✅ Deployed | RLS policies active; `activate_membership` Postgres function atomic |
| 4 | **Feedback backend endpoint** | ✅ Live | `POST /api/v1/feedback` → `feedback` table in Supabase |
| 5 | **Coach backfill** | ✅ Done | Kaushik (admin) + Stan Hoover (coach) seeded in `team_memberships` |
| 6 | **Phase 4 cutover** | 🔴 Blocked | Add `requireAuth` middleware to existing routes |
| 7 | **Role system (frontend)** | ❌ Not started | Head Coach / Assistant (edit) / Viewer (read-only) — requires Phase 4 cutover first |
| 8 | **Invite flow (frontend)** | ❌ Not started | Coach → Settings → Invite by email → magic-link → auto-assigned to team |
| 9 | **Viewer-mode shell** | ❌ Not started | Stripped tab bar; skill/tags hidden from viewer role |
| 10 | **Supabase Realtime** | ❌ Not started | Lineup lock → live push to assistant and viewer phones |
| 11 | **Season-end skill calibration report** | ❌ Not started | Compare auto-assigned vs actual played positions |
| 12 | **iCal / calendar import** | ❌ Not started | Alternate path alongside AI photo/text import |

---

## 🟣 Phase 4 — Quality & Automation

| # | Item | Notes |
|---|------|-------|
| 1 | **Automated pre-deploy test suite** | Run on every push to main before Vercel deploy triggers. Must cover: Chrome + Safari on Android and iOS (BrowserStack or Playwright cloud), desktop Chrome + Safari (Mac + PC), portrait and landscape orientations, all 7 tabs smoke-tested, LC/RC position colors validated, first-name display rules enforced, 1-bench-per-inning rule checked, PDF generation, share link, export/import backup, Supabase sync |
| 2 | **CI/CD pipeline (GitHub Actions)** | Trigger on every PR and push to main: run build, run unit tests (engine.test.js), run E2E suite (Playwright), block deploy if any step fails — Vercel deploy only triggers on green pipeline |
| 3 | **UI component tests (React Testing Library)** | Cover: tab navigation, auto-assign trigger, manual grid override, batting order drag, share link generation, feedback form submission |
| 4 | **Engine regression tests — LC/RC + 10-player** | Validate every auto-assign run produces exactly 1 bench slot per inning for 11-player roster, no CF in output, LC and RC both assigned across 6 innings, no outfield repeats per player |
| 5 | **Visual regression testing** | Screenshot diffs on diamond view after any layout change — catches position box drift, color regressions, and broken field background |
| 6 | **Cross-browser matrix via BrowserStack** | Automated runs on: Chrome Android, Safari iOS, Chrome Windows, Safari macOS, portrait + landscape — triggered on every version bump |

---

## 🗓 Recommended Next Sprint (Sequenced)

### Current Sprint (v2.2.46+)
1. **Absent player auto-assign bug** (P1) — investigate lineup engine absent exclusion path; confirm Out Tonight players are never field-assigned
2. **Game Ball "—" display bug** (P1) — fix gameBall array read/normalize on schedule card render
3. **OOM contract test** (P3) — fix or exclude `useLiveScore.contract.test.js` from vitest so pre-push hook is clean on main
4. **Scoring: persist myTeamHalf** — write `myTeamHalf` to `live_game_state` and hydrate on mount
5. **Phase 4C auth cutover** (Blocked) — auth gate, RLS enforcement on scoring tables, HMAC-signed approve/deny links

### Historical (Completed)
0. ✅ **v1.2.0 shipped** — diamond view redesign, responsive position boxes, first-name enforcement, analytics
1. ✅ **Verify 10-player auto-assign on live roster** — open Mud Hens, run Auto-Assign across 6 innings, confirm 1 bench/inning and no CF
2. ✅ **Player absent flag** — Out Tonight panel, activeBattingOrder, engine exclusion (v2.2.21+)
3. ✅ **Multi-player game ball** — gameBall migrated to array, edit modal with search + multiselect (v2.2.25–v2.2.26)
4. ✅ **My Team tab rename** (v2.2.25)
5. ✅ **V1→V2 skill bridge** — playerMapper.js shim (v2.2.26)
6. ✅ **Live scoring** — pitch tracking, B/S/O counts, runner names, opponent half tracking, mercy rule, team batting half selection (v2.2.37–v2.2.45)
7. **Mobile batting reorder arrow fallback** — ~1–2 hrs, biggest UX gap at the field
8. **Print card metadata** (team name, date, opponent) — ~1 hr
9. **`Confident` vs `goodCoachability` weight fix** — ~30 min, correctness issue
10. **"Revert to Generated" button** — ~1–2 hrs
11. ✅ **Verify onboarding modal on live app** — confirmed working
12. **Set up GitHub Actions CI** — block Vercel auto-deploy unless build + engine tests pass; 2-hour setup, eliminates broken deploys

> **Note:** File split (P3 code quality) should happen in parallel with or just before Phase 3 auth work. It will reduce new feature implementation time by ~40%.

---

## Phase 5 — Multi-Team & Delegated Access

### Phase 5A — Self-service team creation
- Head coaches can create their own team without platform_admin involvement
- Team creation flow: name, age group, sport, division
- Auto-assigns creator as `admin` of the new team (labeled "Head Coach")

### Phase 5B — Delegated approval
- Team `admin` can approve coach-tier requests for their own team
- `platform_admin` (global, not a membership row) receives and approves requests for the team `admin` seat
- Notification routing: requests for the `admin` seat -> platform_admin; coach-tier requests -> the team's `admin`

### Phase 5C — Team switcher UI
- Multi-team users see team switcher on home screen
- Favourite badge to pin primary team
- Search bar to find other teams
- One Supabase user, multiple team_memberships rows

### Phase 5D — Team join links
- Head coach generates QR code / shareable link for their team
- Pre-fills team ID and role in RequestAccessScreen
- Separate links per role. NOTE: as of WS-1 (#336) the `?role=` param matches on the option ID, not the stored value. Valid tokens are `head_coach`, `assistant_coach`, `coordinator` - NOT `team_admin`/`coach`/`viewer`.

### Phase 5E — Head coach onboarding flow (replaces manual Supabase creation)
- Platform admin sends "Create your team" invite link to new head coach
- Head coach fills out team details + their own profile
- Team is created, head coach gets an `admin` membership automatically

---

## scoring-updates — completed in v2.3.2

### ✅ Bug: Opponent B/S display clobbered by Realtime echo (shipped v2.3.2)
- Root cause confirmed: oppBalls/oppStrikes were ephemeral — not persisted,
  reset on every Realtime echo.
- Fix: added opp_balls + opp_strikes to live_game_state (schema migration
  20260421_add_opponent_pitch_tracking.sql); both now included in every
  persist() upsert payload. EXPECTED_LGS_KEYS expanded 15→21 to lock
  full-row invariant in contract tests.

### ✅ Feature: Opponent pitch counts + batter identity (shipped v2.3.2)
- Opponent batter number (#1–#11) displayed above B/S/O pips.
- Pitch count totals: per-batter, per-inning, per-game ("Pitches — Batter: X · Inn: X · Gm: X").
- Batter advances (number increments, per-batter count resets) on: out, contact/hit; K triggers an out.
- Inning totals reset on half-flip; game total persists across all innings.
- 4 new columns: opp_current_batter_number, opp_current_batter_pitches, opp_inning_pitches, opp_game_pitches.

---

## scoring-updates — completed in v2.3.3

### ✅ Story 1: Runner placement (shipped v2.3.3)
- Root cause: roster entries have no .id field; scoring code used player.id which produced undefined for every entry.
- Fix: player ? (player.id || name) : name fallback throughout advanceRunners(), runner state, and scoring math.

### ✅ Issue 1: Runner-out increments outs (shipped v2.3.3)
- confirmRunnerAdvancement() out-branch now increments outs and calls endHalfInning() correctly.

### ✅ Issue 2: Runner pill positioning (shipped v2.3.3)
- DiamondSVG renders runner pills via absolute positioning at base coordinates; floating row below diamond removed.

### ✅ Story 9: Layout polish — diamond centering + dead space (shipped v2.3.3)
- Section 6 layout: flex:1 + flex-column; diamond centered horizontally and vertically; pitch info below diamond without 2B collision.

### ✅ Story 11: Practice mode — local-only scoring path (shipped v2.3.3)
- isPractice=true bypasses all Supabase writes; claimScorerLock sets isScorer locally; heartbeat suppressed; Realtime subscription skipped.
- 7 tests in practiceModeIsolation.test.js verify Supabase isolation contract.

### ✅ Story 13: Realtime race condition guard (shipped v2.3.3)
- lastAppliedAtRef + updated_at timestamp guard (<= comparison) rejects stale and echo Realtime events.
- persist() and claimScorerLock() seed upsert stamp ref in .then() success branch (async-after-success).
- 3 tests in realtimeRaceGuard.test.js.

### ✅ Story 14: Opponent batter card placement (shipped v2.3.3)
- Opponent batter card unified with home-team card style (gold border, OPPONENT BATTER header, Player #N, Pitches: X of 5); moved above diamond.
- Duplicate Player #N label removed from fixed pitch bar.

---

## scoring-updates — completed in v2.4.x

### Feature: Opponent runners on base
- Diamond UI parity with home-team runner display during opponent half.
- Schema: opp_runners jsonb column on live_game_state.
- Handler: hit/walk advancement in recordOppPitch() (single/double/triple/HR/walk branches).
- Bundle with 10U+ walk/strikeout rule logic for opponent half.
- Surfaced from v2.3.2 dev-test coach feedback (KK, April 2026).

### ✅ Story 27 (P2) — Home team name replaces "Us" / "US" throughout scoring
Status: Resolved — v2.4.0 (2026-04-24)
Discovered: 2026-04-24, during v2.3.4 opponent-name sweep local smoke
Target: v2.4.x
Symptom: After v2.3.4, opponent-side labels use the real team name (e.g.,
  "Bananas #1", "+1 Bananas Run", "BANANAS" scoreboard column). Our-side
  labels still show generic "US" / "Us" / "+1 US". Asymmetry reads as
  incomplete.
Impact: Coach and dugout parents using the scoring view. Minor but
  visible inconsistency; undermines the v2.3.4 clarity improvement.
Root cause: known — v2.3.4 scope was limited to opponent labels. The
  companion "Us → home team name" work was not included.
Proposed fixes:
  - Option A: Sweep LiveScoringPanel.jsx for all "US"/"Us" display strings,
    replace with truncateTeamName(activeTeam.name). Matches v2.3.4 pattern,
    reuses existing formatter. Known spots: scoreboard "US" label (STATE
    1/2/3), "+1 US" button, manual run prompt "Us" button, FinishGameModal
    my-side label. ~5-7 substitutions.
  - Option B: Consolidate on a single home-side label variable
    (homeLabel = truncateTeamName(activeTeam.name)) and replace the existing
    teamShort helper (first-word-only, pre-dates truncateTeamName). More
    churn (~3 additional touch points) but eliminates dual-format risk
    long-term.
Recommendation: Option B. teamShort was a pre-v2.3.4 hack; consolidating
  on one formatter now keeps the scoring view consistent and means we never
  revisit this tension. Extra churn is minimal and proportionate.
Notes: Could bundle with Story 28 (game context header) since both edit
  LiveScoringPanel.jsx — ~half the PR overhead.

### ✅ Story 29 (P2) — Scoring sheet semantic cleanup (SCORING_SHEET_V2)
Status: Resolved — v2.5.0 (2026-04-24)
Discovered: 2026-04-24, post v2.4.0 scoring review
Target: v2.5.0
Symptom: Outcome sheet had Strikeout as a tap target alongside genuine contact
  outcomes, but 3-strike auto-ending made it redundant. Foul was buried in the
  contact sheet (wrong conceptual section). Out@1st and Flyout shared a 3-button
  row with Strikeout, making them harder to tap under pressure.
Resolution: SCORING_SHEET_V2 feature flag (default true). OUTCOME_ROWS_V2
  removes Strikeout, splits sheet into PITCH OUTCOME (Foul, full-width) and
  AT-BAT OUTCOME sections (Out@1st + Flyout in 2-button row, Home Run
  full-width). Opp-half +1 Run buttons hidden (superseded by ScoreboardRow chips).
  8 tests in scoringSheetV2.test.js.

### ✅ Story 28 (P2) — Game context header at top of scoring screen
Status: Resolved — v2.4.0 (2026-04-24)
Discovered: 2026-04-24, coach observation during v2.3.4 scoring review
Target: v2.4.x
Symptom: The scoring view shows team header, batter card, and scoring
  controls, but no explicit "which game am I scoring" context. A coach
  returning to the screen after a break, or a second scorer joining, has
  no quick anchor to confirm the right game is loaded.
Impact: Scorer (coach + assistant coaches), especially on multi-game
  weekends. Medium — risk of scoring the wrong game is low because game
  selection is required at entry, but context loss is real and painful
  when it happens.
Root cause: known — game context was de-prioritized in the initial
  scoring UI to maximize batter/pitch area.
Proposed fixes:
  - Option A: Compact single-line header at the very top of
    LiveScoringPanel (above the team header strip). Format:
    "Game N · Mud Hens vs Bananas 🏠" for home,
    "Game N · Mud Hens @ Bananas" for away.
    12-14px font, muted color so it doesn't compete with active scoring
    zone. ~32px vertical added.
  - Option B: Fold into the existing team header strip — single
    consolidated top row reads "Mud Hens (8U) · Game 4 vs Bananas 🏠 ·
    Offline Ready". Saves ~32px vertical but crowds the existing strip.
  - Option C: Show game context only in STATE 1 (entry / no scorer)
    where space is available; hide in STATE 2 to protect active scoring
    density.
Recommendation: Option A. Clean, non-disruptive, gives coach a durable
  "where am I" anchor without crowding the batter card. Defer Option B
  to a later layout consolidation — preferably once a future half-aware
  canvas story lands and the shared game-context concern can be solved
  across Scoring + Game Mode in one pass.
Open questions to resolve during implementation:
  - Game numbering basis: 1-indexed position in full season schedule
    (stable across the season), or index among unfinalized games (shifts
    as games are played)? Recommend stable — "Game 4 vs Bananas" stays
    meaningful all season.
  - Home/away visual: "vs" / "@" connector + 🏠 emoji (recommend), or a
    "HOME" / "AWAY" pill, or Option C's color-coded background.
  - Should the header also appear in Game Mode for parity? Likely yes —
    covered when a future half-aware canvas story consolidates the two
    views.

---

## Backlog

### Environment & Data Governance — sequencing (2026-08-25)
Six open issues, one underlying capability (repo/DB/CI don't reliably describe the same system). Sequenced by live-risk-first, not by issue number:
1. [#368](https://github.com/kaushikkuberanathan/lineup_generator/issues/368) — Smoke Test (dev) CI job runs against prod
2. [#339](https://github.com/kaushikkuberanathan/lineup_generator/issues/339) — test suites pollute prod team_memberships/access_requests
3. ~~[#735](https://github.com/kaushikkuberanathan/lineup_generator/issues/735) — finish Migration 023 (season NOT NULL) after write verification~~ — completed 2026-08-30; PROD precheck and post-apply constraint verification passed
4. [#351](https://github.com/kaushikkuberanathan/lineup_generator/issues/351) — repo/prod DB migration source-of-truth drift
5. [#348](https://github.com/kaushikkuberanathan/lineup_generator/issues/348) — no test exercises RLS as an authenticated user
6. [#379](https://github.com/kaushikkuberanathan/lineup_generator/issues/379) — populate team_data_history.write_source

### ✅ Story 15 (P1): RLS policy blocking saveTeamData calls in real-game mode
**Surfaced:** April 23, 2026 (real-game smoke test)
**Status:** Resolved v2.5.13
- Supabase RLS policy on team_data table rejecting writes from scoring session (anon key, pre-auth).
- Affects roster/schedule sync to Supabase. Does not block in-session scoring (three-layer pattern protects local state).
- Investigation: is RLS policy `allow_scorer_writes` correct? Is anon key auth state set on the Supabase client at write time?

### ✅ Story 16 (P1): "No batting order set" in real-game mode despite localStorage data
**Surfaced:** April 23, 2026
**Status:** Resolved v2.5.13 — dugoutFocusMode deadlock fixed; scorerClaimed now gates scoring surface visibility
- "No batting order set" UI message appears in real-game mode even though localStorage has full roster and batting order.
- Likely cause: team_data Supabase READ also failing (per Story 15 RLS), so React state stays empty on mount; localStorage hydration not reached.
- Fix Story 15 first, then re-test. If READ and WRITE both fail under same policy, a single RLS fix resolves both.

### Story 19 (P2 / Phase 2+): Opponent runners on bases <!-- #105 -->
- Diamond UI parity during opponent batting half — full runner advancement tracking.
- Schema: opp_runners jsonb column on live_game_state.
- Handler: hit/walk advancement branches in recordOppPitch().
- Currently only outs and runs tracked for opponent half; no runner visibility for coach.

### Story 20 (P2): Half-flip helper extraction <!-- #106 -->
- 4 code sites independently reset half-inning state: resolveAtBat 3-out, endHalfInning, recordOppPitch 3-out, confirmRunnerAdvancement 3-out.
- Extract to flipHalfInning(gs, cause) shared helper to prevent state drift across these paths.

### Story 21 (P2): "No pitches yet" stale copy <!-- #107 -->
- Minor UX bug — stale copy shown in pitch area when pitches have already occurred.

### Story 22 (P3): GitHub Actions CI queue delays <!-- #108 -->
- CI runs occasionally queue for 30+ min. Investigate: runner availability, billing limits, workflow configuration.
- Document whether intermittent or reproducible; add to Known Issues if environmental.

### Story 23 (P3): feature_flags table missing migration file <!-- #109 -->
- feature_flags table exists in Supabase but has no migration in supabase/migrations/.
- Capture DDL in supabase/migrations/ for proper schema versioning and reproducibility.

### Story 24 (P3): Orphan backend test files <!-- #110 -->
- backend/scripts/tests/ contains test-runner.js, suite-rate-limits.js, suite-validation.js.
- Cleanup decision needed: keep (document purpose) or delete (reduce confusion with CI_SAFE suite).

### ✅ Story 30 (P2): isFlagEnabled — no DB-read path; DB flip has no runtime effect without redeploy <!-- #112 -->
Status: Resolved (2026-08-27, this branch, #112)
- **Surfaced:** April 24, 2026 (post-v2.5.0 merge; DB row flipped expecting user-facing change)
- `isFlagEnabled(flagName)` is synchronous: reads `FEATURE_FLAGS[flagName]` from the JS bundle default + `localStorage.getItem('flag_' + flagName)`. It does NOT query the Supabase `feature_flags` table at runtime.
- Current rollout method: code deploy (change default in featureFlags.js) or localStorage override per device.
- Desired: DB-driven flag evaluation so ops can flip flags without a redeploy.
- Fix candidates: (A) async `isFlagEnabled` that reads Supabase `feature_flags` at app boot and caches; (B) `flagBootstrap.js` extended to fetch DB flags and merge into a runtime registry; (C) add a startup fetch in App.jsx hydration path, similar to team data load.
- Recommend (B) — keeps the evaluation function synchronous at the call site while moving the async fetch to bootstrap. Matches existing `flagBootstrap.js` pattern.
- Blocks nothing directly; current localStorage override remains available as workaround.
- Connects to Story 41: until both resolved, runtime flag changes require redeploy + can't be locally test-validated.
- **Resolution:** confirmed via direct source read that `hooks/useFeatureFlags.js`'s `fetchRuntimeFlags()` already fetched and merged Supabase `feature_flags` every session, but the result (`runtimeFlags`/`flagsLoading` in App.jsx) was only ever consulted for 2 of 6 flags (VIEWER_MODE, MAINTENANCE_MODE) — `isFlagEnabled()` itself, used by ACCESSIBILITY_V1/SCORING_SHEET_V2/COMBINED_GAMEMODE_AND_SCORING, stayed purely static+localStorage. Same replica-divergence shape as the flagBootstrap.js gap the v2.15.0 release already found and fixed elsewhere in this file. Fixed via a module-level runtime cache in `featureFlags.js` (`setRuntimeFlagCache`), wired from App.jsx's existing `useFeatureFlags()` fetch (no new Supabase call) — Option B as originally recommended above. Precedence: localStorage override > DB cache > static default. RED→GREEN mutation-verified; full frontend suite (120 files/1390 passed) + lint + build clean; manually smoke-tested against a real dev server.

### ✅ Story 26 (P2): Backend RATE-01a test flakiness — stateful against prod rate limiter <!-- #111 -->
Status: Resolved. `loginLimiter` re-keyed IP→email; rate-limit-touching integration tests use per-run-unique emails. GitHub issue closed 2026-08-26 as root-cause-resolved (see #840, #115).
- **Surfaced:** April 24, 2026 (PR #17 CI run — admin-bypassed because only CLAUDE.md changed).
- `backend/scripts/tests/suite-rate-limits.js` RATE-01a expects `403 NOT_AUTHORIZED` but gets `429 TOO_MANY_ATTEMPTS` when prior CI runs have burned through the prod backend's rate-limit cap.
- Update 2026-04-28: VAL-09 (validation, no email) is also affected by this rate limit issue, not just RATE-01a.
- Fix candidates: (A) throwaway random email per test run, (B) mock rate limiter at test boundary, (C) use dev backend instead of prod. (D) Cleanest structural fix: key loginLimiter by email instead of IP. Eliminates cross-run pollution from CI runner IPs. Side benefit: rate limit becomes meaningful for real abuse patterns (per-account) instead of per-source-IP.
- Recommendation: (D) addresses root cause; combine with throwaway-email per run from original recommendation as defense in depth.
- Blocks nothing directly but masks real regressions if NOT_AUTHORIZED behavior ever breaks.

### Story 31 (P2) — package.json version sync gate <!-- #113 -->
Status: Open
Discovered: 2026-04-28, during v2.5.2 release recon
Target: v2.5.3 or earlier
Symptom: The v2.5.2 version bump (commit 0c005e1) updated frontend/package.json
  and APP_VERSION constant in App.jsx but missed backend/package.json — caught
  only by manual recon during the release deploy. A version-mismatched ship
  would have made it to prod silently.
Impact: Production version drift between frontend and backend services. Breaks
  any client that does version-pinning. Breaks any analytics or telemetry that
  joins on app_version. Hard to detect without a manual audit.
Root cause: Known — manual three-file sync (App.jsx APP_VERSION +
  frontend/package.json + backend/package.json) with no automated guard. Easy
  to miss one.
Proposed fixes:
  A) Vitest test asserting frontend/package.json.version ===
    backend/package.json.version === APP_VERSION constant. Fails CI if drifted.
    Cheap.
  B) Pre-commit hook validating the same. Fails locally before commit. More
    invasive.
  C) Single source of truth — one VERSION file imported by all three. Bigger
    refactor.
Recommendation: A — test gate runs in CI, blocks PR merge if drifted, doesn't
  change developer workflow. Lowest cost, highest reliability.

### ✅ Story 32 (P3) — Pre-push hook retry hides OOM failures
Status: Resolved (v2.5.3, this branch — bundled with Story 37 Husky update)
Discovered: 2026-04-28 (re-flagged across multiple sessions)
Target: Next infra patch
Symptom: .husky/pre-push runs `cd frontend && npm test || npm test`. The retry
  exists to mask Windows Vitest cold-start OOM cascades, but it also masks
  legitimate test failures — a real failure on first run gets a free retry on
  warm cache, and the hook reports green.
Impact: Test failures can slip past the local pre-push gate to develop,
  surfacing only in GitHub Actions CI. Slower feedback loop. CLAUDE.md
  explicitly states the hook should be `cd frontend && npm test` only.
Root cause: Known — workaround for Windows Vitest cold-start OOM that was never
  reverted after the underlying issue was supposed to be addressed.
Proposed fixes:
  A) Remove retry. Accept that pushes occasionally fail and need re-run.
    Restores the explicit gate per CLAUDE.md.
  B) Increase Vitest worker memory to eliminate the OOM root cause, then remove
    retry. Stable but requires tuning.
  C) Switch to Vitest --pool=forks --poolOptions.forks.singleFork. Slower but
    no OOM. Then remove retry.
Recommendation: B if straightforward to tune; otherwise A. Either way, restore
  the explicit gate. Status quo violates CLAUDE.md.

### ✅ Story 33 (P3) — VERSION_HISTORY techNote validation
Status: Resolved (v2.5.3, fd2e069)
Discovered: 2026-04-28, during v2.5.2 release recon
Target: Next infra patch
Symptom: A prior v2.5.2 docs commit used a non-compliant techNote string
  ("UX improvement and new reusable Toast component") instead of one of the four
  pre-approved generic strings. Caught only by manual review during release recon.
Impact: Release notes lose their generic-string firewall — internal-detail
  leakage into user-facing release notes. The four-string convention exists to
  keep release notes coach-friendly; nothing currently enforces it.
Root cause: Known — convention documented in CLAUDE.md but no automated check.
Proposed fixes:
  A) Vitest test asserting every VERSION_HISTORY entry has a techNote in the
    approved set: 'Bug fixes and performance improvements' / 'Under-the-hood
    stability improvements' / 'Performance and reliability improvements' /
    'Minor fixes and internal improvements'. Fails CI if violated.
  B) ESLint custom rule on VERSION_HISTORY array literal. More invasive.
  C) Pre-commit hook check on App.jsx changes. Local-only; CI still vulnerable.
Recommendation: A — test gates are cheaper than hooks and run in CI for both
  local and PR pushes.

### ✅ Story 34 (P3) — FEATURE_MAP row numbering audit <!-- #114 -->
Status: Resolved (2026-08-27, this branch, #114)
Discovered: 2026-04-28, during v2.5.2 docs gap closure
Target: Next docs cleanup patch
Symptom: docs/product/FEATURE_MAP.md row numbering has out-of-sequence rows.
  Row 23 sits between rows 15 and 16 (confirmed insertion-order artifact, not a
  deletion gap). Future inserts may compound the disorder.
Impact: Cosmetic. Makes the table harder to navigate and audit. Coverage summary
  math depends on accurate row count, so a future delete or insert without full
  renumber could silently corrupt the totals.
Root cause: Known — row 23 was inserted out of position rather than appended;
  no renumber applied at the time.
Proposed fixes:
  A) Audit and renumber rows sequentially 1..N. Update all backreferences.
    Confirm coverage summary still accurate.
  B) Switch to a different row identifier scheme — section.subsection (1.1,
    1.2) or feature codes — and stop relying on monotonic integers.
  C) Leave as-is, accept the cosmetic debt.
Recommendation: A in a focused docs cleanup commit — low risk, restores
  consistency. Defer B unless A surfaces deeper structural issues.
Note: the "Completed 2026-05-14" note this section previously carried described
  a *different* renumbering — a ROADMAP.md-internal backlog hygiene pass (Story
  27 collision, gaps 17/18/25/52), not this issue's actual subject. It never
  touched FEATURE_MAP.md's `#` column, which was still genuinely out of order
  (rows ...11, 25, 26, 27, 28, 12, 13...) as of 2026-08-27, confirmed by direct
  read before starting this fix.
Resolution (Option A, 2026-08-27): FEATURE_MAP.md's 40 rows renumbered
  sequentially 1-40 to match display order via a small Python script (mapped
  old→new by position, rewrote only the leading `#` column per matched row —
  19 of 40 rows changed number). Backreferences ("row N") *within*
  FEATURE_MAP.md were deliberately left untouched in dated historical notes
  (the header's "previously updated" log and the Coverage Summary's dated
  recount notes) to preserve an honest historical record — a banner was added
  instead, next to the file's "Last updated" line, explaining that older
  dated notes cite the row number that was correct at the time and won't
  match a current lookup. The one evergreen cross-file pointer found
  (`ROADMAP.md`'s own Story 124 entry, "see FEATURE_MAP.md row 38") was
  updated to the new number (39). Other cross-file mentions in
  `DOC_TEST_DEBT.md`, `SESSION_RETROSPECTIVES.md`, and
  `DOC_AUDIT_SPIKE_2026-08-04.md` are dated historical entries and were left
  alone for the same reason.

### ✅ Story 35 (P3) — CLAUDE.md docs drift on rate limiter state
Status: Resolved (v2.5.3, this branch)
Discovered: 2026-04-28, during PR #29 diagnostic
Target: Next infra patch
Symptom: CLAUDE.md (and the RATE-01b comment in suite-rate-limits.js line 41-44)
  state the magic-link rate limiter was removed in v2.3.3. Backend code shows the
  limiter has been live continuously since commit 91aaf43 (April 6, 2026).
  Documentation was factually incorrect.
Impact: Misleads future debugging. The PR #29 diagnostic took longer than
  necessary because operators had to disprove the "limiter was removed" claim
  before reaching root cause. Doc trust degraded.
Root cause: Known — claim was made in code comments when the limiter was
  apparently planned for removal but the removal commit never landed. No
  subsequent doc correction.
Proposed fixes:
  A) Audit CLAUDE.md and any related docs/comments for "rate limiter removed"
    claims; correct to current state with the loginLimiter spec (5 req per
    15 min, IP-keyed).
  B) Add the limiter spec to the "## Auth Strategy" section of CLAUDE.md as a
    permanent reference.
  C) Update RATE-01b comment in suite-rate-limits.js to reflect actual code
    state.
Recommendation: All three — small focused docs commit. Pair with Story 26 fix
  for one clean PR.

### Story 36 (P3) — CI backend integration tests don't account for double-trigger request volume <!-- #115 -->
Status: Open
Discovered: 2026-04-28, during PR #29 CI failure
Target: Next infra patch
Symptom: Commit b92fdb3 (April 22, 2026) added pull_request triggers to backend
  integration tests without updating the tests for the doubled request volume.
  Push event hits /magic-link 3x; PR open event re-runs minutes later, totaling
  6+ requests within the 15-minute rate-limit window. Multi-commit develop
  branches compound the count further (n commits × 3 = 3n requests).
Impact: PRs systematically fail CI on the rate-limit tests when develop has had
  recent activity. False positives erode trust in CI as a real merge gate. PR
  #29 was merged with red CI on this basis — establishes a precedent that should
  not become routine.
Root cause: Known — workflow trigger expansion without corresponding test
  infrastructure update.
Proposed fixes:
  A) Skip backend integration tests on pull_request events when the same commit
    was already tested on push (deduplication via commit SHA cache).
  B) Add a wait-for-rate-limit-window step before running magic-link tests on
    PR events.
  C) Fix at the test layer per Story 26 — make tests rate-limit-aware so the
    trigger volume doesn't matter.
  D) Run integration tests against a separate test backend with a higher rate
    limit (was deleted April 27 per memory — would require standing it back up).
Recommendation: C as primary (tests should be robust regardless of trigger
  pattern), A as bonus (doesn't hurt to deduplicate). Skip D unless other
  reasons emerge to revive a test backend.

### ✅ Story 37 (P2) — Branch strategy enforcement gap
Status: Resolved (v2.5.3, this branch)
Discovered: 2026-04-28, during v2.5.2 retrospective
Target: Next infra patch
Symptom: Documented branch strategy requires feature/fix branches → develop →
  main, but v2.5.2 work bypassed the feature branch layer entirely. Code
  committed directly to develop, mixing three concurrent work streams (count
  strip, Toast, mercy banner) before promotion to main. PR #29 diff was noisy;
  rollback unit was the entire develop diff rather than isolated features.
Impact: Three concrete costs already paid: noisy PR review, no isolated rollback
  unit per feature, prior v2.5.2 docs commit was incomplete because work streams
  committed to develop without changelog coordination. Pattern will repeat under
  any momentum-heavy session.
Root cause: Known — discipline-only enforcement of branch strategy. No local or
  remote guard rejects direct commits to develop.
Proposed fixes:
  A) Discipline-only: Claude proposes feature branch as first action of every
    session. Will fail under high-momentum sessions.
  B) Local pre-push hook rejecting direct pushes to develop/main without
    ALLOW_DIRECT_PUSH=1 override. Hard local guard, soft escape hatch for
    hotfixes. Pairs with Story 32 hook cleanup.
  C) GitHub branch protection on develop. Strongest enforcement but changes
    routine workflow significantly.
Recommendation: B. Hard guard for the failure mode we demonstrated, escape
  hatch for genuine hotfixes, no remote workflow change. Bundle with Story 32
  (pre-push hook fix) so we touch the hook once.

---

### Story 38 (P2) — userChanges token scanner <!-- #116 -->
Status: Open
Discovered: April 2026 — v2.5.3 techNote guard release closed the techNote
  leak vector but left userChanges freeform prose with only documentation as
  guard
Target: v2.6.x
Symptom: Technical jargon, component names, internal tooling references can
  land in coach-facing userChanges bullets with no automated catch. v2.4.0
  surfaced "LiveScoringPanel", "ScoreboardRow", "GameContextHeader" before
  techNote-side mitigation; userChanges has the same exposure.
Impact: Coaches see jarring developer language. Product polish degrades. Trust
  erodes over time as a fixed-pool techNote sits next to a leaky userChanges
  layer.
Root cause: Known. CLAUDE.md UPDATES TAB CONTENT RULE is
  documentation-as-fence. No automated enforcement on userChanges authoring.
Proposed fixes:
  A. Token denylist scan — Vitest assertion against banned substrings:
     refactor, middleware, hook, RPC, migration, CI, *Panel, *Row, *Header,
     /component$/, /^Add(ed)? \w+$/. Per-entry override allowed via inline
     comment for legitimate edge cases. Low complexity, fits existing Vitest
     pattern. Risk: false positives on legit copy ("refactored to one-tap
     workflow").
  B. Allowlist of coach-language patterns — too restrictive, brittle, will
     reject legitimate copy.
  C. LLM-grade review at build time — overkill, slow, introduces external
     dependency on every CI run.
Recommendation: A. Ship a tight banned-token list (≤10 patterns), per-entry
  escape hatch via // override comment, mutation-test the guard before merge.

---

### ✅ Story 39 (P3) — Typed VERSION_HISTORY schema validator <!-- #117 -->
Status: Resolved. Option A shipped via `frontend/src/__tests__/versionHistory.test.js` (PR #257/#258, 2026-05-30, story #256). GitHub issue closed 2026-08-26 — tracker was never closed after the validator landed.
Discovered: April 2026 — pattern recognized after two structural regressions
  (v2.2.12/13 missing entries killed the Current badge; v2.4.0/v2.3.4
  techNote violations slipped past)
Target: v2.7.x or later
Symptom: Missing required fields, malformed entries, structural drift can
  land in VERSION_HISTORY without test coverage. Updates tab silently
  degrades — missing badge, missing headline, malformed bullets.
Impact: Coach-facing tab loses signal. Same regression class as the techNote
  leaks: documentation-only fences fail under deploy pressure.
Root cause: Hypothesis. Pattern across two distinct regressions suggests
  structural validation gap, not authoring discipline gap.
Proposed fixes:
  A. JSDoc + Vitest schema check — assert every entry has version (semver),
     date (string), headline (string), userChanges (array), techNote (in
     approved set or null), internalChanges (array). Pragmatic, no new deps,
     fits current Vitest pattern. Augments the existing techNote test.
  B. Migrate versionHistory.js to TypeScript — real type safety, but
     introduces TS to a JS-only codebase for one file. Big surface area for
     small payoff.
  C. Zod schema with parse-on-import — runtime validation, catches drift at
     app boot. Adds dependency for one file. Fail-loud at boot is risky for
     a PWA.
Recommendation: A. Stay in Vitest, no new deps, no language migration.
  Revisit B only if TS adoption broadens elsewhere.

### Pre-push hook: skip test suite on docs-only changes
- **Problem:** Pre-push hook runs full `npm test` on every push, including docs-only PRs. Cold-cache runs OOM (~6+ min environment setup) and force `--no-verify` bypass. Warm-cache runs are 78s but still wasteful for changes that touch zero code.
- **Proposed fix:** In the pre-push hook, detect whether the diff vs `origin/develop` contains any non-docs files. If only `docs/`, `*.md`, or `CLAUDE.md` files changed, skip the test suite with a printed notice. Otherwise run tests as today.
- **Sketch:**
```bash
  CHANGED=$(git diff --name-only origin/develop..HEAD)
  if echo "$CHANGED" | grep -vE '^(docs/|.*\.md$|CLAUDE\.md$)' | grep -q .; then
    npm test || exit 1
  else
    echo "Docs-only change detected — skipping test suite."
  fi
```
- **Why now:** Hit twice during recent docs pushes (v2.5.3 docs addendum, SECURITY_FRAMEWORK.md). Friction will compound as docs cadence increases.
- **Risk:** Low. Hook still gates code changes. Docs PRs already have human review at GitHub before merge.
- **Effort:** ~30 min. One file change in `.husky/pre-push` or equivalent hook script.
- **Priority:** Low — quality-of-life, not blocking. Pick up during a slow sprint or alongside next CI/tooling work.
- **Related:** Complementary to the "Investigate Windows Vitest pre-push hook OOM cascade" item at the top of this ROADMAP under v2.6.0 Infrastructure. That item targets root-cause OOM mitigation; this item is a fast-path workaround for docs-only changes. Either solves the docs-push pain; together they harden the full hook.
- **Origin:** Surfaced during SECURITY_FRAMEWORK.md push 2026-04-30; bypassed that push with `--no-verify` after manual test run confirmed clean.

---

### ✅ Story 45 (P3) — Husky v10 + doc drift cleanup
Status: Resolved in v2.5.7 hook fix (2026-05-06)
Discovered: 2026-05-02 (branch hygiene session)
Target: v2.5.7 ✓
Symptom: Four low-friction issues bundled together:
  1. Pre-push hook prints Husky v10 deprecation warning on every push
     ("Please remove the following two lines from .husky/pre-push:
      #!/usr/bin/env sh / . "$(dirname -- "$0")/_/husky.sh"").
     Will become a hard failure in v10.0.0.
  2. CLAUDE.md test count reads 434; actual suite is 437 passed / 1 skipped
     (delta: versionHistory.test.js + accessibility.v1.test.js added in v2.5.3/v2.5.4).
  3. Hook fires false-positive block on `git push origin --delete <branch>`
     when current branch is develop — the branch-guard regex matches develop
     regardless of whether code is being pushed.
  4. Hook fires false-positive block on cross-worktree pushes from develop
     (second worktree at lineup-generator-ux is undocumented in CLAUDE.md).
Impact: Low — common path works correctly. Noise on edge cases (branch deletes,
  cross-worktree pushes). Will become blocking when Husky v10 ships.
Root cause: Known for all four items:
  1. Husky shebang block deprecated in v9, removed in v10.
  2. Test count in CLAUDE.md not updated when new test files shipped.
  3. Pre-push hook branch guard checks the current branch, not the ref being pushed.
  4. Worktree was created without a CLAUDE.md documentation step.
Proposed fixes:
  (a) Strip the two deprecated shebang lines from .husky/pre-push.
      Add --delete short-circuit: if the push deletes a remote ref (new SHA is
      all zeros), skip test run and branch guard. Update CLAUDE.md test count
      to 437. Add worktree note to CLAUDE.md Infrastructure section.
  (b) Defer indefinitely; accept noise; use ALLOW_DIRECT_PUSH=1 override on
      edge cases.
Recommendation: (a) — all four are one-liners. Bundle as a single chore PR.
  Effort: ~30 min. No behavior change on the common push path.

---

### ✅ Story 46 (P1) — Slice 2 — Combined View Layout Shell
Status: Resolved in v2.5.7 (2026-05-04)
Discovered: 2026-05-03 (post-Slice 1 smoke test on dev; COMBINED_GAMEMODE_AND_SCORING flag ON)
Target: v2.5.7 ✓

Three sub-items, all surfaced when the combined-view flag is enabled on dev:

**Sub-item 1: BattingOrderStrip does not advance with scoring engine**
Strip reads App's localStorage `currentBatterIndex`. Scoring engine maintains its own `batting_order_index` in `live_game_state`. The two are not synchronized — strip stays static while scoring engine advances batters internally.

**Sub-item 2: Bases diamond clipped at 375px viewport**
At 375px, the bases diamond visualization is clipped at the bottom — home plate not visible during active scoring. `LiveScoringPanel` was sized for full-screen presence pre-stacking; BattingOrderStrip above it reduces available vertical space without any corresponding layout adjustment.

**Sub-item 3: Pitch map masked by scoring CTAs at 375px viewport**
Pitch map (at-bat pitch history) is obscured behind the row of scoring outcome CTAs. Pitch buttons are `position: fixed` at `bottom: 60px` (nav clearance) and do not adapt to the reduced viewport height when BattingOrderStrip is stacked above `LiveScoringPanel`.

**Impact:** Combined view is not pilot-ready until all three are resolved. Coaches cannot trust a static strip; clipped diamond hides base runner state; masked pitch map loses at-bat history visibility.

**Root cause:**
- Sub-1: Two sources of truth between App's `currentBatterIndex` and `useLiveScoring`'s internal batter index. Slice 2 architectural call: introduce derived `dugoutFocusMode` state — when `'scoring'`, strip reads from the scoring hook; when `'lineup'`, strip reads from App. Single source per mode; focus-mode state machine arbitrates.
- Sub-2/3: 375px vertical space budget exceeded when `BattingOrderStrip` stacks above `LiveScoringPanel`. Layout pass needed to compress non-essential vertical space, or collapse strip to compact mode when scoring is active.

**Proposed fixes (one Slice, all three together):**
- (a) Lift `currentBatterIndex` (and `currentInning`) to App as single source of truth. Wire both into DugoutView via props. Introduce `dugoutFocusMode` derived state (`'lineup'` | `'scoring'`) that selects which batter-index source the strip displays.
- (b) `ScoreboardRow` accepts new inning + half-inning props (the deferred Slice 1 test substitution "renders inning + half-inning indicator" becomes implementable — RED → GREEN).
- (c) Compact-mode layout for `BattingOrderStrip` when `dugoutFocusMode === 'scoring'` (smaller pill height, recover ~40px vertical). Reduce `LiveScoringPanel`'s diamond top padding. Verify pitch map z-index above scoring CTAs row.
- (d) Tests: state machine transitions (`lineup` → `scoring` → `lineup`), regression for Sub-1 (scoring advance updates strip), 375px viewport snapshot tests for Sub-2/3.

**Recommendation:** Single Slice 2 PR. Target v2.5.6 (patch) if architecture stays clean; v2.6.0 (minor) if state-machine extraction warrants the bump.

---

### Story 47 (P3) — ScoreboardRow active-half visual indicator <!-- #118 -->
Status: Open
Discovered: 2026-05-03 (smoke test enhancement request)
Target: Slice 2 if layout slack; Slice 3 polish pass otherwise

**Symptom:** Currently-batting team's scoreboard label has no animated affordance. Yellow inning indicator (▲ 2) carries some signal, but a pulsing dot or animated underline next to the team label during their at-bat would be more glanceable from the dugout.

**Impact:** UX polish, not a defect. Coaches infer batting team from inning indicator today.

**Proposed fix:** Add `isAtBat` boolean prop to `ScoreboardRow`; render a small pulsing dot next to the team label whose half is active.

**Recommendation:** Implement during Slice 2 if there is layout slack; defer to Slice 3 polish pass otherwise.

---

### ✅ Story 50 (P1) — DugoutView exit affordance
Status: Resolved in v2.5.7 fix-up (2026-05-04)
Discovered: 2026-05-04 (Slice 2 dev soak smoke test)
Target: v2.5.7 (in-line fix, no version bump) ✓

**Symptom:** Combined view lineup mode (DefenseDiamond view) had no exit button. Coach was trapped in DugoutView with only browser back — invisible in PWA install mode.

**Root cause:** Slice 2 introduced `dugoutFocusMode='lineup'` state without adding an exit affordance. Pre-Slice 2, only entry state and scoring state existed, both with exit wired. No test asserted exit button presence in either mode.

**Resolution:** Lifted exit affordance to `ScoreboardRow` via optional `onExit` prop (absolute-positioned `✕` button, 44×44px touch target, `aria-label="Exit"`, `data-testid="scoreboard-exit"`). ScoreboardRow is persistent across both modes — exit is now always visible when scoring is active. `DugoutView` passes `onExit` through to its `ScoreboardRow` mount. Regression tests added for both modes + `ScoreboardRow` prop behavior. Suite: 510 → 516 passing.

---

### Story 48 (P2) — Auto-sync defense view inning to scoring inning <!-- #119 -->
Status: Open
Discovered: 2026-05-04 (Slice 2 scope lock — Council session)
Target: Post-pilot validation cycle (v2.6.x)

**Symptom:** Coach in DugoutView 'lineup' mode (or GameModeScreen) can be viewing inning 4 lineup while the game is in inning 2. Dugout state doesn't track scoring state automatically.

**Impact:** Cognitive load — coach has to manually scrub to the current inning before making swap decisions. Easy to make a swap on the wrong inning's grid.

**Root cause:** DefenseDiamond uncontrolled mode + `GameModeScreen.initialInning` are persisted-display state (`gameModeInning` in App.jsx), never reconciled with `gameState.inning` from `useLiveScoring`.

**Proposed fixes:**
- Option 1: Auto-sync — when scoring inning advances, defense view follows. Simplest. Loses scrubbing capability mid-game.
- Option 2: Soft-sync — show "View: Inning 4 / Game: Inning 2" indicator + "Jump to current" button. Preserves scrubbing.
- Option 3: Hybrid — auto-sync on inning advance from scoring, but coach scrubbing locks the view until they tap "Resume sync".

**Recommendation:** Option 2 for first pass. Preserves coach agency (scrubbing for swap planning is a real use case) while making drift visible. Revisit if pilots show coaches don't notice the indicator.

---

### ✅ Story 49 (P2) — Feature flag key scheme normalization <!-- #120 -->
Status: Resolved (2026-08-27, this branch, #120) — additive fix, not the full consolidation originally recommended below
Discovered: 2026-05-04 (Slice 2 dev soak)
Target: v2.6.x

**Symptom:** Three different localStorage key conventions for the same flag:
1. `flag:combined_gamemode_and_scoring` — App.jsx:1530, lowercase colon
2. `flag_COMBINED_GAMEMODE_AND_SCORING` — `isFlagEnabled()`, uppercase underscore
3. `?enable_flag=<as-typed>` via `flagBootstrap.js` — caller-controlled, no normalization

Coaches enabling flags via console must guess which form the specific check uses. Documentation in `feature-flags.md` is inconsistent with code reality.

**Impact:** Mobile/console flag enabling is unreliable. Dev soak 2026-05-04 burned ~45 minutes diagnosing this.

**Root cause:** Two flag systems coexist (direct `localStorage` checks + `isFlagEnabled()` hook) with different conventions. `flagBootstrap.js` writes whatever the URL param says, leaving consumers to converge independently.

**Proposed fixes:**
- Option 1: Consolidate to single scheme. Migrate all direct checks to `isFlagEnabled()` with case-normalized keys. Update bootstrap to write the canonical form. (**Recommended**)
- Option 2: Document convention strictly per-flag in `featureFlags.js` + add lint rule preventing direct `localStorage.getItem("flag:*")` calls outside the registry.
- Option 3: Bootstrap util writes BOTH forms (colon-lowercase + underscore-uppercase) to eliminate ambiguity at the cost of storage redundancy.

**Recommendation:** Option 1 — consolidate to `isFlagEnabled()` everywhere. Adds clean migration code (read both forms, write canonical, delete legacy). Long-term simplest. Largest commit but worth it.

**Resolution (2026-08-27):** Shipped Option 3 instead of the recommended Option 1 — judged full consolidation (removing the legacy `flag:` form entirely) too high-blast-radius for a batch pass, since `MAINTENANCE_MODE` is the whole-app kill switch and `VIEWER_MODE` gates the public share-link viewer, both explicitly protected by the Auth Principle's "must never require login" guarantee. `flagBootstrap.js`'s `applyFlagParams()` now writes both key forms on every enable/disable (additive, zero regression risk — every existing reader of either key keeps working unchanged). App.jsx's `MAINTENANCE_MODE`/`VIEWER_MODE` gates extended with an `isFlagEnabled()` OR-check alongside their existing checks, so the canonical form now works for those two flags too. `docs/features/feature-flags.md` updated — it had its own real drift beyond just the scheme-inconsistency this story tracks (a stale claim that App.jsx ran a separate inline copy of the URL-bootstrap logic instead of importing `flagBootstrap.js`; that wiring was actually fixed 2026-08-26 per #406/#410 Pass 4, the doc just never caught up). Full consolidation (true Option 1) remains a legitimate follow-up if the dual-scheme confusion resurfaces, but is deliberately not this fix.

**Test plan:** Every flag in `featureFlags.js` should have a unit test asserting both legacy localStorage keys (if any) resolve correctly during migration window.

---

### Story 51 (P2) — Document flag enabling pattern in feature-flags.md <!-- #121 -->
Status: Open
Discovered: 2026-05-04 (Slice 2 dev soak — flag scheme triage)
Target: v2.6.x or alongside Story 49

**Symptom:** `docs/features/feature-flags.md` doesn't tell coaches or developers which exact `localStorage` key to set for any given flag. The Current Flags table lists flag names but not the console enable command, leaving callers to guess which form the specific check uses.

**Impact:** Future flag rollouts will hit the same case-mismatch issue. Dev soak 2026-05-04 lost ~45 min to this.

**Recommendation:** Until Story 49 normalizes the scheme, add a per-flag "console enable" column to the Current Flags table in `feature-flags.md` showing the **exact** `localStorage.setItem(...)` call that activates each flag. Example:

| Flag | Default | Console enable |
|------|---------|----------------|
| `COMBINED_GAMEMODE_AND_SCORING` | `false` | `localStorage.setItem('flag:combined_gamemode_and_scoring', '1')` |
| `ACCESSIBILITY_V1` | `true` | `localStorage.setItem('flag_ACCESSIBILITY_V1', 'true')` |

This is a docs-only change with zero risk. Should ship in the same PR as or before Story 49's implementation.

---

### ✅ Story 53 (P3) — Pre-push hook scope correction
Status: Resolved in v2.5.7 hook fix (2026-05-06)
Discovered: 2026-05-06 (during v2.5.7 release session — blocked `git push -u origin chore/sync-main-into-develop`)
Target: v2.5.7 ✓

**Symptom:** `.husky/pre-push` hook blocked ANY `git push origin ...` operation when HEAD was on develop, including pushes to non-protected remote refs (e.g. `chore/sync-main-into-develop`). Hook should only block pushes that update the develop or main tip on the remote, not pushes to other remote refs.

**Root cause:** Hook read `git rev-parse --abbrev-ref HEAD` (the local branch name) instead of parsing Git's stdin refspec list. When HEAD=develop and you push to `origin/chore/sync-main-into-develop`, HEAD is still `develop` — hook blocked.

**Fix applied:** Hook now reads stdin per Git's pre-push protocol (`<local-ref> <local-sha> <remote-ref> <remote-sha>`). Only blocks when `remote_ref` is exactly `refs/heads/develop` or `refs/heads/main`. Deletions (all-zeros SHA) always pass through. Also removed two Husky v9-deprecated shebang lines (Story 45 item 1).

**Relationship to Story 45:** Resolves Story 45 items 1 (deprecated shebang) and 3 (--delete false positive, same root cause). Story 45 fully resolved.

---

### ✅ Story 54 (P3) — Slice 4: ScoringMode + ViewerMode component deletion
Status: **Resolved (partial) in v2.5.11** — see release entry at top of file
Discovered: 2026-05-07 (post-Slice 3 dead-code audit)
Shipped: 2026-05-13 (PR for feature/story-54-slice-4-cleanup)

**What was actually deleted:**
- `frontend/src/components/ScoringMode/index.jsx` (legacy root)
- `frontend/src/components/ScoringMode/README.md`
- `frontend/src/components/Viewer/ViewerMode.jsx`
- `frontend/src/components/Viewer/ViewerMode.test.jsx`
- `frontend/src/components/Viewer/` directory (became empty)

**What was NOT deleted, and why:**
- `frontend/src/components/ScoringMode/` directory remains because `game-mode/DugoutView.jsx` imports `ScoringModeEntry`, `LiveScoringPanel`, and `RestoreScoreModal` directly from it (lines 17–19). These three plus their transitive imports (`FinishGameModal`, `GameModeGearMenu`, `LiveScoreViewer`, `RunnerConflictModal`) are the live game-day surface. The original Story 54 framing — "delete the directory" — was based on the assumption that the whole directory was dead. Recon proved it half-live.

**Risk realization:** Original Story 54 risk was assessed "Low — no import sites remain". That assessment was wrong. Slice 3 only removed the App.jsx-level imports; DugoutView's deeper imports into ScoringMode/ child components survived Slice 3 unaltered. A clean directory deletion would have broken the build immediately on `DugoutView.jsx:17`.

**Follow-up (optional, not blocking anything):**
Move the 7 live ScoringMode children into `components/game-mode/scoring/`, update DugoutView's 3 import lines, update 3 test-file imports (`runnerPlacement.test.js`, `scoringModeEntry.upcoming.test.js`, `scoringSheetV2.test.js`), then `git rm -r components/ScoringMode/`. ~93 KB of source move; clear blast radius. Treat as a standalone refactor PR.

**Bonus finding (defer):** `LiveScoreViewer.jsx` is an 86-byte stub returning `<div>LiveScoreViewer</div>` and is rendered at `LiveScoringPanel.jsx:289`. Cosmetic dead code rendered inside the live scoring panel. Touch in a focused cleanup, not now — modifying `LiveScoringPanel.jsx` risks accidental game-day behavior changes.

### Story 55 (P3) — PR merge-target validation <!-- #122 -->
Status: Open
Discovered: 2026-05-11 — during v2.5.10 promotion divergence investigation
Target: TBD
Symptom: PR #57 was titled "chore: sync main (v2.5.8) into develop" but
was merged into `main` instead of `develop`. The PR added 452 lines of
test coverage and a UX_REFACTOR_ROADMAP docs update that landed on main
rather than develop, contributing to the main/develop divergence that
caused 9 file conflicts on PR #64.
Impact: Single-instance silent misrouting. No user impact (content was
eventually mirrored to develop), but ~45 min of recovery time during
the v2.5.10 promotion. Future occurrences could drop substantive work
or create more painful reconciliations.
Root cause: Hypothesis — PR base/compare dropdown defaulted to wrong
target; reviewer did not catch the mismatch between title and target.
Proposed fixes:
  - (a) GitHub PR template with explicit "Target branch: [develop|main]"
        field that must be acknowledged
  - (b) GitHub Action to validate PR title regex against base branch
        (e.g., titles containing "into develop" must target develop)
  - (c) Branch protection rule requiring approval from a non-author
        reviewer for any merge into main
Recommendation: (b) — highest leverage, automated, low overhead,
catches exactly this pattern. (c) is good general hygiene independent
of this story. (a) is weak (humans skip checkboxes).

### Story 56 (P3) — Vite CJS Node API deprecation <!-- #123 -->
Status: Open
Discovered: 2026-05-11 — during v2.5.10 Vitest suite run
Target: TBD (before Vite drops CJS support)
Symptom: Frontend test run emits two deprecation warnings on every run:
  1. "The CJS build of Vite's Node API is deprecated"
  2. "esbuild option was specified by vite:react-babel plugin. This
      option is deprecated, please use oxc instead."
Impact: None today (warnings only, tests pass). Future Vite major
version bump will drop CJS support, at which point the test pipeline
breaks.
Root cause: Known — vite.config.js and/or its plugins use CJS-style
require/exports and pass esbuild options to a plugin that now prefers
oxc.
Proposed fixes:
  - (a) Migrate vite.config.js to ESM (export default) and update
        plugin options to use oxc instead of esbuild
  - (b) Pin Vite at current major and defer the migration
Recommendation: (a) — small one-off migration, no behavior change,
removes a known future blocker. Can be done as a chore PR alongside
or independent of any feature work.

### Story 57 (P3) — PR conflict-resolution playbook in CLAUDE.md <!-- #124 -->
Status: Open
Discovered: 2026-05-11 — during v2.5.10 promotion divergence recovery
Target: TBD (docs hygiene)
Symptom: CLAUDE.md does not document the conflict-resolution decision
tree for handling divergence between long-lived branches
(develop ↔ main). The v2.5.10 promotion process invented this on the
fly and lost ~45 min recovering from a wrong choice (sync-branch +
squash-merge erased the merge-commit ancestry needed for the
destination PR to see resolution).
Impact: Procedural — every divergence recovery rediscovers the same
trade-offs from scratch.
Root cause: Known — undocumented procedure.
Proposed fixes:
  - (a) Add a section to CLAUDE.md titled "Conflict resolution when
        develop ↔ main diverge" with this decision tree:
        * If conflicts are mechanical (one side wins everywhere):
          resolve directly on the destination PR via GitHub web editor.
          Creates a real merge commit, preserves ancestry.
        * If conflict resolution needs substantive review/audit: cut a
          sync branch off destination, merge source into it, PR
          sync-branch → destination, USE "Create a merge commit" option
          (NOT squash) to preserve ancestry.
        * Avoid: sync-branch + squash-merge (erases ancestry,
          destination PR re-conflicts).
        * Avoid: direct push to develop/main with ALLOW_DIRECT_PUSH
          (bypasses safety gates that exist for exactly this kind of
          pressure).
Recommendation: (a) — write it once, save the recovery time next time.

### Story 58 (P3) — v2.5.9 release-note wording correction <!-- #125 -->
Status: Open
Discovered: 2026-05-11 — during v2.5.10 rollback safety audit
Target: TBD (docs hygiene; can be batched with any v2.5.10+ docs sweep)
Symptom: v2.5.9 commit message (PR #60) and the v2.5.9 entry in
versionHistory.js claim "legacy ScoringMode removed." Diagnostic
confirmed frontend/src/components/ScoringMode/index.jsx still exists
on develop and main — only the default flag and routing were changed.
Wording overstates the change.
Impact: Misleading audit trail. Future readers (humans or AI assistants
with stale context) may believe ScoringMode files are physically
deleted when they are not. Affects rollback planning conversations and
search-grep mental models.
Root cause: Known — wording in v2.5.9 commit and release notes was
imprecise.
Proposed fixes:
  - (a) Correct the VERSION_HISTORY entry for v2.5.9 to read:
        "DugoutView default-on as of Slice 3. ScoringMode routing
        removed; ScoringMode/index.jsx file persists for
        explicit-flag-override fallback."
  - (b) Leave it as-is; document the correction in a separate
        "errata" section
Recommendation: (a) — VERSION_HISTORY is authoritative documentation
and should be precise. Cost is a single entry edit.

### ✅ Story 59 (P3) — Unused `tokens` import in PlayerHandBadge.jsx
Status: Resolved — fix path (a) shipped via PR #68 (squash `66a4586` on develop, 2026-05-13)
Discovered: 2026-05-12 — Phase 3 Step 2 prep diagnostic
Target: v2.5.11 (batched into Phase 3 Step 2 PR)
Symptom: frontend/src/components/PlayerHandBadge.jsx imports `tokens`
from `../theme/tokens` on line 3. The import is unreferenced in the
file body. Auto-merge artifact from PR #64's web-editor conflict
resolution: main's `tokens` import auto-merged alongside develop's
Phase 3 Step 1 implementation rewrite, which uses Badge primitive and
no longer references tokens directly.
Impact: Lint debt only — tree-shaking removes the import from the
bundle. ESLint no-unused-vars would flag this on a strict run; current
CI passes, so lint is not currently gated at --max-warnings 0 (worth
a separate audit, not in scope of this story).
Root cause: Known — non-conflicting hunks from main side auto-merged
into the web-editor resolution; the resolver only saw and resolved the
conflicting implementation hunk.
Proposed fixes:
  - (a) Remove the unused `import { tokens } from '../theme/tokens';`
        line. Batch into Phase 3 Step 2 PR alongside Home/index.jsx
        migration; call out the cleanup explicitly in the PR body.
  - (b) Cut a separate `chore/cleanup-unused-tokens-import` branch for
        a focused single-line cleanup.
Recommendation: (a) — single-line cleanup does not deserve its own PR
ceremony, and the Phase 3 Step 2 PR is contextually adjacent (same
components directory).

### Story 60 (P3) — Token coverage gaps surfaced in EmptyState migration <!-- #126 -->
Status: Resolved
Resolved: 2026-05-29 — PR #247
Resolution: Added font.size.mdLg (15px) and color.text.body (#374151) tokens; extended Text primitive's SIZE_MAP and COLOR_MAP; migrated EmptyState title and FAQSection answer body to token references.
Discovered: 2026-05-13 — Phase 3 Step 2 PR #68 EmptyState migration
Target: future R-track patch or theme-extension story
Symptom: EmptyState.jsx title styling uses raw passthrough values
through `Text` primitive's `|| size` / `|| color` fallback because
two design values lack token equivalents:
  - `15px` font size — between `font.size.sm` (12px) and
    `font.size.md` (14px). Used in EmptyState title. Drift.
  - `#374151` (gray-700) — not in `color.text.*` palette. Closest
    existing token is `text.primary` (`#0F1F3D`, alias of brand
    navy, would change appearance). Used in EmptyState title.
    Drift.
Impact: Token system has known coverage holes; consumer code uses
raw values via primitives' passthrough mechanism. Acceptable for
v2.5.x but inconsistent with the "tokens are the source of truth"
direction. Future Phase 3 migrations may hit the same gap.
Root cause: Known — original component used these exact values; the
token set was derived from broader patterns and didn't capture them.
Proposed fixes:
  - (a) Add tokens for both values: `font.size.smd` (or similar) = 15px;
        `color.text.midDark` (or similar) = `#374151`. Audit other
        components for callers of these raw values; migrate EmptyState
        title's raw passthroughs to token references.
  - (b) Normalize EmptyState title to nearest existing tokens
        (downsize to `font.size.sm` (12px); recolor to
        `text.secondary` or similar). Acceptable visual drift, no
        token additions.
  - (c) Defer until Theme System Phase 3 — multi-theme support will
        require comprehensive color token audit anyway.
Recommendation: (a) — most precise; preserves current visual; one
focused R-track patch. Alternatively defer to (c) if Theme System
Phase 3 is on the near horizon.

### Story 63 (P2) — Now-batting strip hand badges not rendering <!-- #128 -->
Status: Open
Discovered: 2026-05-14 — Phase 3 Step 2.D.5 visual verification;
  confirmed pre-existing by prod + local test (pre-2.D code shows
  same behavior). Went unnoticed because the Mud Hens roster
  historically had no batting-hand data set, masking the
  strip-specific failure. Root issue: roster view (App.jsx / root
  PlayerHandBadge) reads battingHand correctly and displays L/R
  badges; NowBattingStrip does not — confirming the bug is in how
  NowBattingBar receives or processes that data, not in the
  component or badge rendering.
Target: TBD
Symptom: NowBattingBar pills show player first names but no L/R hand
  badge, even for players with battingHand set. The integration
  regression guard (NowBattingStrip.test.jsx, added in Phase 3
  Step 2.D.3) proves the component renders correctly given a proper
  synthetic roster — the failure is upstream of the component
  boundary.
Impact: Game Mode coaches lose at-a-glance batting-hand info in the
  now-batting strip. Game and lineup functions unaffected — degraded
  info display only. Workaround: open the player card.
Root cause: hypothesis, unconfirmed — NowBattingBar's `roster` prop
  (optional; getHand uses it for battingHand lookup) is not being
  passed by its parent (DugoutView / App.jsx), or battingOrder name
  strings do not match `roster[].name`, causing getHand to fall
  through to "U" for every pill.
Proposed fixes:
  - (a) Trace the NowBattingBar render site in the parent — confirm
        whether roster is passed and whether name keys align.
  - (b) If roster is not passed, wire it through.
  - (c) If name mismatch, normalize the lookup key.
  Investigation may touch App.jsx (locked — gate phrase required).
Recommendation: diagnose the parent wiring before fixing. Own branch
off develop; RED integration test at the real-parent-path level (not
the synthetic-roster level the existing guard uses).

### Story 64 (P3) — S.card remediation <!-- #129 -->
Status: Resolved
Resolved: 2026-05-29 — PR #247
Resolution: Added shadow.subtleCard token; LegalSection Card now consumes the token for box-shadow, accepts radius drift to radius.md (8px) via explicit radius prop, and the parent wrapper absorbs the marginBottom that was leaking into the Card style escape; asymmetric padding 16px 18px stays raw with drift comment pending an App.jsx-unlock session to design the full Card variant API.
Discovered: 2026-05-15 — Phase 3 Step 3 LegalSection migration; reinforced 2026-05-20 — Phase 3 Step 3 PR #144 confirmed LegalSection.jsx L130-137 retains the full style escape post-migration (Tier 1 scope didn't touch Card properties); 5 properties documented: borderRadius 10px, padding 16px 18px, boxShadow 0 2px 8px rgba(15,31,61,0.06), marginBottom 14px, border 1px solid border.default
Target: v2.6.x
Symptom: `S.card` (App.jsx:741-745) uses `borderRadius: '10px'` (in
  the documented drift zone — between `radius.md` 8px and `radius.lg`
  12px, no token), `padding: '16px 18px'` (asymmetric, no Card
  padding token combines vertical+horizontal), `boxShadow:
  '0 2px 8px rgba(15,31,61,0.06)'` (single-layer navy-tint,
  different from `tokens.shadow.card` which is a compound 2-layer
  shadow), plus `marginBottom: '14px'` and `border: '1px solid '
  + C.border`. No combination of Card primitive props covers this
  shape.
Impact: LegalViewer Card consumes the primitive via full `style`
  escape — Card contributes little beyond semantic intent at this
  call site. Any future S.card consumer will face the same problem.
  Phase 3 Step 3 (PR #144) deliberately left the Card escape
  untouched per Tier 1 convention; the gap is now visible in two
  committed forms (S.card in App.jsx + LegalSection.jsx consumer)
  and will worsen as more components consume Card with bespoke
  styling.
Root cause: `S.card` predates the Card primitive (Card landed in
  Phase 2 v2.5.10); it was never migrated when Card was introduced.
Proposed fixes:
  - (a) Add a Card variant with border + custom shadow that matches
        `S.card`'s visual properties. Cleanest long-term answer; covers
        the broader app pattern of cards floating on a light page bg.
  - (b) Tokenize 10px radius and 16/18px padding, then migrate to
        standard Card props. Reduces drift permanently but requires
        token additions that may not generalize.
  - (c) Leave Card primitive untouched; remove `S.card` entirely after
        auditing all consumers and rewriting each call site with
        explicit inline styles using existing tokens.
Recommendation: (a) — a bordered Card variant with shadow support
  covers the broader app pattern (cards that float on light bg) and
  generalizes beyond this single call site. Audit S.card consumers in
  App.jsx first to confirm the variant API matches everyone, not just
  LegalViewer.

### Story 65 (P2) — Token gap batch: style escapes from Phase 3 migrations <!-- #130 -->
Status: Resolved
Resolved: 2026-05-29 — PR #247
Resolution: Added font.letterSpacing.wider (0.08em) token; migrated FAQSection and LegalSection eyebrow letterSpacing and four lineHeight literals to existing tokens (body, comfortable, relaxed, loose); ValidationBanner/OfflineIndicator status-tint and rgba work deferred per ROADMAP recommendation.
Discovered: 2026-05-15 — Phase 3 Steps 3-4 migrations; reinforced 2026-05-20 — Phase 3 Step 3 PR #144 surfaced lineHeight 1.4/1.6/1.75 in FAQSection (L104, L147, L131) and 1.6/1.7/1.7 in LegalSection (L88, L173, L188)
Target: v2.6.x
Symptom: Multiple style escapes documented inline across
  FAQSection.jsx, LegalSection.jsx, ValidationBanner.jsx, and
  OfflineIndicator.jsx — all lacking token equivalents. Specifically:
  - `letterSpacing: '0.08em'` (FAQ + Legal section eyebrows) — drifts
    from `tokens.font.letterSpacing.wide` (0.06em)
  - line-heights `1.4`, `1.6`, `1.7`, `1.75` — no `font.lineHeight.*`
    token group exists
  - `color: '#374151'` (FAQ answer body) — no body-text token; same
    gap Story 60 flagged
  - `color: '#78350f'` (ValidationBanner list items) — dark amber body,
    no token
  - `color: '#065f46'` / `'#92400e'` (ValidationBanner titles) —
    dark-on-tint, no `successText`/`warningText` tokens
  - bg tints `#d1fae5`, `#fef3c7` (ValidationBanner) — no
    `successBg`/`warningBg` tokens (the tokens.js comment line 49
    explicitly notes `successBg: DROPPED — #DCFCE7 appears 1x`)
  - rgba alpha tints (OfflineIndicator backgrounds + borders) — six
    distinct values, none tokenized
  - `color: 'rgba(255,255,255,0.75)'` (OfflineIndicator label) —
    on-dark text at non-full alpha, no token
Impact: Style escapes bypass the token system; future theme changes
  require hunting literals across files instead of updating tokens.
  Number of style escapes is growing with each Phase 3 migration —
  the gap will worsen if not batched soon.
Root cause: Token palette in `frontend/src/theme/tokens.js` was
  designed for primary UI surfaces (brand colors, page surfaces,
  borders, primary text). Status tones, line-heights, letter-spacing
  granularity, and alpha-blended tints were never enumerated. The
  components that need them are the secondary/contextual surfaces
  the audit didn't initially capture.
Proposed fix: Extend `tokens.js` with:
  - `tokens.font.lineHeight.*` group: tight (1.4), normal (1.5),
    relaxed (1.6), comfortable (1.7), loose (1.75)
  - Add `tokens.font.letterSpacing.wider` = 0.08em (new); keep
    `.wide` = 0.06em unchanged — two distinct tokens
  - `tokens.color.text.body` = '#374151' (dark body copy on light bg)
  - `tokens.color.status.successBg` = '#d1fae5',
    `warningBg` = '#fef3c7'; `errorBg` already exists (`#FEE2E2`,
    tokens.js line 47)
  - `tokens.color.status.successText` = '#065f46',
    `warningText` = '#92400e', `errorText` (new — value TBD by
    design pass)
  - Decide on rgba tint convention (tokens vs. composed via `tint()`
    helper) — defer to Theme System Phase 3 if no helper exists yet
Recommendation: Batch the additions in one focused PR; update the
  Phase 3 Step 3-4 call sites immediately after to consume tokens
  instead of literals. Don't pursue rgba tint tokenization in this
  story — that's a Theme System concern and needs its own design
  pass.

### Story 66 (P3) — BattingHandSelector: defer Pill migration <!-- #131 -->
Status: Deferred
Discovered: 2026-05-15 — Phase 3 Step 3 stretch-goal evaluation
Target: v2.7.x, or post-Pill-tone-API
Symptom: BattingHandSelector's three hand-toggle buttons look like
  Pill candidates but have 3 contract mismatches with the current
  Pill primitive:
  - Active color is `#16a34a` (green) — Pill's active is
    `brand.navy`. Pill has no `tone` prop.
  - Border radius is `tokens.radius.sm` (6px, rounded rectangle) —
    Pill is `tokens.radius.pill` (9999px, fully pill-shaped).
  - Font-family is `'inherit'` (page sans) — Pill bakes
    `family='serif'` into its Text wrapper.
  Existing test pinning: R2.3 asserts the literal active green
  `rgb(22, 163, 74)` — migration without a Pill green tone breaks it.
Impact: Low. Component is already fully tokens-wired (migrated to
  tokens in Phase 1c R1 Roster Polish, v2.5.6) and self-contained
  (no C/S props). Not a regression risk; just not yet migrated to
  the Pill primitive.
Root cause: Pill's API has no `tone` or `shape` prop. The green
  active affordance in BattingHandSelector is intentional UX (green
  = confirmed hand selection) — migrating to navy would change the
  visual semantics of the control.
Proposed fixes:
  - (a) Extend Pill with `tone="success"` (and possibly other tones)
        that swaps the active background to a green token — see
        Story 65 for the prerequisite green-tone token addition.
  - (b) Extend Pill with `shape="rounded"` (radius.sm instead of
        radius.pill) to preserve the rectangular look.
  - (c) Both (a) and (b) — full migration with two new Pill props.
  - (d) Skip Pill — keep BattingHandSelector as inline-styled (it's
        already token-aware), file the Pill API extensions as a
        separate primitive-evolution story.
Recommendation: (d) until Pill tone API decision is made. Don't
  force the migration and change the visual affordance without
  design review. Reassess when Pill grows a tone API for other
  reasons (e.g., status-themed Pills land somewhere else).

---

### Story 68 (P2) — GitHub Webhooks & Settings Audit <!-- #132 -->

Status: Resolved
Resolved: May 19, 2026 (Story 68 audit session)
Resolution: Full 8-category GitHub settings audit complete. Two third-party AI apps revoked (ChatGPT Codex Connector, Grok — both had read/write access to all repos). Dependabot alerts enabled (18 vulns surfaced, triage pending). CODEOWNERS file created and merged (PR #133). Branch protection and Actions permissions confirmed clean. Secret scoping deferred to P3.
Discovered: 2026-05-19, automation session
Target: v2.6.x
Symptom: GitHub repo settings have never been audited against available integration points. Automation hooks, security features, and workflow integrations are likely underutilised.
Impact: Missing automation leverage across the full toolchain — webhooks, required status checks, branch protection rules, Environments, GitHub Apps, Dependabot alerts, secret scanning, CODEOWNERS, deploy keys.
Root cause: Known — repo was set up organically; settings never reviewed against what GitHub offers.
Proposed fixes: Dedicated 1-hour audit session covering GitHub repo Settings top-to-bottom. Output: prioritised list of integrations to enable, mapped to specific Dugout Lineup workflow improvements.
Recommendation: Schedule as a standalone session. Do not bundle with feature work — settings changes have cross-cutting impact and need focused attention.

---

### Story 69 (P2) — Dependabot Vulnerability Triage <!-- #135 -->

Status: Open
Discovered: May 19, 2026 (surfaced during Story 68 audit)
Target: v2.5.7 or next release
Symptom: 18 Dependabot alerts active (6 high, 12 moderate) on default branch after enabling alerts during Story 68 audit.
Impact: Unknown until triaged — may include transitive deps with no direct fix path, or actionable upgrades.
Root cause: Alerts were disabled; backlog of unreviewed CVEs accumulated.
Proposed fixes: Triage at https://github.com/kaushikkuberanathan/lineup_generator/security/dependabot — dismiss dev-only/non-exploitable alerts, action any with available patches.
Recommendation: Triage before next prod release. Dismiss non-exploitable, upgrade where patch exists and tests pass.

---

### Story 70 (P3) — Release History & CODEOWNERS Hygiene <!-- #141 -->

Status: Open
Discovered: May 19, 2026 (v2.5.16 bump session — 2026-05-19-B)
Target: next governance session
Symptom: Two hygiene gaps: (1) v2.5.15 missing from ROADMAP release history chronology — only referenced in story metadata, never added as a top-level release entry; (2) frontend/src/data/versionHistory.js and --no-verify docs-only exception not in CODEOWNERS or CLAUDE.md respectively.
Impact: Internal only. Release history has a gap at v2.5.15. versionHistory.js edits bypass the locked-file gate convention.
Root cause: v2.5.15 bumped without a ROADMAP release entry; versionHistory.js was not on the locked-files list when CODEOWNERS was authored (it was still in App.jsx at that time). --no-verify docs-only exception used without being formally documented.
Proposed fixes: (1) Backfill v2.5.15 release entry in ROADMAP.md; (2) Add versionHistory.js to .github/CODEOWNERS; (3) Document docs-only --no-verify as a named exception in CLAUDE.md.
Recommendation: Bundle all three in one chore PR — small scope, no app code.

---

### ✅ Story 71 (P2) — Version History Audit: Standardize Schema Across All Entries <!-- #140 -->

Status: Resolved. Schema enforcement (headline required, no `title` field, no PR/Story leakage in userChanges, date-format check) shipped via `versionHistory.test.js` (PR #257/#258, 2026-05-30, story #256). GitHub issue closed 2026-08-26 — tracker was never closed after the work landed.
Discovered: May 19, 2026 (v2.5.16 bump session — 2026-05-19-B)
Target: v2.5.17
Symptom: VERSION_HISTORY entries in frontend/src/data/versionHistory.js have inconsistent date formats (some "2026-05-04", some "May 2026"), missing headline/techNote fields on older entries, and internalChanges content appearing in userChanges where coaches could see it.
Impact: Internal only for now. Risk: coach-facing release notes surface technical noise if VERSION_HISTORY is ever consumed directly. Schema test drift risk if new entries follow inconsistent older patterns.
Root cause: Schema evolved over time (headline + techNote added, versionHistory.js extracted from App.jsx in v2.5.3) without a retroactive audit pass.
Proposed fixes: Full audit pass — read every entry, flag violations, propose standardized rewrites for KK review, commit in one patch.
Recommendation: Option A (full audit pass) over schema-test-only approach — customer-facing language quality requires human judgment a test cannot catch.

### Story 72 (P2) — Mount adminRouter and feedbackRouter at specific /api/v1 prefixes <!-- #150 -->

Status: Open
Discovered: May 20, 2026 — surfaced during chore/backend-route-modularization (PR #TBD)
Target: Phase 4C or next backend architecture pass

Symptom: adminRouter and feedbackRouter are mounted at the bare /api/v1 prefix. Any
unmatched request to /api/v1/* falls through into these routers and hits their
router.use(requireAuth) middleware, returning 401 instead of 404.

Impact: New routes mounted under /api/v1/* are auth-intercepted unless placed before
the admin/feedback mounts in index.js. Requires mount-order discipline as a workaround.
Fixed in PR #TBD by reordering mounts (specific before generic).

Root cause: adminRouter and feedbackRouter use a bare /api/v1 mount instead of specific
prefixes (/api/v1/admin, /api/v1/feedback).

Proposed fix:
- Option A (recommended): Re-mount adminRouter at /api/v1/admin and feedbackRouter at
  /api/v1/feedback. Audit frontend callers first (admin.html + test suites).
- Option B: Keep current order discipline — low risk while route surface is small.

Recommendation: Option A, bundled with Phase 4C auth cutover when admin routes are
already being touched.

### Story 73 (P3) — Motion/duration tokens missing <!-- #151 -->
Status: Open
Discovered: 2026-05-20 — Phase 3 Step 3 PR #144 (FAQSection chevron rotation recon)
Target: future R-track patch to introduce `tokens.motion` group
Symptom: No motion/duration/easing token group in tokens.js. First
surfaced site: FAQSection.jsx L114 — `transition: "transform 0.15s ease"`
on the accordion chevron rotation. Other transition / animation values
are likely embedded in App.jsx and game-mode components but have not
been audited.
Impact: Motion timings will diverge across the app as components are
touched. No semantic vocabulary for "fast UI feedback" vs "page
transition" vs "modal enter/exit". Accessibility consideration: no
central place to honor `prefers-reduced-motion`.
Root cause: Original 2026-04-30 token audit didn't survey
transition / animation values. Motion was deemed out of scope for
the v2.5.0 primitives launch.
Proposed fixes:
  - (a) Audit all `transition:` and `animation:` declarations across
        `frontend/src/`; define a minimal motion scale —
        `duration.{fast, base, slow}` and `easing.{standard, accelerate,
        decelerate}` — and a global `prefers-reduced-motion` strategy.
  - (b) Define only what's needed for currently-migrating components:
        `duration.fast = '0.15s'`, `easing.standard = 'ease'`. Grow
        as new sites surface.
  - (c) Defer to a later "motion design" pass — accept inline transition
        values until then.
Recommendation: (b) — minimal additive token introduction unblocks
Phase 3 momentum without requiring a full motion design system.
Upgrade to (a) when a UX track explicitly covers motion or when
`prefers-reduced-motion` becomes a P2 accessibility ask.

### Story 74 (P3) — LegalSection L172 color-via-style anti-pattern <!-- #152 -->
Status: Open
Discovered: 2026-05-20 — Phase 3 Step 3 PR #144 (LegalSection.jsx recon)
Target: future R-track patch after `Text` primitive color prop API is verified
Symptom: `LegalSection.jsx` L167–178 sets `color: tokens.color.text.primary`
via the `style` prop of `<Text size="body">` instead of via Text's
`color` prop. Other `<Text>` callers in the same file correctly use
`color="navy" | "secondary" | "tertiary"`. Same family of anti-pattern
that PR #144's F5 test caught for `fontSize` overrides — caller
overrides primitive semantic via style.
Impact: Visual output is identical today (`tokens.color.text.primary`
resolves to the same hex as `color="navy"`), so impact is low. Concern
is consistency and future regression risk if Text's style merging
behavior changes, plus the convention drift it sets for new authors.
Root cause: Likely the Text primitive's `color` prop didn't accept
`"primary"` as a value at the time the file was authored; the style
override was the only path to apply `text.primary` semantically. Has
not been verified.
Proposed fixes:
  - (a) Audit Text primitive's color prop API
        (`frontend/src/components/ui/Text.jsx`); add `"primary"` as
        a supported value mapping to `tokens.color.text.primary` if
        missing. Migrate L172 to `<Text size="body" color="primary">`
        and drop the style override.
  - (b) Document that `color="navy"` is the canonical mapping for
        `text.primary` (text.primary is an alias of brand.navy);
        migrate L172 to `color="navy"`. Implication: every caller
        that wants text.primary in roles where "navy" feels
        semantically wrong (body text vs brand mark) lives with the
        naming friction.
  - (c) Add a lint rule to flag `style={{ color: ... }}` overrides
        on `<Text>` when a `color` prop equivalent exists. Catches
        future drift, doesn't fix the existing site.
Recommendation: (a) + (c) together. Fix the immediate site with a
proper semantic prop, plus add a guard rail. (b) renames the problem
rather than solving it. Related: PR #144's F5 anti-pattern guard for
fontSize — this is the color-prop equivalent.

### ✅ Story 75 (P1) — Pre-push hook: move full Vitest suite out of hook, CI-only <!-- #153 -->

Status: Resolved v2.5.18. GitHub issue closed 2026-08-26 — tracker was left open after the fix shipped.
Discovered: May 20, 2026 — 4 of 5 push attempts failed during chore/backend-route-modularization session
Target: Next governance pass

Resolution: Resolved v2.5.18. Removed Vitest suite AND lint from .husky/pre-push
hook. Root cause: codebase has 132 existing ESLint problems (45 errors, 87
warnings) under --max-warnings 0 — lint gate would block every push. Branch
guard (Stories 45+53) retained. CI (GitHub Actions) is now the sole post-push
gate. Lint debt (132 issues including no-undef on supabase/teamName/
updateServiceWorker) filed separately as Story 77 (P2).

Symptom: Vitest threads-pool worker handshake exceeds 60s timeout on Windows
(Cox managed endpoint) during pre-push hook. Affects a different random test file
each attempt. 4 failures tonight across migration.test.js, FAQSection.test.jsx,
a11y-component-fixes.test.jsx, Button.test.jsx. One success at 382s. ~45 min
cumulative wall time lost. Required --no-verify override to complete session work.

Impact: Pre-push hook is unreliable as a quality gate on this machine. Developers
spend 6-11 min per push attempt with ~80% failure rate under load. Forces
--no-verify overrides which undermine the hook's purpose.

Root cause: Windows Defender + Cox managed endpoint fork/worker IPC latency.
Vitest worker startup exceeds the default 60s handshake timeout under memory
pressure. Non-deterministic — different file fails each attempt.

Proposed fixes:
  Option A (recommended): Remove full Vitest suite from pre-push hook. Keep only
  fast checks (lint, tsc --noEmit) in the hook. Let GitHub Actions CI be the
  authoritative quality gate on push.
  Option B: Increase Vitest worker timeout in vitest.config.js (workaround,
  doesn't fix root cause, may mask real hangs).
  Option C: Move to WSL2 for git operations (larger change, eliminates Defender
  IPC interference).

Recommendation: Option A. CI already runs on every push to develop/main and is
the documented authoritative gate. The pre-push hook provides false confidence
on this machine — it either passes slowly or fails with no real test failures.

### Story 76 (P3) — `\r` artifacts embedded in ROADMAP.md Story headings <!-- #154 -->
Status: ✅ Resolved — v2.5.21 (2026-05-27)
Discovered: 2026-05-20 — Phase 3 Step 3 story-filing session (PR #146 edit attempt)
Resolved: 2026-05-27 via feature/release-v2.5.21 — full file sweep with `awk '{ gsub(/\r/, ""); print }'`. Zero user-facing change; pure byte cleanup.

Final scope at resolution: 48 heading lines, two variants:
  - **Variant A** — 16 stories (Stories 72–87) with double-marker `<title> <!-- #N -->\r <!-- #X -->` corruption from the sync-stories-to-issues.js patch path (root cause: Story 91 — script wrote new marker without trimming the stale placeholder's `\r`)
  - **Variant B** — 32 stories (Stories 19–22, 62, 64, 65, and others) with single-marker `<title>\r <!-- #X -->` corruption from the original CRLF-paste artifact this story was filed for

Symptom (filed scope; see resolution above): Two existing ROADMAP.md story headings contain a literal
`\r` (carriage return, 0x0D) character mid-line, between the em-dash
title text and the `<!-- #N -->` issue marker. Confirmed via `xxd`
hex inspection:
  - Story 64 heading: `### Story 64 (P3) — S.card remediation\r <!-- #129 -->`
  - Story 65 heading: `### Story 65 (P2) — Token gap batch: style escapes from Phase 3 migrations\r <!-- #130 -->`
File is UTF-8 with CRLF line terminators; the embedded `\r` is an
extra one beyond the line-terminating `\r\n`. Invisible in editors
and `cat -n` output.
Impact: Breaks exact-string matching by automated tools (Edit tool,
sed, grep with anchored patterns). PR #146's Edit 1 (the Story 65
heading P3 → P2 change) failed with "string not found" on first
attempt; required a narrower substring workaround. Future story-
curation tooling (`scripts/sync-stories-to-issues.js`, future label
or status updaters) may hit the same failure mode silently. Renders
correctly in Markdown viewers — pure byte-level corruption with no
visual symptom.
Root cause: Unknown. Speculative: a prior editor (possibly a Windows
tool or paste from a CRLF source) inserted an extra `\r` before the
comment marker. Pattern is em-dash + comment marker juxtaposition —
only headings carrying both have the artifact; other story headings
without issue markers are clean.
Proposed fixes:
  - (a) One-shot targeted cleanup: PowerShell one-liner to read the
        file as UTF-8, replace the byte sequence (carriage return +
        space + `<!--` + space) with (two spaces + `<!--` + space),
        write back as UTF-8 no BOM with CRLF terminators preserved.
        Two-character touch, single commit. Verify with `xxd` post-fix.
  - (b) Audit-wide cleanup: scan all `.md` files in `docs/` for
        embedded `\r` not at line terminators; document and fix all
        instances in one pass. Higher scope; addresses unknown
        unknowns.
  - (c) Defer until a tool actually fails in CI — accept the
        workaround for now (use substring matching that avoids the
        `\r` zone).
Recommendation: (a) — minimal scope, addresses the two known
instances, prevents future tooling failures. (b) is broader but
premature without evidence other files are affected. (c) leaves a
known landmine for the next agent or automation script.

### Story 77 (P2) — Lint debt triage: 132 ESLint problems blocking strict gate <!-- #180 -->

Status: Resolved (v2.5.23 / 2026-05-30)
Resolution: ESLint debt eliminated across all 5 phases (A–E); App.jsx reduced ~650 net lines. PRs #237 #244 #245 via feature/lint-sprint-2.
Discovered: May 21, 2026 — surfaced during Story 75 pre-push hook remediation

Symptom: npm run lint exits 1 with 45 errors + 87 warnings. --max-warnings 0
means lint cannot be used as a push gate until debt is cleared.

Impact: No fast local lint gate possible. CI is sole quality gate.

Root cause: Accumulated lint debt — empty catch blocks, redeclared vars,
no-undef (supabase, teamName, updateServiceWorker — potential real bugs),
unescaped JSX entities, unused vars.

Proposed fix: Triage pass — fix no-undef errors first (potential real bugs),
then errors, then warnings. Enable strict lint gate after debt cleared.

Recommendation: Fix no-undef block first in isolation (15-min triage).
Remaining errors/warnings in a follow-up pass.

### Story 78 (P2) — Label schema gaps: missing labels blocking PR hygiene <!-- #181 -->

Status: Open
Discovered: May 21, 2026 — PRs #149, #155, #156, #157, #158, #159, #160
all missing area:, status:ready-for-review, type:fix, type:docs labels
Target: Next governance pass

Symptom: Labels area:governance, status:ready-for-review, type:fix, type:docs
do not exist in the repo — cannot be applied to PRs even when correct.

Impact: PR hygiene incomplete across every PR this session. Label filtering
and triage broken for the prefix:name scheme.

Root cause: Labels were designed in the prefix:name scheme but never created
in GitHub Settings → Labels. Missing labels silently fail on application.

Proposed fix: One-time creation pass in GitHub Settings → Labels for all
missing labels in the scheme. ~5 minutes.

Recommendation: Do in one pass next governance session — unblocks all future PRs.

### Story 79 (P2) — Promote PR merge strategy: squash default overrides regular merge convention <!-- #182 -->

Status: Open
Discovered: May 21, 2026 — PR #159 (develop → main promote) landed as squash
instead of regular merge; same occurred on previous promote. GitHub's default
is squash; operator must manually switch each time.
Target: Next governance pass

Symptom: Promote PRs (develop → main) collapse all develop commit history into
a single squash commit on main. Individual PR commits (#149, #155, #156, #157,
#158) not visible in main's history.

Impact: Main history loses granularity. Git log on main shows one release commit
instead of the individual PRs that composed it.

Root cause: GitHub defaults to squash merge. No checklist step enforces
"Create a merge commit" selection at promote time.

Proposed fix: Add explicit step to promote checklist in CLAUDE.md:
"On the PR merge dropdown — select Create a merge commit, NOT squash and merge."

Recommendation: One-line CLAUDE.md addition. Do alongside Story 78.

### Story 80 (P3) — Pre-pull branch check: worktree convention missing from CLAUDE.md <!-- #183 -->

Status: Open
Discovered: May 21, 2026 — git pull origin develop in UX worktree created
accidental merge commit twice (worktree was on feature branch, not develop).
Recovered via git reset --hard both times.
Target: Next governance pass

Symptom: Running git pull origin <branch> in a worktree that's checked out
on a different branch merges the remote branch INTO the feature branch,
creating an unintended merge commit.

Impact: Feature branch history polluted; requires destructive reset to recover.
Caught both times but cost ~5 min each.

Root cause: Convention known but not written down in CLAUDE.md. Relies on
operator memory each session.

Proposed fix: Add to CLAUDE.md worktree operating conventions:
"Always run git branch --show-current before any git pull in a worktree.
If not on the target branch, do not pull — use git fetch + git log origin/<branch>
to inspect instead."

Recommendation: CLAUDE.md one-liner. Pair with Story 79 in same governance PR.

### Story 81 (P2) — Vite major upgrade: resolve 3 deferred esbuild/vite moderate vulns <!-- #184 -->

Status: Resolved (v2.5.22 / 2026-05-27)
Resolution: Vite ^5→^6.4.2 + vite-plugin-pwa ^0.19→^1.0 via PR #235. Clears 3 Dependabot moderate vulns.
Discovered: May 21, 2026 — npm audit fix deferred esbuild/vite chain
during chore/npm-audit-fix session (PR forthcoming)

Symptom: 3 moderate vulnerabilities remain in frontend after audit fix —
esbuild <=0.24.2, vite <=6.4.1, vite-plugin-pwa (various). All dev-only
build toolchain. Not present in production bundle.

Impact: Low — dev server CORS exposure (GHSA-67mh-4wv8-2f99) during local
development only. No production exposure. Coaches unaffected.

Root cause: npm audit fix --force required to resolve; upgrades Vite 5/6 → 8
(breaking major version). Needs scoped upgrade PR with build verification.

Proposed fix: Dedicated chore/vite-upgrade PR — bump vite + vite-plugin-pwa,
run npm run build, verify dev server, confirm PWA behavior unchanged.

Recommendation: Treat as standalone upgrade story. Do not block other PRs.

### Story 82 (P3) — ParentView token/primitive migration <!-- #185 -->

Status: Resolved
Resolved: 2026-05-31 — PR #268
Resolution: ParentView S/C prop dependency removed. Four new tokens
  (text.muted, overlay.benchWash, borderWidth.thick/heavy). S.btn →
  Button primitive, S.card → Card primitive. All C.* refs migrated to
  tokens. App.jsx call site cleaned. PV6+PV7 RED→GREEN. 781/782 suite.
Discovered: 2026-05-22 — Phase 3 Step 4 recon (UX track)
Target: after App.jsx parallel work clarifies S/C prop pattern

Symptom: GameDay/ParentView.jsx (86 lines, extracted from App.jsx v1.6.9)
uses legacy S.* and C.* prop-injected style helpers rather than design
tokens or ui/* primitives. Zero imports — fully isolated. Purely
presentational.

Impact: ParentView is the primary parent-facing Game Day surface. It uses
11 C.* color references, 2 S.* helper references, 9 hardcoded px font
sizes (2 at WCAG-floor 10px), ~18 spacing literals, and 0.12em
letterSpacing (2× the app norm). No token references, no primitives.

Root cause: Extracted from App.jsx v1.6.9, predating the design-tokens
system. S/C props are the legacy theming mechanism — App.jsx injects
style helpers rather than each component importing tokens.

Gate condition: Migration is blocked until App.jsx parallel work clarifies
whether S/C props will be deprecated. Once that path is clear, ParentView
is a clean migration target (zero locked-path adjacency, no game-path
logic).

Proposed fixes:
  - (a) Add tokens import directly to ParentView; replace C.navy →
        tokens.color.brand.navy, C.textMuted → tokens.color.text.secondary
        (visual drift check needed — #6b7280 vs #64748B). Migrate 9 font
        sizes to tokens.font.size.* (skip 10px — WCAG floor). Replace
        S.btn → Button, S.card → Card, raw divs → Text/Stack.
  - (b) Wait for App.jsx S/C deprecation to be formally scoped, then
        migrate ParentView as part of that larger sweep.

Decisions needed before migration:
  - Button primitive: accepts ~12px→13px text size-up and 44px tap-target
    fix (visual change)?
  - C.textMuted (#6b7280) → text.secondary (#64748B): acceptable drift
    after eyeball?
  - 0.12em letterSpacing: normalize to tokens.font.letterSpacing.wide
    (0.06em) or leave as documented drift?
  - 10px font labels: lift to xs (11px) or leave flagged?

Recommendation: (a) — direct token import is cleaner than waiting for a
broader S/C deprecation that has no firm timeline. Gate on App.jsx
parallel work clearing first.

### Story 83 (P1) — Silent feedback/bug loss: supabase client not imported in App.jsx <!-- #186 -->

Status: ✅ Resolved — fixed in commit 24e144a (PR #171)
Resolved: 2026-06-07 (ROADMAP catch-up — fix predates this date). Symptom verified absent: `supabase` is present in App.jsx's named import block. Regression guard added in commit 9570a15 (frontend/src/__tests__/appImports.test.js).
Discovered: May 22, 2026 — Story 77 no-undef triage
Target: Next fix pass

Symptom: submitFeedback() and submitBug() in App.jsx reference bare supabase
(lines 2821, 2849) but App.jsx only imports named functions from supabase.js,
not the client. ReferenceError is swallowed by try/catch — user sees success
toast but feedback/bug POST never reaches the backend.

Impact: All coach feedback and bug reports silently lost since this code path
was introduced. localStorage save works; network POST silently fails.

Root cause: supabase IS exported from frontend/src/supabase.js (line 9:
export var supabase = ...) — confirmed 2026-05-22. The export is just
missing from App.jsx's named-import list at lines 4-7, which only pulls
in the helper functions.

Proposed fix: Add supabase to the existing named import block at
App.jsx:4-7. One-line change — lowest-risk fix in this triage set.

Recommendation: One-line import fix. P1 — silent data loss affecting coaches.

### Story 84 (P2) — teamName undefined in box-score AI parser <!-- #187 -->

Status: ✅ Resolved — v2.5.20 (commit 47b0522, PR #178)
Resolved: 2026-06-07 (ROADMAP catch-up). Symptom verified absent: parseGameResult uses activeTeam.name; no bare `teamName` remains in the parser range.
Discovered: May 22, 2026 — Story 77 no-undef triage
Target: Next fix pass

Symptom: parseGameResult() references bare teamName 4 times (lines 2941,
2951, 2956, 2959) — never declared, parametrized, or imported. ESLint
no-undef confirms it is genuinely out of scope. AI prompt likely receives
"Team name is undefined." degrading parse accuracy.

Impact: Box-score parsing (image/PDF/text → batting stats) sends malformed
prompts to Claude. Accuracy degraded; coaches may see wrong player mappings.

Root cause: teamName was likely intended to be passed as a parameter or
sourced from activeTeam.name but was never wired up.

Proposed fix: Pass teamName as a parameter to parseGameResult() and update
callers (1-3 call sites), or replace the 4 references with the correct
in-scope expression (likely activeTeam?.name or similar).

Recommendation: Read the 1-3 call sites before fixing to confirm parameter
approach is cleaner than closure reference.

### Story 85 (P2) — ReferenceError on SW update button click <!-- #188 -->

Status: ✅ Resolved — v2.5.21 (2026-05-27)
Discovered: May 22, 2026 — Story 77 no-undef triage
Resolved: 2026-05-27 via feature/release-v2.5.21 / PR #188 → promote PR #216

Symptom: useRegisterSW() return value is discarded at App.jsx:1838.
Three consequences: (1) updateServiceWorker is never destructured —
click handlers at lines 3517+8617 would throw ReferenceError IF the
banner rendered; (2) needRefresh is hardcoded false (line 1845 stub)
— the update banner has NEVER rendered since the stubs were introduced;
(3) setNeedRefresh is a no-op stub (line 1846). Two duplicate banner
blocks exist (lines 3511, 8611) — both gated on needRefresh, both
dead. Coaches have only received updates via PWA close+reopen, not
the in-app prompt.

Impact: Update prompt has been non-functional since the stubs were
introduced. Severity: P2 (PWA reload is a workaround) but broader
than originally filed. Fix will restore visible update UI for coaches
— needs a userChanges entry when it ships.

Root cause: Refactor stub defined needRefresh and setNeedRefresh manually
below the useRegisterSW call but omitted updateServiceWorker.

Proposed fix: Destructure from return value:
const { updateServiceWorker } = useRegisterSW({ onRegistered(r) { ... } });
Remove the manual stubs for needRefresh/setNeedRefresh if they're also
sourced from the same hook.

Recommendation: One-line destructure fix. Verify stubs below are also
removable before committing.

### Story 86 (P1) — Post-promote sync: add main → develop sync step to Release Ritual <!-- #189 -->

Status: Resolved (2026-08-05). Re-verified directly against current source
rather than trusting this entry's own "Open" status: the proposed fix already
shipped, just was never closed out here. `CLAUDE.md`'s "Release Ritual —
Develop to Main Promotion" section (line ~225) carries the one-liner —
"**Post-promote sync (required):** After every develop → main promote
merges, immediately open a `sync/main-into-develop` PR to absorb the merge
commit back into develop. Skipping causes 8-file conflict on the next
promote. (Story 86, 2026-05-23)" — and `docs/product/MASTER_DEV_REFERENCE.md`
carries the full rule as step 29 of the Release Ritual phase sequence plus a
"don't skip this" callout in its pitfalls list, both citing "(Story 86,
2026-05-23)" already. `DOC_TEST_DEBT.md` has no separate entry for this
Story — nothing to close there. No doc content changed by this closure;
this is a stale status-marker fix only, same pattern as the share/print and
Auto-Staging Git Hook items closed as stale in prior sessions. PR #575.
Discovered: May 23, 2026 — promote PR #175 had 8-file conflict
because post-promote sync was skipped after PR #159
Target: Next governance pass

Symptom: develop → main promote PR surfaces conflicts on 8 files
(version bump files, CLAUDE.md, SESSION_RETROSPECTIVES.md) when
the prior promote's merge commit was never absorbed back into develop.

Impact: Promote requires a sync PR (main → develop) detour before
the promote can land. Adds ~30 min of conflict resolution work per
release cycle if skipped.

Root cause: PRODUCT_OPS.md Section 5 documents the symmetric
main → develop sync step, but it is not enforced anywhere in the
release workflow. Skipped after PR #159; surfaced during PR #175.

Proposed fix: Add as explicit step in CLAUDE.md Release Ritual
section + MASTER_DEV_REFERENCE.md Release Ritual phase sequence.
Rule: "After every develop → main promote, immediately open
sync/main-into-develop PR to absorb the merge commit."

Recommendation: Add to both CLAUDE.md (one-liner) and
MASTER_DEV_REFERENCE.md (full rule). Low effort, prevents
recurring 30-min detour.

---

### Story 87 (P2) — BottomSheet primitive: extract canonical pattern from LockFlow <!-- #190 -->

Status: ✅ Resolved — v2.5.21 (2026-05-27)
Discovered: May 26, 2026 — LockFlow.jsx recon (feature/ux-lockflow-recon, STOP 3)
Resolved: 2026-05-27 via feature/release-v2.5.21 / PR #190 → promote PR #217

Symptom: LockFlow.jsx (frontend/src/components/GameDay/LockFlow.jsx:166–180)
implements a full bottom-sheet modal pattern inline — fixed-position
backdrop + role=dialog shell anchored to bottom + close handle + body slot
+ upward directional shadow. No primitive exists for this pattern, so the
same shape will be re-implemented every time a future modal/picker/
confirmation flow needs to slide up from the bottom of the viewport.

Impact: Two design-token migrations are explicitly blocked on this primitive:
(1) tokens.js line 107 reserves radius.sheet ('16px 16px 0 0') with a
comment pointing to a future <BottomSheet> primitive using radius.lg
internally; (2) tokens.js lines 194–195 explicitly exclude LockFlow's
'0 -4px 24px rgba(0,0,0,0.18)' upward shadow from the tokens.shadow group
pending the same primitive. Both call sites stay raw (drift) until this
story lands. Secondary impact: future bottom-sheet surfaces (settings,
pickers, multi-step confirmations) will re-derive the same DOM shape and
diverge on a11y wiring.

Root cause: Pattern was extracted from App.jsx v1.6.9 into LockFlow.jsx as
a single-call-site component before the design-system primitive layer
existed. tokens.js (built later) anticipated the primitive in two comments
but the primitive itself was never authored.

Proposed fixes:
(a) Build BottomSheet primitive + migrate LockFlow in one PR. Primitive
    lives at frontend/src/components/ui/BottomSheet.jsx, encodes backdrop +
    role=dialog shell + close handle + radius.lg top + new shadow.sheetTop
    token. LockFlow shell (lines 166–180) swaps to <BottomSheet>. New test
    file BottomSheet.test.jsx + existing a11y F6 block (LockFlow dialog
    role) must still pass.
(b) Build BottomSheet primitive standalone, no LockFlow migration. Adds
    the primitive + shadow.sheetTop token, leaves LockFlow inline. Smaller
    diff, lower risk to game-day Finalize flow, but radius.sheet and
    shadow.sheetTop deferrals remain unresolved at the LockFlow call site
    until a follow-up story.
(c) Defer entirely. Leave LockFlow inline indefinitely. Re-evaluate when
    a second bottom-sheet call site appears in the codebase.

Recommendation: (a) — single-PR primitive + migration. The migration is
low-risk (pre-game, ErrorBoundary-wrapped, no live-scoring impact) and
landing both halves together prevents the radius.sheet / shadow.sheetTop
deferrals from becoming permanent. Smoke-test the 3-step Finalize flow on
Vercel preview before squash-merge to foundation. Block on (b) only if a
second bottom-sheet call site materializes before this story is picked up,
which would change the primitive's API surface.

### Story 90 (P2) — sync-stories-to-issues.js: add de-duplication check before creating issues <!-- #207 -->

Status: Open
Discovered: May 26, 2026 — sync script ran twice on different ROADMAP
snapshots, creating 9 duplicate issues (#192-#200 duplicated #180-#188).
Closed duplicates manually via GitHub API.
Target: Next governance pass

Symptom: Script creates a new GitHub issue for any story with a bare
<!-- #N --> marker, without checking whether an issue with the same
title already exists on GitHub. Running on a stale branch that hasn't
pulled recent marker patches causes duplicate issues.

Impact: 9 duplicate issues created in one incident. Manual cleanup
required via GitHub API. Confusing issue list with doubled entries.

Root cause: Script trusts only the ROADMAP.md file's marker state.
No GitHub Search API call before issue creation to detect existing
issues with matching titles.

Proposed fix: Before calling POST /repos/{owner}/{repo}/issues, call
GET /search/issues?q="{story_title}"+repo:{owner}/{repo}+type:issue
and skip creation if a matching open issue is found. Log the existing
issue number and patch the marker with it instead.

Recommendation: Add de-dup check as the first step in the creation
loop. Idempotency upgrade — script becomes safe to run on any branch
state without risk of duplication.

### Story 91 (P2) — sync-stories-to-issues.js: skip ROADMAP patch on failed POST <!-- #211 -->

Status: ✅ Resolved — v2.5.21 (2026-05-27)
Discovered: May 26, 2026 — script patched ROADMAP.md with undefined
issue numbers after 401 failures (token not set in UX worktree terminal)
Resolved: 2026-05-27 via feature/release-v2.5.21 / PR #211 → promote PR #216

Symptom: When githubRequest() returns a 401 or other non-2xx error,
the script still executes the ROADMAP.md marker-patch block. The
issueNum variable is undefined, producing <!-- #undefined --> markers.
Script then exits with "ROADMAP.md patched" despite no issues created.

Impact: ROADMAP.md corrupted with bad markers. Requires manual
git checkout -- docs/product/ROADMAP.md to recover.

Root cause: The patch block runs unconditionally after the catch.
issueNum is only set inside the successful response path — undefined
in the error path.

Proposed fix: Guard the patch block with a type check before writing:
if (typeof issueNum === 'number') { ...patch ROADMAP... }
One-line change — lower diff than restructuring the try/catch.

Recommendation: Guard approach. Pair with Story 90's remaining
cleanup if doing a sync-script governance pass.

---

### Story 88 (P2) — Success/warning token family additions <!-- #205 -->

Status: ✅ Resolved — v2.5.21 (2026-05-27)
Discovered: 2026-05-26 — ValidationBanner.jsx recon
  (feature/ux-phase-6-foundation)
Resolved: 2026-05-27 via feature/release-v2.5.21 / PR #215

Symptom: ValidationBanner.jsx carries 7 orphan color
values (success-bg, warning-bg, success/warning border
tints, success-text, warning-text, warning-list-text)
with no token equivalents. The component is otherwise
fully migrated (Stack + Text primitives, 2 token subs
landed in Phase 6). These 7 values block the final
style-escape cleanup.

Impact: ValidationBanner cannot reach zero inline
style escapes until these token families exist.
FairnessCheck.jsx has the same gap (#27ae60 tints).
LockFlow.jsx carries the same win/red tint gaps.
All three components' orphan color escapes resolve
once this token family lands.

Root cause: tokens.js line 50 documents
successBg as "DROPPED — appears 1x, below 3x
threshold." The threshold rule was correct at the
time but the 3x count is now met across
ValidationBanner + FairnessCheck + LockFlow.

Proposed fixes:
  (a) Add tokens.color.status family extensions:
      status.successBg = '#d1fae5' (green-100)
      status.warningBg = '#fef3c7' (amber-100)
      status.successBorder = 'rgba(16,185,129,0.3)'
      status.warningBorder = 'rgba(217,119,6,0.3)'
      status.successText = '#065f46' (emerald-800)
      status.warningText = '#92400e' (amber-800)
      status.warningTextLight = '#78350f' (amber-900)
      Then migrate 3 call sites: ValidationBanner,
      FairnessCheck, LockFlow.
  (b) Add only what's needed for ValidationBanner
      (successBg + warningBg + text colors) — defer
      border tints and LockFlow/FairnessCheck sweep.

Recommendation: (a) — all 7 values, all 3 call sites
in one pass. The 3x threshold is now met and adding
a partial family creates future confusion about which
status.* values exist.

---

### Story 89 (P3) — Alpha-tint token family for brand/status colors <!-- #206 -->

Status: ✅ Resolved — v2.5.21 (2026-05-27)
Discovered: 2026-05-26 — OfflineIndicator.jsx recon
  (feature/ux-phase-6-foundation)
Resolved: 2026-05-27 via feature/release-v2.5.21 / PR #215

Symptom: OfflineIndicator.jsx uses 6 alpha-blended
rgba values derived from existing brand/status tokens:
brand.red, status.warning, status.success — each at
0.12, 0.15, 0.30, 0.35 opacity. No pre-mixed alpha
variants exist in tokens.js. These 6 values block
the final style-escape cleanup in OfflineIndicator.

Impact: OfflineIndicator cannot reach zero inline
style escapes without this token family. The component
is otherwise fully migrated (Phase 3 Step 4 + Phase 6
dot borderRadius). Other future dark-surface status
indicators would face the same gap.

Root cause: tokens.js has a tint() helper planned
(line 51, 84 comments) but never built. The alpha-
tint system was deferred pending concrete call sites.
OfflineIndicator provides those call sites.

Proposed fixes:
  (a) Add pre-mixed alpha tokens to tokens.color.overlay:
      overlay.redFaint   = 'rgba(200,16,46,0.15)'
      overlay.redStrong  = 'rgba(200,16,46,0.35)'
      overlay.warnFaint  = 'rgba(212,160,23,0.15)'
      overlay.warnStrong = 'rgba(212,160,23,0.35)'
      overlay.winFaint   = 'rgba(39,174,96,0.12)'
      overlay.winMid     = 'rgba(39,174,96,0.30)'
      Then migrate OfflineIndicator bg/border values.
  (b) Build tint() helper utility that computes
      rgba() from a hex token + opacity at runtime.
      No new token constants needed; consumers call
      tint(tokens.color.brand.red, 0.15) inline.

Recommendation: (a) — pre-mixed tokens are simpler,
statically analyzable, and consistent with the
existing overlay.* family (navyWash, navyMedium, etc.).
The tint() helper (b) is a nicer API long-term but
adds abstraction for a small number of call sites.
Gate on the overlay.* family filling out first.

Separate from Story 88 (which covers new base palette
colors for ValidationBanner — emerald/amber solids,
not alpha tints of existing tokens).

### Story 92 (P3) — DefenseDiamond Tier A+B token migration <!-- #218 -->

Status: Resolved
Resolution: Tier A+B migration complete. 25 raw values migrated in DefenseDiamond.jsx. Added tokens.borderWidth family (hairline/thin/medium) + 4 new Group 10 tests. Shipped as squash commit e5c25c7 on feature/ux-defensediamond.
Discovered: 2026-05-28 — DefenseDiamond.jsx recon
  (feature/ux-defensediamond)
Target: UX track — first pass of DefenseDiamond migration

Symptom: DefenseDiamond.jsx carries ~50+ raw color/spacing
values. ~15 of these have exact existing token equivalents
that can be drop-in substituted, and ~5-7 border-width call
sites are blocked on `tokens.borderWidth.*` not existing.
The existing TODO at L219-221 already acknowledges the
borderWidth gap. The component already imports
`tokens.color.brand.navy` for the inning buttons (lines
233-250), so consumption is partially established.

Impact: Inconsistent — the only GameDay/* component
without a structured migration story. Blocks future
DefenseDiamond a11y/contrast work that wants to reason
about token contracts. Story 60 (#126) covers EmptyState
token gaps (15px font + #374151) — neither value appears
in DefenseDiamond, so this is genuinely new scope.

Root cause: DefenseDiamond was scoped out of Phase 1c
(which added only shadow tokens) and never received a
full token audit. Existing tokens cover the easy half
of the file's raw values.

Proposed fix:
  Step 1 — Add borderWidth token family:
    tokens.borderWidth.hairline = '1px'
    tokens.borderWidth.thin     = '1.5px'
    tokens.borderWidth.medium   = '2px'
  Step 2 — Tier A drop-in substitutions (~15 sites):
    "#c8102e" (red var L30, 3 usages) → brand.red
    "#dc2626" (4 OUT sites)           → status.error
    "#f5efe4" (bench thead bg)        → surface.tableHeader
    "rgba(15,31,61,0.15)" (2 borders) → overlay.navyMedium
    "#0f1f3d" raw navy (L297)         → brand.navy
    "11px" font (3 sites)             → font.size.xs
  Step 3 — Tier B borderWidth substitutions (~5-7 sites):
    "1.5px" inning buttons (L233,246) → borderWidth.thin
    "2px" / "1px" bench borders       → borderWidth.medium / hairline
  Step 4 — Tier C drift acceptances (document inline):
    "#555" / "#6b7280" textMuted    → text.secondary (lighter; drift comment)
    "#ccc" empty cell                → text.disabled (darker; drift comment)
    "rgba(15,31,61,0.06)" border    → overlay.navyFaint (0.08; drift comment)
    "10px" inning btn radius        → radius.md (8px; drift comment)
  Step 5 — Close L219-221 TODO comment.
  Defer: letter-spacing (Story 65), Tier D position/field
  domain families (Story 93), Tier E SVG fontSize.

Test impact: a11y-component-fixes.test.jsx covers
F1/F2 (font floors) and F7 (inning pill contrast).
Tier A/B preserve visuals; Tier C drift accepted with
inline comments — F7 contrast must remain ≥ WCAG AA.

Cross-cutting: No App.jsx changes — DefenseDiamond
receives no styling props from callers. Ungated.

Recommendation: Proceed as outlined. Est. ~1hr.
Tokens.js L14 comment ("Nothing imports from this
file yet") is already stale and worth a one-line
update in this PR.

### Story 102 (P3) — App.jsx OUT-row error tint migration + errorMid token <!-- #261 -->

Status: Resolved
Resolved: 2026-06-01 — PR #271
Resolution: Added overlay.errorMid ('rgba(220,38,38,0.12)'). Migrated 4
  App.jsx OUT-row raw rgba literals to overlay.error* token family. Zero
  raw rgba(220,38,38,*) remain in App.jsx. 782/783 suite green.
Discovered: 2026-05-31 — Story 93 sanity grep surfaced 4 residual
  rgba(220,38,38,*) sites outside the renderFieldSVG scope
Target: v2.5.24 or next UX pass

Symptom: App.jsx carries 4 raw rgba(220,38,38,*) inline literals at
  L968, L969, L983, L4887 — the OUT-row table renders in the scoring
  surface, not DefenseDiamond. Story 93 scoped only DefenseDiamond's
  OUT-row tints. Also: 0.12 alpha variant at L4887 has no token
  equivalent (Story 93 added 0.04/0.05/0.08/0.30 only).

Fix:
  Step 1 — Add tokens.color.overlay.errorMid: 'rgba(220,38,38,0.12)'
  Step 2 — Migrate L968, L969, L983 to existing error* tokens
  Step 3 — Migrate L4887 to new errorMid token

Ungated — App.jsx now imports tokens (added in Story 93 Step 3).

### Story 93 (P3) — DefenseDiamond Tier D domain token families <!-- #219 -->

Status: Resolved
Resolved: 2026-05-31 — PR #259
Resolution: Domain token families shipped — tokens.color.position.*
  (22 keys), tokens.color.field.* (7 keys), tokens.color.overlay.error*
  (4 tints). DefenseDiamond, App.jsx renderFieldSVG, and ParentView
  unified on identical token contract. POS_COLORS prop drilling removed.
  773/774 tests green.
Discovered: 2026-05-28 — DefenseDiamond.jsx recon
  (feature/ux-defensediamond)
Target: UX track — second pass of DefenseDiamond
  migration. GATED on Story 92 complete.

Symptom: DefenseDiamond.jsx defines three large
domain-specific color groups inline that have no token
equivalents:
  - POS_COLORS (L23-27) — 10 light fill colors for
    field positions (P, C, 1B, 2B, 3B, SS, LF, LC,
    RC, RF, Bench)
  - HDR_COLORS (L65-73) — 6-8 darker header variants
    for the same positions
  - Field SVG colors (L113-119) — grass (#2d7a3a,
    #3a9147), dirt (#b5845a, #c49a6c), mound (#c9a070,
    #e8d5b0), chalk lines (white at varying opacity)
  - OUT row tints (L311,312,328,331) — 4 rgba values
    derived from status.error (#dc2626) at 0.04, 0.05,
    0.08, 0.30 opacity. Not covered by Story 89's
    redFaint/redStrong which use brand.red.

Impact: ~30 raw values in DefenseDiamond have no
token home. Position colors are also used by App.jsx
position legends (cross-impact verification needed
before consuming). Field colors are SVG-only and
DefenseDiamond-only today.

Root cause: Token system to date has prioritized
chrome/surface palette and brand identity. Domain-
specific palettes (position rosters, field surfaces)
weren't tokenized because no other consumer needed
them. DefenseDiamond is the sole consumer.

Proposed fix:
  Step 1 — Define tokens.color.position.{P,C,1B,2B,
    3B,SS,LF,LC,RC,RF,Bench} (10 light fill colors).
  Step 2 — Define tokens.color.position.header.* for
    the darker HDR_COLORS variants (6-8 unique values,
    with some shared across positions per current code).
  Step 3 — Define tokens.color.field.{grass,grassLight,
    dirt,dirtLight,mound,moundLight,chalk} (~7 tokens).
  Step 4 — Extend tokens.color.overlay with:
    overlay.errorFaintest = 'rgba(220,38,38,0.04)'
    overlay.errorFaint    = 'rgba(220,38,38,0.05)'
    overlay.errorSubtle   = 'rgba(220,38,38,0.08)'
    overlay.errorMedium   = 'rgba(220,38,38,0.30)'
    (Story 89's redFaint/redStrong use brand.red,
    not status.error — distinct families.)
  Step 5 — DefenseDiamond consumes new token families;
    POS_COLORS, HDR_COLORS, and field SVG values are
    replaced with token references (~30 substitutions).
  Step 6 — Grep App.jsx and other components for any
    other consumers of POS_COLORS-equivalent values;
    migrate if found.

Test impact: SVG rendering is visually verified —
no unit tests cover field color values directly.
a11y-component-fixes.test.jsx F1/F2/F7 preserved.

Cross-cutting: If App.jsx consumes any of POS_COLORS
(line 23-27 values), this becomes a locked-file
migration → gate phrase required. Confirm before
starting.

Recommendation: Defer until Story 92 ships. Then
spike on App.jsx grep first — if POS_COLORS values
appear in App.jsx, escalate to gated work and pair
with the v2.6.0 token-family release.

### Story 94 (P3) — MaintenanceScreen.jsx token migration <!-- #220 -->

Status: Resolved
Resolution: Full token migration of MaintenanceScreen.jsx (44 lines). Added overlay.whiteMedium + overlay.whiteHeavy tokens. 13 substitutions, zero raw hex/rgba remain. Shipped as squash commit dd54b7f on feature/ux-defensediamond.
Discovered: 2026-05-28 — MaintenanceScreen.jsx recon
  (feature/ux-defensediamond)
Target: UX track — last unaudited Shared/* component

Symptom: MaintenanceScreen.jsx (44 lines) carries 10 raw
color/spacing values with exact existing token equivalents,
2 raw rgba alpha values with no token equivalents (white
overlays at 0.6 and 0.25), and 1 raw font-family string
that fuzzy-matches an existing token. Smallest of the three
unaudited components surfaced this session.

Impact: Last GameDay-adjacent component with no structured
migration story. Shown via MAINTENANCE_MODE flag — low
runtime frequency but consistent with token contract is
worth the cleanup. Only `version` prop threaded from
App.jsx; no styling props from callers.

Root cause: MaintenanceScreen was scoped out of Phase 1c
shadow-token work and never received a full token audit.
Smallest scope of any remaining component.

Proposed fix:
  Step 1 — Tier A drop-in substitutions (~10 sites):
    "#0f1f3d" bg (L9)             → brand.navy
    "#f5c842" title color (L17)   → brand.gold
    "24px" padding (L10)          → space.xl2
    "16px" marginBottom (L13)     → space.lg
    "12px" marginBottom (L19)     → space.md
    "14px" body font (L25)        → font.size.md
    "1.6" lineHeight (L29)        → font.lineHeight.comfortable
    "11px" version font (L35)     → font.size.xs
    "32px" marginTop (L37)        → space.xl3
    "bold" weight (L16)           → font.weight.bold (700)
  Step 2 — Tier B token additions:
    Extend tokens.color.overlay.white* family with:
      overlay.whiteMedium = 'rgba(255,255,255,0.25)'
      overlay.whiteHeavy  = 'rgba(255,255,255,0.6)'
    (Matches the existing whiteFaint:0.08, whiteLight:0.15
    anchor pattern; aligns with Story 89's overlay extensions.)
  Step 3 — Tier C drift acceptances (document inline):
    "Georgia, serif" (L18)        → font.family.serif
                                    (adds Times fallback;
                                     visual identical on
                                     macOS/Windows)
    "24px" title font (L15)       → font.size.xl2 (22px;
                                     2px shrink — drift
                                     comment inline)
  Defer: "48px" emoji size (L13) — edge case, single
  decorative emoji; not worth a font-size token addition.

Test impact: No dedicated test file for MaintenanceScreen.
Visual-only verification: trigger MAINTENANCE_MODE flag
locally and confirm rendering matches pre-migration.

Cross-cutting: No App.jsx changes. Ungated. No primitive
adoption — direct token consumption.

Recommendation: Proceed as outlined. Est. ~30 min.
Could ship same PR as Story 92 (DefenseDiamond Tier A+B)
since both have the same shape (Tier A drop-ins +
small overlay extension), or as a standalone P3 quick win.

### Story 96 (P3) — ROADMAP CRLF artifacts in Stories 92+94 headings <!-- #232 -->

Status: Open
Discovered: 2026-05-29 — Terminal 2 session start, audit pass on freshly-merged Stories 92+94 entries
Target: Next governance pass (bundle with other P3 cleanup)

Symptom: Two ROADMAP.md story headings contain a literal `\r` (carriage
return, 0x0D) character between the heading title text and the `<!-- #N -->`
issue marker. Confirmed via `od -c` byte inspection:
  - Story 92 heading (line 3043): `### Story 92 (P3) — DefenseDiamond Tier A+B token migration\r <!-- #218 -->`
  - Story 94 heading (line 3181): `### Story 94 (P3) — MaintenanceScreen.jsx token migration\r <!-- #220 -->`

Pattern matches Variant B from Story 76 — single-marker `<title>\r <!-- #X -->`
corruption, em-dash + comment-marker juxtaposition. Renders correctly in
Markdown viewers; invisible in editors and `cat -n` output.

Impact: Same failure mode as Story 76 — breaks exact-string matching for
automated tooling (Edit tool, sed, anchored grep). Future story-status
updaters or label sync scripts will hit "string not found" silently on
these two lines. Low severity (only 2 lines, governance-only) but is a
known landmine carrying forward across sessions.

Root cause: Story 76's v2.5.21 sweep (`awk '{ gsub(/\r/, ""); print }'`)
ran against the file state at the moment it executed — cleaned 48 artifacts.
Stories 92 + 94 were filed AFTER the sweep ran, and their headings were
authored through the same em-dash + `<!--` paste pathway that produces the
artifact. The sweep was a one-shot fix, not a recurring guard.

Proposed fixes:
  - (a) **Targeted byte replace** — PowerShell or awk one-liner against
        the two known lines. Two-character touch, single commit.
        Verify with `od -c` post-fix.
  - (b) **Recurring guard** — add a pre-commit hook step that scans
        ROADMAP.md (or all `.md` files) for embedded `\r` not at line
        terminators, blocks commit if found. Fixes the recurrence vector
        but is out of scope for a P3 cleanup.
  - (c) **Defer until tooling fails again** — accept the two known
        artifacts; revisit when the next sync-stories-to-issues.js or
        Edit-tool string-match fails.

Recommendation: (a) — same approach Story 76 took, narrow scope, prevents
the known landmine for any near-term automation. (b) is the right durable
fix but warrants its own governance story once a second recurrence happens.
Track recurrence pattern: if a third batch of artifacts appears in the next
1–2 sessions, escalate to (b) as a P2 with prevention scope.

Could ship same PR as the next governance docs-only pass, or alongside any
sync-stories-to-issues.js follow-up work.

### Story 98 (P3) — ci.yml sync-script job missing permissions block <!-- #242 -->

Status: Resolved
Resolved: 2026-05-29 — PR #243
Resolution: Added permissions: { contents: read } block to the sync-script job in .github/workflows/ci.yml, restricting GITHUB_TOKEN to read-only for that job (least-privilege per CodeQL guidance).
Discovered: 2026-05-29 — CodeQL medium-severity finding on the sync-script job after PR #236.
Target: Next governance pass.

Symptom: The `sync-script` job in `.github/workflows/ci.yml` declares no `permissions:` block, so it
inherits the workflow-level default `GITHUB_TOKEN` scope (write on `contents` and other scopes).
CodeQL flags this as overly permissive given the job's actual surface (checkout + Node unit tests).

Impact: Posture finding only today — the job has no `gh` calls or write paths. But a default-write
token is one step away from being a real exfiltration risk if a future change adds an untrusted action.

Fix: Add `permissions: { contents: read }` immediately under the `name:` line of the `sync-script`
job. Two lines, no other behavior change. Mirrors GitHub Actions least-privilege guidance.

---

### Story 97 (P2) — sync-stories-to-issues.js byte-corrupts CRLF Story headings on marker patch <!-- #234 -->

Status: Open
Discovered: 2026-05-29 — Story 96 self-demonstration: filing Story 96 via the sync script
introduced the exact artifact pattern Story 96 documents (mid-line `\r` before `<!--`, lost
trailing `\r` on CRLF terminator).
Target: Next governance pass — before any further sync script invocation on this CRLF file.

Symptom: Running `node scripts/sync-stories-to-issues.js` against a Story heading with a
clean `<!-- #N -->\r\n` marker transforms the heading into the corrupted Variant B pattern:

  Before: `### Story 96 ... headings <!-- #N -->\r\n`
  After:  `### Story 96 ... headings\r <!-- #232 -->\n` (followed by an `\r\n` from the
          subsequent blank line, producing a mixed-LE neighborhood)

Visible byte transform: leading space before `<!--` was retained from a trailing `\r` left
on the captured `originalLine`; the original CRLF terminator's `\r` became mid-line; the
`\n` of the original terminator stayed put.

Impact: The script that exists specifically to enforce ROADMAP/issue hygiene is the
recurrence vector for the corruption pattern Story 76 swept clean and Story 96 documents.
Every future sync run will recurse the artifact onto every newly-filed `<!-- #N -->` story.
This blocks Story 96 recommendation (a) — targeted byte cleanup — because the cleanup
would be re-corrupted on the next sync.

Root cause (verified from source): The script reads the file with
`fs.readFileSync(ROADMAP_PATH, 'utf8')` then splits with `content.split('\n')` (line 87).
On a CRLF file, every resulting `lines[i]` retains a trailing `\r` (split consumes the
`\n` but leaves the `\r`). That `\r`-suffixed line is stored as `story.originalLine` and
threaded into BOTH patch sites:

  - **Line 222-226** (de-dup happy path — currently dead code, see Secondary Finding)
  - **Line 248-252** (POST-success path — the path that ran for Story 96)

Both patch sites do:
```js
const cleaned = story.originalLine.replace(/\s*<!--\s*#N\s*-->/gi, '');
updatedContent = updatedContent.replace(
  story.originalLine,
  `${cleaned} <!-- #${issueNum} -->`
);
```

The `\r` survives the `.replace(...)` because the regex's leading `\s*` matches the space
before `<!--`, but the trailing `\r` is already on the LEFT side of `cleaned`, beyond the
match. The template then appends ` <!-- #${issueNum} -->` AFTER the `\r`, producing the
artifact.

Secondary finding (separate bug, same script): `findExistingOpenIssue` (line 169-179)
unwraps the GitHub Search response incorrectly:
  - `githubRequest` returns `{ status, body }`
  - Code reads `res.items` instead of `res.body.items`
  - Result: function always returns `null`
  - Net effect: the de-dup branch at line 220-228 is dead code
  - Story 90's de-dup intent was correct, but the implementation never runs

Story 96 was created at GitHub Issues 15:26:49Z 2026-05-29 — confirmed via the POST path,
not the de-dup path. Both paths have the byte-corruption bug, but today only the POST
path manifests it. Fixing `findExistingOpenIssue` without also fixing the patch logic
would just spread the corruption to a second code path.

Proposed fixes (do all three):

  - (a) **Strip `\r` from line terminators at parse time.** Change `content.split('\n')`
        to `content.split(/\r?\n/)`. Eliminates the root cause at the source. Every
        downstream consumer of `originalLine` and `lines[i]` becomes CRLF-safe with one
        edit. This is the canonical Node pattern for line-splitting CRLF-agnostic files.

  - (b) **Re-anchor the patch replacement on a CRLF-safe substring.** Even with (a),
        belt-and-suspenders: change the patch sites to match `originalLine` PLUS the
        explicit terminator, and write back with the explicit terminator preserved:
        ```js
        updatedContent = updatedContent.replace(
          originalLine + '\r\n',
          `${cleaned} <!-- #${issueNum} -->\r\n`
        );
        ```
        Detects the file's terminator empirically (e.g. `content.includes('\r\n') ? '\r\n' : '\n'`).

  - (c) **Fix `findExistingOpenIssue` response unwrapping.** Change `res.items` →
        `res.body.items`. Currently a separate dormant bug; fix in the same PR since the
        de-dup branch shares the patch-logic bug being fixed in (a)+(b).

  - (d) **Add a regression test.** Create a small node test that constructs a CRLF
        ROADMAP fixture with a `<!-- #N -->` story heading, runs the script's patch
        logic (refactored to an exportable function), and asserts the output bytes are
        clean `<!-- #N -->\r\n`. Catches recurrence at CI time.

Recommendation: All four. (a) is the minimal-touch fix and would solve the immediate
problem on its own. (b) hardens against future code changes that re-read or re-write
`originalLine`. (c) prevents the de-dup branch from spreading the bug once
`findExistingOpenIssue` is fixed for any other reason. (d) is the durable gate.

Promote Story 96 status: Story 96 recommendation (c) (defer until tooling fails) is no
longer applicable — tooling has actively failed in the same session Story 96 was filed.
Story 96 remains P3 (cleanup of two already-corrupted headings) but is GATED on Story 97
(a)+(b) shipping first. Otherwise the cleanup will be undone on the next sync run.

Could ship as a standalone P2 PR (script + tests + the Story 96 byte cleanup all in one).
Estimated effort: 1-2 hours. No app code touched; pure governance + tooling.

---

### Story 95 (P2) — Add techNote approved-strings convention to Pre-release Docs Checklist <!-- #225 -->

Status: Open
Discovered: 2026-05-27 — CI failure during v2.5.21 release prep
Target: v2.5.22

Symptom: techNote approved-strings are only encoded in
frontend/src/__tests__/versionHistory.test.js APPROVED_TECH_NOTES.
Not in CLAUDE.md Pre-release Docs Checklist or Ship Gate.
Burned a CI cycle during v2.5.21 release (techNote was
free-form; re-written to approved string in fix commit 4003cb9).

Impact: Every future release risks the same CI failure. The
release author has no human-facing reminder that techNote is a
constrained enum.

Root cause: Convention documented only in test assertion, not in
the human-facing checklist where it would be caught before push.

Proposed fix: Add one bullet to CLAUDE.md Pre-release Docs
Checklist item 3 (VERSION_HISTORY entry):
  techNote must be one of the four approved strings in
  APPROVED_TECH_NOTES (frontend/src/__tests__/versionHistory.test.js)

Recommendation: Single-bullet docs addition. ~5 min. P2 — does
not block release but prevents recurring CI churn.

---

### ✅ Story 99 (P1) — Backend test suite re-authoring <!-- #252 -->

Status: Resolved (2026-07-31, this session)
Discovered: 2026-04-24 — backend suite obsolete against
v2.3.3+ (routes restructured into src/routes/ at v2.5.17)
Target: v2.6.x (prerequisite for Phase 4C auth gate)

Symptom: backend/scripts/tests/suite-admin.js asserted 401 against
/api/v1/admin/* paths that have no handlers — those 401s came from
the path-agnostic requireAuth catch-all (admin.js:172), so the real
admin routes had zero meaningful coverage ("green but vacuous").

Impact: Any backend route change is unprotected. Phase 4C
cannot ship safely without backend test coverage.

Root cause: Suite written against v2.3.x; multiple breaking changes
since (route modularization in v2.5.17). Never re-authored.

Shipped (PR #272):
- supertest devDependency added
- app/server split — import-safe app.js extracted from index.js (5-line
  boot wrapper); boot-verified, behavior preserved
- admin.auth.test.js — 9 passing in-process tests asserting 401 at the
  REAL bare /api/v1/* admin paths, and 400 (never 401) for the public
  approve-link/deny-link
- npm run test:unit (node:test + supertest) + hermetic backend-unit CI
  job gating sync-script and main deploy

Progress (follow-up coverage):
- 2026-06-07: Phase 2 tranche 1 — teamData coverage shipped on
  issue/252-teamdata-wipe-guard (commit 95d6fb6): rosterWipeGuard
  unit suite (7), isAdminRequest truth table (5, via new export),
  route-level 409/force/dual-mount/history specs (6), production-mode
  FORBIDDEN_TEST_DATA spec (2). Unit suite 9 → 29.
- 2026-06-12: Phase 2 tranche 2 — AI proxy + auth happy-path on
  feature/backend-analytics-hardening: aiProxy.test.js (6 — 503/413/
  400/200-relay/504/502; 413 is the v2.2.4 regression guard) and
  auth.happy.test.js (4 — request-access 201/409, magic-link 200/403).
  Hermetic (global.fetch + supabaseAdmin singleton + signInWithOtp
  stubs). Unit suite 29 → 39. Closes the AI-proxy + auth-happy-path
  items; DOC_TEST_DEBT "AI Photo Import E2E" P2 → Resolved.
- Between tranche 2 and this closure pass, four more files landed
  without a ROADMAP update (approve.role.test.js, approveLink.role.test.js,
  requestAccess.role.test.js, normalizeRole.test.js) — unit suite was
  actually 93, not the 39 this file and backend/CLAUDE.md still claimed.
  Corrected in both places as part of this closure — the "39" count was
  itself a instance of the doc-vs-reality gap this story exists to close.

Closure pass (2026-07-31):
- Story 26 (rate-limiter test fragility) actually fixed, not just
  documented: loginLimiter (auth.js) re-keyed from IP to email (fix D),
  with a skip() exemption for requests with no email so they never
  consume budget at all. Defense in depth: every test hitting
  /magic-link now generates a unique email per run. RED→GREEN proven
  via mutation test (loginLimiter.test.js, 3 specs) — reverting the fix
  makes exactly 2 of the 3 fail, the 2 that probe the actual bug.
  RATE-01b (integration suite) — first un-skipped to a real assertion,
  then reverted with an accurate skip reason after CI proved it
  unprovable in that suite: the "Backend Integration Tests (CI_SAFE,
  prod read-only)" job runs against the already-deployed prod backend,
  not this PR's code, so an assertion about the just-shipped email-
  keying fix cannot pass there until a full deploy cycle after merge.
  Real RED→GREEN proof lives in loginLimiter.test.js (hermetic, tests
  actual code). Revisit RATE-01b once the fix has been live in prod for
  a release.
- Corrected scope: the original plan's tier (a)/(b) ("game-mode/
  share-link routes") don't exist — both features write directly from
  frontend to Supabase (RLS-enforced), never through a backend route.
  Verified by grepping backend/src for every relevant table name — only
  the RLS test suite (#415) references them, no route does.
- Substituted the closest real equivalent — zero-coverage, user-facing
  routes — and covered them: GET /me, PATCH /me, POST /logout
  (auth.session.test.js, 8 specs) and POST /feedback (feedback.test.js,
  7 specs).
- Writing feedback.test.js surfaced a real production bug, not just a
  coverage gap: admin.js and feedback.js both mount at /api/v1, and
  admin.js's unconditional router.use(requireAuth, requireAdmin) gate
  (the same one #252's own symptom names) intercepted EVERY request to
  that base, including /feedback, before feedback.js's own route ever
  ran. Every non-admin coach's feedback/bug-report submission returned
  403 FORBIDDEN in production — only the one admin account could ever
  submit feedback. Fixed by mounting feedbackRouter before adminRouter
  in app.js (routing-order only, no handler modified). FB-7 is the
  regression guard; RED→GREEN proven by reverting the mount order and
  confirming FB-7 alone fails with exactly 403 vs its expected 201.
- Unit suite 93 → 111 (+18: 3 loginLimiter, 8 auth.session, 7 feedback).

Deliberately not closed here, spun off as a new story (see below):
admin.js's other 7 routes (/requests, /reject, /members, /update-role,
/reset-access, /suspend, GET /feedback admin view, GET /admin/deny-link)
still have ONLY admin.auth.test.js's blanket 401-rejection coverage —
zero coverage of whether the actual authorized admin action works. This
is the same "green but vacuous" pattern #252 was created to close, now
narrowed to a specific, named list rather than "route coverage follow-up
open" with no list. Subsumes the two items previously listed here as
"remaining Phase 2 candidates" (malformed/expired-token 401 spec,
requireAdmin rejection with a valid non-admin token) — neither was ever
written; both fold into the new story rather than staying as an
orphaned two-item list under a now-resolved story.

---

### Story 100 (P3) — Backend qs transitive patch bump <!-- #253 -->

Status: Open
Discovered: 2026-05-30 — Dependabot /21 (moderate)
Target: v2.5.24 or next chore batch

Symptom: qs@6.15.0 in backend lockfile, vuln range
>=6.11.1 <=6.15.1, fix at 6.15.2 (patch only).

Impact: Low real-world risk — vuln is in qs.stringify
with encodeValuesOnly; Express uses qs.parse only.
No stringify call sites in our backend code.

Root cause: Express 5.2.1 lockfile pins qs@6.15.0;
npm audit fix would bump transitive to 6.15.2.

Proposed fix: npm audit fix in backend/ — lockfile-only
change, no package.json edit needed.

---

### Story 101 (P3) — Version history v1.x era audit <!-- #256 -->

Status: Open
Discovered: 2026-05-30 — Groups 1–4 audit fixed v2.0+ entries;
v1.x era (~35 entries) left untouched
Target: v2.6.x

Symptom: v1.x entries use "Stability and performance update"
headline with empty userChanges despite having coach-visible
changes (UI redesigns, new features, bug fixes).

Impact: Coaches reading changelog see generic stubs for 35+
releases. Low urgency — most coaches never scroll that far back.

Root cause: Coach-language standard wasn't established until
the v2.5.x era audit session 2026-05-30.

Proposed fix: read internalChanges for each v1.x entry,
populate userChanges where coach-visible changes happened,
leave genuinely infra-only entries as-is. ~10 entries
estimated to need work out of 35.

---

### Story 103 (P3) — Mixpanel before_identify race condition <!-- #266 -->

Status: Open
Discovered: 2026-05-31 — v2.5.24 smoke test on dev preview
Target: v2.5.x or next chore batch

Symptom: console TypeError on mixpanel.identify() when user
loads a team — before_identify hook undefined.

Impact: analytics event may be missed on first team load;
no user-visible effect. Analytics-quality risk: coach team_id
may not attach to Mixpanel profile on the affected session.
Pre-existing on v2.5.23 main — not introduced by v2.5.24.

Root cause: identify() called before Mixpanel SDK hook system
fully initializes. App.jsx:2303 fires on team load; init in
utils/analytics.js may not have completed by that point.

Proposed fix: guard mixpanel.identify() with init() callback,
OR check initialized state before calling identify(),
OR defer identify until next tick after init completes.

---
### Story 104 (P3) — UX Phase 4: App.jsx decomposition (low-risk extraction tranche) <!-- #279 -->

Status: Open
Discovered: 2026-06-02 — UX Phase 4 planning session (Terminal 2)
Target: v2.6.x (per-slice soak; incremental)

Context: App.jsx is 8,140 lines; nearly the entire app lives in one
export default function App() (~7,000 lines). UX roadmap Phase 4 breaks
it into per-tab components with App.jsx reduced to a router/shell. Full
plan: docs/product/APPJSX_DECOMPOSITION_PLAN.md.

Scope (this story — low-risk tranche only, slices 4.0–4.4):
  4.0 — loadJSON/saveJSON → utils/storage.js
  4.1 — PlayerFilterToggle → screens/Roster/
  4.2 — V1 lineup engine (scorePosition/autoAssign/
        autoAssignWithRetryFallback/validateGrid/initGrid) →
        utils/lineupEngineLegacy.js. NOTE: live V1/fallback path,
        not dead code — characterization tests first.
  4.3 — SharedView → screens/Share/. P0 share-link: real-device
        unauthenticated smoke required before promote.
  4.4 — near-static tabs (About/Updates/Links) → screens/Support/

Out of scope (deferred to later stories): TeamDataContext (slice 4.5),
heavy stateful tabs Roster/Grid/Batting/Schedule/Feedback (4.6+),
router/shell finalization (4.7), game-mode/ScoringMode (Dugout track),
migrations.js/formatters.js (parallel-session locked utils).

Discipline: extract-first (verbatim move, zero logic change);
characterization tests before each extraction; each slice = one PR +
24h soak; App.jsx gate phrase + T1 handoff + Bug #11 skip-worktree
check required for every App.jsx-touching slice.

Dependencies: Phase 3 call-site migrations substantially complete.
Slices 4.0–4.4 have no inter-dependencies; table order minimizes
cumulative risk.

---
### Story 105 (P3) — About tab Builder profile + AboutTab extraction <!-- #281 -->

Status: Resolved
Resolved: 2026-06-07 — PR #283
Resolution: Extracted renderAbout() from App.jsx into standalone
AboutTab.jsx (Phase 4 slice 0, ~105 lines removed). Added 5-card
About tab: feature bullet list, Builder profile with bio +
partnership CTA, branded LinkedIn/Gmail SVG contact buttons.
Token-driven (Cards 1-3). Build clean, 782/783 suite passing.
Discovered: 2026-06-07 — UX track session
Target: v2.5.26

---
### Story 106 (P3) — AboutTab golden-path smoke test <!-- #284 -->

Status: Open
Discovered: 2026-06-07 — Story 105 Ship Gate Q1 debt
Target: Before develop → main promote

Symptom: AboutTab.jsx has no unit test. Pure display component —
needs render smoke test covering 5-card structure, share button,
collapsible toggle.

Fix: Create frontend/src/components/Support/AboutTab.test.jsx

---
### Story 107 (P3) — Support tab reorder (ABOUT first) <!-- #285 -->

Status: Open
Discovered: 2026-06-07 — UX critique on Story 105
Target: Next App.jsx session

Symptom: Support tab order is random (FAQ/FEEDBACK/LINKS/ABOUT/
UPDATES). Recommended order: ABOUT → FAQ → UPDATES → FEEDBACK →
LINKS → LEGAL. Requires App.jsx tab registry edit (~L7500).

Fix: Reorder tab array in App.jsx + set default moreTab to "about"
on Support open.

---
### Story 108 (P3) — ROADMAP + FEATURE_MAP docs for Story 105 <!-- #286 -->

Status: Open
Discovered: 2026-06-07 — pre-release docs checklist debt
Target: Before develop → main promote

Symptom: Story 105 has no ROADMAP entry, no FEATURE_MAP row for
About tab extraction + Builder profile.

Fix: Patch ROADMAP (Story 105 entry + <!-- #281 --> marker), add
FEATURE_MAP row.

---
### Story 333 (P2) — Task-oriented Help redesign (Game-Day Help + search, still bundled offline) <!-- #865 -->

Status: Resolved — merged to `develop`
Discovered: 2026-08-27 — product review of a GameChanger-style Help Center
proposal; decision was to adopt the information architecture, not hosted
support infrastructure
Target: Next develop PR

Context: The Support → FAQ sub-tab organized 53 articles by persona (Head
Coach, Dugout Parent, DJ Parent, Catcher Parent, Base Coaches, Scorekeeper,
Setup & Sharing) with no search. A coach had to self-identify a role before
finding an answer. A hosted external Help Center was proposed and evaluated;
rejected for now — no usage evidence exists to justify the infrastructure,
and hosting content externally would trade away the app's offline guarantee
(everything is currently precached via the existing Workbox config).

Scope shipped this pass:
  - `frontend/src/content/faqs.js` restructured into `HELP_CATEGORIES` (6
    task-oriented categories: Getting Started, Players & Roster, Lineups,
    Game Day, Sharing & Scoring, Account & Troubleshooting) with stable
    per-item `id`s, plus `GAME_DAY_HELP_IDS` (curated quick-access set,
    deliberately not labeled "Popular" — no analytics exist yet to justify
    that claim).
  - `FAQSection.jsx` (file/export name kept to avoid an App.jsx
    locked-file import change): Game-Day Help quick-access section, a
    simple client-side search (title + answer substring match, no
    library/server/AI), Browse Help category picker/accordion retained.
    Rendered heading changed "Frequently Asked Questions" → "Help".
  - Privacy-safe analytics: `help_search` (query_length/result_count/
    zero_results/category_match — never raw query text), `help_article_open`
    (stable article_id/category_id/entry_point), `help_category_view`.
  - Content-accuracy pass against actual code, not the prior FAQ text: the
    Game Day articles ("Player arrived late", "Replace an injured player",
    "Player needs to leave early") were rewritten after verifying
    `QuickSwap.jsx` (same-inning two-way swap only, filters out anyone in
    `absentTonight`) and `toggleAbsentTonight` (App.jsx — flips the
    attendance flag only, never touches the position grid). The prior FAQ
    text implied these were closer to one-tap actions than they are; the
    new copy describes the real multi-step, per-inning workflow.
  - `FAQSection.test.jsx` rewritten (H1-H14). Full frontend suite green
    (1376 passed / 1 skipped, up from the 1368/1 baseline). Lint clean,
    build clean.

Known product gap surfaced, not fixed here: there is no single action that
removes a player from all remaining innings and rebalances the rest of the
lineup automatically — a coach must repeat Quick Swap per inning. Flagged
as a real product question, not a content problem to write around.

**Update 2026-08-28:** the one remaining nav-label string is done — KK gave
the gate phrase, `MORE_SUBTABS`'s `faq` entry now reads `label:"Help"`
instead of `label:"FAQ"` (App.jsx ~L7486, one line). Verified `skip-worktree`
was not set on this clone (Bug #11) before editing. Full suite still 1377
passed / 1 skipped, lint/build clean. Story 107 (#285, tab reorder +
default-to-About) is unrelated to this story's scope and remains open on
its own.

Deferred, explicitly rejected rather than silently dropped: a hosted
external Help Center. Revisit only if `help_search` zero-result rates or
real support volume ever justify it.

**Revised same day, before push:** initial draft nested articles inside
`HELP_CATEGORIES[].items[]`. Reshaped to a flat `HELP_ARTICLES` list
(`id`/`category`/`title`/`answer`/`gameDayCritical`/`keywords`) plus a
separate `HELP_CATEGORY_META` array for category display/ordering — flat
records give more stable analytics identity, keyword-assisted search
(search now matches `keywords` too, not just title/answer text),
`gameDayCritical` as a per-article boolean instead of a hand-maintained
`GAME_DAY_HELP_IDS` list that could drift out of sync, and easier future
contextual deep-linking. Still static, still bundled, still offline —
shape change only. `FAQSection.test.jsx` grew H1-H14 → H1-H15 (added
keyword-match coverage); full suite 1377 passed / 1 skipped, lint/build
clean.

**Closed out 2026-08-28:** merged to `develop` as PR [#867](https://github.com/kaushikkuberanathan/lineup_generator/pull/867) (genuine 2-parent merge, `1b6a948`+`7248318`, not squashed) — resolved one real merge conflict along the way in `DOC_TEST_DEBT.md` (both sides had appended an independent "Resolved" entry at the same anchor line; mechanical, kept both). A same-day follow-up (PR [#869](https://github.com/kaushikkuberanathan/lineup_generator/pull/869)) corrected root `CLAUDE.md`'s stale test count (1368→1377) and added a `VERSION_HISTORY` entry (`frontend/src/data/versionHistory.js`, labeled `2.15.1`) documenting this story — discovered mid-pass that v2.15.0 had already promoted to `main` (PR #857, 2026-08-27) before this story's work started, so per KK's explicit choice the `2.15.1` label is provisional documentation only; `APP_VERSION` and both `package.json` files were deliberately left at `2.15.0` pending a real release-cut decision. Not yet promoted to `main`. Story 107 (#285, Support tab reorder + default-to-About) remains open, unrelated to this story's scope.

---
### Story 109 (P2) - Color token foundation: legacy C disposition <!-- #294 -->
Status: Resolved
Discovered: 2026-06-08 - T2 UX track, design-token migration kickoff
Target: v2.5.27
Symptom: App.jsx flat `var C` color object (20 keys, 437 call sites) predates
theme/tokens.js and was never migrated. No disposition recorded for the eventual sweep.
Impact: Blocked any principled C-to-token migration; no decision artifact existed.
Root cause: Known - C authored before the nested token system; App.jsx call sites
explicitly deferred in tokens.js (primitives-first sequencing).
Resolution: DESIGN_AUDIT.md "Legacy C Object Disposition" section added - per-key
ADOPT/DIVERGENT/ORPHAN table + multi-branch migration shape. Docs-only, no source
change. Shipped via PR #295.

---
### Story 110 (P2) - Resolve DIVERGENT/ORPHAN token decisions (blocks C migration) <!-- #296 -->
Status: Resolved
Discovered: 2026-06-08 - Story 109 recon
Target: v2.5.x
Symptom: 8 C keys do not map cleanly to tokens.js. DIVERGENT (visual change on migrate):
border, subtleBorder, overlayBg, text, greenField. ORPHAN (no token): navyLight, redDark, canceled.
Impact: Until resolved, no App.jsx color slice can claim visual equivalence. Gating
decision for the whole multi-branch sweep.
Root cause: Known - documented in DESIGN_AUDIT.md Legacy C Object Disposition.
Resolution: All 8 keys resolved (PR #490) - every key mints a new token rather than
adopting an existing one, each grounded in live App.jsx usage rather than the
2026-06-08 doc snapshot. Two corrections surfaced along the way: redDark is real
active usage (3 sites), not retirable; greenField is status-domain (team-readiness
badge), not field-domain, so it mints status.ready rather than adopting field.grass.
text.ink flagged as highest-blast-radius (20 sites incl. App.jsx's root color prop) -
its eventual App.jsx migration is explicitly NOT provably-no-op like the other 7 and
needs a full visual smoke pass. No App.jsx edits in this Story, as scoped.

---
### Story 111 (P3) - LockFlow.jsx local colors diverge from canonical tokens <!-- #297 -->
Status: Resolved
Discovered: 2026-06-08 - Story 109 recon
Target: v2.5.x
Symptom: LockFlow.jsx re-declares local color vars; gold (#b8860b) and textMuted
(rgba(15,31,61,0.45)) differ from brand.gold (#F5C842) and text.muted (#6b7280).
Impact: Duplicated hex sync hazard; lock modal renders different gold/muted than rest of app.
Root cause: Known - component extracted from App.jsx before the token system.
Resolution: PR #495. Original premise was stale - 3 of the 4 flagged keys (navy, win,
gold) were already migrated onto tokens.* by an earlier, unrelated commit (Story 87
BottomSheet migration) before this issue was filed; confirmed via grep before starting,
corrected in an issue comment. Only textMuted remained. Minted color.overlay.navyStrong
(not color.text.navyMuted as first placed) - theme.tokens.test.js enforces color.text
as hex-only, so the rgba value has to live in the overlay family; the wrong first
placement was caught by that exact test on a full-suite run before landing, not
assumed correct.

---
### Story 112 (P2) — admin.js authorized-action route coverage <!-- #474 -->
Status: Open
Discovered: 2026-07-31 — Story 99 closure pass
Target: v2.9.x
Symptom: admin.auth.test.js (9 specs) proves every admin.js route rejects an
unauthenticated or non-admin caller with 401 — but no test exercises what
happens when an authenticated admin actually calls one of these routes.
7 routes have zero coverage of their real behavior: GET /api/v1/requests,
POST /api/v1/reject, GET /api/v1/members, POST /api/v1/update-role,
POST /api/v1/reset-access, POST /api/v1/suspend, GET /api/v1/admin/deny-link.
(POST /api/v1/approve and GET /api/v1/admin/approve-link already have
authorized-path coverage via approve.role.test.js / approveLink.role.test.js.)
Impact: This is the exact "green but vacuous" pattern #252 (Story 99) was
opened to close, narrowed from "route coverage follow-up open" (no list) to
these 7 specific routes. A regression in any authorized admin action —
wrong role transition, wrong status filter, wrong audit-log write — would
currently ship with a fully green CI run. Subsumes the two items previously
tracked as "remaining Phase 2 candidates" under Story 99 (malformed/expired-
token 401 spec, requireAdmin rejection with a valid non-admin token) —
neither was ever written; fold both into this story's scope rather than
leaving them orphaned under a now-resolved story.
Root cause: Known — admin.auth.test.js was written to close the specific
"phantom /api/v1/admin/* paths" bug (Story 99's original symptom) and never
extended to the authorized-success path once that immediate bug was fixed.
Proposed fix: One test file per route (or a shared admin.routes.test.js
following the stubbing pattern in auth.session.test.js / feedback.test.js —
stub supabaseAdmin.auth.getUser for an admin caller, stub .from() per table
the route touches). Minimum: one 200-with-correct-side-effect spec per
route, plus the two admin-auth edge cases folded in above. No route handler
changes expected — this is coverage-only unless writing it surfaces a real
bug, the same way feedback.test.js did for Story 99.

---
### Story 113 (P2) - cream background token disposition (App.jsx var C gap) <!-- #496 -->
Status: Resolved
Resolved: commit `59959fd` (#508) - "Story 113: mint color.surface.cream, retire C.cream (5 App.jsx sites)". Verified 2026-08-03 via grep: zero live `C.cream` references remain in App.jsx; `tokens.color.surface.cream` appears at exactly 5 sites, matching this story's predicted count. Docs status was stale - the code landed before this entry was flipped.
Discovered: 2026-08-02 - App.jsx color sweep scoping session
Target: before any App.jsx region-slice migration starts
Symptom: C.cream (#fdf6ec), the literal app-wide page background, was never
audited by Story 109's disposition table - 19 of var C's 20 keys got a
decision, cream did not. 5 call sites.
Impact: The App.jsx color sweep can't claim "every var C key decided" until
this closes. Low mechanical risk but it's the backdrop behind every screen.
Root cause: Known - Story 109's original recon missed this one key.
Proposed fix: Mint color.surface.cream (or similar), preserve current value
exactly - same pattern as Story 110's 8 resolutions. surface.page is not
close (cool vs warm cast); surface.tableHeader is value-close but wrong
domain (table-header band, not page background) - noted for design input,
not blocking the mint decision.

---
### Story 114 (P2) - text root-prop visual-smoke verification (App.jsx var C) <!-- #497 -->
Status: Resolved
Resolved: commit `532296c` (#509) - "Story 114: verify + swap C.text to tokens.color.text.ink (20 App.jsx sites)". Verified 2026-08-03 via grep: zero live `C.text` references remain in App.jsx; `tokens.color.text.ink` appears at exactly 20 sites, matching this story's predicted count. The "Update 2026-08-02" note below saying the swap "has not started" was accurate when written but the swap landed in the same squashed commit shortly after - docs status was stale.
Discovered: 2026-08-02 - App.jsx color sweep scoping session
Target: before any App.jsx region-slice migration touches the root render
Symptom: Story 110 already resolved text's token-layer decision (minted
color.text.ink) - but confirmed 2026-08-02 that App.jsx's own root render
node sets color:C.text directly (both the S.app style constant and the
literal root <div> App's main render function returns), not just a leaf
component. 20 call sites, all through inheritance from that root.
Impact: A region slice's RED-GREEN snapshot only covers sites it explicitly
touches - it would not catch a regression in some other, untouched region
silently relying on inherited root color. Needs a full visual smoke pass
across every screen, not a snapshot-diff assumption.
Root cause: Known - documented as a risk in Story 110's own token comment;
this story is the App.jsx call-site follow-through, not a new decision.
Proposed fix: Confirm color.text.ink is still the right target (already
preserves current value exactly - verification, not a new decision), do the
full visual smoke pass, then the mechanical swap at 20 sites is identical
to the other ADOPT keys.
Update 2026-08-02: Step 1 (exhaustive structural search, both inheritance
roots + all always-present chrome) and Step 2 (runtime getComputedStyle
verification) both done - one genuine finding (SharedView line 1064-1065,
confirmed at runtime to resolve to #1a1a2e / C.text exactly), every chrome
item independently re-confirmed safe. Methodology closed; the 20+2-site
App.jsx swap itself has not started (gated on the App.jsx unlock phrase).
See DESIGN_AUDIT.md Story 114 evidence artifact for the full record.

---
### Story 115 (P3) - S.app dead code cleanup (App.jsx, found during Story 114) <!-- #501 -->
Status: Open
Discovered: 2026-08-02 - byproduct of Story 114's render-tree topology investigation (App.jsx var C sweep).
Target: opportunistic - not blocking Story 114 or the region-slice sweep.
Symptom: `S.app` (App.jsx line ~678 - `{ minHeight:"100vh", background:C.cream, fontFamily:..., color:C.text }`) is dead code. Confirmed via grep: zero references to `S.app` anywhere in App.jsx as an applied style prop. It is defined and never consumed.
Impact: None today - it's inert. But it sat in the same object as every key Story 109-114 analyzed for real usage, and would have been silently counted as a "real" C.text/C.cream consumer if anyone assumed definitions imply usage.
Root cause: Unknown - likely superseded when the main app's actual render root moved to the "header + top tabs + scrollable content" return (the real root, ~line 7904) at some point after S.app was originally authored, and the old style object was never deleted.
Explicitly out of scope for Story 114 (text token-migration verification) and not fixed as a drive-by anywhere else - this issue exists specifically so it isn't lost and isn't silently folded into an unrelated PR's diff.
Proposed fix: Delete the S.app object entirely once confirmed no dynamic/computed reference exists (e.g. S["app"] or similar indirect access - worth one more grep before deleting). Tiny, isolated, its own cleanup story.
NOTE 2026-08-03: this story existed as GitHub issue #501 but had no ROADMAP.md entry - the inverse of the usual "placeholder marker with no issue" gap this repo's Issue Hygiene rules guard against. Filed here now; work tracked as its own task, not bundled into region slice 1's diff per this issue's own explicit request.

---
### Story 116 (P2) - GameModeScreen/DugoutView region-slice coverage gap (App.jsx var C sweep) <!-- #503 -->
Status: Open
Discovered: 2026-08-02 - Story 114's exhaustive Step 1 structural search
Target: resolve before the App.jsx color sweep can claim full coverage -
not blocking any of the other region slices individually
Symptom: GameModeScreen and the in-app DugoutView (App.jsx lines
~7996-8039) render nested inside the same color:C.text root Story 114
audited, but they're full-screen modes reached via navigation state, not
tabs or modals - so they fell outside every one of the 7 originally-planned
region slices' stated boundary without anyone deciding to exclude them.
Impact: The var C sweep could ship "complete" across all 7 original slices
while this surface's own inheritance risk was never checked by Story 114's
methodology or any slice's.
Root cause: Scope boundary gap - the region-slice plan followed App.jsx's
tab structure; Game Mode isn't reached via a tab.
Decided 2026-08-02: dedicated 8th region slice, sequenced last (not folded
into slice 1 or slice 7 - see DESIGN_AUDIT.md §Recommended migration shape,
item 8, for the full reasoning). Sequenced last because game-mode/ and
ScoringMode/ are each their own Locked File requiring their own gate phrase
in addition to App.jsx's, and this is the live game-day surface - proving
the migration pattern on six lower-stakes slices first is the safer order.
Proposed fix: When slice 8 starts, run Story 114's Step 1/2 methodology
against GameModeScreen/DugoutView specifically, then the mechanical swap.

---
### Story 117 (P2) - Full S.card retirement: Card primitive parity + App.jsx migration <!-- #514 -->
Status: All 17 App.jsx sites migrated (Phase 0 + Tier 1 + Tier 2 + Tier 3); the now-dead `S.card` definition itself (App.jsx, was lines 706-710) is deleted. One known gap held open, see below - not resolved.
Phase 0: Card.jsx `border` prop + raw-padding passthrough, 4 new tests, 20/20 passing.
Tier 1 (10 sites, uniform/no-op sites): Roster Quick Summary, 3 Schedule import panels, 3 Feedback sections, Links, About/Account, About/Updates.
Tier 2 (6 sites, real per-site customization): SharedView Batting Order (marginTop), Roster player card (padding="14px" raw passthrough), Songs walk-up card (marginBottom="8px" + conditional opacity/pointerEvents), Schedule Add/Edit Game form (static borderLeft red accent), Schedule game row (computed borderLeft accent + padding), Schedule Share Lineup modal (maxWidth/width + padding="24px"). The two borderLeft sites needed `border` keyed BEFORE `borderLeft` in the style object to correctly preserve the original spread-order override (left edge = accent, other 3 edges = base border) - verified via computed-style assertion, not assumed.
Tier 3 (1 site): Batting tab Season Stats box - kept its own pre-existing background (`rgba(15,31,61,0.03)`) and border (`rgba(15,31,61,0.1)`) override values, deliberately NOT the Tier 1 shared C.border/C.white pattern - re-checked per-site as flagged, not carried over blindly.
Verification: build clean (395 modules, 18.57s), full suite clean (975 passed/1 skipped/976 total, 80/80 files - 3 consecutive runs hit the documented Bug #7 worker cold-start flake with passing tallies before one came back fully clean; the flake's signature is a file-count DROP with a passing exit code, and none of these runs actually dropped a file - each isolated-retry and full-rerun reconciled to the expected total), lint clean (0 warnings - caught and fixed one real unused-var issue in the Tier 1 equivalence test along the way), plus 13 computed-style equivalence tests total (`Story117TierOneEquivalence.test.jsx` 6/6, `Story117TierTwoThreeEquivalence.test.jsx` 7/7) substituting for live-browser screenshots - the auth-gated tabs' magic-link/OAuth flow redirects to prod in this dev environment, no local bypass exists.
KNOWN GAP, explicitly not closed by this work: a real authenticated full-page render check across all touched surfaces (Roster, Schedule, Feedback, Links, Account, Updates, Batting, Songs, SharedView) is still owed once the Browser pane/auth flow can reach a local session. The computed-style equivalence tests prove the DOM node's style is byte-identical to the pre-migration values; they do not prove App.jsx's JSX wiring is free of some unrelated rendering bug at each real call site. Do not treat this story as fully closed until that check happens.
Discovered: 2026-08-02 - UX track spike session re-auditing Story 64 (closed 2026-05-29, PR #247)
Target: v2.8.x
Symptom: Story 64's closure only migrated LegalSection's single call site. 17 `S.card`
consumers remain live in App.jsx across Roster, Batting, Songs, Schedule, Feedback,
Links, About (Account + Updates), and the public SharedView. Full audit grouped them
into 9 override/addition shapes and 3 risk tiers:
  - Tier 1 (10 sites): bare or no-op `S.card` reference, zero real customization
  - Tier 2 (6 sites): real per-site customization (padding variants, borderLeft
    accents, conditional opacity/pointerEvents, modal sizing)
  - Tier 3 (1 site, Batting tab Season Stats box): overrides core surface
    color/border, not just spacing - stays a style escape, not a new Card variant
Impact: `S.card` remains a parallel, untokenized styling path alongside the Card
primitive. Card.jsx itself had two real contract gaps this surfaced: no `border`
prop, and boolean `shadow` mapped to `tokens.shadow.card` (wrong token for this
shape) even though `tokens.shadow.subtleCard` is an exact match for `S.card`'s
box-shadow.
Root cause: Known - Story 64's PR #247 scope covered only the one LegalSection site
discovered during Phase 3 Step 3; the "audit S.card consumers in App.jsx first"
recommendation was never followed up.
Resolution (Phase 0): Card.jsx - added `border` boolean prop (1px solid
`tokens.color.border.default`) and raw-string passthrough for `padding` values
outside the sm/md/lg scale. 4 new characterization tests (C3.4/C3.5/C8.1/C8.2).
Radius 10px has no exact token (nearest: md 8px / lg 12px) - accepting the
`radius.md` drift, same call LegalSection made for its one site; this is now the
second instance of that exact accepted drift - a third would be a signal `radius`
needs a dedicated in-between value, not another silent acceptance.
Remaining: Phase 1 (10 Tier 1 sites, mechanical swap), Phase 2 (6 Tier 2 sites,
Card + targeted style escape per site), Phase 3 (Tier 3's one site stays a style
escape). Requires the App.jsx gate phrase + feature branch off `develop` per
CLAUDE.md. Verification is manual/visual across the 9 affected surfaces (no
per-tab App.jsx unit tests exist) - must render pixel-identical.
Note: originally misfiled as "Story 112" against a stale local `main` checkout
before verifying against `origin/develop`, where 112 was already in use (admin.js
route coverage, #474). Caught before commit; renumbered to 117 (next-free after
the highest in-use number, 116). GitHub issue #514 title corrected to match.
Correction 2026-08-03: the note above originally said "115 was found
unused/skipped" - that was wrong. Story 115 is real (GitHub issue #501, S.app
dead-code cleanup); it just had no ROADMAP.md body at the time this was
written, which is why the numbering check didn't surface it as in-use. See
Story 115's own entry above for the fix.

---
### Story 118 (P3) - Vitest Bug #7 flake: pool/timeout tuning + Windows Defender exclusion investigation <!-- #517 -->
Status: Open
Discovered: 2026-08-03 - Bug #7 (Windows Vitest worker cold-start flake) cost multiple full-suite re-runs in one session; investigated switching the default pool as a permanent fix rather than a manual per-run retry.
Target: opportunistic - current threads/maxWorkers:1 config remains the working default in the meantime.
Symptom: `frontend/vite.config.js` pins `pool: 'threads', maxWorkers: 1` - a single-worker config that still intermittently drops 1-2 test files per run to a worker-spawn timeout (Bug #7), recoverable only by re-running the full suite until a clean pass lands.
Impact: Every full-suite run has a real chance of costing a second (or third) re-run for a trustworthy clean number - pure session-time overhead, not a signal of real regressions. 100% of investigated Bug #7 instances this session were confirmed clean in isolation.
Root cause: Unknown precisely - two live theories: (1) pure Windows Vitest worker-thread cold-start flake, environmental and unrelated to endpoint security; (2) a deeper spawn-contention issue, possibly endpoint security software (Cox Defender or similar) scanning newly-spawned worker threads/processes on-access, adding enough latency under load that some workers miss their startup handshake window.
Tried and empirically REJECTED this session - do not retry blindly: switching to `pool: 'forks'` + `poolOptions.forks.singleFork: true` (the pre-Story-41 config). Not just insufficient - actively worse: dozens of `[vitest-pool]: Timeout terminating forks worker for test files` messages (most of the suite, not 1-2 files), 7 REAL test failures with explicit `Error: Test timed out in 5000ms` (tests hung, not just dropped), and duration ballooned 4x+ (`environment` sub-phase alone: 1012.29s vs. the normal ~250-450s total run). Categorically different failure signature than Bug #7's isolated flake - looks like a systemic hang, consistent with Story 41's original Cox Defender `child_process.fork` IPC finding still being live even though the specific git-hook-context trigger no longer applies (Vitest was removed from the pre-push hook in Story 75 - CI is now the authoritative gate). Reverted immediately; `git diff` confirmed zero net change before moving on.
Proposed fix - three independent angles, not mutually exclusive:
  1. Confirm whether the current threads/maxWorkers:1 flake rate is an acceptable steady-state (keep the manual-retry pattern, documented clearly), or whether tuning threads-pool-specific options (worker count, startup timeout) reduces the flake rate without the forks-pool regression.
  2. Document a Windows Defender (or Cox Defender specifically) exclusion recommendation for the project's node_modules and repo root as a system-level fix - NOT something a coding session can apply itself (requires admin access to endpoint security policy); write up as a clear manual step for whoever administers the machine.
  3. Once either angle is tried, revisit whether the flake was ever really about Vitest/Windows at all, or has been masking this deeper spawn-contention issue the whole time - correct the "Bug #7" doc language accordingly if so.
Explicitly out of scope for this issue: actually applying a Windows Defender policy change.

---
### Story 119 (P2) - App-shell root gradient third-stop token disposition (App.jsx var C gap) <!-- #530 -->
Status: Open
Discovered: 2026-08-04 - flagged as a deliberately out-of-scope item during Phase 4 slice 1 (header/nav chrome), held for KK per the standing rule that real naming/architecture decisions get logged and confirmed, not decided solo.
Target: resolve before the App.jsx var C sweep can claim full coverage - does not block slices 2-9 individually.
Symptom: The app-shell root background (App.jsx, ~line 7876) is a ternary with a
third gradient stop at the literal hex #2a0a0a. Unlike every other resolved/ADOPT
key in this sweep, no existing token (dark or otherwise) is an exact value match -
this is a genuinely new color with no minted home yet.
Impact: None of the 9 planned region slices (1-8 tab/mode slices + slice 9, see
Story 120 below) claim this site. The sweep cannot say "every var C / literal-hex
site in App.jsx is token-driven" until this is decided - same class of gap Story
113 (cream) and Story 114 (text) closed before slice 1 started, just discovered
one slice later.
Root cause: Known - this stop was never audited by Story 109's original
disposition table (same root cause as Story 113's cream gap) because it's a
literal hex value, not a C.key reference, and the original table's search was
C.key-scoped.
Recommendation (2026-08-04, not yet confirmed by KK): mint a new token named by
role, not appearance - same principle Story 110's 8 resolutions and Story 113's
color.surface.cream mint both followed. Candidate name: color.brand.gradientDark
(the gradient stop's actual role - dark end of the app-shell background
gradient - not a generic "dark" or appearance-based name). Preserve the current
value (#2a0a0a) exactly; this is a reference-swap, not a visual change. Do not
mint or swap the call site without an explicit go on the proposed name.

---
### Story 120 (P2) - SharedView duplicate header: dedicate as region slice 9 (App.jsx var C sweep) <!-- #531 -->
Status: Resolved — shipped via PR #591, part of the v2.8.5 Phase 4b promote to `main` (PR #619, 2026-08-07)
Discovered: 2026-08-02 (Story 114's Step 1 structural search, DESIGN_AUDIT.md), disposition confirmed 2026-08-04.
Target: resolve before the App.jsx var C sweep can claim full coverage - sequenced
after slice 7, does not block slices 1-8.
Symptom: SharedView() (App.jsx lines ~805-1116, the public share-link view) has
its own duplicate header markup with its own separate C.red/C.navy/navyLight
literals. Not part of the main authenticated app's persistent header (already
covered by slice 1); renders via a completely separate <ErrorBoundary> tree
outside the main app shell's root. Never one of the 7 originally-planned region
slices - same class of boundary gap slice 8 (GameModeScreen/DugoutView, Story
116/#503) was carved out for.
Impact: The var C sweep could ship "complete" across slices 1-8 while
SharedView's own color references were never migrated or structurally verified
against Story 114's inheritance methodology - a real coverage hole, since
SharedView is the Auth Principle's #1 priority surface (share links must always
render, unauthenticated).
Root cause: Scope boundary gap, same shape as slice 8's - the region-slice plan
followed the main app shell's tab structure; SharedView is a structurally
separate render path (public, pre-auth, outside the authenticated shell), not a
tab or modal any of the 7 slices actually own.
Decided 2026-08-04: dedicated as its own region slice - slice 9 - rather than
folded into an existing slice (same reasoning as slice 8's carve-out). Sequenced
after slice 7, not last like slice 8 - SharedView has no Locked-File
gate-phrase complication beyond App.jsx's own, so it doesn't need to wait as
long as slice 8 does.
Proposed fix: When slice 9 starts, run Story 114's Step 1/2 methodology against
SharedView's own render tree specifically (groundwork already exists in Story
114's "Root 1 - SharedView()" table in DESIGN_AUDIT.md), then the mechanical
C.* -> tokens.* swap for its own header markup.

---
### Story 121 (P0) - AppShareLinkRouting.test.jsx incomplete Supabase mock fires real network writes/deletes <!-- #535 -->
Status: Resolved (2026-08-05). Treated as a hard-stop investigation before any
fix per this repo's live-data-mutation severity tier (same as D-S355) - full
findings reported to KK, explicit go-ahead given, before writing the fix.
Confirmed NOT an active incident: a read-only probe against the real REST
endpoint returned 401 "Legacy API keys are disabled" (disabled
2026-07-14T17:11:14Z, three weeks before this investigation) - no write
through this path has ever succeeded, past or present. Confirmed CI is not
exposed at all (frontend/.env is gitignored, CI injects no Supabase secrets
into the frontend job). Scope grew beyond this ticket's original framing:
AppNoMembershipRouting.test.jsx had ZERO Supabase mocking (not just an
incomplete one), and its own real fixture uses the actual Mud Hens team ID.
Both files fixed with a fully self-contained supabase.js mock (no
`importOriginal` spread) - see DOC_TEST_DEBT.md's matching Resolved entry for
full technical detail and the git-stash RED-checkpoint evidence (19 real
"Legacy API keys are disabled" unhandled rejections with the old mock, 0
with the fix, same 8/8 tests passing throughout). Also corrects a
mischaracterization from earlier the same session: several "N errors" lines
seen during unrelated full-suite runs were wrongly attributed to Bug #7 noise
without verifying the source - they were these exact 401'd write attempts.
Clears the debt-p0 gate again (0 open P0 items). Branch:
issue/535-appsharelinkrouting-mock-fix, PR #574.
Discovered: 2026-08-04, while diagnosing Bug #7 (Vitest worker-spawn flake,
Story 118/#517) on the lineup-generator (Dugout/main) worktree.
Target: should be picked up soon, not routine backlog cadence - see Impact.
Symptom: frontend/src/__tests__/AppShareLinkRouting.test.jsx mocks
../supabase.js incompletely - `Object.assign({}, actual, { dbLoadShareLink:
... })` spreads in the REAL module and only overrides dbLoadShareLink. Every
other export (dbSaveTeamData, dbSaveTeams, deleteTeam, etc.) falls through to
the real implementation, firing genuine Supabase network calls during the
test run (confirmed: dbSaveTeamData, dbSaveTeams, and a real deleteTeam(teamId)
call, all triggered from "renders SharedView (not DugoutView)" test cases).
Impact: LIVE-DATA-MUTATION RISK, not just a flaky-test annoyance. On any
machine where the local .env's VITE_SUPABASE_ANON_KEY is still valid
(not yet legacy-disabled), running npm test locally fires real writes AND a
real delete against whatever team_id the test constructs, against the actual
Supabase project this repo points at. On the lineup-generator worktree
specifically this instead surfaces as loud "Legacy API keys are disabled"
unhandled rejections (6-9 per full-suite run) because that worktree's local
key has already been disabled - which is what exposed the bug, not the cause
of it. A teammate or any environment with a still-valid key would NOT see an
error at all; the writes/delete would simply succeed silently against real
data. Identical mock gap exists verbatim on the UX worktree's copy of this
file - it just hasn't surfaced there yet (different local key), so this needs
fixing at the shared source, not per-worktree.
Root cause: Known - incomplete vi.mock spread pattern, confirmed by direct
source read.
Possible connection to Story 118/#517: real, uncontrolled network I/O firing
mid-test-run is exactly the kind of resource/timing contention Story 118's own
"Root cause: Unknown" section lists as an alternate, unconfirmed theory for the
worker-spawn flake. Not proven - worth re-evaluating the flake rate once this
mock gap closes.
Proposed fix: Complete the mock - either explicitly stub every supabase.js
export this test's code path can reach (dbSaveTeamData, dbSaveTeams,
deleteTeam at minimum, re-verify the full call surface before closing), or
mock the entire module without spreading in `actual`, matching the pattern the
file's own top comment references (SharedView.test.jsx /
AppNoMembershipRouting.test.jsx - check whether those siblings already do this
correctly, as a first diagnostic step).

---
### Story 122 (P1) - Dependabot #61/#62/#63: ip-address SSRF/trust-boundary bypass via express-rate-limit <!-- #539 -->
Status: Resolved (2026-08-05), per KK's explicit go decision after a
decision-ready writeup (severity, exploitability, and fix-cost analysis).
Investigated reachability directly against source before deciding fix
approach: `ipKeyGenerator(req.ip)` in `backend/src/routes/auth.js`'s
loginLimiter IS the vulnerable code path, but only as a documented
"defensive only" fallback branch (the code's own existing comment) - the
happy path keys on email, not IP. Even if hit, this is an IP-classification
bug used only for rate-limit bucket keying here, not a trust/access
decision - narrower than the advisory's generic SSRF framing for this
specific usage. Confirmed `express-rate-limit`'s own latest version (8.6.2)
still declares `"ip-address": "^10.2.0"` - never bumped its own constraint -
so the fix does NOT require an express-rate-limit bump at all: added
`"overrides": { "ip-address": "^10.4.0" }` to `backend/package.json` (a
locked file, gate phrase granted same session). `npm install` confirmed the
resolved version: `node_modules/ip-address` now pins exactly `10.4.0`
(satisfies `>=10.3.1`, closing #61/#62/#63 together). Verified no
regression: `loginLimiter.test.js` 3/3 pass, full backend unit suite 111/111
pass, 0 fail. `npm install` also reported "found 0 vulnerabilities".
Branch: `issue/539-ip-address-override-fix`, PR #583. Dependabot alerts
#61/#62/#63 auto-confirmed `state: fixed` at 2026-08-05T21:51:35Z, matching
this fix's merge.
Update 2026-08-05: a third alert, #63 (HIGH), appeared seconds after v2.8.4's
version-bump merged to develop - same ip-address package/dependency chain
(express-rate-limit), but a more severe, broader-reaching SSRF bypass
(leading-zero octal/decimal decode mismatch - new URL('http://012.0.0.1/').hostname
resolves to 10.0.0.1), affecting ALL ip-address versions <=10.3.0, fixed in
10.3.1. Per KK's explicit decision (2026-08-05): folded into this same Story
rather than escalated separately or blocking the v2.8.4 promote - the fix
should now target >=10.3.1 to close #61, #62, AND #63 together in one pass.
Discovered: 2026-08-04, during the v2.8.4 release audit's live Dependabot
check (docs/product/RELEASE_AUDIT_2026-08-04.md - superseded the previously
assumed "2 known alerts" with the actual live count of 4).
Target: soon, not routine backlog cadence - these are runtime (not dev-only)
backend alerts.
Symptom: Two NEW Dependabot alerts, both created 2026-08-04, both on
ip-address (backend package-lock.json, runtime scope, not a dev dependency):
#61 (medium) - IPv4-mapped/NAT64 IPv6 address misclassification can bypass
SSRF and trust-boundary checks (vulnerable >=10.1.1 <=10.2.0, fixed in
10.2.1). #62 (medium) - a CIDR suffix on the parsed address suppresses
special-use classification, same SSRF/trust-boundary bypass class
(vulnerable >=10.1.1 <=10.2.1, fixed in 10.2.2). Both pulled in transitively
via express-rate-limit@8.6.1 - the actual loginLimiter middleware protecting
POST /magic-link in production.
Impact: Not independently confirmed whether express-rate-limit's actual usage
of ip-address (IP-based rate-limit keying / trust-proxy classification)
touches the vulnerable code path directly - that's the first thing to check,
not assumed. Sits directly behind the auth rate-limiter, so deserves closing
out rather than leaving open indefinitely even though real exploitability is
unconfirmed.
Note - two OLDER alerts exist too, NOT the concern of this issue: #28 (high,
vite, dev-only) and #30 (medium, vite/launch-editor, dev-only) are both
transitive via vitest@4.1.2's own bundled vite@8.0.14 (a
devDependency-of-a-devDependency, never reaches a deployed build) - separate,
lower-relevance, not tracked by this issue.
Proposed fix: Bump express-rate-limit to a version that pulls a patched
ip-address (>=10.3.1, covers #61/#62/#63 together), or add an npm
overrides/resolutions entry pinning ip-address directly if express-rate-limit
hasn't picked up the bump yet. Verify loginLimiter behavior is unchanged
after the bump (existing rate-limit tests should cover this).

---
### Story 123 (P0) - RESOLVED: 004_rls_fixes.sql missing idempotency guards blocked v2.8.4 promote <!-- #564 -->
Status: RESOLVED - merged to develop and main same session (PR #562, #560).
Discovered: 2026-08-05, while promoting v2.8.4 (PR #560, develop -> main) - the
RLS Policy Suite (ephemeral) CI check failed deterministically on develop's
current tip.
Symptom: psql:.../004_rls_fixes.sql:150: ERROR: policy "teams_auth_select" for
table "teams" already exists. Root cause: the Doc Audit Spike's Story 1 (#549)
correctly updated docs/db/schema.sql to document that WS-3's RLS policies
(teams/team_data/roster_snapshots) are live in prod - with proper DROP POLICY
IF EXISTS guards. But backend/scripts/apply-rls-bootstrap.sh still
unconditionally replays backend/migrations/004_rls_fixes.sql after schema.sql
on the header's own now-outdated assumption that schema.sql didn't yet
contain 004's policies. Every CREATE POLICY in 004 lacked a self-referential
DROP POLICY IF EXISTS guard (only older catch-all policy names were guarded),
so the replay collided.
Impact: Blocked the v2.8.4 promote for approximately 30 minutes. Not a live
security exposure - the actual RLS policies enforced in prod were correct
throughout (T1 verified them directly against prod via pg_policies for
Story 1); this was a CI-harness idempotency bug that temporarily removed the
ability to validate RLS on a fresh ephemeral database.
Fix: PR #562. Read 004_rls_fixes.sql in full, cross-referenced all 12 CREATE
POLICY statements against schema.sql's actual current content (not just the
one error line) - 9 of 12 currently collided (teams x4, team_data x3,
roster_snapshots x2); added guards to all 12 for consistency, since partial
idempotency is exactly what caused this. Updated apply-rls-bootstrap.sh's
header comment to document the now-partially-false assumption. Verified via
the real ephemeral-DB CI job (no local Docker available) - green on first
re-run. Backend unit suite 111/111 unaffected.
Cross-team coordination: T1 notified via a comment on Story 1's issue (#549).
Flagged that migrations 013-017 (also in apply-rls-bootstrap.sh's replay
list) haven't been individually audited for the same guard-completeness -
worth a look before assuming they're immune to the same class of failure if
schema.sql gets re-captured again in the future.

---
### Story 124 (P2) - Home tab team search + request-access discovery <!-- #655 -->
Status: Resolved — shipped via PR #663, merged to develop.
Branch: `claude/role-access-model-evolution-8a855d`.
Discovered: 2026-08-08, product/architecture review session.
Symptom: Home tab only shows teams the user is already linked to. No way to
discover a team by name/age-group/sport and request access - requires a
manually-shared raw team ID.
Impact: Onboarding friction for parents, scorekeepers, coordinators, and new
coaches.
Root cause: N/A - feature gap.
Proposed fix: New `GET /api/v1/teams/search` backend route (service-role
mediated, returns `id`/`name`/`age_group`/`sport`/`year` only - never
`owner_id`), Home tab search entry point, role picker submitting into the
existing `POST /request-access`.
Recommendation: Ship as proposed. This issue covers both the backend route
(T1) and the frontend UI (T2) - same issue number, split across two parallel
sessions; see `CLAUDE_HANDOFF_2026-08-08.md` for the route contract.
Note: This initiative's original handoff also scoped a "Story A" (role
vocabulary reconciliation, premised on a bug in `/admin/approve-link` and a
missing `viewer` option in `/request-access`). Recon on 2026-08-08 found that
bug already fixed by WS-1/#336 (`backend/src/lib/normalizeRole.js`) well
before this session - Story A was dropped, not filed as an issue.

---
### Story 125 (P2) - Phase 4C: role-scoped data model (Coordinator/Scorekeeper grants) <!-- #656 -->
Status: Blocked - filed, not built.
Discovered: 2026-08-08, product/architecture review session.
Symptom: `team_data` is one JSONB row per team with one RLS write rule
(admin/coach only). No way to grant Coordinator write access to
schedule/snacks/songs or Scorekeeper write access to batting order without
also granting full `team_data` access.
Impact: Coordinator and Scorekeeper roles exist but can't be given real
scoped permissions until this lands.
Root cause: N/A - architecture gap, matches already-documented PERSONAS.md
Phase 3 items ("scoped write access") that were never built.
Proposed fix: Extract `walk_up_songs`, `team_schedule` (+ snack duty), and
batting order into their own tables with per-domain RLS policies, mirroring
the live-scoring table pattern.
Recommendation: BLOCKED. Requires Phase 4 auth cutover to be live first -
building field-level RLS before the app can authenticate a role is inert
work. Do not schedule ahead of Phase 4.
Named precondition - Option A/B decision (2026-08-08): Coordinator currently
normalizes to coach-tier access per `normalizeRole.js` (Option B, WS-1/#336).
Promoting coordinator to a distinct canonical role (Option A) is required
before differentiated grants are possible, and was deliberately deferred, not
resolved, on 2026-08-08. Revisit this decision explicitly when Phase 4
unblocks - do not silently reverse Option B as part of unrelated work.

---
### Story 126 (P2) - RequestAccessScreen: preserveSession success gave no visible confirmation <!-- #665 -->
Status: Resolved — shipped via PR #667, merged to develop.
Discovered: 2026-08-10, session testing Story 124/#655's preserveSession path.
Symptom: On a successful `preserveSession=true` submission (an already-
authenticated coach requesting a 2nd team), the form gave no visible
feedback - loading flipped back to false, the button reset, and nothing else
happened. A stale comment (`// On success, useAuth sets authState →
'pending_approval'`) no longer matched this path, since preserveSession
keeps the existing session instead of transitioning authState.
Impact: From the coach's perspective, submitting the request was
indistinguishable from nothing having happened - no confirmation the
request was sent.
Root cause: The preserveSession success branch never diverged from the
default (pre-auth) success branch, which relies on useAuth's authState
transition to route to PendingApprovalScreen. That transition doesn't apply
when the session is preserved.
Proposed fix: Added `submitted` state, set only on preserveSession success;
conditionally renders an inline "Request Sent" confirmation card in place of
the form. Corrected the stale comment to document both paths explicitly.
File: `frontend/src/components/Auth/RequestAccessScreen.jsx`.
Recommendation: Ship as implemented. Zero test coverage on the new
confirmation state - tracked as part of #664 (Story 124 follow-up test
debt), not blocking since it's UI-only and was verified by eye.

---
### Story 127 (P3) - Home team card "..." menu (Edit/Delete team) not role-gated <!-- #666 -->
Status: Open - filed, not built.
Discovered: 2026-08-11, during local testing of Story 124/#655.
Symptom: The team card's "..." menu (Edit team, Download backup, Delete
team) - rendered inline inside `renderHome()`'s team-list map in
`frontend/src/App.jsx` (~lines 2963-3003) - is shown unconditionally for
every fully-hydrated card, with no role check anywhere in that block. A
viewer-role member (read-only by design) sees the exact same Edit/Delete
options as an admin or coach.
Impact: Found while testing Story 124's search+request-access flow - after
being approved as viewer on a team, that team's card showed the full "..."
menu including Delete team, same as any other role. Any restriction, if one
exists, would have to live somewhere else in the write path, not in this
menu's visibility.
Root cause: Pre-existing - this menu's role-agnostic rendering predates
Story 124 and isn't something that session introduced.
Proposed fix: Gate the "..." menu (or at minimum the Delete/Edit actions
inside it) on the current user's role for that team_id, once memberships
are available in `renderHome()`'s render scope.
Recommendation: Not urgent - file and track. Related to the broader
role-scoped-grants work tracked in Story 125/#656, though this specific gap
is simpler - it's card-level UI visibility, not the deeper domain-permission
model Story 125 covers.

---
### Story 128 (P3) - Local backend SUPABASE_TARGET dev/prod toggle <!-- #668 -->
Status: Resolved — shipped via PR #669, merged to develop 2026-08-14.
Discovered: 2026-08-11, local backend testing session.
Symptom: Testing the backend locally against dugout-lineup-dev required
either hardcoding dev Supabase credentials over prod ones in a single
.env file, or manually swapping values back and forth between test runs -
easy to leave misconfigured and accidentally point a local process at
production.
Impact: Dev-tooling only, no user-facing impact. Reduces risk of a local
process accidentally writing to production Supabase during testing.
Root cause: N/A - tooling gap, not a bug.
Proposed fix: Optional SUPABASE_TARGET env var in `backend/src/lib/env.js`
selects between SUPABASE_*_DEV and SUPABASE_*_PROD suffixed vars when set;
falls through unchanged to the plain SUPABASE_* vars when unset, verified
via isolated `node -e` checks (target unset + plain vars present -> no
throw, values byte-for-byte untouched). Render never sets SUPABASE_TARGET,
so production is unaffected regardless.
Recommendation: Ship as implemented. Dev-tooling only, no test suite impact
expected.

---
### Story 129 (P1) - Phase 4C shim-removal sequence, steps 2-7 remaining <!-- #688 -->
Status: Open - blocked, gated.
Discovered: 2026-08-15/17, Phase 4C recon sessions.
Symptom: Live scoring's auth shims (`useLiveScoring.js`'s
`_effectiveUserId`/`_effectiveUserName` fallback, `DugoutView.jsx`'s
`isEnabled = liveScoringEnabled || true` and `scoringUserId` fallback chain)
are still active in production. Migration 019 Section A (additive
`auth.uid()`-scoped RLS policies) is applied to DEV only, confirmed live via
direct policy query 2026-08-17; PROD and Section B are both untouched
anywhere.
Impact: Live scoring's real security fix (#355) cannot land until this full
7-step sequence completes. Steps 2-7 are the actual behavior change; step 1
(Section A on DEV) is done but is additive-only and changes nothing
observable yet.
Root cause: N/A - sequenced infrastructure work, not a bug.
Proposed fix: Full 7-step sequence documented in
`docs/product/PHASE4C_SCORING_RLS_PROPOSAL.md` §3 - (1) Section A on DEV
[done], (2) flip the frontend shim [needs `game-mode/*` gate phrase], (3)
soak in prod with KK actively present for a real game-day cycle, (4) Section
A on PROD + Section B + the new GRANT-revocation migration (Story 130)
together, (5) un-skip `LS1`-`LS7` in `policies.test.js`, (6) restore
`scorer_user_id`/`actor_user_id`/`recorded_by_id` column types to uuid+FK,
(7) remove `isAdminTestMode`.
Recommendation: Do not start step 2 solo - same standard as every other
change to a live game-day surface in this repo. Needs the `game-mode/*` gate
phrase and KK's active presence for step 3's soak, not something to attempt
in an unattended session.

---
### Story 130 (P1) - Scoring-tables GRANT-revocation migration - design decision needed <!-- #689 -->
Status: Open - not drafted, needs KK sign-off on design before drafting.
Discovered: 2026-08-15/17, Phase 4C recon sessions.
Symptom: `anon` and `authenticated` both currently hold full
TRUNCATE/DELETE/INSERT/UPDATE table-level grants on all 4 live-scoring
tables (`live_game_state`, `game_scoring_sessions`, `scoring_audit_log`,
`at_bats`) - confirmed via direct query against both DEV and PROD,
2026-08-15 and re-confirmed 2026-08-17. Migration 019's RLS work (Section A
applied to DEV, Section B not yet run anywhere) does not touch this layer at
all - RLS policies and table GRANTs are independent Postgres mechanisms;
dropping the anon RLS policies in Section B does not revoke these grants.
Impact: Even after Section B lands, `anon`/`authenticated`'s GRANT-level
access remains fully open unless this migration also lands - Section B alone
would not close #355.
Root cause: No migration has ever revoked these grants; migration 019 was
scoped to RLS policies only.
Proposed fix: A new migration (next number after 021, currently 022)
modeled on migration 021's REVOKE pattern, but NOT a mechanical copy -
migration 004/021's established pattern for `team_data`/`teams`/
`roster_snapshots` is "keep broad `anon`/`authenticated` grants, let RLS do
the scoping, only revoke the genuinely dangerous ops (TRUNCATE, DELETE)."
That pattern likely does not fit here: KK already confirmed (2026-08-07,
`PHASE4C_SCORING_RLS_PROPOSAL.md` §1.4) the `public_read_*` anon-SELECT
policies are unintentional leftovers, not a deliberate viewer design -
meaning there is no validated anon use case at all for these tables, unlike
`teams`/`team_data`. The likely-correct target is `anon` gets zero grants on
all 4 tables. Per-table `authenticated` grants aren't uniform either -
migration 019 Section A's own policies imply `game_scoring_sessions` needs
DELETE (the "Hand off scoring" flow releases the lock), but `live_game_state`,
`scoring_audit_log`, and `at_bats` have no DELETE or UPDATE policies in
Section A for the latter two (append-only by design) - grants should follow
that shape, not a blanket grant. TRUNCATE should be revoked from both roles
on all 4 tables regardless - no code path calls it.
Recommendation: Do NOT draft the final SQL until KK explicitly confirms the
design above (anon-full-lockout vs. keep-broad-rely-on-RLS; per-table
authenticated shape) - the same explicit-sign-off standard migration 019
itself used for the scorekeeper-role and `public_read_*` decisions. Once
confirmed, sequence this migration ALONGSIDE Section B (Story 129 step 4),
not before it and not instead of it, per `PHASE4C_SCORING_RLS_PROPOSAL.md`
§3 step 4's own note.

---
### Story 131 (P2) - UX Phase 5 kickoff - Auth Re-Skin <!-- #690 -->
Status: Open - in progress. Token-adoption groundwork shipped (PR #693,
merged to `develop` 2026-08-17, 2-parent merge `935af65`); the re-skin pass
itself is still open.
Discovered: 2026-08-17, confirming `UX_REFACTOR_ROADMAP.md`'s own Phase 4
dependency is now satisfied.
Symptom: N/A - not a bug, a roadmap-sequence unblock. `UX_REFACTOR_ROADMAP.md`
Phase 5 (Auth Re-Skin) lists "Phase 4 complete" as its sole dependency.
Phase 4 (`var C` legacy color-object retirement) shipped through v2.8.5,
confirmed zero `C.*` references remain in `App.jsx` - the dependency is
genuinely satisfied, not just nominally.
Impact: The auth screens are the last un-migrated visual surface in the
UX design-token effort. **Correction (2026-08-17):** this entry originally
claimed the drift palette was `#2471A3`/`#2980B9` - verified false by grep;
those hex values are field-position colors (`color.position['1B']`/`['2B']`
in `tokens.js`), never used in the auth screens. See
`UX_REFACTOR_ROADMAP.md`'s Phase 5 section for the corrected palette
inventory.
Root cause: N/A - sequenced roadmap work.
Proposed fix: Per `UX_REFACTOR_ROADMAP.md` §Phase 5 - replace the drift
palette with the canonical design-token system, cosmetic only. First task
(done, PR #693): inventory every auth-screen component currently using the
drift palette, cross-reference against existing design tokens, mint a new
token if none applies (same "mint by role, not appearance" convention as
`color.brand.gradientDark`) - `status.errorBorder` minted on that basis.
Remaining: KK's visual confirmation of PR #693's two intentional appearance
changes (`#0f172a`->`text.primary`, `#475569`->`text.secondary`), then the
standard `develop`->`main` promote ritual (24h soak not yet started).
**Correction 2026-08-17:** this entry previously implied a separate "actual
re-skin pass" was still owed beyond PR #693. Re-checked against
`UX_REFACTOR_ROADMAP.md`'s own Phase 5 goal statement ("converge onto the
canonical design-token system, align visually with the main app") - that
goal is exactly what PR #693's two commits did. There is no additional
scoped re-skin work; PR #693 is Phase 5's full scope, pending the two items
above.
Recommendation: Ship as scoped. Explicit scope boundary from the roadmap
doc itself, worth repeating since it's easy to blur with Phase 4C: cosmetic
only, no auth behavioral changes - those belong to Phase 4C (Story 129), not
here.

---
### Story 132 (P3) - UX Phase 6 - Design System Docs (scoping only) <!-- #697 -->
Status: Open - scoped, not started. Blocked on Phase 5 fully landing (KK
visual sign-off + promote to main), per this phase's own stated dependency.
Discovered: 2026-08-17, full-review audit of all UX migration phases across
dev and prod.
Symptom: N/A - forward scoping, not a bug. `UX_REFACTOR_ROADMAP.md`'s Phase
6 section had only a one-line goal statement and no scoping detail.
Impact: None yet - this phase hasn't started and nothing depends on it
starting soon. Scoping now avoids a cold start whenever it does begin.
Root cause: N/A.
Proposed fix: See `UX_REFACTOR_ROADMAP.md` Phase 6 section for the full
scoping writeup. Summary: in scope is the 9 shipped `components/ui/`
primitives + the token system; out of scope is the 4 Auth screens (don't
consume primitives yet) and App.jsx's own split (separate tracked
initiative, `APPJSX_DECOMPOSITION_PLAN.md`). Tooling recommendation:
`@storybook/react-vite` (this repo is already Vite 6 + React 18, no
`.storybook/` exists yet - from-scratch add), with a 1-day timeboxed spike
against Ladle as a lighter alternative before committing repo-wide.
Recommendation: Do not start implementation until Phase 5 promotes to
main and this scoping has KK's go-ahead on the tooling choice.

---
### Story 133 (P2) - Live game-day surface token migration (game-mode/ + ScoringMode/) <!-- #698 -->
Status: **All 13 slices merged to `develop` (2026-08-23, PR #764)** - the
migration itself is code-complete. **Corrected 2026-08-23: this line
previously read "slices 1-4 of 13 merged, 9 slices remain."** Slices 5-13
were developed on an isolated `feature/story133-slices5-13-sandbox`
branch per KK's explicit instruction (kept off `develop`/`main` during the
v2.12.0 release soak), independently re-verified after every sub-merge,
then promoted as a single PR (#764) once the soak cleared - full
mapping-decision reasoning and verification evidence for every slice is
preserved in that branch's history and `docs/product/STORY133_SANDBOX_PROGRESS.md`
(not yet copied into this repo's permanent docs). A bonus, out-of-scope
`components/ui/*` primitives migration (PR #759) was bundled onto the same
branch per KK's instruction and merged in the same promotion.
**Does not close #698** - per the standing rule, closure requires a full
real on-device Game-Day Validation pass across the complete migration,
done manually by KK, not yet performed. Two real findings surfaced during
the migration, not yet acted on: `InningModal.jsx`'s `POS_COLORS.LC` is
`#27ae60` (green), diverging from the shared `color.position.LC`
(`#2980b9`, blue) used everywhere else - preserved byte-exact, a fix is
planned as an immediate follow-up. A broader codebase audit (2026-08-23)
found ~818 more untokenized occurrences beyond this story's scope
(`App.jsx` alone: 693) - deliberately not pursued given no customer-facing
lift and `App.jsx`'s own pending decomposition plan.

<details>
<summary>Original slice-4 status note (2026-08-19), superseded above</summary>

Slice 4 is partially, not fully,
validated — automated coverage green, one manual QuickSwap flow confirmed
working, full device/layout visual coverage deliberately deferred as an
accepted residual risk (KK's call, 2026-08-19) rather than completed;
see the v2.11.0 ROADMAP entry above for the full release-bar reasoning.
#503 reopened by KK 2026-08-17. Scope expanded the same day past the
original ticket (see "Scope expansion" below) - KK's explicit call,
full-surface option chosen over the two narrower alternatives offered.
Discovered: 2026-08-17, full-review audit answering KK's question "was
there not some work with previous phases pending because ScoringMode was
locked?"
Symptom (original): Story 116/#503 (the `var C`/token-migration "slice 8"
carved out for `GameModeScreen`/`DugoutView` specifically because
`game-mode/*` and `ScoringMode/*` are each their own Locked File) was
deliberately sequenced last and never run. PR #591's own body is explicit:
"Closes #531. Related, not closed: #503 (slice 8, still open)." Yet #503
had shown closed on GitHub (manually, 2026-08-06, actor
kaushikkuberanathan, no state_reason, 4 minutes after PR #591's merge
cross-referenced it) - root cause: looks like an adjacent-issue mixup
during that session's cleanup, not an automated commit-keyword closure
(PR #591's own commits/body never say "closes #503"). Reopened by KK
2026-08-17 after being flagged via an evidence comment (agent tooling was
blocked from reopening it directly that session - permission classifier
denied both `gh issue reopen` and the `$GITHUB_TOKEN` curl fallback).
**Scope expansion, 2026-08-17:** the original ticket only named
`GameModeScreen.jsx` (33 literal-hex occurrences). Full survey of both
Locked directories found the real gap is much larger - **neither
`game-mode/*` nor `ScoringMode/*` has ever used the token system, not even
the legacy `var C` proxy**:

| Directory | Files | Literal-hex occurrences | Token refs |
|---|---|---|---|
| `game-mode/*` | 7 | 133 | 0 |
| `ScoringMode/*` | 7 | 251 | 0 |
| **Total** | **14** | **384** | **0** |

This is the largest untokenized surface remaining anywhere in the
codebase - bigger than all of Phase 4's App.jsx slices or Phase 5's Auth
screens combined. Confirmed `GameModeScreen.jsx` is genuinely live (not
dead code): reachable via 3 separate "Game Mode" buttons on ready team
cards (Home tab, App.jsx lines ~3017/3130/3152, each calling
`setGameModeActive(true)`), independent of the `DUGOUT VIEW` sub-tab
launcher which reaches `DugoutView.jsx` instead.
Impact: Phase 4 (`var C` retirement) is correctly declared complete for
`App.jsx` itself (0 `C.*` refs, confirmed directly against `main`) - that
claim was accurate for what it measured. But the entire live game-day
surface, across both locked directories, was never in scope for that grep
in the first place (it never used the `C` proxy; every file here uses
literal hex directly). "Phase 4 complete" never actually implied this
surface was addressed.
Vocabulary reuse is favorable: 58 distinct hex values across 384
occurrences; the top 10 most-used values account for ~253 occurrences
(66%), and most of those top values (`#f5c842`->`brand.gold`,
`#94a3b8`->`text.tertiary`, `#64748b`->`text.secondary`,
`#dc2626`->`status.error`, `#0f1f3d`->`brand.navy`/`text.primary`,
`#374151`->`text.body`, `#0b1524`->`surface.dark`, `#fff`/`#ffffff`->
`surface.card`/`text.onDark` role-dependent) already have exact token
matches. `#475569` and `#16a34a` repeat the same no-exact-match shape
Phase 5 already resolved once (converged to `text.secondary` and
`status.success` respectively, both KK-confirmed) - same call likely
applies here, subject to KK's per-surface confirmation.
Root cause: N/A - sequenced roadmap work, correctly saved for last given
the Locked-File + live-game-day-surface risk profile.
Proposed fix: Phased slice plan, mirroring Phase 4's proven pattern (prove
the mechanical/2-commit approach on low-risk files before the largest
ones). Each slice follows Phase 5's proven shape: commit 1 = exact-match
safe swaps (mechanical, zero-visible-change, hex-diff verified against
`tokens.js`); commit 2 = design-decision convergence for non-matching
literals (KK sign-off per value, same bar as Phase 5's `#475569`/`#16a34a`
decisions). Given no browser-automation tooling exists in this session
environment and this is the single highest-stakes surface in the app (live
games, zero regression tolerance), recommend a stronger visual-verification
bar than Phase 5 had: KK does a real on-device Game-Day Validation pass
(per `CLAUDE.md`'s own checklist - generate lineup, open Game Mode, advance
an inning, positions visible, batting order clear) after each slice merges
to `develop`, not just once at the end.

**`game-mode/*` track** (7 files, 133 occurrences, gated on the
`game-mode/*` phrase):
1. `BenchStrip.jsx` (3) + `ScoreboardRow.jsx` (7) - bundled, trivial, proves
   the pattern first
2. `DugoutView.jsx` (10) - small file, but the GA-default live surface
   (`COMBINED_GAMEMODE_AND_SCORING`), do early once the pattern is proven
3. `DiamondView.jsx` (15)
4. `QuickSwap.jsx` (20)
5. `GameModeScreen.jsx` (33) - the file the original ticket named
6. `InningModal.jsx` (45) - largest in this directory, last

**`ScoringMode/*` track** (7 files, 251 occurrences, gated on the
`ScoringMode/*` phrase, separate from the above):
1. `LiveScoreViewer.jsx` (0) - verification-only, confirm it's genuinely
   clean, not a real slice
2. `GameModeGearMenu.jsx` (10)
3. `RunnerConflictModal.jsx` (12)
4. `RestoreScoreModal.jsx` (15)
5. `FinishGameModal.jsx` (16)
6. `ScoringModeEntry.jsx` (31)
7. `LiveScoringPanel.jsx` (167) - by far the largest single file (60KB);
   likely needs its own sub-slicing once in progress. Last, always.

Recommendation: Start with `game-mode/*` slice 1 (BenchStrip +
ScoreboardRow) once KK grants the `game-mode/*` gate phrase. Each slice is
its own PR to `develop`, same merge-commit + branch-hygiene discipline as
every other track. Do not batch multiple slices into one PR - keeps blast
radius small and each KK visual-check cycle short.

**Superseded 2026-08-23:** slices 5-13 did not follow this per-slice
recommendation in the end - they were developed on an isolated sandbox
branch instead (see the status note at the top of this section) so the
run could proceed without a per-slice stop-and-wait gate, given nothing
would reach `develop` until explicitly promoted. All 13 slices are done.

</details>

---
### Story 134 (P2) - Home membership teams + unified Find your team entry <!-- #740 -->
Status: Resolved. Merged to develop via PR #741 (regular merge, `88ff549`,
2026-08-22).
Discovered: 2026-08-22, coach feedback on the signed-in Home experience.
Symptom: Home renders every team cached on the device, while Account correctly
renders only teams represented by the signed-in coach's memberships. Team
discovery is also split between a conditional local-filter field and a separate
"Don't see your team? Search for one" link at the bottom of the page.
Impact: Coaches can see stale or unrelated device-local teams, and the duplicate
search affordances make it unclear how to find or request access to another
team.
Root cause: Home's team list is sourced directly from `teams`; the Account
screen already has the correct membership-to-team reconciliation pattern.
Fix: Filter Home cards through `memberships[].team_id`, keep
newest-season-first sorting and existing card actions, show one always-visible
"Find your team..." bar that opens the existing Story 124 discovery flow, and
remove the legacy bottom link. App-level golden-path coverage added for
subscribed versus local-only visibility and discovery navigation
(`AppHomeMembershipTeams.test.jsx`).
**Post-merge review found two gaps, tracked as Story 135 below:** the change
expanded the blast radius of already-open bug #729 (a just-created team isn't
in `memberships` yet, so it now vanishes from Home too, not just Account,
until reload/re-login), and two docs (`faqs.js`, a `TeamSearch.jsx` header
comment) still referenced the removed "Don't see your team?" link.

---
### Story 135 (P2) - Refresh memberships after team creation + doc corrections <!-- #742 -->
Status: Resolved.
Discovered: 2026-08-22, self-review of Story 134/#740 immediately after merge
- once Home started filtering by `memberships[].team_id` in addition to
Account, the existing gap in #729 (createTeam() never updates the client-side
`memberships` array) got a second, more visible symptom.
Symptom: A coach creates a team, gets auto-loaded into it (`loadTeam()` still
fires immediately), but if they navigate back to Home before reloading the
app, the just-created team is missing from "Your Teams" - the membership row
is provisioned server-side instantly, but the client's cached `memberships`
state doesn't know about it yet.
Impact: Confusing "did my team actually get created?" moment for a coach
using the team they just made, right after Story 134 made Home
membership-filtered.
Fix: Added `refreshMemberships()` to `useAuth.js` - re-fetches `/api/v1/auth/me`
and updates `memberships`/`membership` only (does not touch `authState` or
`user`). `createTeam()` in App.jsx now calls it once the team's
`persistTeamBeforeLoad` save promise resolves, so the new team is visible in
Home/Account without waiting for a reload. Also fixed two stale docs
referencing the link Story 134 removed: `faqs.js`'s "not on the team yet" FAQ
now points at the "Find your team..." bar, and a header comment in
`TeamSearch.jsx`. RED->GREEN verified for both the hook unit test
(`useAuth.refreshMemberships.test.js`) and the App-level wiring
(`AppHomeMembershipTeams.test.jsx`) via mutation checkpoints.
Note: this does not close the broader #729 (Account tab has the identical gap
outside the create-team path, e.g. after a membership changes server-side for
other reasons) - #729 stays open, scoped to that wider case.

---
### Story 136 (P3) - Delete duplicate Vercel project <!-- #744 -->
Status: Resolved.
Discovered: 2026-08-22, while investigating a recurring red "Error" check on
PRs from a Vercel project named `lineup-generator` (no hyphen).
Root cause: Two Vercel projects were both linked to this repo's GitHub
integration - `line-up-generator` (hyphenated, the real one, owns
`dugoutlineup.com` and serves `dev.dugoutlineup.com`) and `lineup-generator`
(no hyphen), an orphaned duplicate created ~35 days later that owned no
custom domain and had inconsistently-configured env vars
(`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` missing on several builds).
Verified before deletion, via direct Vercel API lookups, that neither prod
nor dev traffic resolved through the duplicate - confirmed `dev.dugoutlineup.com`
resolves to a `develop`-branch build on `line-up-generator` only.
Fix: Duplicate project deleted from the Vercel dashboard.
Note: any local clone/worktree whose `frontend/.vercel/project.json`
(gitignored) was linked to the deleted project needs `vercel link` re-run
against `line-up-generator` (`prj_P1ajLGpY6ZezIsNMeTCPXPSnyZEu`) before using
the `vercel` CLI from that checkout.

---
### Story 137 (P3) - Story 133 token-migration follow-up cleanup <!-- #859 -->
Status: Backlog, not started.
Discovered: 2026-08-27, while reassessing Story 133's (#698) production
status. Three separate, unrelated-to-each-other design-token gaps
surfaced during/after that migration - batched here rather than
reopening #698, which stays scoped to the original 13-slice migration
itself.
Symptom:
1. **9 literal (non-token) colors resurfaced in the 3 earliest-migrated
   files** - `BenchStrip.jsx`, `DugoutView.jsx`, `ScoreboardRow.jsx`
   (slices 1-2, PRs #705/#707). Verified directly against `develop`:
   `BenchStrip.jsx` 4 `rgba()` occurrences, `DugoutView.jsx` 1,
   `ScoreboardRow.jsx` 4. Root cause unconfirmed - either the original
   migration missed sites, or unrelated feature work since reintroduced
   literals without reaching for the token.
2. **`#1d4ed8` and `#374151` were independently re-minted as separate
   component-scoped tokens** in 6 and 5 files respectively during
   slices 5-13, rather than converging on one shared token. Found by the
   migration's own author, documented in PR #764's body, not fixed
   there.
3. **A full-codebase audit run during the migration found ~818 more
   untokenized literal-color occurrences** outside Story 133's
   `game-mode/*` + `ScoringMode/*` + `components/ui/*` scope -
   `App.jsx` alone accounts for 693 of those.
Impact: None of these affect coaches today - no visual regression, no
functional risk. Pure design-system hygiene debt. (1) means the
migration isn't fully clean in the 3 earliest files; (2) means two
token names that should be one, inviting future divergence; (3) is the
single largest remaining untokenized surface in the app (bigger than
all of Story 133 combined) but deliberately out of scope given
`App.jsx`'s own pending decomposition plan.
Root cause: Known-ish for (1) (unconfirmed which of the two
explanations) and (2) (independent, uncoordinated per-slice token
minting during the slices 5-13 sandbox run); (3) is scope, not a
defect.
Proposed fix: (1) + (2) together in one slice-style PR - inventory,
propose mapping, KK sign-off, migrate, verify zero literal colors
remain; same low-risk byte-preserving mechanical pattern as the rest of
Story 133, small enough not to need its own sandbox branch. (3) stays
explicitly parked - revisit only alongside or after `App.jsx`'s
decomposition plan, not standalone.
Full detail: [#859](https://github.com/kaushikkuberanathan/lineup_generator/issues/859).

---
### Automated Score Reporting (County Integration)
**Status:** Architecture finalized, implementation pending
**Trigger:** Coach taps "Report Score" on a completed game

**Approach — n8n webhook orchestration (Option C):**
The county uses Microsoft Forms (anonymous, no login required). Direct URL pre-fill does not work (Microsoft Forms ignores query parameters). Direct backend submission is blocked by a session-bound CSRF token (`__RequestVerificationToken`) tied to a `FormsWebSessionId` cookie.

Solution: n8n workflow that:
1. GETs the form page fresh to obtain a live session cookie + CSRF token
2. Extracts `__RequestVerificationToken` from the HTML response
3. Immediately POSTs the submission to the Microsoft Forms API using the live token + cookie
4. Returns success/failure to the Dugout Lineup backend
5. Backend responds to app → app marks `scoreReported: true`

**Why not other approaches:**
- URL pre-fill: Microsoft Forms ignores query parameters (tested and confirmed)
- Direct backend POST: Blocked by CSRF token tied to browser session
- Form scraping: Fragile, against ToS
- Option deferred: Ask county to set up Power Automate webhook on their tenant (cleanest long-term solution — added as fallback if n8n approach becomes unstable)

**Microsoft Forms endpoint:**
```
POST https://forms.office.com/formapi/api/b9c4fdbd-efb6-477a-9fb3-32624a22cd70/users/fac416ea-6b9a-4181-b609-5ed2b010e9b0/forms('vf3EubbvekefszJiSiLNcOoWxPqaa4FBtgle0rAQ6bBURVExSDNDNEFTTkRaMVlRR0lNUDVGOUtFVy4u')/responses
```

**Field ID map (confirmed from live form API):**
| Field | ID | Type | Notes |
|---|---|---|---|
| Game Date | `rb77e5417b7f24d67a8e51b867cbc7253` | DateTime | Format: `YYYY-MM-DD` |
| Game Time | `ra3fc47859a864e21bf157e99e63df454` | Choice | Format: `"6:00 pm"` lowercase |
| Athletic League | `rae553b14cd27469d834903d9c1177096` | Choice | Static: `"Baseball"` |
| Age Group | `rbe7503c08cfa4e6da8e64582985cfedb` | TextField | Static: `"8U"` |
| Park Name | `rde02039428f3478a9b23fc134bab08cd` | Choice | Exact form values (see park map) |
| Field # | `r9eca2d2679a548ffbdbd6f5759d84d16` | Choice | Format: `"Field 1 "` (note trailing space) |
| Visitor Team | `r2163ab1a2bbd45d3b6a6a0b87b08504d` | TextField | |
| Visitor Score | `r000f1369832b4a3d89a4a6012f5e37f0` | TextField | |
| Home Team | `r26ac0e710b5446ac80a1a39c1ff88ff9` | TextField | |
| Home Team Score | `rc13b3be1dd6f4a23b82d8e9dd7a73e90` | TextField | |

**Home/Away logic:** `game.home === true` → Mud Hens are Home Team, opponent is Visitor. Flip when false.

**Park abbreviation map** (from existing `location` field):
| Abbreviation | Full Name |
|---|---|
| JV | Joint Venture |
| FP | Fowler Park |
| SS | Sharon Springs Park |
| BP | Bennett Park |
| CP | Central Park |
| CM | Coal Mountain Park |
| LP | Lanierland Park |
| MP | Midway Park |
| SMP | Sawnee Mountain Park |

**Schema changes needed before implementation:**
- Add `parkName` and `fieldNumber` as explicit fields on game objects (currently encoded in `location` string e.g. `"JV 2"`)
- Write migration to backfill from existing location values
- Update Add/Edit Game form UI to use dropdowns for Park Name (9 options) and Field # (1–9)

**n8n workflow to build:**
- Webhook trigger → HTTP GET form page → Code node extract token/cookie → HTTP POST submission → Respond to webhook
- Add webhook URL to smoke test Category 5 reachability check
- Add error alerting if POST returns non-201

**Risk:** Token extraction pattern could change if Microsoft updates their form page HTML. Mitigate with error alerting and Power Automate (county-side) as fallback.

---

## Security

Source of truth: `docs/product/SECURITY_FRAMEWORK.md`

- Phase 0 (Quick Wins) — not started
- Phase 1 (MVP Security Floor) — not started (absorbs legacy approve-link HMAC item)
- Phase 2 (Hardening) — not started
- Phase 3 (Scale & Compliance) — not started

---

## Architecture Notes

- **Storage:** Supabase (primary) + localStorage (offline cache with sync-on-connect)
- **AI backend:** Render Starter plan ($7/mo) since April 27, 2026 — no spin-down. UptimeRobot monitor #802733786 pings `https://lineup-generator-backend.onrender.com/ping` every 5 minutes for availability monitoring; alerts via email + push notification.
- **Frontend:** Vercel — auto-deploys on push to `main`
- **Auth:** Email magic-link auth and Google OAuth are live end to end; editing requires a session. Backend write routes use authentication/authorization middleware where required. The remaining role work is the multi-coach invite UX and finer-grained collaborator permissions, not a frontend auth cutover.
