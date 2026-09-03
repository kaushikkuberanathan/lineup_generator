/**
 * api.client.test.js
 * Story #1026 — the narrow reusable authenticated API client: token/
 * request-ID attachment, error mapping, cancellation, retry, and the
 * generation-guard used for rapid team-switch race protection.
 */
import { describe, it, expect, vi } from 'vitest';
import { createApiClient, createGenerationGuard, generateRequestId } from '../api/client.js';

var networkHealthMocks = vi.hoisted(function () {
  return { reportNetworkFailure: vi.fn(), reportNetworkSuccess: vi.fn() };
});
vi.mock('../utils/networkHealth.js', function () {
  return {
    reportNetworkFailure: networkHealthMocks.reportNetworkFailure,
    reportNetworkSuccess: networkHealthMocks.reportNetworkSuccess,
  };
});

function jsonResponse(status, body, headers) {
  var h = new Headers(headers || {});
  return Promise.resolve({
    status: status,
    ok: status >= 200 && status < 300,
    headers: h,
    json: function () { return Promise.resolve(body); },
  });
}

describe('generateRequestId', function () {
  it('produces a value matching the section 25.1 X-Request-ID pattern', function () {
    var id = generateRequestId();
    expect(id).toMatch(/^[A-Za-z0-9._:-]{1,128}$/);
  });

  it('produces distinct values on successive calls', function () {
    expect(generateRequestId()).not.toBe(generateRequestId());
  });
});

describe('createApiClient — success paths', function () {
  it('attaches Authorization from getAccessToken() and a generated X-Request-ID', async function () {
    var fetchImpl = vi.fn(function () { return jsonResponse(200, { ok: true }, { ETag: '"abc"' }); });
    var client = createApiClient({ baseUrl: 'https://api.example.com', getAccessToken: async function () { return 'my-token'; }, fetchImpl: fetchImpl });

    var result = await client.request('/api/v1/home');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    var callArgs = fetchImpl.mock.calls[0];
    expect(callArgs[0]).toBe('https://api.example.com/api/v1/home');
    expect(callArgs[1].headers.Authorization).toBe('Bearer my-token');
    expect(callArgs[1].headers['X-Request-ID']).toMatch(/^[A-Za-z0-9._:-]{1,128}$/);
    expect(result.data).toEqual({ ok: true });
    expect(result.etag).toBe('"abc"');
  });

  it('omits Authorization when getAccessToken() resolves to null (no session)', async function () {
    var fetchImpl = vi.fn(function () { return jsonResponse(200, {}, {}); });
    var client = createApiClient({ baseUrl: 'https://api.example.com', getAccessToken: async function () { return null; }, fetchImpl: fetchImpl });
    await client.request('/api/v1/home');
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('sends If-None-Match when provided and returns notModified:true on a 304', async function () {
    var fetchImpl = vi.fn(function () { return jsonResponse(304, null, {}); });
    var client = createApiClient({ baseUrl: 'https://api.example.com', getAccessToken: async function () { return 't'; }, fetchImpl: fetchImpl });
    var result = await client.request('/api/v1/home', { ifNoneMatch: '"abc"' });
    expect(fetchImpl.mock.calls[0][1].headers['If-None-Match']).toBe('"abc"');
    expect(result.notModified).toBe(true);
  });
});

describe('createApiClient — error paths', function () {
  it('a 403 response throws an ApiError carrying the server envelope verbatim', async function () {
    var fetchImpl = vi.fn(function () {
      return jsonResponse(403, { error: { code: 'TEAM_ACCESS_DENIED', message: 'nope', requestId: 'req_1', retryable: false } }, {});
    });
    var client = createApiClient({ baseUrl: 'https://api.example.com', getAccessToken: async function () { return 't'; }, fetchImpl: fetchImpl });
    await expect(client.request('/api/v1/home')).rejects.toMatchObject({ code: 'TEAM_ACCESS_DENIED', status: 403 });
  });

  it('non-retryable errors (400/401/403/404/409/412/422) are never retried — exactly one fetch call', async function () {
    for (var status of [400, 401, 403, 404, 409, 412, 422]) {
      var fetchImpl = vi.fn(function () { return jsonResponse(status, { error: { code: 'X', retryable: false } }, {}); });
      var client = createApiClient({ baseUrl: 'https://api.example.com', getAccessToken: async function () { return 't'; }, fetchImpl: fetchImpl, waitImpl: async function () {} });
      await expect(client.request('/api/v1/home')).rejects.toThrow();
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  });

  it('a 503 is retried up to twice (3 total attempts), then throws', async function () {
    var fetchImpl = vi.fn(function () { return jsonResponse(503, { error: { code: 'SERVICE_UNAVAILABLE', retryable: true } }, {}); });
    var client = createApiClient({ baseUrl: 'https://api.example.com', getAccessToken: async function () { return 't'; }, fetchImpl: fetchImpl, waitImpl: async function () {} });
    await expect(client.request('/api/v1/home')).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('a 503 that recovers on the second attempt returns the successful result', async function () {
    var call = 0;
    var fetchImpl = vi.fn(function () {
      call += 1;
      if (call < 2) return jsonResponse(503, { error: { code: 'SERVICE_UNAVAILABLE', retryable: true } }, {});
      return jsonResponse(200, { ok: true }, {});
    });
    var client = createApiClient({ baseUrl: 'https://api.example.com', getAccessToken: async function () { return 't'; }, fetchImpl: fetchImpl, waitImpl: async function () {} });
    var result = await client.request('/api/v1/home');
    expect(result.data).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('a network failure (TypeError from fetch) is retried like 503/504', async function () {
    var fetchImpl = vi.fn(function () { return Promise.reject(new TypeError('Failed to fetch')); });
    var client = createApiClient({ baseUrl: 'https://api.example.com', getAccessToken: async function () { return 't'; }, fetchImpl: fetchImpl, waitImpl: async function () {} });
    await expect(client.request('/api/v1/home')).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('honors a numeric Retry-After header on a 429 instead of the default backoff', async function () {
    var fetchImpl = vi.fn(function () { return jsonResponse(429, { error: { code: 'RATE_LIMITED', retryable: true } }, { 'Retry-After': '1' }); });
    var waitImpl = vi.fn(async function () {});
    var client = createApiClient({ baseUrl: 'https://api.example.com', getAccessToken: async function () { return 't'; }, fetchImpl: fetchImpl, waitImpl: waitImpl });
    await expect(client.request('/api/v1/home')).rejects.toThrow();
    expect(waitImpl.mock.calls[0][0]).toBe(1000);
  });
});

describe('createApiClient — cancellation', function () {
  it('an already-aborted caller signal short-circuits without calling fetch', async function () {
    var fetchImpl = vi.fn(function () { return jsonResponse(200, {}, {}); });
    var client = createApiClient({ baseUrl: 'https://api.example.com', getAccessToken: async function () { return 't'; }, fetchImpl: fetchImpl });
    var controller = new AbortController();
    controller.abort();
    await expect(client.request('/api/v1/home', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('aborting the caller signal mid-flight rejects with AbortError, not a retry', async function () {
    var controller = new AbortController();
    var fetchImpl = vi.fn(function (url, opts) {
      return new Promise(function (resolve, reject) {
        function onAbort() {
          var e = new Error('aborted');
          e.name = 'AbortError';
          reject(e);
        }
        // A real fetch() rejects immediately for an already-aborted
        // signal rather than waiting on a future 'abort' event — mirror
        // that so this mock doesn't hang if the merged signal is already
        // aborted by the time fetchImpl is invoked.
        if (opts.signal.aborted) { onAbort(); return; }
        opts.signal.addEventListener('abort', onAbort);
      });
    });
    var client = createApiClient({ baseUrl: 'https://api.example.com', getAccessToken: async function () { return 't'; }, fetchImpl: fetchImpl, waitImpl: async function () {} });
    var pending = client.request('/api/v1/home', { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('createApiClient — connectivity signal (#1062)', function () {
  it('a successful response (any status) reports network success, not failure', async function () {
    networkHealthMocks.reportNetworkFailure.mockClear();
    networkHealthMocks.reportNetworkSuccess.mockClear();
    var fetchImpl = vi.fn(function () { return jsonResponse(403, { error: { code: 'X', retryable: false } }, {}); });
    var client = createApiClient({ baseUrl: 'https://api.example.com', getAccessToken: async function () { return 't'; }, fetchImpl: fetchImpl });
    await expect(client.request('/api/v1/home')).rejects.toThrow();
    expect(networkHealthMocks.reportNetworkSuccess).toHaveBeenCalledTimes(1);
    expect(networkHealthMocks.reportNetworkFailure).not.toHaveBeenCalled();
  });

  it('every network-level failure attempt reports a failure, including ones that still retry', async function () {
    networkHealthMocks.reportNetworkFailure.mockClear();
    networkHealthMocks.reportNetworkSuccess.mockClear();
    var fetchImpl = vi.fn(function () { return Promise.reject(new TypeError('Failed to fetch')); });
    var client = createApiClient({ baseUrl: 'https://api.example.com', getAccessToken: async function () { return 't'; }, fetchImpl: fetchImpl, waitImpl: async function () {} });
    await expect(client.request('/api/v1/home')).rejects.toThrow();
    expect(networkHealthMocks.reportNetworkFailure).toHaveBeenCalledTimes(3); // MAX_RETRIES=2 → 3 total attempts
    expect(networkHealthMocks.reportNetworkSuccess).not.toHaveBeenCalled();
  });

  it('a network failure that recovers on retry reports one failure then one success', async function () {
    networkHealthMocks.reportNetworkFailure.mockClear();
    networkHealthMocks.reportNetworkSuccess.mockClear();
    var call = 0;
    var fetchImpl = vi.fn(function () {
      call += 1;
      if (call < 2) return Promise.reject(new TypeError('Failed to fetch'));
      return jsonResponse(200, { ok: true }, {});
    });
    var client = createApiClient({ baseUrl: 'https://api.example.com', getAccessToken: async function () { return 't'; }, fetchImpl: fetchImpl, waitImpl: async function () {} });
    await client.request('/api/v1/home');
    expect(networkHealthMocks.reportNetworkFailure).toHaveBeenCalledTimes(1);
    expect(networkHealthMocks.reportNetworkSuccess).toHaveBeenCalledTimes(1);
  });
});

describe('createGenerationGuard — rapid team-switch race protection', function () {
  it('each call to next() aborts the previous in-flight signal', function () {
    var guard = createGenerationGuard();
    var first = guard.next();
    expect(first.signal.aborted).toBe(false);
    var second = guard.next();
    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);
  });

  it('isCurrent() only returns true for the latest generation — a stale response can be discarded', function () {
    var guard = createGenerationGuard();
    var first = guard.next();
    var second = guard.next();
    expect(first.isCurrent(first.generation)).toBe(false);
    expect(second.isCurrent(second.generation)).toBe(true);
  });
});
