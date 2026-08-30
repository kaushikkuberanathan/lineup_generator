import { describe, test, expect } from 'vitest';
import { POSITION_LABELS } from './positions';

// ============================================================================
// constants/positions.js — named in root CLAUDE.md as a file whose changes
// "must pass frontend npm test," yet had no test anywhere. Small file, but
// a typo here (e.g. a duplicated key, a missing position) silently breaks
// every UI surface that labels a field position.
// ============================================================================

describe('POSITION_LABELS', function () {
  test('has exactly the 10 field positions plus Bench, each with a human label', function () {
    var expectedKeys = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'LC', 'RC', 'RF', 'Bench'];
    expect(Object.keys(POSITION_LABELS).sort()).toEqual(expectedKeys.sort());
  });

  test('every label is a non-empty string, and no two positions share a label', function () {
    var labels = Object.values(POSITION_LABELS);
    labels.forEach(function (label) {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });
    expect(new Set(labels).size).toBe(labels.length);
  });

  test('spot-checks the documented abbreviation-to-name mapping', function () {
    expect(POSITION_LABELS.P).toBe('Pitcher');
    expect(POSITION_LABELS.SS).toBe('Shortstop');
    expect(POSITION_LABELS.LC).toBe('Left center field');
    expect(POSITION_LABELS.Bench).toBe('Bench');
  });
});
