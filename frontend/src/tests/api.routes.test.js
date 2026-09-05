/**
 * api.routes.test.js
 * Story #1027 — canonical route parsing, safe-destination validation,
 * pending-destination persistence across auth redirect, and the pure
 * destination resolver.
 */
import { describe, it, expect } from 'vitest';
import {
  isSafeInternalDestination,
  parseAppRoute,
  buildAppRoute,
  savePendingDestination,
  consumePendingDestination,
  clearPendingDestination,
  identityCanAccessDestination,
  resolveDestination,
} from '../api/routes.js';

function memoryStorage() {
  var store = new Map();
  return {
    getItem: function (k) { return store.has(k) ? store.get(k) : null; },
    setItem: function (k, v) { store.set(k, String(v)); },
    removeItem: function (k) { store.delete(k); },
  };
}

describe('isSafeInternalDestination', function () {
  it('accepts canonical /app paths', function () {
    expect(isSafeInternalDestination('/app')).toBe(true);
    expect(isSafeInternalDestination('/app/teams/t1/roster')).toBe(true);
  });

  it('rejects protocol-relative and external URLs', function () {
    expect(isSafeInternalDestination('//evil.com/app')).toBe(false);
    expect(isSafeInternalDestination('https://evil.com/app')).toBe(false);
    expect(isSafeInternalDestination('http://evil.com')).toBe(false);
  });

  it('rejects a path that does not start with /app', function () {
    expect(isSafeInternalDestination('/admin')).toBe(false);
    expect(isSafeInternalDestination('/')).toBe(false);
  });

  it('rejects an encoded scheme that decodes into an external URL', function () {
    expect(isSafeInternalDestination('/app%2F..%2F..%2Fhttps://evil.com')).toBe(false);
  });

  it('rejects non-string input without throwing', function () {
    expect(isSafeInternalDestination(null)).toBe(false);
    expect(isSafeInternalDestination(undefined)).toBe(false);
    expect(isSafeInternalDestination(42)).toBe(false);
  });

  it('existing unauthenticated share-link routes (?s=, ?share=) are untouched — they never match /app at all', function () {
    expect(isSafeInternalDestination('/?s=abc123')).toBe(false);
    expect(parseAppRoute('/?s=abc123')).toBeNull();
  });
});

describe('identityCanAccessDestination — auth-resume reauthorization (#1135)', function () {
  it('accepts both legacy /auth/me and Account v1 membership shapes', function () {
    var route = parseAppRoute('/app/teams/t1/roster');
    expect(identityCanAccessDestination(route, [{ team_id: 't1' }])).toBe(true);
    expect(identityCanAccessDestination(route, [{ team: { id: 't1' } }])).toBe(true);
  });

  it('rejects a pending destination when a different identity lacks that membership', function () {
    var route = parseAppRoute('/app/teams/t1/roster');
    expect(identityCanAccessDestination(route, [{ team_id: 't2' }])).toBe(false);
    expect(identityCanAccessDestination(route, [])).toBe(false);
  });
});

describe('parseAppRoute / buildAppRoute round-trip', function () {
  var cases = [
    { path: '/app', descriptor: { type: 'home' } },
    { path: '/app/teams/t1', descriptor: { type: 'team', teamId: 't1' } },
    { path: '/app/teams/t1/roster', descriptor: { type: 'roster', teamId: 't1' } },
    { path: '/app/teams/t1/schedule', descriptor: { type: 'schedule', teamId: 't1' } },
    { path: '/app/teams/t1/lineups', descriptor: { type: 'lineups', teamId: 't1' } },
    { path: '/app/teams/t1/lineups/l1', descriptor: { type: 'lineup', teamId: 't1', lineupId: 'l1' } },
    { path: '/app/teams/t1/games/g1', descriptor: { type: 'game', teamId: 't1', gameId: 'g1' } },
    { path: '/app/teams/t1/games/g1/mode', descriptor: { type: 'gameMode', teamId: 't1', gameId: 'g1' } },
    { path: '/app/teams/t1/games/g1/score', descriptor: { type: 'gameScore', teamId: 't1', gameId: 'g1' } },
  ];

  cases.forEach(function (c) {
    it('parses ' + c.path, function () {
      expect(parseAppRoute(c.path)).toEqual(c.descriptor);
    });
    it('builds ' + c.path + ' back from its descriptor', function () {
      expect(buildAppRoute(c.descriptor)).toBe(c.path);
    });
  });

  it('returns null for an unmatched path', function () {
    expect(parseAppRoute('/app/teams/t1/unknown-thing')).toBeNull();
  });

  it('rejects an ID containing path-traversal or unsafe characters', function () {
    expect(parseAppRoute('/app/teams/../etc/passwd')).toBeNull();
    expect(parseAppRoute('/app/teams/t1%2F..%2Fadmin/roster')).toBeNull();
  });
});

describe('pending destination — survives auth redirect/resume', function () {
  it('saves and consumes a safe destination exactly once', function () {
    var storage = memoryStorage();
    expect(savePendingDestination('/app/teams/t1/roster', { storage: storage })).toBe(true);
    expect(consumePendingDestination({ storage: storage })).toBe('/app/teams/t1/roster');
    expect(consumePendingDestination({ storage: storage })).toBeNull();
  });

  it('refuses to save an unsafe destination', function () {
    var storage = memoryStorage();
    expect(savePendingDestination('https://evil.com', { storage: storage })).toBe(false);
    expect(consumePendingDestination({ storage: storage })).toBeNull();
  });

  it('clearPendingDestination discards a saved value without returning it', function () {
    var storage = memoryStorage();
    savePendingDestination('/app/teams/t1', { storage: storage });
    clearPendingDestination({ storage: storage });
    expect(consumePendingDestination({ storage: storage })).toBeNull();
  });
});

describe('resolveDestination', function () {
  var HOME = {
    version: 1,
    defaultTeamId: 't1',
    teams: [
      { id: 't1', name: 'Mud Hens', nextEvent: { id: 'game_1' } },
      { id: 't2', name: 'Knights', nextEvent: null },
    ],
  };

  it('an unauthenticated caller gets status "unauthenticated" with the path preserved as pendingPath', function () {
    var result = resolveDestination({ pathname: '/app/teams/t1/roster', isAuthenticated: false, home: null });
    expect(result).toEqual({ status: 'unauthenticated', pendingPath: '/app/teams/t1/roster' });
  });

  it('an unparseable path returns status "invalid" regardless of auth state', function () {
    expect(resolveDestination({ pathname: '/not-a-real-route', isAuthenticated: true, home: HOME }).status).toBe('invalid');
    expect(resolveDestination({ pathname: '/not-a-real-route', isAuthenticated: false, home: null }).status).toBe('invalid');
  });

  it('authenticated but Home data not yet loaded returns "loading"', function () {
    var result = resolveDestination({ pathname: '/app/teams/t1/roster', isAuthenticated: true, home: null });
    expect(result.status).toBe('loading');
  });

  it('a team the caller is not a member of returns "team_access_denied"', function () {
    var result = resolveDestination({ pathname: '/app/teams/unknown-team/roster', isAuthenticated: true, home: HOME });
    expect(result.status).toBe('team_access_denied');
  });

  it('a game ID that belongs to the requested team resolves successfully', function () {
    var result = resolveDestination({ pathname: '/app/teams/t1/games/game_1/mode', isAuthenticated: true, home: HOME });
    expect(result.status).toBe('resolved');
    expect(result.route.gameId).toBe('game_1');
  });

  it('a cross-team game ID (belongs to a different team) is rejected without revealing which ID exists', function () {
    // game_1 is real, but it belongs to t1 — asking for it under t2 must fail
    // the same way an entirely made-up game ID would.
    var crossTeam = resolveDestination({ pathname: '/app/teams/t2/games/game_1/mode', isAuthenticated: true, home: HOME });
    var madeUp = resolveDestination({ pathname: '/app/teams/t1/games/totally-fake-id/mode', isAuthenticated: true, home: HOME });
    expect(crossTeam.status).toBe('cross_team_denied');
    expect(madeUp.status).toBe('cross_team_denied');
  });

  it('a lineup route is "not_found" — no addressable per-game lineup resource exists in the live schema yet', function () {
    var result = resolveDestination({ pathname: '/app/teams/t1/lineups/anything', isAuthenticated: true, home: HOME });
    expect(result.status).toBe('not_found');
  });

  it('the resolver never accepts or consults any "activeTeamId"-shaped input — the URL is the only team-identity input it takes', function () {
    // Passing an activeTeamId that contradicts the URL must have zero effect
    // on the outcome (section 27.1: "cache/UI state may hydrate the
    // verified route team but may never replace it").
    var withContradiction = resolveDestination({ pathname: '/app/teams/t2/roster', isAuthenticated: true, home: HOME, activeTeamId: 't1' });
    expect(withContradiction.status).toBe('resolved');
    expect(withContradiction.route.teamId).toBe('t2');
  });

  it('the plain team route resolves and carries the matched team summary', function () {
    var result = resolveDestination({ pathname: '/app/teams/t2', isAuthenticated: true, home: HOME });
    expect(result.status).toBe('resolved');
    expect(result.team.id).toBe('t2');
  });
});
