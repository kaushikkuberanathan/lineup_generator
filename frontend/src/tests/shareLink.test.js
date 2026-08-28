/**
 * shareLink.test.js — regression tests for dbLoadShareLink (Story 61 timeout
 * fix, Story 62/#127 typed failure modes).
 *
 * Story 61 — share-link recipient path: supabase.js had no timeout, so a
 * stalled Supabase query (network hang, cold start, RLS regression) left the
 * loader spinner indefinite. Promise.race against a 10s timer resolves a
 * 'timeout' status on stall, which surfaces the existing "couldn't be found"
 * screen instead.
 *
 * Story 62/#127 — dbLoadShareLink used to collapse three distinct failure
 * modes (row not found, RLS/auth block, malformed slug) into a single
 * silent null, making the share-link error surface undiagnosable. It now
 * always resolves { payload, status }.
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
  it('resolves status "timeout" when the Supabase query stalls past the timeout', async function() {
    fakeQueryRef.current = new Promise(function() {}); // never resolves
    var mod = await import('../supabase.js');

    var resultPromise = mod.dbLoadShareLink('abc12345');
    await vi.advanceTimersByTimeAsync(mod.SHARE_LINK_FETCH_TIMEOUT_MS + 1);

    expect(await resultPromise).toEqual({ payload: null, status: 'timeout' });
  });

  it('resolves status "ok" with the payload when the query returns before the timeout', async function() {
    fakeQueryRef.current = Promise.resolve({
      data: { payload: { roster: ['Aiden', 'Benji'] } },
      error: null,
    });
    var mod = await import('../supabase.js');

    expect(await mod.dbLoadShareLink('abc12345')).toEqual({
      payload: { roster: ['Aiden', 'Benji'] },
      status: 'ok',
    });
  });

  it('resolves status "not_found" when the row does not exist', async function() {
    fakeQueryRef.current = Promise.resolve({
      data: null,
      error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' },
    });
    var mod = await import('../supabase.js');

    expect(await mod.dbLoadShareLink('abc12345')).toEqual({ payload: null, status: 'not_found' });
  });

  it('resolves status "rls_blocked" when Supabase denies the read', async function() {
    fakeQueryRef.current = Promise.resolve({
      data: null,
      error: { message: 'permission denied for table share_links', code: '42501' },
    });
    var mod = await import('../supabase.js');

    expect(await mod.dbLoadShareLink('abc12345')).toEqual({ payload: null, status: 'rls_blocked' });
  });

  it('resolves status "not_found" for an error code it does not otherwise recognize', async function() {
    fakeQueryRef.current = Promise.resolve({
      data: null,
      error: { message: 'connection reset', code: '08006' },
    });
    var mod = await import('../supabase.js');

    expect(await mod.dbLoadShareLink('abc12345')).toEqual({ payload: null, status: 'not_found' });
  });

  it('resolves status "malformed_slug" without touching the network for a non-conforming id', async function() {
    var mod = await import('../supabase.js');

    expect(await mod.dbLoadShareLink('not an id!')).toEqual({ payload: null, status: 'malformed_slug' });
    expect(await mod.dbLoadShareLink('')).toEqual({ payload: null, status: 'malformed_slug' });
    expect(await mod.dbLoadShareLink(null)).toEqual({ payload: null, status: 'malformed_slug' });
    // fakeQueryRef.current was never assigned in this test — if dbLoadShareLink
    // had reached the network, .single() would throw on the null chain call.
    expect(fakeQueryRef.current).toBe(null);
  });
});
