/**
 * Team data routes — data protection layer
 *
 * GET /api/teams/search
 *   Public, unauthenticated team discovery for the request-access flow
 *   (Story 124, #655). Returns only id/name/age_group/sport/year — never
 *   owner_id.
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
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { query, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../lib/supabase');
const { rejectTestDataInProd } = require('../middleware/envGuard');
const requireAuth = require('../middleware/requireAuth');

const router = Router();

// ── GET /api/teams/search ────────────────────────────────────────────────────
// Public route (same risk class as POST /auth/magic-link) — rate-limited by
// IP since there's no caller identity to key on the way loginLimiter keys on
// email.
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'TOO_MANY_ATTEMPTS', message: 'Too many search requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

// Team names/age-groups/sports are free text but never need SQL-metacharacter
// content — reject injection-shaped input outright rather than sanitize it.
const SAFE_SEARCH_PATTERN = /^[\w\s'&.-]*$/;

router.get(
  '/search',
  searchLimiter,
  [
    query('q').optional().trim().isLength({ max: 100 }).matches(SAFE_SEARCH_PATTERN)
      .withMessage('q contains unsupported characters'),
    query('ageGroup').optional().trim().isLength({ max: 50 }).matches(SAFE_SEARCH_PATTERN)
      .withMessage('ageGroup contains unsupported characters'),
    query('sport').optional().trim().isLength({ max: 50 }).matches(SAFE_SEARCH_PATTERN)
      .withMessage('sport contains unsupported characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: errors.array() });
    }

    const { q, ageGroup, sport } = req.query;

    try {
      let teamsQuery = supabaseAdmin
        .from('teams')
        .select('id, name, age_group, sport, year');

      if (q) teamsQuery = teamsQuery.ilike('name', `%${q}%`);
      if (ageGroup) teamsQuery = teamsQuery.eq('age_group', ageGroup);
      if (sport) teamsQuery = teamsQuery.eq('sport', sport);

      const { data, error } = await teamsQuery.limit(50);

      if (error) {
        console.error('[teams/search]', error.message);
        return res.status(500).json({ error: 'SEARCH_FAILED' });
      }

      return res.status(200).json(data || []);
    } catch (err) {
      console.error('[teams/search]', err.message);
      return res.status(500).json({ error: 'SEARCH_FAILED' });
    }
  }
);

// ── Env guard — runs before any route with :teamId ───────────────────────────
router.param('teamId', (req, res, next, teamId) => {
  try {
    rejectTestDataInProd(teamId);
    next();
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({
        error: err.code,
        message: err.message
      });
    }
    next(err);
  }
});

// ── Auth helper ───────────────────────────────────────────────────────────────
// TODO: replace === with crypto.timingSafeEqual() for timing-attack-safe key comparison (Phase 5)

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
    console.error('[roster-wipe-guard] DB read error:', { teamId, error: error.message });
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
  try {
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
    try {
      await supabaseAdmin.rpc('set_config', {
        setting: 'app.write_source',
        value: source,
        is_local: true,
      });
    } catch (_) {
      // set_config is best-effort — not fatal if unsupported
    }

    const { error } = await supabaseAdmin
      .from('team_data')
      .upsert(upsertObj, { onConflict: 'team_id' });

    if (error) {
      console.error('[teamData/write] DB upsert error:', { teamId, error: error.message });
      return res.status(500).json({ error: 'DB_ERROR', message: error.message });
    }

    console.log(
      `[${new Date().toISOString()}] team_data write OK — team_id=${teamId} ` +
      `roster=${Array.isArray(roster) ? roster.length : '?'} source=${source}`
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[teamData] POST /:teamId/data uncaught:', err.message, err.stack);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/teams/:teamId/history ────────────────────────────────────────────

router.get('/:teamId/history', async (req, res) => {
  try {
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
      console.error('[teamData/history] DB error:', { teamId, error: error.message });
      return res.status(500).json({ error: 'DB_ERROR', message: error.message });
    }

    return res.status(200).json({ snapshots: data || [] });
  } catch (err) {
    console.error('[teamData] GET /:teamId/history uncaught error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── DELETE /api/teams/:teamId ─────────────────────────────────────────────────
// #380: routes team deletion through the backend with a service_role client,
// so the anon/authenticated-key DELETE grant on `teams` can eventually be
// revoked without breaking this path (see migration TODO in #380 — NOT added
// here; the revoke must land in its own follow-up migration only after this
// route has been verified live, per #380's own "why both halves must land
// together" section).

router.delete('/:teamId', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    // Per-team admin check — mirrors teams_auth_delete's RLS scoping exactly,
    // but must be re-implemented here explicitly because supabaseAdmin
    // (service_role) bypasses RLS entirely.
    const { data: membership, error: memErr } = await supabaseAdmin
      .from('team_memberships')
      .select('id')
      .eq('team_id', String(teamId))
      .eq('user_id', userId)
      .eq('role', 'admin')
      .eq('status', 'active')
      .maybeSingle();

    if (memErr) {
      console.error('[teamData/delete] membership check error:', { teamId, error: memErr.message });
      return res.status(500).json({ error: 'DB_ERROR', message: memErr.message });
    }
    if (!membership) {
      return res.status(403).json({ error: 'NOT_TEAM_ADMIN' });
    }

    const { error } = await supabaseAdmin.from('teams').delete().eq('id', teamId);

    if (error) {
      console.error('[teamData/delete] delete error:', { teamId, error: error.message });
      return res.status(500).json({ error: 'DB_ERROR', message: error.message });
    }

    console.log(`[${new Date().toISOString()}] team delete OK — team_id=${teamId} by user_id=${userId}`);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[teamData] DELETE /:teamId uncaught:', err.message, err.stack);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── Export guard helper for use in scripts ────────────────────────────────────

module.exports = router;
module.exports.rosterWipeGuard = rosterWipeGuard;
module.exports.isAdminRequest = isAdminRequest;
