# Release Audit — develop since v2.8.3 (2026-08-04)

> Produced for the go/no-go gate ahead of the next develop → main promote. Every claim below is sourced from a live `git log`/GitHub API check run today, not from memory of earlier session summaries.

## 1. Scope of this audit

v2.8.3 was promoted to `main` via [PR #499](https://github.com/kaushikkuberanathan/lineup_generator/pull/499), merged **2026-08-02T17:28:52Z** (commit `86a94d7`). This audit covers everything merged into `develop` after that timestamp, up to `develop`'s current tip, commit `a5191c2` (2026-08-04T20:10:10-04:00).

## 2. Commit integrity check (1a/1b)

- **45 commits** total between `origin/main` and `origin/develop` (`git log origin/main..origin/develop`).
- **30 PRs** merged to `develop` with `merged_at > 2026-08-02T17:28:52Z`, fetched live via the GitHub API.
- **Cross-check: every first-parent commit on `develop` since v2.8.3 maps 1:1 to one of the 30 merged PRs' `merge_commit_sha`.** Verified via `comm` set-difference in both directions — zero unmatched commits, zero PRs missing from history. **No stray direct commits to `develop`.**

## 3. PR categorization (1c)

| # | Title | Category |
|---|---|---|
| 500 | Merge main into develop (post-promote sync, v2.8.3) | Sync (no new content) |
| 504 | test(share-link): P0 coverage for Share Link Payload Integrity | Test coverage only |
| 505 | test(game-mode): P0 coverage for Game Mode Rendering + State | Test coverage only |
| 506 | test(rls): RED-by-design spec for #355 live-scoring anon backdoors | Test coverage only |
| 507 | test(rls): migration-007 admin-panel recursion regression guard | Test coverage only |
| 508 | Story 113: mint `color.surface.cream`, retire `C.cream` (5 sites) | Internal refactor, zero visible change |
| 509 | Story 114: verify + swap `C.text` → `tokens.color.text.ink` (20 sites) | Internal refactor, zero visible change |
| 510 | fix(rls): suppress dotenv self-promotional tip output | Infra-config only |
| 511 | test(auth): NoMembershipScreen gate-first routing coverage | Test coverage only |
| 512 | test(share-link): P1 coverage for share-link routing decision | Test coverage only |
| 513 | test(scoring): P1 coverage for claimScorerLock null-safety | Test coverage only |
| 515 | Story 117: Full `S.card` retirement | Internal refactor, zero visible change (see §5 gap) |
| 516 | docs: flip Story 113/114 to Resolved, file Story 115 | Docs only |
| 518 | docs: file Story 118, fix stale Story 115 note | Docs only |
| 519 | feat(ui): FairnessCheck.jsx → Card primitive | Internal refactor, zero visible change |
| 520 | feat(ui): NowBattingStrip.jsx → Text primitive | Internal refactor, zero visible change |
| 521 | feat(ui): MaintenanceScreen.jsx → Stack/Text primitives | Internal refactor, zero visible change |
| 522 | feat(ui): ParentView.jsx remaining Text migration | Internal refactor, zero visible change |
| 523 | chore: Story 115 — delete dead `S.app` object | Dead code removal, zero behavior change |
| 524 | feat(ui): BattingOrderStrip → Text primitive | Internal refactor, zero visible change |
| 525 | feat(ui): LockFlow.jsx → Text primitive | Internal refactor, zero visible change |
| 526 | feat(ui): DefenseDiamond.jsx HTML text → Text primitive | Internal refactor, zero visible change |
| 527 | docs: mark Phase 3 Step 5+ complete | Docs only |
| 528 | feat(theme): Phase 4 slice 1 — header/nav `C.*` retirement | Internal refactor, zero visible change |
| 529 | feat(theme): Phase 4 slice 2 — Roster `C.*` retirement | Internal refactor, zero visible change |
| 532 | docs: file Story 119/120 | Docs only |
| 533 | fix(test): `fileParallelism:false` permanent (Bug #7, UX worktree) | Infra-config only |
| 534 | fix(test): `fileParallelism:false` permanent (Bug #7, Dugout worktree) | Infra-config only |
| 536 | docs: file Story 121 | Docs only |
| 537 | feat(theme): Phase 4 slice 3 — Defense/Batting `C.*` retirement | Internal refactor, zero visible change |

**Totals:** 7 test-coverage-only, 6 docs-only, 3 infra-config-only, 14 internal-refactor/zero-visible-change, 0 sync/no-content (500 is a sync merge, not new content).

**Net: zero user-facing behavior changes in this window.** No feature shipped that changes what a coach sees or can do. This release, if cut now, would follow the same "internal improvements" `techNote` pattern as v2.8.1/v2.8.2 — `userChanges` in `versionHistory.js` would be a generic "internal stability/consistency" statement, not a feature list.

## 4. Open items merged into develop but NOT yet resolved (1d)

1. **Story 117 (#515) — real authenticated visual-verification pass not done.** Only computed-style equivalence tests (`Story117TierOneEquivalence.test.jsx`, `Story117TierTwoThreeEquivalence.test.jsx`, 13 tests) substitute for live-browser screenshots across 9 touched surfaces (Roster, Schedule, Feedback, Links, Account, Updates, Batting, Songs, SharedView). The commit's own message flags this explicitly: *"Do not treat this story as fully closed until that check happens."* **This is the single most release-relevant open gap** — it's the one item in this window that touches rendering across many real user-facing surfaces without a live-browser confirmation, even though the underlying change (DOM style equivalence) is proven byte-identical.
2. **Story 121 (#535/#536) — P0, live-data-mutation risk, NOT fixed.** `AppShareLinkRouting.test.jsx`'s incomplete Supabase mock fires real network writes/deletes against Supabase during local test runs when a valid anon key is present. Test-only risk (doesn't affect production code paths), but flagged P0 and explicitly not fixed — filed for T1/Dugout ownership. **Not reflected in `DOC_TEST_DEBT.md`'s P0 dashboard**, which still shows 0 open P0s (last updated 2026-08-02, predates this finding) — a real gap between the two debt-tracking systems, flagged here rather than silently left inconsistent.
3. **Story 119 (#530) / Story 120 (#531)** — App-shell gradient token naming and SharedView slice 9 scoping, both logged as recommendations, both explicitly awaiting KK's go-ahead. No code changed for either — doesn't block this release, just noting they remain open.
4. **Bug #7 (Story 118/#517)** — `fileParallelism:false` fix landed (PRs #533/#534) but is explicitly documented as reducing, not eliminating, the Vitest worker-spawn flake. Dev/CI-experience risk only, not a production risk.

## 5. Dependabot alerts — verified live, NOT from memory (Step 4 pre-check)

**4 open alerts, not 2.** The commonly-cited "#28 high / #30 moderate" is stale — two new alerts (#61, #62) were created **today, 2026-08-04**, and were not previously tracked anywhere in this session's memory.

| # | Severity | Package | Scope | Summary | Real-world exposure |
|---|---|---|---|---|---|
| 28 | High | `vite` | frontend, **dev-only** | `server.fs.deny` bypass on Windows alternate paths | Low — this is `vitest@4.1.2`'s own bundled `vite@8.0.14` (a transitive dev-dependency-of-a-dev-dependency), **not** the app's actual `vite@6.4.2` used for dev/build. The vulnerability is dev-server-file-serving only; never reaches a deployed production build. |
| 30 | Medium | `vite` (launch-editor) | frontend, **dev-only** | NTLMv2 hash disclosure via UNC path handling on Windows | Same root cause/exposure as #28 — same transitive `vitest`-bundled `vite@8.0.14`. |
| 61 | Medium | `ip-address` | **backend, runtime** | IPv4-mapped/NAT64 IPv6 misclassification can bypass SSRF/trust-boundary checks | **Higher relevance** — pulled in transitively via `express-rate-limit@8.6.1`, which is the actual `loginLimiter` middleware protecting `POST /magic-link` in production. Real runtime dependency, not dev-only. |
| 62 | Medium | `ip-address` | **backend, runtime** | CIDR-suffix parsing suppresses special-use classification, same SSRF/trust-boundary bypass class | Same exposure as #61 — same dependency chain, same package, one version further before the real fix (`10.2.2`). |

**Recommendation, not a decision:** #28/#30 are effectively no real production risk (dev-tooling-only, several dependency hops removed from the actual app). #61/#62 warrant more attention — they're a runtime backend dependency behind the auth rate-limiter, even though `express-rate-limit`'s actual usage of `ip-address` (trust-proxy IP classification) may or may not touch the vulnerable code path directly; not independently confirmed in this audit. This is a judgment call for KK, not resolved here.

## 6. Other pre-release checklist facts verified live

- **CI on `develop`'s current tip (`a5191c2`): 9/9 checks green**, verified via the GitHub API just now (Frontend Tests, Backend Unit Tests, Backend Integration Tests, RLS Policy Suite, CodeQL x2, Sync-script unit tests, Smoke Test dev — skipped as expected, all others `success`).
- **Story 86 sync-PR precondition: clean.** Zero open PRs currently targeting `develop` (checked live), specifically zero `sync/main-into-develop` branches pending.
- **`DOC_TEST_DEBT.md` P0 dashboard: 0/0/0/0 shown** — see caveat in §4 item 2 above (Story 121 not reflected).

## 7. Go/no-go questions for KK

1. Is Story 117's unverified live-authenticated visual-verification gap (§4.1) acceptable to ship with, documented in release notes as a known gap, or does it block this release?
2. Given zero user-facing behavior changes in this window (§3), does an "internal improvements" release still make sense to cut now, or would you rather wait for user-facing work to accumulate?
3. Dependabot: ship with all 4 open alerts as-is (§5), or take action on #61/#62 (backend runtime, SSRF-adjacent) before promoting?
4. Story 121's absence from `DOC_TEST_DEBT.md`'s P0 dashboard (§4.2) — patch the ledger before this release, or track separately without blocking?

## 8. KK's go/no-go answers (2026-08-04)

1. **Ship with documented gap.** Story 117's computed-style equivalence tests are sufficient evidence for this release; the live-browser check remains a known follow-up, not a blocker.
2. **Cut it now.** Proceed as an internal-improvements release (v2.8.4), same pattern as v2.8.1/v2.8.2.
3. **Ship as-is, track separately.** All 4 Dependabot alerts remain open through this release; #61/#62 tracked as their own item (Story 122, [#539](https://github.com/kaushikkuberanathan/lineup_generator/issues/539), filed and merged via PR #540).
4. **Patch `DOC_TEST_DEBT.md` now.** Done — [PR #538](https://github.com/kaushikkuberanathan/lineup_generator/pull/538), merged. P0 dashboard now correctly shows 1 open P0 (Story 121), explicitly noted as not blocking this patch release (the `debt-p0` gate is scoped to minor bumps only) but will block the next minor bump.

## 9. Track 1 Step 4 — Pre-release Docs Checklist (verbatim, `CLAUDE.md` §Pre-release Docs Checklist)

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | `APP_VERSION` bumped in `App.jsx` | **Deferred to Step 5** | Version bump is Step 5's own job; not yet performed. |
| 2 | `version` bumped in both `package.json` | **Deferred to Step 5** | Same as above. |
| 3 | `VERSION_HISTORY` entry prepended | **Deferred to Step 5** | Same as above. |
| 4 | `CLAUDE.md` "Current Version" line updated | **Deferred to Step 5** | Same as above. |
| 5 | `ROADMAP.md` release entry at top | **Deferred to Step 5** | Confirmed the convention live (`## v2.8.3 - 2026-08-01 - ...` at the top of `ROADMAP.md`) - Step 5 will add the matching `## v2.8.4` entry. |
| 6 | `FEATURE_MAP.md` — row for every touched feature | **N/A** | Zero user-facing features touched this window (§3) — existing rows (Roster/Defense/Batting/etc.) reference per-file test names, not raw counts; none of those files' test coverage changed from the `C.*` token migrations (color-reference swaps only, no test files added/removed for slices 1-3). |
| 7 | `DOC_TEST_DEBT.md` — ages/targets/new test files/resolved items | **PASS (fixed)** | Story 121 P0 entry + dashboard patched via [PR #538](https://github.com/kaushikkuberanathan/lineup_generator/pull/538), merged. |
| 8 | `SOLUTION_DESIGN.md` — architecture changed | **N/A** | No new hooks, state fields, guards, schema columns, or conventions this window - all changes are color-token references or test coverage. |
| 9 | `CLAUDE.md` — new architectural conventions/pitfalls | **PASS (fixed)** | `fileParallelism:false` (Story 118/#517) was live in `vite.config.js` but undocumented in `CLAUDE.md`'s Infrastructure notes. Fixed via [PR #541](https://github.com/kaushikkuberanathan/lineup_generator/pull/541). |
| 10 | `faqs.js` — new FAQs for coach-facing features | **N/A** | Zero user-facing behavior changed this window. |
| 11 | `README.md` — install/deploy/usage changed | **N/A** | No install/deploy/usage changes this window. |
| 12 | New test files listed in `DOC_TEST_DEBT.md` test inventory | **Pre-existing tracked gap, not newly broken** | `DOC_TEST_DEBT.md` has no single running "test inventory" list matching this item's literal description - the closest match, `SOLUTION_DESIGN.md`'s own §Test Suite Inventory, is *already* a tracked P2 doc gap in the ledger (line ~194), predating this release. New files this window (`Story117TierOneEquivalence.test.jsx`, `Story117TierTwoThreeEquivalence.test.jsx`, `Card.test.jsx`) are not newly missing from anywhere they weren't already missing from. |
| 13 | Test count in `CLAUDE.md` matches actual suite total | **PASS (fixed)** | Both `CLAUDE.md` and `frontend/CLAUDE.md` cited 786/795/815 (stale since v2.5.26, 2026-06-08). Verified live: 975 frontend passed/1 skipped/80 files + 111 backend unit tests = 1086 total. Fixed via [PR #541](https://github.com/kaushikkuberanathan/lineup_generator/pull/541). |
| 14 | Pre-push hook runs and passes on the release branch | **PASS** | Confirmed empirically - ~16 successful pushes tonight through `.husky/pre-push`, zero hook failures, branch-guard behavior as documented (blocks direct pushes to `develop`/`main`, no-ops on branch deletion). |
| 15 | Vercel preview deployed + phone-smoke-tested on a real device | **PENDING — requires KK** | Cannot be performed by this session (needs a physical device on a real network). Will occur naturally when Step 8's `develop → main` PR triggers a Vercel preview deploy - KK must smoke-test it before Step 8's merge. |
| 16 | Branch protection on `main` enforces CI + preview deployment, no bypass | **PARTIAL — flagged, not fixed** | Live-checked via GitHub API: `main` requires 3 status checks (`Backend Integration Tests`, `Frontend Tests (Vitest)`, `RLS Policy Suite`) - confirmed real and active. However: no Vercel/preview-deployment check is configured as a *required* status check by name, and `enforce_admins: false` means an admin (KK) can bypass all required checks if they choose. This is pre-existing configuration, not something this release changed - flagged for awareness, not treated as a release blocker, and not changed without KK's explicit direction (branch protection is account/security configuration). |
| 17 | Merge dropdown: Create a merge commit, not squash | **N/A yet** | Applies at Step 8 (the actual `develop → main` PR), not yet reached. |
| 18 | `sync-stories-to-issues.js` — all `<!-- #N -->` markers patched | **PASS** | Ran `node scripts/sync-stories-to-issues.js --dry-run` live: *"✅ No open stories without issue numbers found."* Every Story 85 through 122 already correctly linked, including all five filed tonight (119→#530, 120→#531, 121→#535, 122→#539). |

**Net result: no hard failures.** Two real gaps found (items 9, 13) were fixed in this session (PR #541). One item (16) is a real, pre-existing configuration gap flagged for KK's awareness but not treated as blocking or fixed without explicit direction. Item 12 is a pre-existing, already-tracked debt item, not newly broken. Items 1-5 are correctly deferred to Step 5. Item 15 requires KK's own action at Step 8. Proceeding to Step 5 (version bump).

## 10. Addendum (2026-08-05) — S.card regression found and fixed during Track 2, after this audit's original write-up

This audit's §4 open-items list (above) was written before Track 2 (Phase 4 slices 4-6) started, and therefore does not mention a real, already-shipped regression discovered mid-Track-2. Recording it here so this document stays the complete picture, not just its Track-1-Step-4 snapshot.

**What was found:** Story 117 (#515) — already merged to `develop`, already part of this v2.8.4 release currently in soak — deleted the `S.card` style object from `App.jsx` entirely. `AboutTab.jsx`'s Cards 4 and 5 ("App Info", "How to Use This App") still referenced `style={S.card}` via a prop passed down from `App.jsx`. Since `S.card` no longer existed, both cards had been silently rendering with `style={undefined}` — no background, padding, border-radius, or box-shadow — for the entire time between Story 117's merge and this discovery. `AboutTab.test.jsx` has zero style/computed-style assertions, so nothing in CI caught it.

**What was fixed:** [PR #547](https://github.com/kaushikkuberanathan/lineup_generator/pull/547) (merged into `feature/phase4-region-slices-remaining`, not `develop` directly — see below) added a `legacyCard` object to `AboutTab.jsx` that exactly reproduces the deleted `S.card`'s values via `tokens.*`, verified pixel-for-pixel against `S.card`'s original definition (recovered via `git log -p -S"card:"`). Along the way, a second, independent pre-existing bug surfaced and was also fixed: `AccountNameField.test.jsx`'s own color fixture hardcoded a red value (`#c0392b`) that never matched the real `C.red` (`#c8102e`) — that test had been passing only by comparing its own wrong mock against itself, never against the real rendered color.

**What was NOT done — a real, consciously unswept gap:** Only the two components the original Phase 4 handoff notes specifically named (`AboutTab.jsx`, `AccountNameField.jsx`) were checked for this exact failure pattern (a child component receiving a legacy `C`/`S` prop that references a key later deleted from App.jsx's `var C`/`S` objects). **No broader, exhaustive sweep was performed** to confirm no *other* component elsewhere in `frontend/src/components/` has the same latent break — either against `S.card` specifically, or against any other `S.*`/`C.*` key a future or past cleanup might have silently removed. This is deliberately out of scope for this session (low-impact relative to Track 1/2's active work, not a release blocker for v2.8.4 since the confirmed instance is fixed), but it is a real gap, not a closed question. **Recommendation:** a future session should grep `frontend/src/components/**` for every `C={` / `S={` prop pass-through from `App.jsx`, cross-reference each referenced key against `App.jsx`'s current `var C`/`S` object contents, and confirm no other silent `style={undefined}` breaks exist. Worth its own small Story if picked up.

**Why this didn't block the v2.8.4 promote:** the confirmed instance (AboutTab Cards 4-5) is fixed and merged (into the Phase 4 branch — will reach `develop`/`main` whenever that branch's own promote happens, separately from this v2.8.4 release cycle, per KK's own scope decision to defer Phase 4 slices 7-9 and not merge the Phase 4 branch into `develop` this session). v2.8.4 itself never shipped the regression's fix, but it also didn't introduce a *new* regression — Story 117's break predates this audit and this release; discovering and fixing it doesn't change v2.8.4's own risk profile.
