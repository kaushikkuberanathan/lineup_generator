import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LockFlow } from './LockFlow';
import { tokens } from '../../theme/tokens';

// ============================================================================
// LockFlow — Story 111 (#297) navyMuted token coverage
//
// #297 originally flagged four locally-declared LockFlow colors (navy, win,
// gold, textMuted) as diverging from tokens.js. By the time this test was
// written, an earlier unrelated Story (87 — BottomSheet primitive migration)
// had already moved navy/win/gold onto tokens.* directly — only textMuted
// remained a genuine local literal (rgba(15,31,61,0.45)), never reconciled.
//
// This test locks that remaining decision in: the inactive step label must
// render from tokens.color.overlay.navyStrong, not a hardcoded literal. LF2's
// first assertion is the RED checkpoint — it fails until the token exists.
// (Lives under color.overlay, not color.text, because theme.tokens.test.js
// enforces color.text as hex-only; this is an rgba value, same family as the
// existing navyWash/navyFaint/navyMedium tint ladder.)
// ============================================================================

function normalizeColor(value) {
  return value.replace(/\s+/g, '');
}

const baseProps = {
  activeWarnings: [],
  nextGame: null,
  hasPin: true,
  onConfirmLock: vi.fn(),
  onRequestPin: vi.fn(),
  onClose: vi.fn(),
};

describe('LockFlow — Story 111 (#297)', function () {

  test('LF1: renders Review Lineup heading on step 1', function () {
    render(<LockFlow {...baseProps} />);
    expect(screen.getByText('Review Lineup')).toBeInTheDocument();
  });

  test('LF2: inactive step label color is sourced from tokens.color.overlay.navyStrong, not a hardcoded literal', function () {
    // RED checkpoint — fails until color.overlay.navyStrong is minted in tokens.js.
    expect(tokens.color.overlay.navyStrong).toBeDefined();

    render(<LockFlow {...baseProps} />);
    // step=1 on mount — "Confirm" is neither active (step 1 is) nor done.
    var inactiveLabel = screen.getByText('Confirm');
    expect(normalizeColor(inactiveLabel.style.color)).toBe(normalizeColor(tokens.color.overlay.navyStrong));
  });

});
