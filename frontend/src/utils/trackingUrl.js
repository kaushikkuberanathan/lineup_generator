/**
 * trackingUrl.js — UTM tracking framework for outbound links
 *
 * utm_source is always 'dugoutlineup' — identifies this app as the traffic origin.
 *
 * utm_medium is auto-detected at click time:
 *   - 'pwa'  when the app is running in standalone/installed mode (added to home screen)
 *   - 'web'  when running in a standard browser tab
 *   Detection runs at click time, not at module load, so it reflects the actual
 *   display mode when the user taps the link.
 *
 * utm_campaign and utm_content use registered constants from CAMPAIGNS and CONTENT
 * below. Using constants prevents typos and makes it easy to audit all tracked links.
 *
 * Click events are captured via handleOutboundClick BEFORE navigation occurs.
 * This means attribution is not dependent on the destination site's redirect
 * behavior, HTTP redirects stripping query params, or the user's browser blocking
 * the destination page load.
 *
 * Usage in JSX (preferred):
 *   <a {...outboundLinkProps(url, { campaign: CAMPAIGNS.SHARON_SPRINGS, content: CONTENT.SCHEDULE_TAB })}>
 *     Sharon Springs Athletics
 *   </a>
 */

// ---------------------------------------------------------------------------
// Display medium detection
// ---------------------------------------------------------------------------

function getDisplayMedium() {
  if (typeof window === 'undefined') return 'web';
  if (window.navigator.standalone === true) return 'pwa';
  if (window.matchMedia('(display-mode: standalone)').matches) return 'pwa';
  return 'web';
}

// ---------------------------------------------------------------------------
// Campaign and content registries
// ---------------------------------------------------------------------------

export const CAMPAIGNS = {
  SHARON_SPRINGS: 'sharon_springs',
  COUNTY_LEAGUE:  'county_league',
  SNACK_VENDOR:   'snack_vendor',
  SPONSOR:        'sponsor',
  GENERAL:        'general',
};

export const CONTENT = {
  SCHEDULE_TAB:   'schedule_tab',
  SNACK_DUTY_TAB: 'snack_duty_tab',
  GAME_INFO_CARD: 'game_info_card',
  STANDINGS_LINK: 'standings_link',
};

// ---------------------------------------------------------------------------
// Core URL builder
// ---------------------------------------------------------------------------

export function trackingUrl(url, { campaign = CAMPAIGNS.GENERAL, content = '' } = {}) {
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', 'dugoutlineup');
    u.searchParams.set('utm_medium', getDisplayMedium());
    u.searchParams.set('utm_campaign', campaign);
    if (content) u.searchParams.set('utm_content', content);
    return u.toString();
  } catch {
    return url; // malformed URL — fail safe, never crash
  }
}

// ---------------------------------------------------------------------------
// Outbound click handler
// Click-side attribution — decoupled from destination redirect behavior.
// ---------------------------------------------------------------------------

export function handleOutboundClick(url, { campaign = CAMPAIGNS.GENERAL, content = '' } = {}) {
  try {
    const medium = getDisplayMedium();
    const event = {
      type: 'outbound_click',
      destination: url,
      campaign,
      content,
      medium,
      timestamp: new Date().toISOString(),
    };
    // Console log for now — structured for future analytics integration.
    // Future: replace with posthog.capture(), plausible(), ga4 event, etc.
    console.info('[DugoutLineup] Outbound click:', event);
  } catch {
    // Never let analytics crash navigation
  }
}

// ---------------------------------------------------------------------------
// Composed helper — use this in JSX for the cleanest call site
// ---------------------------------------------------------------------------

export function outboundLinkProps(url, { campaign = CAMPAIGNS.GENERAL, content = '' } = {}) {
  return {
    href: trackingUrl(url, { campaign, content }),
    target: '_blank',
    rel: 'noopener noreferrer',
    onClick: () => handleOutboundClick(url, { campaign, content }),
  };
}
