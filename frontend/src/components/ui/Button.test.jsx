import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';
import { tokens } from '../../theme/tokens';

// ============================================================================
// Phase 2 — Button primitive contract tests
//
// JSDOM inline-style normalization (applies to ALL style assertions in this
// file and in any future primitive test):
//
//   hex colors  → rgb()
//     #F5C842 (brand.gold)         = rgb(245, 200, 66)
//     #0F1F3D (brand.navy)         = rgb(15, 31, 61)
//     #DC2626 (status.error)       = rgb(220, 38, 38)
//     #E2E8F0 (border.default)     = rgb(226, 232, 240)
//     #FFFFFF / #ffffff (white)    = rgb(255, 255, 255)
//
//   rgba()  → kept verbatim (no normalization of rgba values)
//
//   font-family → single quotes become double quotes, spaces added after commas
//     Example: "Georgia,'Times New Roman',serif"
//           → "Georgia, \"Times New Roman\", serif"
//     First discovered in Text.test.jsx T1.21/T1.22; assert JSDOM form, not
//     the raw token string. Never assert tokens.font.family.* directly.
//
//   border shorthand → JSDOM parses to longhands
//     style={{ border: "1px solid #E2E8F0" }}
//       → el.style.borderColor = "rgb(226, 232, 240)"
//     Assert el.style.borderColor (the longhand), not el.style.border
//     (shorthand reconstruction is unreliable across JSDOM versions).
//
// Deferred (Phase 2.5+): loading state, icon slots, asChild pattern.
// ============================================================================

describe('Button — Phase 2 primitive', function () {

  // ── Shape ─────────────────────────────────────────────────────────────────

  test('B1.1: renders a button element', function () {
    var { container } = render(<Button>click</Button>);
    expect(container.querySelector('button')).not.toBeNull();
  });

  test('B1.2: type defaults to "button" (not "submit") when prop omitted', function () {
    var { container } = render(<Button>click</Button>);
    expect(container.querySelector('button').getAttribute('type')).toBe('button');
  });

  test('B1.3: explicit type="submit" is forwarded to the button element', function () {
    var { container } = render(<Button type="submit">submit</Button>);
    expect(container.querySelector('button').getAttribute('type')).toBe('submit');
  });

  // ── 44px min-height floor (sizes) ─────────────────────────────────────────

  test('B2.1: size="sm" enforces 44px min-height (WCAG touch target floor)', function () {
    var { container } = render(<Button size="sm">text</Button>);
    expect(container.querySelector('button').style.minHeight).toBe('44px');
  });

  test('B2.2: size="md" enforces 44px min-height', function () {
    var { container } = render(<Button size="md">text</Button>);
    expect(container.querySelector('button').style.minHeight).toBe('44px');
  });

  test('B2.3: size="lg" enforces 44px min-height', function () {
    var { container } = render(<Button size="lg">text</Button>);
    expect(container.querySelector('button').style.minHeight).toBe('44px');
  });

  // ── 44px min-height floor (variants — min-height must survive variant merges) ─

  test('B2.4: variant="primary" enforces 44px min-height', function () {
    var { container } = render(<Button variant="primary">text</Button>);
    expect(container.querySelector('button').style.minHeight).toBe('44px');
  });

  test('B2.5: variant="secondary" enforces 44px min-height', function () {
    var { container } = render(<Button variant="secondary">text</Button>);
    expect(container.querySelector('button').style.minHeight).toBe('44px');
  });

  test('B2.6: variant="ghost" enforces 44px min-height', function () {
    var { container } = render(<Button variant="ghost">text</Button>);
    expect(container.querySelector('button').style.minHeight).toBe('44px');
  });

  test('B2.7: variant="danger" enforces 44px min-height', function () {
    var { container } = render(<Button variant="danger">text</Button>);
    expect(container.querySelector('button').style.minHeight).toBe('44px');
  });

  // ── Text primitive composition ────────────────────────────────────────────

  test('B3.1: children rendered inside Text primitive (button > span wraps label)', function () {
    var { container } = render(<Button>Label Text</Button>);
    var btn = container.querySelector('button');
    var span = btn.querySelector('span');
    // Text renders a span by default. If Button wraps children directly
    // (not via Text), this span will be absent and the test is RED.
    expect(span).not.toBeNull();
    expect(span.textContent).toBe('Label Text');
  });

  // ── Variant colors ─────────────────────────────────────────────────────────

  test('B4.1: primary variant — gold background (tokens.color.brand.gold = rgb(245,200,66))', function () {
    var { container } = render(<Button variant="primary">text</Button>);
    // JSDOM normalizes #F5C842 → rgb(245, 200, 66)
    expect(container.querySelector('button').style.background).toBe('rgb(245, 200, 66)');
  });

  test('B4.2: primary variant — navy text (tokens.color.brand.navy = rgb(15,31,61))', function () {
    var { container } = render(<Button variant="primary">text</Button>);
    // JSDOM normalizes #0F1F3D → rgb(15, 31, 61)
    expect(container.querySelector('button').style.color).toBe('rgb(15, 31, 61)');
  });

  test('B4.3: secondary variant — navy background (rgb(15,31,61))', function () {
    var { container } = render(<Button variant="secondary">text</Button>);
    expect(container.querySelector('button').style.background).toBe('rgb(15, 31, 61)');
  });

  test('B4.4: secondary variant — white text (rgb(255,255,255))', function () {
    var { container } = render(<Button variant="secondary">text</Button>);
    expect(container.querySelector('button').style.color).toBe('rgb(255, 255, 255)');
  });

  test('B4.5: danger variant — error background (tokens.color.status.error = rgb(220,38,38))', function () {
    var { container } = render(<Button variant="danger">text</Button>);
    // JSDOM normalizes #DC2626 → rgb(220, 38, 38)
    expect(container.querySelector('button').style.background).toBe('rgb(220, 38, 38)');
  });

  test('B4.6: danger variant — white text', function () {
    var { container } = render(<Button variant="danger">text</Button>);
    expect(container.querySelector('button').style.color).toBe('rgb(255, 255, 255)');
  });

  // ── Ghost: border uses color.border.* token (not hardcoded rgba) ───────────

  test('B5.1: ghost border-color is tokens.color.border.default (#E2E8F0 = rgb(226,232,240))', function () {
    var { container } = render(<Button variant="ghost">text</Button>);
    var btn = container.querySelector('button');
    // JSDOM parses border shorthand → longhand; normalizes hex → rgb
    // tokens.color.border.default = '#E2E8F0'
    expect(btn.style.borderColor).toBe('rgb(226, 232, 240)');
  });

  test('B5.2: ghost background is transparent (not a solid fill)', function () {
    var { container } = render(<Button variant="ghost">text</Button>);
    expect(container.querySelector('button').style.background).toBe('transparent');
  });

  // ── Disabled: all four behaviors ──────────────────────────────────────────

  test('B6.1: disabled sets reduced opacity (visual non-interactive cue)', function () {
    var { container } = render(<Button disabled>text</Button>);
    var opacity = Number(container.querySelector('button').style.opacity);
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
  });

  test('B6.2: disabled sets cursor:not-allowed', function () {
    var { container } = render(<Button disabled>text</Button>);
    expect(container.querySelector('button').style.cursor).toBe('not-allowed');
  });

  test('B6.3: disabled sets pointer-events:none', function () {
    var { container } = render(<Button disabled>text</Button>);
    expect(container.querySelector('button').style.pointerEvents).toBe('none');
  });

  test('B6.4: disabled onClick guard — handler not called on fireEvent.click', function () {
    var spy = vi.fn();
    var { container } = render(<Button disabled onClick={spy}>text</Button>);
    // fireEvent bypasses the disabled attribute — guard must be explicit in onClick prop
    fireEvent.click(container.querySelector('button'));
    expect(spy).not.toHaveBeenCalled();
  });

  // ── fullWidth ─────────────────────────────────────────────────────────────

  test('B7.1: fullWidth sets width:100%', function () {
    var { container } = render(<Button fullWidth>text</Button>);
    expect(container.querySelector('button').style.width).toBe('100%');
  });

  test('B7.2: fullWidth does NOT set display:block (flex parent semantics preserved)', function () {
    var { container } = render(<Button fullWidth>text</Button>);
    var display = container.querySelector('button').style.display;
    // Block would break flex-child alignment in nav/toolbar parents
    expect(display).not.toBe('block');
    expect(['flex', 'inline-flex']).toContain(display);
  });

  test('B7.3: without fullWidth, width is not 100%', function () {
    var { container } = render(<Button>text</Button>);
    expect(container.querySelector('button').style.width).not.toBe('100%');
  });

  // ── Size → font-size (asserted on the Text span, not the button) ───────────

  test('B8.1: size="sm" → Text renders font-size body (13px = tokens.font.size.body)', function () {
    var { container } = render(<Button size="sm">text</Button>);
    expect(container.querySelector('button span').style.fontSize).toBe('13px');
  });

  test('B8.2: size="md" → Text renders font-size md (14px = tokens.font.size.md)', function () {
    var { container } = render(<Button size="md">text</Button>);
    expect(container.querySelector('button span').style.fontSize).toBe('14px');
  });

  test('B8.3: size="lg" → Text renders font-size lg (16px = tokens.font.size.lg)', function () {
    var { container } = render(<Button size="lg">text</Button>);
    expect(container.querySelector('button span').style.fontSize).toBe('16px');
  });

  // ── Style escape hatch ────────────────────────────────────────────────────

  test('B9.1: style prop merges with computed button styles (both survive)', function () {
    var { container } = render(<Button style={{ marginTop: '8px' }}>text</Button>);
    var btn = container.querySelector('button');
    expect(btn.style.marginTop).toBe('8px');
    expect(btn.style.minHeight).toBe('44px');
  });

});
