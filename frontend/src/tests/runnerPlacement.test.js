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
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderHook } from './helpers/renderHook.js';
import { DiamondSVG } from '../components/ScoringMode/LiveScoringPanel.jsx';

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

  // ── Test 4 ───────────────────────────────────────────────────────────────

  it('4: confirmRunnerAdvancement out — outs increments (non-3-out case)', async function() {
    var h = await mountAndClaim();

    // Seed: Ezra on 3B via triple.
    await act(async function() {
      h.result.current.startAtBat(MOCK_EZRA, false);
    });
    await act(async function() {
      h.result.current.resolveAtBat('triple');
    });
    // Sanity: Ezra on 3B, outs still 0.
    expect(
      h.result.current.gameState.runners.some(function(r) {
        return r.runnerId === 'Ezra' && r.base === 3;
      })
    ).toBe(true);
    expect(h.result.current.gameState.outs).toBe(0);

    // Ezra is thrown out at home.
    await act(async function() {
      h.result.current.confirmRunnerAdvancement('Ezra', null, 'out');
    });

    // FAILS RED: confirmRunnerAdvancement 'out' branch removes runner but
    //   never increments outs — newGs write omits outs entirely.
    expect(h.result.current.gameState.outs).toBe(1);
    expect(h.result.current.gameState.runners).toHaveLength(0);
    // Half-inning should NOT have flipped (only 1 out).
    expect(h.result.current.gameState.inning).toBe(1);
    expect(h.result.current.gameState.halfInning).toBe('top');

    await h.unmount();
  });

  // ── Test 5 ───────────────────────────────────────────────────────────────

  it('5: confirmRunnerAdvancement out at 3 outs — triggers half-inning flip', async function() {
    var h = await mountAndClaim();

    // Reach 2 outs via flyouts.
    await act(async function() {
      h.result.current.startAtBat(MOCK_RANVIR, false);
    });
    await act(async function() {
      h.result.current.resolveAtBat('flyout');
    });
    await act(async function() {
      h.result.current.startAtBat(MOCK_RANVIR, false);
    });
    await act(async function() {
      h.result.current.resolveAtBat('flyout');
    });
    expect(h.result.current.gameState.outs).toBe(2);

    // Seed: Ezra on 3B via triple (outs stays 2).
    await act(async function() {
      h.result.current.startAtBat(MOCK_EZRA, false);
    });
    await act(async function() {
      h.result.current.resolveAtBat('triple');
    });
    expect(
      h.result.current.gameState.runners.some(function(r) {
        return r.runnerId === 'Ezra' && r.base === 3;
      })
    ).toBe(true);
    expect(h.result.current.gameState.outs).toBe(2);

    // 3rd out — should flip half-inning.
    await act(async function() {
      h.result.current.confirmRunnerAdvancement('Ezra', null, 'out');
    });

    // FAILS RED: outs stays at 2, no half-flip happens.
    expect(h.result.current.gameState.outs).toBe(0);
    expect(h.result.current.gameState.halfInning).toBe('bottom');
    expect(h.result.current.gameState.inning).toBe(1);
    expect(h.result.current.gameState.runners).toHaveLength(0);
    expect(h.result.current.gameState.balls).toBe(0);
    expect(h.result.current.gameState.strikes).toBe(0);
    expect(h.result.current.gameState.runsThisHalf).toBe(0);

    await h.unmount();
  });

});

// ── DiamondSVG layout contract ─────────────────────────────────────────────────

async function renderDiamond(runners, battingOrder) {
  var container = document.createElement('div');
  document.body.appendChild(container);
  var root = createRoot(container);
  await act(async function() {
    root.render(createElement(DiamondSVG, { runners: runners, battingOrder: battingOrder }));
  });
  return {
    container: container,
    unmount: async function() {
      await act(async function() { root.unmount(); });
      if (container.parentNode) { container.parentNode.removeChild(container); }
    },
  };
}

describe('DiamondSVG — overlay layout contract', function() {

  // ── Test 6 ───────────────────────────────────────────────────────────────

  it('6: runner on 1B — pill has data-base="1", shows "1B Ranvir", no flex-row-container', async function() {
    var runners      = [{ runnerId: 'Ranvir', base: 1 }];
    var battingOrder = [{ id: 'Ranvir', name: 'Ranvir X' }];
    var h = await renderDiamond(runners, battingOrder);

    // FAILS RED: current code has no data-base attribute on pills
    var pill = h.container.querySelector('[data-base="1"]');
    expect(pill).not.toBeNull();
    expect(pill.textContent).toContain('Ranvir');

    // FAILS RED: old flex-row-container still exists in current code
    expect(h.container.querySelector('[data-testid="runner-pills-row"]')).toBeNull();

    await h.unmount();
  });

  // ── Test 7 ───────────────────────────────────────────────────────────────

  it('7: only 1B occupied — no pills for 2B or 3B', async function() {
    var runners      = [{ runnerId: 'Ranvir', base: 1 }];
    var battingOrder = [{ id: 'Ranvir', name: 'Ranvir X' }];
    var h = await renderDiamond(runners, battingOrder);

    // FAILS RED: data-base="1" pill does not exist in current code
    expect(h.container.querySelector('[data-base="1"]')).not.toBeNull();
    expect(h.container.querySelector('[data-base="2"]')).toBeNull();
    expect(h.container.querySelector('[data-base="3"]')).toBeNull();

    await h.unmount();
  });

  // ── Test 8 ───────────────────────────────────────────────────────────────

  it('8: all three bases occupied — three pills with correct data-base and names', async function() {
    var runners = [
      { runnerId: 'Ranvir',  base: 1 },
      { runnerId: 'Eshaan',  base: 2 },
      { runnerId: 'Jackson', base: 3 },
    ];
    var battingOrder = [
      { id: 'Ranvir',  name: 'Ranvir X' },
      { id: 'Eshaan',  name: 'Eshaan Y' },
      { id: 'Jackson', name: 'Jackson Z' },
    ];
    var h = await renderDiamond(runners, battingOrder);

    // FAILS RED: no data-base attributes on pills in current code
    var p1 = h.container.querySelector('[data-base="1"]');
    var p2 = h.container.querySelector('[data-base="2"]');
    var p3 = h.container.querySelector('[data-base="3"]');
    expect(p1).not.toBeNull();
    expect(p2).not.toBeNull();
    expect(p3).not.toBeNull();
    expect(p1.textContent).toContain('Ranvir');
    expect(p2.textContent).toContain('Eshaan');
    expect(p3.textContent).toContain('Jackson');

    await h.unmount();
  });

});
