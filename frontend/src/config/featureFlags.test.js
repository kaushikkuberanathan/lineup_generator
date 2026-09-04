import { describe, test, expect, beforeEach } from 'vitest';
import { FEATURE_FLAGS, isFlagEnabled, setRuntimeFlagCache } from './featureFlags';

// ============================================================================
// config/featureFlags.js — named in root CLAUDE.md as a file whose changes
// "must pass frontend npm test," yet had no direct test of its own (only the
// bootstrap layer built on top of it was tested). Covers the registry shape
// and isFlagEnabled()'s three-tier precedence: localStorage override > DB
// runtime cache > static default.
// ============================================================================

describe('featureFlags', function () {
  beforeEach(function () {
    localStorage.clear();
    setRuntimeFlagCache(null);
  });

  test('FEATURE_FLAGS registry has the documented flags with boolean values', function () {
    var expectedFlags = [
      'USE_NEW_LINEUP_ENGINE', 'MAINTENANCE_MODE', 'VIEWER_MODE', 'GAME_MODE',
      'ACCESSIBILITY_V1', 'SCORING_SHEET_V2', 'COMBINED_GAMEMODE_AND_SCORING',
      'UX_SUPPORT', 'UX_ACCOUNT',
    ];
    expectedFlags.forEach(function (flag) {
      expect(typeof FEATURE_FLAGS[flag]).toBe('boolean');
    });
  });

  test('isFlagEnabled falls back to the static default when no override or cache exists', function () {
    expect(isFlagEnabled('MAINTENANCE_MODE')).toBe(false);
    expect(isFlagEnabled('ACCESSIBILITY_V1')).toBe(true);
  });

  test('an unrecognized flag name is treated as disabled', function () {
    expect(isFlagEnabled('NOT_A_REAL_FLAG')).toBe(false);
  });

  test('a localStorage override of "true" forces the flag on, even over a false default', function () {
    localStorage.setItem('flag_MAINTENANCE_MODE', 'true');
    expect(isFlagEnabled('MAINTENANCE_MODE')).toBe(true);
  });

  test('a localStorage override of "false" forces the flag off, even over a true default', function () {
    localStorage.setItem('flag_ACCESSIBILITY_V1', 'false');
    expect(isFlagEnabled('ACCESSIBILITY_V1')).toBe(false);
  });

  test('the DB-driven runtime cache overrides the static default when no localStorage override is set', function () {
    setRuntimeFlagCache({ MAINTENANCE_MODE: true });
    expect(isFlagEnabled('MAINTENANCE_MODE')).toBe(true);
  });

  test('a localStorage override takes precedence over the runtime cache', function () {
    setRuntimeFlagCache({ MAINTENANCE_MODE: true });
    localStorage.setItem('flag_MAINTENANCE_MODE', 'false');
    expect(isFlagEnabled('MAINTENANCE_MODE')).toBe(false);
  });

  test('the runtime cache only overrides flags it explicitly names, falling through to default for others', function () {
    setRuntimeFlagCache({ MAINTENANCE_MODE: true });
    expect(isFlagEnabled('ACCESSIBILITY_V1')).toBe(true);
  });
});
