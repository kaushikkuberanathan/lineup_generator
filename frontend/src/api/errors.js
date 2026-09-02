/**
 * errors.js — standard error envelope parsing and retry classification.
 * Story #1026. Mirrors docs/product/API_DRIVEN_ARCHITECTURE_REDESIGN.md
 * section 25.1 (envelope shape, stable codes) and 25.2 ("Retry GET/HEAD at
 * most twice for network failure, 429, 503, or 504" — note 500 is
 * deliberately NOT in that list; a plain 500 is not auto-retried).
 */

export class ApiError extends Error {
  constructor({ status, code, message, requestId, retryable }) {
    super(message || 'Request failed.');
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.retryable = !!retryable;
  }
}

const RETRYABLE_STATUSES = new Set([429, 503, 504]);

/** Section 25.2's explicit auto-retry list — 500 is intentionally excluded. */
export function isRetryableStatus(status) {
  return RETRYABLE_STATUSES.has(status);
}

const DEFAULT_CODE_BY_STATUS = {
  400: 'VALIDATION_FAILED',
  401: 'AUTH_REQUIRED',
  403: 'TEAM_ACCESS_DENIED',
  404: 'RESOURCE_NOT_FOUND',
  409: 'STATE_CONFLICT',
  412: 'REVISION_STALE',
  422: 'DOMAIN_RULE_FAILED',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  503: 'SERVICE_UNAVAILABLE',
  504: 'UPSTREAM_TIMEOUT',
};

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

/**
 * @param {number} status
 * @param {object|null} bodyJson - parsed response body, or null if it
 *   couldn't be parsed as JSON at all
 * @param {string} fallbackRequestId - the client's own generated/sent
 *   X-Request-ID, used when the envelope doesn't echo one back
 * @returns {ApiError}
 */
export function buildApiErrorFromResponse(status, bodyJson, fallbackRequestId) {
  const envelope = bodyJson && typeof bodyJson.error === 'object' && bodyJson.error !== null
    ? bodyJson.error
    : null;

  const code = (envelope && typeof envelope.code === 'string' && envelope.code) || DEFAULT_CODE_BY_STATUS[status] || 'UNKNOWN_ERROR';
  const message = (envelope && typeof envelope.message === 'string' && envelope.message) || DEFAULT_MESSAGE;
  const requestId = (envelope && envelope.requestId) || fallbackRequestId || null;
  const retryable = envelope && typeof envelope.retryable === 'boolean'
    ? envelope.retryable
    : isRetryableStatus(status);

  return new ApiError({ status, code, message, requestId, retryable });
}

/** fetch() rejects with a TypeError for a genuine network-level failure. */
export function isNetworkError(err) {
  return err instanceof TypeError;
}
