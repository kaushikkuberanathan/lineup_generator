import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Pill } from './Pill';
import { tokens } from '../../theme/tokens';

// ============================================================================
// Phase 3 Step 3 — Pill primitive contract tests
//
// Pill is a compact toggle chip used in horizontal-scroll selectors (FAQ
// category picker is the v1 consumer). Pill renders <button> and ALWAYS
// composes children inside the Text primitive — active/inactive variants
// drive Text's weight prop.
//
// Pill DOES NOT enforce 44px touch-target floor. Chips are compact
// affordances; the row-of-Pills, not the individual Pill, is the semantic
// hit target. If a single-Pill control surface emerges, replace with Button.
//
// JSDOM inline-style normalization (same conventions as all prior primitives):
//   hex colors → rgb():
//     #0F1F3D (brand.navy)         = rgb(15, 31, 61)
//     #64748B (text.secondary)     = rgb(100, 116, 139)
//     #E2E8F0 (border.default)     = rgb(226, 232, 240)
//     #FFFFFF / #ffffff (white)    = rgb(255, 255, 255)
//   border shorthand → longhand: Pill sets borderColor explicitly
//     (mirrors Button.ghost). Assert el.style.borderColor, not el.style.border.
//
// Composition note: Pill renders
//     <button style={chrome}><Text size="sm" weight={...} family="serif">…</Text></button>
//   outer button → background, color, borderRadius, borderColor, layout chrome
//   inner span   → fontSize, fontWeight (Text primitive)
//   Active state changes Text weight from 'medium' (500) to 'semibold' (600).
//
// Deferred (Phase 3.5+): icon slot, count badge, multi-select group primitive.
// ============================================================================

describe('Pill — Phase 3 primitive', function () {

  // ── PL1 — Shape + Text composition ───────────────────────────────────────

  test('PL1.1: renders a button element', function () {
    var { container } = render(<Pill>cat</Pill>);
    expect(container.querySelector('button')).not.toBeNull();
  });

  test('PL1.2: type defaults to "button" (not "submit")', function () {
    var { container } = render(<Pill>cat</Pill>);
    expect(container.querySelector('button').getAttribute('type')).toBe('button');
  });

  test('PL1.3: children rendered inside Text primitive (button > span composition)', function () {
    var { container } = render(<Pill>Lineup Basics</Pill>);
    var btn = container.querySelector('button');
    var span = btn.querySelector('span');
    // If Pill wraps children directly (not via Text), span is absent → RED
    expect(span).not.toBeNull();
    expect(span.textContent).toBe('Lineup Basics');
  });

  // ── PL2 — Active variant ─────────────────────────────────────────────────

  test('PL2.1: active background is tokens.color.brand.navy (rgb(15,31,61))', function () {
    var { container } = render(<Pill active>cat</Pill>);
    expect(container.querySelector('button').style.background).toBe('rgb(15, 31, 61)');
  });

  test('PL2.2: active color is white (rgb(255,255,255))', function () {
    var { container } = render(<Pill active>cat</Pill>);
    expect(container.querySelector('button').style.color).toBe('rgb(255, 255, 255)');
  });

  test('PL2.3: active borderColor is tokens.color.brand.navy (rgb(15,31,61))', function () {
    var { container } = render(<Pill active>cat</Pill>);
    // border shorthand → longhand; assert color longhand
    expect(container.querySelector('button').style.borderColor).toBe('rgb(15, 31, 61)');
  });

  test('PL2.4: active inner Text fontWeight is 600 (semibold)', function () {
    var { container } = render(<Pill active>cat</Pill>);
    var inner = container.querySelector('button span');
    expect(inner.style.fontWeight).toBe('600');
  });

  // ── PL3 — Inactive variant (default) ─────────────────────────────────────

  test('PL3.1: inactive (default) background is tokens.color.surface.card (rgb(255,255,255))', function () {
    var { container } = render(<Pill>cat</Pill>);
    expect(container.querySelector('button').style.background).toBe('rgb(255, 255, 255)');
  });

  test('PL3.2: inactive color is tokens.color.text.secondary (rgb(100,116,139))', function () {
    var { container } = render(<Pill>cat</Pill>);
    expect(container.querySelector('button').style.color).toBe('rgb(100, 116, 139)');
  });

  test('PL3.3: inactive borderColor is tokens.color.border.default (rgb(226,232,240))', function () {
    var { container } = render(<Pill>cat</Pill>);
    expect(container.querySelector('button').style.borderColor).toBe('rgb(226, 232, 240)');
  });

  test('PL3.4: inactive inner Text fontWeight is 500 (medium)', function () {
    var { container } = render(<Pill>cat</Pill>);
    var inner = container.querySelector('button span');
    expect(inner.style.fontWeight).toBe('500');
  });

  // ── PL4 — Base style (constant across variants) ──────────────────────────

  test('PL4.1: borderRadius is tokens.radius.pill ("9999px")', function () {
    var { container } = render(<Pill>cat</Pill>);
    // tokens.radius.pill = '9999px' — no JSDOM normalization for px values
    expect(container.querySelector('button').style.borderRadius).toBe(tokens.radius.pill);
  });

  test('PL4.2: flexShrink is "0" (critical for horizontal-scroll parents)', function () {
    var { container } = render(<Pill>cat</Pill>);
    expect(container.querySelector('button').style.flexShrink).toBe('0');
  });

  test('PL4.3: whiteSpace is "nowrap" (chip labels never wrap)', function () {
    var { container } = render(<Pill>cat</Pill>);
    expect(container.querySelector('button').style.whiteSpace).toBe('nowrap');
  });

  test('PL4.4: inner Text fontSize is tokens.font.size.sm (12px)', function () {
    var { container } = render(<Pill>cat</Pill>);
    var inner = container.querySelector('button span');
    expect(inner.style.fontSize).toBe('12px');
  });

  // ── PL5 — Disabled: 4 behaviors (mirrors Button B6.1-B6.4) ───────────────

  test('PL5.1: disabled sets reduced opacity (visual non-interactive cue)', function () {
    var { container } = render(<Pill disabled>cat</Pill>);
    var opacity = Number(container.querySelector('button').style.opacity);
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
  });

  test('PL5.2: disabled sets cursor:not-allowed', function () {
    var { container } = render(<Pill disabled>cat</Pill>);
    expect(container.querySelector('button').style.cursor).toBe('not-allowed');
  });

  test('PL5.3: disabled sets pointer-events:none', function () {
    var { container } = render(<Pill disabled>cat</Pill>);
    expect(container.querySelector('button').style.pointerEvents).toBe('none');
  });

  test('PL5.4: disabled onClick guard — handler not called on fireEvent.click', function () {
    var spy = vi.fn();
    var { container } = render(<Pill disabled onClick={spy}>cat</Pill>);
    // fireEvent bypasses the disabled attribute — guard must be explicit in onClick prop
    fireEvent.click(container.querySelector('button'));
    expect(spy).not.toHaveBeenCalled();
  });

  // ── PL6 — Style escape hatch ─────────────────────────────────────────────

  test('PL6.1: style prop merges — non-conflicting props (marginLeft) survive both directions', function () {
    var { container } = render(<Pill style={{ marginLeft: '4px' }}>cat</Pill>);
    var btn = container.querySelector('button');
    expect(btn.style.marginLeft).toBe('4px');
    // Token-driven props survive the merge
    expect(btn.style.borderRadius).toBe(tokens.radius.pill);
  });

  test('PL6.2: style prop wins on conflict — consumer override beats variant token', function () {
    var { container } = render(<Pill active style={{ background: 'tomato' }}>cat</Pill>);
    // Object.assign order: BASE → VARIANT → DISABLED → style — consumer is last
    expect(container.querySelector('button').style.background).toBe('tomato');
  });

  // ── PL7 — ...rest forwarding ─────────────────────────────────────────────

  test('PL7.1: arbitrary props (aria-pressed) forwarded to button via ...rest', function () {
    var { container } = render(<Pill active aria-pressed="true">cat</Pill>);
    expect(container.querySelector('button').getAttribute('aria-pressed')).toBe('true');
  });

});
