# Doc Audit Spike — docs/product/* + SOLUTION_DESIGN.md + TROUBLESHOOTING.md vs. Prod (2026-08-04)

> **Historical audit snapshot.** Its findings are preserved as then-current evidence; the v3.1.0 reconciliation is tracked by Stories 334-340 in `ROADMAP.md`.

> **Status:** Discovery only. No doc edits made in this spike. This file is the punch list for a separate execution pass (KK will issue that as its own command/session).
> **Branch:** `feature/docs-product-audit-spike` (cut from `develop` @ `71629e9`)
> **Method:** 6 parallel research agents, each auditing a cluster of files by reading them in full and cross-checking every material claim against live source (grep/Read/git log), not against other docs. A few of the highest-severity claims were independently re-verified by the orchestrating session (spot checks noted inline). Every finding below has file:line evidence — treat findings without a specific citation as suspect.

---

## Baseline facts (get this right before anything else)

- **Production (`main`, origin/main @ `86a94d7`) is running v2.8.3.** `APP_VERSION = "2.8.3"` in `frontend/src/App.jsx`, confirmed via `git show origin/main:...`.
- **`develop` (@ `71629e9`) is 50 commits ahead, at v2.8.4** — Phase 3 UI-primitives migration completion, Phase 4 `var C` region slices 1–3 of 9, and the permanent Bug #7 `fileParallelism:false` fix. **None of this has promoted to main/prod yet.**
- Consequence: any doc that describes v2.8.4-era work as "shipped"/"live"/"in production" without qualifying it as develop-only is wrong *today*. This is not a single bug — see Systemic Issue #1 below, it recurs across nearly every roadmap/status doc.
- Second-order consequence: `docs/db/schema.sql` (the DB "ground truth" every security/architecture doc points to) is itself a snapshot dated **2026-07-13**, captured *before* the v2.6.0 RLS cutover (2026-07-20). Every doc that cites it as current truth for RLS state is inheriting its staleness. See Systemic Issue #2.

---

## Systemic / cross-cutting issues (fix the pattern, not just the line)

### 1. No doc distinguishes "shipped to develop" from "promoted to main"
Affects: `ROADMAP.md`, `UX_REFACTOR_ROADMAP.md`, `CHARTER.md`, `SOLUTION_DESIGN.md` (UI Primitives section). All describe v2.8.4 work in flat past tense with no promotion-status qualifier, even though main is still on v2.8.3. `UX_REFACTOR_ROADMAP.md` inconsistently *does* use "(pending PR)" language for some items but not others in the same doc.
**Recommended systemic fix:** adopt a one-line template — `**Promotion status:** on develop only, not yet promoted to main` — applied to any changelog/roadmap entry until the next develop→main PR merges. Decide where this template lives (probably `VERSION_HISTORY_SCHEMA.md` or root `CLAUDE.md`) so it's enforced going forward, not just patched once.

### 2. `docs/db/schema.sql` is stale and multiple docs cite it as unqualified ground truth
Captured 2026-07-13, i.e. **before** v2.6.0 (RLS cutover, 2026-07-20) and before migrations 013–017. It still shows `team_data` with RLS disabled and a "!! EXPOSED" comment. Docs that cite it as current-state ground truth without a staleness caveat: `AUTH_SECURITY_AUDIT_ROADMAP.md` ("Ground truth is now docs/db/schema.sql"), `SOLUTION_DESIGN.md` (RLS Policy Map section), `TROUBLESHOOTING.md` (RLS-off warning). One sibling doc already carries the correct caveat: `docs/db/PROD_SCHEMA_BASELINE_ADDENDUM_1.md` says schema.sql's RLS claims are stale and must be read alongside migrations 004, 013–016. `backend/CLAUDE.md` points to yet a *third* combination (`PROD_SCHEMA_BASELINE.md` + `ADDENDUM_1.md`) as ground truth. Three docs, three different "ground truth" pointers.
**Recommended systemic fix:** re-capture `docs/db/schema.sql` against current prod (post v2.6.0/v2.7.0/v2.8.0/v2.8.3) as the actual next action — this unblocks correctly fixing `AUTH_SECURITY_AUDIT_ROADMAP.md`, `SOLUTION_DESIGN.md`, and `TROUBLESHOOTING.md` in one pass instead of three. Do this first in the execution command.

### 3. The four-role vs. seven-role myth is restated as canonical in the one doc whose job is to prevent that
`AUTH_SECURITY_AUDIT_ROADMAP.md:43-46` states `team_memberships.role` is enforced to exactly four values by `003_create_team_memberships.sql`. **Verified directly** — this line is present as described. The live CHECK constraint (`docs/db/schema.sql:172-178`) allows **seven**: `admin, viewer, team_admin, coordinator, coach, scorekeeper, parent`, with schema.sql's own inline comment flagging this exact drift as "THE BIG ONE." Root `CLAUDE.md` documents this as corrected 2026-07-13 — the same date this file claims as its own "Last Updated." Highest-severity single finding in the whole spike: this is the precise error that broke the public signup form once already.

### 4. Live Scoring gating: not fully GA, but functionally GA via an active testing shim — get the nuance right
**Verified directly.** The old bundled `LIVE_SCORING` JS flag is gone (confirmed zero grep hits in frontend/src). But a *different*, DB-backed flag still exists: `useFeatureFlag('live_scoring', activeTeamId)` (lowercase, per-team). `App.jsx:1454-1456` still hardcodes `Mud Hens`/`Demo All-Stars` to always-enabled. `DugoutView.jsx:58-61` reads the same DB flag, then immediately does:
```js
// AUTH TESTING SHIM — remove "|| true" when flag is confirmed working in prod
var isEnabled = liveScoringEnabled || true;
```
So **today, functionally, every team gets Live Scoring** (the shim forces it on), but the actual per-team gating scaffolding (DB flag + hardcoded pilot-team check) is still in the code, unremoved, with an explicit pending-cleanup comment. Docs describing this as "Live Scoring — pilot, Mud Hens/Demo All-Stars only, LIVE_SCORING flag gates everyone else" (PERSONAS.md, ONE_PAGER.md, FEATURE_MAP.md) are wrong on the mechanism name and wrong on functional current behavior, but a flat rewrite to "no gating exists, full GA" would also overstate it — the gating code and the shim-removal TODO are real and still open.
**Recommended fix (apply everywhere this is described):** "Functionally enabled for all teams today via an active testing shim (`DugoutView.jsx:61`) — the real per-team `live_scoring` DB flag and the Mud Hens/Demo-All-Stars hardcode (`App.jsx:1454-1456`) are still in place but currently bypassed. Shim removal is a known open cleanup item, not yet scheduled." Affects: `PERSONAS.md` Persona 6, `ONE_PAGER.md`, `FEATURE_MAP.md` rows 11/14/23.

### 5. develop→main promote merge method: two docs still tell you to squash, which is explicitly banned
Root `CLAUDE.md` Pre-release Docs Checklist item 17 (Story 79, 2026-05-21): promote PRs **must** use "Create a merge commit," never squash — squashing a promote collapses develop's PR-level history into one commit on main. **Verified directly**: both `PRODUCT_OPS.md:164` ("develop → main (release) | **Squash merge**") and `MASTER_DEV_REFERENCE.md:651` ("Squash-merge or merge-commit (**squash recommended**)") still say the opposite. This is a live landmine — someone following either doc verbatim on the next promote reintroduces the exact problem Story 79 fixed.
**Recommended fix:** correct both lines to "Create a merge commit — never squash for develop → main promotes (Story 79)." Note `PRODUCT_OPS.md`'s feature/fix→develop squash guidance is correct and doesn't change — only the promote row is wrong.

### 6. Stale counts scattered across docs (test count, label count, lint count, Mixpanel event count) — no single owner
- Test suite count: `CHARTER.md` says 257 passed, `ONE_PAGER.md` says 421 passed — both vs. actual/current 975 passed (1086 incl. backend) per root `CLAUDE.md`.
- GitHub label count: `MASTER_DEV_REFERENCE.md` self-contradicts, saying "28" in one place and "31" (correct, matches `ISSUE_TRACKING.md` and root `CLAUDE.md`) 34 lines later.
- ESLint baseline: `LINT_BASELINE.md` and `DESIGN_AUDIT.md §B.1` both describe an ESLint debt load (144→123 outstanding, "no config file") that **verified live** to be fully clean — `npx eslint src --ext .js,.jsx --max-warnings 0` from `frontend/` returns exit 0, zero output. Story 77 (v2.5.23, 2026-05-30) closed this 3+ months ago.
- Mixpanel event count: `ONE_PAGER.md` says "47 events," `CHARTER.md` says "32+", `frontend/CLAUDE.md` says "32+ Mixpanel events + 4 Vercel Analytics events." 47 is the unverified outlier.
**Recommended fix:** no single fix — each doc needs its own number corrected (see per-file sections). Worth deciding whether any of these counts should be generated/templated rather than hand-maintained, since they drift every time regardless of how carefully any one doc is edited.

---

## Per-file findings

Severity key: 🔴 = actively misleading / high blast radius · 🟠 = real drift, moderate priority · 🟡 = cosmetic/low priority · ✅ = no material findings

### `docs/product/PERSONAS.md` — audited earlier this session (not re-delegated)
🔴 Auth Required column + Persona 1/2 text say "Phase 2 (Google OAuth + magic link, cutover pending)" — cutover shipped v2.6.0 (2026-07-20). Update to reflect auth as active; editing requires sign-in, viewing/share-links never do.
🔴 Persona 6 "Scoring Workflow" step 1 says the scorekeeper "navigates to the Scoring tab in the bottom nav" — that tab was removed in v2.5.9, before this doc's own claimed last-update date. Current path: **Game Day → Dugout sub-tab**.
🟠 Persona 6's "Live Scoring is pilot-only (Mud Hens/Demo All-Stars) via `LIVE_SCORING` flag" — see Systemic Issue #4 above; needs the "functionally GA via shim, gating scaffolding still present" framing, not a flat pilot claim.
🟡 Missing mention of Google Sign-In / Account tab (v2.7.0) / "Set your name" (v2.8.0) in Persona 1/2 feature tables — additive, not wrong.

### `docs/product/CHARTER.md`
🔴 Header stale: "Version 1.1 — April 27, 2026 — App v2.5.1" vs. current v2.8.3/v2.8.4.
🔴 §6 Data Protection + §8 Risk #1 both restate "RLS is OFF / anon key can TRUNCATE" as current — fixed in v2.6.0. Also flags that `docs/db/schema.sql` (dated 2026-07-13) predates the fix, so it can't be used to re-verify this section either — depends on Systemic Issue #2 being resolved first.
🔴 §2/§7 describe Phase 4 auth (magic link + Google OAuth) and Admin UI as "In Progress"/"Parked" — both shipped (v2.6.0 auth gate, v2.7.0 Google OAuth). Admin UI verified live with all six tabs present in `frontend/public/admin.html`.
🟠 §7 roadmap still lists `004_rls_fixes.sql` cutover as "Parked" — shipped as part of v2.6.0.
🟠 Test count stale: "257 passed" vs. actual 975.
🟠 §7 Phase-3-backlog role model ("Coach / Assistant Coach / Viewer") matches neither the 7-role DB model nor the 4-role code model — rewrite to reference actual vocabulary; note DB-level multi-membership already partially live (Stan Hoover invited as `coach`).

### `docs/product/ONE_PAGER.md`
🔴 Header stale: "v2.0 — April 27, 2026 — App v2.5.1"; "Production version | v2.5.1" in-table.
🟠 "Live scoring | Shipped (Mud Hens + Demo All-Stars team gating)" — see Systemic Issue #4, needs the shim-nuance rewrite.
🟠 Data Protection section describes the backend write-guard as an active protection layer; actual coach write path (`dbSaveTeamData()`) goes straight to Supabase, bypassing the backend guard entirely — reconcile with CHARTER's (corrected) write-path description once that lands.
🟠 Test count stale: "421 passed" vs. 975.
🟡 Mixpanel event count outlier: "47 events" vs. 32+ everywhere else.

### `docs/product/PRODUCT_OPS.md`
🔴 develop→main merge method says "Squash merge" — directly contradicts Story 79 / root CLAUDE.md. **Verified directly.** See Systemic Issue #5.
🟠 `area:*` label list omits `area:game-mode` (9 of the actual 10 listed).
🟠 PR smoke-test checklist has no line for the backend unit-test system (`npm run test:unit`, CI `backend-unit` job) — a backend PR following this checklist verbatim could skip it.
✅ Branch naming, hotfix path, issue-hygiene rules, script references all verified current — no other findings.

### `docs/product/ROADMAP.md`
✅ `<!-- #N -->` placeholder hygiene is actually clean — no live unfilled markers found (the only matches are inside historical prose about a past corruption incident).
🟠 Stories 61 and 67 (both P0) have no GitHub issue marker at all, not even a placeholder — violates the "every story needs a real issue" rule.
🟠 v2.8.4 entry (and the file's recent version log generally) doesn't flag itself as develop-only/not-yet-promoted — see Systemic Issue #1.
✅ Test-count claims here are internally consistent with root CLAUDE.md — no drift.

### `docs/product/UX_REFACTOR_ROADMAP.md`
🟠 §3 "Locked Files Registry" is 8-9 minor versions stale — still framed around a "v2.4.0 umbrella" that closed long ago, contradicts the current gate-phrase convention in root CLAUDE.md. Actively misleading to a fresh session since §7 tells readers to rely on this doc for handoff.
🟠 Phase 3 Step 5+ "✅ Complete" framing doesn't note develop-only/pending-promotion status, inconsistent with how Steps 3/4 in the same doc correctly say "(pending PR)."
✅ Done-So-Far Ledger and Active Backlog otherwise cross-check cleanly against CLAUDE.md's version changelog.

### `docs/product/DOC_TEST_DEBT.md`
🟠 "Windows Vitest pre-push hook OOM cascade" (P1) is stale — the pre-push hook no longer runs Vitest at all (Story 75) and Bug #7 itself has a permanent mitigation (Story 118/#517). Move to Resolved.
🟠 "Roster-Wipe Guard + Recovery Endpoint" (P1) appears already resolved — the exact tests it asks for exist in `teamData.routes.test.js` / `teamData.guard.test.js` (Story 99 Phase 2 tranche 1, PR #282).
🟡 Two open items' Age fields are computed from a stale "today" (43 days shown, actually ~109) — same drift class the file already caught and fixed for a sibling item once.
🟡 Box-score AI parser test-coverage gap is genuinely still open but its Target field says "v2.6.0 P1" — we're at v2.8.4, re-target rather than treat as resolved.
✅ Debt Summary Dashboard arithmetic (P0 1 / P1 7 / P2 20 / Total 28) is self-consistent with a direct recount.

### `docs/product/FEATURE_MAP.md`
🟠 Coverage Summary miscounts its own table: states 8/12/15 (Yes/Partial/None) out of 35; direct recount gives **10/13/12**. Doc Status row (30/5/0) is correct.
🟠 Debt column cites 12 dangling `D0xx` IDs (D002, D004-D008, D011-D016) that don't exist anywhere in the current `DOC_TEST_DEBT.md` (which was rewritten to a `D-S###` format) — either restore a cross-reference table or strip/replace these.
🟠 Row 18 (Roster backup/restore) shows Test Status "None" — tests now exist (`teamData.guard.test.js`, `teamData.routes.test.js`).
🟠 Rows 14/23 (Opponent Half Tracking, SCORING_SHEET_V2) marked "Pilot" — `SCORING_SHEET_V2` is actually `true` (GA, kill-switch only) in `frontend/src/config/featureFlags.js`; reclassify per Systemic Issue #4 nuance for the Live Scoring row too.

### `docs/product/RELEASE_NOTES.md`
🔴 Missing 5 full released versions (v2.8.0–v2.8.4) and an 18-version gap (v2.5.15–v2.5.32) — last touched at the v2.7.0 release, over 2 weeks and 5 releases ago. Root CLAUDE.md explicitly points readers here as "full release history," but CLAUDE.md's own changelog is now the only complete copy. No checklist step currently names this file as a required touch-point — likely why it drifted. Recommend adding it to the version-bump ritual so it can't silently skip again.

### `docs/product/RELEASE_AUDIT_2026-08-04.md`
✅ Cleanest file in the audit. Correctly self-scopes as pre-promotion prep, correctly states main is still v2.8.3, correctly marks version-bump/smoke-test/merge-method items as deferred/pending. One historical note: Step 5 (version bump) has since executed in the working tree, so its own "Deferred to Step 5" language is now historical — expected for a point-in-time snapshot, no fix needed unless it's later mistaken for a living status page.
🟡 Branch-protection claim (item 16, `enforce_admins: false`) not independently re-verified — `gh` CLI wasn't available to the auditing agent. Flag as unverified, not confirmed either way.

### `docs/product/VERSION_HISTORY_SCHEMA.md`
🟠 Documents the `techNote` approved-string rule but omits two other rules actually enforced by `frontend/src/__tests__/versionHistory.test.js`: (1) `userChanges` bullets may not contain PR/Story/`closes #` references (regex-enforced), (2) three accepted `date` formats exist (ISO/MonthYear/LongDate) plus an outstanding TODO to normalize to MonthYear — none of this is in the doc. Add both so the schema doc and the enforcing test stay in lockstep.

### `docs/product/MASTER_DEV_REFERENCE.md`
🔴 develop→main promote says "Squash-merge or merge-commit (squash recommended)" — see Systemic Issue #5. Note: this doc's separate feature→develop squash guidance (step 14) is correct and doesn't need to change.
🟠 Header claims "Last Updated: April 27, 2026" — the file's own git history shows commits from 2026-06-12, and its own body cites a 2026-05-23 story. The header is provably false by the file's own content.
🟠 Self-contradicts on GitHub label count: "28" (line 294) vs. "31" (line 328, correct, matches `ISSUE_TRACKING.md`) — a prior label-count fix (Story 78) apparently missed this occurrence.
🟠 "GitHub Operating System → Labels" section documents an entirely different, obsolete 6-dimension label taxonomy (including `user:*` and `release:*` prefixes that don't exist anywhere else) vs. the current, canonical 5-group taxonomy in `ISSUE_TRACKING.md`/root CLAUDE.md. Replace with a pointer rather than maintaining a third drifted copy.
🟠 Step 9 tells readers to follow a "### Known issue: Windows Vitest cold-start OOM" heading that doesn't exist anywhere in the document, and the premise (pre-push runs the full test suite) is itself stale — pre-push no longer runs Vitest at all (Story 75).
🟡 "APP_VERSION... (line 144)" — actual current line is 143; consider dropping the specific line number since it'll drift again regardless.

### `docs/product/AUTH_SECURITY_AUDIT_ROADMAP.md`
🔴 Lines 42-46 state the CHECK constraint enforces four roles — **verified directly, present as described.** This is the exact corrected myth from root CLAUDE.md, restated as canonical in the doc whose explicit job is to be the single source of truth here. See Systemic Issue #3 — highest-severity single item in the whole spike.
🔴 WS-3 status cell conflates a shipped fix with a still-open one: the #342 roster/team-data RLS exposure shipped in v2.6.0; the #355 scoring-table `*_anon_test` backdoors + `allow_scorer_writes USING(true)` policy are still genuinely open (confirmed live in `docs/db/schema.sql:821-844`). The doc currently reads as if neither shipped — needs to split into two lines with two different statuses.
🟠 Cites `docs/db/schema.sql` as unqualified ground truth — see Systemic Issue #2; needs the same staleness caveat `PROD_SCHEMA_BASELINE_ADDENDUM_1.md` already carries.
🟡 One stale line-number citation (App.jsx:2313 → actually 2304), 9-line drift from unrelated edits.
✅ No phone/OTP/Twilio references — clean on that axis.

### `docs/product/SECURITY_FRAMEWORK.md`
🟠 Item 1.11 cites `docs/TODO_approve_link_security.md` as an implementation spec — file does not exist anywhere in the repo (confirmed via filesystem search). Dead reference.
🟠 Two of three `MASTER_DEV_REFERENCE.md` anchor links in "Related Documents" don't match that file's actual heading slugs (`#auth-principle` vs. actual `#auth-principle-non-negotiable`; same issue for the game-day-validation anchor).
🟠 Structural gap, not a factual error: the Phase Overview table only covers Phases 0-3, but the Status Tracker separately lists four `✅ Shipped` rows (RLS on team_data/teams/roster_snapshots v2.6.0, roster-wipe guard, OAuth membership gate, request-access validator v2.7.0) under no defined phase — meaning root CLAUDE.md's "Currently no [Standing Practice] items have shipped" line is technically true (none of the *6 enumerated Standing Practice candidates* have shipped) but reads as if *no security work at all* has shipped, when in fact the single biggest item in this doc's own threat model already has. Recommend adding an explicit "Phase 4 — Emergency Remediation" row to the Phase Overview, and one clarifying sentence in root CLAUDE.md's Security Practices section.

### `docs/product/A11Y_AUDIT.md`
🟠 Still lists `Viewer/ViewerMode.jsx` as live with 8 open findings (5 S1 font-size, 3 S3 button-label) — that file was deleted in Slice 4 (v2.5.11). Delete the block and adjust tallies.
🟠 "Duplicate PlayerHandBadge, verify which is imported" open question is moot — the duplicate was deleted; the sole remaining file now delegates to the `Badge` primitive with no inline fontSize.
🟠 Recon methodology (regex on JS-object-form `fontSize:"Npx"`) missed real, still-live sub-floor font sizes in `DefenseDiamond.jsx`'s raw SVG attributes (`fontSize="7.5"`, `fontSize="10"/"8.5"`) — genuine undocumented findings, plus a caveat needed about the recon method's blind spot.
✅ All 7 previously-flagged "RESOLVED" items spot-checked and confirmed still fixed. V1/V3 open items confirmed still genuinely open — doc accurate there.

### `docs/product/DESIGN_AUDIT.md`
🟠 §B.1 ("ESLint config missing from repo") is fully obsolete — config exists, live lint run is 0 errors/0 warnings (Story 77, v2.5.23).
🟠 §A.1 (LockFlow.jsx duplicate `fontSize` key, "do not fix in this PR") is fixed — current LockFlow.jsx has a single `fontSize` key, migrated onto the `Text` primitive in the v2.8.4 Phase 3 primitives work.
🟠 "Legacy `C` Object" live call-site count (310, dated 2026-08-02) is stale — actual current count is **197** (`grep -oE '\bC\.[a-zA-Z]+' frontend/src/App.jsx | wc -l`), reflecting the 3 region slices completed since. Annotate slices 1-3 done with PR numbers (#528, #529, #537).

### `docs/product/LINT_BASELINE.md`
🔴 Entire document describes an ESLint debt load (144 baseline → 123 outstanding) that no longer exists — live run returns 0/0. Story 77 (v2.5.23, 2026-05-30) closed this ~3 months ago with no closing entry ever added to this doc.
🟠 The "DEFER-TO-V2.6.0 (Auth re-skin)" bucket (5 findings in Auth screens) is already fixed — verified `PendingApprovalScreen.jsx:27` already uses `&apos;` — but no Auth re-skin appears to have actually shipped; this was very likely swept up in the same Story 77 pass, not a dedicated re-skin. Don't attribute the fix to a phase that didn't happen.
**Recommended fix for the whole file:** archive with a final "Resolved — Story 77, 144→0" entry, or delete and fold one paragraph into DOC_TEST_DEBT.md/CLAUDE.md.

### `docs/product/APPJSX_DECOMPOSITION_PLAN.md`
🟠 Slice 4.0 (extract `loadJSON`/`saveJSON` → `utils/storage.js`) is done (v2.8.1, PR #416, verified: `App.jsx` now imports both functions, no local definitions remain) but the plan's table still lists it as a prospective pilot with no done-marker.
🟡 Slices 4.1-4.7 remain fully unexecuted — not itself wrong (the doc doesn't claim otherwise), but a "last verified: <date>" status line would help future readers.
🟠 **Naming collision worth flagging explicitly:** this doc's own "Phase 4" (slices 4.0-4.7, component/Context extraction) is a completely different initiative from the "Phase 4 region slices 1-3 of 9" in CLAUDE.md's v2.8.4 changelog / `DESIGN_AUDIT.md`'s "Legacy C Object" section (the `var C` color-token retirement). Same vocabulary, unrelated scope — real risk of a future reader conflating "3 of 9 done" (color tokens) with "this decomposition plan is 3/8 done" (it's actually 1/8, and that one shipped incidentally via an unrelated story). Needs an explicit disambiguation note in both docs.

### `docs/product/ACTIVITY_FEED.md`
✅ No material findings. Every claim (commit-driven metrics, `isProductionRelease` gating, `releaseNote()` exclusion logic, `releaseShippingSummary()` parsing, weekly cron + path-triggered refresh, `activity-data` branch `deploymentEnabled: false`) verified against the actual generator script and workflow file — all match.

### `docs/product/ONBOARDING.md`
🔴 **The entire auth/access-gate flow is absent.** Doc goes straight from "open the URL" to "Tap Create New Team" with zero mention of sign-in, magic link, Google OAuth, or the request-access/approval wait. A brand-new coach literally cannot follow this doc today — they'll hit `LoginScreen`, then likely `NoMembershipScreen` → `RequestAccessScreen` → wait for platform_admin approval, none of which is documented. Highest-impact single fix in the whole spike alongside the AUTH_SECURITY_AUDIT_ROADMAP four-role item.
🔴 Step 8.5 + Tab Reference describe a standalone 5th "Scoring" bottom-nav tab gated by `liveScoringEnabled` — doesn't exist; removed v2.5.9. Real nav is 4 tabs (Home / My Team / Game Day / Support); live scoring is Game Day → Dugout sub-tab.
🟡 Tab Reference/Step 4 imprecision: Schedule/Snacks are sub-tabs under "My Team," not standalone tabs — low priority relative to the above two.

### `docs/SOLUTION_DESIGN.md`
🔴 Entire "Auth Architecture (Phase 2)" section (lines 277-436) describes auth as **not yet gated** — "currently bypassed in production," cutover "Pending 2-3 coach pilot users." Auth has been fully live since v2.6.0, with two more releases (Google OAuth v2.7.0, self-serve name v2.8.0) on top, none reflected. ~4 months stale, needs a full rewrite of this section.
🔴 "RLS Policy Map (Phase 4 target state)" presents WS-3 (RLS on team_data/teams/roster_snapshots) as a future target — shipped v2.6.0. Same root cause as Systemic Issue #2 (its own cited source, schema.sql, predates the fix by a week).
🟠 Navigation Structure table lists a nonexistent "Season" tab — real 4 tabs are Home / My Team / Game Day / Support (verified directly against `PRIMARY_TABS` in App.jsx); Schedule/Snacks are `TEAM_SUBTABS` under My Team. Fix this together with ONBOARDING.md's tab table since they currently disagree with each other too.
🟠 Backend Route Inventory table has a wrong path (`/api/v1/auth/request-magic-link` vs. actual `/magic-link`) and omits `/logout`, `PATCH /me`, `/admin/approve-link`, `/admin/deny-link` — recommend regenerating this table directly from `backend/src/routes/*.js` rather than hand-maintaining it.
🟡 `dugoutFocusMode` snippet shows the original v2.5.7 version, missing the `scorerClaimed` clause added in the v2.5.13 revision (which fixed a real deadlock, Story 16) — replace with the current version + rationale from root CLAUDE.md.
🟡 Feature Flag System section doesn't explain that `live_scoring` is DB-backed and architecturally different from the bundled-JS flags (TROUBLESHOOTING.md already documents this distinction clearly — port it over).
✅ (Not a finding, a heads-up) UI Primitives inventory table matches prod's actual v2.8.3 state correctly today — it will go stale the moment v2.8.4 promotes (Phase 3 completion + Phase 4 slices 1-3), so make sure that's on the promote checklist rather than assuming this doc is "done."

### `docs/TROUBLESHOOTING.md`
🔴 "THINGS THAT ARE STILL BROKEN → RLS is OFF on team_data/teams/roster_snapshots (#342)" — shipped v2.6.0. This file was added in v2.5.32, six days before the fix, never revisited. Conflates two different security items — #342 (team-data RLS, now fixed) and Phase 4C scoring-table RLS (`live_game_state`/`game_scoring_sessions`/`scoring_audit_log` — genuinely still open per the `*_anon_test` policies and `allow_scorer_writes USING(true)`, confirmed live in schema.sql) — needs splitting into two entries with two different correct statuses, not one "still broken" bucket.
🟠 Root cause is the same stale `docs/db/schema.sql` (Systemic Issue #2) — fix that first, then this doc's RLS section falls into place.
✅ Seven-vs-four role section is still accurate — no drift, don't touch.
✅ Feature flags section (bundled vs. DB-backed split, GAME_MODE dead-row analysis) verified accurate, no drift.
✅ Migration-directory collision warnings (two dirs, 5 colliding numbers, `004_rls_policies.sql`/`005_atomic_verify_function.sql`) verified still accurate — both files still exist as described.
✅ RLS-bypassing-VIEW, unpinned-`search_path`, `SECURITY DEFINER` trigger, and AUTH/ACCESS sections all cross-checked clean.

---

## Suggested execution order (for the future command)

1. **Re-capture `docs/db/schema.sql` against live prod first** — unblocks correctly fixing 3 downstream docs in one pass instead of three (`AUTH_SECURITY_AUDIT_ROADMAP.md`, `SOLUTION_DESIGN.md`, `TROUBLESHOOTING.md`).
2. **Fix the two P0/security-adjacent items independently verified this session:** the four-vs-seven-role restatement in `AUTH_SECURITY_AUDIT_ROADMAP.md`, and the squash-vs-merge-commit contradiction in `PRODUCT_OPS.md` + `MASTER_DEV_REFERENCE.md` (real landmine for the next promote).
3. **Fix `ONBOARDING.md`'s missing auth flow and phantom Scoring tab** — doc is currently unusable for its stated purpose.
4. **Fix `SOLUTION_DESIGN.md`'s stale Auth Architecture + RLS Policy Map sections** and its nav-table/route-table drift.
5. **Sweep the "Live Scoring pilot" framing** (Systemic Issue #4) across `PERSONAS.md`, `ONE_PAGER.md`, `FEATURE_MAP.md` in one consistent pass — same correct language everywhere.
6. **Backfill `RELEASE_NOTES.md`** (v2.6.0 → v2.8.4) and add it to the version-bump ritual so it can't silently drop off again.
7. **Everything else** (stale counts, dead cross-references, DOC_TEST_DEBT.md resolved-item moves, FEATURE_MAP.md recounts, A11Y/DESIGN/LINT audit closures) — lower urgency, batch into the same PR pass since they're all docs-only/meta-governance.

Not independently re-verified in this spike (flag if the execution pass needs certainty): `RELEASE_AUDIT_2026-08-04.md`'s branch-protection claim (`gh` CLI unavailable in the research environment).
