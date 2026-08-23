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

---

## Slice 6 — `InningModal.jsx`

**Branch:** `feature/story133-slice6-inningmodal-token-migration`
(forked from `feature/story133-slices5-13-sandbox` @ `fe56c7b`)

**PR:** [#750](https://github.com/kaushikkuberanathan/lineup_generator/pull/750),
base = `feature/story133-slices5-13-sandbox`, labels `priority:p2` /
`type:refactor` / `area:game-mode`. Opened and merged via `gh` CLI —
the GitHub MCP integration's `create_pull_request` and
`merge_pull_request` calls both returned `403 Resource not accessible by
integration`, same class of restriction the handoff doc already flagged
for comment-posting on #698. `gh` CLI (already authenticated as
`kaushikkuberanathan`) worked for both without issue.

**Commit:** `338b631` — "refactor: migrate InningModal.jsx off literal
colors onto tokens.js" (no closing keyword, per handoff rule).

**Merge:** `a74fdc2`, genuine 2-parent merge —
`git show -s --format="%H %P" origin/feature/story133-slices5-13-sandbox`
→ `a74fdc2e6a814cbbcd20a5997aa5255e34ad6b3f fe56c7be09554679618b715c595a8ea8d2dac3cd 338b631f5585915f1efa5b73318779df6e739371`
(2 parents — `fe56c7b` the prior sandbox tip, `338b631` this slice's
commit — not squashed).

### Scope discrepancy vs. the handoff doc

The scope table (both `STORY133_SANDBOX_HANDOFF.md` and
`STORY133_GAMEDAY_TOKEN_MIGRATION_HANDOFF.md`) lists 45 occurrences for
this file. The actual inventory —
`grep -noE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)" InningModal.jsx | wc -l`
— returned **65**. Logged per the escalation policy, same pattern slice 5
hit (its own doc count was also low, 33 vs. 51 actual). All 65 were
migrated; post-migration grep on the file returns empty.

### Reachability

Confirmed live, not dead code: `grep -rln "InningModal" frontend/src
--include="*.jsx"` shows it's imported by `GameModeScreen.jsx` (the
inning-transition overlay) and referenced in `GameModeScreen.test.jsx`.
No dedicated `InningModal.test.jsx` exists; its behavior is exercised
indirectly through the `game-mode/` suite (114/114, see Verification
below) plus the throwaway RTL harness described there.

### Token mapping decisions

**Reused existing tokens (value + role both matched):**

| Literal | Reused token | Role match reasoning |
|---|---|---|
| `#e05c2a`, `#7f3f3f`, `#2471a3`, `#2980b9`, `#6c3483`, `#8e44ad` (SS), `#1e8449`, `#8e44ad` (RC), `#239b56` (9 of `POS_COLORS`'s 11 entries) | `color.position.{P,C,'1B','2B','3B',SS,LF,RC,RF}` | Exact byte matches to the shared, app-wide position-color palette (already reused this way by QuickSwap.jsx's own `POS_COLORS`, slice 4's precedent). Same abstract role: a position-abbreviation → swatch-color lookup, not a component-local concern. |
| `rgba(5,10,25,0.97)` (full-screen root backdrop) | `overlay.backdrop` | Exact match; doc comment "modal/bottom-sheet near-opaque scrim" — this component literally is that modal. |
| `#0b1524` (header gradient end stop) | `gameDay.surface.shell` | Exact match, same as slice 5's reuse — "full-screen game-day shell across game-mode + ScoringMode." |
| `rgba(255,255,255,0.08)` (header border, hand-badge bg, bench-chip border, footer top border; 4 sites) | `overlay.whiteFaint` | Exact match, dark-surface-safe per its own doc comment. |
| `rgba(255,255,255,0.15)` (Cancel button border) | `overlay.whiteLight` | Exact match; "on-dark borders, highlights." |
| `rgba(245,200,66,0.12)` (batting-card header bg) | `overlay.goldTint` | Exact match; a fixed alpha-blended rgba literal applied directly as a background-color (not a computed blend), so reuse is safe regardless of the light/dark-surface distinction that governs solid text/border tokens. |
| `#f5c842` (batting-card header text, Now Batting label + name-badge text, Start Batting button bg; 4 sites) | `brand.gold` | Exact match, same primary-accent role throughout. |
| `#0f1f3d` (Start/Take-the-Field button text; 2 sites) | `brand.navy` | Exact match. |
| `#64748b` (6 sites: header eyebrow non-a11y, On Deck label, hand-badge text, In Hole name, bench-chip text non-a11y) | `gameDay.text.muted` | Exact match, "subdued supporting text." |
| `#94a3b8` (7 sites: header subtext a11y, onDeck name, restBatters/bench a11y variants, Cancel/Exit button text) | `gameDay.text.secondary` | Exact match, "mid-emphasis." |
| `#e2e8f0` (2 sites: last-inning body text a11y, field-player name text) | `gameDay.text.label` | Exact match. |
| `#475569` (4 of 5 sites: last-inning body non-a11y, In Hole label, restBatters/bench text non-a11y — excludes `POS_COLORS.Bench`, see below) | `gameDay.text.caption` | Exact match, "low-emphasis section eyebrow" — same role as these call sites. |

**Minted new tokens** (`gameDay.inningModal.*`, mirroring the
`gameModeScreen.*`/`quickSwap.*` component-scoped precedent):

- `posColors.lc` (`#27ae60`) — **genuine pre-existing inconsistency,
  not introduced by this migration.** `POS_COLORS.LC` in this file is
  `#27ae60` (a green), but the shared `color.position.LC` token is
  `#2980B9` (the blue also used for 2B). Aliasing to `color.position.LC`
  would have silently changed this file's rendered LC badge color from
  green to blue — a real visual regression the byte-preserving-mint rule
  forbids. Preserved exactly as-is; flagged here for KK rather than
  "corrected."
- `posColors.benchUnused` (`#475569`) — `POS_COLORS.Bench` here diverges
  from `color.position.Bench` (`#555555`) too, but **confirmed dead**:
  `nextAssignments.filter(a => a.pos !== "Bench")` runs before
  `fieldPlayers` is ever indexed into `POS_COLORS`, so this value is never
  read at runtime. Byte-matches `gameDay.quickSwap.position.bench`
  exactly, but kept as its own key per the no-cross-component-alias rule
  (same reasoning as slice 5's `resumeBanner` note) — aliasing a live
  QuickSwap token to a confirmed-dead InningModal code path would also be
  a misleading dependency either way.
- `posColors.fallback` (`#555555`) — `POS_COLORS[pos] || "#555"` lookup-miss
  default. Source was 3-digit `#555` shorthand, normalized to 6-digit here
  (identical computed color, not a visual change). Byte-matches
  `color.position.Bench` and `gameDay.quickSwap.position.fallback`; kept
  separate for the same cross-component reason as `benchUnused` above.
- `header.gradientStart` (`#0f1a2e`) — header gradient's top stop; no
  existing match anywhere in `tokens.js`.
- `header.eyebrowTextA11y` (`#cbd5e1`, slate-300) — a11y-mode
  high-contrast header eyebrow color (`ACCESSIBILITY_V1` flag on); no
  existing match.
- `emphasisText` (`#f1f5f9`, slate-100) — highest-emphasis text distinct
  from `gameDay.text.primary` (`#FFFFFF`); shared by the modal title and
  the lead-off batter name (2 sites), no existing match.
- `defenseAccent` (`#4ade80`, green-400) — defense-half accent color
  shared by the positions-card eyebrow and the "Take the Field" button bg
  (2 sites); distinct from `gameDay.status.success` (`#22c55e`, slice 5),
  no existing match.
- `battingCard.{border,background,headerBorder,handBadgeBackground}` —
  gold-tinted card chrome (`rgba(245,200,66,{0.25,0.05,0.15,0.2})`); none
  match an existing token exactly (`headerBackground` is the one member
  of this family that did match — `overlay.goldTint` — and was reused
  directly instead of minted, see table above).
- `defenseCard.{border,background,headerBackground,headerBorder}` —
  green-tinted card chrome (`rgba(74,222,128,{0.25,0.04,0.10,0.15})`),
  the defense-card structural mirror of `battingCard` above; no existing
  matches.
- `divider` (`rgba(255,255,255,0.06)`) — shared section-divider
  border-top, 2 call sites (restBatters row, bench row). No existing
  0.06-opacity white token at top level.
- `rowBackground` (`rgba(255,255,255,0.04)`) — shared subtle-wash
  row/chip background, 2 call sites (restBatters chip, field-player row).
- `benchChip.background` (`rgba(255,255,255,0.05)`) — bench-player chip
  bg; border on the same chip reuses `overlay.whiteFaint` directly (exact
  match, see table above).
- `exitButton.background` (`#334155`) — "Exit Game Mode" button
  background (end-of-game state). Byte-matches `gameDay.text.faint` and
  `gameDay.quickSwap.position.unassigned`, but neither role fits (this is
  a solid button background, not text or a position swatch) — minted
  separately per the no-silent-alias-by-value-only rule.

### Verification

- `grep -oE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)"
  frontend/src/components/game-mode/InningModal.jsx` → empty (zero
  literals remain).
- `cd frontend && npm run build` → clean, no errors, no new warnings.
- `npx vitest run src/components/game-mode/ src/tests/theme.tokens.test.js --no-file-parallelism`
  → **114/114 passing** (6 test files), matching the slice-3/5 baseline.
- **Real-DOM computed-style verification** (RTL, real component render,
  real wired `onConfirm`/`onCancel` handlers per the auth-boundary rule —
  clicking Start Batting/Take the Field/Cancel/Exit and asserting the
  callback was actually invoked with the right argument, not a no-op-stub
  harness): rendered `InningModal` with a 5-player fixture roster/grid
  (deliberately including a player whose next-inning position is `LC`,
  to exercise the divergent-value token) via a throwaway test file
  (written, run, then deleted — not committed), read back
  `getComputedStyle(...)` on the live DOM:

  | Element | Computed value | Expected token | Match |
  |---|---|---|---|
  | Root backdrop `background-color` | `rgba(5, 10, 25, 0.97)` | `overlay.backdrop` | exact |
  | Batting-card header `background-color` | `rgba(245, 200, 66, 0.12)` | `overlay.goldTint` | exact |
  | Batting-card header `color` | `rgb(245, 200, 66)` | `brand.gold` = `#F5C842` | exact |
  | Lead-off batter name `color` | `rgb(241, 245, 249)` | `gameDay.inningModal.emphasisText` = `#f1f5f9` | exact |
  | SS position badge `color`/`border-left-color` | `rgb(142, 68, 173)` | `color.position.SS` = `#8e44ad` | exact |
  | LC position badge `color`/`border-left-color` | `rgb(39, 174, 96)` | `gameDay.inningModal.posColors.lc` = `#27ae60` | exact — confirms the divergent value was preserved, not silently corrected to `color.position.LC`'s blue (`rgb(41, 128, 185)`) |
  | Defense-card header `background-color` | `rgba(74, 222, 128, 0.1)` | `gameDay.inningModal.defenseCard.headerBackground` | exact |
  | Defense-card header `color` | `rgb(74, 222, 128)` | `gameDay.inningModal.defenseAccent` = `#4ade80` | exact |
  | Bench chip `background-color` | `rgba(255, 255, 255, 0.05)` | `gameDay.inningModal.benchChip.background` | exact |
  | Bench chip `border-color` | `rgba(255, 255, 255, 0.08)` | `overlay.whiteFaint` | exact |
  | "Start Batting" button `background-color` | `rgb(245, 200, 66)` | `brand.gold` | exact |
  | "Start Batting" button `color` | `rgb(15, 31, 61)` | `brand.navy` = `#0F1F3D` | exact |
  | "Take the Field" button `background-color` | `rgb(74, 222, 128)` | `gameDay.inningModal.defenseAccent` | exact |
  | Cancel button `border-color` | `rgba(255, 255, 255, 0.15)` | `overlay.whiteLight` | exact |
  | Cancel button `color` | `rgb(148, 163, 184)` | `gameDay.text.secondary` = `#94A3B8` | exact |
  | "Exit Game Mode" button `background-color` (last-inning state) | `rgb(51, 65, 85)` | `gameDay.inningModal.exitButton.background` = `#334155` | exact |
  | "Exit Game Mode" button `color` | `rgb(148, 163, 184)` | `gameDay.text.secondary` | exact |

  All computed values are byte-exact matches to their token's source
  hex/rgba value. `fireEvent.click` on Start Batting/Take the
  Field/Cancel/Exit each asserted the real `onConfirm`/`onCancel` prop was
  called with the correct argument (`'batting'`/`'defense'`/nothing/`null`
  respectively) — real interaction wiring, not just appearance.

### What wasn't independently re-verified

Every occurrence not listed in the computed-style table above (roughly
half of the 65 — mostly the remaining `POS_COLORS` entries for P/C/1B/
2B/3B/LF/RC/RF/Bench, the header gradient start stop, the a11y-only
color variants, and the restBatters/bench divider and row-background
sites) was verified only via the grep-empty check plus code review of
the 1:1 literal→token substitution, not an additional DOM read. The
substitution was mechanical throughout (same value, same position in the
style object, only the source changed from a literal to a token
reference), and build/test are green, which is consistent with the
byte-preserving guarantee — but flagging plainly that not all 65 were
individually DOM-verified, same disclosure slice 5 made.
