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

  it('returns "Team" for non-string input', function() {
    expect(truncateTeamName(42)).toBe('Team');
  });

  it('passes through names of 12 chars or fewer unchanged', function() {
    expect(truncateTeamName('Bananas')).toBe('Bananas');           // 7 chars
    expect(truncateTeamName('Timber Rattl')).toBe('Timber Rattl'); // exactly 12
    expect(truncateTeamName('Firefighters')).toBe('Firefighters'); // exactly 12
    expect(truncateTeamName('Blue Wahoos')).toBe('Blue Wahoos');   // 11 chars
  });

  it('abbreviates multi-word names over limit using first initial', function() {
    expect(truncateTeamName('Timber Rattlers')).toBe('T. Rattlers');  // 15 chars → 11
    expect(truncateTeamName('Blue Wahoos FC')).toBe('B. Wahoos FC');  // 14 chars → 12
    expect(truncateTeamName('Party Animals')).toBe('P. Animals');     // 13 chars → 10
    expect(truncateTeamName('Demo All-Stars')).toBe('D. All-Stars');  // 14 chars → 12
  });

  it('truncates candidate with ellipsis when even the abbreviated form is too long', function() {
    // "S. Springs Academy" = 18 chars, cap=12 → slice(0,11)+'…' = "S. Springs …"
    expect(truncateTeamName('Sharon Springs Academy')).toBe('S. Springs …');
  });

  it('truncates single-word names over limit with ellipsis', function() {
    expect(truncateTeamName('Bananas12', 8)).toBe('Bananas…'); // 9 chars, cap=8 → slice(0,7)+'…'
  });
});
