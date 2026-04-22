/**
 * practiceModeIsolation.test.js
 *
 * CONTRACT: Practice mode (isPractice=true in ScoringMode) must produce
 * BOTH of the following:
 *   a) Zero Supabase writes — game_scoring_sessions, live_game_state,
 *      and scoring_audit_log are never touched.
 *   b) Functional local state — claimScorerLock sets isScorer=true,
 *      pitch / outcome / half-inning mutations update gameState in memory.
 *
 * ScoringMode/index.jsx line 86 derives hook params from isPractice:
 *   isEnabled: isEnabled && !isPractice && !!gameId  →  false
 *   gameId:    null  (no game selected)
 * These are the params the helpers below use.
 *
 * RED reason: all 7 tests fail currently because isEnabled=false causes
 * the hook to return an empty no-op shell — isScorer stays false and
 * state never mutates.  Phase 2 adds a local-only practice path to the
 * hook, at which point all 7 tests go GREEN.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { renderHook } from './helpers/renderHook.js';

var MOCK_TEAM   = { id: 'team-test' };
var MOCK_BATTER = { id: 'p1', name: 'Test Batter' };

// ── Mocks ─────────────────────────────────────────────────────────────────────
// Per-table dispatch — same pattern as liveStateMerge.test.js.

var mocks = vi.hoisted(function() {
  var lgsUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
  var lgsBuilder = {
    select: vi.fn(), eq: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert:  lgsUpsert,
  };
  lgsBuilder.select.mockReturnValue(lgsBuilder);
  lgsBuilder.eq.mockReturnValue(lgsBuilder);

  var gssUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
  var gssBuilder = {
    select: vi.fn(), eq: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert:  gssUpsert,
    delete:  vi.fn(),
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
    return auditBuilder; // scoring_audit_log
  });

  return {
    client,
    lgsUpsert, lgsBuilder,
    gssUpsert, gssBuilder,
    auditInsert, auditBuilder,
    channelObj,
  };
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

// Reflects ScoringMode/index.jsx when isPractice=true after Phase 2 fix:
//   isEnabled = liveScoringEnabled && (isPractice || !!gameId) = true
//   isPractice = true, gameId = null (no game selected)
function practiceParams(overrides) {
  return Object.assign(
    { isEnabled: true, isPractice: true, gameId: null, teamId: '1774297491626', team: MOCK_TEAM },
    overrides || {}
  );
}

async function mountPractice(overrides) {
  return renderHook(function() {
    return useLiveScoring(practiceParams(overrides));
  });
}

async function mountAndClaim(overrides) {
  var h = await mountPractice(overrides);
  await act(async function() {
    h.result.current.claimScorerLock();
  });
  return h;
}

async function mountClaimAndOpen(overrides, batter) {
  var h = await mountAndClaim(overrides);
  await act(async function() {
    h.result.current.startAtBat(batter || MOCK_BATTER, false);
  });
  return h;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Practice mode — Supabase isolation contract', function() {

  beforeEach(function() {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Re-wire chainable implementations after clearAllMocks wipes them.
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

  // ── Test 1: lock claim ───────────────────────────────────────────────────────

  it('1: claimScorerLock — zero Supabase calls and isScorer flips to true', async function() {
    var h = await mountPractice();

    await act(async function() {
      h.result.current.claimScorerLock();
    });

    expect(mocks.gssUpsert).not.toHaveBeenCalled();
    expect(mocks.lgsUpsert).not.toHaveBeenCalled();
    expect(mocks.auditInsert).not.toHaveBeenCalled();
    // FAILS RED: empty shell keeps isScorer=false; Phase 2 sets it true locally
    expect(h.result.current.isScorer).toBe(true);

    await h.unmount();
  });

  // ── Test 2: pitch recording ──────────────────────────────────────────────────

  it('2: recordPitch — zero lgsUpsert calls and balls increments to 1', async function() {
    var h = await mountClaimAndOpen();
    mocks.lgsUpsert.mockClear();

    await act(async function() {
      h.result.current.recordPitch('ball');
    });

    expect(mocks.lgsUpsert).not.toHaveBeenCalled();
    // FAILS RED: recordPitch is a no-op in the empty shell; balls stays 0
    expect(h.result.current.gameState.balls).toBe(1);

    await h.unmount();
  });

  // ── Test 3: at-bat resolution ────────────────────────────────────────────────

  it('3: resolveAtBat single — zero lgsUpsert calls and batter placed on 1B', async function() {
    var h = await mountClaimAndOpen();
    mocks.lgsUpsert.mockClear();

    await act(async function() {
      h.result.current.resolveAtBat('single');
    });

    expect(mocks.lgsUpsert).not.toHaveBeenCalled();
    // FAILS RED: resolveAtBat is a no-op in the empty shell; runners stays []
    var on1B = (h.result.current.gameState.runners || []).some(function(r) {
      return r.runnerId === MOCK_BATTER.id && r.base === 1;
    });
    expect(on1B).toBe(true);

    await h.unmount();
  });

  // ── Test 4: half-inning flip ─────────────────────────────────────────────────

  it('4: endHalfInning — zero lgsUpsert calls and half flips from top to bottom', async function() {
    var h = await mountAndClaim();
    mocks.lgsUpsert.mockClear();

    await act(async function() {
      h.result.current.endHalfInning();
    });

    expect(mocks.lgsUpsert).not.toHaveBeenCalled();
    // FAILS RED: endHalfInning is a no-op in the empty shell; halfInning stays 'top'
    expect(h.result.current.gameState.halfInning).toBe('bottom');

    await h.unmount();
  });

  // ── Test 5: heartbeat suppression ───────────────────────────────────────────

  it('5: heartbeat — no gssUpsert fires after 30s and isScorer is true', async function() {
    var h = await mountPractice();

    await act(async function() {
      h.result.current.claimScorerLock();
    });
    mocks.gssUpsert.mockClear();

    await act(async function() {
      vi.advanceTimersByTime(30000);
    });

    expect(mocks.gssUpsert).not.toHaveBeenCalled();
    // FAILS RED: isScorer never becomes true in the empty shell
    expect(h.result.current.isScorer).toBe(true);

    await h.unmount();
  });

  // ── Test 6: no realtime subscription ────────────────────────────────────────

  it('6: realtime subscription — channel() never called and scoring is live', async function() {
    var h = await mountPractice();

    await act(async function() {
      h.result.current.claimScorerLock();
    });

    expect(mocks.client.channel).not.toHaveBeenCalled();
    // FAILS RED: isScorer never becomes true in the empty shell
    expect(h.result.current.isScorer).toBe(true);

    await h.unmount();
  });

  // ── Test 7: opponent pitch path ──────────────────────────────────────────────

  it('7: recordOppPitch — zero lgsUpsert calls and oppBalls increments to 1', async function() {
    var h = await mountAndClaim();
    mocks.lgsUpsert.mockClear();

    await act(async function() {
      h.result.current.recordOppPitch('ball');
    });

    expect(mocks.lgsUpsert).not.toHaveBeenCalled();
    // FAILS RED: recordOppPitch is a no-op in the empty shell; oppBalls stays 0
    expect(h.result.current.oppBalls).toBe(1);

    await h.unmount();
  });

});
