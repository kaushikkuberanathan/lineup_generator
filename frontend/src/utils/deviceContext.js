export function getDeviceContext(appVersion) {
  try {
    const ua = navigator.userAgent || '';

    const platform = (() => {
      if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
      if (/android/i.test(ua)) return 'Android';
      if (/windows/i.test(ua)) return 'Windows';
      if (/macintosh|mac os x/i.test(ua)) return 'macOS';
      if (/linux/i.test(ua)) return 'Linux';
      return 'unknown';
    })();

    const device_type = (() => {
      const isIpadOS = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
      if (/ipad/i.test(ua) || isIpadOS) return 'tablet';
      if (/android/i.test(ua) && !/mobile/i.test(ua)) return 'tablet';
      if (/iphone|ipod|android.*mobile|mobile/i.test(ua)) return 'mobile';
      return 'desktop';
    })();

    const browsers = [
      { name: 'Edge',    pattern: /edg\/([\d.]+)/i },
      { name: 'Samsung', pattern: /samsungbrowser\/([\d.]+)/i },
      { name: 'Firefox', pattern: /firefox\/([\d.]+)/i },
      { name: 'Chrome',  pattern: /chrome\/([\d.]+)/i },
      { name: 'Safari',  pattern: /version\/([\d.]+).*safari/i },
    ];
    let browser = 'unknown', browser_version = 'unknown';
    for (const { name, pattern } of browsers) {
      const match = ua.match(pattern);
      if (match) {
        browser = name;
        browser_version = match[1]?.split('.').slice(0, 2).join('.') ?? 'unknown';
        break;
      }
    }

    const access_mode = (() => {
      if (navigator.standalone === true) return 'pwa';
      if (window.matchMedia('(display-mode: standalone)').matches) return 'pwa';
      return 'browser';
    })();

    const timezone = (() => {
      try { return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'unknown'; }
      catch { return 'unknown'; }
    })();

    return {
      platform,
      device_type,
      browser,
      browser_version,
      os_version: 'unknown',
      access_mode,
      app_version: appVersion ?? 'unknown',
      timezone,
    };
  } catch {
    return {
      platform: 'unknown', device_type: 'unknown', browser: 'unknown',
      browser_version: 'unknown', os_version: 'unknown', access_mode: 'unknown',
      app_version: appVersion ?? 'unknown', timezone: 'unknown',
    };
  }
}
