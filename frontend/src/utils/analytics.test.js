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

  test('mixpanel is re-exported for remaining direct SDK call sites', function () {
    expect(mixpanel).toBeDefined();
  });
});

describe('analytics — mixpanel.init() call shape (#1041)', function () {
  afterEach(function () {
    vi.unstubAllEnvs();
    vi.doUnmock('mixpanel-browser');
    vi.resetModules();
  });

  test('initializes with ignore_dnt: true — Do Not Track must not silently drop events (#1041)', async function () {
    vi.stubEnv('VITE_MIXPANEL_TOKEN', 'test-token-123');
    var initSpy = vi.fn(function (token, opts) {
      if (opts && typeof opts.loaded === 'function') opts.loaded();
    });
    vi.doMock('mixpanel-browser', function () {
      return {
        default: {
          init: initSpy,
          register: vi.fn(),
          track: vi.fn(),
          identify: vi.fn(),
          alias: vi.fn(),
          people: { set: vi.fn() },
        },
      };
    });

    vi.resetModules();
    await import('./analytics');

    expect(initSpy).toHaveBeenCalledTimes(1);
    var optsArg = initSpy.mock.calls[0][1];
    expect(optsArg.ignore_dnt).toBe(true);
  });
});
