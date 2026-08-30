/**
 * legalConsent.test.js
 * Unit spec for logLegalConsent() — the fire-and-forget call to
 * POST /api/v1/auth/consent (migration 028's legal_consents table).
 * Never throws; a failed consent log must never surface as an error on the
 * registration flow it accompanies. Mirrors tests/useAuth.requestAccess.test.js's
 * global.fetch stub pattern.
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { logLegalConsent } from './legalConsent';

function jsonRes(ok, status) {
  return { ok: ok, status: status || (ok ? 201 : 400) };
}

beforeEach(function () {
  global.fetch = vi.fn();
});

afterEach(function () {
  delete global.fetch;
});

describe('logLegalConsent', function () {
  test('POSTs email, consents, and context to /api/v1/auth/consent', async function () {
    global.fetch.mockResolvedValueOnce(jsonRes(true));

    var result = await logLegalConsent({
      email: 'jane@example.com',
      consents: [{ docId: 'terms', version: '2.0' }, { docId: 'privacy', version: '1.0' }],
      context: 'request_access',
    });

    expect(result).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    var url = global.fetch.mock.calls[0][0];
    var opts = global.fetch.mock.calls[0][1];
    expect(url).toContain('/api/v1/auth/consent');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({
      email: 'jane@example.com',
      consents: [{ docId: 'terms', version: '2.0' }, { docId: 'privacy', version: '1.0' }],
      context: 'request_access',
    });
  });

  test('a non-ok response resolves to success:false, does not throw', async function () {
    global.fetch.mockResolvedValueOnce(jsonRes(false, 500));

    var result = await logLegalConsent({ email: 'jane@example.com', consents: [{ docId: 'terms', version: '2.0' }] });
    expect(result).toEqual({ success: false });
  });

  test('a network error resolves to success:false, does not throw or reject', async function () {
    global.fetch.mockRejectedValueOnce(new Error('network down'));

    await expect(
      logLegalConsent({ email: 'jane@example.com', consents: [{ docId: 'terms', version: '2.0' }] })
    ).resolves.toEqual({ success: false });
  });
});
