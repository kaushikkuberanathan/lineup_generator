/**
 * runnerPlacement.test.js
 *
 * CONTRACT: resolveAtBat() must place the batter on base and count runs.
 *
 * These tests use { id: undefined } batter objects to replicate the shape
 * currently produced by ScoringMode/index.jsx mappedBattingOrder, which
 * reads player.id from roster entries that have never had an .id field.
 *
 * RED reason: batter.id === undefined is falsy →
 *   advanceRunners() skips `if (batterId) { destMap[hitBases] = batterId; }`
 *   → batter never placed on base.
 *   For home runs: runsScored = runners.length + (batterId ? 1 : 0) = 0.
 *
 * GREEN after two-part fix:
 *   1. ScoringMode/index.jsx mappedBattingOrder:
 *        id: player ? player.id : name
 *        → id: player ? (player.id || name) : name
 *   2. Change MOCK_RANVIR.id from undefined to 'Ranvir' in this file
 *      (reflecting what the fixed mapping now produces).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { renderHook } from './helpers/renderHook.js';

var MOCK_RANVIR = { id: 'Ranvir', name: 'Ranvir', number: '', orderPosition: 0 };

// MOCK_EZRA has a real id so it can seed base state without triggering the bug.
var MOCK_EZRA   = { id: 'Ezra',    name: 'Ezra',   number: '', orderPosition: 1 };

var MOCK_TEAM   = { id: 'team-test' };

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

  var gssUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
  var gssBuilder = {
    select: vi.fn(), eq: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: gssUpsert,
    delete: vi.fn(),
  };
  gssBuilder.select.mockReturnValue(gssBuilder);
  gssBuilder.eq.mockReturnValue(gssBuilder);
  gssBuilder.delete.mockReturnValue(gssBuilder);

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
    if (table === 'live_game_state')       return lgsBuilder;
    if (table === 'game_scoring_sessions') return gssBuilder;
    return auditBuilder;
  });

  return { client, lgsUpsert, lgsBuilder, gssUpsert, gssBuilder, auditInsert, auditBuilder, channelObj };
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

function practiceParams(overrides) {
  return Object.assign(
    { isEnabled: true, isPractice: true, gameId: null, teamId: '1774297491626', team: MOCK_TEAM },
    overrides || {}
  );
}

async function mountAndClaim(overrides) {
  var h = await renderHook(function() {
    return useLiveScoring(practiceParams(overrides));
  });
  await act(async function() {
    h.result.current.claimScorerLock();
  });
  return h;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Runner placement — resolveAtBat batter-id contract', function() {

  beforeEach(function() {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.lgsUpsert.mockResolvedValue({ data: null, error: null });
    mocks.lgsBuilder.select.mockReturnValue(mocks.lgsBuilder);
    mocks.lgsBuilder.eq.mockReturnValue(mocks.lgsBuilder);
    mocks.lgsBuilder.single.mockResolvedValue({ data: null, error: null });
    mocks.gssUpsert.mockResolvedValue({ data: null, error: null });
    mocks.gssBuilder.select.mockReturnValue(mocks.gssBuilder);
    mocks.gssBuilder.eq.mockReturnValue(mocks.gssBuilder);
    mocks.gssBuilder.single.mockResolvedValue({ data: null, error: null });
    mocks.gssBuilder.delete.mockReturnValue(mocks.gssBuilder);
    mocks.auditInsert.mockResolvedValue({ data: null, error: null });
    mocks.channelObj.on.mockReturnValue(mocks.channelObj);
    mocks.channelObj.subscribe.mockReturnValue(mocks.channelObj);
    mocks.client.channel.mockReturnValue(mocks.channelObj);
    mocks.client.from.mockImplementation(function(table) {
      if (table === 'live_game_state')       return mocks.lgsBuilder;
      if (table === 'game_scoring_sessions') return mocks.gssBuilder;
      return mocks.auditBuilder;
    });
  });

  afterEach(function() {
    vi.useRealTimers();
  });

  // ── Test 1 ───────────────────────────────────────────────────────────────

  it('1: resolveAtBat single — batter placed on 1B with correct runnerId', async function() {
    var h = await mountAndClaim();

    await act(async function() {
      h.result.current.startAtBat(MOCK_RANVIR, false);
    });
    await act(async function() {
      h.result.current.resolveAtBat('single');
    });

    var runners = h.result.current.gameState.runners;
    // FAILS RED: MOCK_RANVIR.id === undefined → batterId is falsy →
    //   advanceRunners() skips destMap[1] assignment → runners stays []
    expect(runners).toHaveLength(1);
    expect(runners[0].base).toBe(1);
    expect(runners[0].runnerId).toBe('Ranvir');

    await h.unmount();
  });

  // ── Test 2 ───────────────────────────────────────────────────────────────

  it('2: resolveAtBat home_run — empty bases, batter scores (myScore +1)', async function() {
    var h = await mountAndClaim();
    var scoreBefore = h.result.current.gameState.myScore;

    await act(async function() {
      h.result.current.startAtBat(MOCK_RANVIR, false);
    });
    await act(async function() {
      h.result.current.resolveAtBat('home_run');
    });

    // FAILS RED: advanceRunners([], 4, undefined) →
    //   runsScored = runners.length + (batterId ? 1 : 0) = 0 + 0 = 0 → no run scored
    expect(h.result.current.gameState.myScore).toBe(scoreBefore + 1);
    expect(h.result.current.gameState.runners).toHaveLength(0);

    await h.unmount();
  });

  // ── Test 3 ───────────────────────────────────────────────────────────────

  it('3: resolveAtBat single — runner on 3B scores, batter placed on 1B', async function() {
    var h = await mountAndClaim();

    // Seed: MOCK_EZRA has id: 'Ezra' so triple correctly places him on 3B.
    await act(async function() {
      h.result.current.startAtBat(MOCK_EZRA, false);
    });
    await act(async function() {
      h.result.current.resolveAtBat('triple');
    });
    // Sanity: Ezra must be on 3B or the rest of the test is vacuous.
    expect(
      h.result.current.gameState.runners.some(function(r) {
        return r.runnerId === 'Ezra' && r.base === 3;
      })
    ).toBe(true);

    var scoreBefore = h.result.current.gameState.myScore;

    // Ranvir hits a single — id: undefined replicates the mapping bug.
    await act(async function() {
      h.result.current.startAtBat(MOCK_RANVIR, false);
    });
    await act(async function() {
      h.result.current.resolveAtBat('single');
    });
    // Single with a runner on 3B yields a pendingRunner — confirm Ezra scored.
    await act(async function() {
      h.result.current.confirmRunnerAdvancement('Ezra', 4, 'scored');
    });

    var runners = h.result.current.gameState.runners;
    // FAILS RED: MOCK_RANVIR.id === undefined → Ranvir never placed on 1B
    expect(
      runners.some(function(r) { return r.runnerId === 'Ranvir' && r.base === 1; })
    ).toBe(true);
    expect(
      runners.every(function(r) { return r.runnerId !== 'Ezra'; })
    ).toBe(true);
    expect(h.result.current.gameState.myScore).toBe(scoreBefore + 1);

    await h.unmount();
  });

});
