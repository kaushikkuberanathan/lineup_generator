/**
 * Shared server-owned role and capability policy for authenticated API
 * surfaces (#1132). These values are discovery data only; every destination
 * and command must independently reauthorize the caller.
 */
const { normalizeRole } = require('./normalizeRole');

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

function resolveRole(rawRole) {
  const code = normalizeRole(rawRole);
  return { code, label: ROLE_LABELS[code] };
}

function capabilitiesForRole(roleCode) {
  return CAPABILITY_MATRIX[roleCode] ? CAPABILITY_MATRIX[roleCode].slice() : [];
}

module.exports = {
  CAPABILITY_MATRIX,
  ROLE_LABELS,
  resolveRole,
  capabilitiesForRole,
};
