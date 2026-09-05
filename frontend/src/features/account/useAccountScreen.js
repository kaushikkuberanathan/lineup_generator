import { useCallback, useEffect, useRef, useState } from 'react';
import { createApiClient, createGenerationGuard } from '../../api/client.js';
import { fetchAccount } from '../../api/account.js';
import { getAccountCache, setAccountCache } from '../../api/accountCache.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://lineup-generator-backend.onrender.com';
const ACCOUNT_CONTRACT_VERSION = 1;

export function useAccountScreen({ userId, getAccessToken, isOnline = true, fetchImpl, waitImpl, cacheStorage }) {
  const [status, setStatus] = useState('loading');
  const [account, setAccount] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState(null);
  const tokenRef = useRef(getAccessToken);
  tokenRef.current = getAccessToken;
  const onlineRef = useRef(isOnline);
  onlineRef.current = isOnline;
  const clientRef = useRef(null);
  const guardRef = useRef(null);

  if (!clientRef.current) {
    clientRef.current = createApiClient({
      baseUrl: BACKEND_URL,
      getAccessToken: function () { return tokenRef.current ? tokenRef.current() : null; },
      fetchImpl,
      waitImpl,
    });
  }
  if (!guardRef.current) guardRef.current = createGenerationGuard();

  const load = useCallback(async function () {
    if (!userId) {
      setAccount(null);
      setStatus('ready');
      return;
    }
    const cached = getAccountCache(userId, { storage: cacheStorage, expectedVersion: ACCOUNT_CONTRACT_VERSION });
    if (cached) {
      setAccount(cached.response);
      setFromCache(true);
      setStatus('ready');
    }
    if (!onlineRef.current) {
      if (!cached) setStatus('offline');
      return;
    }

    const request = guardRef.current.next();
    try {
      const result = await fetchAccount(clientRef.current, { signal: request.signal, ifNoneMatch: cached && cached.etag });
      if (!request.isCurrent(request.generation)) return;
      if (result.notModified) {
        setFromCache(false);
        setStatus('ready');
        return;
      }
      setAccount(result.data);
      setAccountCache(userId, result.data, { storage: cacheStorage, etag: result.etag });
      setFromCache(false);
      setError(null);
      setStatus('ready');
    } catch (loadError) {
      if (loadError && loadError.name === 'AbortError') return;
      setError(loadError);
      if (!cached) setStatus('error');
    }
  }, [userId, cacheStorage]);

  useEffect(function () { load(); }, [load]);

  return { status, account, fromCache, error, refetch: load };
}
