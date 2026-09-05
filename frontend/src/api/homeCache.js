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

import { createPrivateReadModelCache } from './privateReadModelCache.js';

const FRESH_WINDOW_MS = 60 * 1000;
const STALE_WINDOW_MS = 24 * 60 * 60 * 1000;
const cache = createPrivateReadModelCache({
  keyPrefix: 'api:home:',
  freshWindowMs: FRESH_WINDOW_MS,
  staleWindowMs: STALE_WINDOW_MS,
});

/**
 * @param {string} userId
 * @param {object} response - a parsed GET /api/v1/home response body
 * @param {object} [opts]
 * @param {Storage} [opts.storage]
 */
export function setHomeCache(userId, response, opts = {}) {
  cache.set(userId, response, opts);
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
  return cache.get(userId, opts);
}

/**
 * @param {string} userId
 * @param {object} [opts]
 */
export function clearHomeCache(userId, opts = {}) {
  cache.clear(userId, opts);
}

/**
 * Clears every user's Home cache entry — used on logout when the
 * departing user's ID may not be in scope at the call site, or as a
 * blanket invalidation. Leaves unrelated localStorage keys untouched.
 * @param {object} [opts]
 */
export function clearAllHomeCaches(opts = {}) {
  cache.clearAll(opts);
}
