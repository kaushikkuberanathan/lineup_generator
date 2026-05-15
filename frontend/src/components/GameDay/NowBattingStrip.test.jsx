import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NowBattingBar } from './NowBattingStrip';

// ============================================================================
// NowBattingStrip — PlayerHandBadge dark-context regression guard
//
// NowBattingStrip renders on the dark navy game-day surface. Player hand
// badges inside its pills must use the dark variant (whiteLight overlay
// background) regardless of which PlayerHandBadge implementation backs them.
//
// This guard stays GREEN across the Phase 3 PlayerHandBadge consolidation:
//   - Before Step 2.D.4: NowBattingStrip imports Shared/PlayerHandBadge
//     (a bare <span> with the dark background applied directly to it).
//   - After Step 2.D.4: NowBattingStrip imports root PlayerHandBadge,
//     which composes Badge (outer styled <span> > Text > inner text <span>).
//
// The OR-chain traversal below tolerates both structures: it reads the
// background from the text element itself (bare-span case) or from its
// parent (nested-Badge case) — wherever the dark background lives. Text is
// a typography primitive and never sets a background under any prop
// combination, so the chain is unambiguous.
//
// Asserts background only. Color-on-dark is covered at the unit level by
// Badge.test.jsx (BD8.2/BD9.2) and PlayerHandBadge.test.jsx (R3.9); this
// guard's unique job is proving NowBattingStrip's wiring produces the dark
// variant at all.
// ============================================================================

describe('NowBattingStrip — hand badge dark context', function () {

  test('renders the active batter hand badge with dark-surface background', function () {
    var roster = [
      { name: 'Alice',   battingHand: 'L' },
      { name: 'Bob',     battingHand: 'R' },
      { name: 'Charlie', battingHand: 'U' },
    ];
    render(
      <NowBattingBar
        battingOrder={['Alice', 'Bob', 'Charlie']}
        currentIndex={0}
        roster={roster}
        onAdvance={function () {}}
        onBack={function () {}}
      />
    );

    // Alice (currentIndex=0) renders an "L" badge; Bob renders "R"; Charlie's
    // "U" short-circuits to null — so 'L' resolves to exactly one element.
    var textEl = screen.getByText('L');

    // Structure-tolerant: the dark background lives on the text element
    // itself (current Shared/ bare span) or on its parent (future
    // root → Badge nested span).
    var bg = textEl.style.background || textEl.parentElement.style.background;

    // tokens.color.overlay.whiteLight = 'rgba(255,255,255,0.15)'
    //   JSDOM normalizes to 'rgba(255, 255, 255, 0.15)' (spaces inserted)
    expect(bg).toBe('rgba(255, 255, 255, 0.15)');
  });

});
