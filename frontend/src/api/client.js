/**
 * client.js — the reusable authenticated API client (Story #1026).
 *
 * Deliberately narrow per docs/product/API_DRIVEN_ARCHITECTURE_REDESIGN.md
 * section 28: base URL, bearer token, request ID, JSON/error-envelope
 * parsing, deadline/abort, retry classification, ETag support. It does
 * NOT own React rendering, navigation policy, role inference, global
 * state, or a new data-framework dependency — those stay in the calling
 * hook/component (a later Phase 1 wave).
 */
import { ApiError, buildApiErrorFromResponse, isRetryableStatus, isNetworkError } from './errors.js';
import { reportNetworkFailure, reportNetworkSuccess } from '../utils/networkHealth.js';

const DEFAULT_DEADLINE_MS = 5000; // foreground navigation, section 25.2
const SHADOW_DEADLINE_MS = 3000; // shadow reads (API_HOME_SHADOW_READ), section 25.2
const MAX_RETRIES = 2; // "at most twice", section 25.2
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

/**
 * crypto.randomUUID() primary path with a getRandomValues() fallback,
 * mirroring the pattern already used for scorer_local_id generation
 * elsewhere in this app (crypto.getRandomValues, not Math.random, per
 * #650's precedent) — request IDs aren't a security boundary, but
 * matching the app's own established fallback shape costs nothing.
 */
export function generateRequestId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch { /* fall through */ }

  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  } catch { /* fall through */ }

  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultWait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitteredBackoff(attempt) {
  return attempt * 200 + Math.random() * 100;
}

/**
 * Combines the caller's cancellation signal with our own deadline-timeout
 * controller so either one aborts the underlying fetch, without requiring
 * AbortSignal.any() (not universally available in every target runtime).
 */
function mergeSignals(signals) {
  const controller = new AbortController();
  const live = signals.filter(Boolean);
  if (live.some((s) => s.aborted)) {
    controller.abort();
    return controller.signal;
  }
  const onAbort = () => controller.abort();
  live.forEach((s) => s.addEventListener('abort', onAbort, { once: true }));
  return controller.signal;
}

/**
 * @param {object} opts
 * @param {string} opts.baseUrl
 * @param {() => Promise<string|null>} opts.getAccessToken - resolves the
 *   current session's access token, or null when signed out. The client
 *   never reads auth state itself — it's handed the token per call.
 * @param {typeof fetch} [opts.fetchImpl] - injectable for tests
 * @param {(ms:number) => Promise<void>} [opts.waitImpl] - injectable for tests
 */
export function createApiClient({ baseUrl, getAccessToken, fetchImpl, waitImpl }) {
  const doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
  if (!doFetch) throw new Error('createApiClient: no fetch implementation available');
  const wait = waitImpl || defaultWait;

  /**
   * @param {string} path - e.g. '/api/v1/home'
   * @param {object} [options]
   * @param {'GET'} [options.method]
   * @param {AbortSignal} [options.signal] - caller-owned cancellation (e.g. from createGenerationGuard)
   * @param {string} [options.ifNoneMatch]
   * @param {number} [options.deadlineMs] - overrides the default/shadow deadline
   * @param {boolean} [options.isShadow] - use the shorter shadow-read deadline (section 25.2)
   */
  async function request(path, options = {}) {
    const { method = 'GET', signal, ifNoneMatch, deadlineMs, isShadow = false } = options;
    const requestId = generateRequestId();
    const effectiveDeadline = deadlineMs ?? (isShadow ? SHADOW_DEADLINE_MS : DEFAULT_DEADLINE_MS);

    if (signal && signal.aborted) {
      const abortErr = new Error('Request aborted before it started');
      abortErr.name = 'AbortError';
      throw abortErr;
    }

    const token = getAccessToken ? await getAccessToken() : null;

    let attempt = 0;
    for (;;) {
      const timeoutController = new AbortController();
      const timer = setTimeout(() => timeoutController.abort(), effectiveDeadline);
      const combinedSignal = mergeSignals([signal, timeoutController.signal]);

      const headers = { Accept: 'application/json', 'X-Request-ID': requestId };
      if (token) headers.Authorization = `Bearer ${token}`;
      if (ifNoneMatch) headers['If-None-Match'] = ifNoneMatch;

      let response;
      try {
        response = await doFetch(`${baseUrl}${path}`, { method, headers, signal: combinedSignal });
      } catch (err) {
        clearTimeout(timer);

        if (err && err.name === 'AbortError' && signal && signal.aborted) {
          throw err; // caller cancelled — never treated as retryable
        }
        if (timeoutController.signal.aborted) {
          if (attempt < MAX_RETRIES) {
            attempt += 1;
            await wait(jitteredBackoff(attempt));
            continue;
          }
          throw new ApiError({ status: 0, code: 'UPSTREAM_TIMEOUT', message: 'Request timed out.', requestId, retryable: true });
        }
        if (isNetworkError(err)) {
          // #1062: a real network-level failure (not an HTTP error status)
          // — feed it to the shared connectivity signal regardless of
          // whether this attempt still has retry budget left.
          reportNetworkFailure();
          if (attempt < MAX_RETRIES) {
            attempt += 1;
            await wait(jitteredBackoff(attempt));
            continue;
          }
        }
        throw err;
      }
      clearTimeout(timer);

      // Reaching the server at all — any status — proves the network is up.
      reportNetworkSuccess();

      if (response.status === 304) {
        return { notModified: true, requestId, status: 304 };
      }

      if (response.ok) {
        const data = await response.json().catch(() => null);
        const etag = response.headers && response.headers.get ? response.headers.get('ETag') : null;
        return { data, etag, requestId, status: response.status };
      }

      let bodyJson = null;
      try {
        bodyJson = await response.json();
      } catch { /* malformed/empty error body — buildApiErrorFromResponse falls back safely */ }

      const apiError = buildApiErrorFromResponse(response.status, bodyJson, requestId);

      if (apiError.retryable && isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
        const retryAfterHeader = response.headers && response.headers.get ? response.headers.get('Retry-After') : null;
        const retryAfterMs = retryAfterHeader && Number.isFinite(Number(retryAfterHeader)) ? Number(retryAfterHeader) * 1000 : null;
        attempt += 1;
        await wait(retryAfterMs ?? jitteredBackoff(attempt));
        continue;
      }

      throw apiError;
    }
  }

  return { request };
}

/**
 * Rapid team-switch race protection (section 28: "Each request owns an
 * AbortController and monotonically increasing generation... a late Team
 * A response cannot overwrite Team B"). Framework-agnostic: a caller
 * (later Phase 1 wave's Home hook) calls next() before starting a new
 * fetch, passes signal to the client, and checks isCurrent(generation)
 * before applying the result.
 */
export function createGenerationGuard() {
  let generation = 0;
  let currentController = null;

  return {
    next() {
      generation += 1;
      const thisGeneration = generation;
      if (currentController) currentController.abort();
      currentController = new AbortController();
      return {
        generation: thisGeneration,
        signal: currentController.signal,
        isCurrent: (g) => g === generation,
      };
    },
  };
}

export { REQUEST_ID_PATTERN };
