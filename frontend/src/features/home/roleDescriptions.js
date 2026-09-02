/**
 * roleDescriptions.js — Story #1029 acceptance criterion: "Restricted
 * roles receive understandable context instead of unexplained missing
 * functionality where explanation is useful."
 *
 * admin/coach get no caption — both have full day-to-day team-management
 * access (roster/schedule/lineup/game), so there's no missing
 * functionality that needs explaining. scorekeeper and viewer are
 * genuinely restricted relative to what a coach can do on the same
 * screen, so they get a one-line reason rather than silently missing
 * actions.
 */
const ROLE_DESCRIPTIONS = {
  scorekeeper: "As a scorekeeper, you can start Game Mode and score games. Roster and schedule changes are made by this team's coaches.",
  viewer: "As a team member, you can view the roster, schedule, and lineup. Changes are made by this team's coaches.",
};

/**
 * @param {string} roleCode - normalized role code (admin/coach/scorekeeper/viewer)
 * @returns {string|null} a short explanation, or null when the role has no
 *   meaningful restriction worth calling out
 */
export function describeRole(roleCode) {
  return ROLE_DESCRIPTIONS[roleCode] || null;
}
