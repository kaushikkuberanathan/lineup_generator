import React from 'react';
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { OfflineIndicator } from '../components/Shared/OfflineIndicator';
import { DefenseDiamond } from '../components/GameDay/DefenseDiamond';
import { NowBattingBar } from '../components/GameDay/NowBattingStrip';

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
