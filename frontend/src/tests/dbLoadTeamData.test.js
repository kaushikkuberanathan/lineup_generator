/**
 * dbLoadTeamData.test.js — coverage for the untested dbLoadTeamData() helper (#424).
 *
 * dbLoadTeamData was flagged as fully untested in the #424 survey (Group B).
 * Harness mirrors dbSaveTeams.test.js (#424): mock @supabase/supabase-js so
 * the module-level createClient() call returns a controllable chain, force
 * both VITE_SUPABASE_* vars to '' via vi.stubEnv for the guard cases (per
 * #431 — frontend/.env carries real anon credentials that Vite's loadEnv
 * supplies by default, so merely leaving env unstubbed does NOT guarantee a
 * null client), and re-import the module per test.
 *
 * This is the trickiest of the Group B helpers:
 *   - DUAL guard: `!supabase || !teamId` (mirrors dbSaveTeamData's shape,
 *     #418) — two independent falsy paths both resolving null.
 *   - PGRST116 branch: a Postgrest "no rows found" error is NOT a real
 *     error (team_data row doesn't exist yet for a new team) — it resolves
 *     null WITHOUT warning. Any OTHER error code resolves null AND warns.
 *     This is the one behavior a naive single error-path test would miss.
 *
 * Chain shape: from('team_data').select('*').eq('team_id', teamId).single()
 *   -> fakeResultRef.current
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// ── Hoisted refs so each test controls what the chain terminal resolves to ──
var { fakeResultRef, selectSpy, eqSpy, singleSpy } = vi.hoisted(function() {
  return {
    fakeResultRef: { current: null },
    selectSpy: vi.fn(),
    eqSpy: vi.fn(),
    singleSpy: vi.fn(),
  };
});

// Mock @supabase/supabase-js so supabase.js' module-level createClient() call
// returns a controllable chain. Real Supabase is never contacted.
//   load: from('team_data').select('*').eq('team_id', teamId).single()
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
                eq: function(col, val) {
                  eqSpy(col, val);
                  return {
                    single: function() {
                      singleSpy();
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
});

describe('dbLoadTeamData — untested DB helper coverage (#424)', function() {

  // ── Case 1: guard — no supabase client resolves null, select never called ──
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
      singleSpy.mockClear();
      fakeResultRef.current = null;
    });

    afterEach(function() {
      vi.unstubAllEnvs();
    });

    it('1: env forced empty → supabase is null, dbLoadTeamData resolves null and NEVER calls select', async function() {
      var mod = await import('../supabase.js');

      var r = await mod.dbLoadTeamData('team-1');
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
      eqSpy.mockClear();
      singleSpy.mockClear();
      fakeResultRef.current = null;
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(function() {});
    });

    afterEach(function() {
      warnSpy.mockRestore();
    });

    // ── Case 2: guard — supabase present but teamId falsy → resolves null, select never called ──
    it('2: teamId falsy (client present) → resolves null and NEVER calls select — same dual-guard shape as dbSaveTeamData (#418)', async function() {
      var mod = await import('../supabase.js');

      var r = await mod.dbLoadTeamData('');
      expect(r).toBeNull();
      expect(selectSpy).not.toHaveBeenCalled();
    });

    // ── Case 3: call shape — select('*').eq('team_id', teamId).single() ──
    it("3: query is built as select('*').eq('team_id', teamId).single() with the correct teamId", async function() {
      fakeResultRef.current = Promise.resolve({ error: { code: 'PGRST116' } });
      var mod = await import('../supabase.js');

      await mod.dbLoadTeamData('team-42');

      expect(selectSpy).toHaveBeenCalledTimes(1);
      expect(selectSpy).toHaveBeenCalledWith('*');
      expect(eqSpy).toHaveBeenCalledTimes(1);
      expect(eqSpy).toHaveBeenCalledWith('team_id', 'team-42');
      expect(singleSpy).toHaveBeenCalledTimes(1);
    });

    // ── Case 4: PGRST116 (no rows) → resolves null, console.warn NOT called (the key distinction) ──
    it('4: error code PGRST116 (no rows found) → resolves null, console.warn is NOT called', async function() {
      fakeResultRef.current = Promise.resolve({ error: { code: 'PGRST116', message: 'no rows' } });
      var mod = await import('../supabase.js');

      var r = await mod.dbLoadTeamData('team-1');
      expect(r).toBeNull();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    // ── Case 5: any other error code → resolves null, console.warn IS called with r.error.message ──
    it('5: error code other than PGRST116 → resolves null, console.warn IS called with r.error.message', async function() {
      fakeResultRef.current = Promise.resolve({ error: { code: '42501', message: 'boom' } });
      var mod = await import('../supabase.js');

      var r = await mod.dbLoadTeamData('team-1');
      expect(r).toBeNull();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith('[DB] loadTeamData error:', 'boom');
    });

    // ── Case 6: success — full row maps snake_case -> camelCase with real values ──
    it('6: success with a full row → maps to { roster, schedule, practices, battingOrder, grid, innings, locked, coachPin, attendanceOverrides }', async function() {
      fakeResultRef.current = Promise.resolve({
        error: null,
        data: {
          roster: [{ name: 'Aiden' }],
          schedule: [{ id: 'g1' }],
          practices: [{ id: 'p1' }],
          batting_order: ['Aiden'],
          grid: { Aiden: ['1B'] },
          innings: 7,
          locked: true,
          coach_pin: '1234',
          attendance_overrides: { '2026-07-29': ['Aiden'] },
        },
      });
      var mod = await import('../supabase.js');

      var r = await mod.dbLoadTeamData('team-1');
      expect(r).toEqual({
        roster: [{ name: 'Aiden' }],
        schedule: [{ id: 'g1' }],
        practices: [{ id: 'p1' }],
        battingOrder: ['Aiden'],
        grid: { Aiden: ['1B'] },
        innings: 7,
        locked: true,
        coachPin: '1234',
        attendanceOverrides: { '2026-07-29': ['Aiden'] },
      });
    });

    // ── Case 7: success — empty row → every field falls back to its default ──
    it('7: success with an empty row (all fields missing) → every field falls back to its default', async function() {
      fakeResultRef.current = Promise.resolve({ error: null, data: {} });
      var mod = await import('../supabase.js');

      var r = await mod.dbLoadTeamData('team-1');
      expect(r).toEqual({
        roster: [],
        schedule: [],
        practices: [],
        battingOrder: [],
        grid: {},
        innings: 6,
        locked: false,
        coachPin: '',
        attendanceOverrides: {},
      });
    });

  });

});
