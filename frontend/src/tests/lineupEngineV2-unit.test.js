/**
 * lineupEngineV2-unit.test.js — unit tests for generateLineupV2.
 *
 * Covers:
 *   Group A — Output shape: required keys, grid structure, battingOrder length
 *   Group B — Field assignment: positions covered, no duplicates per inning, BENCH handling
 *   Group C — Bench logic: skipBench respected, correct bench count per inning
 *   Group D — Batting order: uniqueness, strong > weak, active-only names
 *   Group E — Edge cases and warnings: under-strength roster, empty roster, innings variants
 *
 * Run: npm test  (from frontend/)
 */

import { generateLineupV2 } from '../utils/lineupEngineV2.js';
import { mockRoster, mockRoster7, mockRoster12 } from './fixtures/mockRoster.js';

const FIELD_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'LC', 'RC', 'RF'];

// ============================================================================
// Group A — Output shape
// ============================================================================

describe('Group A — Output shape', function () {

  test('A.1: result has all required keys', function () {
    const result = generateLineupV2(mockRoster, 4);
    ['grid', 'battingOrder', 'attempts', 'warnings', 'isValid', 'usedFallback', 'explain']
      .forEach(key => expect(result).toHaveProperty(key));
  });

  test('A.2: grid has exactly one key per active player', function () {
    const result = generateLineupV2(mockRoster, 4);
    expect(Object.keys(result.grid)).toHaveLength(mockRoster.length);
  });

  test('A.3: each player grid entry is an array of length equal to innings', function () {
    const result = generateLineupV2(mockRoster, 4);
    Object.values(result.grid).forEach(innings => {
      expect(Array.isArray(innings)).toBe(true);
      expect(innings).toHaveLength(4);
    });
  });

  test('A.4: battingOrder is an array', function () {
    const result = generateLineupV2(mockRoster, 4);
    expect(Array.isArray(result.battingOrder)).toBe(true);
  });

  test('A.5: usedFallback is always false', function () {
    expect(generateLineupV2(mockRoster,   4).usedFallback).toBe(false);
    expect(generateLineupV2(mockRoster7,  4).usedFallback).toBe(false);
    expect(generateLineupV2(mockRoster12, 4).usedFallback).toBe(false);
  });

  test('A.6: explain is a non-empty string', function () {
    const result = generateLineupV2(mockRoster, 4);
    expect(typeof result.explain).toBe('string');
    expect(result.explain.length).toBeGreaterThan(0);
  });

});

// ============================================================================
// Group B — Field assignment correctness
// ============================================================================

describe('Group B — Field assignment correctness', function () {

  test('B.1: 10-player roster, 4 innings — isValid=true, no warnings', function () {
    const result = generateLineupV2(mockRoster, 4);
    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  test('B.2: no duplicate positions assigned in the same inning', function () {
    const result = generateLineupV2(mockRoster, 4);
    for (let i = 0; i < 4; i++) {
      const assignments = Object.values(result.grid)
        .map(innings => innings[i])
        .filter(pos => pos !== 'BENCH');
      const unique = new Set(assignments);
      expect(unique.size).toBe(assignments.length);
    }
  });

  test('B.3: all 10 field positions are covered every inning for a 10-player roster', function () {
    const result = generateLineupV2(mockRoster, 4);
    for (let i = 0; i < 4; i++) {
      const assignments = Object.values(result.grid).map(innings => innings[i]);
      FIELD_POSITIONS.forEach(pos => {
        expect(assignments).toContain(pos);
      });
    }
  });

  test('B.4: every grid entry is a valid field position or "BENCH"', function () {
    const valid = new Set([...FIELD_POSITIONS, 'BENCH']);
    const result = generateLineupV2(mockRoster12, 4);
    Object.values(result.grid).forEach(innings => {
      innings.forEach(entry => {
        expect(valid.has(entry)).toBe(true);
      });
    });
  });

  test('B.5: outThisGame player is excluded from grid entirely', function () {
    const rosterWithAbsent = [
      { ...mockRoster[0], outThisGame: true },
      ...mockRoster.slice(1),
    ];
    const result = generateLineupV2(rosterWithAbsent, 4);
    // Absent player's name should not appear in grid at all
    expect(result.grid[mockRoster[0].name]).toBeUndefined();
  });

  test('B.6: outThisGame player does not appear in battingOrder', function () {
    const rosterWithAbsent = [
      { ...mockRoster[0], outThisGame: true },
      ...mockRoster.slice(1),
    ];
    const result = generateLineupV2(rosterWithAbsent, 4);
    expect(result.battingOrder).not.toContain(mockRoster[0].name);
  });

  test('B.7: 12-player roster assigns exactly 2 BENCH slots per inning', function () {
    const result = generateLineupV2(mockRoster12, 4);
    for (let i = 0; i < 4; i++) {
      const benchCount = Object.values(result.grid)
        .map(innings => innings[i])
        .filter(pos => pos === 'BENCH').length;
      expect(benchCount).toBe(2);
    }
  });

});

// ============================================================================
// Group C — Bench logic
// ============================================================================

describe('Group C — Bench logic', function () {

  test('C.1: 10-player roster — no player is ever benched', function () {
    const result = generateLineupV2(mockRoster, 4);
    const allEntries = Object.values(result.grid).flat();
    expect(allEntries).not.toContain('BENCH');
  });

  test('C.2: 12-player roster — each inning has exactly (12-10)=2 bench slots', function () {
    const result = generateLineupV2(mockRoster12, 4);
    for (let i = 0; i < 4; i++) {
      const benchThisInning = Object.values(result.grid)
        .filter(innings => innings[i] === 'BENCH').length;
      expect(benchThisInning).toBe(2);
    }
  });

  test('C.3: skipBench players are never assigned BENCH', function () {
    // 12-player roster, first 2 players have skipBench=true
    const rosterWithSkip = [
      { ...mockRoster12[0], skipBench: true },
      { ...mockRoster12[1], skipBench: true },
      ...mockRoster12.slice(2),
    ];
    const result = generateLineupV2(rosterWithSkip, 4);
    [mockRoster12[0].name, mockRoster12[1].name].forEach(name => {
      result.grid[name].forEach(assignment => {
        expect(assignment).not.toBe('BENCH');
      });
    });
  });

  test('C.4: all skipBench on a 12-player roster throws — not enough bench-eligible', function () {
    const allSkip = mockRoster12.map(p => ({ ...p, skipBench: true }));
    expect(() => generateLineupV2(allSkip, 4)).toThrow();
  });

  test('C.5: correct bench count per inning = max(rosterSize - 10, 0)', function () {
    [
      { roster: mockRoster,   expectedBench: 0 },
      { roster: mockRoster12, expectedBench: 2 },
    ].forEach(({ roster, expectedBench }) => {
      const result = generateLineupV2(roster, 4);
      for (let i = 0; i < 4; i++) {
        const benchCount = Object.values(result.grid)
          .filter(innings => innings[i] === 'BENCH').length;
        expect(benchCount).toBe(expectedBench);
      }
    });
  });

});

// ============================================================================
// Group D — Batting order
// ============================================================================

describe('Group D — Batting order', function () {

  test('D.1: battingOrder length equals active player count', function () {
    const rosterWithAbsent = [
      { ...mockRoster[0], outThisGame: true },
      ...mockRoster.slice(1),
    ];
    const result = generateLineupV2(rosterWithAbsent, 4);
    // 9 active players
    expect(result.battingOrder).toHaveLength(9);
  });

  test('D.2: all names in battingOrder are unique', function () {
    const result = generateLineupV2(mockRoster, 4);
    const unique = new Set(result.battingOrder);
    expect(unique.size).toBe(result.battingOrder.length);
  });

  test('D.3: strong batter ranks above weak batter in batting order', function () {
    // strong: high contact + disciplined + fast  →  high getBattingOrderScore
    // weak:   developing contact + free_swinger + developing speed  →  low score
    const strong = { ...mockRoster[0], name: 'Strong Batter', contact: 'high', swingDiscipline: 'disciplined', speed: 'fast' };
    const weak   = { ...mockRoster[1], name: 'Weak Batter',   contact: 'developing', swingDiscipline: 'free_swinger', speed: 'developing' };
    const mixed  = [strong, weak, ...mockRoster.slice(2)];
    const result = generateLineupV2(mixed, 4);
    const strongIdx = result.battingOrder.indexOf('Strong Batter');
    const weakIdx   = result.battingOrder.indexOf('Weak Batter');
    expect(strongIdx).toBeLessThan(weakIdx);
  });

  test('D.4: battingOrder only contains names from the active roster', function () {
    const activeNames = new Set(mockRoster.map(p => p.name));
    const result = generateLineupV2(mockRoster, 4);
    result.battingOrder.forEach(name => {
      expect(activeNames.has(name)).toBe(true);
    });
  });

  test('D.5: empty roster (all outThisGame) throws "No active players"', function () {
    const allOut = mockRoster.map(p => ({ ...p, outThisGame: true }));
    expect(() => generateLineupV2(allOut, 4)).toThrow(/No active players/);
  });

});

// ============================================================================
// Group E — Edge cases and warnings
// ============================================================================

describe('Group E — Edge cases and warnings', function () {

  test('E.1: 7-player roster — isValid=false, warnings not empty', function () {
    const result = generateLineupV2(mockRoster7, 4);
    expect(result.isValid).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test('E.2: 7-player roster warnings mention inning numbers', function () {
    const result = generateLineupV2(mockRoster7, 4);
    result.warnings.forEach(w => {
      expect(w).toMatch(/[Ii]nning\s*\d+/);
    });
  });

  test('E.3: 1-inning grid — each player has exactly 1 grid entry', function () {
    const result = generateLineupV2(mockRoster, 1);
    Object.values(result.grid).forEach(innings => {
      expect(innings).toHaveLength(1);
    });
  });

  test('E.4: 6-inning grid — each player has exactly 6 grid entries', function () {
    const result = generateLineupV2(mockRoster, 6);
    Object.values(result.grid).forEach(innings => {
      expect(innings).toHaveLength(6);
    });
  });

  test('E.5: empty roster array throws', function () {
    expect(() => generateLineupV2([], 4)).toThrow();
  });

  test('E.6: same input produces structurally identical output on repeat calls', function () {
    const r1 = generateLineupV2(mockRoster, 4);
    const r2 = generateLineupV2(mockRoster, 4);
    expect(r1.grid).toEqual(r2.grid);
    expect(r1.battingOrder).toEqual(r2.battingOrder);
    expect(r1.isValid).toBe(r2.isValid);
  });

  test('E.7: isValid=true when warnings is empty, false when warnings exist', function () {
    const ok   = generateLineupV2(mockRoster,  4);
    const warn = generateLineupV2(mockRoster7, 4);
    expect(ok.isValid).toBe(ok.warnings.length === 0);
    expect(warn.isValid).toBe(warn.warnings.length === 0);
  });

});

// ============================================================================
// Group X — Absent player exclusion (V2 engine)
// ============================================================================
// playerMapper.js maps tags: ['absent'] → outThisGame: true via the expression:
//   outThisGame: player.outThisGame ?? tags.includes('absent')
// The ?? operator only falls through to the tags check when outThisGame is
// null or undefined. The mockRoster fixture sets outThisGame: false explicitly,
// so tests must also set outThisGame: undefined to exercise the tags pathway.
// ============================================================================

describe('Group X — Absent player exclusion (V2 engine)', function () {

  const INNINGS = 4;
  const FIELD_POSITIONS_X = new Set(['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'LC', 'RC', 'RF']);

  test('X.1 — absent-tagged player is never assigned a field position', function () {
    // outThisGame: undefined lets playerMapper fall through to tags.includes('absent')
    const absentName = mockRoster[0].name;
    const roster = [
      { ...mockRoster[0], outThisGame: undefined, tags: ['absent'] },
      ...mockRoster.slice(1),
    ];
    const result = generateLineupV2(roster, INNINGS);
    expect(result.grid[absentName]).toBeUndefined();
  });

  test('X.2 — absent-tagged player appears Out in every inning', function () {
    const absentName = mockRoster[0].name;
    const roster = [
      { ...mockRoster[0], outThisGame: undefined, tags: ['absent'] },
      ...mockRoster.slice(1),
    ];
    const result = generateLineupV2(roster, INNINGS);
    // Absent player has no grid row; their name must not appear in any inning's assignments
    for (let i = 0; i < INNINGS; i++) {
      const assignedNames = Object.keys(result.grid);
      expect(assignedNames).not.toContain(absentName);
    }
  });

  test('X.3 — remaining 9 active players each receive a field position every inning', function () {
    // With 9 active players, bench = max(9-10, 0) = 0 — all 9 play every inning
    const roster = [
      { ...mockRoster[0], outThisGame: undefined, tags: ['absent'] },
      ...mockRoster.slice(1),
    ];
    const result = generateLineupV2(roster, INNINGS);
    const activeNames = mockRoster.slice(1).map(p => p.name);
    for (let i = 0; i < INNINGS; i++) {
      activeNames.forEach(function (name) {
        const pos = result.grid[name][i];
        expect(FIELD_POSITIONS_X.has(pos)).toBe(true);
      });
    }
  });

  test('X.4 — bench slots calculated against active count, not total roster', function () {
    // 12 total, 1 absent → 11 active → bench = max(11-10, 0) = 1 per inning
    // If calculated from total: max(12-10, 0) = 2 per inning (wrong)
    const absentName = mockRoster12[0].name;
    const roster = [
      { ...mockRoster12[0], outThisGame: undefined, tags: ['absent'] },
      ...mockRoster12.slice(1),
    ];
    const result = generateLineupV2(roster, INNINGS);
    // Absent player not in grid
    expect(result.grid[absentName]).toBeUndefined();
    // Bench = 1 per inning (active 11 - 10), not 2 (total 12 - 10)
    for (let i = 0; i < INNINGS; i++) {
      const benchThisInning = Object.values(result.grid)
        .filter(function (positions) { return positions[i] === 'BENCH'; }).length;
      expect(benchThisInning).toBe(1);
    }
  });

  test('X.5 — 2 absent players: 8 active, no bench slots, both Out every inning', function () {
    const absent1 = mockRoster[0].name;
    const absent2 = mockRoster[1].name;
    const roster = [
      { ...mockRoster[0], outThisGame: undefined, tags: ['absent'] },
      { ...mockRoster[1], outThisGame: undefined, tags: ['absent'] },
      ...mockRoster.slice(2),
    ];
    const result = generateLineupV2(roster, INNINGS);
    // Both absent players not in grid
    expect(result.grid[absent1]).toBeUndefined();
    expect(result.grid[absent2]).toBeUndefined();
    // bench = max(8 - 10, 0) = 0 — no bench slots
    const allEntries = Object.values(result.grid).flat();
    expect(allEntries).not.toContain('BENCH');
  });

});
