/**
 * realtimeRaceGuard.test.js
 *
 * CONTRACT: The live_game_state Realtime handler must reject stale and
 * echo events — events whose updated_at is <= the last timestamp stamped
 * by persist(). Without this guard, a delayed Realtime notification
 * (e.g., a pre-half-flip upsert arriving after the flip upsert) can
 * overwrite local state with stale runners.
 *
 * RED phase: Tests 1 and 3 fail. The current handler unconditionally
 * calls setGs(row) for every incoming event — no timestamp guard exists.
 * Test 2 passes in both phases (baseline: fresh events must always apply).
 *
 * GREEN phase: persist() captures a timestamp, updates lastAppliedAtRef;
 * handler skips setGs when row.updated_at <= lastAppliedAtRef.current.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { renderHook } from './helpers/renderHook.js';

var T1 = '2026-04-23T10:00:00.000Z'; // earlier (stale) timestamp
var T2 = '2026-04-23T10:00:01.000Z'; // later (current) timestamp

var MOCK_TEAM = { id: 'team-test' };

// ── Mocks ─────────────────────────────────────────────────────────────────────

var mocks = vi.hoisted(function() {
  var lgsUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
  var lgsBuilder = {
    select: vi.fn(), eq: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: lgsUpsert,
  };
  lgsBuilder.select.mockReturnValue(lgsBuilder);
  lgsBuilder.eq.mockReturnValue(lgsBuilder);

  var sessUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
  var sessBuilder = {
    select: vi.fn(), eq: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: sessUpsert,
    delete: vi.fn(),
  };
  sessBuilder.select.mockReturnValue(sessBuilder);
  sessBuilder.eq.mockReturnValue(sessBuilder);
  sessBuilder.delete.mockReturnValue(sessBuilder);

  var auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });
  var auditBuilder = { insert: auditInsert };

  var channelObj = { on: vi.fn(), subscribe: vi.fn() };
  channelObj.on.mockReturnValue(channelObj);
  channelObj.subscribe.mockReturnValue(channelObj);

  var client = {
    from: vi.fn(),
    channel: vi.fn().mockReturnValue(channelObj),
    removeChannel: vi.fn(),
  };
  client.from.mockImplementation(function(table) {
    if (table === 'live_game_state')        return lgsBuilder;
    if (table === 'game_scoring_sessions')  return sessBuilder;
    return auditBuilder;
  });

  return { client, lgsBuilder, lgsUpsert, sessBuilder, sessUpsert, auditBuilder, channelObj };
});

vi.mock('../supabase', function() {
  return { supabase: mocks.client };
});

vi.mock('../utils/leagueRules', function() {
  return {
    getRulesForTeam:   vi.fn().mockReturnValue({ id: 'test-rules' }),
    getPitchUIConfig:  vi.fn().mockReturnValue({}),
    processPitch:      vi.fn().mockReturnValue({
      balls: 1, strikes: 0, attempts: 0, coachPitchesRemaining: 0,
      isCoachPitching: false, warnings: [], isResolved: false,
    }),
    validateSteal:     vi.fn(),
    isRunLimitReached: vi.fn().mockReturnValue(false),
    PITCH_TYPE:        {},
    AT_BAT_RESULT:     { WALK: 'walk', STRIKEOUT: 'strikeout', OUT_ATTEMPTS: 'out_attempts' },
  };
});

import { useLiveScoring } from '../hooks/useLiveScoring.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function hookParams(overrides) {
  return Object.assign(
    { gameId: 'g1', teamId: 't1', isEnabled: true, team: MOCK_TEAM },
    overrides || {}
  );
}

// Override channelObj.on to capture the live_game_state Realtime callback.
// Must be called BEFORE renderHook so the mock is in place when the effect fires.
function captureRealtimeCallbacks() {
  var captured = { lgs: null, gss: null };
  mocks.channelObj.on.mockImplementation(function(event, opts, cb) {
    if (opts && opts.table === 'live_game_state')        captured.lgs = cb;
    if (opts && opts.table === 'game_scoring_sessions')  captured.gss = cb;
    return mocks.channelObj;
  });
  return captured;
}

// Mount hook and claim scorer (triggers a persist() call → seeds lastAppliedAtRef in GREEN).
async function mountAndClaim(params) {
  var h = await renderHook(function() {
    return useLiveScoring(params || hookParams());
  });
  await act(async function() {
    h.result.current.claimScorerLock();
  });
  return h;
}

// Minimal valid live_game_state row for simulating Realtime events.
function lgsRow(overrides) {
  return Object.assign({
    game_id: 'g1', team_id: 't1',
    inning: 1, half_inning: 'top',
    outs: 0, balls: 0, strikes: 0,
    my_score: 0, opponent_score: 0,
    runners: [],
    current_batter: null,
    batting_order_index: 0,
    runs_this_half: 0, opp_runs_this_half: 0,
    opp_balls: 0, opp_strikes: 0,
    opp_current_batter_number: 1,
    opp_current_batter_pitches: 0,
    opp_inning_pitches: 0, opp_game_pitches: 0,
    updated_at: T1,
  }, overrides || {});
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Realtime race condition guard', function() {

  beforeEach(function() {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.lgsBuilder.select.mockReturnValue(mocks.lgsBuilder);
    mocks.lgsBuilder.eq.mockReturnValue(mocks.lgsBuilder);
    mocks.lgsBuilder.single.mockResolvedValue({ data: null, error: null });
    mocks.lgsUpsert.mockResolvedValue({ data: null, error: null });
    mocks.sessBuilder.select.mockReturnValue(mocks.sessBuilder);
    mocks.sessBuilder.eq.mockReturnValue(mocks.sessBuilder);
    mocks.sessBuilder.single.mockResolvedValue({ data: null, error: null });
    mocks.sessBuilder.delete.mockReturnValue(mocks.sessBuilder);
    mocks.sessUpsert.mockResolvedValue({ data: null, error: null });
    mocks.auditBuilder.insert.mockResolvedValue({ data: null, error: null });
    mocks.channelObj.on.mockReturnValue(mocks.channelObj);
    mocks.channelObj.subscribe.mockReturnValue(mocks.channelObj);
    mocks.client.channel.mockReturnValue(mocks.channelObj);
    mocks.client.from.mockImplementation(function(table) {
      if (table === 'live_game_state')        return mocks.lgsBuilder;
      if (table === 'game_scoring_sessions')  return mocks.sessBuilder;
      return mocks.auditBuilder;
    });
  });

  afterEach(function() {
    vi.useRealTimers();
  });

  // ── Test 1: Stale event rejected ───────────────────────────────────────────
  // RED: handler calls setGs(row) unconditionally — runners overwritten.
  // GREEN: T1 < T2 (last persisted) → guard returns early → runners unchanged.
  it('1: stale Realtime event (updated_at < last persist) does not overwrite local runners', async function() {
    vi.setSystemTime(new Date(T2)); // persist() stamps T2 via new Date().toISOString()

    var callbacks = captureRealtimeCallbacks();
    // mountAndClaim → claimScorerLock → persist(gsRef) with updated_at: T2
    // GREEN: lastAppliedAtRef.current = T2 after the mock .then() resolves
    var h = await mountAndClaim();

    // Simulate a delayed Realtime event from before the persist (T1 < T2)
    // with stale runners that should have been cleared by a half-flip
    await act(async function() {
      callbacks.lgs({
        new: lgsRow({ updated_at: T1, runners: [{ runnerId: 'StaleRunner', base: 1 }] }),
      });
    });

    var runnerIds = h.result.current.gameState.runners.map(function(r) { return r.runnerId; });
    expect(runnerIds).not.toContain('StaleRunner');

    await h.unmount();
  });

  // ── Test 2: Fresh event applied ────────────────────────────────────────────
  // Baseline: when no persist has fired (lastAppliedAtRef = ''), any
  // incoming event must be applied. Passes RED and GREEN.
  it('2: fresh Realtime event is applied when lastAppliedAtRef is empty', async function() {
    var callbacks = captureRealtimeCallbacks();
    // Mount only — do NOT claim scorer, so no persist fires and ref stays ''
    var h = await renderHook(function() {
      return useLiveScoring(hookParams());
    });

    await act(async function() {
      callbacks.lgs({
        new: lgsRow({ updated_at: T1, inning: 3, my_score: 4 }),
      });
    });

    // Event must be applied: gs reflects the Realtime row data
    expect(h.result.current.gameState.inning).toBe(3);
    expect(h.result.current.gameState.myScore).toBe(4);

    await h.unmount();
  });

  // ── Test 3: Echo event rejected ────────────────────────────────────────────
  // RED: handler calls setGs(row) for echo (same T2) — clobbers local state.
  // GREEN: T2 <= T2 → guard returns early → local state preserved.
  it('3: echo Realtime event (updated_at === last persist) does not clobber local state', async function() {
    vi.setSystemTime(new Date(T2));

    var callbacks = captureRealtimeCallbacks();
    var h = await mountAndClaim(); // persist at T2 → GREEN: lastAppliedAtRef.current = T2

    // Confirm baseline: runners starts empty after claim
    expect(h.result.current.gameState.runners).toEqual([]);

    // Simulate the Supabase echo of our own persist:
    // same T2 timestamp, but with runners populated (the stale-echo scenario —
    // an echo of a pre-flip write arriving at the same millisecond as the flip persist)
    await act(async function() {
      callbacks.lgs({
        new: lgsRow({ updated_at: T2, runners: [{ runnerId: 'EchoRunner', base: 2 }] }),
      });
    });

    // Guard must reject: local runners remain []
    expect(h.result.current.gameState.runners).toEqual([]);

    await h.unmount();
  });

});
