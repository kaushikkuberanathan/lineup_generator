/**
 * api.homeCache.test.js
 * Story #1026 — the private, identity-scoped Home response cache.
 * Section 28: "Local persistence owns resilience, not authority" — these
 * tests focus on scoping (per-user, per-version) and the fresh/stale/
 * unavailable windows, using an injected in-memory storage stub so the
 * test doesn't depend on jsdom's real localStorage semantics.
 */
import { describe, it, expect } from 'vitest';
import { setHomeCache, getHomeCache, clearHomeCache, clearAllHomeCaches } from '../api/homeCache.js';

function memoryStorage() {
  var store = new Map();
  return {
    getItem: function (k) { return store.has(k) ? store.get(k) : null; },
    setItem: function (k, v) { store.set(k, String(v)); },
    removeItem: function (k) { store.delete(k); },
    get length() { return store.size; },
    key: function (i) { return Array.from(store.keys())[i] ?? null; },
  };
}

var SAMPLE_RESPONSE = { version: 1, generatedAt: '2026-09-02T18:00:00Z', requestId: 'r1', defaultTeamId: 't1', teams: [{ id: 't1' }] };

describe('setHomeCache / getHomeCache', function () {
  it('round-trips a stored response for the same user', function () {
    var storage = memoryStorage();
    setHomeCache('user-1', SAMPLE_RESPONSE, { storage: storage });
    var cached = getHomeCache('user-1', { storage: storage });
    expect(cached.response).toEqual(SAMPLE_RESPONSE);
    expect(cached.version).toBe(1);
  });

  it('returns null for a different user — the cache is identity-private', function () {
    var storage = memoryStorage();
    setHomeCache('user-1', SAMPLE_RESPONSE, { storage: storage });
    expect(getHomeCache('user-2', { storage: storage })).toBeNull();
  });

  it('returns null when no entry exists', function () {
    var storage = memoryStorage();
    expect(getHomeCache('user-1', { storage: storage })).toBeNull();
  });

  it('returns null on corrupted JSON rather than throwing', function () {
    var storage = memoryStorage();
    storage.setItem('api:home:user-1', 'not json{{{');
    expect(function () { getHomeCache('user-1', { storage: storage }); }).not.toThrow();
    expect(getHomeCache('user-1', { storage: storage })).toBeNull();
  });

  it('returns null when a contract-version mismatch is requested', function () {
    var storage = memoryStorage();
    setHomeCache('user-1', SAMPLE_RESPONSE, { storage: storage });
    expect(getHomeCache('user-1', { storage: storage, expectedVersion: 2 })).toBeNull();
  });

  it('marks an entry fresh within 60 seconds and stale (but still returned) up to 24 hours', function () {
    var storage = memoryStorage();
    var fetchedAt = new Date('2026-09-02T18:00:00Z');
    setHomeCache('user-1', SAMPLE_RESPONSE, { storage: storage, now: function () { return fetchedAt; } });

    var justAfter = getHomeCache('user-1', { storage: storage, now: function () { return new Date(fetchedAt.getTime() + 30 * 1000); } });
    expect(justAfter.isFresh).toBe(true);
    expect(justAfter.isStale).toBe(false);

    var anHourLater = getHomeCache('user-1', { storage: storage, now: function () { return new Date(fetchedAt.getTime() + 60 * 60 * 1000); } });
    expect(anHourLater.isFresh).toBe(false);
    expect(anHourLater.isStale).toBe(true);
    expect(anHourLater.response).toEqual(SAMPLE_RESPONSE);
  });

  it('an entry older than 24 hours is unavailable, not silently accepted', function () {
    var storage = memoryStorage();
    var fetchedAt = new Date('2026-09-02T18:00:00Z');
    setHomeCache('user-1', SAMPLE_RESPONSE, { storage: storage, now: function () { return fetchedAt; } });
    var next = getHomeCache('user-1', { storage: storage, now: function () { return new Date(fetchedAt.getTime() + 25 * 60 * 60 * 1000); } });
    expect(next).toBeNull();
  });

  it('setHomeCache is a silent no-op when storage.setItem throws (e.g. quota exceeded)', function () {
    var storage = memoryStorage();
    storage.setItem = function () { throw new Error('QuotaExceededError'); };
    expect(function () { setHomeCache('user-1', SAMPLE_RESPONSE, { storage: storage }); }).not.toThrow();
  });
});

describe('clearHomeCache / clearAllHomeCaches', function () {
  it('clearHomeCache removes only the named user\'s entry', function () {
    var storage = memoryStorage();
    setHomeCache('user-1', SAMPLE_RESPONSE, { storage: storage });
    setHomeCache('user-2', SAMPLE_RESPONSE, { storage: storage });
    clearHomeCache('user-1', { storage: storage });
    expect(getHomeCache('user-1', { storage: storage })).toBeNull();
    expect(getHomeCache('user-2', { storage: storage })).not.toBeNull();
  });

  it('clearAllHomeCaches removes every api:home: entry and leaves unrelated keys alone', function () {
    var storage = memoryStorage();
    setHomeCache('user-1', SAMPLE_RESPONSE, { storage: storage });
    setHomeCache('user-2', SAMPLE_RESPONSE, { storage: storage });
    storage.setItem('ui:activeTeam', 'some-team');
    clearAllHomeCaches({ storage: storage });
    expect(getHomeCache('user-1', { storage: storage })).toBeNull();
    expect(getHomeCache('user-2', { storage: storage })).toBeNull();
    expect(storage.getItem('ui:activeTeam')).toBe('some-team');
  });
});
