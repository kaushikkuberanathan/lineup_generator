import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '../supabase';
import {
  rememberPendingFinalization,
  retryAllPendingFinalizations,
  retryPendingFinalization,
} from '../utils/pendingFinalizationSync';

var TEAM_ID = 'team-retry';
var GAME_ID = 'game-retry';
var FINALIZED_AT = '2026-08-29T12:00:00.000Z';

function seedFinalSchedule(overrides) {
  var game = Object.assign({
    id: GAME_ID,
    gameStatus: 'final',
    usScore: 8,
    oppScore: 3,
    finalizedAt: FINALIZED_AT,
  }, overrides || {});
  localStorage.setItem('team:' + TEAM_ID + ':schedule', JSON.stringify([game]));
  return game;
}

function queueMarker() {
  return rememberPendingFinalization({
    teamId: TEAM_ID,
    gameId: GAME_ID,
    finalizedAt: FINALIZED_AT,
  });
}

function mockUpdate(result, delay) {
  var eq = vi.fn(function() {
    if (delay) return new Promise(function(resolve) { setTimeout(function() { resolve(result); }, delay); });
    return Promise.resolve(result);
  });
  var update = vi.fn(function() { return { eq: eq }; });
  supabase.from.mockReturnValue({ update: update });
  return { update: update, eq: eq };
}

beforeEach(function() {
  localStorage.clear();
  supabase.from.mockReset();
});

describe('pending finalization recovery', function() {
  test('retries the current local schedule and clears the marker only after success', async function() {
    var game = seedFinalSchedule();
    queueMarker();
    var calls = mockUpdate({ error: null });

    var result = await retryPendingFinalization(TEAM_ID);

    expect(result).toEqual({ ok: true });
    expect(supabase.from).toHaveBeenCalledWith('team_data');
    expect(calls.update).toHaveBeenCalledWith({ schedule: [game] });
    expect(calls.eq).toHaveBeenCalledWith('team_id', TEAM_ID);
    expect(localStorage.getItem('pending_sync:' + TEAM_ID + ':finalize')).toBe(null);
  });

  test('retains the marker when Supabase returns an error so a later retry can recover', async function() {
    seedFinalSchedule();
    queueMarker();
    mockUpdate({ error: { message: 'offline' } });

    expect(await retryPendingFinalization(TEAM_ID)).toEqual({ ok: false, error: 'sync_failed' });
    expect(JSON.parse(localStorage.getItem('pending_sync:' + TEAM_ID + ':finalize')).gameId).toBe(GAME_ID);
  });

  test('does not upload or clear a marker when the local finalization was superseded', async function() {
    seedFinalSchedule({ finalizedAt: '2026-08-29T13:00:00.000Z', usScore: 9 });
    queueMarker();

    expect(await retryPendingFinalization(TEAM_ID)).toEqual({ ok: false, error: 'stale_pending_sync' });
    expect(supabase.from).not.toHaveBeenCalled();
    expect(localStorage.getItem('pending_sync:' + TEAM_ID + ':finalize')).not.toBe(null);
  });

  test('deduplicates concurrent retry triggers for the same team', async function() {
    seedFinalSchedule();
    queueMarker();
    mockUpdate({ error: null }, 10);

    var first = retryPendingFinalization(TEAM_ID);
    var second = retryPendingFinalization(TEAM_ID);
    expect(first).toBe(second);
    await Promise.all([first, second]);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  test('discovers persisted markers at startup and retries each team independently', async function() {
    seedFinalSchedule();
    queueMarker();
    mockUpdate({ error: null });

    var results = await retryAllPendingFinalizations();

    expect(results).toContainEqual({ ok: true });
    expect(localStorage.getItem('pending_sync:' + TEAM_ID + ':finalize')).toBe(null);
  });

  test('upgrades and retries a legacy gameId-only marker written before #921', async function() {
    seedFinalSchedule();
    localStorage.setItem(
      'pending_sync:' + TEAM_ID + ':finalize',
      JSON.stringify({ gameId: GAME_ID, ts: '2026-08-29T11:00:00.000Z' })
    );
    mockUpdate({ error: null });

    expect(await retryPendingFinalization(TEAM_ID)).toEqual({ ok: true });
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('pending_sync:' + TEAM_ID + ':finalize')).toBe(null);
  });
});
