import React from 'react';
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { OfflineIndicator } from '../components/Shared/OfflineIndicator';
import { DefenseDiamond } from '../components/GameDay/DefenseDiamond';
import { NowBattingBar } from '../components/GameDay/NowBattingStrip';
import { LockFlow } from '../components/GameDay/LockFlow';
import { tokens } from '../theme/tokens';

// ============================================================================
// F3 — OfflineIndicator: status label font-size must meet 12px WCAG floor
// ============================================================================

describe('F3 — OfflineIndicator font-size floor', function() {

  test('F3.1 offline + no cache: label font-size is 12px', function() {
    var { container } = render(
      <OfflineIndicator isOnline={false} hasCache={false} isLandscape={false} />
    );
    var span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span.style.fontSize).toBe('12px');
  });

  test('F3.2 offline + has cache: label font-size is 12px', function() {
    var { container } = render(
      <OfflineIndicator isOnline={false} hasCache={true} isLandscape={false} />
    );
    var span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span.style.fontSize).toBe('12px');
  });

  test('F3.3 online + has cache (offline-ready): label font-size is 12px', function() {
    var { container } = render(
      <OfflineIndicator isOnline={true} hasCache={true} isLandscape={false} />
    );
    var span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span.style.fontSize).toBe('12px');
  });

  test('F3.4 landscape mode: span is suppressed (no style assertion needed)', function() {
    var { container } = render(
      <OfflineIndicator isOnline={false} hasCache={true} isLandscape={true} />
    );
    expect(container.querySelector('span')).toBeNull();
  });

  test('F3.5 online + no cache: renders null (happy path)', function() {
    var { container } = render(
      <OfflineIndicator isOnline={true} hasCache={false} isLandscape={false} />
    );
    expect(container.firstChild).toBeNull();
  });

});

// ============================================================================
// F1/F2 — DefenseDiamond: field-label font-sizes must meet project a11y floor
// ============================================================================

describe('F1/F2 — DefenseDiamond field-label fonts', function() {

  var roster = [{ name: 'Alice' }, { name: 'Bob' }];
  // F1: basic grid — "Inn" label always renders
  var gridBase = { 'Alice': ['P', 'P'], 'Bob': ['C', 'C'] };
  // F2: Alice is Out in inning 0 — triggers maxOut > 0, rendering the "Out" header td
  var gridWithOut = { 'Alice': ['Out', 'P'], 'Bob': ['C', 'C'] };

  test('F1 — "Inn" row label font-size meets 11px project floor', function() {
    var { container } = render(
      <DefenseDiamond roster={roster} grid={gridBase} innings={2} />
    );
    var spans = Array.from(container.querySelectorAll('span'));
    var innSpan = spans.find(function(s) { return s.textContent.trim() === 'Inn'; });
    expect(innSpan).not.toBeNull();
    expect(innSpan.style.fontSize).toBe('11px');
  });

  test('F2 — "Out" section header font-size meets 11px project floor', function() {
    var { container } = render(
      <DefenseDiamond roster={roster} grid={gridWithOut} innings={2} />
    );
    var tds = Array.from(container.querySelectorAll('td'));
    var outTd = tds.find(function(td) { return td.textContent.trim() === 'Out'; });
    expect(outTd).not.toBeNull();
    expect(outTd.style.fontSize).toBe('11px');
  });

});

// ============================================================================
// F4/F5 — NowBattingStrip: icon-only chevron buttons need aria-label, not title
// ============================================================================

describe('F4/F5 — NowBattingStrip aria-labels', function() {

  var battingOrder = ['Alice', 'Bob', 'Charlie'];

  test('F4 — Previous batter button has aria-label and no title', function() {
    var { container } = render(
      <NowBattingBar
        battingOrder={battingOrder}
        currentIndex={0}
        onAdvance={function() {}}
        onBack={function() {}}
      />
    );
    var btn = container.querySelector('button[aria-label="Previous batter"]');
    expect(btn).not.toBeNull();
    expect(btn.hasAttribute('title')).toBe(false);
  });

  test('F5 — Next batter button has aria-label and no title', function() {
    var { container } = render(
      <NowBattingBar
        battingOrder={battingOrder}
        currentIndex={0}
        onAdvance={function() {}}
        onBack={function() {}}
      />
    );
    var btn = container.querySelector('button[aria-label="Next batter"]');
    expect(btn).not.toBeNull();
    expect(btn.hasAttribute('title')).toBe(false);
  });

});

// ============================================================================
// F6 — LockFlow modal a11y attributes
// ============================================================================

describe('F6 — LockFlow modal a11y attributes', function() {

  test('F6 — modal panel has dialog role + aria-modal + aria-label', function() {
    var { container } = render(
      <LockFlow
        activeWarnings={[]}
        nextGame={null}
        hasPin={false}
        onConfirmLock={function() {}}
        onRequestPin={function() {}}
        onClose={function() {}}
      />
    );
    var dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Lock Lineup');
  });

});

// ============================================================================
// F7 — DefenseDiamond inning row contrast (Option A: outlined pill)
// ============================================================================

describe('F7 — DefenseDiamond inning pill contrast', function() {

  var roster = [{ name: 'Alice' }, { name: 'Bob' }];
  var grid   = { 'Alice': ['P', 'P'], 'Bob': ['C', 'C'] };

  test('F7 — selected pill red-outlined, unselected pills navy-outlined, transparent background', function() {
    var { container } = render(
      <DefenseDiamond
        roster={roster}
        grid={grid}
        innings={2}
        selectedInning={0}
        onSelectInning={function() {}}
      />
    );

    var buttons        = Array.from(container.querySelectorAll('button'));
    var allBtn         = buttons.find(function(b) { return b.textContent.trim() === 'All'; });
    var selectedPill   = buttons.find(function(b) { return b.textContent.trim() === '1'; });
    var unselectedPill = buttons.find(function(b) { return b.textContent.trim() === '2'; });

    expect(allBtn).not.toBeNull();
    expect(selectedPill).not.toBeNull();
    expect(unselectedPill).not.toBeNull();

    // Selected inning pill ("1") — red fill, red border, white text
    expect(selectedPill.style.backgroundColor).toContain('200, 16, 46');   // rgb(#c8102e)
    expect(selectedPill.style.borderColor).toContain('200, 16, 46');
    expect(selectedPill.style.color).toContain('255, 255, 255');            // rgb(#fff)

    // Unselected inning pill ("2") — transparent bg, navy border, navy text
    expect(unselectedPill.style.backgroundColor).not.toContain('15, 31, 61'); // no navy fill
    expect(unselectedPill.style.borderColor).toContain('15, 31, 61');         // rgb(#0F1F3D)
    expect(unselectedPill.style.color).toContain('15, 31, 61');

    // Unselected "All" button — same contract as unselected inning pill
    expect(allBtn.style.backgroundColor).not.toContain('15, 31, 61');
    expect(allBtn.style.borderColor).toContain('15, 31, 61');
    expect(allBtn.style.color).toContain('15, 31, 61');
  });

});

// ============================================================================
// F8 — InningModal POS_COLORS.LC matches canonical color.position.LC (#794)
// ============================================================================

describe('F8 — gameDay.inningModal.posColors.lc matches color.position.LC', function() {

  test('F8 — LC no longer diverges to green; matches the blue used elsewhere', function() {
    expect(tokens.color.gameDay.inningModal.posColors.lc).toBe(tokens.color.position.LC);
  });

});

// ============================================================================
// F9 — gameDay.text.caption WCAG AA contrast against the scoreboard surface (#704)
// ============================================================================

function relLuminance(hex) {
  var h = hex.replace('#', '');
  var r = parseInt(h.substring(0, 2), 16) / 255;
  var g = parseInt(h.substring(2, 4), 16) / 255;
  var b = parseInt(h.substring(4, 6), 16) / 255;
  function chan(c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

function contrastRatio(hexA, hexB) {
  var lA = relLuminance(hexA) + 0.05;
  var lB = relLuminance(hexB) + 0.05;
  return lA > lB ? lA / lB : lB / lA;
}

describe('F9 — gameDay.text.caption WCAG AA contrast', function() {

  test('F9 — caption clears the 4.5:1 WCAG AA normal-text minimum against surface.scoreboard', function() {
    var ratio = contrastRatio(tokens.color.gameDay.text.caption, tokens.color.gameDay.surface.scoreboard);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

});
