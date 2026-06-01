import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParentView } from './ParentView';

// ============================================================================
// ParentView smoke tests (PV1–PV5)
//
// ParentView is the parent-facing Game Day surface — extracted from App.jsx
// v1.6.9, fully presentational. Imports design tokens + Button/Card primitives.
// Story 82 migrated the legacy S/C style props to tokens; these tests are the
// regression net around that migration.
//
// Prop contract (per JSDoc header):
//   roster                  Array<{name:string}>
//   battingOrder            string[]                  ordered player names
//   grid                    { playerName: string[] }  position codes per inning
//   selectedParentPlayer    string | null
//   setSelectedParentPlayer (name|null) => void
//
// grid[playerName] is an array of BARE POSITION CODE STRINGS — "P", "SS",
// "Bench", etc. — NOT objects. POS_FULL inside ParentView maps codes to
// display names ("P" → "Pitcher", "SS" → "Shortstop").
// ============================================================================

// Minimal prop fixture. Story 82 removed the legacy S/C/POS_COLORS props —
// ParentView is now fully token-driven, so the fixture supplies only the
// real prop contract.
function renderParentView(overrides) {
  var props = Object.assign({
    roster:                 [{ name: 'Aiden' }, { name: 'Benji' }],
    battingOrder:           ['Aiden', 'Benji'],
    grid:                   { Aiden: ['P', 'SS'] },
    selectedParentPlayer:   null,
    setSelectedParentPlayer: function () {},
  }, overrides || {});
  return render(<ParentView {...props} />);
}

describe('ParentView — smoke', function () {

  test('PV1: renders without errors when no player is selected', function () {
    // Bare render — no selection, default fixture. If the component throws
    // on null selectedParentPlayer, this fails at render time.
    var result = renderParentView({ selectedParentPlayer: null });
    expect(result.container.firstChild).toBeTruthy();
  });

  test('PV2: shows "Select a player" prompt when no player is selected', function () {
    renderParentView({ selectedParentPlayer: null });
    // Exact copy from ParentView.jsx line 85.
    expect(
      screen.getByText(/Select a player above to view their game day info/i)
    ).toBeTruthy();
  });

  test('PV3: renders all roster player names in the picker', function () {
    renderParentView({
      roster: [{ name: 'Aiden' }, { name: 'Benji' }],
    });
    // firstName() strips space-separated surnames; single names pass through.
    expect(screen.getByText('Aiden')).toBeTruthy();
    expect(screen.getByText('Benji')).toBeTruthy();
  });

  test('PV4: clicking a player name calls setSelectedParentPlayer with that name', function () {
    var spy = vi.fn();
    renderParentView({
      selectedParentPlayer:    null,
      setSelectedParentPlayer: spy,
    });
    fireEvent.click(screen.getByText('Aiden'));
    expect(spy).toHaveBeenCalledWith('Aiden');
  });

  test('PV5: renders inning assignments when a player is selected', function () {
    renderParentView({
      selectedParentPlayer: 'Aiden',
      grid:                 { Aiden: ['P', 'SS'] },
    });
    // POS_FULL inside ParentView maps codes to display names.
    expect(screen.getByText('Pitcher')).toBeTruthy();
    expect(screen.getByText('Shortstop')).toBeTruthy();
    // Per-inning labels — "Inn 1", "Inn 2" rendered at line 72.
    expect(screen.getByText(/Inn 1/i)).toBeTruthy();
    expect(screen.getByText(/Inn 2/i)).toBeTruthy();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PV6–PV7 (Story 82) — S/C prop migration contract.
  // ParentView must render fully token-driven, with NO S/C props supplied.
  // RED until ParentView.jsx drops S.btn/S.card/C.* in favour of tokens.
  // ──────────────────────────────────────────────────────────────────────────

  test('PV6: renders picker + empty state with no S/C props (token-driven)', function () {
    // Deliberately NO S, C, POS_COLORS — exercises the picker (S.btn) and
    // empty-state (C.textMuted) paths without the legacy style props.
    var props = {
      roster:                  [{ name: 'Aiden' }, { name: 'Benji' }],
      battingOrder:            ['Aiden', 'Benji'],
      grid:                    {},
      selectedParentPlayer:    null,
      setSelectedParentPlayer: function () {},
    };
    render(<ParentView {...props} />);
    expect(screen.getByText('Aiden')).toBeTruthy();
    expect(screen.getByText(/Select a player above to view their game day info/i)).toBeTruthy();
  });

  test('PV7: renders selected player card + Bench row with no S/C props', function () {
    // Selected-player branch exercises S.card spread + C.navy and the bench
    // wash. Must render token-driven with S/C absent.
    var props = {
      roster:                  [{ name: 'Aiden' }],
      battingOrder:            ['Aiden'],
      grid:                    { Aiden: ['P', 'Bench'] },
      selectedParentPlayer:    'Aiden',
      setSelectedParentPlayer: function () {},
    };
    render(<ParentView {...props} />);
    expect(screen.getByText('Pitcher')).toBeTruthy();
    expect(screen.getByText('Bench')).toBeTruthy();  // POS_FULL['Bench'] === 'Bench'
  });

});
