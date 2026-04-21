/**
 * coachPitching.test.js
 *
 * Unit tests for 8U hybrid coach-pitching logic via processPitch().
 * Uses the real 8U rule profile: atBatModel='hybrid', maxBalls=4,
 * coachPitchesOnBallFour=2, maxStrikes=3.
 */

import { describe, it, expect } from 'vitest';
import { processPitch, getRules, PITCH_TYPE, AT_BAT_RESULT } from '../utils/leagueRules.js';

var rules = getRules('baseball', '8U');

// Helpers
var BALL  = PITCH_TYPE.BALL;
var SC    = PITCH_TYPE.STRIKE_CALLED;
var SS    = PITCH_TYPE.STRIKE_SWINGING;
var FOUL  = PITCH_TYPE.FOUL;
var CONT  = PITCH_TYPE.CONTACT;
var STKO  = AT_BAT_RESULT.STRIKEOUT;
var INPRO = AT_BAT_RESULT.IN_PROGRESS;

function count(overrides) {
  return Object.assign(
    { balls: 0, strikes: 0, attempts: 0, coachPitchesRemaining: 0, isCoachPitching: false },
    overrides
  );
}

describe('8U hybrid coach-pitching via processPitch', function () {

  it('1: kid pitch — ball advances count, stays in kid mode', function () {
    var result = processPitch(rules, count(), BALL);
    expect(result.balls).toBe(1);
    expect(result.isCoachPitching).toBe(false);
    expect(result.isResolved).toBe(false);
  });

  it('2: kid pitch — strike-swinging on 2-strike count → STRIKEOUT', function () {
    var result = processPitch(rules, count({ strikes: 2 }), SS);
    expect(result.isResolved).toBe(true);
    expect(result.atBatResult).toBe(STKO);
  });

  it('3: kid pitch — foul at 2 strikes stays at 2 strikes (at-bat continues, warning issued)', function () {
    var result = processPitch(rules, count({ strikes: 2 }), FOUL);
    expect(result.strikes).toBe(2);
    expect(result.isResolved).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  // BEHAVIORAL GAP: spec says "3 balls + BALL → isCoachPitching=true", but the transition
  // check fires at the TOP of the NEXT processPitch call (after ball 4 is already in count).
  // Ball 4 is recorded here, isCoachPitching remains false; caller must invoke processPitch
  // once more before coach takes over.
  it('4: kid pitch — ball 4 records but isCoachPitching stays false on this call', function () {
    var result = processPitch(rules, count({ balls: 3 }), BALL);
    expect(result.balls).toBe(4);
    expect(result.isCoachPitching).toBe(false);
    // Warning issued as a signal that coach is up next
    expect(result.warnings.some(function(w) { return w.indexOf('coach') !== -1 || w.indexOf('Coach') !== -1; })).toBe(true);
  });

  it('5: coach transition fires at start of pitch AFTER ball 4 is in count', function () {
    // Pass in a count that already has balls=4, isCoachPitching=false
    var result = processPitch(rules, count({ balls: 4 }), SC);
    expect(result.isCoachPitching).toBe(true);
    // 2 allocated then immediately decremented for this pitch
    expect(result.coachPitchesRemaining).toBe(1);
    expect(result.strikes).toBe(1);
  });

  it('6: coach pitch — CONTACT sets needsContactOutcome=true, at-bat in progress', function () {
    var result = processPitch(rules, count({ balls: 4, isCoachPitching: true, coachPitchesRemaining: 2 }), CONT);
    expect(result.atBatResult).toBe(INPRO);
    expect(result.needsContactOutcome).toBe(true);
    expect(result.coachPitchesRemaining).toBe(1);
  });

  it('7: coach pitch — miss on last pitch → STRIKEOUT', function () {
    // Non-contact, non-strike, non-foul on last coach pitch exhausts pitches → out
    var result = processPitch(rules, count({ balls: 4, isCoachPitching: true, coachPitchesRemaining: 1 }), BALL);
    expect(result.isResolved).toBe(true);
    expect(result.atBatResult).toBe(STKO);
  });

  it('8: coach pitch — foul on last pitch extends to 1 more (at-bat continues)', function () {
    var result = processPitch(rules, count({ balls: 4, isCoachPitching: true, coachPitchesRemaining: 1 }), FOUL);
    expect(result.coachPitchesRemaining).toBe(1);
    expect(result.isResolved).toBe(false);
    expect(result.warnings.some(function(w) { return w.indexOf('one more') !== -1; })).toBe(true);
  });

  it('9: coach pitch — called strike brings count to 3 → STRIKEOUT', function () {
    var result = processPitch(rules, count({ balls: 4, isCoachPitching: true, coachPitchesRemaining: 2, strikes: 2 }), SC);
    expect(result.strikes).toBe(3);
    expect(result.isResolved).toBe(true);
    expect(result.atBatResult).toBe(STKO);
  });

});
