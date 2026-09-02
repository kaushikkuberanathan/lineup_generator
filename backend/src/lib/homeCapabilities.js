/**
 * homeCapabilities — server-owned capability and contextual-action assembly
 * for the Home read model (Story #1023/#1024, docs/product/API_DRIVEN_ARCHITECTURE_REDESIGN.md
 * section 26).
 *
 * Capabilities are derived from the normalized role ONLY (section 26.1's
 * baseline matrix) — resource state never adds a capability, it can only
 * disable/omit an action built from one. Every action still needs an
 * independent reauthorization at its destination/command per section 26.2 —
 * this module produces discovery data, not authorization.
 */

const { normalizeRole } = require('./normalizeRole');

/** Section 26.1 baseline matrix. 'V' = view/discover, 'M' = manage/mutate. */
const CAPABILITY_MATRIX = Object.freeze({
  admin: Object.freeze([
    'team.view', 'team.manage',
    'membership.manage',
    'roster.view', 'roster.manage',
    'schedule.view', 'schedule.manage',
    'lineup.view', 'lineup.create', 'lineup.manage', 'lineup.lock',
    'game.view_mode', 'game.start_mode',
    'scoring.view', 'scoring.claim', 'scoring.record', 'scoring.finalize',
  ]),
  coach: Object.freeze([
    'team.view',
    'roster.view', 'roster.manage',
    'schedule.view', 'schedule.manage',
    'lineup.view', 'lineup.create', 'lineup.manage', 'lineup.lock',
    'game.view_mode', 'game.start_mode',
    'scoring.view', 'scoring.claim', 'scoring.record', 'scoring.finalize',
  ]),
  scorekeeper: Object.freeze([
    'team.view',
    'roster.view',
    'schedule.view',
    'lineup.view',
    'game.view_mode', 'game.start_mode',
    'scoring.view', 'scoring.claim', 'scoring.record',
  ]),
  viewer: Object.freeze([
    'team.view',
    'roster.view',
    'schedule.view',
    'lineup.view',
    'game.view_mode',
    'scoring.view',
  ]),
});

const ROLE_LABELS = Object.freeze({
  admin: 'Team Admin / Head Coach',
  coach: 'Coach / Coordinator',
  scorekeeper: 'Scorekeeper',
  viewer: 'Team Member / Parent',
});

/**
 * @param {string} rawRole - raw team_memberships.role value (may be a legacy label)
 * @returns {{code: string, label: string}}
 * @throws when the role is unrecognized or is the forbidden global platform_admin value
 */
function resolveRole(rawRole) {
  const code = normalizeRole(rawRole);
  return { code, label: ROLE_LABELS[code] };
}

/**
 * @param {string} roleCode - already-normalized role code
 * @returns {string[]} capability list for that role (discovery only)
 */
function capabilitiesForRole(roleCode) {
  return CAPABILITY_MATRIX[roleCode] ? CAPABILITY_MATRIX[roleCode].slice() : [];
}

function has(capabilities, capability) {
  return capabilities.includes(capability);
}

/**
 * Build the contextual actions array for one team's Home card.
 *
 * Deliberately excludes any action gated on live-scoring session state
 * (game_scoring_sessions / live_game_state) — the Home aggregation never
 * reads those tables (section 11.4's exclusion list), so scoring.claim is
 * only ever advertised for roles the matrix grants it to by default
 * (admin/coach/scorekeeper). A viewer's scoring capability is a per-game
 * lock/policy decision (section 26.1 footnote) that Home has no basis to
 * evaluate, so the action is omitted entirely for viewers rather than
 * guessed at — never advertised "enabled" from role alone, and never
 * fabricated as "disabled" without a real reason to report.
 *
 * lineupId is intentionally always null: the live schema has one grid/
 * batting_order per team_data row, not a separate addressable per-game
 * lineup record. Until a real Lineups resource exists (migration order,
 * section 18), actions link to the team's lineup collection path
 * (/app/teams/:teamId/lineups), not a fabricated :lineupId segment.
 *
 * @param {object} team - { id, displayName, capabilities, nextEvent, readiness }
 * @returns {Array<{id:string,label:string,href:string,enabled:boolean,disabledReason:string|null}>}
 */
function buildActions(team) {
  const { id: teamId, displayName, capabilities, nextEvent } = team;
  const actions = [];

  if (has(capabilities, 'roster.manage')) {
    actions.push({
      id: 'manage_roster',
      label: `Manage ${displayName} roster`,
      href: `/app/teams/${teamId}/roster`,
      enabled: true,
      disabledReason: null,
    });
  } else if (has(capabilities, 'roster.view')) {
    actions.push({
      id: 'view_roster',
      label: `View ${displayName} roster`,
      href: `/app/teams/${teamId}/roster`,
      enabled: true,
      disabledReason: null,
    });
  }

  if (has(capabilities, 'schedule.manage')) {
    actions.push({
      id: 'manage_schedule',
      label: `Manage ${displayName} schedule`,
      href: `/app/teams/${teamId}/schedule`,
      enabled: true,
      disabledReason: null,
    });
  } else if (has(capabilities, 'schedule.view')) {
    actions.push({
      id: 'view_schedule',
      label: `View ${displayName} schedule`,
      href: `/app/teams/${teamId}/schedule`,
      enabled: true,
      disabledReason: null,
    });
  }

  if (has(capabilities, 'lineup.view')) {
    actions.push({
      id: 'view_lineup',
      label: `View ${displayName} lineup`,
      href: `/app/teams/${teamId}/lineups`,
      enabled: true,
      disabledReason: null,
    });
  }

  if (nextEvent && has(capabilities, 'game.start_mode')) {
    actions.push({
      id: 'start_game_mode',
      label: `Start ${displayName} Game Mode`,
      href: `/app/teams/${teamId}/games/${nextEvent.id}/mode`,
      enabled: true,
      disabledReason: null,
    });
  }

  if (nextEvent && has(capabilities, 'scoring.claim')) {
    actions.push({
      id: 'claim_scoring',
      label: `Claim scoring for ${displayName}`,
      href: `/app/teams/${teamId}/games/${nextEvent.id}/score`,
      enabled: true,
      disabledReason: null,
    });
  }

  if (has(capabilities, 'team.manage')) {
    actions.push({
      id: 'manage_team',
      label: `Manage ${displayName} team settings`,
      href: `/app/teams/${teamId}`,
      enabled: true,
      disabledReason: null,
    });
  }

  return actions;
}

module.exports = {
  CAPABILITY_MATRIX,
  ROLE_LABELS,
  resolveRole,
  capabilitiesForRole,
  buildActions,
};
