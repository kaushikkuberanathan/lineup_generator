import { describe, test, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { renderHook, renderHookWithProps } from '../../tests/helpers/renderHook.js';
import { setHomeCache } from '../../api/homeCache.js';

vi.mock('./homeAnalytics.js', function () {
  return {
    trackHomeApiLoaded: vi.fn(),
    trackHomeApiCacheRendered: vi.fn(),
    trackHomeApiFailed: vi.fn(),
    trackHomeTeamExpanded: vi.fn(),
    trackHomeTeamFilterChanged: vi.fn(),
    trackHomeOfflineRendered: vi.fn(),
  };
});

import { useHomeScreen } from './useHomeScreen.js';
import * as homeAnalytics from './homeAnalytics.js';

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

var storage;

beforeEach(function () {
  storage = memoryStorage();
  vi.clearAllMocks();
});

describe('useHomeScreen', function () {
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

describe('useHomeScreen — cache version mismatch (#1031)', function () {
  test('a cached entry from an older contract version is never rendered — treated as absent, not silently accepted', async function () {
    storage.setItem('api:home:user-1', JSON.stringify({
      userId: 'user-1', response: HOME_ONE_TEAM, generatedAt: HOME_ONE_TEAM.generatedAt,
      fetchedAt: new Date().toISOString(), version: 0, // stale contract version
    }));
    var fetchImpl = vi.fn(() => new Promise(function () {})); // never resolves — isolate the cache read
    var { result } = await renderHook(function () {
      return useHomeScreen({ userId: 'user-1', getAccessToken: async () => 't', fetchImpl: fetchImpl, cacheStorage: storage });
    });
    expect(result.current.fromCache).toBe(false);
    expect(result.current.home).toBeNull();
  });
});

describe('useHomeScreen — offline (#1031)', function () {
  test('offline with no cache -> status "offline", no fetch attempted', async function () {
    var fetchImpl = vi.fn();
    var { result } = await renderHook(function () {
      return useHomeScreen({ userId: 'user-1', getAccessToken: async () => 't', isOnline: false, fetchImpl: fetchImpl, cacheStorage: storage });
    });
    expect(result.current.status).toBe('offline');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('offline with a cached snapshot -> status "ready", cached content shown, no fetch attempted', async function () {
    setHomeCache('user-1', HOME_ONE_TEAM, { storage: storage });
    var fetchImpl = vi.fn();
    var { result } = await renderHook(function () {
      return useHomeScreen({ userId: 'user-1', getAccessToken: async () => 't', isOnline: false, fetchImpl: fetchImpl, cacheStorage: storage });
    });
    expect(result.current.status).toBe('ready');
    expect(result.current.fromCache).toBe(true);
    expect(result.current.home).toEqual(HOME_ONE_TEAM);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('reconnecting (isOnline flips false -> true) triggers a revalidation fetch', async function () {
    var fetchImpl = vi.fn(() => jsonResponse(200, HOME_ONE_TEAM, {}));
    var { result, rerenderProps } = await renderHookWithProps(function (props) {
      return useHomeScreen(props);
    }, { userId: 'user-1', getAccessToken: async () => 't', isOnline: false, fetchImpl: fetchImpl, cacheStorage: storage });

    expect(fetchImpl).not.toHaveBeenCalled();
    await rerenderProps({ userId: 'user-1', getAccessToken: async () => 't', isOnline: true, fetchImpl: fetchImpl, cacheStorage: storage });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('ready');
    expect(result.current.home).toEqual(HOME_ONE_TEAM);
  });
});

describe('useHomeScreen — slow/warming backend does not blank cached Home (#1031)', function () {
  test('a fetch failure with a cached snapshot already rendered keeps status "ready", not "error"', async function () {
    setHomeCache('user-1', HOME_ONE_TEAM, { storage: storage });
    var fetchImpl = vi.fn(() => jsonResponse(503, { error: { code: 'SERVICE_UNAVAILABLE', message: 'x', requestId: 'r', retryable: true } }, {}));
    var { result } = await renderHook(function () {
      return useHomeScreen({ userId: 'user-1', getAccessToken: async () => 't', fetchImpl: fetchImpl, waitImpl: async function () {}, cacheStorage: storage });
    });
    expect(result.current.status).toBe('ready');
    expect(result.current.home).toEqual(HOME_ONE_TEAM);
    expect(result.current.error).not.toBeNull();
  });
});

describe('useHomeScreen — access-loss notice (#1031)', function () {
  test('a team disappearing between two real fetches sets justLostAccessTeamId; a team missing on the very FIRST fetch does not (nothing to have lost yet)', async function () {
    var call = 0;
    var fetchImpl = vi.fn(function () {
      call += 1;
      return jsonResponse(200, call === 1 ? HOME_TWO_TEAMS : HOME_ONE_TEAM, {});
    });
    var { result } = await renderHook(function () {
      return useHomeScreen({ userId: 'user-1', getAccessToken: async () => 't', fetchImpl: fetchImpl, cacheStorage: storage });
    });
    expect(result.current.justLostAccessTeamId).toBeNull();

    await act(async function () { result.current.expandTeam('t2'); });
    await act(async function () { await result.current.refetch(); });

    expect(result.current.justLostAccessTeamId).toBe('t2');
    expect(result.current.expandedTeamId).toBe('t1'); // fell back safely, t1's data is untouched

    await act(async function () { result.current.dismissAccessLostNotice(); });
    expect(result.current.justLostAccessTeamId).toBeNull();
  });
});

describe('useHomeScreen — analytics (#1032)', function () {
  test('a fresh (non-cached) successful load fires trackHomeApiLoaded with team count and cache/network state', async function () {
    var fetchImpl = vi.fn(() => jsonResponse(200, HOME_ONE_TEAM, {}));
    await renderHook(function () {
      return useHomeScreen({ userId: 'user-1', getAccessToken: async () => 't', fetchImpl: fetchImpl, cacheStorage: storage });
    });
    expect(homeAnalytics.trackHomeApiLoaded).toHaveBeenCalledWith({ teamCount: 1, cacheState: 'miss', networkState: 'online' });
    expect(homeAnalytics.trackHomeApiCacheRendered).not.toHaveBeenCalled();
  });

  test('a cache-then-network load fires trackHomeApiCacheRendered first', async function () {
    setHomeCache('user-1', HOME_ONE_TEAM, { storage: storage });
    var fetchImpl = vi.fn(() => new Promise(function () {}));
    await renderHook(function () {
      return useHomeScreen({ userId: 'user-1', getAccessToken: async () => 't', fetchImpl: fetchImpl, cacheStorage: storage });
    });
    expect(homeAnalytics.trackHomeApiCacheRendered).toHaveBeenCalledWith({ teamCount: 1, cacheState: 'hit' });
  });

  test('a failure with no cache fires trackHomeApiFailed with the error code and retryable flag', async function () {
    var fetchImpl = vi.fn(() => jsonResponse(503, { error: { code: 'SERVICE_UNAVAILABLE', message: 'x', requestId: 'r', retryable: true } }, {}));
    await renderHook(function () {
      return useHomeScreen({ userId: 'user-1', getAccessToken: async () => 't', fetchImpl: fetchImpl, waitImpl: async function () {}, cacheStorage: storage });
    });
    expect(homeAnalytics.trackHomeApiFailed).toHaveBeenCalledWith({ errorCode: 'SERVICE_UNAVAILABLE', retryable: true, cacheState: 'miss' });
  });

  test('offline with no cache fires trackHomeOfflineRendered', async function () {
    await renderHook(function () {
      return useHomeScreen({ userId: 'user-1', getAccessToken: async () => 't', isOnline: false, fetchImpl: vi.fn(), cacheStorage: storage });
    });
    expect(homeAnalytics.trackHomeOfflineRendered).toHaveBeenCalledWith({ cacheState: 'miss' });
  });

  test('expandTeam fires trackHomeTeamExpanded with the team\'s id and role', async function () {
    var fetchImpl = vi.fn(() => jsonResponse(200, HOME_TWO_TEAMS, {}));
    var { result } = await renderHook(function () {
      return useHomeScreen({ userId: 'user-1', getAccessToken: async () => 't', fetchImpl: fetchImpl, cacheStorage: storage });
    });
    await act(async function () { result.current.expandTeam('t1'); });
    expect(homeAnalytics.trackHomeTeamExpanded).toHaveBeenCalledWith({ teamId: 't1', role: 'admin' });
  });

  test('setViewFilter fires trackHomeTeamFilterChanged', async function () {
    var fetchImpl = vi.fn(() => jsonResponse(200, HOME_ONE_TEAM, {}));
    var { result } = await renderHook(function () {
      return useHomeScreen({ userId: 'user-1', getAccessToken: async () => 't', fetchImpl: fetchImpl, cacheStorage: storage });
    });
    await act(async function () { result.current.setViewFilter('all'); });
    expect(homeAnalytics.trackHomeTeamFilterChanged).toHaveBeenCalledWith({ viewFilter: 'all' });
  });
});

describe('useHomeScreen — initialExpandedTeamId override (#1030, Back returns to the expected team)', function () {
  test('when provided and the team exists in the response, it wins over defaultTeamId on first load', async function () {
    var fetchImpl = vi.fn(() => jsonResponse(200, HOME_TWO_TEAMS, {})); // defaultTeamId is t2
    var { result } = await renderHook(function () {
      return useHomeScreen({ userId: 'user-1', getAccessToken: async () => 't', initialExpandedTeamId: 't1', fetchImpl: fetchImpl, cacheStorage: storage });
    });
    expect(result.current.expandedTeamId).toBe('t1');
  });

  test('when the override team is not in the response, falls back to defaultTeamId rather than pointing at nothing', async function () {
    var fetchImpl = vi.fn(() => jsonResponse(200, HOME_TWO_TEAMS, {}));
    var { result } = await renderHook(function () {
      return useHomeScreen({ userId: 'user-1', getAccessToken: async () => 't', initialExpandedTeamId: 'no-such-team', fetchImpl: fetchImpl, cacheStorage: storage });
    });
    expect(result.current.expandedTeamId).toBe('t2');
  });

  test('omitted -> unchanged behavior, defaultTeamId wins', async function () {
    var fetchImpl = vi.fn(() => jsonResponse(200, HOME_TWO_TEAMS, {}));
    var { result } = await renderHook(function () {
      return useHomeScreen({ userId: 'user-1', getAccessToken: async () => 't', fetchImpl: fetchImpl, cacheStorage: storage });
    });
    expect(result.current.expandedTeamId).toBe('t2');
  });
});

describe('useHomeScreen — getAccessToken must not go stale after mount (App.jsx integration)', function () {
  test('a refetch after getAccessToken changes across a re-render uses the LATEST function, not the one captured at mount', async function () {
    var fetchImpl = vi.fn(() => jsonResponse(200, HOME_ONE_TEAM, {}));
    var { result, rerenderProps } = await renderHookWithProps(function (props) {
      return useHomeScreen(props);
    }, { userId: 'user-1', getAccessToken: async () => null, fetchImpl: fetchImpl, cacheStorage: storage });

    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBeUndefined();

    // Session resolves after mount — a common real sequence (magic-link
    // auth completes asynchronously after the component first renders).
    await rerenderProps({ userId: 'user-1', getAccessToken: async () => 'real-token', fetchImpl: fetchImpl, cacheStorage: storage });
    await act(async function () { await result.current.refetch(); });

    var lastCall = fetchImpl.mock.calls[fetchImpl.mock.calls.length - 1];
    expect(lastCall[1].headers.Authorization).toBe('Bearer real-token');
  });
});
