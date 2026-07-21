/**
 * useAuth.updateProfileName.test.js
 *
 * Unit spec for updateProfileName (#405) — the PATCH /me + re-fetch flow added
 * to useAuth. Mirrors the useLiveScore.contract.test.js harness: vi.hoisted
 * Supabase mock, vi.mock('../supabase'), and the src/tests/helpers/renderHook
 * React-18 act helper. global.fetch is stubbed per test.
 *
 * Location note: hook tests live in src/tests/ (not src/hooks/__tests__/) —
 * matching the only existing hook test in this repo.
 *
 * Cases:
 *   1. PATCH ok + re-fetch ok   → { success: true }, user = SECOND fetch's user
 *   2. PATCH ok + re-fetch fail → { success: false }, user untouched
 *   3. PATCH non-ok (400)       → { success: false, error }, no re-fetch, user intact
 *   4. network throw on PATCH   → { success: false, error }, user intact
 *   5. no session               → { success: false }, fetch never called
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { renderHook } from './helpers/renderHook.js';

// ── Supabase mock ───────────────────────────────────────────────────────────────
// vi.hoisted runs before ES module imports so vi.mock can reference these spies.
var mocks = vi.hoisted(function() {
  return {
    auth: {
      getSession:        vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut:           vi.fn(),
    },
  };
});

vi.mock('../supabase', function() {
  return { supabase: { auth: mocks.auth } };
});

import { useAuth } from '../hooks/useAuth.js';

// ── Fixtures ────────────────────────────────────────────────────────────────────
var MOCK_SESSION = {
  access_token: 'test-token-abc',
  user: { id: 'u1', email: 'coach@example.com' },
};

// The user the app hydrates with on mount (empty name — the #405 pre-state).
var MOUNT_USER = {
  id: 'u1',
  profile: { first_name: '', last_name: '' },
  memberships: [{ id: 'm1', user_id: 'u1', team_id: 't1', role: 'coach', status: 'active' }],
};

// The user returned by the POST-save GET /me re-fetch (name now populated).
var REFETCH_USER = {
  id: 'u1',
  profile: { first_name: 'Casey', last_name: 'Jones' },
  memberships: [{ id: 'm1', user_id: 'u1', team_id: 't1', role: 'coach', status: 'active' }],
};

// A DISTINCT profile shape in the PATCH response body — used to prove the hook
// sets `user` from the re-fetch, NOT from the PATCH response.
var PATCH_RESPONSE = { success: true, profile: { first_name: 'FROM_PATCH', last_name: 'X' } };

var ME_PATH = '/api/v1/auth/me';

function jsonRes(ok, body, status) {
  return {
    ok: ok,
    status: status || (ok ? 200 : 400),
    json: function() { return Promise.resolve(body); },
  };
}

// Flush pending promise chains (getSession → fetch → json) inside act so the
// mount hydration settles before per-case assertions.
async function settle() {
  await act(async function() {
    await new Promise(function(r) { setTimeout(r, 0); });
  });
}

// ── Suite ─────────────────────────────────────────────────────────────────────
describe('useAuth — updateProfileName (#405)', function() {

  beforeEach(function() {
    vi.clearAllMocks();
    mocks.auth.getSession.mockResolvedValue({ data: { session: MOCK_SESSION } });
    mocks.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    mocks.auth.signOut.mockResolvedValue({});
    // Default fetch: the mount GET /me returns MOUNT_USER.
    global.fetch = vi.fn().mockResolvedValue(jsonRes(true, { success: true, user: MOUNT_USER }));
  });

  afterEach(function() {
    delete global.fetch;
  });

  // Mounts the hook with a live session, waits for /me hydration, then clears the
  // fetch call-history so each test asserts only on its own PATCH/re-fetch calls.
  async function mountAuthenticated() {
    var h = await renderHook(function() { return useAuth(); });
    await settle();
    global.fetch.mockClear();
    return h;
  }

  // ── Case 1: PATCH ok + re-fetch ok ──────────────────────────────────────────
  it('1: PATCH ok + re-fetch ok → { success: true }, user set from the re-fetch (not the PATCH body)', async function() {
    var h = await mountAuthenticated();
    expect(h.result.current.user).toEqual(MOUNT_USER); // pre-state

    global.fetch
      .mockResolvedValueOnce(jsonRes(true, PATCH_RESPONSE))          // 1st: PATCH
      .mockResolvedValueOnce(jsonRes(true, { user: REFETCH_USER })); // 2nd: GET re-fetch

    var ret;
    await act(async function() {
      ret = await h.result.current.updateProfileName('Casey', 'Jones');
    });

    expect(ret).toEqual({ success: true });

    // user comes from the SECOND fetch (re-fetch), not the PATCH response body.
    expect(h.result.current.user).toEqual(REFETCH_USER);
    expect(h.result.current.user.profile.first_name).toBe('Casey');
    expect(h.result.current.user.profile.first_name).not.toBe('FROM_PATCH');

    // ── fetch call shape ──
    var calls = global.fetch.mock.calls;
    expect(calls.length).toBe(2);

    // PATCH: method, URL, auth header, JSON body
    var patchUrl = calls[0][0];
    var patchOpts = calls[0][1];
    expect(patchUrl).toContain(ME_PATH);
    expect(patchOpts.method).toBe('PATCH');
    expect(patchOpts.headers.Authorization).toBe('Bearer test-token-abc');
    expect(patchOpts.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(patchOpts.body)).toEqual({ firstName: 'Casey', lastName: 'Jones' });

    // Re-fetch: GET (no method) to /me, auth header present
    var getUrl = calls[1][0];
    var getOpts = calls[1][1];
    expect(getUrl).toContain(ME_PATH);
    expect(getOpts.method).toBeUndefined();
    expect(getOpts.headers.Authorization).toBe('Bearer test-token-abc');

    await h.unmount();
  });

  // ── Case 2: PATCH ok + re-fetch FAILS ───────────────────────────────────────
  it('2: PATCH ok + re-fetch fails → { success: false }, existing user untouched (not cleared)', async function() {
    var h = await mountAuthenticated();

    global.fetch
      .mockResolvedValueOnce(jsonRes(true, PATCH_RESPONSE))                     // PATCH ok
      .mockResolvedValueOnce(jsonRes(false, { error: 'INTERNAL_ERROR' }, 500)); // re-fetch fails

    var ret;
    await act(async function() {
      ret = await h.result.current.updateProfileName('Casey', 'Jones');
    });

    expect(ret.success).toBe(false);

    // user must be exactly what it was — not null, not blanked.
    expect(h.result.current.user).toEqual(MOUNT_USER);
    expect(h.result.current.user).not.toBeNull();
    expect(h.result.current.user.profile.first_name).toBe('');

    await h.unmount();
  });

  // ── Case 3: PATCH non-ok (400) ──────────────────────────────────────────────
  it('3: PATCH 400 → { success: false, error }, re-fetch never fired, user intact', async function() {
    var h = await mountAuthenticated();

    global.fetch.mockResolvedValueOnce(
      jsonRes(false, { error: 'VALIDATION_ERROR', message: 'firstName required' }, 400)
    );

    var ret;
    await act(async function() {
      ret = await h.result.current.updateProfileName('', 'Jones');
    });

    expect(ret.success).toBe(false);
    expect(ret.error).toBe('firstName required');

    // Only the PATCH went out — no re-fetch after a failed PATCH.
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][1].method).toBe('PATCH');

    expect(h.result.current.user).toEqual(MOUNT_USER);

    await h.unmount();
  });

  // ── Case 4: network throw on PATCH ──────────────────────────────────────────
  it('4: network throw on PATCH → { success: false, error }, user intact', async function() {
    var h = await mountAuthenticated();

    global.fetch.mockRejectedValueOnce(new Error('network down'));

    var ret;
    await act(async function() {
      ret = await h.result.current.updateProfileName('Casey', 'Jones');
    });

    expect(ret.success).toBe(false);
    expect(ret.error).toBe('Network error — check your connection');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(h.result.current.user).toEqual(MOUNT_USER);

    await h.unmount();
  });

  // ── Case 5: no session ──────────────────────────────────────────────────────
  it('5: no session → { success: false }, fetch never attempted', async function() {
    // Override BEFORE mount: getSession returns no session, so the hook never
    // hydrates and `session` state stays null.
    mocks.auth.getSession.mockResolvedValue({ data: { session: null } });

    var h = await renderHook(function() { return useAuth(); });
    await settle();
    global.fetch.mockClear();

    var ret;
    await act(async function() {
      ret = await h.result.current.updateProfileName('Casey', 'Jones');
    });

    expect(ret.success).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();

    await h.unmount();
  });

});
