import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ============================================================================
// HomeNameNudge golden-path tests (#407, extracted from App.jsx renderHome).
//
// The component imports loadJSON/saveJSON from ../../utils/storage for its
// own dismissal persistence. We mock that module so we can (a) control the
// dismissed-on-load state via loadJSON and (b) spy the saveJSON write on
// dismiss — without touching real localStorage.
//
// The visibility GATE (auth + empty first_name) lives in the parent and
// arrives as the `show` prop; the component only adds the !dismissed check.
// ============================================================================

vi.mock('../../utils/storage', () => ({
  loadJSON: vi.fn(),
  saveJSON: vi.fn(),
}));

import { loadJSON, saveJSON } from '../../utils/storage';
import { HomeNameNudge } from './HomeNameNudge';

var NUDGE_TEXT = /Add your name/i;

function renderNudge(overrides) {
  var props = Object.assign({
    show: true,
    onOpenAccount: vi.fn(),
  }, overrides || {});
  return render(<HomeNameNudge {...props} />);
}

beforeEach(function () {
  vi.clearAllMocks();
  loadJSON.mockReturnValue(false); // default: not previously dismissed
});

describe('HomeNameNudge — golden path', function () {

  test('HN1: show=true and not dismissed → banner renders', function () {
    renderNudge({ show: true });
    expect(screen.getByText(NUDGE_TEXT)).toBeInTheDocument();
  });

  test('HN2: show=false → renders nothing', function () {
    renderNudge({ show: false });
    expect(screen.queryByText(NUDGE_TEXT)).toBeNull();
  });

  test('HN3: show=true but already dismissed in storage → renders nothing', function () {
    loadJSON.mockReturnValue(true); // dismissed-on-load
    renderNudge({ show: true });
    expect(screen.queryByText(NUDGE_TEXT)).toBeNull();
    // Confirms the component read the right key on mount.
    expect(loadJSON).toHaveBeenCalledWith('lg_name_nudge_dismissed', false);
  });

  test('HN4: click Dismiss → banner disappears and saveJSON persists the flag', function () {
    renderNudge({ show: true });
    expect(screen.getByText(NUDGE_TEXT)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Dismiss'));

    expect(saveJSON).toHaveBeenCalledWith('lg_name_nudge_dismissed', true);
    expect(screen.queryByText(NUDGE_TEXT)).toBeNull();
  });

  test('HN5: click banner body → onOpenAccount called once', function () {
    var onOpenAccount = vi.fn();
    renderNudge({ show: true, onOpenAccount: onOpenAccount });

    fireEvent.click(screen.getByText(NUDGE_TEXT));

    expect(onOpenAccount).toHaveBeenCalledTimes(1);
  });

});
