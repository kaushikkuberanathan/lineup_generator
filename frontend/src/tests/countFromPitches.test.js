/**
 * countFromPitches.test.js
 *
 * Unit tests for countFromPitches — the pure helper that re-derives
 * balls/strikes from a pitch array (used by undoLastPitch).
 */

import { describe, it, expect } from 'vitest';
import { countFromPitches } from '../hooks/useLiveScoring.js';

// Mirror the PITCH constants rather than importing internals
var BALL            = 'ball';
var STRIKE_CALLED   = 'strike_called';
var STRIKE_SWINGING = 'strike_swinging';
var FOUL            = 'foul';
var CONTACT         = 'contact';

function p(type) { return { type: type }; }

describe('countFromPitches', function () {

  it('1: empty array → { balls:0, strikes:0 }', function () {
    expect(countFromPitches([])).toEqual({ balls: 0, strikes: 0 });
  });

  it('2: 3 balls + 1 called strike → { balls:3, strikes:1 }', function () {
    var pitches = [p(BALL), p(BALL), p(BALL), p(STRIKE_CALLED)];
    expect(countFromPitches(pitches)).toEqual({ balls: 3, strikes: 1 });
  });

  it('3a: STRIKE_CALLED counts as strike', function () {
    expect(countFromPitches([p(STRIKE_CALLED)])).toEqual({ balls: 0, strikes: 1 });
  });

  it('3b: STRIKE_SWINGING counts as strike', function () {
    expect(countFromPitches([p(STRIKE_SWINGING)])).toEqual({ balls: 0, strikes: 1 });
  });

  it('4: foul at 0 strikes → 1 strike', function () {
    expect(countFromPitches([p(FOUL)])).toEqual({ balls: 0, strikes: 1 });
  });

  it('5: foul at 1 strike → 2 strikes', function () {
    var pitches = [p(STRIKE_CALLED), p(FOUL)];
    expect(countFromPitches(pitches)).toEqual({ balls: 0, strikes: 2 });
  });

  it('6: foul at 2 strikes → still 2 strikes (no increment)', function () {
    var pitches = [p(STRIKE_CALLED), p(STRIKE_SWINGING), p(FOUL)];
    expect(countFromPitches(pitches)).toEqual({ balls: 0, strikes: 2 });
  });

  it('7: ball at 3 balls → 4 balls (no cap — undo path)', function () {
    var pitches = [p(BALL), p(BALL), p(BALL), p(BALL)];
    expect(countFromPitches(pitches)).toEqual({ balls: 4, strikes: 0 });
  });

  it('8: strike at 2 strikes → 3 strikes (no cap — undo path)', function () {
    var pitches = [p(STRIKE_CALLED), p(STRIKE_SWINGING), p(STRIKE_CALLED)];
    expect(countFromPitches(pitches)).toEqual({ balls: 0, strikes: 3 });
  });

  it('9: mixed [BALL, FOUL, STRIKE_CALLED, STRIKE_SWINGING] → { balls:1, strikes:3 }', function () {
    var pitches = [p(BALL), p(FOUL), p(STRIKE_CALLED), p(STRIKE_SWINGING)];
    expect(countFromPitches(pitches)).toEqual({ balls: 1, strikes: 3 });
  });

  it('10: multiple fouls at 2 strikes → still 2 strikes', function () {
    var pitches = [p(STRIKE_CALLED), p(STRIKE_SWINGING), p(FOUL), p(FOUL), p(FOUL)];
    expect(countFromPitches(pitches)).toEqual({ balls: 0, strikes: 2 });
  });

  it('11: unknown pitch type → does not increment, does not throw', function () {
    var pitches = [p('unknown_type'), p(BALL)];
    expect(countFromPitches(pitches)).toEqual({ balls: 1, strikes: 0 });
  });

});
