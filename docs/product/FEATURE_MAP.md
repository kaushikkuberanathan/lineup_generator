# Dugout Lineup — Feature Map

> Authoritative mapping of every shipped feature to its documentation and test coverage.
> Update this file whenever a feature ships, changes behavior, or gains new tests.
> Owner: KK | Last updated: 2026-05-01 (v2.5.4 — added row #25 DugoutView/Combined Game View; rows #8 and #11 updated with consolidation note; ScoreboardRow debt item D017 added to DOC_TEST_DEBT.md)

---

## How to Read This Table

| Column | Values |
|--------|--------|
| **Status** | `MVP` · `Pilot` · `Phase 2` · `Phase 3` · `Removed` |
| **Doc Status** | `✅ Current` · `⚠ Stale` · `❌ Missing` |
| **Test Status** | `✅ Yes` · `⚠ Partial` · `❌ None` |
| **Debt** | ID(s) in `DOC_TEST_DEBT.md` — blank if clean |

---

## Feature Registry (25 features)

| # | Feature | Status | Primary Doc | Doc Status | Test File(s) | Test Status | Debt |
|---|---------|--------|-------------|------------|--------------|-------------|------|
| 1 | **Auto-assign lineup engine (V2)** | MVP | `SOLUTION_DESIGN.md` § Scoring Engine | ✅ Current | `engine.v2.test.js`, `lineupEngineV2-unit.test.js`, `bench-equity.test.js`, `scoring.test.js` | ✅ Yes | D002 |
| 2 | **Manual grid overrides + cell lock** | MVP | `SOLUTION_DESIGN.md` § Field Layout | ✅ Current | `engine.v2.test.js` (partial — lock not unit tested) | ⚠ Partial | — |
| 3 | **Batting order (drag, stats, season AVG)** | MVP | `PERSONAS.md` § Head Coach features | ✅ Current | None | ❌ None | D016 |
| 4 | **Schedule management + AI import** | MVP | `ROADMAP.md` § v2.1.x entries | ⚠ Stale | None | ❌ None | D015 |
| 5 | **Game result logging + batting stats** | MVP | `ROADMAP.md` § v2.1.x entries | ⚠ Stale | None | ❌ None | D016 |
| 6 | **Walk-up songs per player** | MVP | `SOLUTION_DESIGN.md` § Walk-up Songs Architecture; `CHARTER.md` § Scope | ✅ Current | None | ❌ None | D004 |
| 7 | **Out Tonight attendance tracking** | MVP | `CLAUDE.md` (as "Out Tonight"); `ROADMAP.md` § v2.2.30 | ✅ Current | `engine.v2.test.js` Group 6, `lineupEngineV2-unit.test.js` Group X, `bench-equity.test.js` absent-player | ⚠ Partial | D008 |
| 8 | **Game Mode (full-screen dugout view)** | MVP | `SOLUTION_DESIGN.md` § Navigation Structure | ✅ Current | None | ❌ None | D006; Will be consolidated into Combined Game View (#25) when flag flips ON. |
| 9 | **Share links (8-char Supabase-backed)** | MVP | `SOLUTION_DESIGN.md` § RLS Policy Map; `CLAUDE.md` Auth Principle | ✅ Current | None | ❌ None | D005 |
| 10 | **PDF export + print view** | MVP | `ROADMAP.md` § v1.x | ⚠ Stale | None | ❌ None | D011 |
| 11 | **Live scoring (scorer lock, inning entry, game finalization)** | Pilot | `ROADMAP.md` § v2.2.29–v2.3.3; `PERSONAS.md` § Scorekeeper; `MASTER_DEV_REFERENCE.md` § Game Object Shape | ✅ Current | `finalizeSchedule.test.js`, `undoHalfInning.test.js`, `newGameTemplate.test.js`, `practiceModeIsolation.test.js`, `realtimeRaceGuard.test.js`, `runnerPlacement.test.js` | ⚠ Partial | D001; Will be consolidated into Combined Game View (#25) when flag flips ON. |
| 25 | **Combined Game View (DugoutView — flag-gated unified scoring surface)** | Phase 3 | `docs/SOLUTION_DESIGN.md` § Feature Flag System | ✅ Current | DugoutView wired in feature/combined-game-view; no dedicated test file yet | ❌ None | D017; mutual-exclusion invariant untested |
| 12 | **Practice Mode** | Pilot | `CLAUDE.md` § Live Scoring Architecture; `ROADMAP.md` § v2.3.3 | ✅ Current | `practiceModeIsolation.test.js` | ✅ Yes | — |
| 13 | **Runner Placement on Diamond** | Pilot | `CLAUDE.md` § Roster identity; `ROADMAP.md` § v2.3.3 | ✅ Current | `runnerPlacement.test.js` | ✅ Yes | — |
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

---

## Coverage Summary

| Status | Count |
|--------|-------|
| ✅ Doc Current | 21 / 25 |
| ⚠ Doc Stale | 4 / 25 |
| ❌ Doc Missing | 0 / 25 |
| ✅ Tests Exist | 5 / 25 |
| ⚠ Tests Partial | 8 / 25 |
| ❌ No Tests | 12 / 25 |

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
