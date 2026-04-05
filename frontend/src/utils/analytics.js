/**
 * utils/analytics.js
 * Mixpanel wrapper — single source of truth for event tracking.
 * Import { track } (and mixpanel for identify/people.set) wherever needed.
 */

import mixpanel from 'mixpanel-browser';

var MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN || "";

// Device context — computed once at module load, shared as super properties
function getDeviceContext() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      is_pwa: false,
      platform: "unknown",
      device_os: "unknown",
      screen_width: 0,
      screen_height: 0
    };
  }
  var ua = navigator.userAgent;
  var isPWA = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  var platform = /iPhone|iPad|iPod/.test(ua) ? "ios"
    : /Android/.test(ua) ? "android"
    : "desktop";
  return {
    is_pwa: isPWA,
    platform: isPWA ? "pwa_" + platform : platform,
    device_os: platform,
    screen_width: window.screen.width,
    screen_height: window.screen.height
  };
}

export var deviceContext = getDeviceContext();

if (MIXPANEL_TOKEN !== "") {
  mixpanel.init(MIXPANEL_TOKEN, {
    track_pageview: true,
    persistence: "localStorage",
    ignore_dnt: false,
    opt_out_tracking_by_default: false
  });
  var APP_VERSION = __APP_VERSION__ || "unknown";
  // Register device context as super properties on every event
  if (typeof window !== "undefined") {
    mixpanel.register({
      is_pwa: deviceContext.is_pwa,
      platform: deviceContext.platform,
      device_os: deviceContext.device_os,
      screen_width: deviceContext.screen_width,
      screen_height: deviceContext.screen_height,
      app_version: APP_VERSION
    });
  }
}

export function track(event, props) {
  try {
    if (MIXPANEL_TOKEN !== "") {
      mixpanel.track(event, props || {});
    }
    if (window.location.hostname === "localhost") {
      console.log("[analytics]", event, props || {});
    }
  } catch (e) {}
}

export { mixpanel };
