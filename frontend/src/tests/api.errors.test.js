/**
 * api.errors.test.js
 * Story #1026 — standard error envelope parsing and retry classification
 * per docs/product/API_DRIVEN_ARCHITECTURE_REDESIGN.md section 25.1/25.2.
 */
import { describe, it, expect } from 'vitest';
import { ApiError, buildApiErrorFromResponse, isRetryableStatus, isNetworkError } from '../api/errors.js';

describe('isRetryableStatus', function () {
  it('429, 503, 504 are retryable per section 25.2\'s explicit list', function () {
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(504)).toBe(true);
  });

  it('400/401/403/404/409/412/422 are never retryable', function () {
    for (var s of [400, 401, 403, 404, 409, 412, 422]) {
      expect(isRetryableStatus(s)).toBe(false);
    }
  });

  it('500 is NOT in section 25.2\'s automatic-retry list (only 429/503/504 + network failure are)', function () {
    expect(isRetryableStatus(500)).toBe(false);
  });
});

describe('buildApiErrorFromResponse', function () {
  it('uses the server envelope\'s code/message/requestId/retryable verbatim when present', function () {
    var err = buildApiErrorFromResponse(403, {
      error: { code: 'TEAM_ACCESS_DENIED', message: 'You no longer have access to this team.', requestId: 'req_123', retryable: false },
    }, 'fallback-id');
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(403);
    expect(err.code).toBe('TEAM_ACCESS_DENIED');
    expect(err.message).toBe('You no longer have access to this team.');
    expect(err.requestId).toBe('req_123');
    expect(err.retryable).toBe(false);
  });

  it('falls back to a stable default code/message and the caller-supplied requestId when the body is malformed', function () {
    var err = buildApiErrorFromResponse(500, null, 'fallback-id');
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.requestId).toBe('fallback-id');
    expect(typeof err.message).toBe('string');
  });

  it('falls back to isRetryableStatus() when the envelope omits retryable', function () {
    var retryableFallback = buildApiErrorFromResponse(503, { error: { code: 'SERVICE_UNAVAILABLE' } }, 'id');
    var nonRetryableFallback = buildApiErrorFromResponse(404, { error: { code: 'RESOURCE_NOT_FOUND' } }, 'id');
    expect(retryableFallback.retryable).toBe(true);
    expect(nonRetryableFallback.retryable).toBe(false);
  });

  it('maps every documented status to a distinct default code', function () {
    var codes = [400, 401, 403, 404, 409, 412, 422, 429, 500, 503, 504].map(function (s) {
      return buildApiErrorFromResponse(s, null, 'id').code;
    });
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('isNetworkError', function () {
  it('a TypeError (fetch\'s own network-failure signal) is a network error', function () {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('a plain Error or an ApiError is not a network error', function () {
    expect(isNetworkError(new Error('boom'))).toBe(false);
    expect(isNetworkError(new ApiError({ status: 500, code: 'X', message: 'x', requestId: 'x', retryable: false }))).toBe(false);
  });
});
