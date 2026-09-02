/**
 * offlineActionGating.js — Story #1031's "Offline state ... limits
 * server-required commands" criterion. Pure function, no React: given the
 * teams from a Home response and the current online state, returns a new
 * teams array where every action that WAS enabled is forced disabled with
 * an offline-specific reason. Actions already disabled for a real reason
 * (e.g. a locked lineup) keep that original reason — offline is not the
 * cause of that one, so it shouldn't claim to be.
 *
 * Never mutates the input — the underlying home response is left intact
 * so a reconnect can restore the real action states without needing to
 * refetch.
 */
const OFFLINE_REASON = "You're offline — reconnect to continue.";

/**
 * @param {Array} teams
 * @param {boolean} isOnline
 * @returns {Array} teams, unchanged if isOnline is true
 */
export function applyOfflineActionGating(teams, isOnline) {
  if (isOnline || !Array.isArray(teams)) return teams;

  return teams.map(function (team) {
    if (!team.actions || team.actions.length === 0) return team;
    return Object.assign({}, team, {
      actions: team.actions.map(function (action) {
        if (!action.enabled) return action; // already disabled for a real reason — keep it
        return Object.assign({}, action, { enabled: false, disabledReason: OFFLINE_REASON });
      }),
    });
  });
}

export { OFFLINE_REASON };
