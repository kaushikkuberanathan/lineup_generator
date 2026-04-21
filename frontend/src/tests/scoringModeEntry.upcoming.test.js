/**
 * scoringModeEntry.upcoming.test.js
 *
 * Unit tests for computeNextGames — the pure helper that filters the
 * upcoming-games list to only games on the soonest upcoming date.
 *
 * The helper is extracted from ScoringModeEntry.jsx so it can be tested
 * without rendering the component. All six scenarios from the edge-case
 * table in the spec are covered.
 */

import { describe, it, expect } from 'vitest';
import { computeNextGames } from '../components/ScoringMode/ScoringModeEntry.jsx';

// Build a minimal upcoming-pool item. `computeNextGames` only reads
// item.game.date for comparison — d and days are unused by the function.
function makeItem(date, id) {
  return { game: { id: id || date, date: date, opponent: 'Test Opp' }, d: null, days: 0 };
}

describe('Group 1 — computeNextGames: soonest-date filtering', function () {

  it('1.1: 0 upcoming games → returns []', function () {
    expect(computeNextGames([], null)).toEqual([]);
  });

  it('1.2: 1 future game → that game is returned', function () {
    var pool = [makeItem('2026-04-25', 'g1')];
    var result = computeNextGames(pool, null);
    expect(result).toHaveLength(1);
    expect(result[0].game.id).toBe('g1');
  });

  it('1.3: doubleheader — 2 games on same date → both returned', function () {
    var pool = [makeItem('2026-04-25', 'g1'), makeItem('2026-04-25', 'g2')];
    var result = computeNextGames(pool, null);
    expect(result).toHaveLength(2);
    expect(result.map(function(r) { return r.game.id; })).toEqual(['g1', 'g2']);
  });

  it('1.4: split dates (04-25 + 04-28) → only 04-25 game returned', function () {
    var pool = [makeItem('2026-04-25', 'g1'), makeItem('2026-04-28', 'g2')];
    var result = computeNextGames(pool, null);
    expect(result).toHaveLength(1);
    expect(result[0].game.id).toBe('g1');
  });

  it('1.5: today + split dates → only the nearer date returned', function () {
    var todayItem = makeItem('2026-04-20', 'today');
    var pool = [todayItem, makeItem('2026-04-21', 'g1'), makeItem('2026-04-28', 'g2')];
    var result = computeNextGames(pool, todayItem.game);
    expect(result).toHaveLength(1);
    expect(result[0].game.id).toBe('g1');
  });

  it('1.6: today + doubleheader tomorrow → both tomorrow games returned', function () {
    var todayItem = makeItem('2026-04-20', 'today');
    var pool = [todayItem, makeItem('2026-04-21', 'g1'), makeItem('2026-04-21', 'g2')];
    var result = computeNextGames(pool, todayItem.game);
    expect(result).toHaveLength(2);
    expect(result.map(function(r) { return r.game.id; })).toEqual(['g1', 'g2']);
  });

});
