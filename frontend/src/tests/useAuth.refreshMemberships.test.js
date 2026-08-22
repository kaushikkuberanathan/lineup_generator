/**
 * useAuth.refreshMemberships.test.js
 *
 * Unit spec for refreshMemberships() — added for Story 135 (#729 follow-up).
 * createTeam() provisions a membership row server-side but the client's
 * `memberships` state was never refreshed, so the new team stayed invisible
 * in membership-filtered views (Account, and now Home per Story 134) until
 * the next reload/re-login. refreshMemberships() re-fetches /me and updates
 * memberships/membership only — it must NOT touch authState or user.
 *
 * Mirrors useAuth.updateProfileName.test.js's harness: vi.hoisted Supabase
 * mock, vi.mock('../supabase'), src/tests/helpers/renderHook.
 *
 * Cases:
 *   1. session + fetch ok    → memberships/membership updated from the response
 *   2. session + fetch fails → memberships/membership untouched (not cleared)
 *   3. session + fetch throws → memberships/membership untouched
 *   4. no session             → fetch never attempted, state untouched
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { renderHook } from './helpers/renderHook.js';

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

var MOCK_SESSION = {
  access_token: 'test-token-abc',
  user: { id: 'u1', email: 'coach@example.com' },
};

var MOUNT_USER = {
  id: 'u1',
  profile: { first_name: 'Casey', last_name: '' },
  memberships: [{ id: 'm1', user_id: 'u1', team_id: 't1', role: 'coach', status: 'active' }],
};

var REFETCH_USER = {
  id: 'u1',
  profile: { first_name: 'Casey', last_name: '' },
  memberships: [
    { id: 'm1', user_id: 'u1', team_id: 't1', role: 'coach', status: 'active' },
    { id: 'm2', user_id: 'u1', team_id: 't2', role: 'admin', status: 'active' },
  ],
};

var ME_PATH = '/api/v1/auth/me';

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

describe('useAuth — refreshMemberships (#729 / Story 135)', function() {

  beforeEach(function() {
    vi.clearAllMocks();
    mocks.auth.getSession.mockResolvedValue({ data: { session: MOCK_SESSION } });
    mocks.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    mocks.auth.signOut.mockResolvedValue({});
    global.fetch = vi.fn().mockResolvedValue(jsonRes(true, { success: true, user: MOUNT_USER }));
  });

  afterEach(function() {
    delete global.fetch;
  });

  async function mountAuthenticated() {
    var h = await renderHook(function() { return useAuth(); });
    await settle();
    global.fetch.mockClear();
    return h;
  }

  it('1: session + fetch ok → memberships/membership updated, user/authState untouched', async function() {
    var h = await mountAuthenticated();
    expect(h.result.current.memberships).toEqual(MOUNT_USER.memberships);
    var userBefore = h.result.current.user;
    var authStateBefore = h.result.current.authState;

    global.fetch.mockResolvedValueOnce(jsonRes(true, { user: REFETCH_USER }));

    await act(async function() {
      await h.result.current.refreshMemberships();
    });

    expect(h.result.current.memberships).toEqual(REFETCH_USER.memberships);
    expect(h.result.current.membership).toEqual(REFETCH_USER.memberships[0]);
    expect(h.result.current.user).toBe(userBefore);
    expect(h.result.current.authState).toBe(authStateBefore);

    var calls = global.fetch.mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][0]).toContain(ME_PATH);
    expect(calls[0][1].method).toBeUndefined();
    expect(calls[0][1].headers.Authorization).toBe('Bearer test-token-abc');

    await h.unmount();
  });

  it('2: fetch non-ok → memberships untouched', async function() {
    var h = await mountAuthenticated();
    var membershipsBefore = h.result.current.memberships;

    global.fetch.mockResolvedValueOnce(jsonRes(false, { error: 'INTERNAL_ERROR' }, 500));

    await act(async function() {
      await h.result.current.refreshMemberships();
    });

    expect(h.result.current.memberships).toEqual(membershipsBefore);

    await h.unmount();
  });

  it('3: fetch throws → memberships untouched, no unhandled rejection', async function() {
    var h = await mountAuthenticated();
    var membershipsBefore = h.result.current.memberships;

    global.fetch.mockRejectedValueOnce(new Error('network down'));

    await act(async function() {
      await h.result.current.refreshMemberships();
    });

    expect(h.result.current.memberships).toEqual(membershipsBefore);

    await h.unmount();
  });

  it('4: no session → fetch never attempted', async function() {
    mocks.auth.getSession.mockResolvedValue({ data: { session: null } });

    var h = await renderHook(function() { return useAuth(); });
    await settle();
    global.fetch.mockClear();

    await act(async function() {
      await h.result.current.refreshMemberships();
    });

    expect(global.fetch).not.toHaveBeenCalled();

    await h.unmount();
  });

});
