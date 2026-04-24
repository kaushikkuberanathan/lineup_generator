import { describe, it, expect } from 'vitest';
import { truncateTeamName } from '../utils/formatters';

describe('truncateTeamName', function() {
  it('returns "Team" for null', function() {
    expect(truncateTeamName(null)).toBe('Team');
  });

  it('returns "Team" for undefined', function() {
    expect(truncateTeamName(undefined)).toBe('Team');
  });

  it('returns "Team" for empty string', function() {
    expect(truncateTeamName('')).toBe('Team');
  });

  it('passes through names of 12 chars or fewer unchanged', function() {
    expect(truncateTeamName('Bananas')).toBe('Bananas');         // 7 chars
    expect(truncateTeamName('Timber Rattl')).toBe('Timber Rattl'); // exactly 12
  });

  it('truncates names longer than 12 chars to 10 chars + ".."', function() {
    expect(truncateTeamName('Timber Rattlers')).toBe('Timber Rat..');  // 15 chars
    expect(truncateTeamName('Blue Wahoos FC')).toBe('Blue Wahoo..');   // 14 chars
  });

  it('respects a custom max parameter and handles non-string input defensively', function() {
    expect(truncateTeamName('Bananas12', 8)).toBe('Banana..');  // 9 chars, cap=8 → sub(0,6)+'..'
    expect(truncateTeamName(42)).toBe('Team');                   // non-string → fallback
  });
});
