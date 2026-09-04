const express = require('express');
const crypto = require('crypto');
const requireAuth = require('../middleware/requireAuth');
const { supabaseAdmin } = require('../lib/supabase');
const { resolveRole, capabilitiesForRole, buildActions } = require('../lib/homeCapabilities');
const { computeDisplayNames, computeNextEvent, computeReadiness } = require('../lib/homeSummary');

const router = express.Router();

const CONTRACT_VERSION = 1;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function resolveRequestId(req) {
  const header = req.headers['x-request-id'];
  if (typeof header === 'string' && REQUEST_ID_PATTERN.test(header)) return header;
  return crypto.randomUUID();
}

/**
 * Computed from only the stable, caller-visible content (defaultTeamId +
 * teams) — deliberately excludes generatedAt/requestId, which change on
 * every call and would defeat 304 entirely if included. Two requests
 * against unchanged underlying state must produce the same ETag (section
 * 25.4). Not a security boundary — a plain content hash, not HMAC'd —
 * since ETag is cache-validation metadata, not an authorization token.
 */
function computeEtag({ defaultTeamId, teams }) {
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ version: CONTRACT_VERSION, defaultTeamId, teams }))
    .digest('hex')
    .slice(0, 32);
  return `"${hash}"`;
}

/**
 * Sends the Home response with ETag/If-None-Match (section 25.4) and
 * private-cache headers, sharing the 200/304 decision between the
 * zero-membership early return and the main path so neither can drift.
 * Also owns the structured request log so every exit path logs exactly
 * once with the status actually sent.
 */
function sendHomeResponse(req, res, { requestId, startedAt, defaultTeamId, teams, skippedForRole }) {
  const etag = computeEtag({ defaultTeamId, teams });
  const body = {
    version: CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    requestId,
    defaultTeamId,
    teams,
  };

  res.setHeader('X-Request-ID', requestId);
  res.setHeader('Cache-Control', 'private, no-cache');
  res.setHeader('Vary', 'Authorization');
  res.setHeader('ETag', etag);

  const ifNoneMatch = req.headers['if-none-match'];
  const notModified = ifNoneMatch === etag;
  const status = notModified ? 304 : 200;

  logHomeRequest({
    requestId,
    startedAt,
    status,
    teamCount: teams.length,
    payloadBytes: notModified ? 0 : byteLength(body),
    skippedForRole,
  });

  if (notModified) return res.status(304).end();
  return res.status(200).json(body);
}

/**
 * GET /api/v1/home — Story #1023.
 *
 * Query shape (batched, no per-team amplification):
 *   One RPC (public.home_read_model, migration 034), which resolves
 *   memberships (filtered by (user_id OR email) AND status=active — same
 *   resolution pattern as GET /me in auth.js, and satisfies "missing profile
 *   does not hide valid memberships": this route never touches the profiles
 *   table, Home doesn't need a display name from it) plus the matching
 *   teams and team_data rows inside a single Postgres statement.
 *
 *   Before #1072's fix this was two SEQUENTIAL round trips — a
 *   team_memberships query, then teams+team_data in parallel, which still
 *   needed the first round trip's team IDs before it could start. Measured
 *   against real production data, that pattern's p95 latency (816ms) blew
 *   through the 300ms §29.2 budget; root cause was the Render (Oregon) <->
 *   Supabase (us-east-1) cross-region hop, doubled by the two round trips.
 *   Collapsing to one RPC call removes one of those two hops from the
 *   critical path. It does not fix the underlying region mismatch (a
 *   separate infra decision, tracked on #1072) — re-measure against real
 *   production data after this ships to see how much of the budget gap it
 *   closes.
 *
 *   One query regardless of how many teams the caller belongs to.
 */
router.get('/', requireAuth, async (req, res) => {
  const requestId = resolveRequestId(req);
  const startedAt = Date.now();

  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    const { data: homeData, error: homeError } = await supabaseAdmin.rpc('home_read_model', {
      p_user_id: userId,
      p_email: userEmail,
    });

    if (homeError) throw homeError;

    const activeMemberships = homeData?.memberships ?? [];
    const teamIds = [...new Set(activeMemberships.map((m) => m.team_id))];

    if (teamIds.length === 0) {
      return sendHomeResponse(req, res, { requestId, startedAt, defaultTeamId: null, teams: [] });
    }

    const teamRows = homeData?.teams ?? [];
    const teamDataRows = homeData?.team_data ?? [];

    const teamById = new Map(teamRows.map((t) => [t.id, t]));
    const teamDataById = new Map(teamDataRows.map((d) => [d.team_id, d]));
    const roleByTeamId = new Map(activeMemberships.map((m) => [m.team_id, m.role]));

    // A membership can reference a team row that no longer exists (deleted
    // team, orphaned membership) — exclude rather than crash the whole
    // response for one bad row.
    const resolvableTeams = teamIds
      .map((id) => teamById.get(id))
      .filter(Boolean);

    const displayNames = computeDisplayNames(
      resolvableTeams.map((t) => ({ id: t.id, name: t.name, season: t.season, year: t.year, ageGroup: t.age_group }))
    );

    const now = new Date();
    const teams = [];
    let skippedForRole = 0;

    for (const teamRow of resolvableTeams) {
      let role;
      try {
        role = resolveRole(roleByTeamId.get(teamRow.id));
      } catch (roleErr) {
        // Unrecognized/forbidden role on this membership: exclude the team
        // from Home rather than surface a role Home cannot map to a
        // capability set. Logged (no PII) for follow-up, not a 500.
        skippedForRole += 1;
        continue;
      }

      const data = teamDataById.get(teamRow.id) || {};
      const nextEvent = computeNextEvent(data.schedule, now);
      const attendanceForNextEvent = nextEvent && data.attendance_overrides
        ? data.attendance_overrides[nextEvent.startsAt.slice(0, 10)]
        : null;
      const readiness = computeReadiness({
        roster: data.roster,
        grid: data.grid,
        battingOrder: data.batting_order,
        locked: data.locked,
        attendanceForNextEvent,
      });

      const capabilities = capabilitiesForRole(role.code);
      const displayName = displayNames.get(teamRow.id) || teamRow.name;

      const team = {
        id: teamRow.id,
        name: teamRow.name,
        displayName,
        ageGroup: teamRow.age_group || '',
        season: teamRow.season,
        year: teamRow.year,
        sport: teamRow.sport || 'baseball',
        role,
        capabilities,
        nextEvent,
        readiness,
      };
      team.actions = buildActions({ id: team.id, displayName, capabilities, nextEvent, readiness });
      teams.push(team);
    }

    // defaultTeamId: prefer the team with the soonest upcoming event
    // (matches the product intent — the team most likely to need Home
    // right now), falling back to the first resolvable team.
    const withEvent = teams.filter((t) => t.nextEvent);
    const defaultTeamId = withEvent.length > 0
      ? withEvent.sort((a, b) => new Date(a.nextEvent.startsAt) - new Date(b.nextEvent.startsAt))[0].id
      : (teams[0]?.id ?? null);

    return sendHomeResponse(req, res, { requestId, startedAt, defaultTeamId, teams, skippedForRole });
  } catch (err) {
    logHomeRequest({ requestId, startedAt, status: 500, error: err.message });
    res.setHeader('X-Request-ID', requestId);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong loading Home. Please try again.',
        requestId,
        retryable: true,
      },
    });
  }
});

function byteLength(body) {
  return Buffer.byteLength(JSON.stringify(body), 'utf8');
}

/**
 * Structured, PII-free log line per #1023's acceptance criteria: request
 * ID, latency, status, team count, payload size — never roster/child
 * content, which never enters this function's arguments in the first place.
 */
function logHomeRequest({ requestId, startedAt, status, teamCount, payloadBytes, skippedForRole, error }) {
  const latencyMs = Date.now() - startedAt;
  const line = {
    route: 'GET /api/v1/home',
    requestId,
    status,
    latencyMs,
    teamCount,
    payloadBytes,
  };
  if (skippedForRole) line.skippedForRole = skippedForRole;
  if (error) line.error = error;
  console.log('[home]', JSON.stringify(line));
}

module.exports = router;
