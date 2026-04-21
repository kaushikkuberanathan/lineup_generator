import { describe, it, expect, vi } from 'vitest';
import { advanceRunners, detectRunnerConflict, applyConflictResolution } from '../hooks/useLiveScoring.js';

vi.mock('../utils/analytics', function() {
  return { track: vi.fn() };
});

function r(runnerId, base) { return { runnerId: runnerId, base: base }; }

describe('advanceRunners', function() {

  it('1: single with no runners — batter placed at 1B, no runs scored', function() {
    var res = advanceRunners([], 1, 'batter');
    expect(res.runners).toEqual([r('batter', 1)]);
    expect(res.runsScored).toBe(0);
    expect(res.pendingRunners).toEqual([]);
  });

  it('2: runner on 1B, single — runner advances to 2B and 1B clears', function() {
    var res = advanceRunners([r('A', 1)], 1, 'batter');
    var ids = res.runners.map(function(x) { return x.runnerId; });
    expect(ids).toContain('batter');
    expect(ids).toContain('A');
    var aEntry = res.runners.find(function(x) { return x.runnerId === 'A'; });
    expect(aEntry.base).toBe(2);
    var batterEntry = res.runners.find(function(x) { return x.runnerId === 'batter'; });
    expect(batterEntry.base).toBe(1);
    expect(res.runsScored).toBe(0);
    expect(res.pendingRunners).toEqual([]);
  });

  it('3: runners on 1B and 2B, single — both advance, batter to 1B, no duplicates', function() {
    var res = advanceRunners([r('A', 1), r('B', 2)], 1, 'batter');
    expect(res.runners).toHaveLength(3);
    var byBase = {};
    res.runners.forEach(function(x) { byBase[x.base] = x.runnerId; });
    expect(byBase[1]).toBe('batter');
    expect(byBase[2]).toBe('A');
    expect(byBase[3]).toBe('B');
    expect(res.runsScored).toBe(0);
    expect(res.pendingRunners).toEqual([]);
    // No duplicate bases
    var bases = res.runners.map(function(x) { return x.base; });
    expect(new Set(bases).size).toBe(bases.length);
  });

  it('4: bases loaded + single — all three non-3B runners advance, 3B runner is pending', function() {
    var res = advanceRunners([r('A', 1), r('B', 2), r('C', 3)], 1, 'batter');
    // Auto-advanced runners: batter→1B, A→2B, B→3B
    expect(res.runners).toHaveLength(3);
    var byBase = {};
    res.runners.forEach(function(x) { byBase[x.base] = x.runnerId; });
    expect(byBase[1]).toBe('batter');
    expect(byBase[2]).toBe('A');
    expect(byBase[3]).toBe('B');
    // C (was 3B) is pending, no runs scored yet
    expect(res.runsScored).toBe(0);
    expect(res.pendingRunners).toHaveLength(1);
    expect(res.pendingRunners[0].runnerId).toBe('C');
  });

  it('5: CONTRACT — no player ID appears on two bases after any play', function() {
    var plays = [
      { runners: [r('A',1)],                                 hitBases: 1, batterId: 'X' },
      { runners: [r('A',1), r('B',2)],                       hitBases: 1, batterId: 'X' },
      { runners: [r('A',1), r('B',2), r('C',3)],             hitBases: 1, batterId: 'X' },
      { runners: [r('A',2)],                                 hitBases: 2, batterId: 'X' },
      { runners: [r('A',1), r('B',2)],                       hitBases: 3, batterId: 'X' },
      { runners: [r('A',1), r('B',2), r('C',3)],             hitBases: 2, batterId: 'X' },
      { runners: [r('A',1), r('B',2), r('C',3)],             hitBases: 4, batterId: 'X' },
      { runners: [r('A',3)],                                 hitBases: 1, batterId: 'X' },
      // Edge: duplicate bases in input — helper must deduplicate
      { runners: [r('A',2), r('A',2)],                       hitBases: 1, batterId: 'X' },
    ];
    plays.forEach(function(play, i) {
      var res  = advanceRunners(play.runners, play.hitBases, play.batterId);
      var all  = res.runners.concat(res.pendingRunners);
      var ids  = all.map(function(x) { return x.runnerId; });
      expect(new Set(ids).size).toBe(ids.length,
        'play ' + i + ': player appeared on two bases simultaneously');
    });
  });

});

// ── Runner conflict detection & resolution ────────────────────────────────────

describe('Runner conflict detection and resolution', function() {

  it('6: CONFLICT detected — 3B runner held when 3B already occupied after single', function() {
    // After resolveAtBat(single) with runners on 2B+3B:
    //   active runners: [batter@1, B@3]  (B advanced from 2B)
    //   pending:        [C@3]            (C was on 3B — stayed)
    var activeRunners = [r('batter', 1), r('B', 3)];
    var conflict = detectRunnerConflict(activeRunners, 'C', 3, 3, 1);
    expect(conflict).not.toBeNull();
    expect(conflict.incomingRunnerId).toBe('C');
    expect(conflict.incomingFromBase).toBe(3);
    expect(conflict.targetBase).toBe(3);
    expect(conflict.blockingRunnerId).toBe('B');
    expect(conflict.blockingFromBase).toBe(2);
  });

  it('7: CONFLICT SCORE_BLOCKING — blocking runner scores, incoming takes the base', function() {
    var gs = {
      runners: [r('batter', 1), r('B', 3)],
      myScore: 0,
      runsThisHalf: 0,
    };
    var conflict = {
      incomingRunnerId: 'C', incomingFromBase: 3,
      targetBase: 3, blockingRunnerId: 'B', blockingFromBase: 2,
    };
    var result = applyConflictResolution(gs, conflict, 'SCORE_BLOCKING', null, null);
    expect(result.myScore).toBe(1);
    expect(result.runsThisHalf).toBe(1);
    var byBase = {};
    result.runners.forEach(function(rx) { byBase[rx.base] = rx.runnerId; });
    expect(byBase[1]).toBe('batter');
    expect(byBase[3]).toBe('C');
    expect(result.runners.find(function(rx) { return rx.runnerId === 'B'; })).toBeUndefined();
  });

  it('8: CONFLICT HOLD_INCOMING — 2B runner reverts to 2B, 3B runner stays at 3B, no run scored', function() {
    var gs = {
      runners: [r('batter', 1), r('B', 3)],
      myScore: 0,
      runsThisHalf: 0,
    };
    var conflict = {
      incomingRunnerId: 'C', incomingFromBase: 3,
      targetBase: 3, blockingRunnerId: 'B', blockingFromBase: 2,
    };
    var result = applyConflictResolution(gs, conflict, 'HOLD_INCOMING', null, null);
    expect(result.myScore).toBe(0);
    var byBase = {};
    result.runners.forEach(function(rx) { byBase[rx.base] = rx.runnerId; });
    expect(byBase[1]).toBe('batter');
    expect(byBase[2]).toBe('B');
    expect(byBase[3]).toBe('C');
    // No duplicate player IDs
    var ids = result.runners.map(function(rx) { return rx.runnerId; });
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('9: CONFLICT CANCEL_PLAY — full state restored to pre-resolveAtBat snapshot', function() {
    var gs = {
      runners: [r('batter', 1), r('B', 3)],
      myScore: 0, outs: 1, runsThisHalf: 0,
    };
    var snapshot = {
      runners: [r('B', 2), r('C', 3)],
      myScore: 0, outs: 1, runsThisHalf: 0,
    };
    var conflict = {
      incomingRunnerId: 'C', incomingFromBase: 3,
      targetBase: 3, blockingRunnerId: 'B', blockingFromBase: 2,
    };
    var result = applyConflictResolution(gs, conflict, 'CANCEL_PLAY', snapshot, null);
    expect(result.runners).toEqual(snapshot.runners);
    expect(result.outs).toBe(snapshot.outs);
  });

  it('10: ANALYTICS — scoring_runner_conflict_prompted fires once with correct decision', function() {
    var trackFn = vi.fn();
    var gs = {
      runners: [r('batter', 1), r('B', 3)],
      myScore: 0, runsThisHalf: 0,
    };
    var conflict = {
      incomingRunnerId: 'C', incomingFromBase: 3,
      targetBase: 3, blockingRunnerId: 'B', blockingFromBase: 2,
    };
    applyConflictResolution(gs, conflict, 'SCORE_BLOCKING', null, trackFn);
    expect(trackFn).toHaveBeenCalledOnce();
    expect(trackFn).toHaveBeenCalledWith('scoring_runner_conflict_prompted', {
      targetBase:      3,
      incomingFromBase: 3,
      decision:        'SCORE_BLOCKING',
    });
  });

});
