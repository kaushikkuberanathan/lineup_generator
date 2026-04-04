/**
 * utils/analytics.js
 * Mixpanel wrapper — single source of truth for event tracking.
 * Import { track } (and mixpanel for identify/people.set) wherever needed.
 */

import mixpanel from 'mixpanel-browser';

var MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN || "";
if (MIXPANEL_TOKEN !== "") {
  mixpanel.init(MIXPANEL_TOKEN, {
    track_pageview: true,
    persistence: "localStorage",
    ignore_dnt: false,
    opt_out_tracking_by_default: false
  });
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
