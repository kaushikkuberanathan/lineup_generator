/**
 * useLiveScore.contract.test.js
 *
 * CONTRACT test — locks in that useLiveScore is:
 *   - Read-only (no write methods on return object, no DB writes)
 *   - Safe for unauthenticated share-link viewers
 *   - Properly scoped per game/team (no cross-contamination)
 *   - Cleans up its single Realtime channel on unmount
 *
 * Architecture note confirmed in Step 1 audit:
 *   ONE channel is created with TWO .on() listeners (one per table).
 *   removeChannel() is called ONCE on unmount.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from './helpers/renderHook.js';

// ── Supabase mock ─────────────────────────────────────────────────────────────
// vi.hoisted runs before ES module imports so that vi.mock can reference these
// spies and tests can assert on them directly.
var mocks = vi.hoisted(function() {
  var single = vi.fn().mockResolvedValue({ data: null, error: null });

  var queryBuilder = {
    select: vi.fn(),
    eq:     vi.fn(),
    single: single,
    // Write methods — included so we can assert they're NEVER called (case 5)
    insert:   vi.fn().mockResolvedValue({ data: null, error: null }),
    update:   vi.fn().mockResolvedValue({ data: null, error: null }),
    'delete': vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert:   vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.eq.mockReturnValue(queryBuilder);

  var channelObj = {
    on:        vi.fn(),
    subscribe: vi.fn(),
  };
  channelObj.on.mockReturnValue(channelObj);
  // subscribe() must return the channel — hook stores the return value in chanRef
  channelObj.subscribe.mockReturnValue(channelObj);

  var client = {
    from:          vi.fn().mockReturnValue(queryBuilder),
    channel:       vi.fn().mockReturnValue(channelObj),
    removeChannel: vi.fn(),
  };

  return { client: client, queryBuilder: queryBuilder, channelObj: channelObj };
});

vi.mock('../supabase', function() {
  return { supabase: mocks.client };
});

import { useLiveScore } from '../hooks/useLiveScore.js';

// ── Constants ─────────────────────────────────────────────────────────────────
var EXPECTED_KEYS = [
  'myScore', 'opponentScore', 'inning', 'halfInning', 'outs',
  'balls', 'strikes', 'runners', 'currentBatter', 'isLive',
  'scorerName', 'lastUpdated',
].sort();

var WRITE_METHODS = [
  'recordPitch', 'claimScorerLock', 'releaseScorerLock', 'endAtBat',
  'undoLastPitch', 'setScore', 'resolveAtBat', 'advanceInning', 'addManualRun',
];

// ── isLive threshold (confirmed: 60,000 ms) ───────────────────────────────────
var FRESHNESS_THRESHOLD_MS = 60000;

// ── Suite ─────────────────────────────────────────────────────────────────────
describe('useLiveScore — contract', function() {

  beforeEach(function() {
    vi.clearAllMocks();
    // Restore chainable implementations after call-history reset
    mocks.queryBuilder.select.mockReturnValue(mocks.queryBuilder);
    mocks.queryBuilder.eq.mockReturnValue(mocks.queryBuilder);
    mocks.queryBuilder.single.mockResolvedValue({ data: null, error: null });
    mocks.channelObj.on.mockReturnValue(mocks.channelObj);
    mocks.channelObj.subscribe.mockReturnValue(mocks.channelObj);
    mocks.client.from.mockReturnValue(mocks.queryBuilder);
    mocks.client.channel.mockReturnValue(mocks.channelObj);
  });

  // ── Case 1: Return shape ────────────────────────────────────────────────────
  it('1: return shape — exactly 12 expected keys, no write methods exposed', async function() {
    var h = await renderHook(function() {
      return useLiveScore({ gameId: 'g1', teamId: 't1', isEnabled: false });
    });

    expect(Object.keys(h.result.current).sort()).toEqual(EXPECTED_KEYS);

    WRITE_METHODS.forEach(function(method) {
      expect(h.result.current).not.toHaveProperty(method);
    });

    await h.unmount();
  });

  // ── Case 2: isEnabled: false ────────────────────────────────────────────────
  it('2: isEnabled: false — zero Supabase calls, all-default state returned', async function() {
    var h = await renderHook(function() {
      return useLiveScore({ gameId: 'g1', teamId: 't1', isEnabled: false });
    });

    expect(mocks.client.from).not.toHaveBeenCalled();
    expect(mocks.client.channel).not.toHaveBeenCalled();

    var s = h.result.current;
    expect(s.myScore).toBe(0);
    expect(s.opponentScore).toBe(0);
    expect(s.inning).toBe(1);
    expect(s.halfInning).toBe('top');
    expect(s.outs).toBe(0);
    expect(s.balls).toBe(0);
    expect(s.strikes).toBe(0);
    expect(s.runners).toEqual([]);
    expect(s.currentBatter).toBeNull();
    expect(s.isLive).toBe(false);
    expect(s.scorerName).toBeNull();
    expect(s.lastUpdated).toBeNull();

    await h.unmount();
  });

  // ── Case 3: Subscribe shape ─────────────────────────────────────────────────
  it('3: isEnabled: true on mount — .channel() once, two .on() listeners, one .subscribe()', async function() {
    var h = await renderHook(function() {
      return useLiveScore({ gameId: 'g1', teamId: 't1', isEnabled: true });
    });

    expect(mocks.client.channel).toHaveBeenCalledTimes(1);
    expect(mocks.channelObj.on).toHaveBeenCalledTimes(2);
    expect(mocks.channelObj.subscribe).toHaveBeenCalledTimes(1);

    await h.unmount();
  });

  // ── Case 4: Unmount cleanup ─────────────────────────────────────────────────
  it('4: unmount — removeChannel() called exactly once', async function() {
    var h = await renderHook(function() {
      return useLiveScore({ gameId: 'g1', teamId: 't1', isEnabled: true });
    });

    expect(mocks.client.removeChannel).not.toHaveBeenCalled();
    await h.unmount();
    expect(mocks.client.removeChannel).toHaveBeenCalledTimes(1);
  });

  // ── Case 5: Write contract ──────────────────────────────────────────────────
  it('5: write contract — zero .insert/.update/.delete/.upsert across full lifecycle', async function() {
    var h = await renderHook(function() {
      return useLiveScore({ gameId: 'g1', teamId: 't1', isEnabled: true });
    });
    await h.unmount();

    expect(mocks.queryBuilder.insert).not.toHaveBeenCalled();
    expect(mocks.queryBuilder.update).not.toHaveBeenCalled();
    expect(mocks.queryBuilder['delete']).not.toHaveBeenCalled();
    expect(mocks.queryBuilder.upsert).not.toHaveBeenCalled();
  });

  // ── Case 6: isLive boundary ─────────────────────────────────────────────────
  it('6: isLive — 59999ms ago → true; 60001ms ago → false (threshold ' + FRESHNESS_THRESHOLD_MS + 'ms)', async function() {
    vi.useFakeTimers();
    var now = Date.now();

    // — Sub-case A: fresh (59999ms < 60000ms threshold) ──────────────────────
    var freshTs = new Date(now - (FRESHNESS_THRESHOLD_MS - 1)).toISOString();
    // 1st single() → live_game_state (no data); 2nd → game_scoring_sessions
    mocks.queryBuilder.single
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { scorer_name: 'Coach', last_heartbeat: freshTs },
        error: null,
      });

    var hA = await renderHook(function() {
      return useLiveScore({ gameId: 'g1', teamId: 't1', isEnabled: true });
    });
    expect(hA.result.current.isLive).toBe(true);
    await hA.unmount();

    vi.clearAllMocks();
    mocks.queryBuilder.select.mockReturnValue(mocks.queryBuilder);
    mocks.queryBuilder.eq.mockReturnValue(mocks.queryBuilder);
    mocks.channelObj.on.mockReturnValue(mocks.channelObj);
    mocks.channelObj.subscribe.mockReturnValue(mocks.channelObj);
    mocks.client.from.mockReturnValue(mocks.queryBuilder);
    mocks.client.channel.mockReturnValue(mocks.channelObj);

    // — Sub-case B: stale (60001ms > 60000ms threshold) ──────────────────────
    var staleTs = new Date(now - (FRESHNESS_THRESHOLD_MS + 1)).toISOString();
    mocks.queryBuilder.single
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { scorer_name: 'Coach', last_heartbeat: staleTs },
        error: null,
      });

    var hB = await renderHook(function() {
      return useLiveScore({ gameId: 'g2', teamId: 't2', isEnabled: true });
    });
    expect(hB.result.current.isLive).toBe(false);
    await hB.unmount();

    vi.useRealTimers();
  });

  // ── Case 7: Channel filter scoping ─────────────────────────────────────────
  it('7: channel name contains gameId + teamId; different props → different channel names', async function() {
    var hA = await renderHook(function() {
      return useLiveScore({ gameId: 'game-A', teamId: 'team-X', isEnabled: true });
    });
    var nameA = mocks.client.channel.mock.calls[0][0];
    expect(nameA).toContain('game-A');
    expect(nameA).toContain('team-X');
    await hA.unmount();

    vi.clearAllMocks();
    mocks.queryBuilder.select.mockReturnValue(mocks.queryBuilder);
    mocks.queryBuilder.eq.mockReturnValue(mocks.queryBuilder);
    mocks.channelObj.on.mockReturnValue(mocks.channelObj);
    mocks.channelObj.subscribe.mockReturnValue(mocks.channelObj);
    mocks.client.from.mockReturnValue(mocks.queryBuilder);
    mocks.client.channel.mockReturnValue(mocks.channelObj);

    var hB = await renderHook(function() {
      return useLiveScore({ gameId: 'game-B', teamId: 'team-Y', isEnabled: true });
    });
    var nameB = mocks.client.channel.mock.calls[0][0];
    expect(nameB).toContain('game-B');
    expect(nameB).toContain('team-Y');
    expect(nameB).not.toBe(nameA);
    await hB.unmount();
  });

});
