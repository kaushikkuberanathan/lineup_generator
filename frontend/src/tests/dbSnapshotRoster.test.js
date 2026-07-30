/**
 * dbSnapshotRoster.test.js — coverage for the untested dbSnapshotRoster()
 * helper (#424).
 *
 * dbSnapshotRoster was flagged as fully untested in the #424 survey
 * (Group B, async). Harness mirrors dbSaveTeams.test.js (#424): mock
 * @supabase/supabase-js so the module-level createClient() call returns a
 * controllable chain, force both VITE_SUPABASE_* vars to '' via vi.stubEnv
 * for the guard case (per #431 — frontend/.env carries real anon
 * credentials that Vite's loadEnv supplies by default, so merely leaving
 * env unstubbed does NOT guarantee a null client), and re-import the module
 * per test.
 *
 * This function is silent-fail-by-design: it never inspects r.error on a
 * resolved insert (any resolved value, error or not, is discarded), and its
 * try/catch swallows a THROWN/REJECTED insert with an empty catch body —
 * no console.warn, ever. This is intentional (a snapshot write is a safety
 * net, not a critical path) and the tests pin that silence explicitly.
 *
 * Chain shape: from('roster_snapshots').insert({...}) -> fakeResultRef.current
 * (or throws synchronously, controlled via insertShouldThrow, for case 4)
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// ── Hoisted refs so each test controls what the chain terminal does ──
var { fakeResultRef, insertSpy, insertShouldThrow } = vi.hoisted(function() {
  return {
    fakeResultRef: { current: null },
    insertSpy: vi.fn(),
    insertShouldThrow: { current: false },
  };
});

// Mock @supabase/supabase-js so supabase.js' module-level createClient() call
// returns a controllable chain. Real Supabase is never contacted.
//   from('roster_snapshots').insert(obj) -> fakeResultRef.current
//   (or throws synchronously when insertShouldThrow.current is true)
vi.mock('@supabase/supabase-js', function() {
  return {
    createClient: function() {
      return {
        from: function() {
          return {
            insert: function(obj) {
              insertSpy(obj);
              if (insertShouldThrow.current) { throw new Error('boom'); }
              return fakeResultRef.current;
            },
          };
        },
      };
    },
  };
});

describe('dbSnapshotRoster — untested DB helper coverage (#424)', function() {

  // ── Case 1: guard — no supabase client → undefined, insert never called ──
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
      insertSpy.mockClear();
      insertShouldThrow.current = false;
      fakeResultRef.current = null;
    });

    afterEach(function() {
      vi.unstubAllEnvs();
    });

    it('1: env forced empty → supabase is null, dbSnapshotRoster resolves undefined and NEVER calls insert', async function() {
      var mod = await import('../supabase.js');

      var r = await mod.dbSnapshotRoster('team-1', 'Mud Hens', [{ name: 'Aiden' }], 'app_load');
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
      insertShouldThrow.current = false;
      fakeResultRef.current = Promise.resolve({ data: [{}], error: null });
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(function() {});
    });

    afterEach(function() {
      warnSpy.mockRestore();
    });

    // ── Case 2: guard — roster falsy/empty → resolves undefined, insert never called ──
    it('2: roster null/empty (client present) → resolves undefined and NEVER calls insert', async function() {
      var mod = await import('../supabase.js');

      var r1 = await mod.dbSnapshotRoster('team-1', 'Mud Hens', null, 'app_load');
      expect(r1).toBeUndefined();

      var r2 = await mod.dbSnapshotRoster('team-1', 'Mud Hens', [], 'app_load');
      expect(r2).toBeUndefined();

      expect(insertSpy).not.toHaveBeenCalled();
    });

    // ── Case 3: insert() call shape — with teamName/triggerEvent provided ──
    it('3: insert() is called with { team_id, team_name, roster, trigger_event } when teamName/triggerEvent are provided', async function() {
      var mod = await import('../supabase.js');
      var roster = [{ name: 'Aiden' }, { name: 'Benji' }];

      await mod.dbSnapshotRoster('team-1', 'Mud Hens', roster, 'roster_edit');

      expect(insertSpy).toHaveBeenCalledTimes(1);
      expect(insertSpy).toHaveBeenCalledWith({
        team_id: 'team-1',
        team_name: 'Mud Hens',
        roster: roster,
        trigger_event: 'roster_edit',
      });
    });

    // ── Case 3b: insert() call shape — teamName/triggerEvent fall back when omitted ──
    it("3b: insert() falls back to team_name: '' and trigger_event: 'auto_save' when omitted", async function() {
      var mod = await import('../supabase.js');
      var roster = [{ name: 'Aiden' }];

      await mod.dbSnapshotRoster('team-1', undefined, roster, undefined);

      expect(insertSpy).toHaveBeenCalledTimes(1);
      expect(insertSpy).toHaveBeenCalledWith({
        team_id: 'team-1',
        team_name: '',
        roster: roster,
        trigger_event: 'auto_save',
      });
    });

    // ── Case 4: insert throws/rejects → silently swallowed, no warn, resolves undefined ──
    it('4: insert() throws → silently swallowed, resolves undefined, console.warn is NEVER called (intentional, unlike the throw-pattern functions)', async function() {
      insertShouldThrow.current = true;
      var mod = await import('../supabase.js');

      var r = await mod.dbSnapshotRoster('team-1', 'Mud Hens', [{ name: 'Aiden' }], 'app_load');
      expect(r).toBeUndefined();
      expect(insertSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    // ── Case 5: success → resolves undefined (no explicit return), insert called once ──
    it('5: success → resolves undefined (function has no explicit return path), insert called once', async function() {
      var mod = await import('../supabase.js');

      var r = await mod.dbSnapshotRoster('team-1', 'Mud Hens', [{ name: 'Aiden' }], 'app_load');
      expect(r).toBeUndefined();
      expect(insertSpy).toHaveBeenCalledTimes(1);
    });

  });

});
