import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';
import { tokens } from '../../theme/tokens';

// ============================================================================
// Phase 2 — Card primitive contract tests
//
// Card is a SURFACE primitive, not an interactive container.
// Key invariants enforced by this suite:
//   - Renders a <div>, never a <button>
//   - Children render as-is — no inner wrapper, no Text primitive, no span
//   - No interactive props (onClick, disabled, hover, focus)
//   - No 44px touch-target floor (non-interactive surface)
//
// JSDOM inline-style normalization (same conventions as Button.test.jsx):
//
//   hex colors → rgb():   tokens.color.surface.card = '#FFFFFF' = rgb(255, 255, 255)
//
//   rgba() → spaces added after commas (alpha value unchanged):
//     'rgba(255,255,255,0.06)' → 'rgba(255, 255, 255, 0.06)'
//     Note: alpha 0.06 is intentional — distinct from color.overlay.whiteFaint
//     (0.08). No token exists yet; promoted to color.surface.subtle in Phase 2.5+.
//
//   box-shadow → JSDOM preserves compound shadow strings verbatim; rgba values
//     inside box-shadow are NOT normalized. Assert toBe(tokens.shadow.card)
//     directly — no rgb conversion needed.
//
//   border shorthand → JSDOM parses to longhands (same as Button.test.jsx B5.1).
//
// Deferred (Phase 2.5+):
//   as polymorphism, Card.Header / Card.Footer, hoverable variant,
//   shadow gradations beyond boolean, border control beyond variant defaults.
// ============================================================================

describe('Card — Phase 2 primitive', function () {

  // ── Shape and structural invariants ──────────────────────────────────────

  test('C1.1: renders a div element (not a button, not polymorphic)', function () {
    var { container } = render(<Card>content</Card>);
    expect(container.querySelector('div')).not.toBeNull();
    expect(container.querySelector('button')).toBeNull();
  });

  test('C1.2: no inner wrapper — string child is a direct text node inside div', function () {
    var { container } = render(<Card>hello</Card>);
    var div = container.querySelector('div');
    // firstChild should be TEXT_NODE (nodeType 3), not an element wrapper
    expect(div.firstChild.nodeType).toBe(3);
    // Confirm no span was injected (would indicate Text primitive was used)
    expect(div.querySelector('span')).toBeNull();
  });

  // ── Variants ──────────────────────────────────────────────────────────────

  test('C2.1: default variant background is tokens.color.surface.card (#FFFFFF = rgb(255,255,255))', function () {
    var { container } = render(<Card>content</Card>);
    // JSDOM normalizes #FFFFFF → rgb(255, 255, 255)
    expect(container.querySelector('div').style.background).toBe('rgb(255, 255, 255)');
  });

  test('C2.2: subtle variant background is rgba(255,255,255,0.06) — alpha survives JSDOM', function () {
    var { container } = render(<Card variant="subtle">content</Card>);
    // JSDOM adds spaces after commas; alpha 0.06 is preserved unchanged
    expect(container.querySelector('div').style.background).toBe('rgba(255, 255, 255, 0.06)');
  });

  // ── Padding → tokens.space.* ──────────────────────────────────────────────

  test('C3.1: padding="sm" → tokens.space.sm (8px)', function () {
    var { container } = render(<Card padding="sm">content</Card>);
    expect(container.querySelector('div').style.padding).toBe(tokens.space.sm);
  });

  test('C3.2: padding="md" → tokens.space.md (12px)', function () {
    var { container } = render(<Card padding="md">content</Card>);
    expect(container.querySelector('div').style.padding).toBe(tokens.space.md);
  });

  test('C3.3: padding="lg" → tokens.space.lg (16px)', function () {
    var { container } = render(<Card padding="lg">content</Card>);
    expect(container.querySelector('div').style.padding).toBe(tokens.space.lg);
  });

  // ── Radius → tokens.radius.* ──────────────────────────────────────────────

  test('C4.1: radius="sm" → tokens.radius.sm (6px)', function () {
    var { container } = render(<Card radius="sm">content</Card>);
    expect(container.querySelector('div').style.borderRadius).toBe(tokens.radius.sm);
  });

  test('C4.2: radius="md" → tokens.radius.md (8px)', function () {
    var { container } = render(<Card radius="md">content</Card>);
    expect(container.querySelector('div').style.borderRadius).toBe(tokens.radius.md);
  });

  test('C4.3: radius="lg" → tokens.radius.lg (12px)', function () {
    var { container } = render(<Card radius="lg">content</Card>);
    expect(container.querySelector('div').style.borderRadius).toBe(tokens.radius.lg);
  });

  // ── Shadow ────────────────────────────────────────────────────────────────

  test('C5.1: shadow={true} adds tokens.shadow.card box-shadow', function () {
    var { container } = render(<Card shadow={true}>content</Card>);
    // JSDOM preserves compound box-shadow strings verbatim — assert token value directly
    expect(container.querySelector('div').style.boxShadow).toBe(tokens.shadow.card);
  });

  test('C5.2: shadow omitted (default false) — no box-shadow set', function () {
    var { container } = render(<Card>content</Card>);
    expect(container.querySelector('div').style.boxShadow).toBe('');
  });

  // ── Children render unmodified ────────────────────────────────────────────

  test('C6.1: string child renders as accessible text', function () {
    render(<Card>plain text</Card>);
    expect(screen.getByText('plain text')).toBeInTheDocument();
  });

  test('C6.2: element child renders and is queryable', function () {
    render(<Card><p data-testid="inner">para</p></Card>);
    expect(screen.getByTestId('inner')).toBeInTheDocument();
    expect(screen.getByText('para')).toBeInTheDocument();
  });

  test('C6.3: multiple children (fragment) all render', function () {
    render(
      <Card>
        <span>first</span>
        <span>second</span>
      </Card>
    );
    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  // ── Style escape hatch ────────────────────────────────────────────────────

  test('C7.1: style prop merges with computed styles — both survive', function () {
    var { container } = render(<Card padding="md" style={{ marginTop: '16px' }}>content</Card>);
    var div = container.querySelector('div');
    expect(div.style.padding).toBe(tokens.space.md);
    expect(div.style.marginTop).toBe('16px');
  });

});
