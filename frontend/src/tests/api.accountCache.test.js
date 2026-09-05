import { describe, it, expect } from 'vitest';
import {
  setAccountCache,
  getAccountCache,
  clearAccountCache,
  clearAllAccountCaches,
} from '../api/accountCache.js';
import { setHomeCache, getHomeCache } from '../api/homeCache.js';

function memoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    get length() { return store.size; },
    key: (index) => Array.from(store.keys())[index] ?? null,
  };
}

const RESPONSE = {
  version: 1,
  generatedAt: '2026-09-05T00:00:00Z',
  requestId: 'account-request',
  identity: { id: 'user-1', email: 'coach@example.com' },
  memberships: [],
  pendingDestination: null,
};

describe('Account private cache (#1134)', () => {
  it('round-trips only for the matching identity and preserves ETag metadata', () => {
    const storage = memoryStorage();
    setAccountCache('user-1', RESPONSE, { storage, etag: '"account-v1"' });
    const cached = getAccountCache('user-1', { storage });
    expect(cached.response).toEqual(RESPONSE);
    expect(cached.etag).toBe('"account-v1"');
    expect(getAccountCache('user-2', { storage })).toBeNull();
  });

  it('rejects contract-version mismatch and corrupt entries', () => {
    const storage = memoryStorage();
    setAccountCache('user-1', RESPONSE, { storage });
    expect(getAccountCache('user-1', { storage, expectedVersion: 2 })).toBeNull();
    storage.setItem('api:account:user-1', 'not-json');
    expect(getAccountCache('user-1', { storage })).toBeNull();
  });

  it('supports fresh, stale offline fallback, and unavailable windows', () => {
    const storage = memoryStorage();
    const fetchedAt = new Date('2026-09-05T00:00:00Z');
    setAccountCache('user-1', RESPONSE, { storage, now: () => fetchedAt });

    const fresh = getAccountCache('user-1', { storage, now: () => new Date(fetchedAt.getTime() + 30_000) });
    expect(fresh.isFresh).toBe(true);
    expect(fresh.isStale).toBe(false);

    const offlineFallback = getAccountCache('user-1', { storage, now: () => new Date(fetchedAt.getTime() + 60 * 60_000) });
    expect(offlineFallback.isFresh).toBe(false);
    expect(offlineFallback.isStale).toBe(true);
    expect(offlineFallback.response).toEqual(RESPONSE);

    const expired = getAccountCache('user-1', { storage, now: () => new Date(fetchedAt.getTime() + 25 * 60 * 60_000) });
    expect(expired).toBeNull();
  });

  it('logout clearing removes every Account identity while preserving Home and unrelated data', () => {
    const storage = memoryStorage();
    setAccountCache('user-1', RESPONSE, { storage });
    setAccountCache('user-2', { ...RESPONSE, identity: { id: 'user-2' } }, { storage });
    setHomeCache('user-1', { version: 1, generatedAt: RESPONSE.generatedAt, teams: [] }, { storage });
    storage.setItem('ui:activeTeam', 'team-1');

    clearAllAccountCaches({ storage });
    expect(getAccountCache('user-1', { storage })).toBeNull();
    expect(getAccountCache('user-2', { storage })).toBeNull();
    expect(getHomeCache('user-1', { storage })).not.toBeNull();
    expect(storage.getItem('ui:activeTeam')).toBe('team-1');
  });

  it('single-identity clearing cannot remove another user', () => {
    const storage = memoryStorage();
    setAccountCache('user-1', RESPONSE, { storage });
    setAccountCache('user-2', { ...RESPONSE, identity: { id: 'user-2' } }, { storage });
    clearAccountCache('user-1', { storage });
    expect(getAccountCache('user-1', { storage })).toBeNull();
    expect(getAccountCache('user-2', { storage })).not.toBeNull();
  });

  it('storage denial and quota failures degrade safely to a cache miss', () => {
    const storage = memoryStorage();
    storage.setItem = () => { throw new Error('QuotaExceededError'); };
    expect(() => setAccountCache('user-1', RESPONSE, { storage })).not.toThrow();
    storage.getItem = () => { throw new Error('SecurityError'); };
    expect(getAccountCache('user-1', { storage })).toBeNull();
  });
});
