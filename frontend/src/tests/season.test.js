import { describe, it, expect } from 'vitest';
import { currentSeasonGuess, formatSeason, compareTeamsNewestFirst } from '../utils/season.js';

describe('currentSeasonGuess', function() {
  it('Jan-Jun -> Spring', function() {
    expect(currentSeasonGuess(new Date(2026, 0, 1))).toBe('Spring');  // Jan
    expect(currentSeasonGuess(new Date(2026, 5, 30))).toBe('Spring'); // Jun (boundary)
  });

  it('Jul-Dec -> Fall', function() {
    expect(currentSeasonGuess(new Date(2026, 6, 1))).toBe('Fall');   // Jul (boundary)
    expect(currentSeasonGuess(new Date(2026, 11, 31))).toBe('Fall'); // Dec
  });

  it('defaults to the real current date when called with no argument', function() {
    var expected = (new Date().getMonth() + 1) <= 6 ? 'Spring' : 'Fall';
    expect(currentSeasonGuess()).toBe(expected);
  });
});

describe('formatSeason', function() {
  it('combines season + last-2-digits of year', function() {
    expect(formatSeason('Spring', 2026)).toBe('Spring 26');
    expect(formatSeason('Fall', 2026)).toBe('Fall 26');
  });

  it('single-digit-looking years still slice to 2 chars', function() {
    expect(formatSeason('Spring', 2008)).toBe('Spring 08');
  });

  it('no season -> empty string, regardless of year', function() {
    expect(formatSeason('', 2026)).toBe('');
    expect(formatSeason(null, 2026)).toBe('');
    expect(formatSeason(undefined, 2026)).toBe('');
  });

  it('season with no year -> just the season, no trailing space', function() {
    expect(formatSeason('Spring', null)).toBe('Spring');
    expect(formatSeason('Spring', undefined)).toBe('Spring');
    expect(formatSeason('Spring', 0)).toBe('Spring');
  });
});

describe('compareTeamsNewestFirst', function() {
  it('different years: higher year sorts first', function() {
    var a = { season: 'Spring', year: 2025 };
    var b = { season: 'Spring', year: 2026 };
    expect(compareTeamsNewestFirst(a, b)).toBeGreaterThan(0); // a should sort after b
    expect(compareTeamsNewestFirst(b, a)).toBeLessThan(0);    // b should sort before a
  });

  it('same year: Fall sorts before Spring', function() {
    var spring = { season: 'Spring', year: 2026 };
    var fall = { season: 'Fall', year: 2026 };
    expect(compareTeamsNewestFirst(fall, spring)).toBeLessThan(0);
    expect(compareTeamsNewestFirst(spring, fall)).toBeGreaterThan(0);
  });

  it('same year and season: stable (returns 0)', function() {
    var a = { season: 'Spring', year: 2026 };
    var b = { season: 'Spring', year: 2026 };
    expect(compareTeamsNewestFirst(a, b)).toBe(0);
  });

  it('a full sort produces newest-first order end to end', function() {
    var teams = [
      { name: 'Old Spring', season: 'Spring', year: 2025 },
      { name: 'This Fall', season: 'Fall', year: 2026 },
      { name: 'This Spring', season: 'Spring', year: 2026 },
    ];
    var sorted = teams.slice().sort(compareTeamsNewestFirst).map(function(t) { return t.name; });
    expect(sorted).toEqual(['This Fall', 'This Spring', 'Old Spring']);
  });

  it('missing season/year on either side does not throw, treated as lowest-rank', function() {
    var complete = { season: 'Fall', year: 2026 };
    expect(function() { compareTeamsNewestFirst(complete, {}); }).not.toThrow();
    expect(function() { compareTeamsNewestFirst({}, complete); }).not.toThrow();
    expect(function() { compareTeamsNewestFirst(null, complete); }).not.toThrow();
    expect(function() { compareTeamsNewestFirst(complete, undefined); }).not.toThrow();
  });
});
