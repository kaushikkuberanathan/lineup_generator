import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getEffectiveOnline,
  reportNetworkSuccess,
  reportNetworkFailure,
  subscribeNetworkHealth,
  __resetNetworkHealthForTests,
} from '../utils/networkHealth.js';

describe('networkHealth (#1062)', function () {
  beforeEach(function () {
    __resetNetworkHealthForTests(true);
  });

  it('N1: starts online (test reset seam) and a single reported failure does not flip it', function () {
    expect(getEffectiveOnline()).toBe(true);
    reportNetworkFailure();
    expect(getEffectiveOnline()).toBe(true);
  });

  it('N2: two consecutive reported failures flip effective state to offline', function () {
    reportNetworkFailure();
    reportNetworkFailure();
    expect(getEffectiveOnline()).toBe(false);
  });

  it('N3: a reported success resets the failure count and restores online', function () {
    reportNetworkFailure();
    reportNetworkFailure();
    expect(getEffectiveOnline()).toBe(false);

    reportNetworkSuccess();
    expect(getEffectiveOnline()).toBe(true);

    // count was reset — a single subsequent failure must not immediately flip it again
    reportNetworkFailure();
    expect(getEffectiveOnline()).toBe(true);
  });

  it('N4: subscribers are notified only on an actual state change, with the new value', function () {
    const listener = vi.fn();
    const unsubscribe = subscribeNetworkHealth(listener);

    reportNetworkFailure(); // 1st — no flip yet
    expect(listener).not.toHaveBeenCalled();

    reportNetworkFailure(); // 2nd — flips to false
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(false);

    reportNetworkFailure(); // already false — no redundant notification
    expect(listener).toHaveBeenCalledTimes(1);

    reportNetworkSuccess(); // flips back to true
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(true);

    unsubscribe();
    reportNetworkFailure();
    reportNetworkFailure();
    expect(listener).toHaveBeenCalledTimes(2); // unsubscribed — no further calls
  });

  it('N5: a real browser "offline" event flips state immediately, even on the first occurrence', function () {
    expect(getEffectiveOnline()).toBe(true);
    window.dispatchEvent(new Event('offline'));
    expect(getEffectiveOnline()).toBe(false);
  });

  it('N6: a real browser "online" event flips state back immediately and resets the failure count', function () {
    window.dispatchEvent(new Event('offline'));
    expect(getEffectiveOnline()).toBe(false);

    window.dispatchEvent(new Event('online'));
    expect(getEffectiveOnline()).toBe(true);

    // count was reset by the online event — one failure must not immediately re-flip
    reportNetworkFailure();
    expect(getEffectiveOnline()).toBe(true);
  });
});
