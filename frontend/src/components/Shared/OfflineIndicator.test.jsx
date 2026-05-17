import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineIndicator } from './OfflineIndicator';

// ============================================================================
// Phase 3 Step 4 — OfflineIndicator contract tests
//
// These tests lock the current visual contract before the primitive migration.
// All assertions match the pre-migration inline-styled implementation. The
// migration to Stack must preserve every assertion below.
//
// Note: the existing F3 assertion in a11y-component-fixes.test.jsx covers
// font-floor (a11y). OI-series is additive — no F3 duplication here.
//
// JSDOM inline-style normalization:
//   hex colors → rgb():
//     #C8102E (brand.red, "No Connection")   = rgb(200, 16, 46)
//     #D4A017 (status.warning, "Offline Mode") = rgb(212, 160, 23)
//     #27AE60 (status.success, "Offline Ready") = rgb(39, 174, 96)
//
// The three dot colors map exactly to tokens (token wins captured by
// OI2.2/OI3.2/OI4.2). The rgba background/border tints remain literal —
// no token equivalents for the alpha-blended variants.
//
// DOM structure (both pre- and post-migration):
//   <div>           ← outer wrapper (Stack post-migration)
//     <div />       ← colored dot (7×7px, borderRadius:50%, background=state color)
//     <span /> or null  ← label, omitted when isLandscape=true
//   </div>
// ============================================================================

describe('OfflineIndicator — Phase 3 primitive migration contract', function () {

  // ── OI1 — Null state (happy path) ────────────────────────────────────────

  test('OI1.1: returns null when isOnline=true and hasCache=false', function () {
    var { container } = render(
      <OfflineIndicator isOnline={true} hasCache={false} isLandscape={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  // ── OI2 — No Connection (!isOnline && !hasCache) ─────────────────────────

  test('OI2.1: renders when isOnline=false, hasCache=false', function () {
    var { container } = render(
      <OfflineIndicator isOnline={false} hasCache={false} isLandscape={false} />
    );
    expect(container.firstChild).not.toBeNull();
  });

  test('OI2.2: dot background is tokens.color.brand.red (rgb(200,16,46))', function () {
    var { container } = render(
      <OfflineIndicator isOnline={false} hasCache={false} isLandscape={false} />
    );
    // Dot is the first child div inside the wrapper (always present, before optional label span)
    var dot = container.firstChild.firstChild;
    expect(dot.style.background).toBe('rgb(200, 16, 46)');
  });

  test('OI2.3: label text "No Connection" is present', function () {
    render(<OfflineIndicator isOnline={false} hasCache={false} isLandscape={false} />);
    expect(screen.getByText('No Connection')).toBeInTheDocument();
  });

  // ── OI3 — Offline Mode (!isOnline && hasCache) ───────────────────────────

  test('OI3.1: renders when isOnline=false, hasCache=true', function () {
    var { container } = render(
      <OfflineIndicator isOnline={false} hasCache={true} isLandscape={false} />
    );
    expect(container.firstChild).not.toBeNull();
  });

  test('OI3.2: dot background is tokens.color.status.warning (rgb(212,160,23))', function () {
    var { container } = render(
      <OfflineIndicator isOnline={false} hasCache={true} isLandscape={false} />
    );
    var dot = container.firstChild.firstChild;
    expect(dot.style.background).toBe('rgb(212, 160, 23)');
  });

  test('OI3.3: label text "Offline Mode" is present', function () {
    render(<OfflineIndicator isOnline={false} hasCache={true} isLandscape={false} />);
    expect(screen.getByText('Offline Mode')).toBeInTheDocument();
  });

  // ── OI4 — Offline Ready (isOnline && hasCache) ───────────────────────────

  test('OI4.1: renders when isOnline=true, hasCache=true', function () {
    var { container } = render(
      <OfflineIndicator isOnline={true} hasCache={true} isLandscape={false} />
    );
    expect(container.firstChild).not.toBeNull();
  });

  test('OI4.2: dot background is tokens.color.status.success (rgb(39,174,96))', function () {
    var { container } = render(
      <OfflineIndicator isOnline={true} hasCache={true} isLandscape={false} />
    );
    var dot = container.firstChild.firstChild;
    expect(dot.style.background).toBe('rgb(39, 174, 96)');
  });

  test('OI4.3: label text "Offline Ready" is present', function () {
    render(<OfflineIndicator isOnline={true} hasCache={true} isLandscape={false} />);
    expect(screen.getByText('Offline Ready')).toBeInTheDocument();
  });

  // ── OI5 — Landscape mode (label conditionally rendered) ──────────────────

  test('OI5.1: label is absent from DOM when isLandscape=true', function () {
    // Current implementation at L29: `{!isLandscape ? <span>...</span> : null}`
    // — the label is conditionally rendered, not display:none'd. Assert absence.
    var { container } = render(
      <OfflineIndicator isOnline={false} hasCache={false} isLandscape={true} />
    );
    expect(container.querySelector('span')).toBeNull();
    // Component still renders the outer wrapper + dot
    expect(container.firstChild).not.toBeNull();
  });

  // ── OI6 — Non-interactive contract (must NOT become a Pill/Button) ───────

  test('OI6.1: container contains no <button> element', function () {
    // Defensive: locks the decision that OfflineIndicator is non-interactive.
    // If migration accidentally adopts Pill (which renders <button>), this fails.
    var { container } = render(
      <OfflineIndicator isOnline={false} hasCache={false} isLandscape={false} />
    );
    expect(container.querySelector('button')).toBeNull();
  });

  // ── OI7 — Layout structure (locks flex contract for Stack migration) ─────

  test('OI7.1: outer container has display:flex', function () {
    var { container } = render(
      <OfflineIndicator isOnline={false} hasCache={false} isLandscape={false} />
    );
    expect(container.firstChild.style.display).toBe('flex');
  });

  test('OI7.2: outer container alignItems is "center"', function () {
    var { container } = render(
      <OfflineIndicator isOnline={false} hasCache={false} isLandscape={false} />
    );
    expect(container.firstChild.style.alignItems).toBe('center');
  });

});
