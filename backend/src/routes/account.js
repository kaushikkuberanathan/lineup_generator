const express = require('express');
const crypto = require('crypto');
const requireAuth = require('../middleware/requireAuth');
const { supabaseAdmin } = require('../lib/supabase');
const { resolveRole, capabilitiesForRole } = require('../lib/homeCapabilities');
const { computeDisplayNames } = require('../lib/homeSummary');

const router = express.Router();
const CONTRACT_VERSION = 1;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function resolveRequestId(req) {
  const header = req.headers['x-request-id'];
  return typeof header === 'string' && REQUEST_ID_PATTERN.test(header)
    ? header
    : crypto.randomUUID();
}

function displayNameFor(profile, email) {
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  return email.split('@')[0] || 'Coach';
}

function computeEtag({ identity, memberships }) {
  const hash = crypto.createHash('sha256')
    .update(JSON.stringify({ version: CONTRACT_VERSION, identity, memberships }))
    .digest('hex')
    .slice(0, 32);
  return `"${hash}"`;
}

function sendAccountResponse(req, res, { requestId, startedAt, identity, memberships, skippedForRole }) {
  const body = {
    version: CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    requestId,
    identity,
    memberships,
    pendingDestination: null,
  };
  const etag = computeEtag({ identity, memberships });
  const notModified = req.headers['if-none-match'] === etag;
  const status = notModified ? 304 : 200;

  res.setHeader('X-Request-ID', requestId);
  res.setHeader('Cache-Control', 'private, no-cache');
  res.setHeader('Vary', 'Authorization');
  res.setHeader('ETag', etag);
  logAccountRequest({
    requestId,
    startedAt,
    status,
    membershipCount: memberships.length,
    payloadBytes: notModified ? 0 : Buffer.byteLength(JSON.stringify(body), 'utf8'),
    skippedForRole,
  });

  if (notModified) return res.status(304).end();
  return res.status(200).json(body);
}

router.get('/', requireAuth, async (req, res) => {
  const requestId = resolveRequestId(req);
  const startedAt = Date.now();

  try {
    const { data, error } = await supabaseAdmin.rpc('account_read_model', {
      p_user_id: req.user.id,
      p_email: req.user.email,
    });
    if (error) throw error;

    const profile = data?.profile ?? null;
    const membershipRows = data?.memberships ?? [];
    const teamRows = data?.teams ?? [];
    const teamById = new Map(teamRows.map((team) => [team.id, team]));
    const resolvableTeams = [...new Set(membershipRows.map((membership) => membership.team_id))]
      .map((teamId) => teamById.get(teamId))
      .filter(Boolean);
    const displayNames = computeDisplayNames(resolvableTeams.map((team) => ({
      id: team.id,
      name: team.name,
      season: team.season,
      year: team.year,
      ageGroup: team.age_group,
    })));

    const memberships = [];
    let skippedForRole = 0;
    for (const membershipRow of membershipRows) {
      const team = teamById.get(membershipRow.team_id);
      if (!team) continue;
      let role;
      try {
        role = resolveRole(membershipRow.role);
      } catch {
        skippedForRole += 1;
        continue;
      }
      memberships.push({
        team: {
          id: team.id,
          name: team.name,
          displayName: displayNames.get(team.id) || team.name,
          ageGroup: team.age_group || '',
          season: team.season,
          year: team.year,
          sport: team.sport || 'baseball',
        },
        role,
        capabilities: capabilitiesForRole(role.code),
      });
    }

    const identity = {
      id: req.user.id,
      email: req.user.email,
      displayName: displayNameFor(profile, req.user.email),
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
    };
    return sendAccountResponse(req, res, { requestId, startedAt, identity, memberships, skippedForRole });
  } catch (err) {
    logAccountRequest({ requestId, startedAt, status: 500, error: err.message });
    res.setHeader('X-Request-ID', requestId);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong loading your account. Please try again.',
        requestId,
        retryable: true,
      },
    });
  }
});

function logAccountRequest({ requestId, startedAt, status, membershipCount, payloadBytes, skippedForRole, error }) {
  const line = {
    route: 'GET /api/v1/account',
    requestId,
    status,
    latencyMs: Date.now() - startedAt,
    membershipCount,
    payloadBytes,
  };
  if (skippedForRole) line.skippedForRole = skippedForRole;
  if (error) line.error = error;
  console.log('[account]', JSON.stringify(line));
}

module.exports = router;
