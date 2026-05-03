# ESLint Baseline — Phase 1b

**Date:** 2026-05-02  
**Branch:** `feature/design-tokens`  
**Config file:** `frontend/.eslintrc.cjs`  
**Baseline command:** `eslint src --ext .js,.jsx --max-warnings 0` (run from `frontend/`)  
**Raw output:** `lint-baseline-output.txt` (repo root, untracked)

---

## 1. Summary

**Total: 144 problems — 49 errors, 95 warnings**

### Top 5 rule violations

| Rule | Severity | Count | Notes |
|------|----------|------:|-------|
| `no-unused-vars` | warn | 88 | ~61 in App.jsx; rest across hooks, tests, utils |
| `no-empty` | error | 18 | Mostly App.jsx empty `{}` catch blocks |
| `react/no-unescaped-entities` | error | 16 | Literal `'`/`"` in JSX text |
| `no-undef` | error | 8 | All in App.jsx (`supabase`, `teamName`, `updateServiceWorker`) |
| `react-hooks/exhaustive-deps` | warn | 7 | 4 in App.jsx, 3 in hooks/ |

### Top 5 files by finding count

| File | Errors | Warnings | Total | Status |
|------|-------:|---------:|------:|--------|
| `src/App.jsx` | 38 | 64 | **102** | Locked — Phase 4 |
| `components/ScoringMode/LiveScoringPanel.jsx` | 0 | 5 | 5 | Locked — parallel session |
| `hooks/useLiveScoring.js` | 0 | 4 | 4 | Locked — parallel session |
| `tests/scoring.test.js` | 0 | 4 | 4 | In scope — Step J |
| `utils/playerMapper.js` | 0 | 4 | 4 | In scope — Step J |

App.jsx accounts for **102 of 144 findings (71%)**. Every major rule fires there. All deferred to Phase 4 decomposition.

---

## 2. Configuration Decisions

### Format: `.eslintrc.cjs` (legacy, ESLint 8.x)

ESLint 8.57.0 is installed. Flat config (`eslint.config.js`) is an ESLint 9 requirement. The existing lint script uses `--ext .js,.jsx` which is ESLint 8 legacy syntax (removed in v9). `.eslintrc.cjs` is the correct, stable format for this version.

### Rule philosophy: minimal — pipeline restoration only

Extends only the three recommended sets:
- `eslint:recommended`
- `plugin:react/recommended`
- `plugin:react-hooks/recommended`

No Airbnb, no semicolon enforcement, no import ordering. Goal is a working lint gate, not a style enforcer.

### Targeted overrides

| Rule | Setting | Reason |
|------|---------|--------|
| `react/prop-types` | `off` | No PropTypes discipline in codebase; TypeScript migration pending |
| `react/react-in-jsx-scope` | `off` | Vite handles JSX runtime automatically (`@vitejs/plugin-react`) |
| `no-console` | `off` | Would add ~200+ baseline noise items; not a Phase 1b concern |
| `no-unused-vars` | `warn` | Baseline-friendly — surfaces findings without blocking; `--max-warnings 0` enforces at gate time |
| `react-hooks/exhaustive-deps` | `warn` (default) | Ships as warn from `plugin:react-hooks/recommended`; no override needed |

### Globals override

`__APP_VERSION__` registered as `readonly` in `globals`. This is a Vite compile-time define set in `vite.config.js` (`define: { __APP_VERSION__: JSON.stringify(pkg.version) }`). ESLint has no visibility into Vite's define mechanism; without this override it fires a false-positive `no-undef` in `utils/analytics.js`. Removed 1 error from the baseline (145 → 144).

---

## 3. Categorization

### FIX-NOW — Step J scope (13 files, 21 findings)

| File | Line(s) | Count | Rule | Severity | Status |
|------|---------|------:|------|----------|--------|
| `components/GameDay/DefenseDiamond.jsx` | 29 | 1 | `no-unused-vars` | warn | ✓ Resolved — Batch 3 |
| `components/Shared/ErrorBoundary.jsx` | 43 | 1 | `no-unused-vars` | warn | ✓ Resolved — Batch 3 |
| `components/Shared/MaintenanceScreen.jsx` | 22 | 1 | `react/no-unescaped-entities` | error | ✓ Resolved — Batch 5 |
| `components/Support/FAQSection.jsx` | 13 | 1 | `no-unused-vars` | warn | ✓ Resolved — Batch 3 |
| `hooks/useBackendHealth.js` | 96 | 1 | `react-hooks/exhaustive-deps` | warn | ✓ Resolved — Step J-2 |
| `hooks/useFeatureFlag.js` | 57 | 1 | `react-hooks/exhaustive-deps` | warn | ✓ Resolved — Step J-2 |
| `hooks/useFeatureFlags.js` | 55 | 1 | `react-hooks/exhaustive-deps` | warn | ✓ Resolved — Step J-2 |
| `tests/bench-equity.test.js` | 90, 92, 112 | 3 | `no-unused-vars` | warn | ✓ Resolved — Batch 1 |
| `tests/countFromPitches.test.js` | 16 | 1 | `no-unused-vars` | warn | ✓ Resolved — Batch 1 |
| `tests/scoring.test.js` | 26, 27, 31, 33 | 4 | `no-unused-vars` | warn | ✓ Resolved — Batch 1 |
| `utils/analytics.js` | 68 | 1 | `no-empty` | error | ✓ Resolved — Batch 4 |
| `utils/finalizeSchedule.js` | 11 | 1 | `no-empty` | error | ✓ Resolved — Batch 4 |
| `utils/playerMapper.js` | 18, 21, 23, 24 | 4 | `no-unused-vars` | warn | ✓ Resolved — Batch 2 |
| **Total** | | **21** | | | 21 resolved / 0 pending |

**Note — `utils/playerMapper.js` (Batch 2):** The 4 findings were preserved with
`eslint-disable-next-line no-unused-vars -- see TODO(v2.5.x) above` annotations, not
deleted. `inferredSpeed`, `inferredContact`, `inferredPower`, and `inferredDiscipline`
are half-written V1→V2 bridge stubs — deleting them would silently drop planned wiring.
A 6-line `TODO(v2.5.x)` block was added above the stubs as the authoritative deferral
record. See Section 7 for full rationale.

---

### DEFER-TO-V2.5.X (109 findings)

| File | Findings | Reason |
|------|---------:|--------|
| `src/App.jsx` | 102 | Locked. 9,800-line monolith; Phase 4 decomposition is the correct fix surface. Touching App.jsx now creates more drift than it removes. |
| `components/GameDay/LockFlow.jsx` | 3 | `no-dupe-keys` at L130 is the known duplicate-`fontSize` bug documented in `A11Y_AUDIT.md` — requires `<Text>` primitive from Phase 2 (v2.5.x) for a correct fix. Other 2 findings (`no-unused-vars`: `totalSteps`, `gold`) deferred along with the L130 fix to avoid a split-fix on this file. |
| `hooks/useLiveScoring.js` | 4 | Parallel session territory (live scoring hook). Not in scope for UX track. |

---

### DEFER-TO-V2.6.0 — Auth re-skin (5 findings)

All findings are `react/no-unescaped-entities` — literal apostrophes in user-facing strings. Cosmetically correct in the UI today. Auth component re-skin is Phase 5 (v2.7.0); these are deferred to that phase so they are fixed once as part of the full Auth surface pass.

| File | Findings | Rule |
|------|---------:|------|
| `components/Auth/LoginScreen.jsx` | 2 | `react/no-unescaped-entities` |
| `components/Auth/PendingApprovalScreen.jsx` | 2 | `react/no-unescaped-entities` |
| `components/Auth/RequestAccessScreen.jsx` | 1 | `react/no-unescaped-entities` |

---

### DEFER-TO-PARALLEL-SESSIONS (9 findings)

| File | Findings | Reason |
|------|---------:|--------|
| `components/ScoringMode/LiveScoringPanel.jsx` | 5 | Locked — ScoringMode/* parallel session territory |
| `components/ScoringMode/ScoringModeEntry.jsx` | 2 | Locked — ScoringMode/* parallel session territory |
| `components/game-mode/GameModeScreen.jsx` | 1 | Locked — game-mode/* parallel session territory |
| `components/game-mode/InningModal.jsx` | 1 | Locked — game-mode/* parallel session territory |

---

## 4. Known Exceptions / Tech Debt

**`LockFlow.jsx:130` — `no-dupe-keys: Duplicate key 'fontSize'`**  
This error fires on every lint run and will continue to do so until the `<Text>` primitive ships in v2.5.x. It is not a lint configuration problem — the duplicate key is real. Documented in `docs/product/A11Y_AUDIT.md` as a deferred finding. Treat as a known exception when reading lint output during Phase 1b and beyond.

**`DefenseDiamond.jsx:29` — `no-unused-vars: 'navy'`** ✓ Resolved — Step J-1 Batch 3  
Orphaned by the Phase 1a F7 fix. The F7 migration replaced all pill-button uses of the local `var navy = "#0f1f3d"` with `tokens.color.brand.navy` (lines 234–251) but left the now-dead declaration at line 29. Surfaced by this lint baseline. Resolved in Step J-1 Batch 3 as a Phase 1a F7 cleanup follow-up — the declaration was deleted (single-line removal, zero behavior change).

---

## 5. Step J Scope Preview

Ordered by file path. Fix shapes reflect what was actually applied in Step J-1 (Batches 1–5).
Hook findings remain as specifications for Step J-2.

| File | Line(s) | Finding | Fix shape | Status |
|------|---------|---------|-----------|--------|
| `components/GameDay/DefenseDiamond.jsx` | 29 | `'navy'` unused — orphaned by F7 token migration | Deleted line 29 (`var navy = "#0f1f3d"`) | ✓ Done |
| `components/Shared/ErrorBoundary.jsx` | 43 | `'prev'` param unused in `setState` callback | `eslint-disable-next-line no-unused-vars` with rationale comment — functional updater pattern preserved (signals React concurrency intent even when `prev` is unused) | ✓ Done |
| `components/Shared/MaintenanceScreen.jsx` | 22 | Literal `'` in JSX string | Replaced straight apostrophe (U+0027) with typographic curly apostrophe `'` (U+2019) — no HTML entity needed, correct for user-facing copy | ✓ Done |
| `components/Support/FAQSection.jsx` | 13 | `'S'` unused prop in destructure | Removed `S` from props destructure and JSDoc — component uses only `C` (color constants); `S` was never wired in | ✓ Done |
| `hooks/useBackendHealth.js` | 96 | Missing deps: `check`, `setCheckingVisible`, `setStatus` | Read hook, confirm intent; add missing deps or `// eslint-disable-next-line` with rationale | Pending J-2 |
| `hooks/useFeatureFlag.js` | 57 | Missing deps: `setEnabled`, `setLoading` | `useState` setters are stable — add to dep array (harmless) or `eslint-disable` with note | Pending J-2 |
| `hooks/useFeatureFlags.js` | 55 | Missing deps: `setFlags`, `setLoading` | Same pattern as `useFeatureFlag.js` | Pending J-2 |
| `tests/bench-equity.test.js` | 90, 92, 112 | `name` (×2), `i` unused in loop destructuring | Removed unused destructured variables from test helpers | ✓ Done |
| `tests/countFromPitches.test.js` | 16 | `CONTACT` unused | Removed unused named constant | ✓ Done |
| `tests/scoring.test.js` | 26, 27, 31, 33 | 4 unused function imports | Removed 4 unused named imports; header comment rewritten as `TODO(v2.5.x)` noting missing test coverage | ✓ Done |
| `utils/analytics.js` | 68 | Empty block statement | Renamed `e` → `_`, added rationale comment: analytics failure must not crash the app | ✓ Done |
| `utils/finalizeSchedule.js` | 11 | Empty block statement | Renamed `e` → `_`, added rationale comment: quota or blocked storage; primary persistence is Supabase | ✓ Done |
| `utils/playerMapper.js` | 18, 21, 23, 24 | 4 unused `inferred*` vars | Preserved with `eslint-disable-next-line` + 6-line `TODO(v2.5.x)` block — half-written V1→V2 bridge stubs, not dead code | ✓ Done |

---

## 6. Final Tally

### Baseline (Step H — 2026-05-02)

| Bucket | Files | Findings |
|--------|------:|---------:|
| Fix-now (Step J) | 13 | 21 |
| Defer-to-v2.5.x | 3 | 109 |
| Defer-to-v2.6.0 (Auth) | 3 | 5 |
| Defer-to-parallel-sessions | 4 | 9 |
| **Total** | **23** | **144** |

Reconciliation: 21 + 109 + 5 + 9 = **144** ✓ matches baseline.

### After Step J-1 (2026-05-02 — commit 18b984a)

| Bucket | Findings | Notes |
|--------|--------:|-------|
| Resolved — Step J-1 (Batches 1–5) | 18 | Mechanical fixes — zero behavior change |
| Fix-now pending — Step J-2 | 3 | hook `exhaustive-deps` (useBackendHealth, useFeatureFlag, useFeatureFlags) |
| Defer-to-v2.5.x | 109 | Unchanged |
| Defer-to-v2.6.0 (Auth) | 5 | Unchanged |
| Defer-to-parallel-sessions | 9 | Unchanged |
| **Outstanding** | **126** | 3 + 109 + 5 + 9 = **126** ✓ matches `npm run lint` |

### After Step J-2 (2026-05-02 — commit [step-j2-commit])

| Bucket | Findings | Notes |
|--------|--------:|-------|
| Resolved — Step J-1 (Batches 1–5) | 18 | Mechanical fixes — zero behavior change |
| Resolved — Step J-2 (3 hooks) | 3 | exhaustive-deps annotations — zero behavior change |
| Defer-to-v2.5.x | 109 | Unchanged |
| Defer-to-v2.6.0 (Auth) | 5 | Unchanged |
| Defer-to-parallel-sessions | 9 | Unchanged |
| **Outstanding** | **123** | 109 + 5 + 9 = **123** ✓ matches `npm run lint` |

---

## 7. Step J-1 Observations

**Both no-empty catches diagnosed as intentional swallows**  
`analytics.js:68` and `finalizeSchedule.js:11` both contain the fire-and-forget catch
pattern: suppress exceptions to prevent app crashes, don't log them. Neither warranted
a `console.warn` — the swallow is correct and intentional. Documented with rationale
comments. This is a codebase quality marker: the author made deliberate choices here;
they just weren't annotated.

**F7 cleanup miss caught by lint retroactively**  
`DefenseDiamond.jsx:29` — `var navy = "#0f1f3d"` — was orphaned when the Phase 1a F7
token migration replaced all uses with `tokens.color.brand.navy` but left the
declaration behind. The cleanup wasn't caught during F7 review — diff attention was on
the inning row changes and the recon's claim about other uses was trusted. The lint
pipeline surfaced this on day one.

**playerMapper.js: 4 half-written V1→V2 mapping stubs preserved**  
`inferredSpeed`, `inferredContact`, `inferredPower`, `inferredDiscipline` are computed
from V1 skill tags but not applied in the return object. These are not dead code — they
are half-written V1→V2 bridge stubs encoding real intent. Deleting them would silently
drop planned V2 fallback wiring. Preserved with
`eslint-disable-next-line no-unused-vars -- see TODO(v2.5.x) above` and a 6-line TODO
block. The `TODO(v2.5.x)` markers in `playerMapper.js` are the authoritative deferral
record.

## Step J-2 Observations

Three hook exhaustive-deps findings, three distinct patterns. Each was a legitimate
intentional omission with a different rationale:

- **useBackendHealth.js** (`mount-only effect:`): `[]` is defensive. `check()` is
  re-created fresh on every render but closes over only stable values (useState setters,
  refs, module constants). Adding it to deps causes infinite re-execution.
- **useFeatureFlag.js** (`stable-setter deps:`): Dep array correctly captures
  `[flagName, teamId]`. The flagged setters (`setEnabled`, `setLoading`) are stable per
  React's useState contract; lint flagged them mechanically.
- **useFeatureFlags.js** (`mount-only no-varying-deps:`): Hook takes zero parameters.
  `[]` is the only semantically correct choice; the flagged setters are stable.

Pattern-name distinctions are deliberately specific. None of the three was a real bug;
the pipeline correctly raised them for review and review confirmed intentionality.
