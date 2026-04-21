/**
 * liveStateMerge.test.js
 *
 * CONTRACT: Every write to live_game_state must be a full-row upsert
 * that preserves all peer columns. This locks in the MERGE discipline
 * that prevents the April 2026 regression (gameBall/snackDuty/scoreReported
 * dropped by partial writes) from reproducing in the scoring hot path.
 *
 * Mock note: useLiveScore.contract.test.js uses a single queryBuilder for
 * all tables (read-only hook needs no per-table dispatch). This file uses
 * per-table builders so we can spy on live_game_state upserts specifically.
 * If future write-path tests are added, consider extracting the per-table
 * factory to frontend/src/tests/helpers/supabaseMock.js.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { renderHook } from './helpers/renderHook.js';

var MOCK_TEAM   = { id: 'team-test' };
var MOCK_BATTER = { id: 'p1', name: 'Test Batter' };

var EXPECTED_LGS_KEYS = [
  'game_id', 'team_id', 'inning', 'half_inning', 'outs',
  'balls', 'strikes', 'my_score', 'opponent_score',
  'runners', 'current_batter', 'batting_order_index',
  'runs_this_half', 'opp_runs_this_half', 'updated_at',
  'opp_balls', 'opp_strikes',
  'opp_current_batter_number', 'opp_current_batter_pitches',
  'opp_inning_pitches', 'opp_game_pitches',
].sort();

// ── Mocks ─────────────────────────────────────────────────────────────────────

var mocks = vi.hoisted(function() {
  // live_game_state builder — upsert spy is the primary assertion target
  var lgsUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
  var lgsBuilder = {
    select: vi.fn(), eq: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert:  lgsUpsert,
  };
  lgsBuilder.select.mockReturnValue(lgsBuilder);
  lgsBuilder.eq.mockReturnValue(lgsBuilder);

  // game_scoring_sessions builder — upsert resolving without error lets
  // claimScorerLock's .then() callback fire and set isScorerRef = true
  var sessUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
  var sessBuilder = {
    select: vi.fn(), eq: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert:  sessUpsert,
    delete:  vi.fn(),
  };
  sessBuilder.select.mockReturnValue(sessBuilder);
  sessBuilder.eq.mockReturnValue(sessBuilder);
  sessBuilder.delete.mockReturnValue(sessBuilder);

  // scoring_audit_log — fire-and-forget, no assertions needed
  var auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });
  var auditBuilder = { insert: auditInsert };

  var channelObj = { on: vi.fn(), subscribe: vi.fn() };
  channelObj.on.mockReturnValue(channelObj);
  channelObj.subscribe.mockReturnValue(channelObj);

  var client = {
    from:          vi.fn(),
    channel:       vi.fn().mockReturnValue(channelObj),
    removeChannel: vi.fn(),
  };
  client.from.mockImplementation(function(table) {
    if (table === 'live_game_state')      return lgsBuilder;
    if (table === 'game_scoring_sessions') return sessBuilder;
    return auditBuilder; // scoring_audit_log
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

// ── Test helpers ──────────────────────────────────────────────────────────────

function hookParams(overrides) {
  return Object.assign(
    { gameId: 'g1', teamId: 't1', isEnabled: true, team: MOCK_TEAM },
    overrides || {}
  );
}

// Mount hook and claim scorer lock (sets isScorerRef = true via mock promise resolution).
async function mountAndClaim(params) {
  var h = await renderHook(function() {
    return useLiveScoring(params || hookParams());
  });
  await act(async function() {
    h.result.current.claimScorerLock();
  });
  return h;
}

// Mount, claim, then open an at-bat (required for recordPitch to fire).
async function mountClaimAndOpen(params, batter) {
  var h = await mountAndClaim(params);
  await act(async function() {
    h.result.current.startAtBat(batter || MOCK_BATTER, false);
  });
  return h;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('live_game_state MERGE contract', function() {

  beforeEach(function() {
    vi.clearAllMocks();
    // Fake timers prevent the heartbeat setInterval from firing mid-test
    // and interfering with sessUpsert call counts.
    vi.useFakeTimers();
    // Restore chainable implementations after call-history reset
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
      if (table === 'live_game_state')      return mocks.lgsBuilder;
      if (table === 'game_scoring_sessions') return mocks.sessBuilder;
      return mocks.auditBuilder;
    });
  });

  afterEach(function() {
    vi.useRealTimers();
  });

  // ── Case 1: persist() full-row invariant ───────────────────────────────────
  it('1: persist() full-row invariant — recordPitch upserts exactly 15 expected column keys', async function() {
    var h = await mountClaimAndOpen();
    mocks.lgsUpsert.mockClear();

    await act(async function() {
      h.result.current.recordPitch('ball');
    });

    expect(mocks.lgsUpsert).toHaveBeenCalledTimes(1);
    var payload = mocks.lgsUpsert.mock.calls[0][0];
    expect(Object.keys(payload).sort()).toEqual(EXPECTED_LGS_KEYS);

    await h.unmount();
  });

  // ── Case 2: runners jsonb integrity ───────────────────────────────────────
  it('2: runners jsonb integrity — persist payload.runners is an Array, not a string', async function() {
    var h = await mountClaimAndOpen();
    mocks.lgsUpsert.mockClear();

    await act(async function() {
      h.result.current.recordPitch('ball');
    });

    var payload = mocks.lgsUpsert.mock.calls[0][0];
    expect(Array.isArray(payload.runners)).toBe(true);

    await h.unmount();
  });

  // ── Case 3: current_batter jsonb integrity ────────────────────────────────
  it('3: current_batter jsonb integrity — persist payload.current_batter is object or null, not string', async function() {
    var h = await mountClaimAndOpen();
    mocks.lgsUpsert.mockClear();

    await act(async function() {
      h.result.current.recordPitch('ball');
    });

    var payload = mocks.lgsUpsert.mock.calls[0][0];
    // typeof null === 'object', typeof {...} === 'object' — both valid, neither is 'string'
    expect(typeof payload.current_batter === 'object').toBe(true);

    await h.unmount();
  });

  // ── Case 4: addManualRun('us') write shape ────────────────────────────────
  it("4: addManualRun('us') — my_score and runs_this_half increment; inning/runners/current_batter preserved", async function() {
    // Pre-populate known state via the mount-time hydration read
    mocks.lgsBuilder.single.mockResolvedValueOnce({
      data: {
        inning: 1, half_inning: 'top', outs: 0, balls: 0, strikes: 0,
        my_score: 3, opponent_score: 1,
        runners: [{ runnerId: 'p1', base: 2 }], current_batter: null,
        batting_order_index: 2, runs_this_half: 1, opp_runs_this_half: 0,
      },
      error: null,
    });

    var h = await mountAndClaim();
    mocks.lgsUpsert.mockClear(); // discard seed upsert from claimScorerLock

    await act(async function() {
      h.result.current.addManualRun('us');
    });

    var payload = mocks.lgsUpsert.mock.calls[0][0];
    expect(payload.my_score).toBe(4);
    expect(payload.runs_this_half).toBe(2);
    // Peer fields must be preserved (the April-regression pattern)
    expect(payload.inning).toBe(1);
    expect(payload.runners).toEqual([{ runnerId: 'p1', base: 2 }]);
    expect(payload.current_batter).toBeNull();

    await h.unmount();
  });

  // ── Case 5: addManualRun('opp') write shape ───────────────────────────────
  it("5: addManualRun('opp') — opponent_score and opp_runs_this_half increment; peer fields preserved", async function() {
    mocks.lgsBuilder.single.mockResolvedValueOnce({
      data: {
        inning: 2, half_inning: 'bottom', outs: 1, balls: 0, strikes: 0,
        my_score: 2, opponent_score: 2,
        runners: [{ runnerId: 'p2', base: 1 }], current_batter: null,
        batting_order_index: 0, runs_this_half: 0, opp_runs_this_half: 1,
      },
      error: null,
    });

    var h = await mountAndClaim();
    mocks.lgsUpsert.mockClear();

    await act(async function() {
      h.result.current.addManualRun('opp');
    });

    var payload = mocks.lgsUpsert.mock.calls[0][0];
    expect(payload.opponent_score).toBe(3);
    expect(payload.opp_runs_this_half).toBe(2);
    // Peer fields preserved
    expect(payload.inning).toBe(2);
    expect(payload.runners).toEqual([{ runnerId: 'p2', base: 1 }]);
    expect(payload.my_score).toBe(2);

    await h.unmount();
  });

  // ── Case 6: Sequential writes don't drop peer fields (ANTI-REGRESSION) ────
  it('6: sequential persist calls — runners and current_batter survive recordPitch then addManualRun', async function() {
    // This is the exact April-regression scenario: two consecutive writes;
    // if either is partial the second would clobber runners/current_batter.
    mocks.lgsBuilder.single.mockResolvedValueOnce({
      data: {
        inning: 1, half_inning: 'top', outs: 0, balls: 0, strikes: 0,
        my_score: 0, opponent_score: 0,
        runners: [{ runnerId: 'p1', base: 1 }], current_batter: null,
        batting_order_index: 0, runs_this_half: 0, opp_runs_this_half: 0,
      },
      error: null,
    });

    var batter = { id: 'p2', name: 'Test' };
    var h = await mountClaimAndOpen(hookParams(), batter);
    mocks.lgsUpsert.mockClear();

    await act(async function() {
      h.result.current.recordPitch('ball');    // persist #1
    });
    await act(async function() {
      h.result.current.addManualRun('us');     // persist #2
    });

    // Assert on the addManualRun upsert (calls[1])
    var payload = mocks.lgsUpsert.mock.calls[1][0];
    expect(payload.runners).toEqual([{ runnerId: 'p1', base: 1 }]);
    expect(payload.current_batter).toEqual(batter);

    await h.unmount();
  });

  // ── Case 7: Seed write shape — locks in commit 08775b9 fixes ──────────────
  it('7: claimScorerLock seed write — runners is plain Array, opp_runs_this_half present', async function() {
    // On mount there are only SELECT calls to live_game_state — no upserts.
    // The seed upsert fires once inside claimScorerLock's success callback.
    var h = await renderHook(function() {
      return useLiveScoring(hookParams());
    });

    await act(async function() {
      h.result.current.claimScorerLock();
    });

    expect(mocks.lgsUpsert).toHaveBeenCalledTimes(1);
    var payload = mocks.lgsUpsert.mock.calls[0][0];
    expect(Array.isArray(payload.runners)).toBe(true);        // not JSON.stringify'd
    expect(payload).toHaveProperty('opp_runs_this_half');     // column present post-fix
    expect(payload.opp_runs_this_half).toBe(0);

    await h.unmount();
  });

  // ── Case 8: Ephemeral state not persisted ──────────────────────────────────
  it('8: ephemeral state — oppBalls/oppStrikes never appear in live_game_state upsert payload', async function() {
    var h = await mountAndClaim();
    mocks.lgsUpsert.mockClear();

    await act(async function() {
      h.result.current.recordOppPitch('ball');
    });

    expect(mocks.lgsUpsert).toHaveBeenCalledTimes(1);
    var payload = mocks.lgsUpsert.mock.calls[0][0];
    // Ephemeral fields — intentionally NOT written to DB
    expect(payload).not.toHaveProperty('oppBalls');
    expect(payload).not.toHaveProperty('oppStrikes');
    expect(payload).not.toHaveProperty('opp_balls');
    expect(payload).not.toHaveProperty('opp_strikes');
    // opp_runs_this_half IS a DB column — must remain present
    expect(payload).toHaveProperty('opp_runs_this_half');

    await h.unmount();
  });

  // ── Cases 9–14: Opponent pitch tracking columns (RED — fail until Step 4b) ─
  // These six tests lock in the new live_game_state columns for opponent pitch
  // tracking. They assert the columns appear in every persist() call so they are
  // never silently dropped by a partial write (the April 2026 regression pattern).
  // NOTE: Tests 9–10 contradict test 8 by design. Test 8 will be updated when
  // persist() is changed in Step 4b to confirm the direction change.

  it('9: opp_balls — persist() writes opp_balls column (not ephemeral)', async function() {
    var h = await mountAndClaim();
    mocks.lgsUpsert.mockClear();

    await act(async function() {
      h.result.current.recordOppPitch('ball');
    });

    expect(mocks.lgsUpsert).toHaveBeenCalledTimes(1);
    var payload = mocks.lgsUpsert.mock.calls[0][0];
    expect(payload).toHaveProperty('opp_balls');

    await h.unmount();
  });

  it('10: opp_strikes — persist() writes opp_strikes column (not ephemeral)', async function() {
    var h = await mountAndClaim();
    mocks.lgsUpsert.mockClear();

    await act(async function() {
      h.result.current.recordOppPitch('strike');
    });

    expect(mocks.lgsUpsert).toHaveBeenCalledTimes(1);
    var payload = mocks.lgsUpsert.mock.calls[0][0];
    expect(payload).toHaveProperty('opp_strikes');

    await h.unmount();
  });

  it('11: opp_current_batter_number — not clobbered by home-team recordPitch', async function() {
    var h = await mountClaimAndOpen();
    mocks.lgsUpsert.mockClear();

    await act(async function() {
      h.result.current.recordPitch('ball');
    });

    expect(mocks.lgsUpsert).toHaveBeenCalledTimes(1);
    var payload = mocks.lgsUpsert.mock.calls[0][0];
    expect(payload).toHaveProperty('opp_current_batter_number');

    await h.unmount();
  });

  it('12: opp_current_batter_pitches — not clobbered by home-team recordPitch', async function() {
    var h = await mountClaimAndOpen();
    mocks.lgsUpsert.mockClear();

    await act(async function() {
      h.result.current.recordPitch('ball');
    });

    expect(mocks.lgsUpsert).toHaveBeenCalledTimes(1);
    var payload = mocks.lgsUpsert.mock.calls[0][0];
    expect(payload).toHaveProperty('opp_current_batter_pitches');

    await h.unmount();
  });

  it('13: opp_inning_pitches — not clobbered by addManualRun()', async function() {
    var h = await mountAndClaim();
    mocks.lgsUpsert.mockClear();

    await act(async function() {
      h.result.current.addManualRun('us');
    });

    expect(mocks.lgsUpsert).toHaveBeenCalledTimes(1);
    var payload = mocks.lgsUpsert.mock.calls[0][0];
    expect(payload).toHaveProperty('opp_inning_pitches');

    await h.unmount();
  });

  it('14: opp_game_pitches — not clobbered by addManualRun()', async function() {
    var h = await mountAndClaim();
    mocks.lgsUpsert.mockClear();

    await act(async function() {
      h.result.current.addManualRun('us');
    });

    expect(mocks.lgsUpsert).toHaveBeenCalledTimes(1);
    var payload = mocks.lgsUpsert.mock.calls[0][0];
    expect(payload).toHaveProperty('opp_game_pitches');

    await h.unmount();
  });

});
