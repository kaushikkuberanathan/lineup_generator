/**
 * utils/analytics.js
 * Mixpanel wrapper — single source of truth for event tracking.
 * Import { track, identifyTeam } for events and team identity. The raw
 * mixpanel export remains only for SDK operations without a wrapper yet.
 */

import mixpanel from 'mixpanel-browser';

var MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN || "";
var mixpanelReady = false;
var pendingIdentity = null;

function applyIdentity(identity) {
  try {
    mixpanel.identify(identity.teamId);
    if (identity.alias) { mixpanel.alias(identity.alias); }
    mixpanel.people.set(identity.peopleProps || {});
  } catch (_) { /* analytics failure must not crash the app */ }
}

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
    // #1041: Dugout Lineup has no ad network and doesn't sell or share
    // data (see Privacy Policy > Analytics) — Do Not Track's advertising
    // opt-out doesn't map onto first-party product analytics, and
    // honoring it was silently zeroing out real coach usage data with no
    // error or log anywhere. Overriding deliberately, disclosed in the
    // Privacy Policy.
    ignore_dnt: true,
    opt_out_tracking_by_default: false,
    loaded: function() {
      mixpanelReady = true;
      if (pendingIdentity) {
        var identity = pendingIdentity;
        pendingIdentity = null;
        applyIdentity(identity);
      }
    }
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
  } catch (_) { /* analytics failure must not crash the app */ }
}

export function identifyTeam(teamId, alias, peopleProps) {
  if (MIXPANEL_TOKEN === "") return;

  var identity = { teamId: teamId, alias: alias, peopleProps: peopleProps };
  if (!mixpanelReady) {
    // Keep only the newest team selection while the SDK finishes loading.
    pendingIdentity = identity;
    return;
  }
  applyIdentity(identity);
}

export { mixpanel };
