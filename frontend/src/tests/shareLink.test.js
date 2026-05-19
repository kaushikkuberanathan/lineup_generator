/**
 * shareLink.test.js — regression tests for dbLoadShareLink timeout (Bug A).
 *
 * Story 61 — share-link recipient path: supabase.js had no timeout, so a
 * stalled Supabase query (network hang, cold start, RLS regression) left the
 * loader spinner indefinite. Promise.race against a 10s timer resolves null
 * on stall, which surfaces the existing "couldn't be found" screen instead.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

// ── Hoisted ref so the test can swap what `.single()` returns per case ─────
var { fakeQueryRef } = vi.hoisted(function() {
  return { fakeQueryRef: { current: null } };
});

// Mock @supabase/supabase-js so supabase.js' module-level createClient() call
// returns a controllable chain. Real Supabase is never contacted in tests.
vi.mock('@supabase/supabase-js', function() {
  function chain() {
    return {
      from:   function() { return chain(); },
      select: function() { return chain(); },
      eq:     function() { return chain(); },
      single: function() { return fakeQueryRef.current; },
    };
  }
  return { createClient: function() { return chain(); } };
});

beforeAll(function() {
  // supabase.js only instantiates the client when both env vars are present.
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
});

afterAll(function() {
  vi.unstubAllEnvs();
});

beforeEach(function() {
  vi.useFakeTimers();
  vi.resetModules(); // re-evaluate supabase.js with stubbed env per test
});

afterEach(function() {
  vi.useRealTimers();
  fakeQueryRef.current = null;
});

describe('dbLoadShareLink', function() {
  it('resolves null when the Supabase query stalls past the timeout', async function() {
    fakeQueryRef.current = new Promise(function() {}); // never resolves
    var mod = await import('../supabase.js');

    var resultPromise = mod.dbLoadShareLink('share-id');
    await vi.advanceTimersByTimeAsync(mod.SHARE_LINK_FETCH_TIMEOUT_MS + 1);

    expect(await resultPromise).toBe(null);
  });

  it('resolves with the payload when the query returns before the timeout', async function() {
    fakeQueryRef.current = Promise.resolve({
      data: { payload: { roster: ['Aiden', 'Benji'] } },
      error: null,
    });
    var mod = await import('../supabase.js');

    expect(await mod.dbLoadShareLink('share-id')).toEqual({ roster: ['Aiden', 'Benji'] });
  });

  it('resolves null when the Supabase query returns an error', async function() {
    fakeQueryRef.current = Promise.resolve({
      data: null,
      error: { message: 'row not found' },
    });
    var mod = await import('../supabase.js');

    expect(await mod.dbLoadShareLink('share-id')).toBe(null);
  });
});
