# Phase 4b — proposed slice 10 scoping (spike, not implemented)

> **Status: exploration only.** This document is a scoping spike on branch
> `spike/phase4b-slice10-scoping`, forked off `develop` at `88667ce`. No
> App.jsx or tokens.js edits are included. Nothing here is decided —
> it is a detailed proposal for KK to accept, modify, split, or reject.
> Produced during the develop→main release freeze; deliberately does not
> touch develop.

## 1. The gap, precisely

`var C` is not fully retired even though all 9 originally-planned region
slices (1–7, 9) are shipped and slice 8 (GameMode/DugoutView) is the only
one still gated. Direct scan of `App.jsx` on `develop` at `88667ce`:

**78 lines / 89 `C.*` occurrences remain, none of them inside any of the
9 planned slices.** Every one falls in a render function that
`docs/product/DESIGN_AUDIT.md`'s own migration plan (§ "Recommended
migration shape", numbered list 1–9) never named:

| Function | Lines | `C.*` occurrences | Line range (current `develop`) |
|---|---|---|---|
| `renderTeamTab` | 23 | 24 | 7611–7743 |
| `renderPinModal` | 22 | 22 | 7217–7611 |
| `renderSnackDuty` | 16 | 22 | 5492–5601 |
| `renderSongs` | 9 | 10 | 5342–5492 |
| `renderBottomNav` | 4 | 5 | 7787–7822 |
| (before any render function — helper code) | 4 | 6 | ~700–725 |

Line numbers will drift again as other work lands on `develop` — re-grep
`\bC\.[a-zA-Z]` before starting, don't trust this table's line numbers
past a day or two, same caveat every prior slice's scoping doc gave.

## 2. Why this wasn't caught by slices 1–9

Cross-checked against `DESIGN_AUDIT.md`'s own Story 114 audit table
(chrome/inheritance-safety section):

- **`renderTeamTab`, `renderSongs`** — DESIGN_AUDIT.md explicitly lists
  these among the "genuinely per-tab content, correctly out of Story 114's
  scope" functions. Confirmed out of that story's boundary, but never
  assigned a region-slice number either. Fell through a gap between two
  documents that each assumed the other covered it.
- **`renderPinModal`, `renderBottomNav`** — both **are** in Story 114's
  own audit table, explicitly marked "All explicit" (i.e., inheritance-safe,
  no risk from a `text.ink` swap elsewhere). Story 114 covered the safety
  question for these two; nobody then gave them a slice number to actually
  migrate their own `C.*` references.
- **`renderSnackDuty`** — not mentioned anywhere in `DESIGN_AUDIT.md`,
  not in Story 114's audit, not in any slice. The one genuinely
  un-audited region of the five.
- **Helper code before the first render function (~line 700–725)** — never
  audited as part of any slice; small (4 lines) but real.

## 3. Reachability check (is any of this dead code?)

Worth ruling out before scoping migration work on it — confirmed all five
are live, reachable UI, not orphaned:

- `renderPinModal()` — called at the app-shell level (~line 8009), outside
  any tab dispatch. Confirmed **always-present chrome**, consistent with
  Story 114's own classification.
- `renderBottomNav` — same category, always-present.
- `renderTeamTab()` — the container/dispatcher for `primaryTab === "team"`,
  rendering a sub-tab bar and dispatching to sub-tab content
  (`teamSubTab === "roster" | "schedule" | "snacks"`). Its own 23 `C.*`
  sites are for the **sub-tab bar chrome itself**, not the dispatched
  content — `renderRoster`/`renderSchedule` (dispatched from here) are
  already migrated (slices 2, 4); no double-counting.
- `renderSnackDuty()` — dispatched from `renderTeamTab` at
  `teamSubTab === "snacks"`. Live, reachable. **Not** related to the
  separate `DOC_TEST_DEBT.md` P2 item "`snack_duty` column drop blocked
  on codebase audit" — that item is about an apparently-unused `jsonb`
  column on the `team_data` table; the feature scanned here reads/writes
  a plain string field (`game.snackDuty`) on each game object in the
  schedule array, a completely different storage location. Checked
  explicitly so this scoping doc doesn't accidentally recommend migrating
  styling on a feature that's about to be removed — it isn't.

## 4. Token mapping — the actual good news

Checked every one of the 11 distinct `C.*` keys used across these five
regions against `tokens.js` on `develop`. **All 11 already have an
exact-hex-match token from prior slices' ADOPT/MINT decisions.** No new
DIVERGENT/ORPHAN decision, no new token name, no design input needed —
unlike slices 1, 7, 9, 119, which each required a naming call. This
would be the first fully mechanical slice.

| `C.*` key | Hex | Token | Provenance |
|---|---|---|---|
| `navy` | `#0f1f3d` | `tokens.color.brand.navy` | Already established (slice 1) |
| `red` | `#c8102e` | `tokens.color.brand.red` | Already established |
| `redDark` | `#9b0c22` | `tokens.color.brand.redDark` | Story 110 mint |
| `gold` | `#f5c842` | `tokens.color.brand.gold` | Already established |
| `white` | `#ffffff` | `tokens.color.surface.card` | Already established |
| `textMuted` | `#6b7280` | `tokens.color.text.muted` | Already established |
| `border` | `rgba(0,0,0,0.06)` | `tokens.color.border.neutral` | Story 110 mint |
| `win` | `#27ae60` | `tokens.color.status.success` | Already established |
| `tie` | `#d4a017` | `tokens.color.status.warning` | Exact match, confirmed this pass — not previously called out for `tie` specifically |
| `cardBg` | `#ffffff` | `tokens.color.surface.card` | Exact match, confirmed this pass — used only in `renderSnackDuty`, first time this key needed a mapping |
| `subtleText` | `#9ca3af` | `tokens.color.text.disabled` | Exact match, confirmed this pass — used only in `renderSnackDuty`, first time this key needed a mapping |

## 5. Literal-hex bypass sites (find-and-replace mechanic, not swap-the-reference)

Same class of gotcha as `overlayBg`/`navyLight`/`greenField` in earlier
slices — grepped for literal hex values matching every `C.*` value across
all five regions, not just `C.key` references:

| Location | Literal | Matches | Context |
|---|---|---|---|
| `renderPinModal`, ~line 7309 | `#0f1f3d` | `brand.navy` | `background:'#0f1f3d'` on the PIN modal's full-screen backdrop |
| `renderPinModal`, ~line 7363 | `#f8fafc` | `surface.page` | `backgroundColor: '#f8fafc'` on an inner panel |

Both inside `renderPinModal` specifically — the other four regions had
none in this pass.

## 6. Proposed scope and sequencing options

**Option A — one slice, all five regions.** ~78 lines, comparable in size
to already-shipped slice 3 (40 sites) or slice 6 (Feedback/About/Account/
Updates, unspecified but multi-function). Simplest to review as one unit;
all-mechanical migration means the RED→GREEN snapshot-pinning pattern
established in slice 1 applies directly with no new judgment calls.

**Option B — split by chrome vs. per-tab.** `renderPinModal` +
`renderBottomNav` (already Story-114-cleared, always-present chrome, 26
sites total incl. the 2 literal-hex fixes) as one slice; `renderTeamTab` +
`renderSnackDuty` + `renderSongs` + the small helper-code block (52 sites)
as a second. Slightly more PRs/review overhead, but isolates the
already-audited chrome pair from the never-audited trio, which may matter
if KK wants the fully-audited half to move first.

**Recommendation (non-binding — KK's call):** Option A. The chrome/per-tab
split doesn't change *what* needs auditing before either half ships — the
per-tab trio's Story 114 status is "exempt by category," same conclusion
either way, not "pending, needs work." Splitting adds process overhead
without buying a real risk reduction here, unlike the App.jsx-decomposition
Phase 4 track where slice boundaries have driven real component
extraction. This is a pure token-reference swap; one slice keeps the
snapshot-pinning verification scoped to one branch, one soak, one PR.

## 7. Effort estimate

- 89 occurrences across 78 lines, 11 keys, all exact-match — same
  mechanical shape as already-shipped slices 2–7/9.
- 2 literal-hex sites need find-and-replace instead of reference-swap —
  small, already located precisely above.
- Zero new tokens to mint, zero DIVERGENT/ORPHAN decisions, zero
  Story-114-style inheritance investigation needed (both categories
  already cleared by existing audits).
- Expected to be one of the *lower*-effort slices shipped so far, on a
  pure sites-migrated basis — most of the investigative work a slice
  normally requires (precedent-checking, inheritance-safety, hex-drift
  analysis) is already done in this document.

## 8. What this does NOT resolve

- Slice 8 (GameMode/DugoutView) — still gated, unaffected by this
  proposal either way.
- `docs/product/FEATURE_MAP.md`, `DOC_TEST_DEBT.md`, and
  `DESIGN_AUDIT.md` itself would all need a follow-up doc update once
  (if) this slice actually ships — not done here, this is scoping only.
- Once slice 8 and (if approved) slice 10 both ship, `var C` would have
  zero remaining call sites in `App.jsx` and the final cleanup step
  (item 13 in the original task list — add a keys-present guard test,
  then delete the `var C` object) becomes unblocked. Not started here.
