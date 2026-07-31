/**
 * dbLoadTeams.test.js — coverage for the untested dbLoadTeams() helper (#424).
 *
 * dbLoadTeams was flagged as fully untested in the #424 survey (Group B).
 * Harness mirrors dbSaveTeams.test.js (#424): mock @supabase/supabase-js so
 * the module-level createClient() call returns a controllable chain, force
 * both VITE_SUPABASE_* vars to '' via vi.stubEnv for the guard case (per
 * #431 — frontend/.env carries real anon credentials that Vite's loadEnv
 * supplies by default, so merely leaving env unstubbed does NOT guarantee a
 * null client), and re-import the module per test.
 *
 * dbLoadTeams is a LOAD function, not a write — its guard/error shape is
 * asymmetric from dbSaveTeams/dbDeleteTeam/dbSaveShareLink:
 *   - guard (no supabase client) resolves NULL, not undefined
 *   - error path resolves NULL (never throws) and warns with r.error.message
 *     (a string), not the whole r.error object
 *
 * Chain shape: from('teams').select('*').order('created_at', {ascending:true})
 *   -> fakeResultRef.current
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// ── Hoisted refs so each test controls what the chain terminal resolves to ──
var { fakeResultRef, selectSpy, orderSpy } = vi.hoisted(function() {
  return {
    fakeResultRef: { current: null },
    selectSpy: vi.fn(),
    orderSpy: vi.fn(),
  };
});

// Mock @supabase/supabase-js so supabase.js' module-level createClient() call
// returns a controllable chain. Real Supabase is never contacted.
//   load: from('teams').select('*').order('created_at', {ascending:true})
//         -> fakeResultRef.current
vi.mock('@supabase/supabase-js', function() {
  return {
    createClient: function() {
      return {
        from: function() {
          return {
            select: function(cols) {
              selectSpy(cols);
              return {
                order: function(col, opts) {
                  orderSpy(col, opts);
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

describe('dbLoadTeams — untested DB helper coverage (#424)', function() {

  // ── Case 1: guard — no supabase client resolves NULL (not undefined), select never called ──
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
      selectSpy.mockClear();
      orderSpy.mockClear();
      fakeResultRef.current = null;
    });

    afterEach(function() {
      vi.unstubAllEnvs();
    });

    it('1: env forced empty → supabase is null, dbLoadTeams resolves null (NOT undefined) and NEVER calls select', async function() {
      var mod = await import('../supabase.js');

      var r = await mod.dbLoadTeams();
      expect(r).toBeNull();
      expect(selectSpy).not.toHaveBeenCalled();
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
      selectSpy.mockClear();
      orderSpy.mockClear();
      fakeResultRef.current = null;
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(function() {});
    });

    afterEach(function() {
      warnSpy.mockRestore();
    });

    // ── Case 2: call shape — select('*').order('created_at', {ascending:true}) ──
    it("2: query is built as select('*').order('created_at', { ascending: true })", async function() {
      fakeResultRef.current = Promise.resolve({ data: [], error: null });
      var mod = await import('../supabase.js');

      await mod.dbLoadTeams();

      expect(selectSpy).toHaveBeenCalledTimes(1);
      expect(selectSpy).toHaveBeenCalledWith('*');
      expect(orderSpy).toHaveBeenCalledTimes(1);
      expect(orderSpy).toHaveBeenCalledWith('created_at', { ascending: true });
    });

    // ── Case 3: error path — resolves NULL (does not throw), warns with r.error.message ──
    it('3: Supabase { error } → dbLoadTeams RESOLVES null (does NOT throw), console.warn called with r.error.message', async function() {
      fakeResultRef.current = Promise.resolve({ error: { message: 'boom', code: '42501' } });
      var mod = await import('../supabase.js');

      var r = await mod.dbLoadTeams();
      expect(r).toBeNull();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith('[DB] loadTeams error:', 'boom');
    });

    // ── Case 4: success, empty data → resolves [] ──
    it('4: Supabase { data: [], error: null } → resolves an empty array', async function() {
      fakeResultRef.current = Promise.resolve({ data: [], error: null });
      var mod = await import('../supabase.js');

      var r = await mod.dbLoadTeams();
      expect(r).toEqual([]);
    });

    // ── Case 4b: success, null data → still resolves [] (the `|| []` fallback) ──
    it('4b: Supabase { data: null, error: null } → resolves an empty array (data fallback)', async function() {
      fakeResultRef.current = Promise.resolve({ data: null, error: null });
      var mod = await import('../supabase.js');

      var r = await mod.dbLoadTeams();
      expect(r).toEqual([]);
    });

    // ── Case 5: success, rows present → snake_case -> camelCase mapping ──
    it('5: Supabase rows → each mapped to { id, name, ageGroup, year, sport } (snake_case to camelCase)', async function() {
      fakeResultRef.current = Promise.resolve({
        data: [
          { id: 't1', name: 'Mud Hens', age_group: '8U', year: 2026, sport: 'baseball' },
          { id: 't2', name: 'Party Animals', age_group: '10U', year: 2026, sport: 'baseball' },
        ],
        error: null,
      });
      var mod = await import('../supabase.js');

      var r = await mod.dbLoadTeams();
      expect(r).toEqual([
        { id: 't1', name: 'Mud Hens', ageGroup: '8U', year: 2026, sport: 'baseball' },
        { id: 't2', name: 'Party Animals', ageGroup: '10U', year: 2026, sport: 'baseball' },
      ]);
    });

  });

});
