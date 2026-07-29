import { describe, test, expect } from 'vitest';
import {
  DEMO_AGE_GROUP,
  DEMO_INNINGS,
  DEMO_SEED_VERSION,
  DEMO_ROSTER,
  DEMO_SCHEDULE,
  DEMO_GRID,
} from './demoSeed';

// ============================================================================
// demoSeed shape tests (DS1-DS8) - Track A4 / #423
//
// Static demo-mode fixture data (roster, schedule, position grid). No
// mocking needed -- these are data-shape assertions against the literal
// exported constants, guarding against accidental shape drift if the seed
// is hand-edited.
// ============================================================================

describe('demoSeed - shape', function () {

  test('DS1: scalar constants have expected types', function () {
    expect(typeof DEMO_AGE_GROUP).toBe('string');
    expect(typeof DEMO_INNINGS).toBe('number');
    expect(typeof DEMO_SEED_VERSION).toBe('number');
  });

  test('DS2: DEMO_ROSTER is a non-empty array', function () {
    expect(Array.isArray(DEMO_ROSTER)).toBe(true);
    expect(DEMO_ROSTER.length).toBeGreaterThan(0);
  });

  test('DS3: every roster entry has the required player-attribute fields', function () {
    var requiredFields = [
      'name', 'tags', 'power', 'prefs', 'speed',
      'effort', 'skills', 'contact', 'ballType', 'dislikes',
    ];
    DEMO_ROSTER.forEach(function (player) {
      requiredFields.forEach(function (field) {
        expect(player).toHaveProperty(field);
      });
      expect(typeof player.name).toBe('string');
      expect(player.name.length).toBeGreaterThan(0);
    });
  });

  test('DS4: DEMO_SCHEDULE is a non-empty array with required game fields', function () {
    expect(Array.isArray(DEMO_SCHEDULE)).toBe(true);
    expect(DEMO_SCHEDULE.length).toBeGreaterThan(0);
    var requiredFields = ['id', 'date', 'time', 'location', 'opponent', 'home', 'result'];
    DEMO_SCHEDULE.forEach(function (game) {
      requiredFields.forEach(function (field) {
        expect(game).toHaveProperty(field);
      });
      expect(typeof game.id).toBe('string');
      expect(typeof game.home).toBe('boolean');
    });
  });

  test('DS5: DEMO_SCHEDULE game ids are unique', function () {
    var ids = DEMO_SCHEDULE.map(function (g) { return g.id; });
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('DS6: DEMO_GRID is a plain object keyed by player name', function () {
    expect(typeof DEMO_GRID).toBe('object');
    expect(DEMO_GRID).not.toBeNull();
    expect(Array.isArray(DEMO_GRID)).toBe(false);
  });

  test('DS7: DEMO_GRID has an entry for every DEMO_ROSTER player, and every entry is a position array', function () {
    var rosterNames = DEMO_ROSTER.map(function (p) { return p.name; });
    rosterNames.forEach(function (name) {
      expect(DEMO_GRID).toHaveProperty(name);
      expect(Array.isArray(DEMO_GRID[name])).toBe(true);
    });
  });

  test('DS8: every DEMO_GRID position-per-inning array covers at least DEMO_INNINGS entries', function () {
    Object.keys(DEMO_GRID).forEach(function (name) {
      // >= not === : App.jsx only ever reads grid[name][0..DEMO_INNINGS-1] (see
    // App.jsx:399/410/454/477/520/527/619). A longer array is harmless unused
    // trailing data; a SHORTER one would break those lookups. See #425.
    expect(DEMO_GRID[name].length).toBeGreaterThanOrEqual(DEMO_INNINGS);
    });
  });

});


