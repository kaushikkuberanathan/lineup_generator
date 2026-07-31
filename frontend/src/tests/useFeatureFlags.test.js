/**
 * useFeatureFlags.test.js
 *
 * Unit spec for useFeatureFlags (#423 / Track A2) — the runtime flag-fetch
 * hook. fetchRuntimeFlags() has one success path (merge DB overrides onto
 * staticFlags) and three graceful-degradation paths (Supabase disabled,
 * query error, thrown exception) that all fall back to staticFlags.
 *
 * Mirrors useAuth.updateProfileName.test.js: mocks '../supabase.js' directly
 * (not '@supabase/supabase-js'), uses the shared src/tests/helpers/renderHook
 * React-18 act helper.
 *
 * fetchTeamFlags is excluded — confirmed dead code (uncalled stub per its
 * own comment), not part of the runtime flag-fetch hook's tested surface.
 *
 * Cases:
 *   1. isSupabaseEnabled = false        -> returns staticFlags, no query
 *   2. enabled, query returns rows      -> merged, keys uppercased
 *   3. enabled, query returns {error}   -> falls back to staticFlags
 *   4. enabled, query throws            -> falls back to staticFlags (catch)
 *   5. enabled, query returns data: []  -> staticFlags unchanged
 *   6. hook success end-state           -> loading:false, flags = merged
 *   7. hook degradation end-state       -> loading:false, flags = staticFlags
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from './helpers/renderHook.js';

// ── Hoisted mock state ──────────────────────────────────────────────────
var mocks = vi.hoisted(function() {
  return {
    isSupabaseEnabled: true,
    queryResult: { data: [], error: null },
    queryThrows: false,
  };
});

vi.mock('../supabase.js', function() {
  return {
    get isSupabaseEnabled() { return mocks.isSupabaseEnabled; },
    supabase: {
      from: function() {
        return {
          select: function() {
            return {
              is: function() {
                if (mocks.queryThrows) {
                  return Promise.reject(new Error('network down'));
                }
                return Promise.resolve(mocks.queryResult);
              },
            };
          },
        };
      },
    },
  };
});

import { fetchRuntimeFlags, useFeatureFlags } from '../hooks/useFeatureFlags.js';
import { FEATURE_FLAGS as staticFlags } from '@/config/featureFlags';

beforeEach(function() {
  mocks.isSupabaseEnabled = true;
  mocks.queryResult = { data: [], error: null };
  mocks.queryThrows = false;
});

describe('fetchRuntimeFlags', function() {
  it('returns staticFlags with no query when Supabase is disabled', async function() {
    mocks.isSupabaseEnabled = false;
    var result = await fetchRuntimeFlags();
    expect(result).toEqual(staticFlags);
  });

  it('merges DB overrides onto staticFlags, uppercasing flag_name', async function() {
    mocks.queryResult = {
      data: [{ flag_name: 'maintenance_mode', enabled: true }],
      error: null,
    };
    var result = await fetchRuntimeFlags();
    expect(result.MAINTENANCE_MODE).toBe(true);
    expect(result.USE_NEW_LINEUP_ENGINE).toBe(staticFlags.USE_NEW_LINEUP_ENGINE);
  });

  it('falls back to staticFlags when the query returns an error, even if data is present', async function() {
    // data is populated alongside the error to prove the error check itself
    // gates the fallback -- not an incidental null/[] short-circuit.
    mocks.queryResult = {
      data: [{ flag_name: 'maintenance_mode', enabled: true }],
      error: { message: 'boom' },
    };
    var result = await fetchRuntimeFlags();
    expect(result).toEqual(staticFlags);
    expect(result.MAINTENANCE_MODE).toBe(staticFlags.MAINTENANCE_MODE);
  });

  it('falls back to staticFlags when the query throws', async function() {
    mocks.queryThrows = true;
    var result = await fetchRuntimeFlags();
    expect(result).toEqual(staticFlags);
  });

  it('leaves staticFlags unchanged when data is an empty array', async function() {
    mocks.queryResult = { data: [], error: null };
    var result = await fetchRuntimeFlags();
    expect(result).toEqual(staticFlags);
  });
});

describe('useFeatureFlags', function() {
  it('resolves loading:false with merged flags on success', async function() {
    mocks.queryResult = {
      data: [{ flag_name: 'maintenance_mode', enabled: true }],
      error: null,
    };
    var { result, unmount } = await renderHook(function() {
      return useFeatureFlags();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.flags.MAINTENANCE_MODE).toBe(true);
    await unmount();
  });

  it('resolves loading:false with staticFlags on degradation', async function() {
    mocks.queryResult = { data: null, error: { message: 'boom' } };
    var { result, unmount } = await renderHook(function() {
      return useFeatureFlags();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.flags).toEqual(staticFlags);
    await unmount();
  });
});

