/**
 * dbSaveTeamData.test.js — regression test for the write-error REJECT path (#418).
 *
 * The 2.6.0 silent-data-loss fix: a failed team_data write must REJECT the
 * returned promise (throw-inside-.then) instead of resolving green. Before the
 * fix a failed Supabase write logged a warning, resolved, and the sync
 * indicator turned green — the app reported success for writes that never
 * happened. This pins the reject so a regression to the silent-resolve
 * behavior breaks loudly.
 *
 * Harness mirrors shareLink.test.js (the only other test of supabase.js's own
 * helpers): mock @supabase/supabase-js so the module-level createClient()
 * returns a controllable chain, stub the VITE_SUPABASE_* env so supabase.js
 * instantiates a NON-null client, and re-import the module per test.
 *
 * The chain exposes BOTH terminals — .upsert (save path) and
 * .select().eq().single() (load path) — so one mock serves dbSaveTeamData and
 * the adjacent dbLoadTeamData asymmetry case.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

// ── Hoisted refs so each test controls what the chain terminals resolve to ──
var { fakeUpsertRef, fakeSingleRef, upsertSpy } = vi.hoisted(function() {
  return {
    fakeUpsertRef: { current: null },
    fakeSingleRef: { current: null },
    upsertSpy: vi.fn(),
  };
});

// Mock @supabase/supabase-js so supabase.js' module-level createClient() call
// returns a controllable chain. Real Supabase is never contacted.
//   save: from('team_data').upsert(obj, opts)         -> fakeUpsertRef.current
//   load: from('team_data').select('*').eq(...).single() -> fakeSingleRef.current
vi.mock('@supabase/supabase-js', function() {
  return {
    createClient: function() {
      return {
        from: function() {
          return {
            upsert: function() { upsertSpy(); return fakeUpsertRef.current; },
            select: function() {
              return {
                eq: function() {
                  return { single: function() { return fakeSingleRef.current; } };
                },
              };
            },
          };
        },
      };
    },
  };
});

beforeAll(function() {
  // supabase.js only instantiates the client when both env vars are present.
  // Without these, `supabase` is null and dbSaveTeamData hits the !supabase
  // no-op guard, never reaching the reject path we are testing.
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
  fakeSingleRef.current = null;
});

describe('dbSaveTeamData — write-error reject path (#418)', function() {

  // ── Case 1: the #418 core — a failed write REJECTS, never resolves green ──
  it('1: Supabase { error } → promise REJECTS with an Error carrying .code + .operation', async function() {
    fakeUpsertRef.current = Promise.resolve({ error: { message: 'boom', code: '42501' } });
    var mod = await import('../supabase.js');

    // Rejects (does NOT resolve green) with the Supabase error message.
    await expect(mod.dbSaveTeamData('team-1', { roster: [] })).rejects.toThrow('boom');

    // And the thrown Error carries the surfaced metadata.
    var caught;
    try {
      await mod.dbSaveTeamData('team-1', { roster: [] });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught.message).toBe('boom');
    expect(caught.code).toBe('42501');
    expect(caught.operation).toBe('dbSaveTeamData');
  });

  // ── Case 2: success path resolves with the raw Supabase response ──────────
  it('2: Supabase { error: null } → promise RESOLVES with the response object', async function() {
    fakeUpsertRef.current = Promise.resolve({ data: [{}], error: null });
    var mod = await import('../supabase.js');

    var r = await mod.dbSaveTeamData('team-1', { roster: [] });
    expect(r).toEqual({ data: [{}], error: null });
    expect(upsertSpy).toHaveBeenCalledTimes(1);
  });

  // ── Case 3: no-op guard — falsy teamId short-circuits before any write ────
  it('3: falsy teamId → resolves undefined and NEVER calls upsert (guard intact)', async function() {
    fakeUpsertRef.current = Promise.resolve({ data: [{}], error: null });
    var mod = await import('../supabase.js');

    var r = await mod.dbSaveTeamData('', { roster: [] });
    expect(r).toBeUndefined();
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  // ── Case 4: deliberate asymmetry — dbLoadTeamData on error RESOLVES null ──
  // Save rejects; load swallows the error and resolves null. This documents
  // the intentional difference so a change that makes load throw breaks here.
  it('4: dbLoadTeamData on { error } RESOLVES null (does NOT reject) — save/load asymmetry', async function() {
    fakeSingleRef.current = Promise.resolve({ error: { message: 'x', code: 'X' } });
    var mod = await import('../supabase.js');

    await expect(mod.dbLoadTeamData('team-1')).resolves.toBeNull();
  });

});
