/**
 * playerUtils.test.js
 *
 * Second-pass coverage follow-up (session 2026-08-23): utils/playerUtils.js
 * had zero test coverage despite being imported by App.jsx and
 * PlayerHandBadge.jsx for batting-hand normalization/display.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeBattingHand,
  battingHandLabel,
  battingHandBadge,
} from '../utils/playerUtils.js';

describe('normalizeBattingHand', function () {

  it('normalizes every left-handed input variant to "L"', function () {
    expect(normalizeBattingHand('L')).toBe('L');
    expect(normalizeBattingHand('l')).toBe('L');
    expect(normalizeBattingHand('Left')).toBe('L');
    expect(normalizeBattingHand('left')).toBe('L');
  });

  it('normalizes every right-handed input variant to "R"', function () {
    expect(normalizeBattingHand('R')).toBe('R');
    expect(normalizeBattingHand('r')).toBe('R');
    expect(normalizeBattingHand('Right')).toBe('R');
    expect(normalizeBattingHand('right')).toBe('R');
  });

  it('falls back to "U" for null, undefined, empty string, and unrecognized values', function () {
    expect(normalizeBattingHand(null)).toBe('U');
    expect(normalizeBattingHand(undefined)).toBe('U');
    expect(normalizeBattingHand('')).toBe('U');
    expect(normalizeBattingHand('switch')).toBe('U');
    expect(normalizeBattingHand(0)).toBe('U');
  });
});

describe('battingHandLabel', function () {

  it('maps canonical codes to their human-readable labels', function () {
    expect(battingHandLabel('L')).toBe('Left');
    expect(battingHandLabel('R')).toBe('Right');
  });

  it('returns an empty string for "U" or anything else', function () {
    expect(battingHandLabel('U')).toBe('');
    expect(battingHandLabel(null)).toBe('');
    expect(battingHandLabel('left')).toBe(''); // not pre-normalized — exact-match only
  });
});

describe('battingHandBadge', function () {

  it('returns the single-letter badge for canonical codes', function () {
    expect(battingHandBadge('L')).toBe('L');
    expect(battingHandBadge('R')).toBe('R');
  });

  it('returns an empty string for "U" or anything else', function () {
    expect(battingHandBadge('U')).toBe('');
    expect(battingHandBadge(undefined)).toBe('');
  });
});
