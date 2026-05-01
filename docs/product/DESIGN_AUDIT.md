# Design Audit — Dugout Lineup

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

Recon method: PowerShell regex on `boxShadow: 'value'` (JS object form) + `box-shadow: value` (CSS form).

**Result: 21 occurrences across 16 distinct `boxShadow` values. Shadow group DROPPED from this PR.**

The 6-value threshold for a clean `sm`/`md`/`lg` mapping was not met. Each Game Mode element invented its own shadow expression. The values cluster loosely but not cleanly enough to justify named tokens without a dedicated normalization pass.

**v2.4.1 backlog:** Run a fresh `boxShadow` grep at the start of the shadow normalization session. The exact 16 values were not captured for this document (the recon output was summarized rather than pasted in full). The v2.4.1 session should:

1. Re-run the boxShadow recon script
2. Cluster the 16 values by visual weight (subtle lift, card, modal/overlay)
3. Propose `shadow.sm`, `shadow.md`, `shadow.lg` tokens based on empirical clustering
4. Add shape tests before implementing (RED → GREEN)
5. Document in an addendum to this file

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
| **Shadows** | 16 distinct `boxShadow` values | 21x | Full inventory deferred to v2.4.1 |

---

## A. Concrete Drift Examples Surfaced During Audit

### A.1 — Duplicate `fontSize` Key in LockFlow.jsx (Build Warning)

**File:** `frontend/src/components/GameDay/LockFlow.jsx`
**Line:** 130

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

**Backlog disposition:** Tracked in v2.5.x call-site replacement. Fix: remove the first `fontSize:"13px"` (which was presumably the intended value), set `fontSize:"13px"`, verify the label renders correctly. Do not fix in this PR — the component is out of scope and the fix needs visual verification.

Also note: the inline style on line 130 contains several drift values that will resolve automatically once a `<Text>` primitive is in place:
- `rgba(15,31,61,0.04)` → `color.overlay.navyWash`
- `rgba(15,31,61,0.1)` → drift (opacity 0.10 not in reference scale)
- `borderRadius:"10px"` → drift (between `radius.md` and `radius.lg`)
- `padding:"14px"` → drift (off-scale half-step)
- `letterSpacing:"0.05em"` → close to `font.letterSpacing.wide` (0.06em) but not equal

This one div is a microcosm of the full drift inventory.

---

## B. Pipeline / Tooling Observations

### B.1 — ESLint Configuration Missing from Repository

**Finding:** `git ls-files | grep -i eslint` returns empty. No `.eslintrc`, `eslint.config.js`, `.eslintrc.cjs`, or equivalent is tracked in the repository. The `npm run lint` script in `frontend/package.json` fails with:

```
ESLint couldn't find a configuration file.
ESLint looked for configuration files in frontend/src and its ancestors.
```

**Confirmed pre-existing:** This gap predates the design tokens work. The ESLint packages (`eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`) are present in `devDependencies` and the lint script is defined, but the configuration was never committed — or was lost at some point and never restored.

**Impact:** `npm run lint` (referenced in `CLAUDE.md` and the pre-deploy checklist) fails on a fresh clone or in any worktree. The lint step of Step B of this session was skipped on this basis.

**Backlog disposition:** Restoring the lint pipeline is a separate `v2.4.x` backlog item. It requires deliberate rule choices affecting the entire codebase and is out of scope for the design tokens session. When restoring, the config should encode at minimum: `eslint-plugin-react` recommended rules, `eslint-plugin-react-hooks` rules, `no-unused-vars`, and `no-console`. The token files (`tokens.js`, `index.js`) have no JSX, no hooks, and no complex patterns — their lint risk is effectively zero even without a config.

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
