/** Identity-private Account/session cache boundary (#1134). */
import { createPrivateReadModelCache } from './privateReadModelCache.js';

const cache = createPrivateReadModelCache({
  keyPrefix: 'api:account:',
  freshWindowMs: 60 * 1000,
  staleWindowMs: 24 * 60 * 60 * 1000,
});

export function setAccountCache(userId, response, opts = {}) {
  cache.set(userId, response, opts);
}

export function getAccountCache(userId, opts = {}) {
  return cache.get(userId, opts);
}

export function clearAccountCache(userId, opts = {}) {
  cache.clear(userId, opts);
}

export function clearAllAccountCaches(opts = {}) {
  cache.clearAll(opts);
}
