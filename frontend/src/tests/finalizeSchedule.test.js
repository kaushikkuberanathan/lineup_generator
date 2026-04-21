/**
 * Tests for finalizeSchedule utility.
 * Mocks localStorage and supabase so these are pure unit tests.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

// ── Mock supabase ─────────────────────────────────────────────────────────────
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

// ── Mock localStorage ─────────────────────────────────────────────────────────
var store = {};
var localStorageMock = {
  getItem:  function(k) { return store[k] !== undefined ? store[k] : null; },
  setItem:  function(k, v) { store[k] = String(v); },
  removeItem: function(k) { delete store[k]; },
  clear:    function() { store = {}; },
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

import { finalizeSchedule } from '../utils/finalizeSchedule';

var TEAM_ID = 'team-abc';
var GAME_ID = 'g-001';

function seedSchedule(games) {
  localStorage.setItem('team:' + TEAM_ID + ':schedule', JSON.stringify(games));
}

function readSchedule() {
  return JSON.parse(localStorage.getItem('team:' + TEAM_ID + ':schedule') || '[]');
}

beforeEach(function() {
  store = {};
});

describe('finalizeSchedule', function() {

  test('1 — finds game and writes final score fields', async function() {
    seedSchedule([
      { id: GAME_ID, opponent: 'Tigers', gameStatus: 'scheduled', usScore: null, oppScore: null },
    ]);

    var result = await finalizeSchedule({
      gameId:   GAME_ID,
      teamId:   TEAM_ID,
      usScore:  8,
      oppScore: 3,
      userId:   'user-123',
    });

    expect(result.ok).toBe(true);
    var sched = readSchedule();
    expect(sched[0].gameStatus).toBe('final');
    expect(sched[0].usScore).toBe(8);
    expect(sched[0].oppScore).toBe(3);
    expect(sched[0].finalizedAt).toBeTruthy();
    expect(sched[0].finalizedBy).toBe('user-123');
  });

  test('2 — idempotent: re-calling on final game returns ok:true without re-writing', async function() {
    var ts = '2026-04-21T10:00:00.000Z';
    seedSchedule([
      { id: GAME_ID, opponent: 'Tigers', gameStatus: 'final', usScore: 8, oppScore: 3, finalizedAt: ts },
    ]);

    var result = await finalizeSchedule({
      gameId:   GAME_ID,
      teamId:   TEAM_ID,
      usScore:  99, // different score — should be ignored
      oppScore: 99,
      userId:   'user-123',
    });

    expect(result.ok).toBe(true);
    var sched = readSchedule();
    expect(sched[0].usScore).toBe(8);    // unchanged
    expect(sched[0].finalizedAt).toBe(ts); // unchanged
  });

  test('3 — returns error not_found when gameId not in schedule', async function() {
    seedSchedule([
      { id: 'other-game', opponent: 'Eagles' },
    ]);

    var result = await finalizeSchedule({
      gameId:   GAME_ID,
      teamId:   TEAM_ID,
      usScore:  5,
      oppScore: 2,
      userId:   'user-123',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('not_found');
  });

  test('4 — returns error missing_params when gameId is absent', async function() {
    var result = await finalizeSchedule({
      gameId:   null,
      teamId:   TEAM_ID,
      usScore:  5,
      oppScore: 2,
      userId:   'user-123',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('missing_params');
  });

  test('5 — returns sync_failed and writes pending_sync when Supabase throws', async function() {
    var { supabase } = await import('../supabase');
    supabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockRejectedValue(new Error('network error')),
      }),
    });

    seedSchedule([
      { id: GAME_ID, opponent: 'Tigers', gameStatus: 'scheduled' },
    ]);

    var result = await finalizeSchedule({
      gameId:   GAME_ID,
      teamId:   TEAM_ID,
      usScore:  4,
      oppScore: 1,
      userId:   'user-123',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('sync_failed');

    // localStorage still updated — local-first
    var sched = readSchedule();
    expect(sched[0].usScore).toBe(4);

    // pending_sync written
    var pending = JSON.parse(localStorage.getItem('pending_sync:' + TEAM_ID + ':finalize') || 'null');
    expect(pending).toBeTruthy();
    expect(pending.gameId).toBe(GAME_ID);
  });

});
