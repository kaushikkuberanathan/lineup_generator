/**
 * routes.js — canonical route parsing, safe-destination validation,
 * pending-destination persistence, and the pure destination resolver
 * (Story #1027). Framework-agnostic and side-effect-light by design: no
 * window.history/popstate wiring here — that belongs to the live
 * component tree in a later Phase 1 wave (#1028). This module only
 * covers what's independently testable: parse, build, validate, persist,
 * resolve.
 */

const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Canonical paths per docs/product/API_DRIVEN_ARCHITECTURE_REDESIGN.md
 * section 6.2. Order matters: more specific patterns (game mode/score,
 * lineup with an ID) must be tried before their shorter prefixes.
 */
const ROUTE_PATTERNS = [
  { type: 'home', regex: /^\/app\/?$/ },
  { type: 'gameMode', regex: /^\/app\/teams\/([^/]+)\/games\/([^/]+)\/mode\/?$/ },
  { type: 'gameScore', regex: /^\/app\/teams\/([^/]+)\/games\/([^/]+)\/score\/?$/ },
  { type: 'game', regex: /^\/app\/teams\/([^/]+)\/games\/([^/]+)\/?$/ },
  { type: 'lineup', regex: /^\/app\/teams\/([^/]+)\/lineups\/([^/]+)\/?$/ },
  { type: 'lineups', regex: /^\/app\/teams\/([^/]+)\/lineups\/?$/ },
  { type: 'roster', regex: /^\/app\/teams\/([^/]+)\/roster\/?$/ },
  { type: 'schedule', regex: /^\/app\/teams\/([^/]+)\/schedule\/?$/ },
  { type: 'team', regex: /^\/app\/teams\/([^/]+)\/?$/ },
];

/**
 * Section 27.1 rule 2: "Accept only same-origin /app... paths; reject
 * external URLs and encoded redirects." Deliberately conservative — this
 * gates both route parsing and pending-destination persistence.
 * @param {unknown} path
 * @returns {boolean}
 */
export function isSafeInternalDestination(path) {
  if (typeof path !== 'string' || path.length === 0 || path.length > 2048) return false;
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  if (path.includes('\\')) return false;

  const pathAndQuery = path.split('#')[0];
  const pathOnly = pathAndQuery.split('?')[0];

  // A colon before the first slash-delimited segment ends is how a
  // scheme (https:, javascript:) would appear if it slipped in raw.
  if (/^[^/]*:/.test(pathOnly.slice(1))) return false;

  let decoded;
  try {
    decoded = decodeURIComponent(pathOnly);
  } catch {
    return false; // malformed percent-encoding
  }
  if (decoded.includes('://') || decoded.includes('\\')) return false;
  if (!(decoded === '/app' || decoded.startsWith('/app/'))) return false;

  return true;
}

/**
 * @param {string} pathname
 * @returns {null | {type:string, teamId?:string, gameId?:string, lineupId?:string}}
 */
export function parseAppRoute(pathname) {
  if (!isSafeInternalDestination(pathname)) return null;
  const clean = pathname.split('?')[0].split('#')[0];

  for (const { type, regex } of ROUTE_PATTERNS) {
    const match = clean.match(regex);
    if (!match) continue;

    const [, first, second] = match;
    if (first !== undefined && !SAFE_ID_PATTERN.test(first)) return null;
    if (second !== undefined && !SAFE_ID_PATTERN.test(second)) return null;

    switch (type) {
      case 'home': return { type };
      case 'team': return { type, teamId: first };
      case 'roster': return { type, teamId: first };
      case 'schedule': return { type, teamId: first };
      case 'lineups': return { type, teamId: first };
      case 'lineup': return { type, teamId: first, lineupId: second };
      case 'game': return { type, teamId: first, gameId: second };
      case 'gameMode': return { type, teamId: first, gameId: second };
      case 'gameScore': return { type, teamId: first, gameId: second };
      default: return null;
    }
  }
  return null;
}

/**
 * Inverse of parseAppRoute — used to build hrefs consistently with the
 * parser (e.g. reconstructing a canonical path from a stored descriptor).
 * @param {{type:string, teamId?:string, gameId?:string, lineupId?:string}} descriptor
 * @returns {string}
 */
export function buildAppRoute(descriptor) {
  switch (descriptor.type) {
    case 'home': return '/app';
    case 'team': return `/app/teams/${descriptor.teamId}`;
    case 'roster': return `/app/teams/${descriptor.teamId}/roster`;
    case 'schedule': return `/app/teams/${descriptor.teamId}/schedule`;
    case 'lineups': return `/app/teams/${descriptor.teamId}/lineups`;
    case 'lineup': return `/app/teams/${descriptor.teamId}/lineups/${descriptor.lineupId}`;
    case 'game': return `/app/teams/${descriptor.teamId}/games/${descriptor.gameId}`;
    case 'gameMode': return `/app/teams/${descriptor.teamId}/games/${descriptor.gameId}/mode`;
    case 'gameScore': return `/app/teams/${descriptor.teamId}/games/${descriptor.gameId}/score`;
    default: throw new Error(`buildAppRoute: unknown route type "${descriptor.type}"`);
  }
}

const PENDING_DESTINATION_KEY = 'api:pendingDestination';

function defaultSessionStorage() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) return window.sessionStorage;
  } catch { /* private-browsing storage access can throw */ }
  const mem = new Map();
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  };
}

/**
 * Section 27.1 rule 2: preserve the full internal destination while an
 * auth session is being restored/obtained. Session-scoped (not
 * localStorage) since it's only relevant within one auth round trip.
 * @param {string} path
 * @param {object} [opts]
 * @returns {boolean} whether the save actually happened
 */
export function savePendingDestination(path, opts = {}) {
  if (!isSafeInternalDestination(path)) return false;
  const storage = opts.storage || defaultSessionStorage();
  try {
    storage.setItem(PENDING_DESTINATION_KEY, JSON.stringify({ path, savedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads and clears the pending destination in one step (rule 3: "replace
 * the login callback URL with the preserved canonical path" — a resume
 * consumes it, it doesn't stay around for a second, stale resume).
 * @param {object} [opts]
 * @returns {string|null}
 */
export function consumePendingDestination(opts = {}) {
  const storage = opts.storage || defaultSessionStorage();
  let raw;
  try {
    raw = storage.getItem(PENDING_DESTINATION_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    storage.removeItem(PENDING_DESTINATION_KEY);
  } catch { /* best-effort */ }

  let entry;
  try {
    entry = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!entry || !isSafeInternalDestination(entry.path)) return null;
  return entry.path;
}

/**
 * Section 27.2: "Logout clears the pending authenticated destination
 * unless logout was caused by an explicit auth-refresh flow that is
 * permitted to resume it." Callers decide when that exception applies —
 * this is just the clear primitive.
 * @param {object} [opts]
 */
export function clearPendingDestination(opts = {}) {
  const storage = opts.storage || defaultSessionStorage();
  try {
    storage.removeItem(PENDING_DESTINATION_KEY);
  } catch { /* best-effort */ }
}

/**
 * The pure destination resolver (section 27.1). Deliberately takes no
 * "activeTeamId"/cached-team input at all — the URL's teamId is the only
 * team-identity input, structurally guaranteeing "route identity
 * overrides ui:activeTeam/local cache identity" rather than relying on
 * callers to remember to ignore one.
 *
 * @param {object} args
 * @param {string} args.pathname
 * @param {boolean} args.isAuthenticated
 * @param {object|null} args.home - the last-known GET /api/v1/home response
 *   (or null if not yet loaded); membership and nested-resource ownership
 *   are both verified against it, since Home is itself the authoritative
 *   membership/summary source in Phase 1 — no second live call is made
 *   inside this pure function.
 * @returns {{status:string, [key:string]:any}}
 *   status is one of: 'invalid' | 'unauthenticated' | 'loading' |
 *   'team_access_denied' | 'cross_team_denied' | 'not_found' | 'resolved'
 */
export function resolveDestination({ pathname, isAuthenticated, home }) {
  const route = parseAppRoute(pathname);
  if (!route) return { status: 'invalid' };
  if (route.type === 'home') return { status: 'resolved', route };

  if (!isAuthenticated) return { status: 'unauthenticated', pendingPath: pathname };
  if (!home) return { status: 'loading' };

  const team = (home.teams || []).find((t) => t.id === route.teamId);
  if (!team) return { status: 'team_access_denied' };

  if (route.gameId) {
    const teamGameId = team.nextEvent && team.nextEvent.id;
    // Cross-team nested IDs "fail without revealing which ID exists"
    // (section 27.2) — a genuinely nonexistent game ID and a real game ID
    // that belongs to a different team both land on the same status.
    if (!teamGameId || teamGameId !== route.gameId) {
      return { status: 'cross_team_denied' };
    }
  }

  if (route.lineupId) {
    // No addressable per-game lineup resource exists in the live schema
    // yet (backend homeSummary.js: one grid/batting_order per team_data
    // row, not per game — #1023). Fail safely rather than pretend to
    // verify ownership of a resource that isn't real yet.
    return { status: 'not_found' };
  }

  return { status: 'resolved', route, team };
}
