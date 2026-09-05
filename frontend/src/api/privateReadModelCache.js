/** Shared identity-private stale-while-revalidate cache boundary (#1134). */
export function createPrivateReadModelCache({ keyPrefix, freshWindowMs, staleWindowMs }) {
  function cacheKey(userId) {
    return `${keyPrefix}${userId}`;
  }

  function defaultStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    } catch { /* storage is resilience only */ }
    const mem = new Map();
    return {
      getItem: (key) => (mem.has(key) ? mem.get(key) : null),
      setItem: (key, value) => mem.set(key, String(value)),
      removeItem: (key) => mem.delete(key),
      get length() { return mem.size; },
      key: (index) => Array.from(mem.keys())[index] ?? null,
    };
  }

  function set(userId, response, opts = {}) {
    if (!userId || !response) return;
    const storage = opts.storage || defaultStorage();
    const now = opts.now || (() => new Date());
    try {
      storage.setItem(cacheKey(userId), JSON.stringify({
        userId,
        response,
        generatedAt: response.generatedAt ?? null,
        fetchedAt: now().toISOString(),
        version: response.version,
        etag: opts.etag ?? null,
      }));
    } catch { /* cache failure must never block the live response */ }
  }

  function get(userId, opts = {}) {
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
    if (ageMs > staleWindowMs) return null;
    return {
      ...entry,
      isFresh: ageMs <= freshWindowMs,
      isStale: ageMs > freshWindowMs,
      ageMs,
    };
  }

  function clear(userId, opts = {}) {
    if (!userId) return;
    const storage = opts.storage || defaultStorage();
    try {
      storage.removeItem(cacheKey(userId));
    } catch { /* best-effort */ }
  }

  function clearAll(opts = {}) {
    const storage = opts.storage || defaultStorage();
    try {
      const keys = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key && key.startsWith(keyPrefix)) keys.push(key);
      }
      keys.forEach((key) => storage.removeItem(key));
    } catch { /* best-effort */ }
  }

  return { set, get, clear, clearAll };
}
