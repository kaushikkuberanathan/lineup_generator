import { describe, test, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { renderHook } from '../../tests/helpers/renderHook.js';
import { useHomeScreen } from './useHomeScreen.js';
import { setHomeCache } from '../../api/homeCache.js';

function memoryStorage() {
  var store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    get length() { return store.size; },
    key: (i) => Array.from(store.keys())[i] ?? null,
  };
}

function jsonResponse(status, body, headers) {
  var h = new Headers(headers || {});
  return Promise.resolve({ status: status, ok: status >= 200 && status < 300, headers: h, json: () => Promise.resolve(body) });
}

var HOME_ONE_TEAM = {
  version: 1, generatedAt: '2026-09-02T18:00:00Z', requestId: 'r1', defaultTeamId: 't1',
  teams: [{ id: 't1', name: 'Mud Hens', displayName: 'Mud Hens', season: 'Fall', year: 2026, ageGroup: '8U', role: { code: 'admin', label: 'x' }, nextEvent: null, readiness: { rosterCount: 0, confirmedCount: 0, lineupStatus: 'none', lineupId: null }, actions: [] }],
};

var HOME_TWO_TEAMS = {
  version: 1, generatedAt: '2026-09-02T18:00:00Z', requestId: 'r2', defaultTeamId: 't2',
  teams: [
    { id: 't1', name: 'Mud Hens', displayName: 'Mud Hens', season: 'Fall', year: 2026, ageGroup: '8U', role: { code: 'admin', label: 'x' }, nextEvent: null, readiness: { rosterCount: 0, confirmedCount: 0, lineupStatus: 'none', lineupId: null }, actions: [] },
    { id: 't2', name: 'Knights', displayName: 'Knights', season: 'Fall', year: 2026, ageGroup: '10U', role: { code: 'coach', label: 'x' }, nextEvent: null, readiness: { rosterCount: 0, confirmedCount: 0, lineupStatus: 'none', lineupId: null }, actions: [] },
  ],
};

describe('useHomeScreen', function () {
  var storage;

  beforeEach(function () {
    storage = memoryStorage();
  });

  test('no userId -> status ready immediately with no fetch', async function () {
    var fetchImpl = vi.fn();
    var { result } = await renderHook(function () {
      return useHomeScreen({ userId: null, getAccessToken: async () => 't', fetchImpl: fetchImpl, cacheStorage: storage });
    });
    expect(result.current.status).toBe('ready');
    expect(result.current.home).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('a successful fetch sets status ready, stores the response, and initializes expandedTeamId from defaultTeamId', async function () {
    var fetchImpl = vi.fn(() => jsonResponse(200, HOME_ONE_TEAM, {}));
    var { result } = await renderHook(function () {
      return useHomeScreen({ userId: 'user-1', getAccessToken: async () => 't', fetchImpl: fetchImpl, cacheStorage: storage });
    });
    expect(result.current.status).toBe('ready');
    expect(result.current.home).toEqual(HOME_ONE_TEAM);
    expect(result.current.expandedTeamId).toBe('t1');
  });

  test('a network/server error with no cache available sets status error', async function () {
    var fetchImpl = vi.fn(() => jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'x', requestId: 'r', retryable: false } }, {}));
    var { result } = await renderHook(function () {
      return useHomeScreen({ userId: 'user-1', getAccessToken: async () => 't', fetchImpl: fetchImpl, cacheStorage: storage });
    });
    expect(result.current.status).toBe('error');
    expect(result.current.home).toBeNull();
  });

  test('a cached response renders immediately (fromCache true) while the network request is still resolving', async function () {
    var neverResolves = new Promise(function () {});
    var fetchImpl = vi.fn(() => neverResolves);
    setHomeCache('user-1', HOME_ONE_TEAM, { storage: storage });

    var { result } = await renderHook(function () {
      return useHomeScreen({ userId: 'user-1', getAccessToken: async () => 't', fetchImpl: fetchImpl, cacheStorage: storage });
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.fromCache).toBe(true);
    expect(result.current.home).toEqual(HOME_ONE_TEAM);
  });

  test('expandTeam sets expandedTeamId and switches viewFilter back to "single"', async function () {
    var fetchImpl = vi.fn(() => jsonResponse(200, HOME_TWO_TEAMS, {}));
    var { result } = await renderHook(function () {
      return useHomeScreen({ userId: 'user-1', getAccessToken: async () => 't', fetchImpl: fetchImpl, cacheStorage: storage });
    });
    await act(async function () { result.current.setViewFilter('all'); });
    expect(result.current.viewFilter).toBe('all');
    await act(async function () { result.current.expandTeam('t1'); });
    expect(result.current.expandedTeamId).toBe('t1');
    expect(result.current.viewFilter).toBe('single');
  });

  test('if the previously expanded team disappears from a later fetch, expandedTeamId falls back to the fresh defaultTeamId', async function () {
    var call = 0;
    var fetchImpl = vi.fn(function () {
      call += 1;
      return jsonResponse(200, call === 1 ? HOME_TWO_TEAMS : HOME_ONE_TEAM, {});
    });
    var { result } = await renderHook(function () {
      return useHomeScreen({ userId: 'user-1', getAccessToken: async () => 't', fetchImpl: fetchImpl, cacheStorage: storage });
    });
    await act(async function () { result.current.expandTeam('t2'); });
    expect(result.current.expandedTeamId).toBe('t2');

    await act(async function () { await result.current.refetch(); });
    // t2 no longer exists in HOME_ONE_TEAM's team list — must fall back,
    // never keep pointing at a team the caller can no longer see.
    expect(result.current.expandedTeamId).toBe('t1');
  });

  test('a superseded refetch is discarded — only the latest request\'s data is ever applied (#1029)', async function () {
    var resolvers = [];
    var fetchImpl = vi.fn(function () {
      return new Promise(function (resolve) { resolvers.push(resolve); });
    });
    var { result } = await renderHook(function () {
      return useHomeScreen({ userId: 'user-1', getAccessToken: async () => 't', fetchImpl: fetchImpl, cacheStorage: storage });
    });

    // First request in flight (from the initial load), fire a second
    // (refetch) before it resolves — this must abort/supersede the first.
    var secondRefetchPromise;
    await act(async function () {
      secondRefetchPromise = result.current.refetch();
    });

    expect(resolvers.length).toBe(2);

    // Resolve the STALE (first) request last, with different data, to
    // prove a late-arriving stale response can't win even if it settles
    // after the newer one.
    await act(async function () {
      resolvers[1](await jsonResponse(200, HOME_TWO_TEAMS, {})); // newer request resolves first
      await secondRefetchPromise;
    });
    await act(async function () {
      resolvers[0](await jsonResponse(200, HOME_ONE_TEAM, {})); // stale request resolves after
    });

    expect(result.current.home).toEqual(HOME_TWO_TEAMS);
  });
});
