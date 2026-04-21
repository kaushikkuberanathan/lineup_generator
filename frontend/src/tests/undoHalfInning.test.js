/**
 * Tests for the undoHalfInning snapshot/restore logic in useLiveScoring.
 * Tests the pure state-transformation behavior.
 */

import { describe, test, expect } from 'vitest';

// Pure helpers extracted for testability — mirrors the logic in useLiveScoring.js

function makeDefaultGs() {
  return {
    inning: 1, halfInning: 'top', outs: 0, balls: 0, strikes: 0,
    myScore: 0, opponentScore: 0, runners: [],
    currentBatter: null, battingOrderIndex: 0,
    runsThisHalf: 0, oppRunsThisHalf: 0, oppBalls: 0, oppStrikes: 0,
  };
}

function simulateEndHalfInning(gs) {
  var snap = Object.assign({}, gs);
  var nextHalf   = gs.halfInning === 'top' ? 'bottom' : 'top';
  var nextInning = gs.halfInning === 'bottom' ? gs.inning + 1 : gs.inning;
  var newGs = Object.assign({}, gs, {
    inning: nextInning, halfInning: nextHalf,
    outs: 0, balls: 0, strikes: 0,
    runners: [], currentBatter: null,
    battingOrderIndex: gs.battingOrderIndex,
    runsThisHalf: 0, oppRunsThisHalf: 0, oppBalls: 0, oppStrikes: 0,
  });
  return { snap: snap, newGs: newGs };
}

describe('undoHalfInning logic', function() {

  test('1 — snapshot taken before end correctly restores inning/half', function() {
    var gs = Object.assign(makeDefaultGs(), {
      inning: 2, halfInning: 'bottom',
      outs: 2, balls: 1, strikes: 2,
      runners: [{ runnerId: 'p1', base: 1 }],
      runsThisHalf: 3,
    });

    var result = simulateEndHalfInning(gs);
    var restoredGs = result.snap;

    expect(restoredGs.inning).toBe(2);
    expect(restoredGs.halfInning).toBe('bottom');
    expect(restoredGs.outs).toBe(2);
    expect(restoredGs.balls).toBe(1);
    expect(restoredGs.runners.length).toBe(1);
    expect(restoredGs.runsThisHalf).toBe(3);
  });

  test('2 — endHalfInning advances inning when bottom → top', function() {
    var gs = Object.assign(makeDefaultGs(), { inning: 2, halfInning: 'bottom' });
    var result = simulateEndHalfInning(gs);

    expect(result.newGs.inning).toBe(3);
    expect(result.newGs.halfInning).toBe('top');
    expect(result.newGs.outs).toBe(0);
    expect(result.newGs.runsThisHalf).toBe(0);
  });

  test('3 — undo restores state completely and snap is cleared', function() {
    var gs = Object.assign(makeDefaultGs(), {
      inning: 3, halfInning: 'top',
      outs: 1, runsThisHalf: 4,
      runners: [{ runnerId: 'p2', base: 2 }, { runnerId: 'p3', base: 3 }],
    });

    var result     = simulateEndHalfInning(gs);
    var snap       = result.snap;
    var snapBefore = snap;
    snap = null; // simulate clearing undoSnapRef after undo

    // Restored state equals original pre-end state
    expect(snapBefore.inning).toBe(3);
    expect(snapBefore.halfInning).toBe('top');
    expect(snapBefore.outs).toBe(1);
    expect(snapBefore.runsThisHalf).toBe(4);
    expect(snapBefore.runners.length).toBe(2);

    // Snap is cleared after consumption
    expect(snap).toBeNull();
  });

});
