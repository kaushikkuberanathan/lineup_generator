/**
 * home.js — typed endpoint module for GET /api/v1/home (Story #1026).
 * Thin by design: the real behavior (auth, retry, ETag, cancellation)
 * lives in client.js and is exercised by its own tests.
 */

/**
 * @param {{request: Function}} client - from createApiClient()
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @param {string} [options.ifNoneMatch]
 * @param {boolean} [options.isShadow] - true for API_HOME_SHADOW_READ comparisons
 */
export function fetchHome(client, options = {}) {
  const { signal, ifNoneMatch, isShadow } = options;
  return client.request('/api/v1/home', { method: 'GET', signal, ifNoneMatch, isShadow });
}
