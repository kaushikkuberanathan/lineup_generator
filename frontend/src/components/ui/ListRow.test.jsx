import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ListRow } from './ListRow';

// ============================================================================
// Phase 3 Step 3 — ListRow primitive contract tests
//
// ListRow is a tappable, full-width list row. Used for menu lists, doc
// indexes, and accordion toggles where the header row is the trigger.
// Both v1 consumers — FAQSection accordion rows and LegalSection doc list
// rows — pass internal layout (emoji + title/summary + chevron) as children.
//
// Always renders <button> — ListRow is interactive by contract. Static
// rows are out of scope for v1; if they emerge, introduce a separate
// primitive rather than overloading ListRow with conditional rendering.
//
// Children are NOT wrapped in Text — list rows have caller-composed
// internal layout. Distinct from Button (always Text-wrapped, centered).
//
// WCAG: 44px min-height floor enforced (mirrors Button).
//
// JSDOM inline-style normalization:
//   hex colors → rgb():
//     #FFFFFF (surface.card)       = rgb(255, 255, 255)
//     #E2E8F0 (border.default)     = rgb(226, 232, 240)
//   border shorthand → longhand: assert el.style.borderBottomColor /
//     borderBottomStyle / borderBottomWidth, not el.style.borderBottom.
//   When showDivider=false, primitive sets `borderBottom: 'none'`
//     explicitly so borderBottomStyle === 'none' is deterministic.
// ============================================================================

describe('ListRow — Phase 3 primitive', function () {

  // ── LR1 — Shape + non-wrapping children ──────────────────────────────────

  test('LR1.1: renders a button element', function () {
    var { container } = render(<ListRow onClick={function(){}}>row</ListRow>);
    expect(container.querySelector('button')).not.toBeNull();
  });

  test('LR1.2: type defaults to "button" (not "submit")', function () {
    var { container } = render(<ListRow onClick={function(){}}>row</ListRow>);
    expect(container.querySelector('button').getAttribute('type')).toBe('button');
  });

  test('LR1.3: children rendered WITHOUT inner Text wrapper (direct passthrough)', function () {
    // Distinct from Button (B3.1) and Pill (PL1.3) which wrap in Text.
    // If ListRow wraps its plain string child in <span>, this test goes RED.
    var { container } = render(<ListRow onClick={function(){}}>direct text</ListRow>);
    var btn = container.querySelector('button');
    expect(btn.querySelector('span')).toBeNull();
    expect(btn.textContent).toBe('direct text');
  });

  test('LR1.4: caller-composed children (e.g. nested Stack) render unaltered', function () {
    // Caller responsibility: layout primitives like Stack pass through.
    // Verifies ListRow does not interfere with the inner composition.
    var { container } = render(
      <ListRow onClick={function(){}}>
        <span data-testid="emoji">📜</span>
        <span data-testid="title">Privacy Policy</span>
      </ListRow>
    );
    var btn = container.querySelector('button');
    expect(btn.querySelector('[data-testid="emoji"]')).not.toBeNull();
    expect(btn.querySelector('[data-testid="title"]')).not.toBeNull();
  });

  // ── LR2 — Structural style (variant-independent) ─────────────────────────

  test('LR2.1: width is 100% (full-width row)', function () {
    var { container } = render(<ListRow onClick={function(){}}>row</ListRow>);
    expect(container.querySelector('button').style.width).toBe('100%');
  });

  test('LR2.2: minHeight is 44px (WCAG touch-target floor)', function () {
    var { container } = render(<ListRow onClick={function(){}}>row</ListRow>);
    expect(container.querySelector('button').style.minHeight).toBe('44px');
  });

  test('LR2.3: textAlign is "left" (override default centered button text)', function () {
    var { container } = render(<ListRow onClick={function(){}}>row</ListRow>);
    expect(container.querySelector('button').style.textAlign).toBe('left');
  });

  test('LR2.4: padding is "14px 16px" (matches FAQ + Legal call sites)', function () {
    var { container } = render(<ListRow onClick={function(){}}>row</ListRow>);
    // JSDOM normalizes padding shorthand → longhands; assert top/right/bottom/left
    var btn = container.querySelector('button');
    expect(btn.style.paddingTop).toBe('14px');
    expect(btn.style.paddingBottom).toBe('14px');
    expect(btn.style.paddingLeft).toBe('16px');
    expect(btn.style.paddingRight).toBe('16px');
  });

  test('LR2.5: background is tokens.color.surface.card (rgb(255,255,255))', function () {
    var { container } = render(<ListRow onClick={function(){}}>row</ListRow>);
    expect(container.querySelector('button').style.background).toBe('rgb(255, 255, 255)');
  });

  test('LR2.6: alignItems is "center" (no align prop — center is the locked default)', function () {
    var { container } = render(<ListRow onClick={function(){}}>row</ListRow>);
    expect(container.querySelector('button').style.alignItems).toBe('center');
  });

  // ── LR3 — Divider on (default) ───────────────────────────────────────────

  test('LR3.1: showDivider defaults to true — borderBottomStyle is "solid"', function () {
    var { container } = render(<ListRow onClick={function(){}}>row</ListRow>);
    expect(container.querySelector('button').style.borderBottomStyle).toBe('solid');
  });

  test('LR3.2: showDivider=true borderBottomColor is tokens.color.border.default (rgb(226,232,240))', function () {
    var { container } = render(<ListRow onClick={function(){}}>row</ListRow>);
    expect(container.querySelector('button').style.borderBottomColor).toBe('rgb(226, 232, 240)');
  });

  test('LR3.3: showDivider=true borderBottomWidth is "1px"', function () {
    var { container } = render(<ListRow onClick={function(){}}>row</ListRow>);
    expect(container.querySelector('button').style.borderBottomWidth).toBe('1px');
  });

  // ── LR4 — Divider off ────────────────────────────────────────────────────

  test('LR4.1: showDivider=false — borderBottomStyle is "none"', function () {
    var { container } = render(<ListRow showDivider={false} onClick={function(){}}>row</ListRow>);
    // Primitive sets `borderBottom: 'none'` explicitly when divider is off
    expect(container.querySelector('button').style.borderBottomStyle).toBe('none');
  });

  test('LR4.2: showDivider=false — borderBottomColor is NOT the divider color', function () {
    var { container } = render(<ListRow showDivider={false} onClick={function(){}}>row</ListRow>);
    expect(container.querySelector('button').style.borderBottomColor).not.toBe('rgb(226, 232, 240)');
  });

  // ── LR5 — Disabled: 4 behaviors (mirrors Button B6.1-B6.4) ───────────────

  test('LR5.1: disabled sets reduced opacity', function () {
    var { container } = render(<ListRow disabled onClick={function(){}}>row</ListRow>);
    var opacity = Number(container.querySelector('button').style.opacity);
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
  });

  test('LR5.2: disabled sets cursor:not-allowed', function () {
    var { container } = render(<ListRow disabled onClick={function(){}}>row</ListRow>);
    expect(container.querySelector('button').style.cursor).toBe('not-allowed');
  });

  test('LR5.3: disabled sets pointer-events:none', function () {
    var { container } = render(<ListRow disabled onClick={function(){}}>row</ListRow>);
    expect(container.querySelector('button').style.pointerEvents).toBe('none');
  });

  test('LR5.4: disabled onClick guard — handler not called on fireEvent.click', function () {
    var spy = vi.fn();
    var { container } = render(<ListRow disabled onClick={spy}>row</ListRow>);
    fireEvent.click(container.querySelector('button'));
    expect(spy).not.toHaveBeenCalled();
  });

  // ── LR6 — onClick fires when not disabled ────────────────────────────────

  test('LR6.1: onClick fires on click when enabled', function () {
    var spy = vi.fn();
    var { container } = render(<ListRow onClick={spy}>row</ListRow>);
    fireEvent.click(container.querySelector('button'));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  // ── LR7 — Style escape hatch ─────────────────────────────────────────────

  test('LR7.1: style prop merges — non-conflicting props (marginTop) survive both directions', function () {
    var { container } = render(<ListRow onClick={function(){}} style={{ marginTop: '8px' }}>row</ListRow>);
    var btn = container.querySelector('button');
    expect(btn.style.marginTop).toBe('8px');
    // Token-driven props survive the merge
    expect(btn.style.minHeight).toBe('44px');
    expect(btn.style.width).toBe('100%');
  });

  test('LR7.2: style prop wins on conflict — consumer override beats default background', function () {
    var { container } = render(<ListRow onClick={function(){}} style={{ background: 'tomato' }}>row</ListRow>);
    expect(container.querySelector('button').style.background).toBe('tomato');
  });

  // ── LR8 — ...rest forwarding ─────────────────────────────────────────────

  test('LR8.1: arbitrary props (aria-expanded) forwarded to button via ...rest', function () {
    var { container } = render(
      <ListRow onClick={function(){}} aria-expanded="false">row</ListRow>
    );
    expect(container.querySelector('button').getAttribute('aria-expanded')).toBe('false');
  });

});
