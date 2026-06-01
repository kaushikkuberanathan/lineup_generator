# App.jsx Decomposition Plan — UX Phase 4

**Status:** Planning (docs only — zero code changes in this artifact)
**Track:** UX Refactor → Phase 4 (App.jsx Decomposition)
**Created:** 2026-06-02 (Terminal 2, UX track)
**Owner:** KK
**Prereqs:** Phases 1–3 substantially complete (tokens, a11y GA, lint, primitives, call-site migrations). This doc fleshes out the Phase 4 stub in `UX_REFACTOR_ROADMAP.md` (§Phase 4, L94–112).

> This is a **planning artifact**, not an execution record. No App.jsx code was
> edited to produce it — the map below is from read-only structural analysis at
> develop `ca9bd0a`. Line numbers are a snapshot and will drift; anchor on
> function names, not line numbers, when executing.

---

## 1. Why this plan exists

App.jsx is **8,140 lines** as of `ca9bd0a` (the UX roadmap's "9,800" figure is stale-high but directionally right). It is the single largest correctness and velocity risk in the codebase:

- Every tab, handler, and most state lives in one `export default function App()` that spans **~7,000 lines** (L1122–8140).
- It is a permanently **locked file** (gate phrase + parallel-session contention with the Game Day track).
- Any change requires whole-file reasoning; regressions are hard to localize (the v2.3.2 revert lesson).

Phase 4's goal (per UX roadmap): **App.jsx becomes a router/shell; each tab becomes an independently importable component.** This plan sequences that work **incrementally, lowest-risk first**, so each slice ships as a small, independently soakable PR rather than one high-risk megacommit.

---

## 2. Current structure map (read-only, `ca9bd0a`)

### 2.1 Already top-level (outside `App()`) — easiest to move

| Symbol | Lines (approx) | Nature | Coupling |
|---|---|---|---|
| `firstName` | 44 | Pure name formatter | None (pure) |
| `loadJSON` / `saveJSON` | 137–153 | localStorage wrappers | None (pure) |
| `migrateGrid` | 154–266 | Grid migration | Pure; **but** belongs with `migrations.js` (locked) |
| `scorePosition` | 267–348 | Lineup scoring | Pure (args only) |
| `autoAssign` | 349–552 | V1 assign | Pure (args only) |
| `autoAssignWithRetryFallback` | 553–606 | V1 fallback wrapper | Pure (args only) |
| `validateGrid` | 607–656 | Grid validation | Pure (args only) |
| `initGrid` | 657–779 | Grid init | Pure (args only) |
| `PlayerFilterToggle` | 780–810 | Presentational component | Props only (`players`, `selected`, `onSelect`) |
| `SharedView` | 811–1121 | Share-link viewer (~310 lines) | Props only (`payload`, `renderFieldSVG`) |

**Lineup-engine finding (important):** the local engine (`scorePosition`/`autoAssign`/`autoAssignWithRetryFallback`/`validateGrid`/`initGrid`, ~510 lines) is **NOT dead code**. `generateLineupV2` (from `utils/lineupEngineV2.js`) is the primary path (L2599), but the local functions remain the **V1/fallback path** (L2605, 2609), the **fix path** (L4473), **grid initialization** (L1622, 2283, 4122, 4588), and the **validation warnings** memo (L1845). They are pure and take explicit args → cleanly extractable to a module, but they **bear behavior** and must be characterization-tested before moving (the V1 path has thinner coverage than V2).

### 2.2 Inside `App()` — the ~7,000-line body (L1122–8140)

Three layers, interleaved today:

**(a) State + lifecycle** (~L1122–1900): `useState`/`useMemo`/`useEffect` declarations, Supabase hydration, derived state.

**(b) Data + action handlers** (~L1140–2908): `dbSync`, `persistRoster/Attendance/Schedule/Batting/Grid/Innings/...`, `loadTeam`, `createTeam`, `saveTeamEdits`, `deleteTeam`, `addPlayer/removePlayer/updatePlayer`, `generateLineup`, `shareCurrentLineup`, `shareViewerLink`, `exportTeamData`, `importTeamData`, the AI/parse family (`callAI`, `parseGameResult`, `parseScheduleText/Image`, `confirmImport`), `submitFeedback`, `submitBug`. **These are closures over App state** — the core extraction obstacle.

**(c) Render functions** (the tab bodies — all closures over state + the handlers above):

| `render*` | Lines (approx) | Size | State coupling |
|---|---|---|---|
| `renderHome` | 2909–3352 | ~444 | Medium (teams, loadTeam, createTeam) |
| `renderRoster` | 3353–4132 | ~780 | **High** |
| `renderFieldSVG` | 4133–4256 | ~124 | Medium (helper, passed to SharedView) |
| `renderLineups` | 4257–4432 | ~176 | High |
| `renderGrid` | 4433–4925 | ~493 | **High** |
| `renderBatting` | 4926–5324 | ~399 | **High** |
| `renderSongs` | 5427–5576 | ~150 | Medium |
| `renderSnackDuty` | 5577–5685 | ~109 | Medium |
| `renderSchedule` | 5686–6424 | ~739 | **High** |
| `renderFeedback` | 6425–7049 | ~625 | **High** (AI parse, image upload) |
| `renderLinks` | 7050–7147 | ~98 | Low (near-static) |
| `renderAbout` | 7148–7254 | ~107 | Low (near-static) |
| `renderUpdates` | 7255–7307 | ~53 | Low (reads `VERSION_HISTORY`) |
| `renderPinModal` | 7308–~7626 | ~318 | Medium (coach PIN) |
| `renderTeamTab` | 7683–7814 | ~132 | Router (roster/schedule sub-tabs) |
| `renderExitSheet` | 7815–7858 | ~44 | Low |
| `renderBottomNav` | 7859–~ | small | Low (nav state) |

**(d) Main return** (~L7860–8140): the tab router — `primaryTab`/`teamSubTab` switch that calls the `render*` functions + `renderBottomNav`.

---

## 3. Core architectural decisions

The Phase 4 stub lists four open decisions. Recommendations below, Council-of-Three framing (recommended path first, then tradeoffs).

### 3.1 Directory structure — **directory-per-tab**

```
frontend/src/
  screens/                 # one dir per primary surface
    Home/        Home.jsx
    Roster/      Roster.jsx, PlayerFilterToggle.jsx
    GameDay/     (existing components/GameDay/ stays; tab shell joins it)
    Schedule/    Schedule.jsx, SnackDuty.jsx, Songs.jsx
    Support/     (existing components/Support/ — Feedback.jsx, Links.jsx, About.jsx, Updates.jsx land near it)
    Share/       SharedView.jsx
  state/                   # extracted app state (see 3.2)
    TeamDataContext.jsx
  utils/
    storage.js             # loadJSON/saveJSON
    lineupEngineLegacy.js  # V1 engine (scorePosition/autoAssign/validateGrid/initGrid)
```

- **Why directory-per-tab over file-per-tab:** several tabs already have satellite pieces (Roster has `PlayerFilterToggle`; Schedule has SnackDuty + Songs). A directory keeps a tab's children co-located and mirrors the existing `components/GameDay/`, `components/Support/` convention.
- **Tradeoff:** more directories. Acceptable — matches the repo's established `components/<area>/` pattern. Avoids a flat `screens/` dumping ground.

### 3.2 State management — **React Context (single `TeamDataContext`)**

**Recommended:** wrap the app in one `TeamDataContext.Provider` exposing the team-data state slice (`roster`, `schedule`, `practices`, `battingOrder`, `grid`, `innings`, `locked`, `teams`, `selectedGame`, derived warnings) **plus** the `persist*`/`loadTeam`/CRUD handlers. Each extracted tab consumes the context via a `useTeamData()` hook instead of receiving 20–40 props.

- **Why Context, not prop-drilling:** the heavy tabs (`renderRoster`, `renderGrid`, `renderSchedule`) each touch a dozen-plus state fields and handlers. Prop-drilling that is unwieldy and churns App.jsx's return signature on every extraction.
- **Why Context, not Zustand:** no new dependency, no store-migration risk, and the three-layer persistence pattern (React state → localStorage → Supabase) is already centralized in App's handlers — Context exposes them as-is. Adding Zustand would be over-engineering for a single-team-at-a-time app. *(Architect lens: revisit only if Phase 4C auth introduces multi-team concurrent state.)*
- **Tradeoff / risk:** Context re-renders all consumers on any value change. Mitigate by splitting into a **stable handlers context** (memoized, rarely changes) and a **data context** (changes often), or `useMemo` on the provider value. Decide at execution; not a blocker for the low-risk slices, which don't depend on Context.

### 3.3 Migration strategy — **extract-first, never rewrite**

Move code verbatim into a new file, wire imports, verify identical behavior. No logic changes inside an extraction PR. Logic cleanup (if any) is a separate follow-up PR. This is the only safe approach for a locked, behavior-dense file.

### 3.4 Test gate — **characterization tests before every extraction**

Established Phase 3 Step 3–4 discipline (tests written first against pre-migration source, all green, migration preserves every assertion) applies with extra weight here. RED-via-mutation if a clean RED isn't achievable (untracked-test caveat). Each slice's PR must show the characterization suite green pre- and post-extraction.

---

## 4. Incremental slice plan (low-risk first)

Each slice = one PR, one 24h develop soak, then bundled into a release-prep promote. **Every slice that edits App.jsx requires a T1 handoff + the App.jsx gate phrase + skip-worktree awareness (Bug #11).**

| Slice | What | Risk | Why this order | Test gate |
|---|---|---|---|---|
| **4.0** | Extract pure top-level helpers `loadJSON`/`saveJSON` → `utils/storage.js` | 🟢 Lowest | Zero App-state coupling; already top-level; pure pilot to prove the workflow | Unit tests for storage round-trip; build clean |
| **4.1** | Extract `PlayerFilterToggle` → `screens/Roster/PlayerFilterToggle.jsx` | 🟢 Low | Already a props-only component; ~30 lines; smallest component extraction | Render/smoke test |
| **4.2** | Extract V1 engine (`scorePosition`/`autoAssign`/`autoAssignWithRetryFallback`/`validateGrid`/`initGrid`) → `utils/lineupEngineLegacy.js` | 🟡 Low-Med | Pure & top-level, but **behavior-bearing fallback path** — characterize first | Characterization tests for V1 assign + validate + initGrid (thinner existing coverage — add before moving) |
| **4.3** | Extract `SharedView` → `screens/Share/SharedView.jsx` | 🟡 Med | Clean props boundary, **but share link is P0-bulletproof** — extra care | Render test + **real-device share-link smoke** (unauthenticated) |
| **4.4** | Extract near-static tabs: `renderAbout`, `renderUpdates`, `renderLinks` → `screens/Support/*` | 🟢 Low | Minimal state coupling; small; good Context-consumer pilots | Render tests; verify links/version content |
| **4.5** | Introduce `TeamDataContext` + `useTeamData()` — **no tab extraction yet** | 🟡 Med | Foundation for heavy-tab slices; wire provider, migrate one already-extracted consumer to prove it | Full suite green; no behavior change |
| **4.6+** | Heavy stateful tabs one at a time via Context: `renderSongs`/`renderSnackDuty` → `renderHome` → `renderBatting` → `renderLineups`/`renderGrid` → `renderRoster` → `renderSchedule` → `renderFeedback` | 🔴 High | Each is large + state-dense; do after Context exists; ascend by coupling | Per-tab characterization suite + game-day validation for Roster/Grid/Batting |
| **4.7** | App.jsx becomes router/shell; main return composes screen components | 🔴 High | Terminal step; only after all tabs extracted | Full suite + full game-day validation + 24h soak |

**Slices 4.0–4.4 are the "incremental / low-risk first" tranche** this session's story targets. They deliver real line reduction and prove the extraction workflow without touching the state-coupling problem. Slices 4.5–4.7 are explicitly **deferred** pending the Context decision and dedicated sessions.

---

## 5. Risk register & guards

| Risk | Guard |
|---|---|
| App.jsx is locked + parallel Game Day contention | T1 handoff + gate phrase before each App.jsx-touching slice; never hold App.jsx across a T1 promote |
| Bug #11 skip-worktree trap (empty diffs) | Check `git ls-files -v frontend/src/App.jsx` first; if `S`, unlock per CLAUDE.md, re-lock after |
| Share link must work unauthenticated (P0) | Slice 4.3 gets a real-device unauthenticated smoke before promote |
| Game Mode dugout-ready (P0) | `components/game-mode/*` is **out of scope** here; GameDay tab shell extraction coordinates with the Dugout track |
| V1 engine thinner test coverage | Add characterization tests in 4.2 before moving |
| Context re-render fan-out | Split handlers vs data context, or memoize provider value (3.2) |
| Highest-risk phase overall | 24h soak per slice; game-day validation mandatory before any main promote (UX roadmap Phase 4 risk note) |

---

## 6. Out of scope (Phase 4)

- `components/game-mode/*` and `components/ScoringMode/*` — Dugout track territory.
- `migrations.js`, `formatters.js`, `flagBootstrap.js` — parallel-session locked utils. (`migrateGrid` and `firstName` *conceptually* belong in `migrations.js`/`formatters.js`, but moving them requires those files' gate — defer or coordinate; do **not** fold them in opportunistically.)
- Any logic/behavior change — extraction is verbatim-move only.
- Auth screen re-skin — that's Phase 5.
- `lineupEngineV2.js` changes — scoring-engine session territory.

---

## 7. Dependencies & sequencing

1. Phase 3 call-site migrations should be substantially done so extracted tabs don't carry inline-style debt into new files (UX roadmap Phase 4 dependency).
2. Slices 4.0–4.4 have **no** inter-dependencies beyond the shared App.jsx lock — they can ship in any order, but the table order minimizes cumulative risk.
3. Slices 4.6+ depend on 4.5 (Context) landing first.
4. 4.7 depends on all tabs extracted.

---

*Execution of any slice is gated on KK direction + the App.jsx gate phrase. This
doc is updated as slices land. Pairs with `UX_REFACTOR_ROADMAP.md` §Phase 4.*
