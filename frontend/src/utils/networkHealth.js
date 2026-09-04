/**
 * networkHealth.js — a self-correcting connectivity signal (#1062).
 *
 * `navigator.onLine` and the browser's `online`/`offline` events only ever
 * say "the network adapter changed state" — they do not reflect "requests
 * are actually succeeding." Found via #1033 evidence-gathering: a DevTools
 * Network throttle set to Offline blocked every request but never flipped
 * `navigator.onLine`, so `useHomeScreen.load()` kept attempting (and
 * retrying) real fetches instead of falling back to cache, exactly the
 * "Never attempt a network call while offline" guarantee that code already
 * tries to give.
 *
 * This module supplements the browser signal with an actually-observed
 * outcome: any caller that catches a genuine network-level fetch failure
 * (not an HTTP error status — the request never got a response at all)
 * reports it here; reaching the server at all — any status code — reports
 * success. A real browser `online`/`offline` event always wins immediately
 * in either direction, since it's still the most authoritative signal
 * available when it fires correctly.
 *
 * Consumers subscribe rather than poll, so App.jsx's `isOnline` state can
 * mirror this module's value with a single `subscribeNetworkHealth` call
 * instead of owning the raw event wiring itself.
 */

/** Consecutive reported failures before treating the connection as down
 * between real browser events — absorbs one isolated blip rather than
 * flipping on the very first retry attempt. */
const FAILURE_THRESHOLD = 2;

let consecutiveFailures = 0;
let effectiveOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
const listeners = new Set();

function setEffectiveOnline(next) {
  if (effectiveOnline === next) return;
  effectiveOnline = next;
  listeners.forEach((listener) => listener(effectiveOnline));
}

/** @returns {boolean} the current best-known connectivity state. */
export function getEffectiveOnline() {
  return effectiveOnline;
}

/** Reaching the server at all (any HTTP status) proves the network is up. */
export function reportNetworkSuccess() {
  consecutiveFailures = 0;
  setEffectiveOnline(true);
}

/** A genuine network-level fetch failure (thrown, not an HTTP error status). */
export function reportNetworkFailure() {
  consecutiveFailures += 1;
  if (consecutiveFailures >= FAILURE_THRESHOLD) {
    setEffectiveOnline(false);
  }
}

/**
 * @param {(online: boolean) => void} listener
 * @returns {() => void} unsubscribe
 */
export function subscribeNetworkHealth(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('online', () => {
    consecutiveFailures = 0;
    setEffectiveOnline(true);
  });
  window.addEventListener('offline', () => {
    setEffectiveOnline(false);
  });
}

/** Test-only reset seam — real callers never need this. */
export function __resetNetworkHealthForTests(initial) {
  consecutiveFailures = 0;
  effectiveOnline = initial;
}
