# Dugout Lineup — Feature Map

> Authoritative mapping of every shipped feature to its documentation and test coverage.
> Update this file whenever a feature ships, changes behavior, or gains new tests.
> Owner: KK | Last updated: 2026-06-12 (Story 99 Phase 2 tranche 2 / #252 — row #33 backend test foundation now ✅ Yes: aiProxy + auth happy-path landed)

---

## How to Read This Table

| Column | Values |
|--------|--------|
| **Status** | `MVP` · `Pilot` · `Phase 2` · `Phase 3` · `Removed` |
| **Doc Status** | `✅ Current` · `⚠ Stale` · `❌ Missing` |
| **Test Status** | `✅ Yes` · `⚠ Partial` · `❌ None` |
| **Debt** | ID(s) in `DOC_TEST_DEBT.md` — blank if clean |

---

## Feature Registry (34 features)

| # | Feature | Status | Primary Doc | Doc Status | Test File(s) | Test Status | Debt |
|---|---------|--------|-------------|------------|--------------|-------------|------|
| 1 | **Auto-assign lineup engine (V2)** | MVP | `SOLUTION_DESIGN.md` § Scoring Engine | ✅ Current | `engine.v2.test.js`, `lineupEngineV2-unit.test.js`, `bench-equity.test.js`, `scoring.test.js` | ✅ Yes | D002 |
| 2 | **Manual grid overrides + cell lock** | MVP | `SOLUTION_DESIGN.md` § Field Layout | ✅ Current | `engine.v2.test.js` (partial — lock not unit tested) | ⚠ Partial | — |
| 3 | **Batting order (drag, stats, season AVG)** | MVP | `PERSONAS.md` § Head Coach features | ✅ Current | None | ❌ None | D016 |
| 4 | **Schedule management + AI import** | MVP | `ROADMAP.md` § v2.1.x entries | ⚠ Stale | None | ❌ None | D015 |
| 5 | **Game result logging + batting stats** | MVP | `ROADMAP.md` § v2.1.x entries | ⚠ Stale | None | ❌ None | D016 |
| 6 | **Walk-up songs per player** | MVP | `SOLUTION_DESIGN.md` § Walk-up Songs Architecture; `CHARTER.md` § Scope | ✅ Current | None | ❌ None | D004 |
| 7 | **Out Tonight attendance tracking** | MVP | `CLAUDE.md` (as "Out Tonight"); `ROADMAP.md` § v2.2.30 | ✅ Current | `engine.v2.test.js` Group 6, `lineupEngineV2-unit.test.js` Group X, `bench-equity.test.js` absent-player | ⚠ Partial | D008 |
| 8 | **Game Mode (full-screen dugout view)** | Removed | `SOLUTION_DESIGN.md` § Navigation Structure | ⚠ Stale | None | ❌ None | D006; ScoringMode render block + Scoring tab removed in Slice 3 (v2.5.9); legacy `ScoringMode/index.jsx` deleted in Slice 4 (v2.5.11). Superseded by #25. |
| 9 | **Share links (8-char Supabase-backed)** | MVP | `SOLUTION_DESIGN.md` § RLS Policy Map; `CLAUDE.md` Auth Principle | ✅ Current | None | ❌ None | D005; Share CTA restored to Lineups tab — Story 67 (PR #99, v2.5.15) |
| 10 | **PDF export + print view** | MVP | `ROADMAP.md` § v1.x | ⚠ Stale | None | ❌ None | D011 |
| 11 | **Live scoring (scorer lock, inning entry, game finalization)** | MVP | `ROADMAP.md` § v2.2.29–v2.3.3; `PERSONAS.md` § Scorekeeper; `MASTER_DEV_REFERENCE.md` § Game Object Shape | ✅ Current | `finalizeSchedule.test.js`, `undoHalfInning.test.js`, `newGameTemplate.test.js`, `practiceModeIsolation.test.js`, `realtimeRaceGuard.test.js`, `runnerPlacement.test.js` | ⚠ Partial | D001; Scoring surfaces through Combined Game View (#25) only. Slice 4 (v2.5.11) deleted legacy `ScoringMode/index.jsx`; the 7 live child components (`ScoringModeEntry`, `LiveScoringPanel`, `RestoreScoreModal`, `FinishGameModal`, `GameModeGearMenu`, `LiveScoreViewer`, `RunnerConflictModal`) remain in `components/ScoringMode/` and are imported by `DugoutView.jsx`. Optional follow-up: relocate to `components/game-mode/scoring/`. |
| 25 | **Combined Game View (DugoutView — unified scoring surface)** | MVP | `docs/SOLUTION_DESIGN.md` § Feature Flag System | ✅ Current | `BattingOrderStrip.test.jsx` (6), `DugoutView.test.jsx` (5), `ScoreboardRow.test.jsx` (4), `DugoutView.viewport.test.jsx` (3) | ⚠ Partial | GA default-on as of Slice 3 (v2.5.9); mutual-exclusion invariant untested (legacy ScoringMode removed) |
| 26 | **ACCESSIBILITY_V1 — Game Mode a11y enhancements** | MVP | `CLAUDE.md` § Feature Flags; `docs/product/A11Y_AUDIT.md`; `SOLUTION_DESIGN.md` § Feature Flag System | ✅ Current | `a11y-component-fixes.test.jsx` (11), `accessibility.v1.test.js` (23) | ⚠ Partial | Game Mode font/touch/contrast untested at component level; F1-F7 fixes covered |
| 27 | **Design Tokens — semantic token foundation** | Phase 2 | `docs/product/DESIGN_AUDIT.md`; `SOLUTION_DESIGN.md` § Design Tokens Architecture | ✅ Current | `theme.tokens.test.js` (34) | ⚠ Partial | Shape contract tested; no consumer tests (zero consumers in Phase 1a). Story 102 (v2.5.25, PR #271): App.jsx OUT-row error tint migrated to `tokens.color.overlay.error*`; `errorMid` token added (`rgba(220,38,38,0.12)`) — zero visible change, contract covered by `theme.tokens.test.js`. |
| 28 | **UI primitives — Badge / Button / Card / Stack / Text** | Phase 2 | `ROADMAP.md` § v2.5.10; `CLAUDE.md` § UI Primitives | ✅ Current | `Badge.test.jsx`, `Button.test.jsx`, `Card.test.jsx`, `Stack.test.jsx`, `Text.test.jsx` (107 total) | ⚠ Partial | Primitives covered in isolation; 2 consumers migrated as of v2.5.11 (PlayerHandBadge via PR #62, EmptyState via PR #68); more queued for Phase 3 Step 3+. Badge gained `context='light'\|'dark'` prop in v2.5.12 (PR #73); dark variants are token-driven. |
| 12 | **Practice Mode** | MVP | `CLAUDE.md` § Live Scoring Architecture; `ROADMAP.md` § v2.3.3 | ✅ Current | `practiceModeIsolation.test.js` | ✅ Yes | — |
| 13 | **Runner Placement on Diamond** | MVP | `CLAUDE.md` § Roster identity; `ROADMAP.md` § v2.3.3 | ✅ Current | `runnerPlacement.test.js` | ✅ Yes | — |
| 14 | **Opponent Half Tracking** | Pilot | `CLAUDE.md` § Live Scoring Architecture; `ROADMAP.md` § v2.3.2–v2.5.0 | ✅ Current | `liveStateMerge.test.js` (opp integration) | ⚠ Partial | — |
| 15 | **Feature flag system** | MVP | `CLAUDE.md` § Feature Flags; `SOLUTION_DESIGN.md` § Feature Flag System | ✅ Current | `flagBootstrap.test.js`, `accessibility.v1.test.js`, `scoringSheetV2.test.js` | ⚠ Partial | D-S30 |
| 23 | **Scoring outcome sheet (SCORING_SHEET_V2)** | Pilot | `ROADMAP.md` § v2.5.0; `CLAUDE.md` § Current Version | ✅ Current | `scoringSheetV2.test.js` | ⚠ Partial | D-S30 |
| 16 | **Auth system (magic link + Google OAuth)** | Phase 2 | `SOLUTION_DESIGN.md` § Auth Architecture; `CLAUDE.md` § Auth Strategy | ✅ Current | None | ❌ None | D003 |
| 17 | **Admin UI (admin.html)** | MVP | `SOLUTION_DESIGN.md` § Admin UI; `PERSONAS.md` § Administrator | ✅ Current | None | ❌ None | D007 |
| 18 | **Roster backup/restore** | MVP | `SOLUTION_DESIGN.md` § Data Protection | ✅ Current | None | ❌ None | D013 |
| 19 | **Multi-team support** | MVP | `CLAUDE.md` § Architecture | ✅ Current | `migrations.test.js` (partial — migration only) | ⚠ Partial | D014 |
| 20 | **Fairness Check + violation warnings** | MVP | `SOLUTION_DESIGN.md` § Scoring Engine | ✅ Current | `engine.v2.test.js` (violations surfaced) | ⚠ Partial | D012 |
| 21 | **Player profiles (V2 attributes)** | MVP | `SOLUTION_DESIGN.md` § Player Attributes; `PERSONAS.md` § Head Coach | ✅ Current | `scoring.test.js`, `lineupEngineV2-unit.test.js` | ✅ Yes | — |
| 22 | **Governance infrastructure** | MVP | `CHARTER.md`, `ONE_PAGER.md`, `ROADMAP.md`, `PERSONAS.md`, `faqs.js`, `FEATURE_MAP.md`, `MASTER_DEV_REFERENCE.md`, `CLAUDE.md` | ✅ Current | — | ❌ None | — |
| 24 | **Toast UI primitive** | MVP | `CLAUDE.md` § UI Primitives | ✅ Current | `src/components/ui/Toast.test.jsx` | ✅ Yes | — |
| 29 | **BottomSheet UI primitive** | MVP | `CLAUDE.md` § UI Primitives | ✅ Current | `src/components/ui/BottomSheet.test.jsx` (7 tests, BS1–BS7); `theme.tokens.test.js` (+6 tests for `radius.sheet` + `shadow.sheetTop`) | ✅ Yes | LockFlow is the sole consumer today (v2.5.21); future modals/pickers expected to migrate. Pill + ListRow (v2.5.14) and the Phase 2 primitives row (#28) cover other shipped primitives — pre-existing gaps where this map lags shipped primitives. |
| 30 | **DefenseDiamond — Game Day diamond view** | MVP | `ROADMAP.md` §§ Stories 92, 93; `SOLUTION_DESIGN.md` § Design Tokens (v2.5.22 + v2.5.24 additions) | ✅ Current | None at component level; token contract covered by `theme.tokens.test.js` | ❌ None | Tier A+B token migration shipped v2.5.22 (Story 92, PR #218). Tier D shipped v2.5.24 (Story 93, PR #259): position.* (22 keys), field.* (7 keys), overlay.error* (4 tints); POS_COLORS prop drilling removed from App.jsx → ParentView; DefenseDiamond, App.jsx renderFieldSVG, and ParentView unified on identical token contract. |
| 31 | **MaintenanceScreen — error / maintenance surface** | MVP | `ROADMAP.md` § Story 94; `SOLUTION_DESIGN.md` § Design Tokens (v2.5.22 additions) | ✅ Current | None at component level | ❌ None | Token migration shipped v2.5.22 (Story 94, PR #220). Self-styled via design tokens — see CLAUDE.md § Self-styled Support components convention. |
| 32 | **sync-stories-to-issues.js — ROADMAP → GitHub Issues automation** | MVP | `ROADMAP.md` § Story 97; `CLAUDE.md` § Issue & Backlog Hygiene | ✅ Current | `scripts/__tests__/sync-patch.test.js` (4 tests: parseStories CRLF, patchHeading marker replace, idempotency, byte-level CRLF integrity) | ✅ Yes | CRLF byte-corruption fix shipped v2.5.22 (Story 97, PR #234). Both patch sites collapsed to shared `patchHeading()`; `findExistingOpenIssue` dead-code bug fixed. CI guard via `sync-script` job. |
| 33 | **Backend test foundation** | In Progress | `ROADMAP.md` §§ Story 99; `backend/CLAUDE.md` § Test Suite | ✅ Current | `backend/src/__tests__/` — `admin.auth.test.js` (9), `teamData.guard.test.js` (12), `teamData.envGuard.test.js` (2), `teamData.routes.test.js` (6), `aiProxy.test.js` (6), `auth.happy.test.js` (4) = 39 | ✅ Yes — #252 route coverage complete (admin auth, teamData wipe-guard/envGuard/routes, AI proxy, auth happy-path) | #252 closed: AI proxy + auth happy-path landed (Story 99 Phase 2 tranche 2). Broader integration paths still via the 13-suite runner. |
| 34 | **About tab (Builder profile + AboutTab extraction)** | MVP | `ROADMAP.md` § Story 105 | ✅ Current | `AboutTab.test.jsx` (13 tests, AT1–AT13) | ✅ Yes | `status.warning` eyebrow contrast ~3.4:1 documented debt; Support tab reorder pending (#285 / Story 107) |

---

## Coverage Summary

| Status | Count |
|--------|-------|
| ✅ Doc Current | 29 / 34 |
| ⚠ Doc Stale | 5 / 34 |
| ❌ Doc Missing | 0 / 34 |
| ✅ Tests Exist | 8 / 34 |
| ⚠ Tests Partial | 12 / 34 |
| ❌ No Tests | 14 / 34 |

> The test gap is large but expected — the engine is the highest-risk surface and is well-covered. Features with no test are all UI-layer or integration paths with no engine logic.

---

## Update Rules

> **Known gap (April 27, 2026):** Feature rows for v2.4.0 (Game context header, home/away semantic), v2.5.0 (SCORING_SHEET_V2 default-on, GameContextHeader consolidation prep), and v2.5.1 (truncateTeamName upgrade, ScoreboardRow typography promotion, Game N + Home/Away chip pattern, SharedView component name) are not yet registered. To be added in a focused session — requires reading existing row schema first. Tracked in DOC_TEST_DEBT.md.

See `CLAUDE.md` § Feature Map Update Rules for the full protocol. Quick reference:

1. New feature ships → add a row, set status, fill doc/test status honestly
2. Feature behavior changes → update Doc Status to `⚠ Stale` until docs are fixed
3. Docs repaired → flip Doc Status to `✅ Current`
4. Tests added → flip Test Status to `✅ Yes` or `⚠ Partial`
5. Debt item created → add the ID to the Debt column
6. Debt item resolved → remove the ID and update Test/Doc status
