# Lineup Generator — Product Roadmap

> Last updated: 2026-05-30 (v2.5.23 — ESLint zero, Vite 6, token cleanup)
> MVP launched: March 24, 2026

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

### Story 61 (P0) — Share-link viewer routing broken in prod

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

### Story 67 (P0) — Share CTA orphaned: shareCurrentLineup() unreachable from Lineups tab
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

**Problem:** `dbLoadShareLink` returns null for at least three distinct failure modes (row not found, RLS block, malformed slug) and the caller cannot distinguish them — all three collapse into a single silent null, making the share-link error surface undiagnosable.

**Acceptance criteria:**
- Caller receives a typed result or error code distinguishing: (a) not found, (b) RLS/auth block, (c) malformed slug
- Share-link error UI surfaces a user-meaningful message per failure mode
- Unit test covers all three paths

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
| 2 | **Scoring: Phase 4C cleanup** | Remove AUTH TESTING SHIM from `useLiveScoring.js` and `index.jsx`; enforce RLS with `auth.uid()` policies on all three scoring tables; restore `scorer_user_id` and `actor_user_id` to uuid + FK. |
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
- Auto-assigns creator as team_admin of the new team

### Phase 5B — Delegated approval
- team_admin can approve coach/coordinator requests for their own team
- platform_admin only receives and approves team_admin requests
- Notification routing: team_admin requests → platform_admin, 
  coach/coordinator requests → team_admin of that team

### Phase 5C — Team switcher UI
- Multi-team users see team switcher on home screen
- Favourite badge to pin primary team
- Search bar to find other teams
- One Supabase user, multiple team_memberships rows

### Phase 5D — Team join links
- Head coach generates QR code / shareable link for their team
- Pre-fills team ID and role in RequestAccessScreen
- Separate links per role (head coach link, assistant link, coordinator link)

### Phase 5E — Head coach onboarding flow (replaces manual Supabase creation)
- Platform admin sends "Create your team" invite link to new head coach
- Head coach fills out team details + their own profile
- Team is created, head coach gets team_admin membership automatically

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

### Story 30 (P2): isFlagEnabled — no DB-read path; DB flip has no runtime effect without redeploy <!-- #112 -->
- **Surfaced:** April 24, 2026 (post-v2.5.0 merge; DB row flipped expecting user-facing change)
- `isFlagEnabled(flagName)` is synchronous: reads `FEATURE_FLAGS[flagName]` from the JS bundle default + `localStorage.getItem('flag_' + flagName)`. It does NOT query the Supabase `feature_flags` table at runtime.
- Current rollout method: code deploy (change default in featureFlags.js) or localStorage override per device.
- Desired: DB-driven flag evaluation so ops can flip flags without a redeploy.
- Fix candidates: (A) async `isFlagEnabled` that reads Supabase `feature_flags` at app boot and caches; (B) `flagBootstrap.js` extended to fetch DB flags and merge into a runtime registry; (C) add a startup fetch in App.jsx hydration path, similar to team data load.
- Recommend (B) — keeps the evaluation function synchronous at the call site while moving the async fetch to bootstrap. Matches existing `flagBootstrap.js` pattern.
- Blocks nothing directly; current localStorage override remains available as workaround.
- Connects to Story 41: until both resolved, runtime flag changes require redeploy + can't be locally test-validated.

### Story 26 (P2): Backend RATE-01a test flakiness — stateful against prod rate limiter <!-- #111 -->
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

### Story 34 (P3) — FEATURE_MAP row numbering audit <!-- #114 -->
Status: Open
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
Acceptance criteria:
  - Hygiene pass complete: Story 27 (P0) collision resolved → renumbered Story 61; P2 table row 47 (dbLoadShareLink) promoted to Story 62; gaps 17/18/25/52 documented in ## 🗃️ Retired / Never Filed stub. Completed 2026-05-14.

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

### Story 39 (P3) — Typed VERSION_HISTORY schema validator <!-- #117 -->
Status: Open
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

### Story 49 (P2) — Feature flag key scheme normalization <!-- #120 -->
Status: Open
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

### Story 71 (P2) — Version History Audit: Standardize Schema Across All Entries <!-- #140 -->

Status: Open
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

### Story 75 (P1) — Pre-push hook: move full Vitest suite out of hook, CI-only <!-- #153 -->

Status: Resolved v2.5.18
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

Status: Open
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

Status: Open
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

Status: Open
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

Status: Open
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

Status: Open
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

### Story 99 (P1) — Backend test suite re-authoring <!-- #252 -->

Status: Open
Discovered: 2026-04-24 — backend suite obsolete against
v2.3.3+ (rate limiter removed, routes restructured)
Target: v2.6.x (prerequisite for Phase 4C auth gate)

Symptom: backend/scripts/tests/ references removed routes.
CI does not run backend tests. Zero automated coverage.

Impact: Any backend route change is unprotected. Phase 4C
cannot ship safely without backend test coverage.

Root cause: Suite written against v2.3.x; multiple breaking
changes since. Never re-authored.

Proposed fix: audit stale tests → re-author against current
routes → add to CI as required check. Cover: /ping,
/api/auth/magic-link, /api/team/:id, /api/ai parse.

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
- **Auth backend deployed (Phase 3):** Email magic-link auth live on Render (Twilio removed). Frontend cutover pending. Until then, all routes remain open (no `requireAuth` middleware on existing routes).
