import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiClient } from '../api/client.js';
import { fetchAccount } from '../api/account.js';
import { getEffectiveOnline, __resetNetworkHealthForTests } from '../utils/networkHealth.js';

function jsonResponse(status, body, headers = {}) {
  return Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
  });
}

describe('fetchAccount (#1134)', () => {
  beforeEach(() => {
    __resetNetworkHealthForTests(true);
  });

  it('uses the existing authenticated client and returns Account data plus ETag', async () => {
    const fetchImpl = vi.fn(() => jsonResponse(200, { version: 1, memberships: [] }, { ETag: '"account-v1"' }));
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      getAccessToken: async () => 'session-token',
      fetchImpl,
    });
    const result = await fetchAccount(client);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.example.com/api/v1/account');
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer session-token');
    expect(result.data).toEqual({ version: 1, memberships: [] });
    expect(result.etag).toBe('"account-v1"');
  });

  it('passes a cached ETag and recognizes a 304 response', async () => {
    const fetchImpl = vi.fn(() => jsonResponse(304, null));
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      getAccessToken: async () => 'session-token',
      fetchImpl,
    });
    const result = await fetchAccount(client, { ifNoneMatch: '"account-v1"' });
    expect(fetchImpl.mock.calls[0][1].headers['If-None-Match']).toBe('"account-v1"');
    expect(result.notModified).toBe(true);
  });

  it('uses the shared self-correcting network-health signal on offline failures', async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      getAccessToken: async () => 'session-token',
      fetchImpl,
      waitImpl: async () => {},
    });
    await expect(fetchAccount(client)).rejects.toThrow('Failed to fetch');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(getEffectiveOnline()).toBe(false);
  });

  it('forwards caller cancellation without creating another client path', async () => {
    const fetchImpl = vi.fn();
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      getAccessToken: async () => 'session-token',
      fetchImpl,
    });
    const controller = new AbortController();
    controller.abort();
    await expect(fetchAccount(client, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
