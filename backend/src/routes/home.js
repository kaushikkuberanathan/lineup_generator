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
 * GET /api/v1/home — Story #1023.
 *
 * Query shape (batched, no per-team amplification):
 *   1. team_memberships: one query, filtered by (user_id OR email) AND
 *      status=active — same resolution pattern as GET /me (auth.js), which
 *      also satisfies "missing profile does not hide valid memberships"
 *      (this route never touches the profiles table — Home doesn't need a
 *      display name from it).
 *   2. teams: one query, .in('id', teamIds).
 *   3. team_data: one query, .in('team_id', teamIds).
 * Three queries regardless of how many teams the caller belongs to.
 */
router.get('/', requireAuth, async (req, res) => {
  const requestId = resolveRequestId(req);
  const startedAt = Date.now();

  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('team_memberships')
      .select('team_id, role, status')
      .or(`user_id.eq.${userId},email.eq.${userEmail}`)
      .eq('status', 'active');

    if (membershipError) throw membershipError;

    const activeMemberships = memberships ?? [];
    const teamIds = [...new Set(activeMemberships.map((m) => m.team_id))];

    if (teamIds.length === 0) {
      const body = {
        version: CONTRACT_VERSION,
        generatedAt: new Date().toISOString(),
        requestId,
        defaultTeamId: null,
        teams: [],
      };
      logHomeRequest({ requestId, startedAt, status: 200, teamCount: 0, payloadBytes: byteLength(body) });
      res.setHeader('X-Request-ID', requestId);
      res.setHeader('Cache-Control', 'private, no-cache');
      res.setHeader('Vary', 'Authorization');
      return res.status(200).json(body);
    }

    const [{ data: teamRows, error: teamError }, { data: teamDataRows, error: teamDataError }] = await Promise.all([
      supabaseAdmin
        .from('teams')
        .select('id, name, age_group, season, year, sport')
        .in('id', teamIds),
      supabaseAdmin
        .from('team_data')
        .select('team_id, roster, schedule, grid, batting_order, locked, attendance_overrides')
        .in('team_id', teamIds),
    ]);

    if (teamError) throw teamError;
    if (teamDataError) throw teamDataError;

    const teamById = new Map((teamRows ?? []).map((t) => [t.id, t]));
    const teamDataById = new Map((teamDataRows ?? []).map((d) => [d.team_id, d]));
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

    const body = {
      version: CONTRACT_VERSION,
      generatedAt: new Date().toISOString(),
      requestId,
      defaultTeamId,
      teams,
    };

    logHomeRequest({
      requestId,
      startedAt,
      status: 200,
      teamCount: teams.length,
      payloadBytes: byteLength(body),
      skippedForRole,
    });

    res.setHeader('X-Request-ID', requestId);
    res.setHeader('Cache-Control', 'private, no-cache');
    res.setHeader('Vary', 'Authorization');
    return res.status(200).json(body);
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
