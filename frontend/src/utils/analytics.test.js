import { describe, test, expect, vi, afterEach } from 'vitest';
import { track, deviceContext, mixpanel } from './analytics';

// ============================================================================
// utils/analytics.js — the Mixpanel wrapper, previously with zero test
// coverage. VITE_MIXPANEL_TOKEN is unset in the test environment, so the
// module's init block never runs (matching production behavior for any
// build without the token configured) — these tests cover track()'s safe,
// deterministic behavior under that condition, plus the deviceContext shape.
// ============================================================================

describe('analytics', function () {
  afterEach(function () {
    vi.restoreAllMocks();
  });

  test('track() does not throw when called with no Mixpanel token configured', function () {
    expect(function () { track('test_event', { foo: 'bar' }); }).not.toThrow();
  });

  test('track() does not throw when called with no props', function () {
    expect(function () { track('test_event'); }).not.toThrow();
  });

  test('track() logs to console when running on localhost', function () {
    var spy = vi.spyOn(console, 'log').mockImplementation(function () {});
    track('test_event', { foo: 'bar' });
    expect(spy).toHaveBeenCalledWith('[analytics]', 'test_event', { foo: 'bar' });
  });

  test('track() swallows a thrown error instead of crashing the caller', function () {
    var spy = vi.spyOn(console, 'log').mockImplementation(function () { throw new Error('boom'); });
    expect(function () { track('test_event'); }).not.toThrow();
    spy.mockRestore();
  });

  test('deviceContext exports the documented super-property shape', function () {
    expect(deviceContext).toHaveProperty('is_pwa');
    expect(deviceContext).toHaveProperty('platform');
    expect(deviceContext).toHaveProperty('device_os');
    expect(deviceContext).toHaveProperty('screen_width');
    expect(deviceContext).toHaveProperty('screen_height');
    expect(typeof deviceContext.is_pwa).toBe('boolean');
  });

  test('mixpanel is re-exported for identify/people.set call sites', function () {
    expect(mixpanel).toBeDefined();
  });
});
