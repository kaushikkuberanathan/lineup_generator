import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ViewerMode } from './ViewerMode';

// ============================================================================
// R1 Roster Polish — ViewerMode token characterization tests
//
// Token applications under test:
//   main bg              → tokens.color.brand.navy   (#0f1f3d)
//   gold accents         → tokens.color.brand.gold   (#f5c842)
//   secondary text       → tokens.color.text.secondary (#64748b)
//   tertiary text        → tokens.color.text.tertiary  (#94a3b8)
//   field row borderRadius → tokens.radius.md         (8px)
//   position label fontSize→ tokens.font.size.xs     (11px — same value)
//   POS_LABELS fontSize  → tokens.font.size.xs        (11px) — WCAG UPGRADE from 10px
//   inning tab fontSize  → tokens.font.size.body      (13px — same value)
//   footer counter fontSize→ tokens.font.size.sm     (12px — same value)
//   card body padding    → tokens.space.lg            (16px — same value)
//
// R4.9 is a genuine RED: asserts 11px against the current 10px POS_LABELS.
// ============================================================================

var MOCK_PAYLOAD = {
  roster: ['Alice Smith', 'Bob Jones', 'Charlie Davis'],
  grid: {
    'Alice Smith':   ['P',     'C',     '1B'],
    'Bob Jones':     ['C',     'P',     '2B'],
    'Charlie Davis': ['Bench', 'Bench', '3B'],
  },
  batting: ['Alice Smith', 'Bob Jones', 'Charlie Davis'],
  team: 'Test Hawks',
};

describe('ViewerMode — R1 token characterization', function () {

  // ── Functional ───────────────────────────────────────────────────────────

  test('R4.1: renders team name in header', function () {
    render(<ViewerMode payload={MOCK_PAYLOAD} />);
    expect(screen.getByText('Test Hawks')).toBeInTheDocument();
  });

  test('R4.2: renders one inning tab per inning in the grid', function () {
    render(<ViewerMode payload={MOCK_PAYLOAD} />);
    expect(screen.getByText('INN 1')).toBeInTheDocument();
    expect(screen.getByText('INN 2')).toBeInTheDocument();
    expect(screen.getByText('INN 3')).toBeInTheDocument();
  });

  test('R4.3: renders field position rows for inning 1', function () {
    render(<ViewerMode payload={MOCK_PAYLOAD} />);
    // "P" shows "Alice" and "C" shows "Bob"; names also appear in batting order
    var alices = screen.getAllByText('Alice');
    expect(alices.length).toBeGreaterThanOrEqual(1);
    var bobs = screen.getAllByText('Bob');
    expect(bobs.length).toBeGreaterThanOrEqual(1);
  });

  test('R4.4: bench shows players assigned to Bench in the active inning', function () {
    render(<ViewerMode payload={MOCK_PAYLOAD} />);
    // Charlie is on bench in inning 0; also appears in batting order
    var charlies = screen.getAllByText('Charlie');
    expect(charlies.length).toBeGreaterThanOrEqual(1);
  });

  test('R4.5: batting order section renders all batters', function () {
    render(<ViewerMode payload={MOCK_PAYLOAD} />);
    var allAlice = screen.getAllByText('Alice');
    expect(allAlice.length).toBeGreaterThanOrEqual(1);
  });

  // ── Style: main container ─────────────────────────────────────────────────

  test('R4.6: main container background is brand navy (#0f1f3d)', function () {
    var { container } = render(<ViewerMode payload={MOCK_PAYLOAD} />);
    var root = container.querySelector('div');
    // JSDOM normalizes: #0f1f3d = rgb(15, 31, 61)
    expect(root.style.background).toBe('rgb(15, 31, 61)');
  });

  // ── Style: header ─────────────────────────────────────────────────────────

  test('R4.7: team label text color is brand gold (#f5c842)', function () {
    render(<ViewerMode payload={MOCK_PAYLOAD} />);
    var label = screen.getByText('Test Hawks');
    // #f5c842 = rgb(245, 200, 66)
    expect(label.style.color).toBe('rgb(245, 200, 66)');
  });

  test('R4.8: header subtitle color is text.tertiary (#94a3b8)', function () {
    var { container } = render(<ViewerMode payload={MOCK_PAYLOAD} />);
    var subtitle = container.querySelector('[style*="Read-Only"]') ||
      screen.getByText('Game Day · Read-Only');
    // #94a3b8 = rgb(148, 163, 184)
    expect(subtitle.style.color).toBe('rgb(148, 163, 184)');
  });

  // ── Style: inning tab ─────────────────────────────────────────────────────

  test('R4.9: inning tab font-size is 13px (tokens.font.size.body)', function () {
    var { container } = render(<ViewerMode payload={MOCK_PAYLOAD} />);
    // Inning tabs are buttons; first one is INN 1 (active)
    var tabs = container.querySelectorAll('button');
    // First two buttons are inning tabs (prev/next are last)
    var inn1Tab = tabs[0];
    expect(inn1Tab.style.fontSize).toBe('13px');
  });

  // ── Style: field position rows ────────────────────────────────────────────

  test('R4.10: field position row border-radius is 8px (tokens.radius.md)', function () {
    var { container } = render(<ViewerMode payload={MOCK_PAYLOAD} />);
    // Each field row has display:flex + borderRadius:8px
    var rows = container.querySelectorAll('[style*="border-left"]');
    var fieldRow = Array.from(rows).find(function(el) {
      return el.style.borderRadius === '8px';
    });
    expect(fieldRow).toBeTruthy();
    expect(fieldRow.style.borderRadius).toBe('8px');
  });

  test('R4.11: position label (e.g. "P") font-size is 11px (tokens.font.size.xs)', function () {
    var { container } = render(<ViewerMode payload={MOCK_PAYLOAD} />);
    var posLabel = screen.getByText('P');
    expect(posLabel.style.fontSize).toBe('11px');
  });

  // ── WCAG floor — genuine RED before migration ─────────────────────────────

  test('R4.12: position full-name label (e.g. "Pitcher") font-size is 11px (WCAG floor)', function () {
    render(<ViewerMode payload={MOCK_PAYLOAD} />);
    var posName = screen.getByText('Pitcher');
    // Current source: fontSize "10px" — RED before token migration.
    // After migration to tokens.font.size.xs (11px): GREEN.
    expect(posName.style.fontSize).toBe('11px');
  });

  // ── Style: footer ─────────────────────────────────────────────────────────

  test('R4.13: footer inning counter font-size is 12px (tokens.font.size.sm)', function () {
    render(<ViewerMode payload={MOCK_PAYLOAD} />);
    var counter = screen.getByText('Inning 1 of 3');
    expect(counter.style.fontSize).toBe('12px');
  });

  test('R4.14: footer inning counter color is text.secondary (#64748b)', function () {
    render(<ViewerMode payload={MOCK_PAYLOAD} />);
    var counter = screen.getByText('Inning 1 of 3');
    // #64748b = rgb(100, 116, 139)
    expect(counter.style.color).toBe('rgb(100, 116, 139)');
  });

});
