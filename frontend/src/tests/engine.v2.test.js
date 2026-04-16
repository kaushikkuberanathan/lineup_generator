/**
 * engine.v2.test.js — Regression test suite for the V2 lineup engine.
 *
 * Engine under test: frontend/src/utils/lineupEngineV2.js
 * Signature: generateLineupV2(roster: Player[], innings: number) → LineupResult
 *
 * Output shape:
 *   {
 *     grid:         { [playerName: string]: (string | null)[] }  // index = inning
 *     battingOrder: string[]
 *     attempts:     number
 *     warnings:     string[]
 *     isValid:      boolean
 *     usedFallback: boolean
 *     explain:      string
 *   }
 *
 * Bench positions are stored as the string "BENCH" (not null).
 * Field positions use: P, C, 1B, 2B, 3B, SS, LF, LC, RC, RF  (no CF)
 */

import { generateLineupV2 } from '../utils/lineupEngineV2.js';
import { mockRoster, mockRoster7, mockRoster12 } from './fixtures/mockRoster.js';
import { mockConfig, mockConfig12 } from './fixtures/mockConfig.js';

const FIELD_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'LC', 'RC', 'RF'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** All position values for a given inning index across the full grid. */
function positionsForInning(grid, inning) {
  return Object.values(grid).map(pos => pos[inning]);
}

/** All non-null, non-BENCH position values across all innings. */
function allFieldPositions(grid) {
  return Object.values(grid).flat().filter(p => p && p !== 'BENCH');
}

// ---------------------------------------------------------------------------
// GROUP 1 — Position assignment correctness
// ---------------------------------------------------------------------------

describe('Group 1 — Position assignment correctness', () => {
  let result;

  beforeAll(() => {
    result = generateLineupV2(mockRoster, mockConfig.innings);
  });

  test('1.1: 10-player roster — every inning has exactly 10 field position assignments', () => {
    for (let inning = 0; inning < mockConfig.innings; inning++) {
      const fieldedThisInning = positionsForInning(result.grid, inning)
        .filter(p => p && p !== 'BENCH');
      expect(fieldedThisInning.length).toBe(10);
    }
  });

  test('1.2: Output uses LC and RC — CF must not appear in any inning', () => {
    const all = allFieldPositions(result.grid);
    expect(all).toContain('LC');
    expect(all).toContain('RC');
    expect(all).not.toContain('CF');
  });

  test('1.3: No position is assigned to two different players in the same inning', () => {
    for (let inning = 0; inning < mockConfig.innings; inning++) {
      const seen = new Set();
      for (const positions of Object.values(result.grid)) {
        const pos = positions[inning];
        if (!pos || pos === 'BENCH') continue;
        expect(
          seen.has(pos),
          `Position "${pos}" assigned to two players in inning ${inning + 1}`
        ).toBe(false);
        seen.add(pos);
      }
    }
  });

  test('1.4: Every player receives at least one field position across all innings', () => {
    for (const [playerName, positions] of Object.entries(result.grid)) {
      const hasField = positions.some(p => p && p !== 'BENCH');
      expect(hasField, `Player "${playerName}" never assigned a field position`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// GROUP 2 — Bench slot correctness
// ---------------------------------------------------------------------------
// Note: the following bench assertions assume full attendance (no absent tags).
// Absent-player bench math is covered in lineupEngineV2-unit.test.js Group X.

describe('Group 2 — Bench slot correctness', () => {
  test('2.1: 10-player roster — total BENCH entries = innings × computed bench count (0)', () => {
    const result = generateLineupV2(mockRoster, mockConfig.innings);
    const expectedBenchPerInning = Math.max(mockRoster.length - FIELD_POSITIONS.length, 0); // 0
    let totalBench = 0;
    for (const positions of Object.values(result.grid)) {
      totalBench += positions.filter(p => p === 'BENCH').length;
    }
    expect(totalBench).toBe(mockConfig.innings * expectedBenchPerInning);
  });

  test('2.2: 12-player roster — no player is both benched AND fielded in the same inning', () => {
    const result = generateLineupV2(mockRoster12, mockConfig12.innings);
    for (let inning = 0; inning < mockConfig12.innings; inning++) {
      const benched = new Set();
      const fielded = new Set();
      for (const [name, positions] of Object.entries(result.grid)) {
        const pos = positions[inning];
        if (pos === 'BENCH') benched.add(name);
        else if (pos) fielded.add(name);
      }
      for (const name of benched) {
        expect(
          fielded.has(name),
          `Player "${name}" is both benched and fielded in inning ${inning + 1}`
        ).toBe(false);
      }
    }
  });

  test('2.3: 7-player roster — engine warns or throws; must not silently leave positions unfilled', () => {
    // With 7 players and 10 field positions, 3 positions will be left unassigned.
    // The engine SHOULD warn or throw. Current behavior: silently returns with no warnings
    // because the guard condition is `activePlayers.length < Math.min(players.length, 10)`
    // (7 < 7 = false), instead of `activePlayers.length < FIELD_POSITIONS.length` (7 < 10).
    let result;
    let threw = false;
    try {
      result = generateLineupV2(mockRoster7, mockConfig.innings);
    } catch {
      threw = true;
    }

    if (!threw) {
      // BUG CONFIRMED: engine does not issue a warning when roster is smaller than
      // FIELD_POSITIONS.length (10). Three positions are silently left unassigned each inning.
      // Root cause: warning condition in lineupEngineV2.js checks against
      //   Math.min(players.length, FIELD_POSITIONS.length)  ← should be FIELD_POSITIONS.length only
      // Fix in separate session.
      expect(
        result.warnings.length,
        'BUG CONFIRMED: 7-player roster — engine produced no warning; 3 positions silently unassigned each inning'
      ).toBeGreaterThan(0);
    }

    // If threw, behavior is acceptable — test passes.
  });
});

// ---------------------------------------------------------------------------
// GROUP 3 — battingPerf key format
// ---------------------------------------------------------------------------

describe('Group 3 — battingPerf key format', () => {
  test('3.1: battingOrder entries use full player.name strings (not IDs or initials)', () => {
    // The V2 engine does not read/write battingPerf directly — it returns battingOrder as
    // an array of full player name strings. App.jsx uses these names as battingPerf keys.
    // This test is the regression guard for the silent batting stat wipe bug where a key
    // format mismatch (e.g., initials vs full name) caused per-player stats to silently reset.
    const result = generateLineupV2(mockRoster, mockConfig.innings);

    expect(Array.isArray(result.battingOrder)).toBe(true);
    expect(result.battingOrder.length).toBe(mockRoster.length);

    for (const name of result.battingOrder) {
      // Must be a non-empty string
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);

      // Must contain a space (firstName lastName format), ruling out ID or initials
      expect(name, `battingOrder entry "${name}" looks like an ID or initials — expected full name`).toContain(' ');

      // Must match an actual roster player by exact name
      expect(
        mockRoster.some(p => p.name === name),
        `battingOrder entry "${name}" does not match any roster player name`
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// GROUP 4 — V2 fallback guard
// ---------------------------------------------------------------------------

describe('Group 4 — V2 fallback guard', () => {
  test('4.1: Engine always reports usedFallback = false — no silent V1 fallback inside engine', () => {
    // KNOWN RISK: no fallback guard exists inside the engine itself.
    // The V1/V2 switch lives in App.jsx via FEATURE_FLAGS.USE_NEW_LINEUP_ENGINE.
    // If that flag is toggled false, the app silently runs V1 with no log or warning surfaced
    // to the user.
    // See tech debt item 1: add an explicit runtime assertion or visible warning when
    // the engine detects it may be operating in a degraded / V1 mode.
    const result = generateLineupV2(mockRoster, mockConfig.innings);
    expect(result.usedFallback).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GROUP 5 — Output shape stability
// ---------------------------------------------------------------------------

describe('Group 5 — Output shape stability', () => {
  test('5.1: Output always contains grid (object), battingOrder (array), warnings (array)', () => {
    const result = generateLineupV2(mockRoster, mockConfig.innings);

    // Required top-level keys
    expect(result).toHaveProperty('grid');
    expect(result).toHaveProperty('battingOrder');
    expect(result).toHaveProperty('warnings');

    // Types
    expect(typeof result.grid).toBe('object');
    expect(result.grid).not.toBeNull();
    expect(Array.isArray(result.battingOrder)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);

    // grid has one entry per player
    expect(Object.keys(result.grid).length).toBe(mockRoster.length);

    // each player's positions array has length === innings
    for (const positions of Object.values(result.grid)) {
      expect(Array.isArray(positions)).toBe(true);
      expect(positions.length).toBe(mockConfig.innings);
    }
  });

  test('5.2: Engine is deterministic — two runs with same input produce identical output', () => {
    // V2 uses a greedy scoring algorithm with no random shuffling (unlike V1 which retries
    // with shuffled rosters). Two calls with identical input must produce identical grids
    // and batting orders.
    const result1 = generateLineupV2(mockRoster, mockConfig.innings);
    const result2 = generateLineupV2(mockRoster, mockConfig.innings);

    expect(result1.grid).toEqual(result2.grid);
    expect(result1.battingOrder).toEqual(result2.battingOrder);
    expect(result1.warnings).toEqual(result2.warnings);
  });
});

// ---------------------------------------------------------------------------
// GROUP 6 — Absent player bench exclusion
// ---------------------------------------------------------------------------

describe('Group 6 — Absent player bench exclusion', () => {
  it('absent-tagged player does not consume a bench slot in the engine', () => {
    // Note: autoAssignWithRetryFallback (the V1 engine) lives inside App.jsx and
    // is not exported as a module — it cannot be imported in tests. This test
    // exercises the same absent-tag behavior through generateLineupV2, which
    // applies the same tags: ['absent'] → outThisGame filtering via playerMapper.
    //
    // 12 players total, 1 absent → 11 active → bench = max(11-10, 0) = 1 per inning
    // If bench were calculated from total: max(12-10, 0) = 2 — that would be wrong.
    // outThisGame: undefined lets playerMapper.js:52 fall through to tags.includes('absent').
    // The mockRoster12 fixture sets outThisGame: false explicitly, so we clear it here.
    const absentName = mockRoster12[0].name;
    const rosterWithAbsent = [
      { ...mockRoster12[0], outThisGame: undefined, tags: ['absent'] },
      ...mockRoster12.slice(1),
    ];
    const result = generateLineupV2(rosterWithAbsent, mockConfig12.innings);

    // Absent player has no grid entry — effectively "Out" every inning
    expect(result.grid[absentName]).toBeUndefined();

    // Bench = 1 per inning (active 11 - 10 field positions), not 2 (total 12 - 10)
    for (let inning = 0; inning < mockConfig12.innings; inning++) {
      const benchCount = Object.values(result.grid)
        .filter(positions => positions[inning] === 'BENCH').length;
      expect(benchCount).toBe(1);
    }
  });
});
