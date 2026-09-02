/**
 * useHomeScreen — Story #1028's data/state hook for the redesigned Home
 * shell, extended in Story #1031 for loading/cached/offline/slow-backend/
 * empty/access-loss/cache-version states. Owns exactly the state
 * categories section 7/28 assign to this layer:
 *   - server state: home (the last authoritative GET /api/v1/home response)
 *   - offline/sync state: fromCache, cacheIsStale, cacheAgeMs, error
 *   - transient UI state: expandedTeamId, viewFilter, justLostAccessTeamId
 *     (all memory-only, never persisted — reinitialized from the API's
 *     defaultTeamId on load)
 *
 * Not App.jsx-integrated yet (#1030's job) — this hook is dark, callable
 * only from the new feature-shell components in this directory. `isOnline`
 * follows the app's existing convention (App.jsx owns navigator.onLine
 * tracking and passes it down to consumers, e.g. OfflineIndicator/
 * TeamSearch) — this hook accepts it as a prop rather than re-deriving it,
 * defaulting to true for standalone use before that wiring exists.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { createApiClient, createGenerationGuard } from '../../api/client.js';
import { fetchHome } from '../../api/home.js';
import { getHomeCache, setHomeCache } from '../../api/homeCache.js';
import {
  trackHomeApiLoaded, trackHomeApiCacheRendered, trackHomeApiFailed,
  trackHomeTeamExpanded, trackHomeTeamFilterChanged, trackHomeOfflineRendered,
} from './homeAnalytics.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://lineup-generator-backend.onrender.com';

/** Must match backend/src/routes/home.js's CONTRACT_VERSION. */
const HOME_CONTRACT_VERSION = 1;

/**
 * @param {object} args
 * @param {string|null} args.userId - authenticated user id, or null when signed out
 * @param {() => Promise<string|null>} args.getAccessToken
 * @param {boolean} [args.isOnline] - parent-provided navigator.onLine state; defaults to true
 * @param {typeof fetch} [args.fetchImpl] - test seam, forwarded to createApiClient
 * @param {(ms:number) => Promise<void>} [args.waitImpl] - test seam, forwarded to createApiClient
 * @param {object} [args.cacheStorage] - test seam, forwarded to homeCache
 */
export function useHomeScreen({ userId, getAccessToken, isOnline = true, fetchImpl, waitImpl, cacheStorage }) {
  // 'loading' | 'ready' | 'error' | 'offline' ('offline' = no network attempted
  // because isOnline is false AND there is no cache to fall back on — distinct
  // from 'error', which means a real request failed).
  const [status, setStatus] = useState('loading');
  const [home, setHome] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [cacheIsStale, setCacheIsStale] = useState(false);
  const [cacheAgeMs, setCacheAgeMs] = useState(null);
  const [error, setError] = useState(null);
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [viewFilter, setViewFilter] = useState('single');
  const [justLostAccessTeamId, setJustLostAccessTeamId] = useState(null);

  const expandedInitializedRef = useRef(false);
  // load() is memoized on [userId, isOnline] only (see below) — it must
  // never read the `home` state variable directly, since that closure
  // would go stale the moment home changes without load() being
  // recreated. This ref is the one place load() reads "what team IDs did
  // we have before this fetch" from.
  const homeRef = useRef(null);
  const clientRef = useRef(null);
  if (!clientRef.current) {
    clientRef.current = createApiClient({ baseUrl: BACKEND_URL, getAccessToken, fetchImpl, waitImpl });
  }
  const guardRef = useRef(null);
  if (!guardRef.current) guardRef.current = createGenerationGuard();

  // load()'s identity must depend only on userId — NOT isOnline. If it
  // depended on isOnline too, the mount effect below (deps [userId, load])
  // would see load's reference change on every online/offline flip and
  // fire a SECOND, redundant load() alongside the dedicated reconnect
  // effect further down. isOnline is read from this ref instead, kept in
  // sync by its own effect (declared before the reconnect effect, so it
  // always updates first within the same render's effect pass).
  const isOnlineRef = useRef(isOnline);
  useEffect(function () {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  const load = useCallback(async function load() {
    const online = isOnlineRef.current;

    if (!userId) {
      setStatus('ready');
      homeRef.current = null;
      setHome(null);
      return;
    }

    const cached = getHomeCache(userId, { storage: cacheStorage, expectedVersion: HOME_CONTRACT_VERSION });
    const cacheState = cached ? 'hit' : 'miss';
    if (cached) {
      homeRef.current = cached.response;
      setHome(cached.response);
      setFromCache(true);
      setCacheIsStale(cached.isStale);
      setCacheAgeMs(cached.ageMs);
      setStatus('ready');
      setExpandedTeamId(function (prev) {
        if (expandedInitializedRef.current) return prev;
        expandedInitializedRef.current = true;
        return cached.response.defaultTeamId;
      });
      trackHomeApiCacheRendered({ teamCount: (cached.response.teams || []).length, cacheState: cacheState });
    }

    if (!online) {
      // Never attempt a network call while offline. A cached snapshot
      // (however stale, up to homeCache's own 24h unavailability cutoff)
      // is still "ready"; with nothing cached there is nothing useful to
      // show, which is its own distinct state, not a server error.
      trackHomeOfflineRendered({ cacheState: cacheState });
      if (!cached) setStatus('offline');
      return;
    }

    const gen = guardRef.current.next();
    try {
      const result = await fetchHome(clientRef.current, { signal: gen.signal });
      if (!gen.isCurrent(gen.generation)) return; // superseded by a newer load()

      if (result.notModified) {
        setFromCache(false);
        setCacheIsStale(false);
        return;
      }

      const previousTeamIds = new Set(((homeRef.current && homeRef.current.teams) || []).map(function (t) { return t.id; }));
      const newTeamIds = new Set((result.data.teams || []).map(function (t) { return t.id; }));

      homeRef.current = result.data;
      setHome(result.data);
      setFromCache(false);
      setCacheIsStale(false);
      setCacheAgeMs(null);
      setStatus('ready');
      setError(null);
      setHomeCache(userId, result.data, { storage: cacheStorage });
      trackHomeApiLoaded({ teamCount: (result.data.teams || []).length, cacheState: cacheState, networkState: 'online' });

      setExpandedTeamId(function (prev) {
        if (!expandedInitializedRef.current) {
          expandedInitializedRef.current = true;
          return result.data.defaultTeamId;
        }
        const stillPresent = prev && newTeamIds.has(prev);
        if (!stillPresent && prev && previousTeamIds.has(prev)) {
          // The team was genuinely present a moment ago and is gone now —
          // real access loss, not just "hasn't loaded yet". Surface it
          // rather than silently swapping to another team's content.
          setJustLostAccessTeamId(prev);
        }
        // The previously expanded team disappeared (access loss / no longer
        // a member) — fall back to the fresh default rather than pointing
        // at a team the caller can no longer see. Never mutates or
        // reassigns any OTHER team's data — this only changes which
        // already-returned team is displayed.
        return stillPresent ? prev : result.data.defaultTeamId;
      });
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      trackHomeApiFailed({
        errorCode: (err && err.code) || 'UNKNOWN_ERROR',
        retryable: typeof (err && err.retryable) === 'boolean' ? err.retryable : false,
        cacheState: cacheState,
      });
      // A cached snapshot already rendered above — a slow/warming/failing
      // backend must not blank it out from under the user.
      if (!cached) setStatus('error');
      setError(err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(function () {
    expandedInitializedRef.current = false;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, load]);

  const wasOnlineRef = useRef(isOnline);
  useEffect(function () {
    if (!wasOnlineRef.current && isOnline) {
      // Reconnected — revalidate rather than waiting for the next
      // unrelated re-render to notice.
      load();
    }
    wasOnlineRef.current = isOnline;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const expandTeam = useCallback(function expandTeam(teamId) {
    setExpandedTeamId(teamId);
    // The internal state setter, not changeViewFilter below — collapsing
    // back to a single expanded team is a side effect of expansion, not a
    // user-initiated filter change, so it doesn't fire its own analytics
    // event on top of trackHomeTeamExpanded.
    setViewFilter('single');
    const team = homeRef.current && (homeRef.current.teams || []).find(function (t) { return t.id === teamId; });
    trackHomeTeamExpanded({ teamId: teamId, role: team && team.role && team.role.code });
  }, []);

  const changeViewFilter = useCallback(function changeViewFilter(nextFilter) {
    setViewFilter(nextFilter);
    trackHomeTeamFilterChanged({ viewFilter: nextFilter });
  }, []);

  const dismissAccessLostNotice = useCallback(function dismissAccessLostNotice() {
    setJustLostAccessTeamId(null);
  }, []);

  return {
    status,
    home,
    fromCache,
    cacheIsStale,
    cacheAgeMs,
    error,
    isOnline,
    expandedTeamId,
    setExpandedTeamId,
    viewFilter,
    setViewFilter: changeViewFilter,
    expandTeam,
    justLostAccessTeamId,
    dismissAccessLostNotice,
    refetch: load,
  };
}
