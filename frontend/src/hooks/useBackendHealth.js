/**
 * useBackendHealth — polls the Render backend /ping endpoint to detect cold starts.
 *
 * Returns:
 *   status:         'checking' | 'ok' | 'slow' | 'down'
 *   latencyMs:      number | null
 *   checkingVisible: boolean  — true only for the first 3s of a check cycle;
 *                               use this to show the "Connecting..." pill without
 *                               alarming users on fast connections
 */

import { useState, useEffect, useRef } from 'react';

const BACKEND_URL =
  (import.meta.env && import.meta.env.VITE_BACKEND_URL) ||
  'https://lineup-generator-backend.onrender.com';

// In local dev without an explicit backend URL, skip the health check entirely
// (no point pinging production from localhost — it causes CORS noise)
const IS_LOCAL_DEV = import.meta.env.DEV && !(import.meta.env && import.meta.env.VITE_BACKEND_URL);

const TIMEOUT_MS         = 8000;   // abort if no response
const SLOW_THRESHOLD_MS  = 2000;   // >2s = cold-starting
const RECHECK_MS         = 5 * 60 * 1000;  // re-ping every 5 minutes
const HIDE_CHECKING_MS   = 3000;   // stop showing "Connecting..." after 3s

export function useBackendHealth() {
  var _s  = useState('checking');
  var status  = _s[0];  var setStatus  = _s[1];
  var _lms = useState(null);
  var latencyMs = _lms[0]; var setLatencyMs = _lms[1];
  var _cv = useState(false);
  var checkingVisible = _cv[0]; var setCheckingVisible = _cv[1];

  var hideTimerRef  = useRef(null);
  var recheckRef    = useRef(null);

  function check() {
    setStatus('checking');
    setLatencyMs(null);
    setCheckingVisible(true);

    // Auto-hide "Connecting..." pill after 3s if still pending
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(function() {
      setCheckingVisible(false);
    }, HIDE_CHECKING_MS);

    var start = Date.now();
    var controller = new AbortController();
    var abortTimer = setTimeout(function() { controller.abort(); }, TIMEOUT_MS);

    fetch(BACKEND_URL + '/ping', { signal: controller.signal })
      .then(function() {
        clearTimeout(abortTimer);
        clearTimeout(hideTimerRef.current);
        var ms = Date.now() - start;
        setLatencyMs(ms);
        setStatus(ms < SLOW_THRESHOLD_MS ? 'ok' : 'slow');
        setCheckingVisible(false);
      })
      .catch(function() {
        clearTimeout(abortTimer);
        clearTimeout(hideTimerRef.current);
        setStatus('down');
        setLatencyMs(null);
        setCheckingVisible(false);
      });
  }

  useEffect(function() {
    if (IS_LOCAL_DEV) {
      setStatus('ok');
      setCheckingVisible(false);
      return;
    }
    check();
    recheckRef.current = setInterval(check, RECHECK_MS);
    return function() {
      clearInterval(recheckRef.current);
      clearTimeout(hideTimerRef.current);
    };
  }, []);

  return { status: status, latencyMs: latencyMs, checkingVisible: checkingVisible };
}
