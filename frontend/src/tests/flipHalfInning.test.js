/**
 * flipHalfInning.test.js
 *
 * Second-pass coverage follow-up (session 2026-08-23): flipHalfInning is a
 * pure function exported from useLiveScoring.js and called from 5 internal
 * sites (3-outs transitions, manual end-half, undo) but had no direct unit
 * test — only indirectly exercised through the hook-level test files.
 */

import { describe, it, expect } from 'vitest';
import { flipHalfInning } from '../hooks/useLiveScoring.js';

function baseGs(overrides) {
  return Object.assign({
    inning: 3,
    halfInning: 'top',
    outs: 3,
    balls: 2,
    strikes: 1,
    myScore: 4,
    opponentScore: 2,
    runners: [{ runnerId: 'p1', base: 2 }],
    currentBatter: { id: 'p2', name: 'Jordan' },
    battingOrderIndex: 5,
    runsThisHalf: 2,
    oppRunsThisHalf: 0,
    oppBalls: 3,
    oppStrikes: 2,
    oppCurrentBatterNumber: 4,
    oppCurrentBatterPitches: 5,
    oppInningPitches: 12,
    oppGamePitches: 40,
    myTeamHalf: 'top',
  }, overrides);
}

describe('flipHalfInning', function () {

  it('top -> bottom keeps the same inning number', function () {
    var gs = baseGs({ halfInning: 'top', inning: 3 });
    var next = flipHalfInning(gs);
    expect(next.halfInning).toBe('bottom');
    expect(next.inning).toBe(3);
  });

  it('bottom -> top advances to the next inning', function () {
    var gs = baseGs({ halfInning: 'bottom', inning: 3 });
    var next = flipHalfInning(gs);
    expect(next.halfInning).toBe('top');
    expect(next.inning).toBe(4);
  });

  it('resets all per-half-inning counters to zero/empty', function () {
    var next = flipHalfInning(baseGs());
    expect(next.outs).toBe(0);
    expect(next.balls).toBe(0);
    expect(next.strikes).toBe(0);
    expect(next.oppBalls).toBe(0);
    expect(next.oppStrikes).toBe(0);
    expect(next.oppCurrentBatterPitches).toBe(0);
    expect(next.oppInningPitches).toBe(0);
    expect(next.runners).toEqual([]);
    expect(next.currentBatter).toBeNull();
    expect(next.runsThisHalf).toBe(0);
    expect(next.oppRunsThisHalf).toBe(0);
  });

  it('preserves fields that are not per-half-inning state', function () {
    var gs = baseGs();
    var next = flipHalfInning(gs);
    expect(next.myScore).toBe(gs.myScore);
    expect(next.opponentScore).toBe(gs.opponentScore);
    expect(next.battingOrderIndex).toBe(gs.battingOrderIndex);
    expect(next.oppCurrentBatterNumber).toBe(gs.oppCurrentBatterNumber);
    expect(next.oppGamePitches).toBe(gs.oppGamePitches);
    expect(next.myTeamHalf).toBe(gs.myTeamHalf);
  });

  it('does not mutate the input gameState object', function () {
    var gs = baseGs();
    var snapshot = JSON.parse(JSON.stringify(gs));
    flipHalfInning(gs);
    expect(gs).toEqual(snapshot);
  });

  it('returns a new object rather than the same reference', function () {
    var gs = baseGs();
    var next = flipHalfInning(gs);
    expect(next).not.toBe(gs);
  });
});
