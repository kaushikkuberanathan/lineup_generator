/**
 * useFeatureFlag.test.js
 *
 * Second-pass coverage follow-up (session 2026-08-23): hooks/useFeatureFlag.js
 * (singular — team-scoped Supabase flag lookup, distinct from the already-
 * tested useFeatureFlags.js/fetchRuntimeFlags bulk registry) had zero
 * coverage despite being used by App.jsx and DugoutView.jsx.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { renderHook } from './helpers/renderHook.js';

var mocks = vi.hoisted(function () {
  return { from: vi.fn() };
});

vi.mock('../supabase', function () {
  return { supabase: { from: mocks.from } };
});

import { useFeatureFlag } from '../hooks/useFeatureFlag.js';

function chain(result) {
  return {
    select: vi.fn(function () { return this; }),
    eq: vi.fn(function () { return this; }),
    then: function (resolve) { return Promise.resolve(result).then(resolve); },
  };
}

async function settle() {
  await act(async function () {
    await new Promise(function (r) { setTimeout(r, 0); });
  });
}

describe('useFeatureFlag', function () {

  beforeEach(function () {
    vi.clearAllMocks();
  });

  afterEach(function () {
    vi.restoreAllMocks();
  });

  it('starts in a loading state with enabled=false, before the query settles', async function () {
    // renderHook's own act() wrapper flushes microtasks eagerly, so a query
    // that resolves immediately would already be past 'loading' by the time
    // this assertion runs — hold the promise open to observe the initial state.
    mocks.from.mockReturnValue({
      select: vi.fn(function () { return this; }),
      eq: vi.fn(function () { return this; }),
      then: function () { return new Promise(function () { /* never resolves */ }); },
    });
    var h = await renderHook(function () { return useFeatureFlag('viewer_mode'); });
    expect(h.result.current.loading).toBe(true);
    expect(h.result.current.enabled).toBe(false);
    await h.unmount();
  });

  it('resolves to the global row when no teamId is given', async function () {
    mocks.from.mockReturnValue(chain({
      data: [{ enabled: true, team_id: null }],
    }));
    var h = await renderHook(function () { return useFeatureFlag('viewer_mode'); });
    await settle();
    expect(h.result.current.loading).toBe(false);
    expect(h.result.current.enabled).toBe(true);
    await h.unmount();
  });

  it('prefers the team-scoped row over the global row when both exist', async function () {
    mocks.from.mockReturnValue(chain({
      data: [
        { enabled: false, team_id: null },
        { enabled: true, team_id: 'team-1' },
      ],
    }));
    var h = await renderHook(function () { return useFeatureFlag('live_scoring', 'team-1'); });
    await settle();
    expect(h.result.current.enabled).toBe(true);
    await h.unmount();
  });

  it('falls back to the global row when a teamId is given but has no team-scoped row', async function () {
    mocks.from.mockReturnValue(chain({
      data: [{ enabled: true, team_id: null }],
    }));
    var h = await renderHook(function () { return useFeatureFlag('live_scoring', 'team-999'); });
    await settle();
    expect(h.result.current.enabled).toBe(true);
    await h.unmount();
  });

  it('ignores a team-scoped row for a different team when a teamId is given', async function () {
    mocks.from.mockReturnValue(chain({
      data: [{ enabled: true, team_id: 'some-other-team' }],
    }));
    var h = await renderHook(function () { return useFeatureFlag('live_scoring', 'team-1'); });
    await settle();
    expect(h.result.current.enabled).toBe(false);
    await h.unmount();
  });

  it('resolves enabled=false when no rows are returned', async function () {
    mocks.from.mockReturnValue(chain({ data: [] }));
    var h = await renderHook(function () { return useFeatureFlag('nonexistent_flag'); });
    await settle();
    expect(h.result.current.loading).toBe(false);
    expect(h.result.current.enabled).toBe(false);
    await h.unmount();
  });

  it('fails closed (enabled=false, loading=false) when the query rejects', async function () {
    // The hook chains .then(onSuccess).catch(onError) directly off the query
    // builder — .then() just needs to hand back a real rejected Promise for
    // that trailing .catch() to receive.
    mocks.from.mockReturnValue({
      select: vi.fn(function () { return this; }),
      eq: vi.fn(function () { return this; }),
      then: function () { return Promise.reject(new Error('network down')); },
    });
    var h = await renderHook(function () { return useFeatureFlag('viewer_mode'); });
    await settle();
    expect(h.result.current.loading).toBe(false);
    expect(h.result.current.enabled).toBe(false);
    await h.unmount();
  });
});
