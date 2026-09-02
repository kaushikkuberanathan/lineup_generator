/**
 * homeCache.js — the private, identity-scoped Home response cache
 * (Story #1026). Implements section 28's stale-while-revalidate contract:
 * a matching private snapshot renders immediately with generatedAt/
 * fetchedAt/version/stale-status; a 60s fresh window and a 24h stale
 * display window, after which the snapshot is unavailable rather than
 * silently accepted.
 *
 * This module never grants capabilities or route authority — it is pure
 * storage of the last successful GET /api/v1/home response, scoped by
 * authenticated user ID so one device's multi-account use can never leak
 * a snapshot across identities.
 */

const CACHE_KEY_PREFIX = 'api:home:';
const FRESH_WINDOW_MS = 60 * 1000;
const STALE_WINDOW_MS = 24 * 60 * 60 * 1000;

function cacheKey(userId) {
  return `${CACHE_KEY_PREFIX}${userId}`;
}

function defaultStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch { /* private-browsing storage access can throw */ }
  // Non-browser or storage-denied environment: an in-memory stand-in so
  // this module never throws at call time. Not shared across calls in
  // that case — resilience degrades to "no cache," which is safe.
  const mem = new Map();
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
    get length() { return mem.size; },
    key: (i) => Array.from(mem.keys())[i] ?? null,
  };
}

/**
 * @param {string} userId
 * @param {object} response - a parsed GET /api/v1/home response body
 * @param {object} [opts]
 * @param {Storage} [opts.storage]
 */
export function setHomeCache(userId, response, opts = {}) {
  if (!userId || !response) return;
  const storage = opts.storage || defaultStorage();
  const now = opts.now || (() => new Date());
  const entry = {
    userId,
    response,
    generatedAt: response.generatedAt ?? null,
    fetchedAt: now().toISOString(),
    version: response.version,
  };
  try {
    storage.setItem(cacheKey(userId), JSON.stringify(entry));
  } catch {
    // Storage full/unavailable — cache is resilience, not authority; a
    // failed write just means the next load falls back to a live fetch.
  }
}

/**
 * @param {string} userId
 * @param {object} [opts]
 * @param {Storage} [opts.storage]
 * @param {() => Date} [opts.now]
 * @param {number} [opts.expectedVersion] - reject the cached entry if its
 *   contract version doesn't match (section 25.4: "contract-version
 *   mismatch... invalidate it")
 * @returns {null | (object & {isFresh: boolean, isStale: boolean, ageMs: number})}
 */
export function getHomeCache(userId, opts = {}) {
  if (!userId) return null;
  const storage = opts.storage || defaultStorage();
  const now = opts.now || (() => new Date());

  let raw;
  try {
    raw = storage.getItem(cacheKey(userId));
  } catch {
    return null;
  }
  if (!raw) return null;

  let entry;
  try {
    entry = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!entry || entry.userId !== userId) return null;
  if (opts.expectedVersion !== undefined && entry.version !== opts.expectedVersion) return null;

  const fetchedAtMs = Date.parse(entry.fetchedAt);
  if (!Number.isFinite(fetchedAtMs)) return null;

  const ageMs = now().getTime() - fetchedAtMs;
  if (ageMs > STALE_WINDOW_MS) return null; // unavailable, not silently accepted

  return {
    ...entry,
    isFresh: ageMs <= FRESH_WINDOW_MS,
    isStale: ageMs > FRESH_WINDOW_MS,
    ageMs,
  };
}

/**
 * @param {string} userId
 * @param {object} [opts]
 */
export function clearHomeCache(userId, opts = {}) {
  if (!userId) return;
  const storage = opts.storage || defaultStorage();
  try {
    storage.removeItem(cacheKey(userId));
  } catch { /* nothing to clear if storage is already unavailable */ }
}

/**
 * Clears every user's Home cache entry — used on logout when the
 * departing user's ID may not be in scope at the call site, or as a
 * blanket invalidation. Leaves unrelated localStorage keys untouched.
 * @param {object} [opts]
 */
export function clearAllHomeCaches(opts = {}) {
  const storage = opts.storage || defaultStorage();
  try {
    const keys = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
  } catch { /* best-effort */ }
}
