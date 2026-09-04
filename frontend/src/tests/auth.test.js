/**
 * auth.test.js
 *
 * DOC_TEST_DEBT.md P1 "Auth Flow End-to-End (Magic Link + Google OAuth)".
 * No prior coverage existed for useAuth's session-hydration effect
 * (checkSession, run on mount), its onAuthStateChange listener, or
 * sendMagicLink — AppShareLinkRouting.test.jsx and AppNoMembershipRouting
 * .test.jsx both mock `useAuth` entirely, so none of this hook's internal
 * logic has ever actually run under test.
 *
 * Magic link and Google OAuth converge on the exact same post-redirect code
 * path here (both land back via Supabase with a session that fires
 * SIGNED_IN through onAuthStateChange) — LoginScreen.jsx's
 * handleGoogleSignIn only *initiates* the redirect and is covered
 * separately in LoginScreen.test.jsx.
 *
 * Mirrors useAuth.updateProfileName.test.js's harness: vi.hoisted Supabase
 * mock, vi.mock('../supabase'), src/tests/helpers/renderHook.
 *
 * Groups:
 *   A. checkSession() — mount-time session hydration (incl. magic-link hash)
 *   B. onAuthStateChange — SIGNED_IN / SIGNED_OUT
 *   C. sendMagicLink
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
    networkHealth: {
      reportNetworkFailure: vi.fn(),
      reportNetworkSuccess: vi.fn(),
    },
  };
});

vi.mock('../supabase', function() {
  return { supabase: { auth: mocks.auth } };
});

vi.mock('../utils/networkHealth.js', function() {
  return {
    reportNetworkFailure: mocks.networkHealth.reportNetworkFailure,
    reportNetworkSuccess: mocks.networkHealth.reportNetworkSuccess,
  };
});

import { useAuth } from '../hooks/useAuth.js';

var ME_PATH = '/api/v1/auth/me';
var MAGIC_LINK_PATH = '/api/v1/auth/magic-link';

var MOCK_SESSION = {
  access_token: 'test-token-abc',
  user: { id: 'u1', email: 'coach@example.com' },
};

var ONE_MEMBERSHIP_USER = {
  id: 'u1',
  profile: { first_name: 'Casey', last_name: 'Jones' },
  memberships: [{ id: 'm1', user_id: 'u1', team_id: 't1', role: 'coach', status: 'active' }],
};

var NO_MEMBERSHIP_USER = {
  id: 'u1',
  profile: { first_name: '', last_name: '' },
  memberships: [],
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

describe('useAuth (#DOC_TEST_DEBT Auth Flow End-to-End)', function() {

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

  // ── Group A: checkSession() on mount ─────────────────────────────────────

  describe('A: checkSession (mount-time hydration)', function() {

    it('A1: no existing session → unauthenticated, /me never fetched', async function() {
      mocks.auth.getSession.mockResolvedValue({ data: { session: null } });

      var h = await renderHook(function() { return useAuth(); });
      await settle();

      expect(h.result.current.authState).toBe('unauthenticated');
      expect(global.fetch).not.toHaveBeenCalled();

      await h.unmount();
    });

    it('A2: existing session + /me ok + memberships > 0 → authenticated, membership = memberships[0]', async function() {
      mocks.auth.getSession.mockResolvedValue({ data: { session: MOCK_SESSION } });
      global.fetch.mockResolvedValue(jsonRes(true, { user: ONE_MEMBERSHIP_USER }));

      var h = await renderHook(function() { return useAuth(); });
      await settle();

      expect(h.result.current.authState).toBe('authenticated');
      expect(h.result.current.session).toEqual(MOCK_SESSION);
      expect(h.result.current.user).toEqual(ONE_MEMBERSHIP_USER);
      expect(h.result.current.memberships).toEqual(ONE_MEMBERSHIP_USER.memberships);
      expect(h.result.current.membership).toEqual(ONE_MEMBERSHIP_USER.memberships[0]);
      expect(h.result.current.role).toBe('coach');

      var call = global.fetch.mock.calls[0];
      expect(call[0]).toContain(ME_PATH);
      expect(call[1].headers.Authorization).toBe('Bearer test-token-abc');
      expect(mocks.networkHealth.reportNetworkSuccess).toHaveBeenCalledTimes(1);
      expect(mocks.networkHealth.reportNetworkFailure).not.toHaveBeenCalled();

      await h.unmount();
    });

    it('A3: existing session + /me ok + zero memberships → no_membership (not authenticated)', async function() {
      mocks.auth.getSession.mockResolvedValue({ data: { session: MOCK_SESSION } });
      global.fetch.mockResolvedValue(jsonRes(true, { user: NO_MEMBERSHIP_USER }));

      var h = await renderHook(function() { return useAuth(); });
      await settle();

      expect(h.result.current.authState).toBe('no_membership');
      expect(h.result.current.membership).toBeNull();

      await h.unmount();
    });

    it('A4: existing session + /me fails (expired/invalid) → signs out, unauthenticated', async function() {
      mocks.auth.getSession.mockResolvedValue({ data: { session: MOCK_SESSION } });
      global.fetch.mockResolvedValue(jsonRes(false, { error: 'UNAUTHORIZED' }, 401));

      var h = await renderHook(function() { return useAuth(); });
      await settle();

      expect(mocks.auth.signOut).toHaveBeenCalledTimes(1);
      expect(h.result.current.authState).toBe('unauthenticated');

      await h.unmount();
    });

    it('A4b: existing session + /me network failure (offline) → keeps session, stays authenticated, no sign-out (#1060)', async function() {
      // Real bug found during #1033 offline-evidence testing: a thrown fetch
      // (network unreachable) was being caught by the same catch-all as a
      // genuine backend rejection, logging out a user with a perfectly
      // valid local session just because the network was down.
      mocks.auth.getSession.mockResolvedValue({ data: { session: MOCK_SESSION } });
      global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

      var h = await renderHook(function() { return useAuth(); });
      await settle();

      expect(mocks.auth.signOut).not.toHaveBeenCalled();
      expect(h.result.current.authState).toBe('authenticated');
      expect(h.result.current.session).toEqual(MOCK_SESSION);
      // Synthesized from the already-confirmed local session, not /me —
      // downstream consumers (e.g. the Home API cache) key off user.id, so
      // this must match what was used while online.
      expect(h.result.current.user).toEqual({ id: 'u1', email: 'coach@example.com' });
      expect(mocks.networkHealth.reportNetworkFailure).toHaveBeenCalledTimes(1);
      expect(mocks.networkHealth.reportNetworkSuccess).not.toHaveBeenCalled();

      await h.unmount();
    });

    it('A5: magic-link hash present + getSession() errors → unauthenticated, hash cleared, no second getSession() call', async function() {
      window.location.hash = '#access_token=abc123&type=magiclink';
      mocks.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: { message: 'invalid token' } });
      var replaceSpy = vi.spyOn(window.history, 'replaceState');

      var h = await renderHook(function() { return useAuth(); });
      await settle();

      expect(h.result.current.authState).toBe('unauthenticated');
      expect(replaceSpy).toHaveBeenCalled();
      expect(mocks.auth.getSession).toHaveBeenCalledTimes(1);
      expect(global.fetch).not.toHaveBeenCalled();

      await h.unmount();
    });

    it('A6: magic-link hash present + getSession() succeeds → hash cleared, falls through to normal hydration (getSession called twice)', async function() {
      window.location.hash = '#access_token=abc123&type=magiclink';
      mocks.auth.getSession.mockResolvedValue({ data: { session: MOCK_SESSION }, error: null });
      global.fetch.mockResolvedValue(jsonRes(true, { user: ONE_MEMBERSHIP_USER }));
      var replaceSpy = vi.spyOn(window.history, 'replaceState');

      var h = await renderHook(function() { return useAuth(); });
      await settle();

      expect(replaceSpy).toHaveBeenCalled();
      expect(mocks.auth.getSession).toHaveBeenCalledTimes(2);
      expect(h.result.current.authState).toBe('authenticated');

      await h.unmount();
    });

    it('A7: exception during hydration from getSession() itself (not the /me fetch) → unauthenticated, not stuck on loading', async function() {
      // Superseded 2026-09-03 (#1060): this test previously used a /me fetch
      // throw as its "exception during hydration" case and asserted
      // unauthenticated — that was the bug itself (see A4b, which now
      // covers the /me-network-failure case correctly). Re-pointed at a
      // genuinely different, still-unhandled exception source
      // (getSession() itself throwing) so the "never stuck on loading"
      // guarantee this test exists for is still covered by something real.
      mocks.auth.getSession.mockRejectedValue(new Error('getSession exploded'));

      var h = await renderHook(function() { return useAuth(); });
      await settle();

      expect(h.result.current.authState).toBe('unauthenticated');
      expect(global.fetch).not.toHaveBeenCalled();

      await h.unmount();
    });
  });

  // ── Group B: onAuthStateChange ───────────────────────────────────────────

  describe('B: onAuthStateChange listener', function() {

    it('B1: SIGNED_IN + memberships > 0 → authenticated, session/user/membership set', async function() {
      mocks.auth.getSession.mockResolvedValue({ data: { session: null } });

      var h = await renderHook(function() { return useAuth(); });
      await settle();
      expect(h.result.current.authState).toBe('unauthenticated');

      global.fetch.mockResolvedValue(jsonRes(true, { user: ONE_MEMBERSHIP_USER }));
      var callback = mocks.auth.onAuthStateChange.mock.calls[0][0];

      await act(async function() {
        await callback('SIGNED_IN', MOCK_SESSION);
      });

      expect(h.result.current.authState).toBe('authenticated');
      expect(h.result.current.session).toEqual(MOCK_SESSION);
      expect(h.result.current.membership).toEqual(ONE_MEMBERSHIP_USER.memberships[0]);
      expect(mocks.networkHealth.reportNetworkSuccess).toHaveBeenCalledTimes(1);
      expect(mocks.networkHealth.reportNetworkFailure).not.toHaveBeenCalled();

      await h.unmount();
    });

    it('B2: SIGNED_IN + zero memberships → no_membership', async function() {
      mocks.auth.getSession.mockResolvedValue({ data: { session: null } });

      var h = await renderHook(function() { return useAuth(); });
      await settle();

      global.fetch.mockResolvedValue(jsonRes(true, { user: NO_MEMBERSHIP_USER }));
      var callback = mocks.auth.onAuthStateChange.mock.calls[0][0];

      await act(async function() {
        await callback('SIGNED_IN', MOCK_SESSION);
      });

      expect(h.result.current.authState).toBe('no_membership');

      await h.unmount();
    });

    it('B3: SIGNED_OUT → clears session/user/membership/memberships, unauthenticated', async function() {
      mocks.auth.getSession.mockResolvedValue({ data: { session: MOCK_SESSION } });
      global.fetch.mockResolvedValue(jsonRes(true, { user: ONE_MEMBERSHIP_USER }));

      var h = await renderHook(function() { return useAuth(); });
      await settle();
      expect(h.result.current.authState).toBe('authenticated');

      var callback = mocks.auth.onAuthStateChange.mock.calls[0][0];
      await act(async function() {
        await callback('SIGNED_OUT', null);
      });

      expect(h.result.current.authState).toBe('unauthenticated');
      expect(h.result.current.session).toBeNull();
      expect(h.result.current.user).toBeNull();
      expect(h.result.current.membership).toBeNull();
      expect(h.result.current.memberships).toEqual([]);

      await h.unmount();
    });

    // Documents existing behavior, not a security bypass: if the backend /me
    // call fails after Supabase has already signed the user in, the handler's
    // `if (res.ok)` guard means NO state update happens at all — authState is
    // left exactly where it was (e.g. still 'unauthenticated'). The user is
    // left on the login screen with a live Supabase session and no error
    // shown. FLAGGED FOR KK REVIEW in SPRINT2_EXECUTION_LOG.md — a reliability
    // gap (silent stall), not an auth-bypass; not fixed as part of this item.
    it('B4: SIGNED_IN + backend /me failure → surfaces an error and explicitly settles on unauthenticated (#579 fix)', async function() {
      mocks.auth.getSession.mockResolvedValue({ data: { session: null } });

      var h = await renderHook(function() { return useAuth(); });
      await settle();
      expect(h.result.current.authState).toBe('unauthenticated');

      global.fetch.mockResolvedValue(jsonRes(false, { error: 'INTERNAL_ERROR' }, 500));
      var callback = mocks.auth.onAuthStateChange.mock.calls[0][0];

      await act(async function() {
        await callback('SIGNED_IN', MOCK_SESSION);
      });

      // Previously: silent no-op — authState never changed, no error surfaced,
      // user stranded on whatever screen they were on with zero feedback (#579).
      // Fixed: the hook now explicitly re-settles on 'unauthenticated' and
      // exposes an error message so a consumer can show it.
      expect(h.result.current.authState).toBe('unauthenticated');
      expect(h.result.current.session).toBeNull();
      expect(h.result.current.error).toMatch(/try again|sign(ing)? in/i);

      await h.unmount();
    });
    it('B5: SIGNED_IN + /me network failure (offline) → keeps session, stays authenticated, no error surfaced (#1060)', async function() {
      // Mirrors A4b — this handler's /me call was deliberately kept in sync
      // with checkSession's (#579 commit message), including the same bug.
      mocks.auth.getSession.mockResolvedValue({ data: { session: null } });

      var h = await renderHook(function() { return useAuth(); });
      await settle();
      expect(h.result.current.authState).toBe('unauthenticated');

      global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
      var callback = mocks.auth.onAuthStateChange.mock.calls[0][0];

      await act(async function() {
        await callback('SIGNED_IN', MOCK_SESSION);
      });

      expect(h.result.current.authState).toBe('authenticated');
      expect(h.result.current.session).toEqual(MOCK_SESSION);
      expect(h.result.current.user).toEqual({ id: 'u1', email: 'coach@example.com' });
      expect(h.result.current.error).toBeFalsy();
      expect(mocks.networkHealth.reportNetworkFailure).toHaveBeenCalledTimes(1);
      expect(mocks.networkHealth.reportNetworkSuccess).not.toHaveBeenCalled();

      await h.unmount();
    });
  });

  // ── Group C: sendMagicLink ────────────────────────────────────────────────

  describe('C: sendMagicLink', function() {

    it('C1: success → { success: true }, persists teamId to localStorage and hook state', async function() {
      mocks.auth.getSession.mockResolvedValue({ data: { session: null } });
      var h = await renderHook(function() { return useAuth(); });
      await settle();

      global.fetch.mockResolvedValue(jsonRes(true, {}));

      var ret;
      await act(async function() {
        ret = await h.result.current.sendMagicLink('coach@example.com', 'team-42');
      });

      expect(ret).toEqual({ success: true });
      expect(localStorage.getItem('lg_team_id')).toBe('team-42');
      expect(h.result.current.teamId).toBe('team-42');

      var call = global.fetch.mock.calls[0];
      expect(call[0]).toContain(MAGIC_LINK_PATH);
      var body = JSON.parse(call[1].body);
      expect(body.email).toBe('coach@example.com');
      expect(body.teamId).toBe('team-42');

      await h.unmount();
    });

    it('C2: backend NOT_AUTHORIZED → { success: false, error: "no_membership" }', async function() {
      mocks.auth.getSession.mockResolvedValue({ data: { session: null } });
      var h = await renderHook(function() { return useAuth(); });
      await settle();

      global.fetch.mockResolvedValue(jsonRes(false, { error: 'NOT_AUTHORIZED' }, 403));

      var ret;
      await act(async function() {
        ret = await h.result.current.sendMagicLink('unknown@example.com', 'team-42');
      });

      expect(ret).toEqual({ success: false, error: 'no_membership' });

      await h.unmount();
    });

    it('C3: other backend error with message → { success: false, error: <message> }', async function() {
      mocks.auth.getSession.mockResolvedValue({ data: { session: null } });
      var h = await renderHook(function() { return useAuth(); });
      await settle();

      global.fetch.mockResolvedValue(jsonRes(false, { message: 'Please wait a moment' }, 429));

      var ret;
      await act(async function() {
        ret = await h.result.current.sendMagicLink('coach@example.com', 'team-42');
      });

      expect(ret).toEqual({ success: false, error: 'Please wait a moment' });

      await h.unmount();
    });

    it('C4: network throw → { success: false, error: "Network error — check your connection" }', async function() {
      mocks.auth.getSession.mockResolvedValue({ data: { session: null } });
      var h = await renderHook(function() { return useAuth(); });
      await settle();

      global.fetch.mockRejectedValue(new Error('network down'));

      var ret;
      await act(async function() {
        ret = await h.result.current.sendMagicLink('coach@example.com', 'team-42');
      });

      expect(ret).toEqual({ success: false, error: 'Network error — check your connection' });

      await h.unmount();
    });
  });
});
