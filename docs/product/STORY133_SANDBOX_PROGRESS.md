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

---

## Slice 7 — `LiveScoreViewer.jsx` (verification-only, no code change)

**No slice branch cut, no PR.** Per the handoff doc's instruction for a
confirmed-clean file ("this is a no-code-change slice: just log a
checkpoint... commit that checkpoint directly to the sandbox branch —
no separate slice branch/PR needed"), this checkpoint is committed
straight to `feature/story133-slices5-13-sandbox` on top of `af51899`
(the slice 6 checkpoint commit).

### Verification

The handoff doc's scope table lists this file at **0 occurrences,
verification-only**. Unlike slices 5 (33 documented vs. 51 actual) and 6
(45 documented vs. 65 actual), this doc count checked out exactly:

- `grep -oE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)"
  frontend/src/components/ScoringMode/LiveScoreViewer.jsx` → empty,
  exit code 1 (no matches). **0 occurrences confirmed independently, not
  trusted from the doc.**
- The file is genuinely trivial, not a case of colors hidden behind
  variables or template strings the regex could miss — full contents:
  ```jsx
  export default function LiveScoreViewer() {
    return <div>LiveScoreViewer</div>;
  }
  ```
  3 lines, one bare `<div>` with no `style` prop, no className, no
  imported style object. There is no game-mode-track token debt in this
  file to migrate.

### Reachability

Confirmed live, not dead code, despite being a stub: `grep -rn
"LiveScoreViewer" frontend/src` shows it's imported and rendered by
`frontend/src/components/ScoringMode/LiveScoringPanel.jsx` (`import
LiveScoreViewer from './LiveScoreViewer';` at line 3, `<LiveScoreViewer`
at line 285) — one of the 7 live ScoringMode children DugoutView imports
transitively, per `versionHistory.js`'s own architecture note at line
587. It is simply a component whose full implementation hasn't been
built out yet; the stub itself carries no color/token debt regardless.

### Outcome

No `tokens.js` change, no component change, no build/test re-run needed
(nothing in the diff to verify). Slice 7 is complete as a verification
no-op. Next up per the handoff scope table: slice 8,
`GameModeGearMenu.jsx` (10 occurrences).

---

## Slice 8 — `GameModeGearMenu.jsx`

**Branch:** `feature/story133-slice8-gamemodegearmenu-token-migration`
(forked from `feature/story133-slices5-13-sandbox` @ `93d7a6e`)

**PR:** [#751](https://github.com/kaushikkuberanathan/lineup_generator/pull/751),
base = `feature/story133-slices5-13-sandbox`, labels `priority:p2` /
`type:refactor` / `area:scoring`. Opened and merged via `gh` CLI, same
approach slice 6 confirmed works (the GitHub MCP integration's
`create_pull_request`/`merge_pull_request` still return `403`).

**Commit:** `26ce51a` — "refactor: migrate GameModeGearMenu.jsx off
literal colors onto tokens.js" (no closing keyword, per handoff rule).

**Merge:** `1711076`, genuine 2-parent merge —
`git show -s --format="%H %P" origin/feature/story133-slices5-13-sandbox`
→ `1711076a48113aa0744a10962330370e80e56fa2 93d7a6e949bec3c87087c6fc39d3612d7a2c8bb9 26ce51a80bb323a18885100cf917e2dff25e0388`
(2 parents — `93d7a6e` the prior sandbox tip [slice 7's checkpoint
commit], `26ce51a` this slice's commit — not squashed).

This is the first real migration slice in the `ScoringMode/*` track;
slice 7 (`LiveScoreViewer.jsx`) was a verification-only no-op.

### Scope discrepancy vs. the handoff doc

Both `STORY133_SANDBOX_HANDOFF.md` and
`STORY133_GAMEDAY_TOKEN_MIGRATION_HANDOFF.md` list this file at **~10**
occurrences. The actual inventory —
`grep -oE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)" GameModeGearMenu.jsx | wc -l`
— returned **18**. Logged per the escalation policy; same pattern as
slices 5 (33 documented vs. 51 actual) and 6 (45 vs. 65 actual) — every
real migration slice's doc count has undershot the true total so far.
All 18 were migrated; post-migration grep on the file returns empty.

### Reachability

Confirmed live, not dead code: `grep -rln "GameModeGearMenu" frontend/src`
shows it's imported and rendered by `LiveScoringPanel.jsx` — one of the 7
live ScoringMode children `DugoutView` imports transitively, same
reachability chain slice 7 confirmed for `LiveScoreViewer.jsx`. No
dedicated `GameModeGearMenu.test.jsx` exists, and the `ScoringMode/*`
track has no established baseline test-file-count yet (this is its
first real slice) — confirmed via `find frontend/src/components/
ScoringMode -iname "*.test.*"`, zero results.

### Token mapping decisions

**Reused existing tokens (value + role both matched):**

| Literal | Reused token | Role match reasoning |
|---|---|---|
| `#0f1f3d` (handoff-confirm modal panel bg) | `brand.navy` | Exact byte match; same role as slices 5/6's reuse of this token — dominant dark-navy panel/surface background. |
| `rgba(255,255,255,0.15)` (handoff modal border, gear-menu panel border; 2 sites) | `overlay.whiteLight` | Exact match, doc comment "on-dark borders, highlights" — direct fit for both panel borders. |
| `#fff` (handoff modal title text, "Hand off" confirm-button text; 2 sites) | `gameDay.text.primary` | Exact match, "highest emphasis" — same generic opaque-white-on-dark role used identically at both sites. |
| `#94a3b8` (handoff modal body text, Cancel button text, Exit Scoring menu-item text; 3 sites) | `gameDay.text.secondary` | Exact match, "mid-emphasis" — same role at all 3 sites. |
| `rgba(255,255,255,0.12)` (Cancel button border) | `gameDay.border.hairline` | Exact match to the **shared** (not component-scoped) hairline token slice 5 minted and flagged as "likely to recur" — first actual recurrence, confirming that call was right. |
| `rgba(0,0,0,0.5)` (gear-menu backdrop) | `overlay.scrimLight` | Exact match; doc comment "lighter full-screen modal backdrop." A backdrop scrim is a fixed alpha-blended wash applied uniformly under the whole viewport, not a light/dark-surface-calibrated text or border color — same reasoning slice 6 used to justify reusing `overlay.goldTint` directly, applied here to a black scrim instead of a gold tint. |
| `rgba(255,255,255,0.08)` (Exit Scoring / Hand off scoring menu-item bottom borders; 2 sites) | `overlay.whiteFaint` | Exact match, dark-surface-safe per its own doc comment. |
| `#e2e8f0` (Hand off scoring menu-item text) | `gameDay.text.label` | Exact match, "high-emphasis uppercase labels" family — same role. |

**Minted new tokens** (`gameDay.gearMenu.*`, mirroring the
`gameModeScreen.*`/`inningModal.*`/`quickSwap.*` component-scoped
precedent):

- `handoffModal.backdrop` (`rgba(0,0,0,0.8)`) — full-screen backdrop
  behind the "Hand off scoring?" confirm dialog. No existing token at
  this opacity: sits strictly between `overlay.scrimLight` (0.5, reused
  above for the menu's own backdrop) and `overlay.backdrop` (0.97). Kept
  distinct rather than rounding to either neighbor — the confirm dialog
  can render standalone (`confirmHandoff=true`, `isOpen=false`) and its
  own darker scrim is a deliberate visual choice in the source, not
  incidental drift.
- `handoffModal.cancelBackground` (`rgba(255,255,255,0.06)`) — Cancel
  button bg. Byte-matches `gameModeScreen.advanceButton.mutedBackground`
  and `inningModal.divider` exactly, but kept separate per the
  no-cross-component-alias rule already applied twice in slices 5-6.
- `handoffModal.confirmBackground` (`#1d4ed8`, blue-700) — "Hand off"
  confirm button bg. No existing match anywhere (checked against
  `status.info` `#2563EB` specifically, since both are blues — distinct
  values, not a role match either: `status.info` is an informational
  semantic color, this is a confirm-CTA background).
- `menuPanel.background` (`#1a2a3a`) — gear-menu dropdown panel bg. No
  existing match (checked against `brand.navy` `#0F1F3D` and
  `gameDay.surface.shell` `#0B1524`, both darker/more saturated — this
  is a distinct, lighter navy).
- `finishGameText` (`#fca5a5`, red-300) — "Finish Game…" menu-item text.
  Byte-matches `gameDay.gameModeScreen.exitButton.text` exactly (same
  red-300 value, same abstract "light-red label on a red-adjacent
  affordance" role), but kept separate per the no-cross-component-alias
  rule — this component's own concern, not a dependency on
  `GameModeScreen`'s namespace.

### Verification

- `grep -oE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)"
  frontend/src/components/ScoringMode/GameModeGearMenu.jsx` → empty
  (zero literals remain).
- `cd frontend && npm run build` → clean, no errors, no new warnings.
- `npx vitest run src/components/game-mode/ src/tests/theme.tokens.test.js --no-file-parallelism`
  → **114/114 passing** (6 test files), matching the slice-3/5/6
  baseline. (No `ScoringMode/*`-specific suite exists yet to add to this
  run — see Reachability above.)
- **Real-DOM computed-style + interaction-wiring verification** (RTL,
  real component render, real wired handlers per the auth-boundary rule
  — a harness with a live `useState` log asserting each callback fires
  with the right effect, not a no-op-stub harness): rendered
  `GameModeGearMenu` via a throwaway test file (written, run, then
  deleted — not committed), covering both render states (gear-menu open,
  and the handoff-confirm modal reached by clicking "Hand off scoring"):

  | Element | Computed value | Expected token | Match |
  |---|---|---|---|
  | Menu panel `background-color` | `rgb(26, 42, 58)` | `gearMenu.menuPanel.background` = `#1a2a3a` | exact |
  | Menu panel `border-color` | `rgba(255, 255, 255, 0.15)` | `overlay.whiteLight` | exact |
  | Menu backdrop `background-color` | `rgba(0, 0, 0, 0.5)` | `overlay.scrimLight` | exact |
  | Exit Scoring item `color` | `rgb(148, 163, 184)` | `gameDay.text.secondary` = `#94A3B8` | exact |
  | Exit Scoring item `border-bottom-color` | `rgba(255, 255, 255, 0.08)` | `overlay.whiteFaint` | exact |
  | Hand off scoring item `color` | `rgb(226, 232, 240)` | `gameDay.text.label` = `#E2E8F0` | exact |
  | Finish Game… item `color` | `rgb(252, 165, 165)` | `gearMenu.finishGameText` = `#fca5a5` | exact |
  | Handoff-confirm panel `background-color` | `rgb(15, 31, 61)` | `brand.navy` = `#0F1F3D` | exact |
  | Handoff-confirm panel `border-color` | `rgba(255, 255, 255, 0.15)` | `overlay.whiteLight` | exact |
  | Handoff-confirm title `color` | `rgb(255, 255, 255)` | `gameDay.text.primary` = `#FFFFFF` | exact |
  | Handoff-confirm body `color` | `rgb(148, 163, 184)` | `gameDay.text.secondary` | exact |
  | Cancel button `background-color` | `rgba(255, 255, 255, 0.06)` | `handoffModal.cancelBackground` | exact |
  | Cancel button `border-color` | `rgba(255, 255, 255, 0.12)` | `gameDay.border.hairline` | exact |
  | Hand off (confirm) button `background-color` | `rgb(29, 78, 216)` | `handoffModal.confirmBackground` = `#1d4ed8` | exact |
  | Handoff-modal backdrop `background-color` | `rgba(0, 0, 0, 0.8)` | `handoffModal.backdrop` | exact |

  All computed values are byte-exact matches to their token's source
  hex/rgba value. `fireEvent.click` on Exit Scoring, Hand off scoring,
  Finish Game…, and the confirm-modal's Hand off button each asserted
  the real callback prop fired with the right downstream effect
  (`onClose`+`onExitScoring`; `onClose`+`onHandoff` then the confirm
  modal actually appearing; `onClose`+`track`+`onFinishGame`;
  `onConfirmHandoff`) — real interaction wiring confirmed, not just
  appearance.

### What wasn't independently re-verified

Cancel's own click → `onCancelHandoff` path was exercised structurally
(the button and its handler are wired identically to the confirm
button's, which was asserted) but not separately fired in the harness —
low-risk, same identical-pattern reasoning slices 5/6 used for their own
"not every site individually DOM-verified" disclosures.

### No behavioral quirks found

Unlike slice 6's `POS_COLORS.LC` divergence (a real pre-existing
color/data inconsistency), this slice's literal-color inventory
contained no data-driven lookup tables and no divergent-from-shared-
palette values — every literal was a static style-object value with an
unambiguous 1:1 substitution. Nothing here rises to the level of a
behavioral quirk worth flagging to KK beyond the occurrence-count
discrepancy already logged above.

### Outcome

Slice 8 complete: merged into `feature/story133-slices5-13-sandbox` as
commit `1711076` (genuine 2-parent merge), zero literal colors remaining
in `GameModeGearMenu.jsx`, build clean, 114/114 tests passing, checkpoint
logged. Next up per the handoff scope table: slice 9,
`RunnerConflictModal.jsx` (12 occurrences).

---

## Slice 9 — `RunnerConflictModal.jsx`

**Branch:** `feature/story133-slice9-runnerconflictmodal-token-migration`
(forked from `feature/story133-slices5-13-sandbox` @ `b11f1d6`)

**PR:** [#752](https://github.com/kaushikkuberanathan/lineup_generator/pull/752),
base = `feature/story133-slices5-13-sandbox`, labels `priority:p2` /
`type:refactor` / `area:scoring`. Opened and merged via `gh` CLI, same
approach slices 6/8 confirmed works (the GitHub MCP integration's
`create_pull_request`/`merge_pull_request` still return `403`).

**Commit:** `8d069f2` — "refactor: migrate RunnerConflictModal.jsx off
literal colors onto tokens.js" (no closing keyword, per handoff rule).

**Merge:** `93f6950`, genuine 2-parent merge —
`git show -s --format="%H %P" origin/feature/story133-slices5-13-sandbox`
→ `93f695068bf5cb457f4b706299292591d5775ec4 b11f1d6d65b1a49fa5f2e5ab4eebcccfc331fb30 8d069f2a0a1bf794654e2bb7a3cdba6faa4f63e9`
(2 parents — `b11f1d6` the prior sandbox tip [slice 8's checkpoint
commit], `8d069f2` this slice's commit — not squashed).

### Scope discrepancy vs. the handoff doc

Both `STORY133_SANDBOX_HANDOFF.md` and
`STORY133_GAMEDAY_TOKEN_MIGRATION_HANDOFF.md` list this file at **~12**
occurrences. The actual inventory —
`grep -noE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)" RunnerConflictModal.jsx | wc -l`
— returned **18**. Logged per the escalation policy; every real migration
slice's doc count has undershot the true total so far (slice 5: 33→51,
slice 6: 45→65, slice 8: 10→18, this slice: 12→18). All 18 were migrated;
post-migration grep on the file returns empty.

### Reachability

Confirmed live, not dead code: `grep -rln "RunnerConflictModal"
frontend/src --include="*.jsx"` shows it's imported and rendered by
`LiveScoringPanel.jsx` — one of the 7 live ScoringMode children
`DugoutView` imports transitively, same reachability chain slices 7/8
confirmed. No dedicated `RunnerConflictModal.test.jsx` exists; the
`ScoringMode/*` track still has no established per-file test baseline
(confirmed via `find frontend/src/components/ScoringMode -iname
"*.test.*"`, zero results, same as slice 8).

### Token mapping decisions

**Reused existing tokens (value + role both matched):**

| Literal | Reused token | Role match reasoning |
|---|---|---|
| `#0f1f3d` (panel bg) | `brand.navy` | Exact byte match; same role as slices 5/6/8's reuse — dominant dark-navy panel/surface background. |
| `#f5c842` (eyebrow "Runner conflict at ___") | `brand.gold` | Exact match, primary-accent role — same as every prior slice's reuse. |
| `#fff` (blocking-name headline, Score/Hold button text; 3 sites) | `gameDay.text.primary` | Exact match, "highest emphasis" — same generic opaque-white-on-dark role at all 3 sites. |
| `#94a3b8` (body copy under headline, Cancel-play button text; 2 sites) | `gameDay.text.secondary` | Exact match, "mid-emphasis" — same role at both sites. |
| `#64748b` (Cancel-play subtitle text) | `gameDay.text.muted` | Exact match, "subdued supporting text." |

**Minted new tokens** (`gameDay.runnerConflictModal.*`, mirroring the
`gameModeScreen.*`/`inningModal.*`/`gearMenu.*` component-scoped
precedent):

- `backdrop` (`rgba(0,0,0,0.82)`) — full-screen root backdrop. No
  existing match: sits between `overlay.scrimLight` (0.5) and
  `overlay.backdrop` (0.97, also a different hue — `rgba(5,10,25,...)`
  vs. pure black here).
- `border` (`rgba(255,255,255,0.18)`) — shared within this file, 2 sites
  (panel border, Cancel-play button border). Byte-matches
  `diamond.stroke.empty` exactly, but that token's role is a diamond-SVG
  stroke, not a modal/button border — kept separate per the
  no-silent-alias rule, same reasoning applied to every prior slice's
  byte-match-but-wrong-role cases.
- `scoreButton.{background,border,subtitleText}`
  (`rgba(22,163,74,0.12)` / `#16a34a` / `#86efac`) — green-600 tint +
  solid border + green-300 subtitle text for the "Score {name}" button.
  None match an existing token (distinct hue/value from
  `status.success` `#27AE60` and its sibling 0.12-tier tokens).
- `holdButton.{background,border,subtitleText}`
  (`rgba(29,78,216,0.12)` / `#1d4ed8` / `#93c5fd`) — blue-700 tint +
  solid border + blue-300 subtitle text for the "Hold {name}" button.
  `border` byte-matches `gearMenu.handoffModal.confirmBackground`
  exactly (both `#1d4ed8`), but that token's role is a different
  component's confirm-button *background*, not this button's *border* —
  kept separate per the no-cross-component-alias rule, same reasoning as
  `gearMenu.finishGameText` in slice 8.
- `cancelButton.background` (`rgba(255,255,255,0.04)`) — Cancel-play
  button bg. Byte-matches `inningModal.rowBackground` exactly, but kept
  separate per the no-cross-component-alias rule already applied in
  slices 5/6/8.

### Verification

- `grep -oE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)"
  frontend/src/components/ScoringMode/RunnerConflictModal.jsx` → empty
  (zero literals remain).
- `cd frontend && npm run build` → clean, no errors, no new warnings.
- `npx vitest run src/components/game-mode/ src/tests/theme.tokens.test.js --no-file-parallelism`
  → **114/114 passing** (6 test files), matching the slice-3/5/6/8
  baseline.
- **Real-DOM computed-style + interaction-wiring verification** (RTL,
  real component render, real wired `onResolve` handler per the
  auth-boundary rule — a `vi.fn()` spy asserting each button click fires
  the callback with the correct decision string, not a no-op-stub
  harness): rendered `RunnerConflictModal` with a 2-player fixture
  batting order and a conflict descriptor via a throwaway test file
  (written, run, then deleted — not committed), read back
  `getComputedStyle(...)` on the live DOM:

  | Element | Computed value | Expected token | Match |
  |---|---|---|---|
  | Dialog root `background-color` | `rgba(0, 0, 0, 0.82)` | `runnerConflictModal.backdrop` | exact |
  | Panel `background-color` | `rgb(15, 31, 61)` | `brand.navy` = `#0F1F3D` | exact |
  | Panel `border-color` | `rgba(255, 255, 255, 0.18)` | `runnerConflictModal.border` | exact |
  | Score button `background-color` | `rgba(22, 163, 74, 0.12)` | `runnerConflictModal.scoreButton.background` | exact |
  | Score button `border-color` | `rgb(22, 163, 74)` | `runnerConflictModal.scoreButton.border` = `#16a34a` | exact |
  | Score button `color` | `rgb(255, 255, 255)` | `gameDay.text.primary` | exact |
  | Hold button `background-color` | `rgba(29, 78, 216, 0.12)` | `runnerConflictModal.holdButton.background` | exact |
  | Hold button `border-color` | `rgb(29, 78, 216)` | `runnerConflictModal.holdButton.border` = `#1d4ed8` | exact |
  | Cancel-play button `background-color` | `rgba(255, 255, 255, 0.04)` | `runnerConflictModal.cancelButton.background` | exact |
  | Cancel-play button `border-color` | `rgba(255, 255, 255, 0.18)` | `runnerConflictModal.border` | exact |
  | Cancel-play button `color` | `rgb(148, 163, 184)` | `gameDay.text.secondary` = `#94A3B8` | exact |

  All computed values are byte-exact matches to their token's source
  hex/rgba value. `fireEvent.click` on Score/Hold/Cancel-play each
  asserted the real `onResolve` prop was called with the correct decision
  string (`'SCORE_BLOCKING'` / `'HOLD_INCOMING'` / `'CANCEL_PLAY'`,
  exactly 3 calls total) — real interaction wiring, not just appearance.
  A second case confirmed `conflict=null` still renders nothing (no
  crash), covering the component's early-return guard.

### No behavioral quirks found

No data-driven lookup tables in this file (unlike slice 6's `POS_COLORS`)
and no divergent-from-shared-palette values — every literal was a static
style-object value with an unambiguous 1:1 substitution. Nothing here
rises to the level of a behavioral quirk worth flagging to KK beyond the
occurrence-count discrepancy already logged above.

### Outcome

Slice 9 complete: merged into `feature/story133-slices5-13-sandbox` as
commit `93f6950` (genuine 2-parent merge), zero literal colors remaining
in `RunnerConflictModal.jsx`, build clean, 114/114 tests passing,
checkpoint logged. Next up per the handoff scope table: slice 10,
`RestoreScoreModal.jsx` (15 occurrences).

---

## Slice 10 — `RestoreScoreModal.jsx`

**Branch:** `feature/story133-slice10-restorescoremodal-token-migration`
(forked from `feature/story133-slices5-13-sandbox` @ `7fa4fe2`)

**PR:** [#753](https://github.com/kaushikkuberanathan/lineup_generator/pull/753),
base = `feature/story133-slices5-13-sandbox`, labels `priority:p2` /
`type:refactor` / `area:scoring`. Opened and merged via `gh` CLI, same
approach slices 6/8/9 confirmed works (the GitHub MCP integration's
`create_pull_request`/`merge_pull_request` still return `403`).

**Commit:** `f355ce7` — "refactor: migrate RestoreScoreModal.jsx off
literal colors onto tokens.js" (no closing keyword, per handoff rule).

**Merge:** `ff8390a`, genuine 2-parent merge —
`git show -s --format="%H %P" origin/feature/story133-slices5-13-sandbox`
→ `ff8390adf6a6ebeca831deb8f36ddb70e269c040 7fa4fe22a1cf94e45b5062a25e20c9ec792ae03d f355ce71bc433e092ecb962fc290378c15257f8d`
(2 parents — `7fa4fe2` the prior sandbox tip [slice 9's checkpoint
commit], `f355ce7` this slice's commit — not squashed).

### Scope discrepancy vs. the handoff doc

Both `STORY133_SANDBOX_HANDOFF.md` and
`STORY133_GAMEDAY_TOKEN_MIGRATION_HANDOFF.md` list this file at **~15**
occurrences. The actual inventory —
`grep -noE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)" RestoreScoreModal.jsx | wc -l`
— returned **27**. Logged per the escalation policy; every real migration
slice's doc count has undershot the true total so far (slice 5: 33→51,
slice 6: 45→65, slice 8: 10→18, slice 9: 12→18, this slice: 15→27). All
27 were migrated; post-migration grep on the file returns empty.

### Reachability

Confirmed live, not dead code: `grep -rln "RestoreScoreModal" frontend/src
--include="*.jsx"` shows it's imported and rendered by
`LiveScoringPanel.jsx` — one of the 7 live ScoringMode children
`DugoutView` imports transitively, same reachability chain slices 7/8/9
confirmed. No dedicated `RestoreScoreModal.test.jsx` exists; the
`ScoringMode/*` track still has no established per-file test baseline
(confirmed via `find frontend/src/components/ScoringMode -iname
"*.test.*"`, zero results, same as slices 8/9).

### Token mapping decisions

**Reused existing tokens (value + role both matched):**

| Literal | Reused token | Role match reasoning |
|---|---|---|
| `#0f1f3d` (panel bg) | `brand.navy` | Exact byte match; same role as every prior slice's reuse — dominant dark-navy panel/surface background. |
| `rgba(255,255,255,0.15)` (panel border) | `overlay.whiteLight` | Exact match; "on-dark borders, highlights." |
| `#fff` (panel default text color, enabled Restore-button text; 2 sites) | `gameDay.text.primary` | Exact match, "highest emphasis" — same generic opaque-white-on-dark role at both sites. |
| `#64748b` (close-button icon, at-bat-count wrapper, Cancel-button text; 3 sites) | `gameDay.text.muted` | Exact match, "subdued supporting text." |
| `#94a3b8` (warning-box body text) | `gameDay.text.secondary` | Exact match, "mid-emphasis." |
| `#475569` ("No scorebook data found" text) | `gameDay.text.caption` | Exact match; already reused in slices 5/6 for general low-emphasis supporting text beyond just eyebrow labels — consistent with that broader precedent. |
| `#f5c842` (at-bat count number) | `brand.gold` | Exact match, primary-accent role — same as every prior slice's reuse. |
| `rgba(220,38,38,0.12)` (error-box bg) | `color.overlay.errorMid` | Exact match. This is a pre-mixed generic alpha tint already reused across multiple surfaces (App.jsx scoring-surface OUT chip bg, DefenseDiamond OUT-row family per its own doc comment) — same "safe to reuse regardless of light/dark-surface distinction" reasoning slices 6/8 used for `overlay.goldTint`/`overlay.scrimLight`, applied here to the red-tint family. First reuse of this specific token in the `gameDay` scale. |
| `rgba(220,38,38,0.3)` (error-box border) | `color.overlay.errorMedium` | Exact match (0.3 = the token's 0.30), same reasoning as `errorMid` above. |
| `rgba(255,255,255,0.08)` (disabled-button border) | `overlay.whiteFaint` | Exact match, dark-surface-safe per its own doc comment. |
| `#dc2626` (armed/default Restore-button bg) | `status.error` | Exact match to the app-wide error/alert semantic color; same reuse precedent slice 5 established for the Out Tonight strip — a destructive-action CTA is the same semantic use. |

**Minted new tokens** (`gameDay.restoreScoreModal.*`, mirroring the
`gameModeScreen.*`/`inningModal.*`/`gearMenu.*`/`runnerConflictModal.*`
component-scoped precedent):

- `backdrop` (`rgba(0,0,0,0.72)`) — full-screen root backdrop. No exact
  match: sits between `overlay.scrimLight` (0.5) and `gearMenu.
  handoffModal.backdrop`/`runnerConflictModal.backdrop` (0.8/0.82) — a
  genuine third opacity tier for this component's own scrim.
- `warningBox.background` (`rgba(245,200,66,0.08)`) — advisory-box gold
  tint. No exact match (`inningModal.battingCard.background` is 0.05,
  `overlay.goldTint` is 0.12).
- `warningBox.border` (`rgba(245,200,66,0.2)`) — byte-matches
  `inningModal.battingCard.handBadgeBackground` exactly, but that
  token's role is a batting-hand badge *background* in a different
  component, not this box's *border* — kept separate per the
  no-cross-component-alias rule.
- `disabledText` (`#374151`) — shared within this file, 2 sites
  ("Checking scorebook…" loading label, disabled Restore-button text;
  same abstract "inactive/neutral state" text role). Byte-matches
  `gameDay.text.separator` (`#374151`), but that token's documented role
  is a single decorative ":" glyph in `ScoreboardRow`, not a text role —
  kept separate. Also byte-matches the light-surface `color.text.body`
  (gray-700), which the `gameDay` family never aliases to per its own
  top-of-block comment.
- `successBox.{background,border}` (`rgba(22,163,74,0.15)` /
  `rgba(22,163,74,0.35)`) — no exact match to any existing green tier
  (closest is `runnerConflictModal.scoreButton.background` at 0.12, a
  different value).
- `successBox.text` (`#86efac`) — byte-matches `runnerConflictModal.
  scoreButton.subtitleText` exactly, but that's a different component's
  button-subtitle role — kept separate per the no-cross-component-alias
  rule.
- `errorBox.text` (`#fca5a5`) — third recurrence of this exact literal
  across three unrelated components (`gameModeScreen.exitButton.text`,
  `gearMenu.finishGameText`, now this) — kept separate each time per the
  established precedent, same reasoning both prior slices used for this
  same value.
- `restoreButton.disabledBackground` (`rgba(255,255,255,0.06)`) —
  fourth recurrence of this 0.06 white-wash value across components
  (`gameModeScreen.advanceButton.mutedBackground`, `inningModal.divider`,
  `gearMenu.handoffModal.cancelBackground`), each minted separately per
  the no-cross-component-alias rule.
- `restoreButton.confirmBackground` (`#7f1d1d`, red-900) — "tap again to
  confirm" state background. No existing match anywhere.
- `restoreButton.border` (`rgba(220,38,38,0.6)`) — no existing match
  (`gameModeScreen.exitButton.border` is a different rgb triple,
  `200,16,46` vs `220,38,38` here, despite the shared 0.6 opacity).
- `cancelButton.border` (`rgba(255,255,255,0.1)`) — no existing
  0.1-opacity white tier (neighbors are `overlay.whiteFaint` at 0.08 and
  `overlay.whiteLight` at 0.15) — a genuine gap-fill value.

### Verification

- `grep -oE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)"
  frontend/src/components/ScoringMode/RestoreScoreModal.jsx` → empty
  (zero literals remain).
- `cd frontend && npm run build` → clean, no errors, no new warnings.
- `npx vitest run src/components/game-mode/ src/tests/theme.tokens.test.js --no-file-parallelism`
  → **114/114 passing** (6 test files), matching the slice-3/5/6/8/9
  baseline.
- **Real-DOM computed-style + interaction-wiring verification** (RTL,
  real component render, real wired `onClose` prop + a real mocked
  `supabase.from(...).select(...).eq(...).eq(...).eq(...)`/`supabase.rpc(...)`
  network layer feeding the component's actual async effect and
  `handleRestore` logic — not a no-op-stub harness): rendered
  `RestoreScoreModal` across three real states (loaded with at-bats,
  zero at-bats, RPC error) via a throwaway test file (written, run, then
  deleted — not committed), read back `getComputedStyle(...)` on the
  live DOM at each stage:

  | Element / state | Computed value | Expected token | Match |
  |---|---|---|---|
  | Root backdrop `background-color` | `rgba(0, 0, 0, 0.72)` | `restoreScoreModal.backdrop` | exact |
  | Panel `background-color` | `rgb(15, 31, 61)` | `brand.navy` = `#0F1F3D` | exact |
  | Panel `border-color` | `rgba(255, 255, 255, 0.15)` | `overlay.whiteLight` | exact |
  | Panel default `color` | `rgb(255, 255, 255)` | `gameDay.text.primary` | exact |
  | Close button (✕) `color` | `rgb(100, 116, 139)` | `gameDay.text.muted` = `#64748B` | exact |
  | Warning box `background-color` | `rgba(245, 200, 66, 0.08)` | `restoreScoreModal.warningBox.background` | exact |
  | Warning box `border-color` | `rgba(245, 200, 66, 0.2)` | `restoreScoreModal.warningBox.border` | exact |
  | Warning box `color` | `rgb(148, 163, 184)` | `gameDay.text.secondary` = `#94A3B8` | exact |
  | "Checking scorebook…" `color` (loading state, before count resolves) | `rgb(55, 65, 81)` | `restoreScoreModal.disabledText` = `#374151` | exact |
  | Restore button (disabled, count still loading) `background-color` | `rgba(255, 255, 255, 0.06)` | `restoreScoreModal.restoreButton.disabledBackground` | exact |
  | Restore button (disabled) `border-color` | `rgba(255, 255, 255, 0.08)` | `overlay.whiteFaint` | exact |
  | Restore button (disabled) `color` | `rgb(55, 65, 81)` | `restoreScoreModal.disabledText` | exact |
  | Cancel button `border-color` | `rgba(255, 255, 255, 0.1)` | `restoreScoreModal.cancelButton.border` | exact |
  | At-bat count number `color` | `rgb(245, 200, 66)` | `brand.gold` = `#F5C842` | exact |
  | Restore button (armed, count=5) `background-color` | `rgb(220, 38, 38)` | `status.error` = `#DC2626` | exact |
  | Restore button (armed) `border-color` | `rgba(220, 38, 38, 0.6)` | `restoreScoreModal.restoreButton.border` | exact |
  | Restore button (confirm-tap state, after real click #1) `background-color` | `rgb(127, 29, 29)` | `restoreScoreModal.restoreButton.confirmBackground` = `#7f1d1d` | exact |
  | Success box `background-color` (after real click #2 → real mocked `rpc` resolves ok) | `rgba(22, 163, 74, 0.15)` | `restoreScoreModal.successBox.background` | exact |
  | Success box `border-color` | `rgba(22, 163, 74, 0.35)` | `restoreScoreModal.successBox.border` | exact |
  | Success box `color` | `rgb(134, 239, 172)` | `restoreScoreModal.successBox.text` = `#86efac` | exact |
  | Error box `background-color` (separate render, real mocked `rpc` rejects) | `rgba(220, 38, 38, 0.12)` | `color.overlay.errorMid` | exact |
  | Error box `border-color` | `rgba(220, 38, 38, 0.3)` | `color.overlay.errorMedium` | exact |
  | Error box `color` | `rgb(252, 165, 165)` | `restoreScoreModal.errorBox.text` = `#fca5a5` | exact |
  | "No scorebook data found" `color` (separate render, count=0) | `rgb(71, 85, 105)` | `gameDay.text.caption` = `#475569` | exact |

  All computed values are byte-exact matches to their token's source
  hex/rgba value. Interaction wiring confirmed with real logic, not
  stubs: real click #1 flipped `confirmTap` (button text → "Tap again to
  confirm") without invoking the RPC; real click #2 invoked the real
  mocked `supabase.rpc('restore_game_state', {...})` call, and on the
  success path the component's own real `setTimeout(onClose, 2000)` was
  exercised with `vi.useFakeTimers()` + `vi.advanceTimersByTime(2000)` —
  `onClose` was asserted uncalled before the advance and called exactly
  once after, i.e. the real timer-driven close behavior was verified,
  not just its styling. On the error path, the real `setStatus({error})`
  + `setConfirmTap(false)` handler was confirmed by watching the button
  label revert from "Tap again to confirm" back to "Restore from
  Scorebook" after the real rejected RPC promise resolved. The
  zero-at-bats case confirmed `canRestore` correctly stays `false`
  (button `disabled` attribute checked directly, not just appearance).

  One benign `not wrapped in act(...)` React warning appeared from the
  fake-timer-driven `onClose` call landing after the test's synchronous
  assertions — did not affect any assertion outcome (all 3 harness tests
  passed clean); noted here for transparency, not treated as a real
  issue.

### No behavioral quirks found

No data-driven lookup tables in this file (unlike slice 6's
`POS_COLORS`) and no divergent-from-shared-palette values — every
literal was a static style-object value (including the two 3-way
ternaries driving the Restore button's background/border/text across
disabled/confirm-tap/armed states) with an unambiguous 1:1 substitution.
Nothing here rises to the level of a behavioral quirk worth flagging to
KK beyond the occurrence-count discrepancy already logged above. One
notable *reuse* decision worth flagging explicitly even though it's not
a quirk: this is the first slice to reuse `color.overlay.errorMid`/
`errorMedium` (previously audited only against App.jsx/DefenseDiamond)
directly on a `gameDay` dark surface — justified by the same
"pre-mixed alpha tint, not a light-surface-calibrated solid color"
reasoning slices 6/8 already established for `overlay.goldTint`/
`overlay.scrimLight`, but flagged here since it's a new instance of that
reasoning being applied to a different color family for the first time.

### Outcome

Slice 10 complete: merged into `feature/story133-slices5-13-sandbox` as
commit `ff8390a` (genuine 2-parent merge), zero literal colors remaining
in `RestoreScoreModal.jsx`, build clean, 114/114 tests passing,
checkpoint logged. Next up per the handoff scope table: slice 11,
`FinishGameModal.jsx` (16 occurrences).

---

## Slice 11 — `FinishGameModal.jsx`

**Branch:** `feature/story133-slice11-finishgamemodal-token-migration`
(forked from `feature/story133-slices5-13-sandbox` @ `16b2160`)

**PR:** [#754](https://github.com/kaushikkuberanathan/lineup_generator/pull/754),
base = `feature/story133-slices5-13-sandbox`, labels `priority:p2` /
`type:refactor` / `area:scoring`. Opened and merged via `gh` CLI, same
approach slices 6/8/9/10 confirmed works (the GitHub MCP integration's
`create_pull_request`/`merge_pull_request` still return `403`).

**Commit:** `7008e78` — "refactor: migrate FinishGameModal.jsx off literal
colors onto tokens.js" (no closing keyword, per handoff rule).

**Merge:** `2dea4c6`, genuine 2-parent merge —
`git show -s --format="%H %P" origin/feature/story133-slices5-13-sandbox`
→ `2dea4c60b9bb45a4d0e9cc8459edeeae48b2b7fe 16b2160713cdc21602a2edc2147e7726561dc0f8 7008e7882cc3cda40b031f296cd11c92e04fa566`
(2 parents — `16b2160` the prior sandbox tip [slice 10's checkpoint
commit], `7008e78` this slice's commit — not squashed).

### Scope discrepancy vs. the handoff doc

Both `STORY133_SANDBOX_HANDOFF.md` and
`STORY133_GAMEDAY_TOKEN_MIGRATION_HANDOFF.md` list this file at **~16**
occurrences. The actual inventory —
`grep -noE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)" FinishGameModal.jsx | wc -l`
— returned **23**. Logged per the escalation policy; every real migration
slice's doc count has undershot the true total so far (slice 5: 33→51,
slice 6: 45→65, slice 8: 10→18, slice 9: 12→18, slice 10: 15→27, this
slice: 16→23). All 23 were migrated; post-migration grep on the file
returns empty.

### Reachability

Confirmed live, not dead code: `grep -rln "FinishGameModal" frontend/src
--include="*.jsx"` shows it's imported and rendered by
`GameModeGearMenu.jsx` (reached via the "Finish Game…" menu item covered
in slice 8's own verification) as well as directly by
`LiveScoringPanel.jsx` — one of the 7 live ScoringMode children
`DugoutView` imports transitively, same reachability chain slices 7-10
confirmed. No dedicated `FinishGameModal.test.jsx` exists; the
`ScoringMode/*` track still has no established per-file test baseline
(confirmed via `find frontend/src/components/ScoringMode -iname
"*.test.*"`, zero results, same as slices 8/9/10).

**Note on this component's shape, different from slices 7-10:**
`FinishGameModal` receives `endGame` as an injected prop (default a
resolved-promise stub), not a direct `supabase.from(...)`/`supabase.rpc(...)`
call inside the component itself — the real Supabase write for finalizing
a game lives one layer up, in whatever caller wires `endGame` (schedule
finalization plumbing, out of scope for this file). This changes what "real
network call" verification means here: since the component's own code has
no network call to mock, the correct real-not-stub harness (per the
auth-boundary rule) is a genuinely functional `endGame` — a real function
returning real resolved/rejected `Promise`s that the component's actual
`.then()`/`.catch()`-equivalent branching consumes — not a
`supabase.rpc` mock like slice 10 used, and not a no-op stub either.

### Token mapping decisions

**Reused existing tokens (value + role both matched):**

| Literal | Reused token | Role match reasoning |
|---|---|---|
| `#0f1f3d` (panel bg) | `brand.navy` | Exact byte match; same role as every prior slice's reuse — dominant dark-navy panel/surface background. |
| `rgba(255,255,255,0.15)` (panel border) | `overlay.whiteLight` | Exact match; "on-dark borders, highlights." |
| `#f5c842` ("Finish Game" title) | `brand.gold` | Exact match, primary-accent role — same as every prior slice's reuse. |
| `#64748b` (subtitle "Inning N · vs ___") | `gameDay.text.muted` | Exact match, "subdued supporting text." |
| `#94a3b8` (team-short label ×2, disclaimer body text; 3 sites) | `gameDay.text.secondary` | Exact match, "mid-emphasis" — same role at all 3 sites. |
| `#fff` (myScore/oppScore numbers ×2, confirm-button text; 4 sites) | `gameDay.text.primary` | Exact match, "highest emphasis" — same generic opaque-white-on-dark role at all 4 sites. |
| `rgba(255,255,255,0.12)` (Cancel button border) | `gameDay.border.hairline` | Exact match to the shared (not component-scoped) hairline token — third confirmed recurrence after slice 5's mint and slice 8's first reuse. |
| `#dc2626` (default-armed Confirm button bg) | `status.error` | Exact match, same destructive/terminal-action reuse precedent slice 5 (Out Tonight strip) and slice 10 (Restore button) both established. |
| `#fee2e2` / `#dc2626` (error-alert box bg + text) | `status.errorBg` / `status.error` | Exact match. **First reuse of `errorBg` in a `gameDay` context** — this exact `errorBg`/`error` pairing (background/color) is already the established pattern in `LoginScreen.jsx` and `RequestAccessScreen.jsx` (both light-surface auth screens), and `status.error` itself was already reused twice on dark `gameDay` surfaces (slices 5, 10). Judgment call: `status.*` tokens are a generic app-wide semantic scale, not one of the light-surface-calibrated families (`text.*`/`border.*`/`surface.*`) the `gameDay` top-of-block comment specifically warns against aliasing — the rendered box is genuinely a light-pink alert chip nested inside the dark modal, matching the source exactly, not a light/dark role mismatch. |

**Minted new tokens** (`gameDay.finishGameModal.*`, mirroring the
`gameModeScreen.*`/`inningModal.*`/`gearMenu.*`/`runnerConflictModal.*`/
`restoreScoreModal.*` component-scoped precedent):

- `backdrop` (`rgba(0,0,0,0.82)`) — full-screen root backdrop.
  Byte-matches `runnerConflictModal.backdrop` exactly, but kept separate
  per the no-cross-component-alias rule already applied to every prior
  byte-match-but-different-component case.
- `scorePreview.background` (`rgba(255,255,255,0.06)`) — score-comparison
  box bg. Fifth recurrence of this exact 0.06 white-wash value across
  components (`gameModeScreen.advanceButton.mutedBackground`,
  `inningModal.divider`, `gearMenu.handoffModal.cancelBackground`,
  `restoreScoreModal.restoreButton.disabledBackground`), kept separate
  per the established rule.
- `scorePreview.border` (`rgba(255,255,255,0.1)`) — byte-matches
  `restoreScoreModal.cancelButton.border` exactly; kept separate, same
  rule.
- `scorePreview.divider` (`#374151`) — the em-dash glyph between the two
  score numbers. Byte-matches `gameDay.text.separator` exactly, but that
  token's documented role is explicitly scoped to `ScoreboardRow`'s ":"
  glyph only — kept separate, same reasoning `restoreScoreModal.
  disabledText` already applied to this identical literal in slice 10.
- `cancelButton.background` (`rgba(255,255,255,0.06)`) — "Not yet" button
  bg. Same 0.06 value as `scorePreview.background` above but a different
  element/role within this same file — kept as its own key, same
  within-file discipline slice 6 used for `battingCard` vs. `defenseCard`.
- `confirmButton.loadingBackground` (`#6b1a1a`) — Confirm button's
  dimmed/in-flight background while `endGame()` is pending. Distinct value
  from `restoreScoreModal.restoreButton.confirmBackground` (`#7f1d1d`,
  a different "tap again to confirm" state in a different component) — no
  existing match.
- `confirmButton.spinnerTrack` (`rgba(255,255,255,0.4)`) — the loading
  spinner's non-highlighted border sides (`borderTopColor` separately
  overridden to `gameDay.text.primary` for the spin highlight — the
  classic CSS spinner technique). No existing 0.4-opacity white tier
  (`overlay.whiteMedium`=0.25, `whiteHeavy`=0.6 are the nearest, neither
  exact).

### Verification

- `grep -oE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)"
  frontend/src/components/ScoringMode/FinishGameModal.jsx` → empty (zero
  literals remain).
- `cd frontend && npm run build` → clean, no errors, no new warnings.
- `npx vitest run src/components/game-mode/ src/tests/theme.tokens.test.js --no-file-parallelism`
  → **114/114 passing** (6 test files), matching the slice-3/5/6/8/9/10
  baseline.
- **Real-DOM computed-style + interaction-wiring verification** (RTL, real
  component render, a real (non-stub) `endGame` function returning real
  `Promise`s the component's actual async logic consumes, real
  `onCancel`/`onSuccess` handler assertions — not appearance-only):
  rendered `FinishGameModal` across 3 real states (idle, loading —
  pending real promise, error — real rejected-shape resolution with
  `error:'sync_failed'`) via a throwaway test file (written, run, then
  deleted — not committed), read back `getComputedStyle(...)` on the live
  DOM at each stage:

  | Element / state | Computed value | Expected token | Match |
  |---|---|---|---|
  | Backdrop `background-color` | `rgba(0, 0, 0, 0.82)` | `finishGameModal.backdrop` | exact |
  | Panel `background-color` | `rgb(15, 31, 61)` | `brand.navy` = `#0F1F3D` | exact |
  | Panel `border-color` | `rgba(255, 255, 255, 0.15)` | `overlay.whiteLight` | exact |
  | "Finish Game" title `color` | `rgb(245, 200, 66)` | `brand.gold` = `#F5C842` | exact |
  | Subtitle `color` | `rgb(100, 116, 139)` | `gameDay.text.muted` = `#64748B` | exact |
  | myScore/oppScore numbers `color` | `rgb(255, 255, 255)` | `gameDay.text.primary` | exact |
  | Em-dash divider `color` | `rgb(55, 65, 81)` | `finishGameModal.scorePreview.divider` = `#374151` | exact |
  | Score box `background-color` | `rgba(255, 255, 255, 0.06)` | `finishGameModal.scorePreview.background` | exact |
  | Score box `border-color` | `rgba(255, 255, 255, 0.1)` | `finishGameModal.scorePreview.border` | exact |
  | "Not yet" button `background-color` | `rgba(255, 255, 255, 0.06)` | `finishGameModal.cancelButton.background` | exact |
  | "Not yet" button `border-color` | `rgba(255, 255, 255, 0.12)` | `gameDay.border.hairline` | exact |
  | "Not yet" button `color` | `rgb(148, 163, 184)` | `gameDay.text.secondary` = `#94A3B8` | exact |
  | Confirm button (armed) `background-color` | `rgb(220, 38, 38)` | `status.error` | exact |
  | Confirm button (loading, real pending promise) `background-color` | `rgb(107, 26, 26)` | `finishGameModal.confirmButton.loadingBackground` = `#6b1a1a` | exact |
  | Spinner non-top border sides | `rgba(255, 255, 255, 0.4)` | `finishGameModal.confirmButton.spinnerTrack` | exact |
  | Spinner top border (highlight) | `rgb(255, 255, 255)` | `gameDay.text.primary` | exact |
  | Error box (real rejected-shape resolution) `background-color` | `rgb(254, 226, 226)` | `status.errorBg` = `#FEE2E2` | exact |
  | Error box `color` | `rgb(220, 38, 38)` | `status.error` | exact |

  All computed values are byte-exact matches to their token's source
  hex/rgba value. Interaction wiring confirmed with real, non-stub logic:
  clicking "Not yet" asserted the real `onCancel` prop fired exactly once
  and confirmed `endGame` was never invoked; clicking "Yes, finish game"
  invoked the real `endGame()` function, and resolving its real (not
  mocked-library) `Promise` with `{ok:true}` was asserted to call the real
  `onSuccess` prop exactly once via `waitFor`; a separate render resolved
  `endGame()`'s promise with `{ok:false, error:'sync_failed'}` and
  confirmed the real `setErrorMsg` branching rendered the exact expected
  copy ("Could not save to server. Check your connection and retry.") and
  reverted the button label to "Retry" — real state-driven behavior, not
  just styling.

### No behavioral quirks found

No data-driven lookup tables in this file (unlike slice 6's `POS_COLORS`)
and no divergent-from-shared-palette values — every literal was a static
style-object value (including the loading-state ternary driving the
Confirm button's background) with an unambiguous 1:1 substitution. The one
notable *reuse* decision worth flagging explicitly, same disclosure
pattern slice 10 used for `errorMid`/`errorMedium`: this is the first
slice to reuse `status.errorBg` directly on a `gameDay` dark surface,
extending the precedent already established for its paired `status.error`
token — not a quirk, but a new instance of that reasoning applied to a
token family that hadn't been reused in this context before.

### Outcome

Slice 11 complete: merged into `feature/story133-slices5-13-sandbox` as
commit `2dea4c6` (genuine 2-parent merge), zero literal colors remaining
in `FinishGameModal.jsx`, build clean, 114/114 tests passing, checkpoint
logged. Next up per the handoff scope table: slice 12,
`ScoringModeEntry.jsx` (31 occurrences).

---

## Slice 12 — `ScoringModeEntry.jsx`

**Branch:** `feature/story133-slice12-scoringmodeentry-token-migration`
(forked from `feature/story133-slices5-13-sandbox` @ `b34358b`)

**PR:** [#755](https://github.com/kaushikkuberanathan/lineup_generator/pull/755),
base = `feature/story133-slices5-13-sandbox`, labels `priority:p2` /
`type:refactor` / `area:scoring`. Opened and merged via `gh` CLI, same
approach slices 6/8/9/10/11 confirmed works (the GitHub MCP integration's
`create_pull_request`/`merge_pull_request` still return `403`).

**Commit:** `be3a627` — "refactor: migrate ScoringModeEntry.jsx off
literal colors onto tokens.js" (no closing keyword, per handoff rule).

**Merge:** `266d1cd`, genuine 2-parent merge —
`git show -s --format="%H %P" origin/feature/story133-slices5-13-sandbox`
→ `266d1cd36217125ab49e0df1e3a972311ea3386b b34358baf5954600497686126d39b36c348e84ec be3a6270bab37cc753ddc185e581f3ebd5c5f446`
(2 parents — `b34358b` the prior sandbox tip [slice 11's checkpoint
commit], `be3a627` this slice's commit — not squashed).

### Scope discrepancy vs. the handoff doc

Both `STORY133_SANDBOX_HANDOFF.md` and
`STORY133_GAMEDAY_TOKEN_MIGRATION_HANDOFF.md` list this file at **~31**
occurrences. The actual inventory —
`grep -noE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)" ScoringModeEntry.jsx | wc -l`
— returned **48**. Logged per the escalation policy; every real migration
slice's doc count has undershot the true total so far (slice 5: 33→51,
slice 6: 45→65, slice 8: 10→18, slice 9: 12→18, slice 10: 15→27, slice
11: 16→23, this slice: 31→48). All 48 were migrated; post-migration grep
on the file returns empty.

### Reachability

Confirmed live, not dead code: `grep -rln "ScoringModeEntry" frontend/src
--include="*.jsx"` shows it's imported and rendered directly by
`DugoutView.jsx` (`import ScoringModeEntry from '../ScoringMode/
ScoringModeEntry'`, `<ScoringModeEntry` at line 256) — the sole game-day
surface per root `CLAUDE.md`'s Live Scoring Architecture notes, not
reached transitively through `LiveScoringPanel.jsx` like slices 8-11's
files. Also referenced in `DugoutView.test.jsx`,
`DugoutView.viewport.test.jsx`, and `AppShareLinkRouting.test.jsx`. No
dedicated `ScoringModeEntry.test.jsx` exists; the `ScoringMode/*` track
still has no established per-file test baseline (confirmed via `find
frontend/src/components/ScoringMode -iname "*.test.*"`, zero results,
same as slices 8-11). This is the entry/selection screen for live
scoring — `myTeamHalf` selection, today's-game vs. upcoming-game
selection, Claim Scorer / Join as Viewer / Practice Mode routing — with
real internal state (`useState` for `myTeamHalf`) and derived selection
logic (`computeNextGames`), not a static-styling-only component like
several prior slices.

### Token mapping decisions

**Reused existing tokens (value + role both matched):**

| Literal | Reused token | Role match reasoning |
|---|---|---|
| `#0b1524` (root shell bg) | `gameDay.surface.shell` | Exact byte match; same role as every prior slice's reuse — full-screen game-day shell. |
| `#fff` (root text color, BETA badge text, close-button text, selected next-game-row text, half-toggle active text ×2, Claim Scorer active text, Practice Mode text; 8 sites) | `gameDay.text.primary` | Exact match, "highest emphasis" — same generic opaque-white-on-dark role at all 8 sites. |
| `rgba(255,255,255,0.08)` (header border, close-button bg, non-selected next-game-row border, half-toggle inactive bg ×2, divider border-top; 6 sites) | `overlay.whiteFaint` | Exact match, dark-surface-safe per its own doc comment. |
| `#f5c842` (Scoring Mode title, team name, "Today's Game" label; 3 sites) | `brand.gold` | Exact match, primary-accent role — same as every prior slice's reuse. |
| `#0f1f3d` (game card bg) | `brand.navy` | Exact match, same role as every prior slice's reuse. |
| `#64748b` (Team label, "No game today" text, Practice Mode subtitle; 3 sites) | `gameDay.text.muted` | Exact match, "subdued supporting text." |
| `#475569` ("Upcoming" eyebrow, "Pitches won't be recorded" caption, Claim Scorer disabled text; 3 sites) | `gameDay.text.caption` | Exact match; already reused in slices 5/6/10 for general low-emphasis supporting text beyond just eyebrow labels — consistent with that broader precedent, extended here to a button's disabled-state text too. |
| `#94a3b8` (today's-game date text, next-game date text; 2 sites) | `gameDay.text.secondary` | Exact match, "mid-emphasis." |
| `rgba(245,200,66,0.12)` (selected next-game-row bg) | `overlay.goldTint` | Exact match; generic pre-mixed cross-app alpha tint, safe to reuse directly per the precedent slice 6 established. |
| `rgba(245,200,66,0.4)` (selected next-game-row border) | `overlay.goldStrong` | Exact match; doc comment "gold wash for selected/active states" — an exact role match for this file's selected-row highlight, first reuse of this specific token in a `gameDay` context. |

**Minted new tokens** (`gameDay.scoringModeEntry.*`, mirroring the
`gameModeScreen.*`/`inningModal.*`/`gearMenu.*`/`runnerConflictModal.*`/
`restoreScoreModal.*`/`finishGameModal.*` component-scoped precedent):

- `betaBadge.background` (`#7c3aed`, violet-600) — "BETA" pill bg; no
  existing match anywhere.
- `closeButton.border` (`rgba(255,255,255,0.2)`) — no existing
  0.2-opacity white tier (`overlay.whiteFaint`=0.08, `whiteLight`=0.15,
  `whiteMedium`=0.25 are the nearest, none exact).
- `cardBorder` (`rgba(255,255,255,0.10)`) — shared within this file, 2
  sites (game card border, Practice Mode card border). No existing
  0.10-opacity white tier anywhere in `tokens.js` — a genuine gap-fill
  value, not a rounding of `overlay.whiteFaint` (0.08).
- `todayGameCard.{background,border}` (`rgba(245,200,66,0.08)` /
  `rgba(245,200,66,0.25)`) — "Today's Game" advisory card. `background`
  byte-matches `restoreScoreModal.warningBox.background` exactly;
  `border` byte-matches both `inningModal.battingCard.border` and
  `gameModeScreen.resumeBanner.border` exactly — third and second
  recurrence respectively of these values across unrelated components.
  Kept separate per the established no-cross-component-alias rule.
- `mutedText` (`#888`) — shared within this file, 3 sites ("We bat:"
  label, both half-toggle buttons' inactive text). No existing token at
  this exact gray — sits between `gameDay.text.muted` (`#64748B`) and
  `gameDay.text.secondary` (`#94A3B8`), matching neither.
- `disabledText` (`#374151`) — shared within this file, 2 sites ("No
  upcoming games scheduled" text, disabled "Join as Viewer" link text).
  Byte-matches `restoreScoreModal.disabledText` and
  `finishGameModal.scorePreview.divider` exactly — third recurrence of
  this value across unrelated components; kept separate per the
  established rule, same reasoning both prior slices used for this same
  literal.
- `halfToggle.activeBackground` (`#1B2A4A`) — shared within this file, 2
  sites (Top/Bottom active state bg). No existing match (distinct from
  `brand.navy` `#0F1F3D` and `gameDay.surface.shell` `#0B1524`, both
  darker/more saturated — same "distinct lighter navy" pattern
  `gearMenu.menuPanel.background` established in slice 8).
- `subtleRowBackground` (`rgba(255,255,255,0.04)`) — shared within this
  file, 2 sites (non-selected next-game row bg, Practice Mode card bg).
  Byte-matches `inningModal.rowBackground` exactly, but kept separate per
  the no-cross-component-alias rule, same reasoning
  `runnerConflictModal.cancelButton.background` used for this identical
  literal in slice 9.
- `claimButton.{background,disabledBackground,shadow}` — "Claim Scorer"
  primary CTA. `background` (`#1d4ed8`) byte-matches
  `gearMenu.handoffModal.confirmBackground` exactly, kept separate per
  the established rule. `disabledBackground`
  (`rgba(255,255,255,0.06)`) is the sixth recurrence of this white-wash
  value across components, minted separately per the same rule.
  `shadow` (`rgba(29,78,216,0.35)`) has no existing match anywhere — a
  button glow, distinct role from the flat background despite sharing
  the same base hue.
- `viewerLink.color` (`#60a5fa`, blue-400) — "Join as Viewer →" link
  text (enabled state); no existing match (distinct from `status.info`
  `#2563EB`, a darker, more saturated blue serving a different role).

### Verification

- `grep -oE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)"
  frontend/src/components/ScoringMode/ScoringModeEntry.jsx` → empty
  (zero literals remain).
- `cd frontend && npm run build` → clean, no errors, no new warnings.
- `npx vitest run src/components/game-mode/ src/tests/theme.tokens.test.js --no-file-parallelism`
  → **114/114 passing** (6 test files), matching the slice-3/5/6/8/9/10/11
  baseline.
- **Real-DOM computed-style + interaction-wiring verification** (RTL,
  real component render, real wired `onClose`/`onClaimScorer`/
  `onJoinViewer`/`onSelectGame`/`onPractice` handlers via `vi.fn()`
  spies asserting actual call args, not no-op stubs — this component's
  real behavior is a client-side `useState`/derived-selection state
  machine with no network layer, so the auth-boundary rule's "real, not
  stub" bar is met by exercising that real state directly): rendered
  `ScoringModeEntry` across 3 real states via a throwaway test file
  (written, run, then deleted — not committed) — (1) a today's-game
  fixture with an active team, (2) no game today with two upcoming games
  on the same date (one passed as `selectedGame`, exercising both the
  selected and unselected next-game-row branches), (3) an empty schedule
  (no `activeGame` at all, exercising every disabled-state branch) —
  read back `getComputedStyle(...)` on the live DOM at each stage:

  | Element / state | Computed value | Expected token | Match |
  |---|---|---|---|
  | Root shell `background-color` | `rgb(11, 21, 36)` | `gameDay.surface.shell` = `#0B1524` | exact |
  | Root shell `color` | `rgb(255, 255, 255)` | `gameDay.text.primary` | exact |
  | BETA badge `background-color` | `rgb(124, 58, 237)` | `scoringModeEntry.betaBadge.background` = `#7c3aed` | exact |
  | Close button `border-color` | `rgba(255, 255, 255, 0.2)` | `scoringModeEntry.closeButton.border` | exact |
  | Team label `color` | `rgb(100, 116, 139)` | `gameDay.text.muted` = `#64748B` | exact |
  | Team name `color` | `rgb(245, 200, 66)` | `brand.gold` = `#F5C842` | exact |
  | Today's Game card `background-color` | `rgba(245, 200, 66, 0.08)` | `scoringModeEntry.todayGameCard.background` | exact |
  | Today's Game card `border-color` | `rgba(245, 200, 66, 0.25)` | `scoringModeEntry.todayGameCard.border` | exact |
  | Today's Game date `color` | `rgb(148, 163, 184)` | `gameDay.text.secondary` = `#94A3B8` | exact |
  | Claim Scorer (active) `background-color` | `rgb(29, 78, 216)` | `scoringModeEntry.claimButton.background` = `#1d4ed8` | exact |
  | Claim Scorer (active) `box-shadow` | `0 4px 16px rgba(29,78,216,0.35)` | `scoringModeEntry.claimButton.shadow` | exact |
  | Join as Viewer (active) `color` | `rgb(96, 165, 250)` | `scoringModeEntry.viewerLink.color` = `#60a5fa` | exact |
  | Top toggle (active) `background-color` | `rgb(27, 42, 74)` | `scoringModeEntry.halfToggle.activeBackground` = `#1B2A4A` | exact |
  | Bottom toggle (inactive) `background-color` | `rgba(255, 255, 255, 0.08)` | `overlay.whiteFaint` | exact |
  | Bottom toggle (inactive) `color` | `rgb(136, 136, 136)` | `scoringModeEntry.mutedText` = `#888` | exact |
  | Bottom toggle, after real click → `background-color` | `rgb(27, 42, 74)` | `halfToggle.activeBackground` | exact — confirms real `setMyTeamHalf` state drove the swap |
  | Divider `border-top-color` | `rgba(255, 255, 255, 0.08)` | `overlay.whiteFaint` | exact |
  | Practice Mode card `background-color` | `rgba(255, 255, 255, 0.04)` | `scoringModeEntry.subtleRowBackground` | exact |
  | Practice Mode card `border-color` | `rgba(255, 255, 255, 0.1)` | `scoringModeEntry.cardBorder` | exact |
  | Practice Mode caption `color` | `rgb(71, 85, 105)` | `gameDay.text.caption` = `#475569` | exact |
  | "No game today" `color` | `rgb(100, 116, 139)` | `gameDay.text.muted` | exact |
  | "Upcoming" eyebrow `color` | `rgb(71, 85, 105)` | `gameDay.text.caption` | exact |
  | Selected next-game row `background-color` | `rgba(245, 200, 66, 0.12)` | `overlay.goldTint` | exact |
  | Selected next-game row `border-color` | `rgba(245, 200, 66, 0.4)` | `overlay.goldStrong` | exact |
  | Unselected next-game row `background-color` | `rgba(255, 255, 255, 0.04)` | `scoringModeEntry.subtleRowBackground` | exact |
  | Unselected next-game row `border-color` | `rgba(255, 255, 255, 0.08)` | `overlay.whiteFaint` | exact |
  | Game card `border-color` (second fixture) | `rgba(255, 255, 255, 0.1)` | `scoringModeEntry.cardBorder` | exact |
  | "No upcoming games scheduled" `color` | `rgb(55, 65, 81)` | `scoringModeEntry.disabledText` = `#374151` | exact |
  | Claim Scorer (disabled) `background-color` | `rgba(255, 255, 255, 0.06)` | `scoringModeEntry.claimButton.disabledBackground` | exact |
  | Claim Scorer (disabled) `color` | `rgb(71, 85, 105)` | `gameDay.text.caption` | exact |
  | Join as Viewer (disabled) `color` | `rgb(55, 65, 81)` | `scoringModeEntry.disabledText` | exact |
  | "We bat:" label `color` | `rgb(136, 136, 136)` | `scoringModeEntry.mutedText` | exact |

  All computed values are byte-exact matches to their token's source
  hex/rgba value. Interaction wiring confirmed with real, non-stub
  logic: `fireEvent.click` on the close button asserted the real
  `onClose` prop fired exactly once; clicking Claim Scorer asserted
  `onClaimScorer` was called with `(activeGame, myTeamHalf)` — first
  with `myTeamHalf === 'top'` (the initial `useState` default), then a
  second click after real-clicking the Bottom toggle button confirmed
  the second call carried `'bottom'`, i.e. the real internal state
  transition actually drove the prop the parent receives, not just the
  visible highlight; clicking Join as Viewer asserted `onJoinViewer` was
  called with the active game object; clicking an unselected next-game
  row asserted `onSelectGame` was called with that exact game object
  (not the selected one); clicking Practice Mode asserted `onPractice`
  fired once; in the disabled-CTA fixture (empty schedule, no
  `activeGame`), clicking both Claim Scorer and Join as Viewer asserted
  their respective callbacks were never invoked, confirming the
  `disabled={!activeGame}` guard is real, not just a visual dimming.

### No behavioral quirks found

No data-driven lookup tables in this file (unlike slice 6's
`POS_COLORS`) and no divergent-from-shared-palette values — every
literal was a static style-object value (including the ternaries
driving the half-toggle and Claim/Join active-vs-disabled states) with
an unambiguous 1:1 substitution. This is the first slice whose component
carries real internal state (`myTeamHalf` via `useState`) and derived
selection logic (`computeNextGames`) rather than being purely
presentational or prop-driven — the interaction-wiring verification
above specifically exercised that state (confirming the Bottom-toggle
click actually changed the value `onClaimScorer` received, not just the
button's own highlight) since a styling-only regression check would not
have caught a broken state wire. Nothing here rises to the level of a
behavioral quirk worth flagging to KK beyond the occurrence-count
discrepancy already logged above.

### Outcome

Slice 12 complete: merged into `feature/story133-slices5-13-sandbox` as
commit `266d1cd` (genuine 2-parent merge), zero literal colors remaining
in `ScoringModeEntry.jsx`, build clean, 114/114 tests passing, checkpoint
logged. Only slice 13 remains: `LiveScoringPanel.jsx` (167 occurrences,
~60KB — per the handoff doc, sub-slice into 2-3 PRs by logical section
rather than one giant diff). One note carried forward for that slice:
this file confirmed the `scoringModeEntry.claimButton.background`
(`#1d4ed8`) / `gearMenu.handoffModal.confirmBackground` byte-match is
now a recurring blue-700 value across at least 2 `ScoringMode/*`
components — worth checking whether `LiveScoringPanel.jsx` uses this
same literal anywhere, since a third recurrence might tip the judgment
call toward promoting it to a shared (non-component-scoped) token
instead of minting a fourth separate copy.

## Slice 13a — `LiveScoringPanel.jsx` (sub-slice A of 3: sub-components)

`LiveScoringPanel.jsx` is the final, largest slice (1301 lines) and is
being landed as 3 sub-slice PRs per the handoff doc's explicit
instruction, rather than one giant diff. This is **part A of 3**: the
`OUTCOME_ROWS`/`OUTCOME_ROWS_V2` constants and the `CountPips`/
`DiamondSVG`/`HomeAwayChip` sub-components — source lines 1-201 in the
pre-migration file, everything above the `// ─── Main ───` marker.
Parts B and C (the default-exported `LiveScoringPanel` function body)
are separate, later PRs.

### Scoping the section

`sed -n '1,201p' LiveScoringPanel.jsx | grep -oE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)"`
found **47 occurrences** (doc's whole-file estimate was 167 — every
slice this run has undershot the doc's estimate, consistent again
here). The real "Main" marker sits at source line 201 (not exactly
"line 1-201" as a round number, but very close, per the task's own
instruction to confirm and adjust slightly) — confirmed no color
declaration spans the boundary awkwardly; the cut lands cleanly on the
blank line separating `HomeAwayChip`'s closing brace from the `Main`
comment. After adding one import line, the marker shifted from source
line 201 to 202 in the migrated file — expected, not scope creep (git
diff hunks confirmed below, none reach past original line 197).

### Inventory and mappings

| Literal | Count | Site | Decision |
|---|---|---|---|
| `#dc2626` | 9 | `PITCH_CHIPS`/`PITCH_BUTTONS` strike colors, `OUTCOME_ROWS`/`_V2` out/strikeout colors | Reuses `color.status.error` directly — established "destructive/negative-outcome red" precedent from slices 5/10/11 |
| `#16a34a` | 8 | `PITCH_CHIPS`/`PITCH_BUTTONS` contact color, `OUTCOME_ROWS`/`_V2` hit colors (single/double/triple) | Minted `gameDay.liveScoringPanel.accent.hit` — byte-matches `runnerConflictModal.scoreButton.border` but kept separate per no-cross-component-alias rule |
| `#f5c842` | 6 | `OUTCOME_ROWS`/`_V2` home-run color, `DiamondSVG` runner-pill text + occupied-base fill/stroke, `HomeAwayChip` away-state color | Reuses `color.brand.gold` directly — established generic-accent precedent |
| `#d97706` | 4 | `PITCH_CHIPS`/`PITCH_BUTTONS` foul color, `OUTCOME_ROWS`/`_V2` error-reached color | Minted `gameDay.liveScoringPanel.accent.caution` — byte-matches `gameModeScreen.orientationHint.background`, kept separate |
| `#7c3aed` | 4 | `OUTCOME_ROWS`/`_V2` walk/HBP colors | Minted `gameDay.liveScoringPanel.accent.walk` — byte-matches `scoringModeEntry.betaBadge.background`, kept separate |
| `#1d4ed8` | 2 | `PITCH_CHIPS`/`PITCH_BUTTONS` ball color | Minted `gameDay.liveScoringPanel.accent.ball` — see recurrence note below |
| `rgba(255,255,255,0.18)` | 1 | `CountPips` inactive-pip background | Minted `countPips.inactiveBackground` — byte-matches `gameDay.diamond.stroke.empty`, different specific role (DiamondView's empty-base stroke), kept separate |
| `rgba(255,255,255,0.2)` | 1 | `CountPips` pip border | Minted `countPips.border` — byte-matches `scoringModeEntry.closeButton.border`, kept separate |
| `rgba(255,255,255,0.1)` | 1 | `DiamondSVG` polygon stroke | Minted `diamondSvg.polygonStroke` — byte-matches `gameDay.diamond.stroke.mound`, different specific role (mound-circle stroke vs. this component's own outline), kept separate |
| `rgba(255,255,255,0.08)` | 1 | `DiamondSVG` unoccupied-base fill | Reuses `overlay.whiteFaint` directly — generic pre-mixed tint, established precedent |
| `rgba(255,255,255,0.25)` | 1 | `DiamondSVG` unoccupied-base stroke | Minted `diamondSvg.base.offStroke` — byte-matches `overlay.whiteMedium`, but that token's documented role is text (MaintenanceScreen version chip), not a stroke; same reasoning `gameModeScreen.orientationHint.border` already applied to this identical byte-match in slice 5 |
| `rgba(255,255,255,0.12)` | 1 | `DiamondSVG` home-plate fill | Minted `diamondSvg.homePlate.fill` — byte-matches `gameDay.border.hairline`, but that's a border/divider role, not a shape fill, kept separate |
| `rgba(255,255,255,0.28)` | 1 | `DiamondSVG` home-plate stroke | Minted `diamondSvg.homePlate.stroke` — no existing match |
| `rgba(245,200,66,0.15)` | 1 | `DiamondSVG` runner-pill background | Minted `diamondSvg.runnerPill.background` — no existing match |
| `rgba(245,200,66,0.35)` | 1 | `DiamondSVG` runner-pill border | Minted `diamondSvg.runnerPill.border` — no existing match |
| `rgba(148, 163, 184, 0.12)` | 1 | `HomeAwayChip` home-state background | Minted `homeAwayChip.home.background` — no existing pre-mixed tier at this rgb triple |
| `rgba(148, 163, 184, 0.2)` | 1 | `HomeAwayChip` home-state border | Minted `homeAwayChip.home.border` — no existing match |
| `#94a3b8` | 1 | `HomeAwayChip` home-state color | Reuses `gameDay.text.secondary` directly — established precedent |
| `rgba(245, 200, 66, 0.12)` | 1 | `HomeAwayChip` away-state background | Reuses `overlay.goldTint` directly — established precedent |
| `rgba(245, 200, 66, 0.3)` | 1 | `HomeAwayChip` away-state border | Minted `homeAwayChip.away.border` — byte-matches `gameModeScreen.advanceButton.pendingBorder`, kept separate |

47 total, matching the grep inventory exactly. All new tokens live
under a new `gameDay.liveScoringPanel` namespace in `tokens.js`.

### The `#1d4ed8` recurrence (carried forward from slice 12's note)

Slice 12's checkpoint flagged that `#1d4ed8` (blue-700) had recurred
across `gearMenu.handoffModal.confirmBackground`,
`runnerConflictModal.holdButton.border`, and
`scoringModeEntry.claimButton.background`, and asked whether a 3rd/4th
recurrence in `LiveScoringPanel.jsx` should tip the call toward
promoting it to a shared token instead of minting a 4th copy.

**Judgment call: minted a 4th component-scoped copy
(`gameDay.liveScoringPanel.accent.ball`) rather than promoting.**
Reasoning: promoting to a genuine shared token would require also
retrofitting the 3 already-merged files (`gearMenu.jsx`,
`RunnerConflictModal.jsx`, `ScoringModeEntry.jsx`) to reference it
instead of their own copies — that's a cross-file refactor outside
this sub-slice's declared scope (sub-components section of one file
only), and touching already-merged, already-checkpointed code without
a clear go-ahead felt like unnecessary risk for a sandbox run with no
CI safety net. Kept consistent with the established "mint per
component, document the byte-match" precedent one more time instead.
**Flagged explicitly, in both `tokens.js`'s comment and here:** this is
now a 4-way recurrence and is worth a dedicated follow-up story to
evaluate consolidating all 4 sites onto one shared `gameDay.accent.*`
token. Not done in this run.

### Verification

- `npm run build` — clean.
- `theme.tokens.test.js` + `src/components/game-mode/` suite —
  114/114, unchanged baseline held.
- No existing dedicated test file for `LiveScoringPanel.jsx` (`Glob`
  confirmed) — nothing additional to run there.
- `sed -n '1,201p' LiveScoringPanel.jsx | grep -oE "#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)"`
  → empty. Zero literal colors remain in the sub-components section.
  (Lines 202+ / parts B and C intentionally untouched — not verified
  clean, that's out of scope for this sub-slice.)
- **`DiamondSVG` prop-driven state, verified with a real harness, not
  just static colors:** built a throwaway RTL test rendering the real
  `DiamondSVG` component (exported directly from `LiveScoringPanel.jsx`
  for this purpose) with real `runners`/`battingOrder` props — no stub
  callbacks, matching the handoff doc's warning about the standalone-
  render-with-no-op-stubs mistake from a prior session (that warning
  was specifically about *interaction* wiring; this component has no
  callbacks to wire, only prop-driven visual state, so a real-props
  render is the correct and sufficient verification here). 3 assertions,
  all passing:
  - No runners: all 3 base `<rect>`s render with `overlay.whiteFaint`
    fill / `diamondSvg.base.offStroke` stroke; 0 runner-name pills.
  - Runners on 1B and 2B (`battingOrder` with real names "Alex Smith"/
    "Jordan Lee"): those 2 bases render in `brand.gold` fill+stroke,
    3B stays in the empty-state colors, and 2 runner-name pills render
    with the correct first names ("Alex", "Jordan") and the minted
    `diamondSvg.runnerPill.background`/`brand.gold` text color
    (confirmed via computed `el.style`, jsdom-normalized rgba/hex
    comparison).
  - Home plate renders with the minted `homePlate.fill`/`homePlate.
    stroke` tokens regardless of runner state.
  Harness deleted before commit (verification-only, not part of the
  shipped diff, per the handoff doc's guidance on throwaway harnesses).

### Outcome

Slice 13a complete: PR [#756](https://github.com/kaushikkuberanathan/lineup_generator/pull/756)
merged into `feature/story133-slices5-13-sandbox` as commit `446a1bf`
(parents `333bc35` + `cc4b60d` — genuine 2-parent merge, confirmed via
`git show -s --format="%H %P"`), zero literal colors remaining in
`LiveScoringPanel.jsx` lines 1-201, build clean, 114/114 tests passing,
checkpoint logged. No behavioral quirks found (unlike slice 6's LC
color divergence) — this section is purely presentational constants
and prop-driven sub-components, no state/interaction wiring to
misdiagnose. Parts B and C remain: the `Main` `LiveScoringPanel`
function body (source line 202 onward in the migrated file), which
per the handoff doc's estimate (167 total, 47 accounted for here)
likely holds on the order of 100+ further occurrences — genuinely
unknown until inventoried, given every slice this run has undershot
the doc's estimates.
