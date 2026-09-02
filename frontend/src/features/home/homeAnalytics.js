/**
 * homeAnalytics.js — Story #1032's event schema, per
 * docs/product/API_DRIVEN_ARCHITECTURE_REDESIGN.md section 16.2. Thin
 * wrappers over the existing utils/analytics.js `track()` helper (not a
 * locked path, already fails safe on its own — see that file's try/catch).
 *
 * Non-PII by construction: every function here takes team_id/action_id/
 * role/cache_state/network_state, never a team name, roster content, or
 * child name. app_version is already an auto-injected Mixpanel super
 * property (frontend/CLAUDE.md § Analytics) — never passed explicitly.
 *
 * home_deep_link_resolved / home_deep_link_denied are defined here with
 * their schema ready, but not fired anywhere yet — there is no live route
 * resolution happening until #1030 wires #1027's resolveDestination() into
 * real navigation. Firing analytics from inside resolveDestination itself
 * would make it not a pure function, which the baseline document is
 * explicit that it must stay (section 28: "does not own ... navigation
 * policy"). #1030's integration is the intended call site.
 */
import { track } from '../../utils/analytics.js';

export function trackHomeApiLoaded({ teamCount, cacheState, networkState }) {
  track('home_api_loaded', { team_count: teamCount, cache_state: cacheState, network_state: networkState });
}

export function trackHomeApiCacheRendered({ teamCount, cacheState }) {
  track('home_api_cache_rendered', { team_count: teamCount, cache_state: cacheState });
}

export function trackHomeApiFailed({ errorCode, retryable, cacheState }) {
  track('home_api_failed', { error_code: errorCode, retryable: retryable, cache_state: cacheState });
}

export function trackHomeTeamExpanded({ teamId, role }) {
  track('home_team_expanded', { team_id: teamId, role: role });
}

export function trackHomeTeamFilterChanged({ viewFilter }) {
  track('home_team_filter_changed', { view_filter: viewFilter });
}

export function trackHomeActionSelected({ teamId, actionId, role }) {
  track('home_action_selected', { team_id: teamId, action_id: actionId, role: role });
}

/** Ready for #1030's destination-resolver integration; not yet called anywhere. */
export function trackHomeDeepLinkResolved({ destinationType, teamId }) {
  track('home_deep_link_resolved', { destination_type: destinationType, team_id: teamId });
}

/** Ready for #1030's destination-resolver integration; not yet called anywhere. */
export function trackHomeDeepLinkDenied({ destinationType, reason }) {
  track('home_deep_link_denied', { destination_type: destinationType, reason: reason });
}

export function trackHomeOfflineRendered({ cacheState }) {
  track('home_offline_rendered', { cache_state: cacheState });
}
