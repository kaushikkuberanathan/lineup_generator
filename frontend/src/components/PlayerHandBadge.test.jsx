import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerHandBadge } from './PlayerHandBadge';

// ============================================================================
// R1 Roster Polish — PlayerHandBadge (root/light variant) token tests
//
// Token applications:
//   fontSize    → tokens.font.size.xs (11px) — WCAG floor upgrade from 10px
//   borderRadius→ tokens.radius.xs    (4px — same value, token ref)
//
// Semantic colors (L=blue, R=gray) have no token equivalents — left as
// literals intentionally: they express L/R identity, not brand palette.
//
// RED→GREEN: R3.5 (fontSize 11px) is a genuine RED against current 10px.
// ============================================================================

describe('PlayerHandBadge (root) — R1 token characterization', function () {

  // ── Functional ───────────────────────────────────────────────────────────

  test('R3.1: renders "L" badge when hand is "L"', function () {
    render(<PlayerHandBadge hand="L" />);
    expect(screen.getByText('L')).toBeInTheDocument();
  });

  test('R3.2: renders "R" badge when hand is "R"', function () {
    render(<PlayerHandBadge hand="R" />);
    expect(screen.getByText('R')).toBeInTheDocument();
  });

  test('R3.3: renders nothing when hand is unset or unrecognised', function () {
    var { container: c1 } = render(<PlayerHandBadge hand="U" />);
    expect(c1.firstChild).toBeNull();
    var { container: c2 } = render(<PlayerHandBadge hand={undefined} />);
    expect(c2.firstChild).toBeNull();
  });

  test('R3.4: badge border-radius is 4px (tokens.radius.xs)', function () {
    render(<PlayerHandBadge hand="R" />);
    var span = screen.getByText('R').parentElement;
    expect(span.style.borderRadius).toBe('4px');
  });

  // ── WCAG floor — fontSize on inner Text span post-Badge-migration ────────

  test('R3.5: badge font-size is 11px (tokens.font.size.xs — WCAG floor)', function () {
    render(<PlayerHandBadge hand="R" />);
    var span = screen.getByText('R');
    // Post-Badge-migration: fontSize lives on inner Text span (composed by
    // Badge). screen.getByText returns the inner span where text resides,
    // so this assertion targets the correct element without traversal.
    expect(span.style.fontSize).toBe('11px');
  });

  test('R3.6: L badge has blue-tinted background (semantic: left-hand identity)', function () {
    render(<PlayerHandBadge hand="L" />);
    var span = screen.getByText('L').parentElement;
    // #dbeafe = rgb(219, 190, 254)? No: db=219, ea=234, fe=254 → rgb(219, 234, 254)
    // JSDOM normalizes hex; assert rgb equivalent
    expect(span.style.background).toBe('rgb(219, 234, 254)');
  });

  test('R3.7: R badge has gray background (semantic: right-hand identity)', function () {
    render(<PlayerHandBadge hand="R" />);
    var span = screen.getByText('R').parentElement;
    // #f3f4f6 = rgb(243, 244, 246)
    expect(span.style.background).toBe('rgb(243, 244, 246)');
  });

});
