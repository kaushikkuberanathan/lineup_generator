/**
 * dbDeleteTeam.test.js — coverage for the dbDeleteTeam() helper (#424, updated #380).
 *
 * REWRITTEN for #380: dbDeleteTeam() no longer writes directly to Supabase
 * (`.from('teams').delete().eq(...)`) — it now calls the backend's
 * `DELETE /api/v1/teams/:teamId` route (service_role, admin-membership
 * checked server-side), authenticated via the current Supabase session's
 * access token. Session is read internally via `supabase.auth.getSession()`
 * so the function's external signature and every call site are unchanged.
 *
 * Mock shape: createClient() returns `{ auth: { getSession } }` (no `.from`
 * needed — this function never touches the DB directly anymore) and
 * `global.fetch` is stubbed for the backend call.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// ── Hoisted refs so each test controls what each seam resolves to ──
var { fakeSessionRef, fakeFetchResponseRef, getSessionSpy, fetchSpy } = vi.hoisted(function() {
  return {
    fakeSessionRef: { current: null },
    fakeFetchResponseRef: { current: null },
    getSessionSpy: vi.fn(),
    fetchSpy: vi.fn(),
  };
});

vi.mock('@supabase/supabase-js', function() {
  return {
    createClient: function() {
      return {
        auth: {
          getSession: function() {
            getSessionSpy();
            return Promise.resolve({ data: { session: fakeSessionRef.current } });
          },
        },
      };
    },
  };
});

describe('dbDeleteTeam — backend-routed delete (#424, #380)', function() {

  // ── Case 1: guard — no supabase client means no-op, never calls fetch ──
  describe('guard: no supabase client (env forced empty)', function() {
    beforeEach(function() {
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
      vi.resetModules();
      getSessionSpy.mockClear();
      fetchSpy.mockClear();
      fakeSessionRef.current = null;
      global.fetch = fetchSpy;
    });

    afterEach(function() {
      vi.unstubAllEnvs();
    });

    it('1: env forced empty → supabase is null, dbDeleteTeam resolves undefined and NEVER calls fetch', async function() {
      var mod = await import('../supabase.js');

      var r = await mod.dbDeleteTeam('team-1');
      expect(r).toBeUndefined();
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('with supabase client configured', function() {
    var warnSpy;

    beforeAll(function() {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    });

    afterAll(function() {
      vi.unstubAllEnvs();
    });

    beforeEach(function() {
      vi.resetModules();
      getSessionSpy.mockClear();
      fetchSpy.mockClear();
      fakeSessionRef.current = null;
      fakeFetchResponseRef.current = null;
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(function() {});
      global.fetch = fetchSpy;
    });

    afterEach(function() {
      warnSpy.mockRestore();
    });

    // ── Case 2: no session → REJECTS with NO_SESSION, fetch NEVER called ──
    it('2: no active session → promise REJECTS with code NO_SESSION, fetch is NEVER called', async function() {
      fakeSessionRef.current = null;
      var mod = await import('../supabase.js');

      var caught;
      try {
        await mod.dbDeleteTeam('team-1');
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(Error);
      expect(caught.message).toBe('Not signed in');
      expect(caught.code).toBe('NO_SESSION');
      expect(caught.operation).toBe('dbDeleteTeam');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    // ── Case 3: backend error response → REJECTS with Error carrying .code + .operation, and warns ──
    it('3: backend responds not-ok → promise REJECTS with an Error carrying .code + .operation, and console.warn IS called', async function() {
      fakeSessionRef.current = { access_token: 'tok-123' };
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 403,
        json: function() { return Promise.resolve({ error: 'NOT_TEAM_ADMIN' }); },
      });
      var mod = await import('../supabase.js');

      var caught;
      try {
        await mod.dbDeleteTeam('team-1');
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(Error);
      expect(caught.message).toBe('NOT_TEAM_ADMIN');
      expect(caught.code).toBe('NOT_TEAM_ADMIN');
      expect(caught.operation).toBe('dbDeleteTeam');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    // ── Case 4: backend error with no parseable body → falls back to the HTTP status ──
    it("4: backend responds not-ok with an unparseable body → error code falls back to the HTTP status", async function() {
      fakeSessionRef.current = { access_token: 'tok-123' };
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        json: function() { return Promise.reject(new Error('not json')); },
      });
      var mod = await import('../supabase.js');

      await expect(mod.dbDeleteTeam('team-1')).rejects.toThrow('write failed');
    });

    // ── Case 5: success path → resolves with the response body, console.warn NOT called ──
    it('5: backend responds ok → promise RESOLVES with the response body, and console.warn is NOT called', async function() {
      fakeSessionRef.current = { access_token: 'tok-123' };
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: function() { return Promise.resolve({ ok: true }); },
      });
      var mod = await import('../supabase.js');

      var r = await mod.dbDeleteTeam('team-1');
      expect(r).toEqual({ ok: true });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    // ── Case 6: request shape — correct URL, method, and Authorization header ──
    it('6: fetch is called with the correct URL, DELETE method, and Bearer token', async function() {
      fakeSessionRef.current = { access_token: 'tok-xyz' };
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: function() { return Promise.resolve({ ok: true }); },
      });
      var mod = await import('../supabase.js');

      await mod.dbDeleteTeam('team-42');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      var callArgs = fetchSpy.mock.calls[0];
      expect(callArgs[0]).toContain('/api/v1/teams/team-42');
      expect(callArgs[1].method).toBe('DELETE');
      expect(callArgs[1].headers.Authorization).toBe('Bearer tok-xyz');
    });

  });

});
