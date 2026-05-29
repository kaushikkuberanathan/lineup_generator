import React from 'react';
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Badge } from './Badge';
import { tokens } from '../../theme/tokens';

// ============================================================================
// Phase 2 — Badge primitive contract tests
//
// Badge replaces PlayerHandBadge (root/light) and Shared/PlayerHandBadge
// (dark) in Phase 3. Both existing components are locked for Phase 2 —
// Badge is the new canonical primitive; migration happens in Phase 3.
//
// JSDOM inline-style normalization (same conventions as all prior primitives):
//   hex colors → rgb():
//     #dbeafe (hand-L bg, blue-100) = rgb(219, 234, 254)
//     #1d4ed8 (hand-L text, blue-700) = rgb(29, 78, 216)
//     #f3f4f6 (hand-R bg, gray-100) = rgb(243, 244, 246)
//     #4b5563 (hand-R text, gray-600) = rgb(75, 85, 99)
//   rgba() → spaces added after commas, alpha unchanged (no hand-* usage here)
//
// Composition note: Badge renders <span style={outer}><Text>children</Text></span>
//   outer span  → background, color, borderRadius, display, padding (badge chrome)
//   inner span  → fontSize, fontWeight (Text primitive handles typography)
//   color is set on outer span; inner Text inherits via CSS cascade (no color prop passed to Text)
//
// ARIA: Badge does not auto-set aria-label. Consumer responsibility.
//   Pass aria-* through ...rest to the outer span.
//
// Deferred (Phase 2.5+):
//   context prop (light|dark) — dark = whiteLight bg / white text (Shared variant)
//   size variants, icon slots, interactive/removable badges
//   position and status variants — no non-locked call site today
// ============================================================================

describe('Badge — Phase 2 primitive', function () {

  // ── Shape + null guard ────────────────────────────────────────────────────

  test('BD1.1: renders null when children is null (== null guard — not falsy; 0 and "" are valid children)', function () {
    var { container } = render(<Badge variant="hand-L">{null}</Badge>);
    expect(container.firstChild).toBeNull();
  });

  test('BD1.2: renders a span when children are provided', function () {
    var { container } = render(<Badge variant="hand-L">L</Badge>);
    expect(container.querySelector('span')).not.toBeNull();
  });

  test('BD1.3: Text span nested inside badge span (span > span composition)', function () {
    var { container } = render(<Badge variant="hand-L">L</Badge>);
    var outer = container.querySelector('span');
    var inner = outer.querySelector('span');
    // If Badge renders children directly (no Text composition), inner is null → RED
    expect(inner).not.toBeNull();
    expect(inner.textContent).toBe('L');
  });

  // ── hand-L variant ────────────────────────────────────────────────────────

  test('BD2.1: hand-L outer span background is #dbeafe = rgb(219,234,254)', function () {
    var { container } = render(<Badge variant="hand-L">L</Badge>);
    // JSDOM normalizes #dbeafe → rgb(219, 234, 254)
    expect(container.querySelector('span').style.background).toBe('rgb(219, 234, 254)');
  });

  test('BD2.2: hand-L outer span color is #1d4ed8 = rgb(29,78,216)', function () {
    var { container } = render(<Badge variant="hand-L">L</Badge>);
    // JSDOM normalizes #1d4ed8 → rgb(29, 78, 216)
    expect(container.querySelector('span').style.color).toBe('rgb(29, 78, 216)');
  });

  // ── hand-R variant ────────────────────────────────────────────────────────

  test('BD3.1: hand-R outer span background is #f3f4f6 = rgb(243,244,246)', function () {
    var { container } = render(<Badge variant="hand-R">R</Badge>);
    // JSDOM normalizes #f3f4f6 → rgb(243, 244, 246)
    expect(container.querySelector('span').style.background).toBe('rgb(243, 244, 246)');
  });

  test('BD3.2: hand-R outer span color is #4b5563 = rgb(75,85,99)', function () {
    var { container } = render(<Badge variant="hand-R">R</Badge>);
    // JSDOM normalizes #4b5563 → rgb(75, 85, 99)
    expect(container.querySelector('span').style.color).toBe('rgb(75, 85, 99)');
  });

  // ── Typography via Text (inner span) ─────────────────────────────────────

  test('BD4.1: inner Text fontSize is tokens.font.size.xs (11px)', function () {
    var { container } = render(<Badge variant="hand-L">L</Badge>);
    var inner = container.querySelector('span span');
    expect(inner.style.fontSize).toBe('11px');
  });

  test('BD4.2: inner Text fontWeight is 600 (semibold)', function () {
    var { container } = render(<Badge variant="hand-L">L</Badge>);
    var inner = container.querySelector('span span');
    expect(inner.style.fontWeight).toBe('600');
  });

  // ── Badge wrapper token applications ──────────────────────────────────────

  test('BD5.1: outer span border-radius is tokens.radius.xs (4px)', function () {
    var { container } = render(<Badge variant="hand-L">L</Badge>);
    expect(container.querySelector('span').style.borderRadius).toBe(tokens.radius.xs);
  });

  test('BD5.2: outer span display is "inline-block"', function () {
    var { container } = render(<Badge variant="hand-L">L</Badge>);
    expect(container.querySelector('span').style.display).toBe('inline-block');
  });

  // ── Style escape hatch ────────────────────────────────────────────────────

  test('BD6.1: style prop merges with computed — matches App.jsx usage (marginLeft)', function () {
    var { container } = render(
      <Badge variant="hand-L" style={{ marginLeft: '4px' }}>L</Badge>
    );
    var outer = container.querySelector('span');
    expect(outer.style.marginLeft).toBe('4px');
    // Token-driven props survive the merge
    expect(outer.style.borderRadius).toBe(tokens.radius.xs);
  });

  // ── ARIA pass-through (no auto-label) ─────────────────────────────────────

  test('BD7.1: no aria-label set by default (consumer responsibility)', function () {
    var { container } = render(<Badge variant="hand-L">L</Badge>);
    expect(container.querySelector('span').getAttribute('aria-label')).toBeNull();
  });

  test('BD7.2: aria-label passed via ...rest reaches the outer span', function () {
    var { container } = render(
      <Badge variant="hand-L" aria-label="Left-handed batter">L</Badge>
    );
    expect(container.querySelector('span').getAttribute('aria-label')).toBe('Left-handed batter');
  });

  // ── BD8 — hand-L with context="dark" ─────────────────────────────────────

  test('BD8.1: hand-L + context="dark" outer span background is whiteLight overlay', function () {
    var { container } = render(<Badge variant="hand-L" context="dark">L</Badge>);
    // tokens.color.overlay.whiteLight = 'rgba(255,255,255,0.15)'
    // JSDOM normalizes to 'rgba(255, 255, 255, 0.15)' (spaces inserted after commas)
    expect(container.querySelector('span').style.background).toBe('rgba(255, 255, 255, 0.15)');
  });

  test('BD8.2: hand-L + context="dark" outer span color is onDark white', function () {
    var { container } = render(<Badge variant="hand-L" context="dark">L</Badge>);
    // tokens.color.text.onDark = '#FFFFFF' — JSDOM normalizes hex → rgb(255, 255, 255)
    expect(container.querySelector('span').style.color).toBe('rgb(255, 255, 255)');
  });

  // ── BD9 — hand-R with context="dark" ─────────────────────────────────────

  test('BD9.1: hand-R + context="dark" outer span background is whiteLight overlay', function () {
    var { container } = render(<Badge variant="hand-R" context="dark">R</Badge>);
    expect(container.querySelector('span').style.background).toBe('rgba(255, 255, 255, 0.15)');
  });

  test('BD9.2: hand-R + context="dark" outer span color is onDark white', function () {
    var { container } = render(<Badge variant="hand-R" context="dark">R</Badge>);
    expect(container.querySelector('span').style.color).toBe('rgb(255, 255, 255)');
  });

  // ── BD10 — context="light" preservation guard ────────────────────────────

  test('BD10.1: explicit context="light" matches implicit default (hand-L light styles)', function () {
    var { container } = render(<Badge variant="hand-L" context="light">L</Badge>);
    // Preservation guard: explicit context="light" must render identical to
    // omitted context (i.e., BD2.1 behavior). Stays GREEN before AND after
    // Badge.jsx implementation in Step 2.C.
    expect(container.querySelector('span').style.background).toBe('rgb(219, 234, 254)');
  });

});
