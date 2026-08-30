/**
 * useAuth.logout.test.js
 *
 * Closes the real remaining gap behind issue #944 (QA Coverage Scope #965 /
 * QA & Reliability Audit #941). #944's premise was "no single test exercises
 * the hook's core state machine end-to-end" — but by the time this file was
 * written, auth.test.js already covered checkSession (7 tests, incl. the
 * magic-link hash path), onAuthStateChange's SIGNED_IN/SIGNED_OUT handling
 * (4 tests, incl. the #579 stall fix), and sendMagicLink (4 tests), and three
 * further files (useAuth.requestAccess.test.js, useAuth.updateProfileName
 * .test.js, useAuth.refreshMemberships.test.js) covered those three exported
 * functions individually. The one exported function with zero coverage
 * anywhere was logout() — this file closes that, plus locks in that an
 * onAuthStateChange event other than SIGNED_IN/SIGNED_OUT is a no-op (the
 * hook has no other event branches, so this documents the boundary of the
 * "state machine" rather than leaving it implicit).
 *
 * Mirrors auth.test.js's harness: vi.hoisted Supabase mock, vi.mock
 * ('../supabase'), src/tests/helpers/renderHook.
 *
 * Cases:
 *   L1. Active session → POSTs /logout with Bearer token + teamId body, then
 *       signs out of Supabase, clears both localStorage keys, resets all
 *       session/user/membership state, settles on 'unauthenticated'.
 *   L2. No active session → backend /logout is never called; Supabase
 *       signOut + full state reset still happen.
 *   L3. Backend /logout fetch throws → swallowed (logout always succeeds
 *       client-side); Supabase signOut + full state reset still happen.
 *   L4. Backend /logout resolves non-2xx → response status is never
 *       inspected (no res.ok check in the implementation); logout still
 *       completes fully — this locks in current behavior, not a fix.
 *   E1. onAuthStateChange fires an event other than SIGNED_IN/SIGNED_OUT
 *       (e.g. TOKEN_REFRESHED) → no state change at all (no branch handles
 *       it); documents the two-event boundary of the state machine.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { renderHook } from './helpers/renderHook.js';

var mocks = vi.hoisted(function() {
  return {
    auth: {
      getSession:        vi.fn(),
      onAuthStateChange:  vi.fn(),
      signOut:            vi.fn(),
    },
  };
});

vi.mock('../supabase', function() {
  return { supabase: { auth: mocks.auth } };
});

import { useAuth } from '../hooks/useAuth.js';

var LOGOUT_PATH = '/api/v1/auth/logout';

var MOCK_SESSION = {
  access_token: 'test-token-abc',
  user: { id: 'u1', email: 'coach@example.com' },
};

var ONE_MEMBERSHIP_USER = {
  id: 'u1',
  profile: { first_name: 'Casey', last_name: 'Jones' },
  memberships: [{ id: 'm1', user_id: 'u1', team_id: 't1', role: 'coach', status: 'active' }],
};

function jsonRes(ok, body, status) {
  return {
    ok: ok,
    status: status || (ok ? 200 : 400),
    json: function() { return Promise.resolve(body); },
  };
}

async function settle() {
  await act(async function() {
    await new Promise(function(r) { setTimeout(r, 0); });
  });
}

describe('useAuth — logout() (#944 remaining gap)', function() {

  beforeEach(function() {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    mocks.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    mocks.auth.signOut.mockResolvedValue({});
    global.fetch = vi.fn();
  });

  afterEach(function() {
    delete global.fetch;
    window.history.replaceState(null, '', '/');
  });

  describe('L: logout()', function() {

    it('L1: active session — posts to /logout with auth header + teamId, then fully resets state', async function() {
      mocks.auth.getSession.mockResolvedValue({ data: { session: MOCK_SESSION } });
      global.fetch.mockResolvedValue(jsonRes(true, { user: ONE_MEMBERSHIP_USER }));

      var h = await renderHook(function() { return useAuth(); });
      await settle();
      expect(h.result.current.authState).toBe('authenticated');

      localStorage.setItem('lg_team_id', 'team-42');
      localStorage.setItem('lg_pending_email', 'coach@example.com');

      global.fetch.mockClear();
      global.fetch.mockResolvedValue(jsonRes(true, {}));

      await act(async function() {
        await h.result.current.logout();
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      var call = global.fetch.mock.calls[0];
      expect(call[0]).toContain(LOGOUT_PATH);
      expect(call[1].method).toBe('POST');
      expect(call[1].headers.Authorization).toBe('Bearer test-token-abc');
      expect(JSON.parse(call[1].body).teamId).toBeDefined();

      expect(mocks.auth.signOut).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('lg_team_id')).toBeNull();
      expect(localStorage.getItem('lg_pending_email')).toBeNull();
      expect(h.result.current.session).toBeNull();
      expect(h.result.current.user).toBeNull();
      expect(h.result.current.membership).toBeNull();
      expect(h.result.current.memberships).toEqual([]);
      expect(h.result.current.authState).toBe('unauthenticated');

      await h.unmount();
    });

    it('L2: no active session — backend /logout is never called, Supabase signOut + reset still happen', async function() {
      mocks.auth.getSession.mockResolvedValue({ data: { session: null } });

      var h = await renderHook(function() { return useAuth(); });
      await settle();
      expect(h.result.current.authState).toBe('unauthenticated');
      expect(h.result.current.session).toBeNull();

      global.fetch.mockClear();

      await act(async function() {
        await h.result.current.logout();
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(mocks.auth.signOut).toHaveBeenCalledTimes(1);
      expect(h.result.current.authState).toBe('unauthenticated');

      await h.unmount();
    });

    it('L3: backend /logout throws — swallowed, Supabase signOut + full reset still complete', async function() {
      mocks.auth.getSession.mockResolvedValue({ data: { session: MOCK_SESSION } });
      global.fetch.mockResolvedValue(jsonRes(true, { user: ONE_MEMBERSHIP_USER }));

      var h = await renderHook(function() { return useAuth(); });
      await settle();
      expect(h.result.current.authState).toBe('authenticated');

      global.fetch.mockClear();
      global.fetch.mockRejectedValue(new Error('network down'));

      await act(async function() {
        await h.result.current.logout();
      });

      expect(mocks.auth.signOut).toHaveBeenCalledTimes(1);
      expect(h.result.current.session).toBeNull();
      expect(h.result.current.user).toBeNull();
      expect(h.result.current.authState).toBe('unauthenticated');

      await h.unmount();
    });

    it('L4: backend /logout resolves non-2xx — status is never inspected, logout still completes fully (locks in current behavior)', async function() {
      mocks.auth.getSession.mockResolvedValue({ data: { session: MOCK_SESSION } });
      global.fetch.mockResolvedValue(jsonRes(true, { user: ONE_MEMBERSHIP_USER }));

      var h = await renderHook(function() { return useAuth(); });
      await settle();
      expect(h.result.current.authState).toBe('authenticated');

      global.fetch.mockClear();
      global.fetch.mockResolvedValue(jsonRes(false, { error: 'INTERNAL_ERROR' }, 500));

      await act(async function() {
        await h.result.current.logout();
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(mocks.auth.signOut).toHaveBeenCalledTimes(1);
      expect(h.result.current.authState).toBe('unauthenticated');

      await h.unmount();
    });
  });

  describe('E: onAuthStateChange — events outside SIGNED_IN/SIGNED_OUT', function() {

    it('E1: an unhandled event (e.g. TOKEN_REFRESHED) leaves all state untouched', async function() {
      mocks.auth.getSession.mockResolvedValue({ data: { session: MOCK_SESSION } });
      global.fetch.mockResolvedValue(jsonRes(true, { user: ONE_MEMBERSHIP_USER }));

      var h = await renderHook(function() { return useAuth(); });
      await settle();
      expect(h.result.current.authState).toBe('authenticated');

      global.fetch.mockClear();
      var callback = mocks.auth.onAuthStateChange.mock.calls[0][0];

      await act(async function() {
        await callback('TOKEN_REFRESHED', MOCK_SESSION);
      });

      // No branch in the hook handles this event — state is untouched and no
      // network call is made, unlike SIGNED_IN which would re-fetch /me.
      expect(global.fetch).not.toHaveBeenCalled();
      expect(h.result.current.authState).toBe('authenticated');
      expect(h.result.current.session).toEqual(MOCK_SESSION);
      expect(h.result.current.membership).toEqual(ONE_MEMBERSHIP_USER.memberships[0]);

      await h.unmount();
    });
  });
});
