/**
 * dbDeleteTeam.test.js — coverage for the untested dbDeleteTeam() helper (#424).
 *
 * dbDeleteTeam was flagged as fully untested in the #424 survey. Harness
 * mirrors dbSaveTeams.test.js (#424): mock @supabase/supabase-js so the
 * module-level createClient() call returns a controllable chain, force both
 * VITE_SUPABASE_* vars to '' via vi.stubEnv for the guard case (per #431 —
 * frontend/.env carries real anon credentials that Vite's loadEnv supplies
 * by default, so merely leaving env unstubbed does NOT guarantee a null
 * client), and re-import the module per test.
 *
 * Chain shape: from('teams').delete().eq('id', teamId) -> fakeResultRef.current
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// ── Hoisted refs so each test controls what the chain terminal resolves to ──
var { fakeResultRef, eqSpy } = vi.hoisted(function() {
  return {
    fakeResultRef: { current: null },
    eqSpy: vi.fn(),
  };
});

// Mock @supabase/supabase-js so supabase.js' module-level createClient() call
// returns a controllable chain. Real Supabase is never contacted.
//   delete: from('teams').delete().eq('id', teamId) -> fakeResultRef.current
vi.mock('@supabase/supabase-js', function() {
  return {
    createClient: function() {
      return {
        from: function() {
          return {
            delete: function() {
              return {
                eq: function(col, val) {
                  eqSpy(col, val);
                  return fakeResultRef.current;
                },
              };
            },
          };
        },
      };
    },
  };
});

describe('dbDeleteTeam — untested DB helper coverage (#424)', function() {

  // ── Case 1: guard — no supabase client means no-op, never calls delete/eq ──
  describe('guard: no supabase client (env forced empty)', function() {
    beforeEach(function() {
      // frontend/.env carries real (anon, non-secret) Supabase credentials
      // that Vite's loadEnv supplies to import.meta.env by default — merely
      // NOT calling vi.stubEnv does not guarantee falsy values (#431). Force
      // both vars to '' explicitly so supabaseUrl && supabaseKey is falsy
      // regardless of what real .env files are present on this machine.
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
      vi.resetModules();
      eqSpy.mockClear();
      fakeResultRef.current = null;
    });

    afterEach(function() {
      vi.unstubAllEnvs();
    });

    it('1: env forced empty → supabase is null, dbDeleteTeam resolves undefined and NEVER calls delete/eq', async function() {
      var mod = await import('../supabase.js');

      var r = await mod.dbDeleteTeam('team-1');
      expect(r).toBeUndefined();
      expect(eqSpy).not.toHaveBeenCalled();
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
      eqSpy.mockClear();
      fakeResultRef.current = null;
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(function() {});
    });

    afterEach(function() {
      warnSpy.mockRestore();
    });

    // ── Case 2: error path → REJECTS with Error carrying .code + .operation, and warns ──
    it('2: Supabase { error } → promise REJECTS with an Error carrying .code + .operation, and console.warn IS called', async function() {
      fakeResultRef.current = Promise.resolve({ error: { message: 'boom', code: '42501' } });
      var mod = await import('../supabase.js');

      var caught;
      try {
        await mod.dbDeleteTeam('team-1');
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(Error);
      expect(caught.message).toBe('boom');
      expect(caught.code).toBe('42501');
      expect(caught.operation).toBe('dbDeleteTeam');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    // ── Case 3: error fallback — missing .message falls back to 'write failed' ──
    it("3: Supabase { error } with no .message → rejected Error.message falls back to 'write failed'", async function() {
      fakeResultRef.current = Promise.resolve({ error: { code: 'X' } });
      var mod = await import('../supabase.js');

      await expect(mod.dbDeleteTeam('team-1')).rejects.toThrow('write failed');
    });

    // ── Case 4: success path → resolves with raw response, console.warn NOT called ──
    it('4: Supabase { error: null } → promise RESOLVES with the response object, and console.warn is NOT called', async function() {
      fakeResultRef.current = Promise.resolve({ data: null, error: null });
      var mod = await import('../supabase.js');

      var r = await mod.dbDeleteTeam('team-1');
      expect(r).toEqual({ data: null, error: null });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    // ── Case 5: argument shape — eq() is called with ('id', teamId) ──
    it("5: eq() is called with ('id', teamId) — the correct delete target", async function() {
      fakeResultRef.current = Promise.resolve({ data: null, error: null });
      var mod = await import('../supabase.js');

      await mod.dbDeleteTeam('team-42');

      expect(eqSpy).toHaveBeenCalledTimes(1);
      expect(eqSpy).toHaveBeenCalledWith('id', 'team-42');
    });

  });

});
