/**
 * normalizeRole — single source of truth for team-membership role translation.
 *
 * Context (WS-1, Issue #336): three layers disagreed on role vocabulary.
 * The request-access API accepted { team_admin, coordinator, coach, scorekeeper,
 * parent } but the team_memberships CHECK constraint only permits
 * ( admin, coach, scorekeeper, viewer ). Inserting an untranslated value
 * (e.g. team_admin) threw a CHECK violation — the /admin/approve-link break.
 *
 * Role model (Option B — see docs/product/AUTH_SECURITY_AUDIT_ROADMAP.md):
 *   - Team roles live in team_memberships.role as one of the 4 canonical strings.
 *   - The richer conceptual model (Head Coach, Coordinator, etc.) is a LABEL
 *     layer on top of these strings — no DB migration.
 *   - Scoring is a per-game CAPABILITY (scorer lock), not a role. Any viewer
 *     (parent) can score. 'scorekeeper' stays a valid string for legacy rows
 *     but is no longer offered as a request-access option.
 *   - platform_admin is a GLOBAL capability, NOT a team-membership role. It must
 *     never be written into team_memberships.
 *
 * This module is the ONLY place role translation happens. Every write boundary
 * (request-access ingestion, /admin/approve, /admin/approve-link) imports it so
 * the mapping cannot drift again.
 */

/** The 4 canonical strings permitted by the team_memberships CHECK constraint. */
const CANONICAL_ROLES = Object.freeze(['admin', 'coach', 'scorekeeper', 'viewer']);

/**
 * Legacy / label values — canonical DB string.
 * Canonical values map to themselves so the function is idempotent:
 * normalizeRole(normalizeRole(x)) === normalizeRole(x).
 */
const ROLE_MAP = Object.freeze({
  // canonical — itself (idempotent)
  admin: 'admin',
  coach: 'coach',
  scorekeeper: 'scorekeeper',
  viewer: 'viewer',
  // legacy / label — canonical
  team_admin: 'admin',
  coordinator: 'coach',
  parent: 'viewer',
});

/**
 * Values that are real roles elsewhere in the system but must NEVER be written
 * into team_memberships. Rejected with a distinct message for observability.
 */
const FORBIDDEN_TEAM_ROLES = Object.freeze(['platform_admin']);

/**
 * Translate an incoming role value to its canonical team_memberships string.
 *
 * @param {string} input - raw role value from a request payload or DB row.
 * @returns {'admin'|'coach'|'scorekeeper'|'viewer'} canonical role string.
 * @throws {Error} with .code for caller mapping:
 *   - code 'ROLE_FORBIDDEN'  — platform_admin (or other global role) attempted.
 *   - code 'ROLE_UNKNOWN'    — unrecognized / missing value.
 * Callers should map both to HTTP 400.
 */
function normalizeRole(input) {
  if (typeof input !== 'string' || input.trim() === '') {
    const err = new Error('normalizeRole: role is required and must be a non-empty string');
    err.code = 'ROLE_UNKNOWN';
    throw err;
  }

  const key = input.trim().toLowerCase();

  if (FORBIDDEN_TEAM_ROLES.includes(key)) {
    const err = new Error(
      `normalizeRole: '${key}' is a global role and cannot be a team membership role`
    );
    err.code = 'ROLE_FORBIDDEN';
    throw err;
  }

  const canonical = ROLE_MAP[key];
  if (!canonical) {
    const err = new Error(`normalizeRole: unrecognized role '${input}'`);
    err.code = 'ROLE_UNKNOWN';
    throw err;
  }

  return canonical;
}

/**
 * Non-throwing guard for validators / conditional logic.
 * @param {string} input
 * @returns {boolean} true if input normalizes to a canonical role.
 */
function isNormalizableRole(input) {
  try {
    normalizeRole(input);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  normalizeRole,
  isNormalizableRole,
  CANONICAL_ROLES,
  ROLE_MAP,
  FORBIDDEN_TEAM_ROLES,
};
