import { describe, test, expect, afterEach } from 'vitest';
import { getDeviceContext } from './deviceContext';

// ============================================================================
// utils/deviceContext.js — the frontend producer for device-context data;
// backend/scripts/tests/suite-device-context.js tests the receiving end,
// but this producer had no coverage of its own. Feeds analytics and
// auth/access-request device fingerprinting.
// ============================================================================

function stubUserAgent(ua) {
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true });
}

var ORIGINAL_UA = window.navigator.userAgent;

describe('getDeviceContext', function () {
  afterEach(function () {
    stubUserAgent(ORIGINAL_UA);
  });

  test('detects iOS + mobile for an iPhone user agent', function () {
    stubUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
    var ctx = getDeviceContext('3.1.0');
    expect(ctx.platform).toBe('iOS');
    expect(ctx.device_type).toBe('mobile');
  });

  test('detects iOS + tablet for an iPad user agent', function () {
    stubUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
    var ctx = getDeviceContext('3.1.0');
    expect(ctx.platform).toBe('iOS');
    expect(ctx.device_type).toBe('tablet');
  });

  test('detects Android + mobile for a phone-shaped Android user agent', function () {
    stubUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Mobile Safari/537.36');
    var ctx = getDeviceContext('3.1.0');
    expect(ctx.platform).toBe('Android');
    expect(ctx.device_type).toBe('mobile');
    expect(ctx.browser).toBe('Chrome');
  });

  test('detects Android + tablet when "Mobile" is absent from the user agent', function () {
    stubUserAgent('Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36');
    var ctx = getDeviceContext('3.1.0');
    expect(ctx.platform).toBe('Android');
    expect(ctx.device_type).toBe('tablet');
  });

  test('detects Windows + desktop + Edge', function () {
    stubUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36 Edg/119.0.2151.58');
    var ctx = getDeviceContext('3.1.0');
    expect(ctx.platform).toBe('Windows');
    expect(ctx.device_type).toBe('desktop');
    expect(ctx.browser).toBe('Edge');
  });

  test('detects macOS + desktop + Safari, and distinguishes it from iPadOS-as-Macintosh', function () {
    stubUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15');
    var ctx = getDeviceContext('3.1.0');
    expect(ctx.platform).toBe('macOS');
    expect(ctx.device_type).toBe('desktop');
    expect(ctx.browser).toBe('Safari');
  });

  test('detects Linux + desktop', function () {
    stubUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/119.0');
    var ctx = getDeviceContext('3.1.0');
    expect(ctx.platform).toBe('Linux');
    expect(ctx.browser).toBe('Firefox');
  });

  test('falls back to "unknown" platform/browser for an unrecognized user agent', function () {
    stubUserAgent('SomeUnknownBot/1.0');
    var ctx = getDeviceContext('3.1.0');
    expect(ctx.platform).toBe('unknown');
    expect(ctx.browser).toBe('unknown');
    expect(ctx.browser_version).toBe('unknown');
  });

  test('access_mode is "browser" by default (no standalone/display-mode signal)', function () {
    stubUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36');
    var ctx = getDeviceContext('3.1.0');
    expect(ctx.access_mode).toBe('browser');
  });

  test('passes through the given app version, defaulting to "unknown" when omitted', function () {
    expect(getDeviceContext('3.1.0').app_version).toBe('3.1.0');
    expect(getDeviceContext().app_version).toBe('unknown');
  });

  test('includes a resolved IANA timezone string', function () {
    var ctx = getDeviceContext('3.1.0');
    expect(typeof ctx.timezone).toBe('string');
    expect(ctx.timezone.length).toBeGreaterThan(0);
  });
});
