import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParentView } from './ParentView';

// ============================================================================
// ParentView smoke tests (PV1–PV5)
//
// ParentView is the parent-facing Game Day surface — extracted from App.jsx
// v1.6.9, fully presentational, zero imports. These tests are the regression
// net before Story 81 token/primitive migration touches the file.
//
// Prop contract (per JSDoc header):
//   roster                  Array<{name:string}>
//   battingOrder            string[]                  ordered player names
//   grid                    { playerName: string[] }  position codes per inning
//   selectedParentPlayer    string | null
//   setSelectedParentPlayer (name|null) => void
//   S                       { btn(variant), card }    legacy style helpers
//   C                       { navy, textMuted, ... }  legacy color constants
//   POS_COLORS              { POS_CODE: hex }         position → color map
//
// grid[playerName] is an array of BARE POSITION CODE STRINGS — "P", "SS",
// "Bench", etc. — NOT objects. POS_FULL inside ParentView maps codes to
// display names ("P" → "Pitcher", "SS" → "Shortstop").
// ============================================================================

// Minimal prop fixtures — legacy S/C/POS_COLORS shape, mocked just enough
// to let the component render. These mocks deliberately match the App.jsx
// runtime shape (S.btn is a factory; S.card is an object spread).
var mockS = {
  btn: function () { return {}; },
  card: {},
};
var mockC = {
  navy:      '#0f1f3d',
  textMuted: '#6b7280',
};
var mockPosColors = {
  P:  '#ff0000',
  C:  '#0000ff',
  SS: '#00ff00',
};

function renderParentView(overrides) {
  var props = Object.assign({
    roster:                 [{ name: 'Aiden' }, { name: 'Benji' }],
    battingOrder:           ['Aiden', 'Benji'],
    grid:                   { Aiden: ['P', 'SS'] },
    selectedParentPlayer:   null,
    setSelectedParentPlayer: function () {},
    S:                      mockS,
    C:                      mockC,
    POS_COLORS:             mockPosColors,
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

});
