/**
 * useAuth.requestAccess.test.js
 *
 * Unit spec for requestAccess() — specifically the `preserveSession` option
 * added for Story 124 (#655)'s Home tab "add a second team" flow. Before this
 * option existed, requestAccess() unconditionally called setAuthState
 * ('pending_approval') and overwrote lg_team_id/lg_pending_email in
 * localStorage on success — reusing it as-is from an already-authenticated
 * Home tab context would have kicked a logged-in coach out to the
 * pending-approval screen. Zero prior coverage existed for requestAccess()
 * at the hook level (only mocked at the App-routing-test level).
 *
 * Mirrors useAuth.updateProfileName.test.js's harness: vi.hoisted Supabase
 * mock, vi.mock('../supabase'), src/tests/helpers/renderHook.
 *
 * Cases:
 *   1. default (no options arg)        → setAuthState + both localStorage keys (locks in existing behavior)
 *   2. preserveSession: false explicit → same as default (no behavior drift)
 *   3. preserveSession: true, success  → success:true, NONE of the three side effects fire
 *   4. preserveSession: true, REQUEST_PENDING → pending:true, setAuthState NOT called
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

var REQUEST_PATH = '/api/v1/auth/request-access';

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

describe('useAuth — requestAccess preserveSession option (#655)', function() {

  beforeEach(function() {
    vi.clearAllMocks();
    // No existing session — mount resolves to 'unauthenticated' without any
    // /me fetch, so global.fetch stays clean for the requestAccess call itself.
    mocks.auth.getSession.mockResolvedValue({ data: { session: null } });
    mocks.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    global.fetch = vi.fn();
    localStorage.clear();
  });

  afterEach(function() {
    delete global.fetch;
  });

  async function mountAuth() {
    var h = await renderHook(function() { return useAuth(); });
    await settle();
    global.fetch.mockClear();
    return h;
  }

  var PAYLOAD = { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', role: 'viewer', tid: '999' };

  // ── Case 1: default (no options arg) — existing behavior locked in ────────
  it('1: default (no options) success → setAuthState(pending_approval) + both localStorage keys set', async function() {
    var h = await mountAuth();
    global.fetch.mockResolvedValueOnce(jsonRes(true, { success: true }));

    var ret;
    await act(async function() {
      ret = await h.result.current.requestAccess(PAYLOAD);
    });

    expect(ret).toEqual({ success: true });
    expect(h.result.current.authState).toBe('pending_approval');
    expect(localStorage.getItem('lg_team_id')).toBe('999');
    expect(localStorage.getItem('lg_pending_email')).toBe('jane@example.com');

    await h.unmount();
  });

  // ── Case 2: preserveSession explicitly false — no drift from default ──────
  it('2: preserveSession:false explicit → identical to default (no behavior drift)', async function() {
    var h = await mountAuth();
    global.fetch.mockResolvedValueOnce(jsonRes(true, { success: true }));

    var ret;
    await act(async function() {
      ret = await h.result.current.requestAccess(PAYLOAD, { preserveSession: false });
    });

    expect(ret).toEqual({ success: true });
    expect(h.result.current.authState).toBe('pending_approval');
    expect(localStorage.getItem('lg_team_id')).toBe('999');
    expect(localStorage.getItem('lg_pending_email')).toBe('jane@example.com');

    await h.unmount();
  });

  // ── Case 3: preserveSession:true, success → no side effects ────────────────
  it('3: preserveSession:true, success → success:true but authState/localStorage untouched', async function() {
    var h = await mountAuth();
    global.fetch.mockResolvedValueOnce(jsonRes(true, { success: true }));

    var ret;
    await act(async function() {
      ret = await h.result.current.requestAccess(PAYLOAD, { preserveSession: true });
    });

    expect(ret).toEqual({ success: true });
    // Mount already settled authState to 'unauthenticated' (no session) —
    // preserveSession must leave it exactly there, not flip to pending_approval.
    expect(h.result.current.authState).toBe('unauthenticated');
    expect(localStorage.getItem('lg_team_id')).toBeNull();
    expect(localStorage.getItem('lg_pending_email')).toBeNull();

    await h.unmount();
  });

  // ── Case 4: preserveSession:true, REQUEST_PENDING → still no setAuthState ──
  it('4: preserveSession:true, REQUEST_PENDING → pending:true but setAuthState not called', async function() {
    var h = await mountAuth();
    global.fetch.mockResolvedValueOnce(jsonRes(false, { error: 'REQUEST_PENDING' }, 409));

    var ret;
    await act(async function() {
      ret = await h.result.current.requestAccess(PAYLOAD, { preserveSession: true });
    });

    expect(ret).toEqual({ success: true, pending: true });
    expect(h.result.current.authState).toBe('unauthenticated');

    await h.unmount();
  });

  // ── Sanity: request body/URL shape unchanged by the new option ─────────────
  it('5: request body and URL are unaffected by the options argument', async function() {
    var h = await mountAuth();
    global.fetch.mockResolvedValueOnce(jsonRes(true, { success: true }));

    await act(async function() {
      await h.result.current.requestAccess(PAYLOAD, { preserveSession: true });
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    var url = global.fetch.mock.calls[0][0];
    var opts = global.fetch.mock.calls[0][1];
    expect(url).toContain(REQUEST_PATH);
    expect(opts.method).toBe('POST');
    var body = JSON.parse(opts.body);
    expect(body.requestedRole).toBe('viewer');
    expect(body.teamId).toBe('999');

    await h.unmount();
  });

});
