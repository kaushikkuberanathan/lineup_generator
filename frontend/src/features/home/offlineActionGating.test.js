import { describe, test, expect } from 'vitest';
import { applyOfflineActionGating, OFFLINE_REASON } from './offlineActionGating.js';

function team(actions) {
  return { id: 't1', displayName: 'Mud Hens', actions: actions };
}

describe('applyOfflineActionGating', function () {
  test('online -> returns the input unchanged (same reference)', function () {
    var teams = [team([{ id: 'a', enabled: true, disabledReason: null }])];
    expect(applyOfflineActionGating(teams, true)).toBe(teams);
  });

  test('offline -> a previously-enabled action becomes disabled with the offline reason', function () {
    var teams = [team([{ id: 'a', label: 'Start Game Mode', href: '/x', enabled: true, disabledReason: null }])];
    var result = applyOfflineActionGating(teams, false);
    expect(result[0].actions[0].enabled).toBe(false);
    expect(result[0].actions[0].disabledReason).toBe(OFFLINE_REASON);
  });

  test('offline -> an action already disabled for a real reason keeps its original reason, not the offline one', function () {
    var teams = [team([{ id: 'a', enabled: false, disabledReason: 'Lineup is locked for this game.' }])];
    var result = applyOfflineActionGating(teams, false);
    expect(result[0].actions[0].disabledReason).toBe('Lineup is locked for this game.');
  });

  test('does not mutate the original teams array or its action objects', function () {
    var original = team([{ id: 'a', enabled: true, disabledReason: null }]);
    var teams = [original];
    applyOfflineActionGating(teams, false);
    expect(original.actions[0].enabled).toBe(true);
  });

  test('a team with no actions passes through safely', function () {
    var teams = [{ id: 't1', displayName: 'Mud Hens', actions: [] }];
    var result = applyOfflineActionGating(teams, false);
    expect(result[0].actions).toEqual([]);
  });

  test('handles a non-array input without throwing', function () {
    expect(applyOfflineActionGating(null, false)).toBeNull();
    expect(applyOfflineActionGating(undefined, false)).toBeUndefined();
  });
});
