import { describe, expect, it } from 'vitest';
import { firstName } from './playerName';

describe('firstName', () => {
  it('preserves the existing first-token contract', () => {
    expect(firstName('Carlos De La Cruz')).toBe('Carlos');
    expect(firstName('')).toBe('');
    expect(firstName(null)).toBeNull();
  });
});
