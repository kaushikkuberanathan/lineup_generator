import { describe, expect, it } from 'vitest';
import { MERGE_FIELDS } from '../utils/scheduleHydrationFields.js';

describe('schedule hydration field contract', () => {
  it('contains the complete ordered set of local-only fields', () => {
    expect(MERGE_FIELDS).toEqual([
      'scoreReported',
      'snackDuty',
      'snackNote',
      'gameBall',
      'usScore',
      'oppScore',
      'gameStatus',
      'finalizedAt',
    ]);
  });

  it('is immutable and contains no duplicate fields', () => {
    expect(Object.isFrozen(MERGE_FIELDS)).toBe(true);
    expect(new Set(MERGE_FIELDS).size).toBe(MERGE_FIELDS.length);
    expect(() => MERGE_FIELDS.push('unexpectedField')).toThrow(TypeError);
  });
});
