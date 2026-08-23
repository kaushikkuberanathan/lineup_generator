# Story 133 slices 5-13 — sandbox progress log

Companion doc to `docs/product/STORY133_SANDBOX_HANDOFF.md`. One checkpoint
section per merged slice, appended in order. Same evidentiary bar as the
real slice 3/4 checkpoints on `develop` — computed values quoted exactly,
not "looks right." Nothing here has reached `develop`/`main`; all of it
lives on `feature/story133-slices5-13-sandbox`, for KK's review.

---

## Slice 5 — `GameModeScreen.jsx`

**Branch:** `feature/story133-slice5-gamemodescreen-token-migration`
(forked from `feature/story133-slices5-13-sandbox` @ `6a81cd5`)

**PR:** [#749](https://github.com/kaushikkuberanathan/lineup_generator/pull/749),
base = `feature/story133-slices5-13-sandbox`, labels `priority:p2` /
`type:refactor` / `area:game-mode`.

**Commit:** `ffbf886` — "refactor: migrate GameModeScreen.jsx off literal
colors onto tokens.js" (no closing keyword, per handoff rule).

**Merge:** `2cb34a7`, genuine 2-parent merge —
`git show -s --format="%H %P" origin/feature/story133-slices5-13-sandbox`
→ `2cb34a77153a4be48c6c6566ea2660d7e9a3d5d8 6a81cd56eeca4ce1ae3c05c0e014f004b23e6bb4 ffbf88618e10d1d75fb0282f6f6e48af76d88540`
(2 parents, not squashed).

### Scope discrepancy vs. the handoff doc

The scope table (both `STORY133_SANDBOX_HANDOFF.md` and
`STORY133_GAMEDAY_TOKEN_MIGRATION_HANDOFF.md`) lists 33 occurrences for
this file. The actual inventory —
`grep -noE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)" GameModeScreen.jsx | wc -l`
— returned **51**. Logged per the escalation policy ("a component turning
out different than the doc described" → keep going, log it, move on). All
51 were migrated; post-migration grep on the file returns empty.

### Reachability

Confirmed live, not dead code: `grep -rln "GameModeScreen" frontend/src
--include="*.jsx"` shows it's imported by `App.jsx` (3 "Game Mode" buttons
on ready team cards, per the handoff doc's own note) and has its own
pre-existing test file, `GameModeScreen.test.jsx` (real render, real wired
handlers — not a stub-callback harness).

### Token mapping decisions

**Reused existing tokens (value + role both matched):**

| Literal | Reused token | Role match reasoning |
|---|---|---|
| `#0b1524` (shell bg, half-inning pill wrapper gradient, gradient end stop) | `gameDay.surface.shell` | Exact byte match; `gameDay.surface.shell`'s own doc comment says "full-screen game-day shell across game-mode + ScoringMode" — literally this component's role. |
| `#0f1f3d` (top-bar gradient start, active-pill bg, gold-bg text color) | `brand.navy` | Exact match; `tokens.js`'s own comment on `surface.dark` (byte-identical to `gameDay.surface.shell`) cites "Game Mode header gradient" as provenance — this file is plausibly where that value was originally audited from. |
| `#f5c842` (inning number, resumed label, active-pill states, advance-button accent) | `brand.gold` | Exact match, role = "primary accent, badges, CTAs" per its own doc comment — same abstract role here. |
| `rgba(255,255,255,0.08)` (top-bar border, reset-button bg) | `overlay.whiteFaint` | Exact match; doc comment already says "32x — lighten elements on dark surfaces" — explicitly a dark-surface-safe token, not a light-surface alias. |
| `rgba(200,16,46,0.15)` (exit-button bg) | `overlay.redFaint` | Exact match; doc comment "brand.red 0.15 ... bg" — same abstract role (red-tinted alert background), different component but same semantic use. |
| `#475569` (eyebrow labels, muted pill text) | `gameDay.text.caption` | Exact match; doc comment "low-emphasis section eyebrow" — this literally IS an eyebrow/caption label here. |
| `#94a3b8` (resume-banner detail text) | `gameDay.text.secondary` | Exact match; doc comment "mid-emphasis" — matches role. |
| `#64748b` (ON DEFENSE badge text) | `gameDay.text.muted` | Exact match; doc comment "subdued supporting text shared across both game-day tracks" — direct fit. |
| `#e2e8f0` (reset-button icon color) | `gameDay.text.label` | Exact match; already part of the gameDay dark-surface family (not a light-surface alias). |
| `#ffffff` / `#fff` (toast text, Out Tonight label + chip text) | `gameDay.text.primary` | Exact match; doc comment "highest emphasis" — generic opaque-white-on-dark role, used identically in all 3 call sites. |
| `#dc2626` (Out Tonight strip bg) | `status.error` | Exact match to the app-wide error/alert semantic color; genuinely the same semantic use (an alert strip), not a role mismatch. |

**Minted new tokens** (no existing value+role match, or value matched but
role didn't — mirroring slice 4's QuickSwap precedent of minting rather
than cross-wiring an unrelated component's namespace):

- `gameDay.status.success` (`#22c55e`) — shared within this file (3
  occurrences: saved-flash text, defense-done check, batting-done check).
  Distinct in value from the global `status.success` (`#27AE60`) —
  consistent with the whole `gameDay` scale being audited separately from
  the light-surface scales per the namespace's own top-of-block comment.
- `gameDay.border.hairline` (`rgba(255,255,255,0.12)`) — shared within
  this file (3 occurrences: half-inning pill border, the divider between
  its two halves, ON DEFENSE badge border). Kept as a shared `gameDay.*`
  token rather than component-scoped because it's a generic chrome-border
  role likely to recur in `InningModal.jsx` (slice 6, same visual
  language, not yet started).
- `gameDay.gameModeScreen.*` — component-scoped sub-namespace, one-off
  values with no reusable role elsewhere, same pattern as
  `gameDay.quickSwap.*` from slice 4:
  - `orientationHint.{background,border,shadow}` — rotate-device toast.
    `background` (`#d97706`) has no existing match (distinct from
    `status.warning` `#D4A017`). `border` (`rgba(255,255,255,0.25)`)
    byte-matches `overlay.whiteMedium` but that token's documented role is
    dim version-chip *text* on `MaintenanceScreen`, not a border — kept
    separate per the no-silent-alias rule. `shadow`
    (`rgba(0,0,0,0.55)`) has no match anywhere.
  - `exitButton.{border,text}` — `border` (`rgba(200,16,46,0.6)`) sits
    between the existing `overlay.redFaint` (0.15) and `redStrong` (0.35)
    tiers, no exact match. `text` (`#fca5a5`, red-300) has no match.
  - `resetButton.border` (`rgba(255,255,255,0.3)`) — no existing match.
  - `advanceButton.{mutedBackground,pendingBackground,pendingBorder}` —
    none of the three (`rgba(255,255,255,0.06)`,
    `rgba(245,200,66,0.18)`, `rgba(245,200,66,0.3)`) match an existing
    token exactly.
  - `resumeBanner.{background,border}` — `background`
    (`rgba(245,200,66,0.10)`) byte-matches
    `gameDay.quickSwap.currentRowBackground` exactly, but kept as its own
    key rather than referencing QuickSwap's namespace from an unrelated
    component (no structural relationship between the two, would read as
    a confusing cross-component dependency). `border`
    (`rgba(245,200,66,0.25)`) has no existing match.
  - `onDefenseBadge.background` (`rgba(11,21,36,0.75)`) — `rgb(11,21,36)`
    is byte-identical to `gameDay.surface.shell` (`#0B1524`) at 0.75
    alpha, but kept as its own token since this is a translucent badge
    overlay layered on top of the (opaque) shell, a distinct usage from
    the shell background itself.
  - `outTonightChip.background` (`rgba(0,0,0,0.25)`) — no existing match.
  - `battingFooter.activeBorder` (`rgba(245,200,66,0.5)`) — no existing
    match.

### Verification

- `grep -oE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)" frontend/src/components/game-mode/GameModeScreen.jsx`
  → empty (zero literals remain).
- `cd frontend && npm run build` → clean, no errors, no new warnings.
- `npx vitest run src/components/game-mode/ src/tests/theme.tokens.test.js --no-file-parallelism`
  → **114/114 passing** (6 test files), matching the slice-3 baseline the
  handoff doc cites.
- **Real-DOM computed-style verification** (RTL, real component render,
  real wired handlers per the auth-boundary rule — not a no-op-stub
  harness): rendered `GameModeScreen` with a fixture roster/grid/props via
  a throwaway test file (written, run, then deleted — not committed),
  read back `getComputedStyle(...)` on six live DOM nodes:

  | Element | Computed value | Expected token | Match |
  |---|---|---|---|
  | Shell root `background-color` | `rgb(11, 21, 36)` | `gameDay.surface.shell` = `#0B1524` | exact |
  | Exit button `background-color` | `rgba(200, 16, 46, 0.15)` | `overlay.redFaint` | exact |
  | Exit button `color` | `rgb(252, 165, 165)` | `gameDay.gameModeScreen.exitButton.text` = `#fca5a5` | exact |
  | "Inning 3" label `color` | `rgb(245, 200, 66)` | `brand.gold` = `#F5C842` | exact |
  | Out Tonight strip `background-color` | `rgb(220, 38, 38)` | `status.error` = `#DC2626` | exact |
  | Out Tonight chip `background-color` | `rgba(0, 0, 0, 0.25)` | `gameDay.gameModeScreen.outTonightChip.background` | exact |
  | Half-inning "Switch to defense" button (active) `background-color` | `rgb(15, 31, 61)` | `brand.navy` = `#0F1F3D` | exact |
  | Same button `color` | `rgb(245, 200, 66)` | `brand.gold` = `#F5C842` | exact |
  | Half-inning pill wrapper `background` | `linear-gradient(180deg, rgb(11, 21, 36), rgb(11, 21, 36))` | `gameDay.surface.shell` × 2 | exact |
  | Half-inning pill outer `border` | `rgba(255, 255, 255, 0.12)` | `gameDay.border.hairline` | exact |

  All computed values are byte-exact matches to their token's source hex/
  rgba value (converted to the browser's `rgb()`/`rgba()` computed-style
  form) — confirms zero visual regression from the migration.

### What wasn't independently re-verified

Every occurrence not listed in the computed-style table above was verified
only via the grep-empty check (zero literals remain) plus code review of
the 1:1 literal→token substitution — not via an additional DOM read. Given
the substitution was mechanical (same value, same position in the style
object, only the source changed from a literal string to a token
reference) and the build/test suite is green, this is consistent with the
byte-preserving-mint guarantee, but flagging it plainly rather than
implying every single one of the 51 was independently DOM-verified.
