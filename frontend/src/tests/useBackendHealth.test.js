/**
 * useBackendHealth.test.js
 *
 * Coverage-analysis follow-up (session 2026-08-23): useBackendHealth.js had
 * zero test coverage. It drives the "Connecting..." / cold-start pill shown
 * across the app, so a broken status transition would misfire that UI
 * silently (e.g. never showing "down", or never clearing "checking").
 *
 * The module reads import.meta.env.DEV / VITE_BACKEND_URL at import time to
 * compute IS_LOCAL_DEV, so each test that needs the real ping path stubs
 * VITE_BACKEND_URL to a non-empty value (forcing IS_LOCAL_DEV false
 * regardless of DEV) and re-imports the module fresh via vi.resetModules().
 *
 * Groups:
 *   A. Local-dev short-circuit (no VITE_BACKEND_URL)
 *   B. Real ping path — ok / slow / down / retry
 *   C. checkingVisible timing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { renderHook } from './helpers/renderHook.js';

// Fake-timer advances that trigger state updates must be wrapped in act(),
// same as renderHook's own initial-render wrapping — otherwise React logs
// "not configured to support act(...)" and the update may not have flushed
// by the time assertions run.
async function tick(ms) {
  await act(async function () {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('useBackendHealth', function () {

  beforeEach(function () {
    vi.resetModules();
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  afterEach(function () {
    vi.useRealTimers();
    delete global.fetch;
    vi.unstubAllEnvs();
  });

  // ── Group A: local-dev short-circuit ─────────────────────────────────────

  describe('A: local dev without an explicit backend URL', function () {

    it('A1: status is immediately "ok" and no fetch is ever made', async function () {
      vi.stubEnv('VITE_BACKEND_URL', '');
      var { useBackendHealth } = await import('../hooks/useBackendHealth.js');

      var h = await renderHook(function () { return useBackendHealth(); });

      expect(h.result.current.status).toBe('ok');
      expect(h.result.current.checkingVisible).toBe(false);

      await tick(15000);
      expect(global.fetch).not.toHaveBeenCalled();

      await h.unmount();
    });
  });

  // ── Group B: real ping path ───────────────────────────────────────────────

  describe('B: real ping path (VITE_BACKEND_URL set)', function () {

    beforeEach(function () {
      vi.stubEnv('VITE_BACKEND_URL', 'https://backend.test');
    });

    it('B1: a fast successful ping resolves to "ok" with a latency reading', async function () {
      global.fetch.mockResolvedValue({});
      var { useBackendHealth } = await import('../hooks/useBackendHealth.js');

      var h = await renderHook(function () { return useBackendHealth(); });
      expect(h.result.current.status).toBe('checking');

      await tick(2000); // INITIAL_DELAY_MS
      await tick(0);    // flush the resolved fetch promise

      expect(global.fetch).toHaveBeenCalledWith(
        'https://backend.test/ping',
        expect.objectContaining({ signal: expect.anything() })
      );
      expect(h.result.current.status).toBe('ok');
      expect(h.result.current.latencyMs).not.toBeNull();
      expect(h.result.current.checkingVisible).toBe(false);

      await h.unmount();
    });

    it('B2: a ping slower than the 5s threshold resolves to "slow"', async function () {
      global.fetch.mockImplementation(function () {
        return new Promise(function (resolve) {
          setTimeout(function () { resolve({}); }, 6000);
        });
      });
      var { useBackendHealth } = await import('../hooks/useBackendHealth.js');

      var h = await renderHook(function () { return useBackendHealth(); });

      await tick(2000); // fires the first check
      await tick(6000); // the slow fetch resolves

      expect(h.result.current.status).toBe('slow');
      expect(h.result.current.latencyMs).toBeGreaterThanOrEqual(5000);

      await h.unmount();
    });

    it('B3: a ping that never resolves aborts at the 10s timeout and is treated as a failure needing retry', async function () {
      var abortedSignals = [];
      global.fetch.mockImplementation(function (url, opts) {
        abortedSignals.push(opts.signal);
        return new Promise(function () { /* never resolves on its own */ });
      });
      var { useBackendHealth } = await import('../hooks/useBackendHealth.js');

      var h = await renderHook(function () { return useBackendHealth(); });

      await tick(2000);  // first check starts
      await tick(10000); // TIMEOUT_MS fires the abort

      expect(abortedSignals[0].aborted).toBe(true);
      // Still mid-retry sequence — not yet "down" (see B4 for the full sequence).
      expect(h.result.current.status).toBe('checking');

      await h.unmount();
    });

    it('B4: repeated failures exhaust MAX_RETRIES and settle on "down"', async function () {
      global.fetch.mockRejectedValue(new Error('network down'));
      var { useBackendHealth } = await import('../hooks/useBackendHealth.js');

      var h = await renderHook(function () { return useBackendHealth(); });

      await tick(2000); // attempt 0 fires and rejects
      await tick(3000); // retry delay -> attempt 1
      await tick(3000); // retry delay -> attempt 2 (final)

      expect(global.fetch).toHaveBeenCalledTimes(3); // attempts 0, 1, 2 (MAX_RETRIES=2)
      expect(h.result.current.status).toBe('down');
      expect(h.result.current.latencyMs).toBeNull();
      expect(h.result.current.checkingVisible).toBe(false);

      await h.unmount();
    });

    it('B5: re-pings on the 5-minute recheck interval after settling', async function () {
      global.fetch.mockResolvedValue({});
      var { useBackendHealth } = await import('../hooks/useBackendHealth.js');

      var h = await renderHook(function () { return useBackendHealth(); });
      await tick(2000);
      await tick(0);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      await tick(5 * 60 * 1000);
      await tick(0);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      await h.unmount();
    });
  });

  // ── Group C: checkingVisible timing ───────────────────────────────────────

  describe('C: checkingVisible auto-hide', function () {

    beforeEach(function () {
      vi.stubEnv('VITE_BACKEND_URL', 'https://backend.test');
    });

    it('C1: checkingVisible flips to false after 3s even if the ping is still pending', async function () {
      global.fetch.mockImplementation(function () {
        return new Promise(function (resolve) {
          setTimeout(function () { resolve({}); }, 8000);
        });
      });
      var { useBackendHealth } = await import('../hooks/useBackendHealth.js');

      var h = await renderHook(function () { return useBackendHealth(); });

      await tick(2000); // check starts
      expect(h.result.current.checkingVisible).toBe(true);

      await tick(3000); // HIDE_CHECKING_MS elapses
      expect(h.result.current.checkingVisible).toBe(false);
      expect(h.result.current.status).toBe('checking'); // still unresolved

      await h.unmount();
    });
  });
});
