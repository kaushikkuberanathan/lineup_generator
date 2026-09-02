/**
 * api.home.test.js
 * Story #1026 — the typed Home endpoint module. Thin by design: it just
 * calls the shared client with the right path/method, so client.js's own
 * tests own the real behavior (auth, retry, ETag).
 */
import { describe, it, expect, vi } from 'vitest';
import { fetchHome } from '../api/home.js';

describe('fetchHome', function () {
  it('calls client.request with GET /api/v1/home and forwards signal/ifNoneMatch/isShadow', async function () {
    var client = { request: vi.fn(async function () { return { data: { version: 1 } }; }) };
    var signal = new AbortController().signal;
    await fetchHome(client, { signal: signal, ifNoneMatch: '"abc"', isShadow: true });
    expect(client.request).toHaveBeenCalledWith('/api/v1/home', { method: 'GET', signal: signal, ifNoneMatch: '"abc"', isShadow: true });
  });

  it('returns whatever the client resolves with, unmodified', async function () {
    var payload = { data: { version: 1, teams: [] }, etag: '"x"', requestId: 'r1' };
    var client = { request: vi.fn(async function () { return payload; }) };
    var result = await fetchHome(client);
    expect(result).toBe(payload);
  });
});
