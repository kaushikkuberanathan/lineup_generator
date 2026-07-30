/**
 * dbSaveTeams.test.js — coverage for the untested dbSaveTeams() helper (#424).
 *
 * dbSaveTeams was flagged as fully untested in the #424 survey (6 untested +
 * 1 partial supabase.js DB helpers). Harness mirrors dbSaveTeamData.test.js
 * (#418): mock @supabase/supabase-js so the module-level createClient() call
 * returns a controllable chain, stub the VITE_SUPABASE_* env so supabase.js
 * instantiates a NON-null client, and re-import the module per test.
 *
 * Unlike dbSaveTeamData, dbSaveTeams has no load counterpart in this file —
 * the mock chain only needs a single .upsert() terminal. The guard case (no
 * supabase client) is split into its own nested describe that forces both
 * VITE_SUPABASE_* vars to '' via vi.stubEnv, rather than relying on them
 * being unset — frontend/.env carries real (anon, non-secret) credentials
 * that Vite's loadEnv supplies by default, so merely not stubbing does NOT
 * guarantee supabase.js sees falsy values.
 *
 * Mutation-check pass planned as a follow-up once this file is GREEN: mutate
 * the `if (r.error)` guard in dbSaveTeams to confirm cases 2/3 actually catch
 * a real regression, not a false-green (same discipline as A2's #423 catch).
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// ── Hoisted refs so each test controls what the chain terminal resolves to ──
var { fakeUpsertRef, upsertSpy } = vi.hoisted(function() {
  return {
    fakeUpsertRef: { current: null },
    upsertSpy: vi.fn(),
  };
});

// Mock @supabase/supabase-js so supabase.js' module-level createClient() call
// returns a controllable chain. Real Supabase is never contacted.
//   save: from('teams').upsert(rows, opts) -> fakeUpsertRef.current
vi.mock('@supabase/supabase-js', function() {
  return {
    createClient: function() {
      return {
        from: function() {
          return {
            upsert: function(rows, opts) {
              upsertSpy(rows, opts);
              return fakeUpsertRef.current;
            },
          };
        },
      };
    },
  };
});

describe('dbSaveTeams — untested DB helper coverage (#424)', function() {

  // ── Case 1: guard — no supabase client means no-op, never calls upsert ──
  describe('guard: no supabase client (env forced empty)', function() {
    beforeEach(function() {
      // frontend/.env carries real (anon, non-secret) Supabase credentials
      // that Vite's loadEnv supplies to import.meta.env by default — merely
      // NOT calling vi.stubEnv does not guarantee falsy values. Force both
      // vars to '' explicitly so supabaseUrl && supabaseKey is falsy
      // regardless of what real .env files are present on this machine.
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
      vi.resetModules();
      upsertSpy.mockClear();
      fakeUpsertRef.current = null;
    });

    afterEach(function() {
      vi.unstubAllEnvs();
    });

    it('1: env forced empty → supabase is null, dbSaveTeams resolves undefined and NEVER calls upsert', async function() {
      var mod = await import('../supabase.js');

      var r = await mod.dbSaveTeams([{ id: 't1', name: 'Mud Hens' }]);
      expect(r).toBeUndefined();
      expect(upsertSpy).not.toHaveBeenCalled();
    });
  });

  describe('with supabase client configured', function() {
    var warnSpy;

    beforeAll(function() {
      // supabase.js only instantiates the client when both env vars are
      // present. Without these, `supabase` is null and dbSaveTeams hits the
      // !supabase no-op guard, never reaching the paths under test here.
      vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    });

    afterAll(function() {
      vi.unstubAllEnvs();
    });

    beforeEach(function() {
      vi.resetModules();        // re-evaluate supabase.js with stubbed env per test
      upsertSpy.mockClear();
      fakeUpsertRef.current = null;
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(function() {});
    });

    afterEach(function() {
      warnSpy.mockRestore();
    });

    // ── Case 2: error path → REJECTS with Error carrying .code + .operation, and warns ──
    it('2: Supabase { error } → promise REJECTS with an Error carrying .code + .operation, and console.warn IS called', async function() {
      fakeUpsertRef.current = Promise.resolve({ error: { message: 'boom', code: '42501' } });
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
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    // ── Case 3: error fallback — missing .message falls back to 'write failed' ──
    it("3: Supabase { error } with no .message → rejected Error.message falls back to 'write failed'", async function() {
      fakeUpsertRef.current = Promise.resolve({ error: { code: 'X' } });
      var mod = await import('../supabase.js');

      await expect(mod.dbSaveTeams([{ id: 't1', name: 'Mud Hens' }])).rejects.toThrow('write failed');
    });

    // ── Case 4: success path → resolves with raw response, upsert called once, console.warn NOT called ──
    it('4: Supabase { error: null } → promise RESOLVES with the response object, upsert called once, console.warn is NOT called', async function() {
      fakeUpsertRef.current = Promise.resolve({ data: [{}], error: null });
      var mod = await import('../supabase.js');

      var r = await mod.dbSaveTeams([{ id: 't1', name: 'Mud Hens' }]);
      expect(r).toEqual({ data: [{}], error: null });
      expect(upsertSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    // ── Case 5: mapping/defaults — missing ageGroup/year/sport get defaulted ──
    it('5: teams missing ageGroup/year/sport → upsert receives defaulted age_group/year/sport', async function() {
      fakeUpsertRef.current = Promise.resolve({ data: [{}], error: null });
      var mod = await import('../supabase.js');

      await mod.dbSaveTeams([{ id: 't1', name: 'Mud Hens' }]);

      expect(upsertSpy).toHaveBeenCalledTimes(1);
      var rows = upsertSpy.mock.calls[0][0];
      expect(rows).toEqual([{
        id:        't1',
        name:      'Mud Hens',
        age_group: '',
        year:      new Date().getFullYear(),
        sport:     'baseball'
      }]);
    });

    // ── Case 6: onConflict option — upsert is called with { onConflict: 'id' } ──
    it("6: upsert is called with { onConflict: 'id' } as the second argument", async function() {
      fakeUpsertRef.current = Promise.resolve({ data: [{}], error: null });
      var mod = await import('../supabase.js');

      await mod.dbSaveTeams([{ id: 't1', name: 'Mud Hens' }]);

      var opts = upsertSpy.mock.calls[0][1];
      expect(opts).toEqual({ onConflict: 'id' });
    });

  });

});
