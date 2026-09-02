/**
 * useHomeScreen — Story #1028's data/state hook for the redesigned Home
 * shell. Owns exactly the state categories section 7/28 assign to this
 * layer:
 *   - server state: home (the last authoritative GET /api/v1/home response)
 *   - offline/sync state: fromCache, error
 *   - transient UI state: expandedTeamId, viewFilter (memory only, never
 *     persisted — reinitialized from the API's defaultTeamId on load)
 *
 * Not App.jsx-integrated yet (#1030's job) — this hook is dark, callable
 * only from the new feature-shell components in this directory.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { createApiClient, createGenerationGuard } from '../../api/client.js';
import { fetchHome } from '../../api/home.js';
import { getHomeCache, setHomeCache } from '../../api/homeCache.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://lineup-generator-backend.onrender.com';

/**
 * @param {object} args
 * @param {string|null} args.userId - authenticated user id, or null when signed out
 * @param {() => Promise<string|null>} args.getAccessToken
 * @param {typeof fetch} [args.fetchImpl] - test seam, forwarded to createApiClient
 * @param {object} [args.cacheStorage] - test seam, forwarded to homeCache
 */
export function useHomeScreen({ userId, getAccessToken, fetchImpl, cacheStorage }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [home, setHome] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState(null);
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [viewFilter, setViewFilter] = useState('single');

  const expandedInitializedRef = useRef(false);
  const clientRef = useRef(null);
  if (!clientRef.current) {
    clientRef.current = createApiClient({ baseUrl: BACKEND_URL, getAccessToken, fetchImpl });
  }
  const guardRef = useRef(null);
  if (!guardRef.current) guardRef.current = createGenerationGuard();

  const load = useCallback(async function load() {
    if (!userId) {
      setStatus('ready');
      setHome(null);
      return;
    }

    const cached = getHomeCache(userId, { storage: cacheStorage });
    if (cached) {
      setHome(cached.response);
      setFromCache(true);
      setStatus('ready');
      setExpandedTeamId(function (prev) {
        if (expandedInitializedRef.current) return prev;
        expandedInitializedRef.current = true;
        return cached.response.defaultTeamId;
      });
    }

    const gen = guardRef.current.next();
    try {
      const result = await fetchHome(clientRef.current, { signal: gen.signal });
      if (!gen.isCurrent(gen.generation)) return; // superseded by a newer load()

      if (result.notModified) {
        setFromCache(false);
        return;
      }

      setHome(result.data);
      setFromCache(false);
      setStatus('ready');
      setError(null);
      setHomeCache(userId, result.data, { storage: cacheStorage });

      setExpandedTeamId(function (prev) {
        if (!expandedInitializedRef.current) {
          expandedInitializedRef.current = true;
          return result.data.defaultTeamId;
        }
        const stillPresent = prev && (result.data.teams || []).some(function (t) { return t.id === prev; });
        // The previously expanded team disappeared (access loss / no longer
        // a member) — fall back to the fresh default rather than pointing
        // at a team the caller can no longer see.
        return stillPresent ? prev : result.data.defaultTeamId;
      });
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      if (!cached) setStatus('error');
      setError(err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(function () {
    expandedInitializedRef.current = false;
    load();
  }, [userId, load]);

  const expandTeam = useCallback(function expandTeam(teamId) {
    setExpandedTeamId(teamId);
    setViewFilter('single');
  }, []);

  return {
    status,
    home,
    fromCache,
    error,
    expandedTeamId,
    setExpandedTeamId,
    viewFilter,
    setViewFilter,
    expandTeam,
    refetch: load,
  };
}
