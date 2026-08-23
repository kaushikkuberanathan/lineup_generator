# Accessibility Phase 1 — Feature Guide

> Shipped: March 31, 2026 (v1.9.5). **GA, default-on** — feature flag: `ACCESSIBILITY_V1` (default: `true`)
> Corrected 2026-08-23: this doc previously said "default: off." The flag flipped to `true` and this became the standard experience for all coaches; it now exists only as a per-user rollback switch, not a staged rollout gate.

---

## Overview

Accessibility Phase 1 targets the Game Mode overlay — the highest-stakes screen coaches
use on game day, often one-handed under pressure. It improves font legibility, touch target
size, color contrast, and screen reader support. It shipped behind a feature flag for staged
rollout and is now GA for all coaches; the flag remains as a per-user rollback switch if a
regression is found (see Enabling the Flag below).

---

## What Changed

### Font Floor
All section labels and UI text in Game Mode overlays raised to a minimum of 12px.
Primary player names (18px+) and score displays are unchanged.

| Element | Before | After (a11y on) |
|---------|--------|-----------------|
| Half-inning pill text (DEFENSE / BATTING) | 11px | 13px |
| Advance button text | 12px | 14px |
| Game Mode header label | 11px | 13px |
| InningModal section labels (Now Batting, On Deck, etc.) | 9–10px | 12px |
| "Batting order continues" label | 9px | 12px |

### Touch Targets
All interactive controls in Game Mode raised to a minimum 44×44px tap area
(WCAG 2.5.5 AA target size guideline).

| Control | Before | After (a11y on) |
|---------|--------|-----------------|
| Advance button (End Defense / End Batting / Next) | ~30px tall | 44px (padding 13px, minHeight 44) |
| Defense / Batting pill toggles | ~25px tall | 44px tall hit area (pill stays visually compact) |
| InningModal Cancel + Confirm | ~46px (already passing) | minHeight: 44 regression guard added |

### Color Contrast
InningModal renders against a near-black overlay (`rgba(5,10,25,0.97)`).
Muted grays that were illegible have been raised to meet WCAG AA contrast ratios.

| Color | Used for | Before | After (a11y on) |
|-------|----------|--------|-----------------|
| `#475569` | Section labels, chips, bench names | 3.1:1 ✗ | `#e2e8f0` — 11.4:1 ✓ |
| `#64748b` | Subtitle text, cue labels | 4.0:1 ~ | `#cbd5e1` — 8.9:1 ✓ |
| `#334155` | "Gear up" cue text | 2.4:1 ✗ | `#94a3b8` — 5.9:1 ✓ |

### ARIA Labels
All interactive Game Mode controls now carry descriptive ARIA labels for screen reader users.

| Element | aria-label |
|---------|-----------|
| Advance button | Dynamic: "Mark defense complete for inning N" / "Mark batting complete for inning N" / "Advance to inning N" / "End game" |
| Defense pill | "Switch to defense view" or "Defense complete" + `aria-pressed` |
| Batting pill | "Switch to batting view" or "Batting complete" + `aria-pressed` |
| InningModal root | `role="dialog"` `aria-modal="true"` `aria-label="Inning N complete"` or `"Game complete"` |
| Cancel button | "Cancel inning advance" |
| Confirm button | Dynamic: "Start batting for inning N" / "Take the field for inning N" / "Exit game mode" |

### Position Abbreviation Labels
Position abbreviations (P, SS, 1B, etc.) rendered in the InningModal defensive view
now carry `aria-label` with the full position name (e.g. `aria-label="Shortstop"`).
Source of truth: `src/constants/positions.js` → `POSITION_LABELS`.

### Reduced Motion
A global CSS media query in `src/index.css` disables all animations and transitions
when the user's OS "Reduce Motion" setting is enabled:

```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

This applies unconditionally (no feature flag) — it is a passive, browser-respecting rule
that only fires when the OS setting is active.

### Focus Management
When InningModal opens, keyboard focus is moved to the Confirm button automatically
(when `ACCESSIBILITY_V1` is on), allowing keyboard/switch-access users to confirm
or dismiss without tabbing through the modal content first.

---

## Enabling / Rolling Back the Flag

The flag is `true` by default for everyone. To roll a single user back to
the pre-Phase-1 experience (e.g. investigating a regression report):

```js
// In browser DevTools console:
localStorage.setItem('flag_ACCESSIBILITY_V1', 'false')
// Hard refresh: Ctrl+Shift+R / Cmd+Shift+R
```

**To restore the default for that user:**
```js
localStorage.removeItem('flag_ACCESSIBILITY_V1')
```

**To kill it globally** (last resort — affects every coach):
Change `ACCESSIBILITY_V1: true` → `ACCESSIBILITY_V1: false` in `src/config/featureFlags.js`, deploy through the normal branch flow.

---

## Technical Implementation

| File | Role |
|------|------|
| `src/config/featureFlags.js` | `ACCESSIBILITY_V1` flag + `isFlagEnabled()` utility |
| `src/constants/positions.js` | `POSITION_LABELS` map (P → "Pitcher", SS → "Shortstop", etc.) |
| `src/index.css` | Global reduced-motion media query (no flag gate) |
| `src/main.jsx` | Imports `index.css` |
| `src/components/game-mode/GameModeScreen.jsx` | Font, touch targets, aria labels (pill + advance) |
| `src/components/game-mode/InningModal.jsx` | Font, contrast, aria labels, role=dialog, focus |

---

## Test Coverage

`src/tests/accessibility.v1.test.js` — 24 tests across 4 groups (recounted 2026-08-23; previously documented as 19):

| Group | Tests |
|-------|-------|
| **1 — POSITION_LABELS** | Shape, non-empty values, engine coverage, known label values |
| **2 — FEATURE_FLAGS registry** | ACCESSIBILITY_V1 present and defaults `true` (GA default-on); existing flags intact |
| **3 — isFlagEnabled defaults** | Correct default per flag; false for unknown flag names |
| **4 — isFlagEnabled localStorage override** | true/false overrides, removeItem fallback, non-interference, arbitrary strings |

**Rule:** changes to `featureFlags.js` or `constants/positions.js` must pass `npm test`.

---

## Phase 2 — Planned

- Extend font floor and touch targets to Roster tab player cards
- ARIA roles on the Defense diamond (position circles as interactive buttons)
- Focus trap within modals
- High-contrast mode toggle (beyond OS media query)
- Audit NowBattingBar touch targets (← Back / → Next batter buttons)
