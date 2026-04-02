/**
 * formatters.test.js — regression tests for fmtAvg and fmtStat.
 *
 * Covers:
 *   - fmtAvg: leading-zero stripping, "---" for 0 AB, boundary values,
 *     string input coercion, perfect 1.000 average
 *   - fmtStat: integer coercion, NaN/null/undefined → "0", float truncation
 *
 * Run: npm test  (from frontend/)
 */

import { fmtAvg, fmtStat } from '../utils/formatters.js';

// ============================================================================
// Group 1 — fmtAvg: batting average formatting
// ============================================================================

describe('Group 1 — fmtAvg', function () {

  test('1.1: 0 AB → "---"', function () {
    expect(fmtAvg(0, 0)).toBe('---');
  });

  test('1.2: null AB → "---"', function () {
    expect(fmtAvg(1, null)).toBe('---');
  });

  test('1.3: undefined AB → "---"', function () {
    expect(fmtAvg(1, undefined)).toBe('---');
  });

  test('1.4: string "0" AB → "---"', function () {
    expect(fmtAvg(1, '0')).toBe('---');
  });

  test('1.5: .333 — leading zero stripped (1 hit / 3 AB)', function () {
    expect(fmtAvg(1, 3)).toBe('.333');
  });

  test('1.6: .500 — leading zero stripped (1 hit / 2 AB)', function () {
    expect(fmtAvg(1, 2)).toBe('.500');
  });

  test('1.7: .000 — leading zero stripped (0 hits / 10 AB)', function () {
    expect(fmtAvg(0, 10)).toBe('.000');
  });

  test('1.8: 1.000 — perfect average preserved with leading 1', function () {
    expect(fmtAvg(4, 4)).toBe('1.000');
  });

  test('1.9: .667 — 2 hits / 3 AB', function () {
    expect(fmtAvg(2, 3)).toBe('.667');
  });

  test('1.10: string number inputs are coerced via parseInt', function () {
    expect(fmtAvg('1', '3')).toBe('.333');
  });

  test('1.11: 0 hits / 0 AB → "---" (not "0.000" or NaN)', function () {
    expect(fmtAvg('0', '0')).toBe('---');
  });

  test('1.12: non-numeric h treated as 0 (0/3 = .000)', function () {
    expect(fmtAvg(null, 3)).toBe('.000');
  });
});

// ============================================================================
// Group 2 — fmtStat: counting stat formatting
// ============================================================================

describe('Group 2 — fmtStat', function () {

  test('2.1: integer returns string form', function () {
    expect(fmtStat(5)).toBe('5');
  });

  test('2.2: 0 returns "0"', function () {
    expect(fmtStat(0)).toBe('0');
  });

  test('2.3: null → "0"', function () {
    expect(fmtStat(null)).toBe('0');
  });

  test('2.4: undefined → "0"', function () {
    expect(fmtStat(undefined)).toBe('0');
  });

  test('2.5: NaN → "0"', function () {
    expect(fmtStat(NaN)).toBe('0');
  });

  test('2.6: string "5" → "5"', function () {
    expect(fmtStat('5')).toBe('5');
  });

  test('2.7: float truncated — "5.9" → "5"', function () {
    expect(fmtStat(5.9)).toBe('5');
    expect(fmtStat('5.9')).toBe('5');
  });

  test('2.8: large counting stat preserved', function () {
    expect(fmtStat(123)).toBe('123');
  });
});
