# Design Audit — Dugout Lineup

> **Historical snapshot.** Preserve as the 2026-04-30 design-token audit record; current execution status lives in `UX_REFACTOR_ROADMAP.md`.

**Branch:** `feature/design-tokens`
**Audit date:** 2026-04-30
**Auditor:** Claude Code (claude-sonnet-4-6) — recon-driven, values sourced from live codebase scan
**Scope:** `frontend/src/App.jsx` (~9,800 lines) + `frontend/src/components/` (all `.jsx/.js/.css`)
**Purpose:** Establish provenance for every token in `frontend/src/theme/tokens.js` and document drift that is intentionally preserved for future cleanup sessions.

---

## How to Read This Document

- **Tokenized** — value is captured in `tokens.js` with a semantic name. Call sites should use the token.
- **Drift** — value exists in the codebase but is NOT tokenized. It belongs to the migration backlog for v2.5.x call-site replacement. Do not add new uses of drift values.
- **Violation** — value is below an established floor (WCAG, design system rule). No new uses permitted; existing uses must be remediated before `ACCESSIBILITY_V1` goes GA.
- **Introduced as canonical** — token value did not previously exist as a stated convention. The token formalizes what should be used going forward.

---

## 1. Color Inventory — Hex Values

Recon method: PowerShell regex `#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b` across all source files.
Total distinct hex values found: **150+** (estimated; recon output truncated after ~60 entries).
Was estimated at 25–50 before audit. Actual scale is 3–6× worse than expected.

### 1.1 High-Frequency Values (≥5 occurrences)

| Hex | Count | Disposition | Token |
|-----|-------|-------------|-------|
| `#FFF` | 121x | Tokenized (alias) | `color.surface.card` / `color.text.onDark` |
| `#0F1F3D` | 63x | Tokenized | `color.brand.navy` |
| `#F5C842` | 59x | Tokenized | `color.brand.gold` |
| `#94A3B8` | 58x | Tokenized | `color.text.tertiary` / `color.border.strong` |
| `#64748B` | 46x | Tokenized | `color.text.secondary` |
| `#27AE60` | 40x | Tokenized | `color.status.success` |
| `#DC2626` | 32x | Tokenized | `color.status.error` |
| `#374151` | 31x | **Drift** | Tailwind gray-700 — competing ramp, see §1.3 |
| `#D4A017` | 26x | Tokenized | `color.status.warning` |
| `#475569` | 22x | **Drift** | slate-600 — in slate ramp but not tokenized; too close to `color.text.secondary` |
| `#2563EB` | 22x | Tokenized | `color.status.info` |
| `#555` | 22x | **Drift** | Shorthand for `#555555` — resolve to `color.text.secondary` at call sites |
| `#FFFFFF` | 21x | Tokenized (canonical) | `color.surface.card` / `color.text.onDark` (resolves both `#FFF` and `#FFFFFF`) |
| `#666666` | 20x | **Drift** | Near-gray; no clean semantic role |
| `#C8102E` | 19x | Tokenized | `color.brand.red` |
| `#16A34A` | 15x | **Drift** | Tailwind green-600 — near `color.status.success` but darker |
| `#E2E8F0` | 14x | Tokenized | `color.border.default` |
| `#2980B9` | 13x | **Drift** | Auth-screen blue — preserved, auth re-skin deferred |
| `#F5EFE4` | 13x | Tokenized | `color.surface.tableHeader` |
| `#6B7280` | 13x | **Drift** | Tailwind gray-500 — competing ramp, see §1.3 |
| `#9CA3AF` | 13x | Tokenized | `color.text.disabled` |
| `#0B1524` | 12x | Tokenized | `color.surface.dark` |
| `#CCC` | 12x | **Drift** | Shorthand for `#CCCCCC` — no semantic role |
| `#8E44AD` | 10x | **Drift** | Purple — likely Game Mode scoring; role unconfirmed |
| `#F9FAFB` | 10x | **Drift** | gray-50 — nearly identical to `color.surface.page` (#F8FAFC); collapsed |
| `#E5E7EB` | 10x | **Drift** | Tailwind gray-200 — competing ramp |
| `#E05C2A` | 9x | **Drift** | Orange — likely "out" state in scoring; no token until role confirmed |
| `#1D4ED8` | 9x | **Drift** | Tailwind blue-700 — auth/info adjacent |
| `#F8FAFC` | 9x | Tokenized | `color.surface.page` (slate-50) |
| `#92400E` | 8x | **Drift** | Tailwind amber-800 — warning text, overlaps `color.status.warning` role |
| `#2471A3` | 8x | **Drift** | Auth-screen blue variant |
| `#FCA5A5` | 8x | **Drift** | red-300 — error state tint, no token |
| `#6A7A9A` | 8x | **Drift** | Blue-gray, no clear semantic role |
| `#111827` | 7x | **Drift** | Tailwind gray-900 — near-black |
| `#1A3260` | 7x | **Drift** | Navy variant — drift from `color.brand.navy` |
| `#1E293B` | 7x | **Drift** | slate-800 — near `color.surface.dark` |
| `#6C757D` | 7x | **Drift** | Bootstrap-era muted gray |
| `#0F172A` | 7x | **Drift** | slate-900 — near `color.surface.dark` |
| `#D1D5DB` | 7x | **Drift** | Tailwind gray-300 — competing ramp |
| `#888` | 6x | **Drift** | Shorthand — no semantic role |
| `#B45309` | 6x | **Drift** | Tailwind amber-700 |
| `#E6A817` | 6x | **Drift** | Gold variant — near `color.brand.gold` but darker |
| `#FEE2E2` | 6x | Tokenized | `color.status.errorBg` |
| `#1B2A4A` | 6x | **Drift** | Navy variant |
| `#7A1A10` | 6x | **Drift** | Dark red — likely scoring/error state |
| `#F1F5F9` | 5x | **Drift** | slate-100 — between `surface.page` and `surface.card` |
| `#7F3F3F` | 5x | **Drift** | Muted dark red, no semantic role |
| `#6C3483` | 5x | **Drift** | Purple variant |
| `#7C3AED` | 5x | **Drift** | Violet — no role confirmed |
| `#555555` | 5x | **Drift** | 6-char version of `#555` shorthand |
| `#7F8C8D` | 5x | **Drift** | Muted blue-gray |
| `#F5A623` | 5x | **Drift** | Warm amber |
| `#239B56` | 5x | **Drift** | Green variant near `color.status.success` |
| `#1E8449` | 5x | **Drift** | Darker success green |
| `#AAA` | 5x | **Drift** | Shorthand — no semantic role |
| `#D97706` | 5x | **Drift** | Tailwind amber-600 |

**Long tail:** 100+ additional hex values appearing 1–4× each. All drift. Not listed individually — categories below.

### 1.2 Notable Drift Groups

**13 competing "dark navy" variants** (only `#0F1F3D` and `#0B1524` are tokenized):

| Hex | Occurrences | Notes |
|-----|-------------|-------|
| `#0F1F3D` | 63x | **Tokenized** → `color.brand.navy` |
| `#0B1524` | 12x | **Tokenized** → `color.surface.dark` |
| `#1A3260` | 7x | Drift |
| `#1E293B` | 7x | Drift (slate-800) |
| `#0F172A` | 7x | Drift (slate-900) |
| `#1B2A4A` | 6x | Drift |
| `#1A2F5E` | ~3x | Drift |
| `#1E3A5F` | ~2x | Drift |
| `#0A1628` | ~2x | Drift |
| `#0F1A2E` | ~2x | Drift |
| `#1A2A4A` | ~1x | Drift |
| `#1A2A3A` | ~1x | Drift |
| `#1A1A2E` | ~1x | Drift |

**Tailwind gray-500 ramp** (second palette competing with slate):

| Hex | Tailwind name | Occurrences |
|-----|--------------|-------------|
| `#374151` | gray-700 | 31x |
| `#6B7280` | gray-500 | 13x |
| `#9CA3AF` | gray-400 | 13x (**tokenized** → `color.text.disabled`) |
| `#E5E7EB` | gray-200 | 10x |
| `#D1D5DB` | gray-300 | 7x |

The slate ramp is the intended scale. The gray ramp is drift. Migrate toward the slate ramp at call sites in v2.5.x.

**3-character shorthand aliases** (should resolve to 6-char or tokens):

| Short | Long | Count |
|-------|------|-------|
| `#FFF` | `#FFFFFF` | 121x — **tokenized** |
| `#CCC` | `#CCCCCC` | 12x — drift |
| `#555` | `#555555` | 22x — drift |
| `#888` | `#888888` | 6x — drift |
| `#AAA` | `#AAAAAA` | 5x — drift |

**Auth-screen palette** (preserved, not tokenized — scheduled for auth re-skin):
`#2471A3`, `#2980B9`, `#1D4ED8` — auth UI blues that differ from `color.status.info`. The auth screens use a lighter, more accessible palette than the main app. Intentional divergence, not an oversight. Unify during the auth re-skin session.

### 1.3 Colors Intentionally Not Tokenized

| Color | Count | Reason |
|-------|-------|--------|
| `#DCFCE7` | 1x | successBg candidate — below 3x threshold; compose via `tint()` in v2.5.0 |
| `#F9FAFB` | 10x | Near-duplicate of `surface.page` (#F8FAFC, slate-50 vs gray-50); collapsed |
| Purple family (`#8E44AD`, `#6C3483`, `#7C3AED`) | ~20x | Role unconfirmed; likely Game Mode scoring UI |
| `#E05C2A` | 9x | Likely "out" scoring state; needs confirmation before tokenizing |
| Amber family (`#92400E`, `#B45309`, `#D97706`, `#F5A623`) | ~24x | Multiple amber values for warning; collapse to `color.status.warning` at call sites |

---

## 2. RGBA / Opacity Inventory

Recon method: PowerShell regex `rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)`.
Total distinct rgba values found: **150+** (audit output truncated after ~130 entries).

### 2.1 Top-Frequency Values

| Value | Count | Disposition | Token |
|-------|-------|-------------|-------|
| `rgba(255,255,255,0.08)` | 32x | Tokenized | `color.overlay.whiteFaint` |
| `rgba(15,31,61,0.15)` | 24x | Tokenized | `color.overlay.navyMedium` |
| `rgba(15,31,61,0.08)` | 23x | Tokenized | `color.overlay.navyFaint` / `color.border.subtle` |
| `rgba(15,31,61,0.04)` | 22x | Tokenized | `color.overlay.navyWash` |
| `rgba(255,255,255,0.06)` | 19x | **Drift** | Between `whiteFaint` (0.08) and nothing; opacity 0.06 not in reference scale |
| `rgba(15,31,61,0.06)` | 17x | **Drift** | Navy at opacity 0.06 — not in reference scale |
| `rgba(255,255,255,0.15)` | 16x | Tokenized | `color.overlay.whiteLight` |
| `rgba(255,255,255,0.04)` | 15x | **Drift** | White at opacity 0.04 — below reference scale floor |
| `rgba(15,31,61,0.1)` | 15x | **Drift** | Navy at opacity 0.10 — not in reference scale |
| `rgba(255,255,255,0.12)` | 13x | **Drift** | White at opacity 0.12 — not in reference scale |
| `rgba(15,31,61,0.2)` | 13x | **Drift** | Navy at opacity 0.20 — not in reference scale |
| `rgba(15,31,61,0.07)` | 10x | **Drift** | Navy at opacity 0.07 — fine-grained drift |
| `rgba(255,255,255,0.18)` | 10x | **Drift** | White at opacity 0.18 — not in reference scale |
| `rgba(245,200,66,0.4)` | 9x | Tokenized | `color.overlay.goldStrong` |
| `rgba(245,200,66,0.12)` | 9x | Tokenized | `color.overlay.goldTint` |

**Long tail (130+ additional values):** All drift. Primary sources of long-tail noise:
- Game Mode elements with per-element invented opacity values
- Status tints using colors not in the palette (rgba with non-brand base colors)
- One-off hover states and gradient stops

### 2.2 Pre-Mixed Overlay Tokens vs Opacity Reference Scale

Two separate token groups serve different purposes:

**`color.overlay.*`** — pre-mixed rgba strings for direct use in React inline styles. These are the empirical values found at high frequency. Consumers use them directly: `style={{ background: color.overlay.navyFaint }}`.

**`opacity.*`** — a normalized reference scale for the future `tint()` helper (v2.5.0). Not all opacity values in the codebase are in this scale; the scale defines what SHOULD be used going forward.

| Opacity value | Reference scale token | In color.overlay? |
|---|---|---|
| 0.04 | (not in scale — drift) | Yes — `navyWash` (empirical pre-mix) |
| 0.06 | `opacity.subtle` | No — drift; 36x combined |
| 0.07 | (not in scale — drift) | No |
| 0.08 | `opacity.faint` | Yes — `navyFaint`, `whiteFaint` |
| 0.10 | (not in scale — drift) | No — 15x; notable gap |
| 0.12 | (not in scale — drift) | No |
| 0.15 | `opacity.light` | Yes — `navyMedium`, `whiteLight` |
| 0.18 | (not in scale — drift) | No |
| 0.20 | (not in scale — drift) | No — 13x; notable gap |
| 0.25 | `opacity.medium` | No — gap-fill; no empirical source |
| 0.40 | `opacity.strong` | Yes — `goldStrong` |
| 0.80 | `opacity.overlay` | No — modal backdrops |
| 0.97 | (not in scale) | Yes — `backdrop` (near-opaque scrim) |

Note: `navyWash` uses opacity 0.04, which is not in the reference scale. The name reflects visual weight (barely-there navy), not alignment to `opacity.subtle` (0.06). This is intentional and documented here to prevent future confusion.

---

## 3. Spacing Inventory

Recon method: PowerShell regex on `padding: 'value'` and `margin: 'value'` in JS object style form. CSS-string padding was not captured (would be prohibitively noisy from App.jsx shorthand).

### 3.1 Top Padding Values (JS object form)

| Value | Count | Maps to space tokens | Notes |
|-------|-------|---------------------|-------|
| `8px 12px` | 26x | `space.sm` + `space.md` | Both on-scale |
| `10px 14px` | 25x | *(off-scale)* | 10px and 14px are half-steps; migrate toward `space.sm`/`space.md` |
| `4px 10px` | 16x | `space.xs` + *(off-scale)* | 10px is off-scale |
| `2px 8px` | 16x | *(off-scale)* + `space.sm` | 2px is below scale floor |
| `10px 12px` | 16x | *(off-scale)* + `space.md` | 10px is off-scale |
| `6px 8px` | 14x | *(off-scale)* + `space.sm` | 6px is half-step |
| `12px` | 14x | `space.md` | On-scale |
| `4px 6px` | 13x | `space.xs` + *(off-scale)* | 6px is half-step |
| `16px` | 13x | `space.lg` | On-scale |
| `6px 12px` | 12x | *(off-scale)* + `space.md` | 6px is half-step |

**Observation:** Only ~30% of the top-10 compound padding values map cleanly to the 4px scale. The three most common off-scale values are `6px` (half-step), `10px` (2.5-step), and `14px` (3.5-step). These form a secondary "5px-based" pattern in the UI — likely from early design decisions that predated any scale convention.

### 3.2 Margin Values (JS object form)

| Value | Count | Notes |
|-------|-------|-------|
| `0 auto` | 6x | Centering pattern — no token needed |
| `2px` | 2x | Below scale floor |
| `0` | 2x | `space.zero` |
| `4px 0 0` | 2x | `space.xs` top only |

Margin usage is sparse in JS form (most margin is set via CSS shorthand or gap). Low-risk area for v2.5.x.

### 3.3 Space Token Coverage

| Token | Value | Maps to padding pattern |
|-------|-------|------------------------|
| `space.zero` | `'0'` | `margin: 0` (2x) |
| `space.xs` | `'4px'` | Component of `4px 10px` (16x), `4px 6px` (13x) |
| `space.sm` | `'8px'` | Component of `8px 12px` (26x) — most common compound |
| `space.md` | `'12px'` | Component of `8px 12px`, `12px` standalone |
| `space.lg` | `'16px'` | `16px` standalone (13x) |
| `space.xl` | `'20px'` | Less frequent in audit; present in layout spacing |
| `space.xl2` | `'24px'` | Layout spacing |
| `space.xl3` | `'32px'` | Section spacing |
| `space.xl4` | `'40px'` | Large layout gaps |
| `space.xl5` | `'48px'` | Page-level padding |

**Drift not tokenized:** `2px`, `6px`, `10px`, `14px`, `18px` — all off-scale half-steps or below-floor values. 120+ distinct compound padding strings. Migrate toward nearest scale value at call sites in v2.5.x.

---

## 4. Font Usage Inventory

### 4.1 Font Sizes

Recon method: PowerShell regex on `fontSize: 'NNpx'` (JS object form). CSS-string `font-size` returned empty — all `fontSize` usage is JS object form.

| Value | Count | Disposition | Token |
|-------|-------|-------------|-------|
| `7.5px` | 2x | **VIOLATION** — below WCAG floor | Not tokenized |
| `9px` | 32x | **VIOLATION** — below WCAG floor | Not tokenized |
| `9.5px` | 2x | **VIOLATION** — below WCAG floor | Not tokenized |
| `10px` | 146x | **Near-floor** — migration backlog | Not tokenized |
| `10` (bare) | 2x | Unit drift + near-floor | Not tokenized |
| `11px` | 137x | Tokenized | `font.size.xs` |
| `11` (bare) | 7x | **Unit drift** — add `'px'` suffix | Not tokenized |
| `12px` | 127x | Tokenized | `font.size.sm` |
| `12` (bare) | 6x | **Unit drift** | Not tokenized |
| `13px` | 105x | Tokenized | `font.size.body` |
| `13` (bare) | 2x | **Unit drift** | Not tokenized |
| `14px` | 79x | Tokenized | `font.size.md` |
| `14` (bare) | 1x | **Unit drift** | Not tokenized |
| `15px` | 28x | **Drift** — off-scale | Not tokenized |
| `16px` | 29x | Tokenized | `font.size.lg` |
| `17px` | 8x | **Drift** — off-scale | Not tokenized |
| `18px` | 26x | Tokenized | `font.size.xl` |
| `19px` | 3x | **Drift** — off-scale | Not tokenized |
| `20px` | 12x | **Drift** — off-scale | Not tokenized |
| `22px` | 13x | Tokenized | `font.size.xl2` |
| `24px` | 4x | **Drift** — off-scale | Not tokenized |
| `26px` | 2x | **Drift** — off-scale | Not tokenized |
| `28px` | 1x | **Drift** — collapsed into `font.size.xl3` (32px) | Not tokenized |
| `32px` | 7x | Tokenized | `font.size.xl3` |
| `36px` | 3x | Tokenized | `font.size.display` |
| `40px` | 1x | **Drift** — off-scale | Not tokenized |
| `48px` | 2x | **Drift** — off-scale | Not tokenized |
| `0.75rem` | 1x | **Unit drift** — rem in a px-dominant codebase | Not tokenized |
| `0.875rem` | 1x | **Unit drift** | Not tokenized |
| `0.95rem` | 1x | **Unit drift** | Not tokenized |
| `1em` | 1x | **Unit drift** | Not tokenized |

**WCAG violation note:** `9px`, `9.5px`, `7.5px` are definitively below any reasonable accessibility floor (WCAG 2.1 SC 1.4.4 requires text to be resizable to 200% without loss of content; practically, below 11px is inaccessible for most users). These 36 occurrences must be remediated before `ACCESSIBILITY_V1` can be promoted from opt-in to baseline. The `10px` (146 occurrences) is a near-floor violation — not a hard WCAG failure but a UX accessibility concern and migration priority.

**10px migration note:** 10px is the single most common `fontSize` value in the codebase (146x). It was not tokenized because tokenizing it would freeze a near-floor value that the accessibility roadmap requires remediating. The 146 call sites are the v2.5.x migration backlog. Each call site should be evaluated: either migrate to `font.size.xs` (11px) or, where the content genuinely needs the compact size (e.g., scoreboard pip labels), flag for accessibility review.

### 4.2 Font Weights

Font weight was not explicitly captured by the recon script. Based on visual review of App.jsx patterns, the observed weight values are 400, 500, 600, 700 — mapping cleanly to the token scale (regular/medium/semibold/bold). No anomalous weights detected.

### 4.3 Font Families

| Value found | Count | Disposition | Token |
|-------------|-------|-------------|-------|
| `Georgia,serif` | 58x | Tokenized (canonical resolves this) | `font.family.serif` |
| `inherit` | 52x | **Drift** — browser default; resolves to `font.family.sans` once primitives consume it | Not tokenized |
| `Georgia,'Times New Roman',serif` | 15x | Tokenized (canonical form) | `font.family.serif` |
| `Georgia, serif` | 5x | Tokenized (extra space drift) | `font.family.serif` |
| `monospace` | 2x | Tokenized | `font.family.mono` |

**`font.family.sans` introduction note:** No global `font-family` declaration exists in `frontend/index.html` or `frontend/src/index.css` (confirmed by grep returning empty for both). The 52 `inherit` occurrences in App.jsx fall back to the browser's default sans-serif stack today (varies by browser and OS). `font.family.sans` is introduced as canonical:

```
-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
```

This token defines what `inherit` will resolve to once component primitives consume it. It is not retroactively applied to existing call sites in this PR.

---

## 5. Border-Radius Inventory

Recon method: PowerShell regex on `borderRadius: 'value'` (JS object form).

| Value | Count | Disposition | Token |
|-------|-------|-------------|-------|
| `8px` | 91x | Tokenized | `radius.md` — dominant value |
| `10px` | 77x | **Drift** | Between `md` (8px) and `lg` (12px); no clean semantic role; migrate toward `radius.md` at call sites |
| `6px` | 51x | Tokenized | `radius.sm` — more common than expected; earns a named token |
| `4px` | 21x | Tokenized | `radius.xs` |
| `12px` | 15x | Tokenized | `radius.lg` |
| `50%` | 15x | Tokenized | `radius.circle` — avatar/icon circles |
| `5px` | 8x | **Drift** — off-scale | Not tokenized |
| `16px` | 7x | **Drift** — off-scale | Not tokenized |
| `16px 16px 0 0` | 7x | **Drift** — composition pattern | Not tokenized; encode inside future `<BottomSheet>` primitive using `radius.lg` |
| `20px` | 7x | **Drift** — off-scale | Not tokenized |
| `14px` | 6x | **Drift** — off-scale | Not tokenized |
| `6` (bare) | 4x | **Unit drift** | Not tokenized |
| `9999px` | 4x | Tokenized (canonical) | `radius.pill` |
| `7px` | 5x | **Drift** — off-scale | Not tokenized |
| `2px` | 3x | **Drift** — below scale floor | Not tokenized |
| `999px` | 2x | **Drift** — pill alias | Unify to `radius.pill` at call sites |
| `4` (bare) | 2x | **Unit drift** | Not tokenized |
| `9px` | 2x | **Drift** — off-scale | Not tokenized |
| `8` (bare) | 2x | **Unit drift** | Not tokenized |
| `99px` | 1x | **Drift** — pill alias | Unify to `radius.pill` at call sites |
| `0 6px 6px 0` | 1x | **Drift** — one-off composition | Not tokenized |
| `0 0 8px 8px` | 1x | **Drift** — one-off composition | Not tokenized |
| `1px` | 1x | **Drift** — micro-radius | Not tokenized |
| `3px` | 1x | **Drift** — off-scale | Not tokenized |
| `5` (bare) | 1x | **Unit drift** | Not tokenized |

**Pill pattern fragmentation:** The concept "pill-shaped fully-rounded element" is encoded four different ways: `9999px` (4x), `999px` (2x), `99px` (1x), and `50%` (15x — but 50% is actually `radius.circle`, not pill). The canonical token is `radius.pill = '9999px'`. All `999px` and `99px` call sites should unify to `radius.pill` at v2.5.x.

**Bottom-sheet composition pattern (`16px 16px 0 0`, 7x):** This rounds only the top-left and top-right corners — a standard bottom-sheet treatment. It is a composition of `radius.lg` applied directionally, not a primitive radius value. The future `<BottomSheet>` component will own this pattern internally. Do not add new raw `'16px 16px 0 0'` values to inline styles.

---

## 6. Shadow Inventory

**Phase 1c addendum (2026-05-03).** Fresh recon replaced the v2.4.1 placeholder. 25 occurrences surveyed across App.jsx and extracted components. The prior "16 distinct values, v2.4.1 backlog" count was from a summarized pass — this recon is authoritative.

### Naming rationale — semantic vs. size-based

A size-based scale (`sm`/`md`/`lg`) was considered and rejected. `shadow.card` is a compound two-layer value — `'0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)'` — qualitatively different from single-layer shadows. It is not a "bigger" version of `shadow.subtle`. No sensible linear progression runs through these values. Semantic naming is mandatory.

### Tokens extracted (Phase 1c — Commit A)

Four tokens defined in `frontend/src/theme/tokens.js`:

- **`shadow.subtle`** — `'0 1px 4px rgba(15,31,61,0.06)'` — Navy-tinted minimal lift. 1x in FairnessCheck.jsx. Consistent with the `color.overlay` navy tint family.
- **`shadow.card`** — `'0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)'` — Compound two-layer card elevation. 3x across three auth screens (LoginScreen, PendingApprovalScreen, RequestAccessScreen) — all three used the identical literal.
- **`shadow.elevated`** — `'0 4px 12px rgba(0,0,0,0.12)'` — **RESERVED.** No in-scope component migrated today. Established as canonical for App.jsx dropdowns and elevated panels. Migration deferred to v2.5.x when App.jsx is unlocked. Follows `font.family.sans` "introduced as canonical" precedent.
- **`shadow.overlay`** — `'0 4px 12px rgba(0,0,0,0.35)'` — Heavy float layer. 1x in Toast.jsx.

### Call-site migration (Phase 1c — Commit B)

Five in-scope component files migrated:

| File | Token |
|------|-------|
| `frontend/src/components/Auth/LoginScreen.jsx` | `shadow.card` |
| `frontend/src/components/Auth/PendingApprovalScreen.jsx` | `shadow.card` |
| `frontend/src/components/Auth/RequestAccessScreen.jsx` | `shadow.card` |
| `frontend/src/components/GameDay/FairnessCheck.jsx` | `shadow.subtle` |
| `frontend/src/components/ui/Toast.jsx` | `shadow.overlay` |

App.jsx call sites are locked (v2.5.x migration).

### Not tokenized — deferred drift

**Brand-color tinted shadows (~4x App.jsx):** Gold and orange button variants with tinted shadows. Call-site-specific; deferred to a `tint()` helper or per-variant button primitive in v2.5.x.

**LockFlow.jsx upward directional shadow (1x):** `'0 -4px 24px rgba(0,0,0,0.18)'` — negative Y offset on a bottom-sheet footer. Composition pattern scoped to `<BottomSheet>` primitive; deferred to v2.5.0.

### Open question — tooltip shadow mismatch

App.jsx contains one tooltip-style value: `boxShadow: '0 4px 24px rgba(0,0,0,0.3)'`. This differs from `shadow.overlay` on two axes: blur radius (24px vs. 12px) and alpha (0.30 vs. 0.35).

This decision should not be auto-resolved during v2.5.x's call-site migration. The 24px-vs-12px blur difference is visually noticeable on a tooltip; resolution requires either confirming intentional drift (introduce `shadow.tooltip`) or confirming accidental drift (migrate to `shadow.overlay`, accept visual change). Pull this question forward as an explicit gate when the v2.5.x session begins.

---

## 7. Token Mapping Table

Complete traceability: every token in `frontend/src/theme/tokens.js` mapped to its audit source.

### color.brand

| Token | Value | Occurrences | Source |
|-------|-------|-------------|--------|
| `color.brand.navy` | `#0F1F3D` | 63x | Dominant header/nav/card background across App.jsx |
| `color.brand.gold` | `#F5C842` | 59x | Primary accent — badges, CTAs, bottom nav active state |
| `color.brand.red` | `#C8102E` | 19x | Brand red, jersey-style; intentionally ≠ `status.error` |

### color.surface

| Token | Value | Occurrences | Source |
|-------|-------|-------------|--------|
| `color.surface.page` | `#F8FAFC` | 9x | App page background (slate-50); `#F9FAFB` (10x, gray-50) collapsed here |
| `color.surface.card` | `#FFFFFF` | 142x combined | Resolves `#FFF` (121x) + `#FFFFFF` (21x) → single canonical 6-char value |
| `color.surface.dark` | `#0B1524` | 12x | Game Mode header gradient, deepest navy surface |
| `color.surface.tableHeader` | `#F5EFE4` | 13x | Table `thead` row band confirmed: Defense grid, Batting/Scoring grids (App.jsx), DefenseDiamond.jsx |

### color.text

| Token | Value | Occurrences | Source |
|-------|-------|-------------|--------|
| `color.text.primary` | `#0F1F3D` | (alias of brand.navy) | Primary text on light surfaces — same value, semantic alias |
| `color.text.secondary` | `#64748B` | 46x | slate-500, muted body text |
| `color.text.tertiary` | `#94A3B8` | 58x | slate-400, placeholder/caption text |
| `color.text.onDark` | `#FFFFFF` | 142x combined | All `#FFF` on dark surfaces |
| `color.text.disabled` | `#9CA3AF` | 13x | gray-400, disabled UI states |

### color.status

| Token | Value | Occurrences | Source |
|-------|-------|-------------|--------|
| `color.status.success` | `#27AE60` | 40x | Primary success green |
| `color.status.warning` | `#D4A017` | 26x | Dark amber warning; intentionally ≠ `brand.gold` (#F5C842) — different visual weight |
| `color.status.error` | `#DC2626` | 32x | Tailwind red-600, alert/error UI; intentionally ≠ `brand.red` (#C8102E) |
| `color.status.errorBg` | `#FEE2E2` | 6x | red-50, error chip and alert backgrounds |
| `color.status.info` | `#2563EB` | 22x | Tailwind blue-600, informational UI elements |

### color.border

| Token | Value | Occurrences | Source |
|-------|-------|-------------|--------|
| `color.border.subtle` | `rgba(15,31,61,0.08)` | 23x | Faint navy tint, card dividers on light surfaces |
| `color.border.default` | `#E2E8F0` | 14x | slate-200, standard dividers and outlines |
| `color.border.strong` | `#94A3B8` | selective | Visible borders, input outlines, focus rings |

### color.overlay

| Token | Value | Occurrences | Source |
|-------|-------|-------------|--------|
| `color.overlay.navyWash` | `rgba(15,31,61,0.04)` | 22x | Barely-there navy wash; opacity 0.04 is not in reference scale (drift), but value is real |
| `color.overlay.navyFaint` | `rgba(15,31,61,0.08)` | 23x | Card hover tints, subtle fills |
| `color.overlay.navyMedium` | `rgba(15,31,61,0.15)` | 24x | Mid-weight overlays, border tints |
| `color.overlay.whiteFaint` | `rgba(255,255,255,0.08)` | 32x | Lighten elements on dark surfaces |
| `color.overlay.whiteLight` | `rgba(255,255,255,0.15)` | 16x | On-dark borders, subtle highlights |
| `color.overlay.goldTint` | `rgba(245,200,66,0.12)` | 9x | Gold-tinted section backgrounds |
| `color.overlay.goldStrong` | `rgba(245,200,66,0.40)` | 9x | Gold wash for selected/active states |
| `color.overlay.backdrop` | `rgba(5,10,25,0.97)` | — | Modal and bottom-sheet near-opaque scrim |

### opacity

| Token | Value | Combined occurrences | Source |
|-------|-------|---------------------|--------|
| `opacity.subtle` | `0.06` | 36x (navy + white combined) | Anchor for "barely visible"; replaces 0.04 as scale floor |
| `opacity.faint` | `0.08` | 55x | Most common single opacity value in codebase |
| `opacity.light` | `0.15` | 40x | — |
| `opacity.medium` | `0.25` | — | Gap-fill between `light` and `strong`; no direct audit source |
| `opacity.strong` | `0.40` | 18x | Gold tints |
| `opacity.overlay` | `0.80` | — | Modal backdrops (derived from common pattern) |

### space

| Token | Value | Most common use in audit |
|-------|-------|------------------------|
| `space.zero` | `'0'` | `margin: 0` |
| `space.xs` | `'4px'` | Component of `4px 10px` (16x), `4px 6px` (13x) |
| `space.sm` | `'8px'` | Component of `8px 12px` (26x, most common compound padding) |
| `space.md` | `'12px'` | `12px` standalone (14x), `8px 12px` compound |
| `space.lg` | `'16px'` | `16px` standalone (13x) |
| `space.xl` | `'20px'` | Layout spacing |
| `space.xl2` | `'24px'` | Layout spacing |
| `space.xl3` | `'32px'` | Section spacing |
| `space.xl4` | `'40px'` | Large layout gaps |
| `space.xl5` | `'48px'` | Page-level padding |

### radius

| Token | Value | Occurrences | Source |
|-------|-------|-------------|--------|
| `radius.xs` | `'4px'` | 21x | — |
| `radius.sm` | `'6px'` | 51x | More common than expected; earns a named token |
| `radius.md` | `'8px'` | 91x | Dominant value across the codebase |
| `radius.lg` | `'12px'` | 15x | — |
| `radius.pill` | `'9999px'` | 7x combined | Unifies `9999px` (4x) + `999px` (2x) + `99px` (1x) |
| `radius.circle` | `'50%'` | 15x | Avatar and icon circles |

### font.family

| Token | Value | Source |
|-------|-------|--------|
| `font.family.serif` | `"Georgia,'Times New Roman',serif"` | Canonical form; resolves `Georgia,serif` (58x) + `Georgia, serif` (5x) + truncated `Georgia,` (15x) |
| `font.family.sans` | `"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"` | **Introduced as canonical** — no prior global `font-family` in `index.html` or `index.css` |
| `font.family.mono` | `'monospace'` | 2x — too few to drift; one line prevents a third informal value appearing |

### font.size

| Token | Value | Occurrences | Source |
|-------|-------|-------------|--------|
| `font.size.xs` | `'11px'` | 137x | Chip labels, secondary stats |
| `font.size.sm` | `'12px'` | 127x | Small body text |
| `font.size.body` | `'13px'` | 105x | Primary body text |
| `font.size.md` | `'14px'` | 79x | Readable body, form labels |
| `font.size.lg` | `'16px'` | 29x | Section headers |
| `font.size.xl` | `'18px'` | 26x | Card titles |
| `font.size.xl2` | `'22px'` | 13x | Screen titles (`2xl` renamed to `xl2` for JS dot-access) |
| `font.size.xl3` | `'32px'` | 7x | Hero numbers (`3xl` renamed; `28px` at 1x collapsed here) |
| `font.size.display` | `'36px'` | 3x | Display / splash numbers |

### font.weight

| Token | Value | Source |
|-------|-------|--------|
| `font.weight.regular` | `400` | Standard body text |
| `font.weight.medium` | `500` | Semi-emphasized labels |
| `font.weight.semibold` | `600` | Headers, emphasized labels |
| `font.weight.bold` | `700` | Strong emphasis, brand elements |

### font.letterSpacing

| Token | Value | Source |
|-------|-------|--------|
| `font.letterSpacing.tight` | `'-0.01em'` | Player names, serif display text |
| `font.letterSpacing.normal` | `'0'` | Body text |
| `font.letterSpacing.wide` | `'0.06em'` | Uppercase chrome labels (INNING, BALLS, OUTS, etc.) |

### zIndex

| Token | Value | Source |
|-------|-------|--------|
| `zIndex.header` | `100` | Sticky top chrome |
| `zIndex.navBar` | `200` | Bottom navigation bar |
| `zIndex.subTab` | `300` | Sub-navigation strips |
| `zIndex.dropdown` | `400` | Dropdowns, popovers |
| `zIndex.modalBackdrop` | `500` | Overlay scrim |
| `zIndex.modal` | `600` | Modal and sheet content |
| `zIndex.toast` | `700` | Toast notifications — must clear everything |

**zIndex introduction note:** No prior zIndex scale existed in the codebase (confirmed by absence of a centralized zIndex registry). Values are introduced as canonical based on layering intent. Confirm at call sites during v2.5.0 primitive work.

### shadow

| Token | Value | Occurrences | Source |
|-------|-------|-------------|--------|
| `shadow.subtle` | `'0 1px 4px rgba(15,31,61,0.06)'` | 1x | FairnessCheck.jsx — navy-tinted minimal lift |
| `shadow.card` | `'0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)'` | 3x | Auth screens (LoginScreen, PendingApproval, RequestAccess) — compound two-layer |
| `shadow.elevated` | `'0 4px 12px rgba(0,0,0,0.12)'` | — | **Reserved** — App.jsx dropdowns and elevated panels; migration deferred to v2.5.x |
| `shadow.overlay` | `'0 4px 12px rgba(0,0,0,0.35)'` | 1x | Toast.jsx — heavy float layer |

**shadow introduction note:** Size-based naming (`sm`/`md`/`lg`) was rejected — `shadow.card` is a compound two-layer value, not a "bigger" version of `shadow.subtle`. `shadow.elevated` is introduced as canonical with no in-scope migration today, parallel to `font.family.sans`. App.jsx call sites migrate in v2.5.x when App.jsx is unlocked.

---

## 8. Drift Flags

Everything in this table is intentionally NOT tokenized. It belongs to the v2.5.x call-site replacement backlog.

| Category | What | Count | Disposition |
|----------|------|-------|-------------|
| **Navy variants** | 13 distinct dark-navy hex values beyond `#0F1F3D` and `#0B1524` | ~80x combined | Migrate to `color.brand.navy` or `color.surface.dark` |
| **Gray-500 ramp** | `#374151`, `#6B7280`, `#E5E7EB`, `#D1D5DB` | ~61x | Competing Tailwind gray ramp; migrate to slate ramp |
| **3-char shortcuts** | `#555`, `#888`, `#CCC`, `#AAA` | ~62x | Resolve to 6-char equivalents or tokens |
| **Purple family** | `#8E44AD`, `#6C3483`, `#7C3AED` | ~20x | Role unconfirmed (Game Mode scoring?); no token until confirmed |
| **Orange** | `#E05C2A` | 9x | Likely "out" scoring state; confirm before tokenizing |
| **Amber warning family** | `#92400E`, `#B45309`, `#D97706`, `#F5A623` | ~24x | Multiple amber values; collapse to `color.status.warning` |
| **Auth-screen blues** | `#2471A3`, `#2980B9`, `#1D4ED8` | ~21x | Auth screen drift; preserve until auth re-skin |
| **surface.page near-dupe** | `#F9FAFB` (gray-50) | 10x | Collapsed to `surface.page` (#F8FAFC); call sites → `color.surface.page` |
| **successBg candidate** | `#DCFCE7` | 1x | Below 3x threshold; compose via `tint()` in v2.5.0 |
| **rgba long tail** | Opacity 0.06, 0.07, 0.10, 0.12, 0.18, 0.20 per-color mixes | 130+x | Only top-8 pre-mixed in `color.overlay`; remainder → drift |
| **WCAG violations** | `9px`, `9.5px`, `7.5px` | ~36x | Must remediate before `ACCESSIBILITY_V1` GA |
| **Near-floor font size** | `10px` | 146x | Near-WCAG-floor; v2.5.x migration backlog |
| **Off-scale font sizes** | `15/17/19/20/24/26/28px` | ~56x | Migrate to nearest token at call sites |
| **Font unit drift** | Bare numeric `fontSize: 10/11/12/13/14` | ~18x | Add `'px'` suffix at call sites |
| **Rem/em font sizes** | `0.75rem`, `0.875rem`, `0.95rem`, `1em` | ~4x | Convert to px equivalents at call sites |
| **Font family drift** | `'Georgia, serif'`, `'Georgia,'`, `'inherit'` | ~67x | Resolve to `font.family.serif` / `font.family.sans` at call sites |
| **Radius between-scale** | `10px` (77x), `5/7/9/14/16/20px` | ~120x | Migrate to `radius.md` or `radius.lg` at call sites |
| **Radius bare numbers** | `4`, `5`, `6`, `8` (no unit) | ~11x | Add `'px'` suffix at call sites |
| **Radius compositions** | `'16px 16px 0 0'`, `'0 6px 6px 0'`, `'0 0 8px 8px'` | ~9x | Compose from tokens in future primitives |
| **Radius pill aliases** | `999px`, `99px` | ~3x | Unify to `radius.pill` (9999px) at call sites |
| **Space half-steps** | `6px`, `10px`, `14px` | many | Between 4px scale steps; migrate to nearest |
| **Compound padding** | 120+ distinct two-axis strings | 120+x | Normalize at call sites in v2.5.x |
| **Shadows** | Brand-color tinted shadows (~4x App.jsx); LockFlow.jsx upward directional (`'0 -4px 24px rgba(0,0,0,0.18)'`, 1x); App.jsx tooltip (`'0 4px 24px rgba(0,0,0,0.3)'`, 1x — open question, see §6) | ~6x | Call-site migration deferred to v2.5.x; tooltip drift requires explicit resolution before migration |

---

## A. Concrete Drift Examples Surfaced During Audit

### A.1 — Duplicate `fontSize` Key in LockFlow.jsx (Build Warning) — ✅ FIXED (v2.8.4 Phase 3 primitives migration)

> **Corrected 2026-08-04.** No longer a live bug. `LockFlow.jsx` was migrated onto
> the `Text` primitive as part of the v2.8.4 Phase 3 primitives work — confirmed
> directly: the div this section describes is now `<Text as="div" uppercase
> style={{ fontSize:"10px", color:textMuted, marginBottom:"6px",
> letterSpacing:"0.05em" }}>` (line 129) — a single `fontSize` key, matching
> exactly the "why tokens + primitives prevent it" mechanism this section already
> predicted. **(develop only as of this writing — main is still v2.8.3; this fix
> has not yet promoted.)** Kept below as the historical illustration of why
> primitives matter — no longer describes a live defect.

**File:** `frontend/src/components/GameDay/LockFlow.jsx`
**Line:** 130 (historical — pre-migration)

**Build warning (verbatim):**
```
[plugin vite:esbuild] src/components/GameDay/LockFlow.jsx:
Duplicate key "fontSize" in object literal

128|          </div>
129|          <div style={{ background:"rgba(15,31,61,0.04)", border:"1px solid rgba(15,31,61,0.1)", borderRadius:"10px", padding:"14px", marginBottom:"18px" }}>
130|            <div style={{ fontSize:"13px", color:textMuted, marginBottom:"6px", letterSpacing:"0.05em", textTransform:"uppercase", fontSize:"10px" }}>
   |                                                                                                                                   ^
131|              You are about to lock the lineup for
```

**What happened:** Two `fontSize` properties were written in the same inline style object. JavaScript silently takes the last value (`"10px"`), discarding `"13px"`. The element renders at 10px — a near-WCAG-floor violation — instead of the intended 13px (`font.size.body`).

**Why this class of bug exists:** Without a primitive layer, every styled element is an ad-hoc object literal. There is no enforcement mechanism to prevent duplicate keys. Long style objects written over multiple editing sessions accumulate these errors invisibly because JavaScript (and Vite, until a build warning was added in recent esbuild versions) does not error on duplicate keys.

**Why tokens + primitives prevent it:** A `<Text size="body" transform="uppercase" spacing="wide" />` primitive owns the `fontSize` prop. There is no object literal at the call site — the consumer cannot produce a duplicate key because they don't write style objects at all. The primitive maps `size` to `font.size.body` internally, once, in one place.

**Backlog disposition (historical):** Was tracked for v2.5.x call-site replacement. **Resolved via the v2.8.4 Phase 3 primitives migration** (see correction note above) — the component now renders via `<Text>`, eliminating the duplicate-key class of bug entirely rather than patching the one instance.

Also note: the inline style on line 130 contains several drift values that will resolve automatically once a `<Text>` primitive is in place:
- `rgba(15,31,61,0.04)` → `color.overlay.navyWash`
- `rgba(15,31,61,0.1)` → drift (opacity 0.10 not in reference scale)
- `borderRadius:"10px"` → drift (between `radius.md` and `radius.lg`)
- `padding:"14px"` → drift (off-scale half-step)
- `letterSpacing:"0.05em"` → close to `font.letterSpacing.wide` (0.06em) but not equal

This one div is a microcosm of the full drift inventory.

---

## B. Pipeline / Tooling Observations

### B.1 — ESLint Configuration Missing from Repository — ✅ RESOLVED (Story 77, v2.5.23)

> **Corrected 2026-08-04.** This finding is fully obsolete. `frontend/.eslintrc.cjs`
> exists and is tracked. Live re-run of `npm run lint` (`eslint src --ext .js,.jsx
> --max-warnings 0`) from `frontend/`: **exit code 0, zero output** — 0 errors, 0
> warnings. Story 77 (v2.5.23, 2026-05-30, PRs #237/#244/#245) closed this gap
> with a 5-phase cleanup (~650 net lines removed from App.jsx). Kept below as
> historical record of the original finding; do not treat as a current gap.

**Finding (historical, 2026-05-01):** `git ls-files | grep -i eslint` returned empty. No `.eslintrc`, `eslint.config.js`, `.eslintrc.cjs`, or equivalent was tracked in the repository. The `npm run lint` script in `frontend/package.json` failed with:

```
ESLint couldn't find a configuration file.
ESLint looked for configuration files in frontend/src and its ancestors.
```

**Confirmed pre-existing (at the time):** This gap predated the design tokens work. The ESLint packages (`eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`) were present in `devDependencies` and the lint script was defined, but the configuration had never been committed — or was lost at some point and never restored.

**Impact (at the time):** `npm run lint` (referenced in `CLAUDE.md` and the pre-deploy checklist) failed on a fresh clone or in any worktree. The lint step of Step B of the originating session was skipped on this basis.

### B.2 — Vitest Fork Pool Worker Timeouts on Windows (Missing-Module Shape)

**Finding:** On Windows with `singleFork: true` in `vite.config.js`, importing a module that does not exist does not produce a clean `Cannot find module` resolution error. Instead, the Vitest fork pool worker hangs for 60 seconds and then emits:

```
Error: [vitest-pool-runner]: Timeout waiting for worker to respond
Test Files  no tests
     Tests  no tests
    Errors  1 error
  Duration  60.44s (transform 0ms, setup 0ms, import 0ms, tests 0ms)
```

**Why this matters for RED → GREEN discipline:** The expected RED shape for a missing module is a stack-traced import error followed by all tests listed as failed. The actual RED shape on Windows is a 60-second timeout with zero test output. Both are unambiguously RED (0 tests pass), but the shape difference could mislead a developer who expects the conventional error form.

**Already documented:** This behavior is a variation of the cold-start OOM cascade documented in `CLAUDE.md` under "Known issue: Windows Vitest cold-start OOM." Future RED state expectations on Windows should account for the timeout shape.

**Mitigation for filtered test runs:** Run the full `npm test` suite once first to warm the module cache. Subsequent filtered runs (`npm test -- theme.tokens`) complete in ~13 seconds. The full suite will OOM-cascade on Windows if RAM is constrained (this is expected and documented in `CLAUDE.md`).

---

## C. Test Coverage Notes

### C.1 — 21 Proposed Assertions → 27 Test Calls

The approved test proposal listed 21 numbered shape assertions. The implemented test file contains 27 `test()` calls. The delta is entirely accounted for by splitting assertions into finer-grained tests, not by adding new coverage.

**Splits and rationale:**

| Proposed assertion | Tests created | Reason for split |
|---|---|---|
| #2 — top-level groups present + shadow absent | `1.2` + `1.3` | Presence and absence are independent claims; a failure on one shouldn't mask the other |
| #4 — color.brand hex check | `2.2` + `3.1` | `2.2` checks presence + format together; `3.1` sweeps all values with `Object.values()` — different assertions |
| #17 — zIndex keys + ordering | `6.1` + `6.2` | Key existence and ordering invariant are separable; ordering can fail even when keys exist |
| #18 — hex format for brand/surface/text/errorBg | `3.1` + `3.2` + `3.3` + `3.4` | Each group is a separate `Object.values()` sweep; splitting isolates which group breaks on failure |

All other proposed assertions became exactly one `test()` call.

### C.2 — Test 7.3 (Unapproved Addition, Approved Post-Hoc)

```js
test('7.3: other named exports resolve (opacity, space, radius, font, zIndex)', function () {
  expect(opacity).toBeDefined();
  expect(space).toBeDefined();
  expect(radius).toBeDefined();
  expect(font).toBeDefined();
  expect(zIndex).toBeDefined();
});
```

The approved barrel assertions (#20, #21) only verified `color` and `tokens.color.brand.navy`. A barrel could silently export only `color` and `tokens` and both tests would pass. Test 7.3 covers the gap: it verifies that the other five named convenience exports (`opacity`, `space`, `radius`, `font`, `zIndex`) also resolve from `theme/index.js`. Added on initiative, surfaced before merge, approved by KK.

### C.3 — What Is Not Tested

The shape tests intentionally do not assert specific values. `tokens.color.brand.navy` could change from `#0F1F3D` to any other hex string and all 27 tests would still pass. This is correct behavior — the token system's value is in the semantics (the name), not the specific hex. Value changes are a `DESIGN_AUDIT.md` update, not a code regression.

Specific values are anchored in this document (§7, Token Mapping Table). The combination of shape tests + this audit doc provides the full contract: tests guarantee the shape exists; the audit doc provides the provenance for the values.

## Legacy `C` Object — App.jsx Disposition (Story 109 / Issue #294)

**Recon date:** 2026-06-08 (T2 UX track)
**Status:** Decision recorded — migration deferred, multi-branch. **Update 2026-08-01 (Story 110 / #296):** all 8 DIVERGENT/ORPHAN keys resolved — see per-key disposition table below. `tokens.js` updated with provenance; no App.jsx edits (per #296's own scope). #296 was briefly, accidentally auto-closed by PR #298 on 2026-06-08 (GitHub's closing-keyword parser matched the substring "close #296" inside a sentence that read "does NOT close #296/#297" — negation isn't parsed) and has been reopened; the decisions below were never actually made until now. **Update 2026-08-02 (sweep-scoping session):** re-verified everything below against the *current* `App.jsx`, not the April 30 recon snapshot. Two corrections: (1) the "20 keys" figure was right but this table only ever disposed 19 of them — `cream` was never audited at all, filed as **Story 113 / #496**; (2) real call-site count today is **310, not 437** (App.jsx has shrunk via Stories 87/92/93/94/77 since the original audit — genuinely less remaining work, not a miscount). Also: `text`'s token-layer decision (Story 110, resolved) and its App.jsx call-site risk are two different things — the latter is now its own verification story, **Story 114 / #497**, because App.jsx's own root render node sets `color:C.text` directly (confirmed at the literal root `<div>` App returns, not just the `S.app` style constant) — a region slice cannot safely assume this key is free.
**Scope:** The flat `var C = {...}` color object defined in App.jsx (STYLES section). 20 keys, **227 `C.` reference sites** in App.jsx as of 2026-08-04 (was 310 at 2026-08-02, 437 at the 2026-04-30 recon — the drop reflects region slices 1-3 shipping, see the annotated slice list below; verified via `grep -oE '\bC\.[a-zA-Z]+' frontend/src/App.jsx | wc -l` directly against the current working tree, Doc Audit Spike Story 9). This predates the semantic token system in `theme/tokens.js` and was never migrated when the nested tokens landed. This section records the per-key disposition so the eventual sweep is mechanical, not investigative.

### Why this is deferred, not done now

- **227 call sites** (re-verified 2026-08-04; was 310 at the 2026-08-02 count this section previously cited) in a single 8,000+ line file. This is the migration backlog the token authors parked, not a slice — even with slices 1-3 shipped, one PR cannot soak-test the remaining touch points against Game Mode / share-link surfaces safely.
- **Primitives-first sequencing.** `tokens.js` header states consumers arrive via primitives (v2.5.0+), not by App.jsx reaching directly into `tokens.color.*`. `shadow.elevated` is explicitly tagged "App.jsx call sites (locked); migration deferred to v2.5.x." Migrating `C` direct-to-token would violate that intended consumer path.
- **Values genuinely diverge.** Several `C` keys have no token equivalent or differ from the nearest token (see table). Migration is therefore a design decision per orphan key, not a rename.

### Per-key disposition

| `C` key | value | sites (2026-08-02) | nearest token | disposition |
|---|---|---|---|---|
| navy | #0f1f3d | 56 | color.brand.navy #0F1F3D | **ADOPT** (case-only diff) |
| red | #c8102e | 33 | color.brand.red #C8102E | **ADOPT** |
| gold | #f5c842 | 17 | color.brand.gold #F5C842 | **ADOPT** |
| white | #ffffff | 7 | color.surface.card / text.onDark | **ADOPT** (context-dependent) |
| cardBg | #ffffff | 3 | color.surface.card #FFFFFF | **ADOPT** |
| subtleBg | #f8fafc | — | color.surface.page #F8FAFC | **ADOPT** |
| textMuted | #6b7280 | 125 | color.text.muted #6b7280 | **ADOPT** (exact) — highest single-key call-site count of any key in the table; spans nearly the entire file (line 722→7794 of 8159), not concentrated in one region |
| subtleText | #9ca3af | 1 | color.text.disabled #9CA3AF | **ADOPT** |
| win | #27ae60 | 22 | color.status.success #27AE60 | **ADOPT** |
| loss | #c8102e | — | color.brand.red #C8102E | **ADOPT** (loss==brand.red, not status.error) |
| tie | #d4a017 | 2 | color.status.warning #D4A017 | **ADOPT** |
| border | rgba(0,0,0,0.06) | 15 | color.border.subtle rgba(15,31,61,0.08) | **RESOLVED (Story 110 / #296) — MINT `color.border.neutral`.** Hue and opacity both differ from border.subtle — adopting would be a real visual shift at real scale. |
| subtleBorder | rgba(0,0,0,0.04) | 2 | overlay.navyWash rgba(15,31,61,0.04) | **RESOLVED — MINT `color.overlay.neutralWash`.** Paired with `border`'s decision for a consistent neutral-tint family alongside the existing navy-tint family. |
| overlayBg | rgba(0,0,0,0.5) | 0 via `C.overlayBg` / 3 via literal hex | overlay.backdrop rgba(5,10,25,0.97) | **RESOLVED — MINT `color.overlay.scrimLight`.** 3 live full-screen modal-backdrop sites, but all bypass `C` entirely — every real usage is the literal `rgba(0,0,0,0.5)`, not `C.overlayBg`. Migration mechanic is find-the-literal, not swap-the-reference. Adopting backdrop (0.97) would nearly double backdrop darkness across all 3. |
| navyLight | #1a3260 | 0 via `C.navyLight` / 5 via literal hex | none (chrome is #1E3A5F) | **RESOLVED — MINT `color.brand.navyLight`.** 5 live sites, all header/nav gradient stops paired with brand.navy — same as overlayBg, every real usage bypasses `C` and uses the literal hex directly. surface.chrome is a genuinely different navy (game-day-strip/Toast band), not a gradient partner. |
| redDark | #9b0c22 | 1 via `C.redDark` / 2 more via literal hex (3 total) | none | **RESOLVED — MINT `color.brand.redDark`.** Confirmed real, active usage across both forms. Not unused — retire was never viable once checked. |
| text | #1a1a2e | 20 | text.primary #0F1F3D | **Token layer RESOLVED (Story 110 / #296) — MINT `color.text.ink`.** App.jsx call-site migration is a SEPARATE, still-open item: **Story 114 / #497.** Highest blast radius of any resolved key: confirmed 2026-08-02 that App.jsx's own root render node sets `color:C.text` directly (both the `S.app` style constant AND the literal root `<div>` App's main render function returns) — this is the whole app's inherited default text color, not a leaf-level style. text.primary is a documented navy alias for emphasis/header text, not body copy; text.body (#374151) is a separate, lighter Story-60 value for specific components. Neither is a safe substitute. **Do not bundle this key into a region slice that assumes it's a free swap — Story 114 needs a full visual smoke pass across every screen first, not a snapshot-diff assumption**, precisely because inheritance means an untouched region could be silently relying on this root value with no explicit `color` of its own. |
| canceled | #7f8c8d | 1 | none | **RESOLVED — MINT `color.status.neutral`.** Game-canceled status badge. text.tertiary (#94A3B8) is a cooler, lighter slate — different enough to notice on a status badge. |
| greenField | #2e7d32 | 0 via `C.greenField` / 1 via literal hex | field.grass #2d7a3a | **RESOLVED — MINT `color.status.ready`, NOT adopt field.grass.** Correction to this table's own original framing: the one real call site (`statusColor = "#2e7d32"`, Home-screen team-readiness badge, "Ready" state) has nothing to do with the diamond SVG — it's status-domain, not field-domain, and bypasses `C` entirely (literal hex only). field.grass is a near-identical hex, but reusing it would violate this file's own "name tokens by role, not appearance" rule despite the negligible value delta. status.success (#27AE60) is a distinct, brighter green — also not a substitute. |
| cream | #fdf6ec | 5 | surface.page #F8FAFC (not close) / surface.tableHeader #F5EFE4 (close in value, wrong domain) | **OPEN — Story 113 / #496.** Never audited by this table until 2026-08-02. Sets the literal app-wide page background (`S.app.background`, and App's root `<div>`). No safe adopt candidate exists in-role; a value-close but domain-mismatched candidate exists (`surface.tableHeader`) — see #496 for the full analysis. |

### Recommended migration shape (updated 2026-08-02, sweep-scoping session)

1. ~~**Resolve the 8 DIVERGENT/ORPHAN decisions first** (own Story): mint or retire each, update `tokens.js` with provenance. No App.jsx edits.~~ **DONE (Story 110 / #296, 2026-08-01)** — see resolved table above.
2. **Two more prerequisites, discovered while scoping the actual sweep — resolve before any region slice starts, not concurrently:**
   - **Story 113 / #496 — `cream` disposition.** Never audited; blocks nothing else, but the table isn't "every key decided" until this closes.
   - **Story 114 / #497 — `text` App.jsx call-site verification.** Token-layer decision already made (Story 110); this is the separate, still-open question of whether the App.jsx root-render risk is actually safe to swap. A full visual smoke pass across every screen, not a snapshot — because inheritance means an untouched region could silently depend on this value without its own explicit `color`.
3. **Migrate by App.jsx region, not by key** — `textMuted` (125 sites) and most of the other ADOPT keys aren't concentrated in one tab; they're spread across nearly the whole file. Slicing by region (not by key) is what makes each slice's snapshot tractable. Proposed region order, one branch per slice, each RED→GREEN with a snapshot pinning pre/post hex equivalence, each soaked overnight:
   - **Binding obligation, not a suggestion:** each slice below must run Story 114's Step 1/2 methodology (structural inheritance-candidate search + `getComputedStyle` verification — see §Story 114 evidence below) against its own tab's content before that slice can claim the `text.ink` swap is safe there. Story 114 itself only covers the chrome that's always present regardless of tab (done, see below) — every region slice inherits the *obligation*, not the *result*. A slice that skips this and just assumes `text` is free reintroduces exactly the assumption Story 114 exists to eliminate.
   1. ~~Header + nav chrome (`S.header`, `S.logoWrap`, ~lines 677–900) — small, high-visibility, proves the snapshot-pinning pattern first. Bundle `navyLight`'s literal-hex header-gradient sites here.~~ **DONE (region slice 1, #528, v2.8.4)** — added 2026-08-04.
   2. ~~Roster tab~~ **DONE (region slice 2, #529, v2.8.4)** — added 2026-08-04.
   3. ~~Defense/Batting grid tabs~~ **DONE (region slice 3, #537, v2.8.4)** — added 2026-08-04. **(Slices 1-3: develop only as of this writing — main is still v2.8.3, not yet promoted.)**
   4. Schedule tab — bundle `greenField`'s literal-hex "Ready" status-badge site here (or split to its own Home-adjacent slice — open call)
   5. Print/Share/Links tabs
   6. Feedback/About tabs
   7. Modals/overlays — bundle `overlayBg`'s 3 literal-hex full-screen backdrop sites here
   8. **GameModeScreen / in-app DugoutView** (App.jsx lines ~7996–8039) — its own slice, not folded into slice 1 or slice 7. **Decided 2026-08-02, Story 116 / #503:** it's neither "always-present chrome" (Story 114's own boundary excludes it), nor a tab (rules out slices 2–6), nor an actual modal/overlay component (rules out slice 7 — GameModeScreen is a full-screen mode reached via navigation state, not an overlay layered on top of tab content). Folding it into slice 1 would also dilute that slice's stated purpose — "small, high-visibility, proves the snapshot-pinning pattern first" — with an unrelated, much larger surface. Sequenced **last**, not first: `game-mode/` and `ScoringMode/` are each their own Locked File (root `CLAUDE.md`), requiring their own gate phrase on top of App.jsx's, and this is the live game-day surface the Auth Principle's priority order ranks second only to the share link — proving the migration pattern on the six lower-stakes tab/modal slices first, then applying it here last, is the safer order.
   9. **`SharedView`'s own duplicate header** (App.jsx lines ~805–1116, the public share-link view). **Decided 2026-08-04, Story 120 / #531:** its own slice, not folded into slice 1 or any tab slice — same reasoning as slice 8's carve-out. `SharedView` renders via a completely separate `<ErrorBoundary>` tree outside the main app shell's root; it's not "always-present chrome" (Story 114's boundary excludes it), not a tab (rules out slices 2–6), and not a modal/overlay (rules out slice 7). Sequenced **after slice 7**, not last like slice 8 — `SharedView` carries no Locked-File gate-phrase complication beyond App.jsx's own, so it doesn't need to wait as long as slice 8 does. Run Story 114's Step 1/2 methodology against its own render tree at slice-start time (groundwork already exists in the "Root 1 — `SharedView()`" table below).
   - **`overlayBg`, `navyLight`, `greenField` need a different migration mechanic** at their respective slices: every real usage bypasses `C` entirely (literal hex duplicates, not `C.key` references) — find-the-literal-and-replace, not swap-the-reference. Confirmed 2026-08-02 via broadened grep past the narrow `C.key`-only pattern (which showed 0 for all three and would have missed them).
   - **The app-shell root background gradient's third stop (`#2a0a0a`)** — flagged 2026-08-04 as a deliberately out-of-scope item during slice 1, no existing token is an exact match. **Open, Story 119 / #530** — not yet resolved, not assigned to any of the 9 slices above. Recommendation logged (mint `color.brand.gradientDark`, named by role not appearance, same principle as Story 113's cream mint) but **not implemented — needs an explicit go on the proposed name from KK before minting or swapping the call site.**
4. **Retire `var C`** only after the last consumer is migrated; add a keys-present guard test first so a stray leftover reference fails loudly instead of silently keeping the dead object alive.
5. Sequence behind or alongside App.jsx Phase 4 decomposition where possible — migrating a region is cheaper once it is a component consuming tokens via props/primitive. Coordination between the two tracks is a product call, not assumed here.

### Story 114 / #497 evidence artifact — exhaustive Step 1 (structural candidate search), chrome + `SharedView`

Scope: both independent inheritance roots' *own* structure, plus every "always-present chrome" element reachable from the main app shell regardless of active tab (Toast, header/logo, sub-tab bars, install banner, bottom nav, exit sheet, PIN modal, edit-team modal, `needRefresh` banner, `LockFlow`, `tabContent`'s own inline JSX before it dispatches to per-tab render functions). Exhaustive, not sampled, per the explicit instruction that a sampled search reintroduces the exact assumption this story exists to eliminate.

**Root 1 — `SharedView()` (lines 805–1116):**

| Element | Ancestor chain | Result |
|---|---|---|
| Header (team name, game info, print button) | root → header div | All explicit (`C.gold`, `rgba(255,255,255,*)`) |
| Controls row (inning pills, view toggle) | root → controls div | All explicit (`C.textMuted`, `#fff`, `C.navy`) |
| Diamond/table view (bench table, position badges) | root → view div | All explicit (`C.navy`, `#dc2626`, `#ccc`, `C.textMuted`) |
| Batting order — batter number circle, position list, song info | root → `S.card` (no color) → row div (no color) | Explicit except one case below |
| **Batting order — player name div (line 1064–1065)** | root (`C.text`) → `S.card` (no color, confirmed) → row div (no color) → name div (`color: isSelectedBatter ? "#b45309" : undefined`) | **GENUINE FINDING.** When not the selected batter (the default case), `color` is `undefined` — genuinely inherits `C.text` from the root. Confirmed `S.card` has no `color` of its own (only background/border/shadow/padding) — chain reaches the root uninterrupted. |
| Footer | root → footer div (`color:C.textMuted`) → child divs | Inherits `C.textMuted`, not `C.text` — different, already-resolved token, not a risk for this key |
| `<PlayerFilterToggle>` (child component) | separate render tree | All explicit (`#0f1f3d` / `#555` both branches) |
| `<BrandMark>` (child component) | separate render tree | Pure SVG, explicit `fill=` throughout, no CSS `color` dependency at all |
| `renderFieldSVG(...)` (passed-in prop, SVG diamond) | separate render tree | SVG `<text fill="white">` and friends — confirmed zero `fill="currentColor"` usage, so SVG `fill` inheritance never bridges to CSS `color` here |

**Root 2 — main app shell chrome (line 7904 onward, tab-dispatch content excluded per the agreed boundary):**

| Element | Result |
|---|---|
| `S.header`/`logoWrap`/`logoCircle`/`logoTitle`/`logoSub` | `logoCircle`/`logoTitle` explicit (`C.gold`); `logoSub` explicit (`rgba(255,255,255,0.5)`); `header`/`logoWrap` have no `color` at all but wrap only explicit-or-opaque-safe children |
| `<Toast/>` | Wrapper has no `color`, but every text-bearing child sets its own (`#e2e8f0`, `#fff`) — no inheriting text node |
| `<OfflineIndicator/>` | Fully token-driven already (Phase 3 migration), zero `C` dependency |
| `<NowBattingBar/>` | Fully token-driven already, zero `C` dependency |
| `subTabBar` (both `gameday` and `more` branches, via `subTabStyle()`) | All explicit (`#fff` / `C.textMuted`) |
| Install banner | All explicit (`#fff`, `rgba(255,255,255,*)`, `#f5c842`, `#0f1f3d`) |
| `needRefresh` banner | One bare `<span>` inherits — but from the banner's own explicit `color:'#ffffff'` ancestor, not the root. Not a `C.text` risk |
| `renderBottomNav()` | All explicit (`C.gold` / `disabled` / `rgba(255,255,255,*)`) — icon + label inherit from the button's own explicit color, not the root |
| `renderExitSheet()` | All explicit |
| `renderPinModal()` | All explicit. Also confirms `S.btn()` **always** returns an explicit `color:col` — every variant (`primary`/`gold`/`ghost`/`danger`) *and* the default (`var col = C.text`) — so every `...S.btn(...)` spread anywhere in the app is safe from this specific risk, by construction |
| `<LockFlow/>` | Already migrated (Story 111/#297) — token-driven, irrelevant to this key |
| Edit-team modal | All explicit |
| `tabContent`'s own inline JSX (context label, locked-lineup banner, dispatch to per-tab renderers) | All explicit. Everything *past* this — `renderTeamTab()`, `renderLineups()`, `renderSongs()`, `renderAccount()`, `renderFeedback()`, `renderLinks()`, `renderAbout()`, `renderUpdates()`, `<ParentView/>`, `<LegalSection/>`, `<FAQSection/>` — is genuinely per-tab content, correctly out of Story 114's scope per the agreed boundary; verified as each region slice reaches it |

**Process gap surfaced, not silently dropped:** `<GameModeScreen/>` and the in-app `<DugoutView/>` (lines ~7996–8039) are nested *inside* this root — unlike the share-link `isViewer` branch, which renders via a completely separate `<ErrorBoundary>` tree outside it. Neither is covered by Story 114 (they're not "always-present chrome") nor by any of the 7 numbered region slices above (they're full-screen modes, not tabs or modals). This is a real hole in the region-slice plan, not an oversight to quietly patch — needs its own slice or explicit assignment before the sweep can claim full coverage. **Filed as Story 116 / #503**, same treatment as Story 115's `S.app` byproduct — not left as a paragraph in this doc with no tracked issue.

**Resolved 2026-08-02, same session:** dedicated as its own region slice — **slice 8**, sequenced last — rather than folded into an existing slice. See item 8 in §Recommended migration shape above for the disposition and reasoning; #503 updated to reflect the decision.

**Net result of the exhaustive search: exactly one genuine finding** (`SharedView` line 1064). Everything else checked — every leaf, every ancestor, every child component and passed-in render prop — resolves to an explicit color that isn't `C.text`, or (for `S.card`/`header`/`logoWrap`) has no color at all and wraps only already-verified-safe children.

### Story 114 / #497 — Step 2: runtime verification (2026-08-02)

**Method.** Local `npm run dev` (frontend, Vite 6.4.3, port 5173) loaded in an isolated browser tab. `SharedView` was exercised via the real `?share=<base64>` code path (`App.jsx`'s `JSON.parse(decodeURIComponent(escape(atob(shareParam))))` decoder), not a mock — payload: 2-player roster, both with a `grid` and a `batting` order, no `svPlayer` set so `isSelectedBatter` is `false` for every entry, forcing the exact `color: undefined` branch at line 1065 for both rendered rows.

**Flagged element (line 1064–1065) — CONFIRMED.** `getComputedStyle` on both rendered player-name divs (`firstName(name)`, no inline `color` in either — `el.style.color === ''`) returned `color: rgb(26, 26, 46)`. `#1a1a2e` is `C.text`'s literal value (`App.jsx:667`) — exact match, not merely "some inherited color." This settles the one open question Step 1 could not: that the DOM's real cascade, not just the JSX ancestor chain on paper, actually resolves this element to the root's `C.text` with nothing intervening. Confirms the finding is real and quantifies exactly what a `text.ink` swap would need to preserve (`#1a1a2e`) for this site to stay a zero-visual-change MINT rather than a silent shift.

**Chrome spot-confirmation.** No authenticated session is reachable in this headless verification path — magic-link requires a real inbox, Google OAuth requires a real login, and driving either here would mean an agent completing a login flow, which is out of bounds regardless of feasibility. `http://localhost:5173/` with no session renders `NoMembershipScreen` (the pre-auth login form), not Root 2's header/nav chrome — every element on that screen already carries its own explicit inline `color` (confirmed via `getComputedStyle`: heading `rgb(15,23,42)`, label `rgb(55,65,81)`, buttons `rgb(255,255,255)` / `rgb(37,99,235)`), consistent with Step 1's finding that pre-auth surfaces don't rely on inheritance at all.

For Root 2 itself, spot-confirmation was done as an independent second source-reading pass (distinct from, not a restatement of, the Step 1 table) rather than a live DOM read, since none of these sites carry the `isSelectedBatter`-style runtime branch that made the SharedView case ambiguous on paper — a second read of the literal object/JSX settles them with the same confidence a DOM read would:
- `S.logoCircle` (`App.jsx:687–692`) — explicit `color:C.gold`, confirmed directly in the style object (not just inferred from the table row).
- `S.logoTitle` (`App.jsx:693`) — explicit `color:C.gold`.
- `S.logoSub` (`App.jsx:694`) — explicit `color:"rgba(255,255,255,0.5)"`.
- `S.header`/`S.logoWrap` (`App.jsx:679–686`) — re-confirmed neither object defines `color` at all; re-read their actual JSX usage (`App.jsx:7912–7927`) to confirm every direct child is one of the three rows above, `<BrandMark/>` (SVG, no CSS `color` dependency), or a background-only sync-status dot with no text node — no untracked fourth child slipped through.
- `needRefresh` banner — two independent render sites exist (`App.jsx:3337` and `App.jsx:8040`), not one; both were re-checked (Step 1's table only cited one). Both set explicit `color:'#ffffff'` on the banner div itself, and both banners' `<span>` children inherit from that div, not from either root. Two sites, same conclusion — not a discrepancy from Step 1, just a completeness gap in which line number the table pointed at, worth recording since Step 1's own standard was exhaustive-not-sampled.

**Step 2 result:** the one genuine finding is confirmed and quantified at runtime; every chrome item Step 1 called safe is now independently re-confirmed via a second read (live DOM where an authenticated route was reachable, second source pass where it was not). Story 114's chrome-scope methodology (Step 1 + Step 2) is complete. The binding obligation on the region slices (§Recommended migration shape, item 3 — now 8 slices, see slice 8 / Story 116 below) to run this same methodology against their own content is unaffected — this closes only the always-present-chrome portion.

### Post-merge re-verification (2026-08-02, before the actual swap)

Between Step 2 closing and the actual App.jsx call-site swap starting, `develop` moved 11 commits — two of them (`fix/share-link-payload-coverage` #504, `fix/game-mode-p0-coverage` #505) landing directly in this story's and Story 116's subject matter. Merged `origin/develop` into this branch rather than swap on a stale base; then re-verified rather than assumed the merge was benign:

- **`buildSharePayload` extraction (#504).** Payload-construction logic moved out of `shareCurrentLineup()`/`shareViewerLink()` into `frontend/src/utils/buildSharePayload.js`. Read the extracted function directly: it returns the identical shape (`{team, game, grid, batting, roster, absentNames, songs}`) the inline code built before — confirmed by diff against the pre-extraction code, not by trusting the commit message. The encode step (`btoa(unescape(encodeURIComponent(JSON.stringify(payload))))`) and decode step (`JSON.parse(decodeURIComponent(escape(atob(shareParam))))`) feeding `<SharedView payload={...}/>` are both byte-identical to what Step 2 exercised. `svPlayer`/`isSelectedBatter` (the genuine finding's own logic, `App.jsx` line ~1041, now shifted a few lines from the extraction) is `SharedView`'s own internal `useState`, entirely independent of the payload shape — confirmed by reading the current source, not by re-deriving from memory. The genuine finding stands unchanged, just at a shifted line number.
- **`#505`'s "test-only" claim — independently confirmed, not trusted from the PR title.** `git diff` of the pre-session base against the merged state shows **zero changes** to `GameModeScreen.jsx`, `QuickSwap.jsx`, or `DugoutView.jsx` — the only files #505 touched are two new test files (`GameModeScreen.test.jsx`, `QuickSwap.test.jsx`). Story 116's disposition (dedicated 8th slice, GameModeScreen/DugoutView structure) rests entirely on unchanged code.
- **New test files checked for conflicting assertions.** Neither `SharedView.test.jsx` nor `GameModeScreen.test.jsx` (both new) assert on `color`, hex values, or computed style — no collision with the coming swap's evidence.
- **Fresh `C.text` site count:** re-grepped post-merge, still exactly **20** sites, same set Step 1 originally found (word-boundary match, excludes `C.textMuted`).

**Conclusion: nothing shifted materially.** Full Step 1/Step 2 re-run not warranted — confirmed via direct diff of the actual render files, not inferred from the merge being clean. Proceeding to the 20-site swap on this merged base.

**Logistics that will bite if skipped, confirmed 2026-08-02:**
- **`App.jsx` is a Locked File** (root `CLAUDE.md`) — every slice's actual edit needs the gate phrase *"all clear — App.jsx editing approved"*, every time, not once at the start.
- **Skip-worktree is currently set** on `App.jsx` (`git ls-files -v` shows the `S` flag — Bug #11). `git diff`/`git status` will show nothing even after real edits until `git update-index --no-skip-worktree frontend/src/App.jsx` is run first; re-lock with `--skip-worktree` after each commit.

**Story 106 (#294) shipped this disposition table only. No source code changes.** (Attribution corrected 2026-08-02 — this note originally sat directly below the disposition table it describes; Stories 110–114 were appended below it in later sessions without updating the reference, leaving it misread as a closing note for Story 114/#497. It documents Story 106's original table, not Story 114.)
