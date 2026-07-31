/**
 * dbGetRosterSnapshots.test.js — coverage for the untested
 * dbGetRosterSnapshots() helper (#424).
 *
 * dbGetRosterSnapshots was flagged as fully untested in the #424 survey
 * (Group B, async). Harness mirrors dbSaveTeams.test.js (#424): mock
 * @supabase/supabase-js so the module-level createClient() call returns a
 * controllable chain, force both VITE_SUPABASE_* vars to '' via vi.stubEnv
 * for the guard case (per #431 — frontend/.env carries real anon
 * credentials that Vite's loadEnv supplies by default, so merely leaving
 * env unstubbed does NOT guarantee a null client), and re-import the module
 * per test.
 *
 * Silent-fail-by-design, like dbSnapshotRoster: a thrown/rejected query is
 * caught with an empty-bodied catch that returns [] — no console.warn.
 *
 * Chain shape: from('roster_snapshots').select('*').eq('team_id', teamId)
 *   .order('snapshot_at', { ascending: false }).limit(5) -> fakeResultRef.current
 *   (or throws synchronously, controlled via limitShouldThrow, for case 3)
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// ── Hoisted refs so each test controls what the chain terminal does ──
var { fakeResultRef, selectSpy, eqSpy, orderSpy, limitSpy, limitShouldThrow } = vi.hoisted(function() {
  return {
    fakeResultRef: { current: null },
    selectSpy: vi.fn(),
    eqSpy: vi.fn(),
    orderSpy: vi.fn(),
    limitSpy: vi.fn(),
    limitShouldThrow: { current: false },
  };
});

// Mock @supabase/supabase-js so supabase.js' module-level createClient() call
// returns a controllable chain. Real Supabase is never contacted.
//   from('roster_snapshots').select('*').eq('team_id', teamId)
//     .order('snapshot_at', { ascending: false }).limit(5) -> fakeResultRef.current
//   (or throws synchronously when limitShouldThrow.current is true)
vi.mock('@supabase/supabase-js', function() {
  return {
    createClient: function() {
      return {
        from: function() {
          return {
            select: function(cols) {
              selectSpy(cols);
              return {
                eq: function(col, val) {
                  eqSpy(col, val);
                  return {
                    order: function(col2, opts) {
                      orderSpy(col2, opts);
                      return {
                        limit: function(n) {
                          limitSpy(n);
                          if (limitShouldThrow.current) { throw new Error('boom'); }
                          return fakeResultRef.current;
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
});

describe('dbGetRosterSnapshots — untested DB helper coverage (#424)', function() {

  // ── Case 1: guard — no supabase client → [], select never called ──
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
      eqSpy.mockClear();
      orderSpy.mockClear();
      limitSpy.mockClear();
      limitShouldThrow.current = false;
      fakeResultRef.current = null;
    });

    afterEach(function() {
      vi.unstubAllEnvs();
    });

    it('1: env forced empty → supabase is null, dbGetRosterSnapshots resolves [] and NEVER calls select', async function() {
      var mod = await import('../supabase.js');

      var r = await mod.dbGetRosterSnapshots('team-1');
      expect(r).toEqual([]);
      expect(selectSpy).not.toHaveBeenCalled();
    });
  });

  describe('with supabase client configured', function() {
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
      eqSpy.mockClear();
      orderSpy.mockClear();
      limitSpy.mockClear();
      limitShouldThrow.current = false;
      fakeResultRef.current = Promise.resolve({ data: [], error: null });
    });

    // ── Case 2: query call shape ──
    it("2: query is built as select('*').eq('team_id', teamId).order('snapshot_at', { ascending: false }).limit(5)", async function() {
      var mod = await import('../supabase.js');

      await mod.dbGetRosterSnapshots('team-42');

      expect(selectSpy).toHaveBeenCalledTimes(1);
      expect(selectSpy).toHaveBeenCalledWith('*');
      expect(eqSpy).toHaveBeenCalledTimes(1);
      expect(eqSpy).toHaveBeenCalledWith('team_id', 'team-42');
      expect(orderSpy).toHaveBeenCalledTimes(1);
      expect(orderSpy).toHaveBeenCalledWith('snapshot_at', { ascending: false });
      expect(limitSpy).toHaveBeenCalledTimes(1);
      expect(limitSpy).toHaveBeenCalledWith(5);
    });

    // ── Case 3: query throws/rejects → caught, returns [] ──
    it('3: query throws → caught, resolves [] (not propagated)', async function() {
      limitShouldThrow.current = true;
      var mod = await import('../supabase.js');

      var r = await mod.dbGetRosterSnapshots('team-1');
      expect(r).toEqual([]);
    });

    // ── Case 4: success, data present → returns res.data ──
    it('4: success with data present → returns res.data verbatim', async function() {
      var rows = [{ id: 's1', team_id: 'team-1' }, { id: 's2', team_id: 'team-1' }];
      fakeResultRef.current = Promise.resolve({ data: rows, error: null });
      var mod = await import('../supabase.js');

      var r = await mod.dbGetRosterSnapshots('team-1');
      expect(r).toBe(rows);
    });

    // ── Case 5: success, data null/undefined → returns [] (the `res.data || []` fallback) ──
    it('5: success with data null or undefined → returns [] (data fallback)', async function() {
      var mod = await import('../supabase.js');

      fakeResultRef.current = Promise.resolve({ data: null, error: null });
      var r1 = await mod.dbGetRosterSnapshots('team-1');
      expect(r1).toEqual([]);

      fakeResultRef.current = Promise.resolve({ data: undefined, error: null });
      var r2 = await mod.dbGetRosterSnapshots('team-1');
      expect(r2).toEqual([]);
    });

  });

});
