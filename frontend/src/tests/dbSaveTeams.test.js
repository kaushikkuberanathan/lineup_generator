/**
 * dbSaveTeams.test.js — coverage for the dbSaveTeams() helper (#424, updated #561).
 *
 * REWRITTEN for #561: dbSaveTeams() no longer calls .upsert(rows, { onConflict:
 * 'id' }) — that construct made Postgres enforce the UPDATE policy's WITH CHECK
 * even for a brand-new row with no real conflict (documented Postgres RLS
 * behavior with ON CONFLICT DO UPDATE, confirmed empirically against a real
 * project — see backend/migrations/018's header), unconditionally RLS-denying
 * every self-serve team creation. The fix: a plain .insert() per team, falling
 * back to an explicit .update().eq('id', ...) ONLY on a real conflict (Postgres
 * unique_violation, error.code === '23505'). Mock chain updated to match:
 * from('teams').insert(row) and from('teams').update(row).eq('id', id).
 *
 * Harness conventions unchanged from #424/#418: mock @supabase/supabase-js so
 * the module-level createClient() call returns a controllable chain, stub the
 * VITE_SUPABASE_* env so supabase.js instantiates a NON-null client, and
 * re-import the module per test. The guard case (no supabase client) is split
 * into its own nested describe that forces both VITE_SUPABASE_* vars to '' via
 * vi.stubEnv, rather than relying on them being unset — frontend/.env carries
 * real (anon, non-secret) credentials that Vite's loadEnv supplies by default,
 * so merely not stubbing does NOT guarantee supabase.js sees falsy values.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// ── Hoisted refs so each test controls what each chain terminal resolves to ──
var { fakeInsertRef, fakeUpdateRef, insertSpy, updateSpy, eqSpy } = vi.hoisted(function() {
  return {
    fakeInsertRef: { current: null },
    fakeUpdateRef: { current: null },
    insertSpy: vi.fn(),
    updateSpy: vi.fn(),
    eqSpy: vi.fn(),
  };
});

// Mock @supabase/supabase-js so supabase.js' module-level createClient() call
// returns a controllable chain. Real Supabase is never contacted.
//   insert path: from('teams').insert(row) -> fakeInsertRef.current
//   fallback path: from('teams').update(row).eq('id', id) -> fakeUpdateRef.current
vi.mock('@supabase/supabase-js', function() {
  return {
    createClient: function() {
      return {
        from: function() {
          return {
            insert: function(row) {
              insertSpy(row);
              return fakeInsertRef.current;
            },
            update: function(row) {
              updateSpy(row);
              return {
                eq: function(col, val) {
                  eqSpy(col, val);
                  return fakeUpdateRef.current;
                },
              };
            },
          };
        },
      };
    },
  };
});

describe('dbSaveTeams — insert-with-conflict-fallback (#424, #561)', function() {

  // ── Case 1: guard — no supabase client means no-op, never calls insert ──
  describe('guard: no supabase client (env forced empty)', function() {
    beforeEach(function() {
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
      vi.resetModules();
      insertSpy.mockClear();
      updateSpy.mockClear();
      eqSpy.mockClear();
      fakeInsertRef.current = null;
      fakeUpdateRef.current = null;
    });

    afterEach(function() {
      vi.unstubAllEnvs();
    });

    it('1: env forced empty → supabase is null, dbSaveTeams resolves undefined and NEVER calls insert', async function() {
      var mod = await import('../supabase.js');

      var r = await mod.dbSaveTeams([{ id: 't1', name: 'Mud Hens' }]);
      expect(r).toBeUndefined();
      expect(insertSpy).not.toHaveBeenCalled();
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
      insertSpy.mockClear();
      updateSpy.mockClear();
      eqSpy.mockClear();
      fakeInsertRef.current = null;
      fakeUpdateRef.current = null;
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(function() {});
    });

    afterEach(function() {
      warnSpy.mockRestore();
    });

    // ── Case 2: insert succeeds (new team, no conflict) → resolves, update NEVER called ──
    it('2: insert succeeds → promise resolves, update/eq are NEVER called', async function() {
      fakeInsertRef.current = Promise.resolve({ data: [{}], error: null });
      var mod = await import('../supabase.js');

      var r = await mod.dbSaveTeams([{ id: 't1', name: 'Mud Hens' }]);
      expect(r).toEqual([{ data: [{}], error: null }]);
      expect(insertSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    // ── Case 3: insert fails with a NON-conflict error → REJECTS, update NEVER called ──
    it('3: insert fails with a non-23505 error → promise REJECTS with an Error carrying .code + .operation, update is NEVER called, console.warn IS called', async function() {
      fakeInsertRef.current = Promise.resolve({ error: { message: 'boom', code: '42501' } });
      var mod = await import('../supabase.js');

      var caught;
      try {
        await mod.dbSaveTeams([{ id: 't1', name: 'Mud Hens' }]);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(Error);
      expect(caught.message).toBe('boom');
      expect(caught.code).toBe('42501');
      expect(caught.operation).toBe('dbSaveTeams');
      expect(updateSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    // ── Case 4: error fallback — missing .message falls back to 'write failed' ──
    it("4: insert fails with no .message and a non-23505 code → rejected Error.message falls back to 'write failed'", async function() {
      fakeInsertRef.current = Promise.resolve({ error: { code: 'X' } });
      var mod = await import('../supabase.js');

      await expect(mod.dbSaveTeams([{ id: 't1', name: 'Mud Hens' }])).rejects.toThrow('write failed');
    });

    // ── Case 5: real conflict (23505) → falls back to update().eq('id', id), succeeds ──
    it("5: insert fails with 23505 → falls back to update().eq('id', id); success resolves, no warn", async function() {
      fakeInsertRef.current = Promise.resolve({ error: { code: '23505', message: 'duplicate key' } });
      fakeUpdateRef.current = Promise.resolve({ data: [{}], error: null });
      var mod = await import('../supabase.js');

      var r = await mod.dbSaveTeams([{ id: 't1', name: 'Mud Hens' }]);
      expect(r).toEqual([{ data: [{}], error: null }]);
      expect(insertSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(eqSpy).toHaveBeenCalledWith('id', 't1');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    // ── Case 6: real conflict (23505), fallback update ALSO fails → REJECTS ──
    it('6: insert fails with 23505 AND the fallback update fails → promise REJECTS with the update error, console.warn IS called', async function() {
      fakeInsertRef.current = Promise.resolve({ error: { code: '23505', message: 'duplicate key' } });
      fakeUpdateRef.current = Promise.resolve({ error: { message: 'not your team', code: '42501' } });
      var mod = await import('../supabase.js');

      var caught;
      try {
        await mod.dbSaveTeams([{ id: 't1', name: 'Mud Hens' }]);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(Error);
      expect(caught.message).toBe('not your team');
      expect(caught.code).toBe('42501');
      expect(caught.operation).toBe('dbSaveTeams');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    // ── Case 7: mapping/defaults — missing ageGroup/year/sport get defaulted, same row passed to insert AND the update fallback ──
    it('7: teams missing ageGroup/year/sport → both insert and update-fallback receive defaulted age_group/year/sport', async function() {
      fakeInsertRef.current = Promise.resolve({ error: { code: '23505', message: 'duplicate key' } });
      fakeUpdateRef.current = Promise.resolve({ data: [{}], error: null });
      var mod = await import('../supabase.js');

      await mod.dbSaveTeams([{ id: 't1', name: 'Mud Hens' }]);

      var expectedRow = {
        id:        't1',
        name:      'Mud Hens',
        age_group: '',
        year:      new Date().getFullYear(),
        sport:     'baseball'
      };
      expect(insertSpy.mock.calls[0][0]).toEqual(expectedRow);
      expect(updateSpy.mock.calls[0][0]).toEqual(expectedRow);
    });

  });

});
