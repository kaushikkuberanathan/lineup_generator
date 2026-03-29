/**
 * Team data routes — data protection layer
 *
 * POST /api/teams/:teamId/data
 *   Safe write with roster-wipe guard. Frontend writes go directly to Supabase
 *   via anon key, so this endpoint is used by scripts, migrations, and future
 *   server-side operations that should never blindly overwrite a live roster.
 *
 * GET /api/teams/:teamId/history
 *   Recovery helper — returns last N snapshots from team_data_history.
 *   Restricted to localhost or requests with a valid X-Admin-Key header.
 */

const { Router } = require('express');
const { supabaseAdmin } = require('../lib/supabase');

const router = Router();

// ── Auth helper ───────────────────────────────────────────────────────────────

function isAdminRequest(req) {
  const isLocalhost =
    req.ip === '127.0.0.1' ||
    req.ip === '::1' ||
    req.ip === '::ffff:127.0.0.1';

  const adminKey = process.env.ADMIN_KEY;
  const headerKey = req.headers['x-admin-key'];

  return isLocalhost || (adminKey && headerKey === adminKey);
}

// ── Roster-wipe guard (shared logic) ─────────────────────────────────────────

/**
 * Returns { blocked: true, currentRosterCount: N } if the write should be
 * refused, or { blocked: false } if it's safe to proceed.
 *
 * A write is blocked when:
 *   - current DB roster has at least 1 player, AND
 *   - incoming roster is empty or absent, AND
 *   - force !== true
 */
async function rosterWipeGuard(teamId, incomingRoster, force) {
  if (force === true) {
    return { blocked: false };
  }

  const incomingCount = Array.isArray(incomingRoster) ? incomingRoster.length : 0;
  if (incomingCount > 0) {
    // Not an empty write — no risk
    return { blocked: false };
  }

  // Incoming roster is empty — check what's currently in DB
  const { data, error } = await supabaseAdmin
    .from('team_data')
    .select('roster')
    .eq('team_id', String(teamId))
    .maybeSingle();

  if (error) {
    console.error(`[roster-wipe-guard] DB read error for team ${teamId}:`, error.message);
    // Fail safe: block the write on read error
    return { blocked: true, currentRosterCount: -1, readError: error.message };
  }

  if (!data) {
    // No existing row — safe to write
    return { blocked: false };
  }

  const existingRoster = data.roster;
  const existingCount = Array.isArray(existingRoster) ? existingRoster.length : 0;

  if (existingCount > 0) {
    console.warn(
      `[${new Date().toISOString()}] ROSTER_WIPE_GUARD triggered — team_id=${teamId} ` +
      `current=${existingCount} players, incoming=0 — write blocked`
    );
    return { blocked: true, currentRosterCount: existingCount };
  }

  return { blocked: false };
}

// ── POST /api/teams/:teamId/data ──────────────────────────────────────────────

router.post('/:teamId/data', async (req, res) => {
  if (!isAdminRequest(req)) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  const { teamId } = req.params;
  const { roster, schedule, practices, battingOrder, grid, innings, locked, force, writeSource } = req.body;

  // Guard: refuse to wipe a live roster with an empty one
  const guard = await rosterWipeGuard(teamId, roster, force);
  if (guard.blocked) {
    return res.status(409).json({
      error: 'ROSTER_WIPE_GUARD',
      message:
        'Refusing to overwrite a non-empty roster with an empty one. ' +
        'Pass force: true to override.',
      currentRosterCount: guard.currentRosterCount,
      ...(guard.readError ? { readError: guard.readError } : {}),
    });
  }

  const upsertObj = {
    team_id:       String(teamId),
    roster:        roster        ?? [],
    schedule:      schedule      ?? [],
    practices:     practices     ?? [],
    batting_order: battingOrder  ?? [],
    grid:          grid          ?? {},
    innings:       innings       ?? 6,
    locked:        locked        ?? false,
  };

  // Tag the write source so the Postgres trigger can record it in team_data_history
  const source = writeSource || 'manual';

  // Set session-level write_source so the snapshot trigger captures it
  await supabaseAdmin.rpc('set_config', {
    setting: 'app.write_source',
    value: source,
    is_local: true,
  }).catch(() => { /* non-fatal if set_config RPC is unavailable */ });

  const { error } = await supabaseAdmin
    .from('team_data')
    .upsert(upsertObj, { onConflict: 'team_id' });

  if (error) {
    console.error(`[teamData/write] DB upsert error for team ${teamId}:`, error.message);
    return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  }

  console.log(
    `[${new Date().toISOString()}] team_data write OK — team_id=${teamId} ` +
    `roster=${Array.isArray(roster) ? roster.length : '?'} source=${source}`
  );

  return res.status(200).json({ ok: true });
});

// ── GET /api/teams/:teamId/history ────────────────────────────────────────────

router.get('/:teamId/history', async (req, res) => {
  if (!isAdminRequest(req)) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  const { teamId } = req.params;
  const limit = Math.min(parseInt(req.query.limit || '5', 10), 50);
  const full = req.query.full === 'true';

  const selectCols = full
    ? 'id, team_id, roster_count, written_at, write_source, snapshot'
    : 'id, team_id, roster_count, written_at, write_source';

  const { data, error } = await supabaseAdmin
    .from('team_data_history')
    .select(selectCols)
    .eq('team_id', String(teamId))
    .order('written_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`[teamData/history] DB error for team ${teamId}:`, error.message);
    return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  }

  return res.status(200).json({ snapshots: data || [] });
});

// ── Export guard helper for use in scripts ────────────────────────────────────

module.exports = router;
module.exports.rosterWipeGuard = rosterWipeGuard;
