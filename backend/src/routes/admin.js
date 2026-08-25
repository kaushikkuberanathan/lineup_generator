const { Router } = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../lib/supabase');
const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');
const { sendApprovalEmail, sendDenialEmail, ADMIN_EMAIL } = require('../lib/email');
const { normalizeRole, CANONICAL_ROLES } = require('../lib/normalizeRole');
const { verify: verifyApproveLinkToken } = require('../lib/approveLinkToken');

// #337: the public 1-tap link is only ever emailed to the platform admin
// (ADMIN_EMAIL) - there's no session on this path to pull an acting-admin id
// from, so reviewed_by is resolved by looking up that fixed address's auth
// user id at click time. Returns null (logged, not thrown) if unresolved -
// email failures/config drift here must not block the actual approve/deny.
async function resolveLinkReviewer() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error('[admin-link] could not list auth users for reviewed_by:', error.message);
    return null;
  }
  const adminUser = data?.users?.find(u => u.email === ADMIN_EMAIL);
  if (!adminUser) {
    console.warn('[admin-link] no auth user found for ADMIN_EMAIL; reviewed_by will be null');
  }
  return adminUser?.id ?? null;
}

// teamData.js already exports rosterWipeGuard as a named export alongside
// its default router (module.exports.rosterWipeGuard = rosterWipeGuard) -
// reusing it here needs zero changes to that file, so there's no reason to
// duplicate the guard's logic the way ADMIN_HTML_BYPASS_REMEDIATION_PLAN.md
// §3a anticipated (that section's "duplicate, don't extract" reasoning was
// about avoiding touching teamData.js's exports - moot, since this export
// already existed before this route was written).
const { rosterWipeGuard } = require('./teamData');

const router = Router();

// ─── GET /admin/approve-link ─────────────────────────────────────────────────
// 1-tap approve from email link — no auth required (Phase 4 MVP).
// #337: requestId/teamId are derived from a verified, 24h-expiring HMAC
// token (see lib/approveLinkToken.js) rather than trusted from the query
// string directly.

router.get('/admin/approve-link', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send(htmlPage('Invalid Link',
      'This approval link is missing required parameters.'));
  }

  let requestId, teamId;
  try {
    ({ requestId, teamId } = verifyApproveLinkToken(token, 'approve'));
  } catch (tokenErr) {
    if (tokenErr.code === 'TOKEN_EXPIRED') {
      return res.status(410).send(htmlPage('Link Expired',
        'This approval link has expired. Please request a new one from the admin panel.'));
    }
    return res.status(401).send(htmlPage('Invalid Link',
      'This approval link is invalid or has been tampered with.'));
  }

  try {
    // Fetch the access request
    const { data: accessRequest, error: fetchError } = await supabaseAdmin
      .from('access_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (fetchError || !accessRequest) {
      return res.status(404).send(htmlPage('Not Found',
        'This access request could not be found.'));
    }

    if (accessRequest.status !== 'pending') {
      return res.status(200).send(htmlPage('Already Processed',
        `This request has already been ${accessRequest.status}.`));
    }

    // Normalize the requested role to a canonical team_memberships value.
    // WS-1 (#336): request-access accepts team_admin/coordinator/parent, but the
    // team_memberships CHECK constraint only permits admin/coach/scorekeeper/
    // viewer. Inserting the raw requested_role threw a CHECK violation.
    // No silent fallback - an unrecognized role must surface, not become a coach.
    let role;
    try {
      role = normalizeRole(accessRequest.requested_role);
    } catch (roleErr) {
      console.error('[approve-link] role normalization failed:',
        roleErr.code, roleErr.message, '| raw:', accessRequest.requested_role);

      if (roleErr.code === 'ROLE_FORBIDDEN') {
        return res.status(400).send(htmlPage('Invalid Role',
          'This request asks for a platform-level role, which cannot be granted '
          + 'as a team membership. Please review it in the admin panel.'));
      }

      return res.status(400).send(htmlPage('Invalid Role',
        'This request has an unrecognized role and cannot be approved from this '
        + 'link. Please approve it via the admin panel.'));
    }

    // Create team membership
    const { error: membershipError } = await supabaseAdmin
      .from('team_memberships')
      .insert({
        team_id:      String(teamId),
        email:        accessRequest.email ?? null,
        phone_e164:   accessRequest.phone_e164 ?? null,
        role,
        status:       'active',
        invited_at:   new Date().toISOString(),
        activated_at: new Date().toISOString(),
      });

    if (membershipError) {
      console.error('[approve-link] membership insert error:', membershipError.message);
      return res.status(500).send(htmlPage('Error',
        'Could not create membership. Please approve via the admin panel.'));
    }

    // Mark request approved
    const reviewedBy = await resolveLinkReviewer();
    await supabaseAdmin
      .from('access_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: reviewedBy })
      .eq('id', requestId);

    // Look up team name for approval email
    const { data: teamRowLink } = await supabaseAdmin
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();
    const teamNameLink = teamRowLink?.name || 'your team';

    // Send approval email to user
    await sendApprovalEmail({
      firstName: accessRequest.first_name,
      email:     accessRequest.email ?? accessRequest.phone_e164,
      role,
      teamName:  teamNameLink,
      teamId:    String(teamId),
    });

    return res.status(200).send(htmlPage('Approved!',
      `${accessRequest.first_name} ${accessRequest.last_name} has been approved as ${role}. They will receive a login email shortly.`));

  } catch (err) {
    console.error('[approve-link]', err.message);
    return res.status(500).send(htmlPage('Error', 'Something went wrong. Please try again.'));
  }
});

// ─── GET /admin/deny-link ─────────────────────────────────────────────────────
// #337: requestId is derived from a verified, 24h-expiring HMAC token rather
// than trusted from the query string directly (see lib/approveLinkToken.js).

router.get('/admin/deny-link', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send(htmlPage('Invalid Link',
      'This denial link is missing required parameters.'));
  }

  let requestId;
  try {
    ({ requestId } = verifyApproveLinkToken(token, 'deny'));
  } catch (tokenErr) {
    if (tokenErr.code === 'TOKEN_EXPIRED') {
      return res.status(410).send(htmlPage('Link Expired',
        'This denial link has expired. Please request a new one from the admin panel.'));
    }
    return res.status(401).send(htmlPage('Invalid Link',
      'This denial link is invalid or has been tampered with.'));
  }

  try {
    const { data: accessRequest, error: fetchError } = await supabaseAdmin
      .from('access_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (fetchError || !accessRequest) {
      return res.status(404).send(htmlPage('Not Found',
        'This access request could not be found.'));
    }

    if (accessRequest.status !== 'pending') {
      return res.status(200).send(htmlPage('Already Processed',
        `This request has already been ${accessRequest.status}.`));
    }

    const reviewedBy = await resolveLinkReviewer();
    await supabaseAdmin
      .from('access_requests')
      .update({ status: 'denied', reviewed_at: new Date().toISOString(), reviewed_by: reviewedBy })
      .eq('id', requestId);

    const { data: teamRowDenyLink } = await supabaseAdmin
      .from('teams')
      .select('name')
      .eq('id', accessRequest.team_id)
      .single();
    const teamNameDenyLink = teamRowDenyLink?.name || 'your team';

    await sendDenialEmail({
      firstName: accessRequest.first_name,
      email:     accessRequest.email ?? accessRequest.phone_e164,
      teamName:  teamNameDenyLink,
    });

    return res.status(200).send(htmlPage('Denied',
      `${accessRequest.first_name} ${accessRequest.last_name}'s request has been denied. They will be notified.`));

  } catch (err) {
    console.error('[deny-link]', err.message);
    return res.status(500).send(htmlPage('Error', 'Something went wrong. Please try again.'));
  }
});

// ─── HTML page helper (for browser-facing approve/deny responses) ─────────────

function htmlPage(title, message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Lineup Generator</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 480px;
           margin: 80px auto; padding: 0 24px; text-align: center; }
    h1 { font-size: 24px; color: #1a1a1a; margin-bottom: 12px; }
    p  { color: #555; line-height: 1.6; font-size: 16px; }
    .badge { display: inline-block; margin-top: 24px; padding: 8px 20px;
             border-radius: 20px; font-size: 13px; background: #f0f0f0; color: #666; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${message}</p>
  <div class="badge">Lineup Generator</div>
</body>
</html>`;
}

// All admin routes require a valid session AND an active admin membership
router.use(requireAuth, requireAdmin);

// ─── Shared helpers ───────────────────────────────────────────────────────────

function validationGuard(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: errors.array() });
    return true;
  }
  return false;
}

// ─── GET /admin/requests ──────────────────────────────────────────────────────

router.get(
  '/requests',
  [query('status').optional().isString().trim()],
  async (req, res) => {
    if (validationGuard(req, res)) return;

    const status = req.query.status ?? 'pending';

    const { data, error, count } = await supabaseAdmin
      .from('access_requests')
      .select('*', { count: 'exact' })
      .eq('status', status)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('[admin/requests] DB error:', error.message);
      return res.status(500).json({ error: 'DB_ERROR' });
    }

    return res.status(200).json({ requests: data, total: count });
  }
);

// ─── POST /admin/approve ──────────────────────────────────────────────────────

router.post(
  '/approve',
  [
    body('requestId').isUUID(),
    body('teamId').notEmpty().trim(),
    body('role').isIn(CANONICAL_ROLES),
  ],
  async (req, res) => {
    if (validationGuard(req, res)) return;

    const { requestId, teamId, role } = req.body;

    const { data: accessRequest, error: fetchError } = await supabaseAdmin
      .from('access_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (fetchError) {
      console.error('[admin/approve] DB error fetching request:', fetchError.message);
      return res.status(500).json({ error: 'DB_ERROR' });
    }

    if (!accessRequest || accessRequest.status !== 'pending') {
      return res.status(409).json({ error: 'ALREADY_PROCESSED' });
    }

    // Look up auth user by email — may not exist yet; will link on first login
    const { data: userListData } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = userListData?.users?.find(u => u.email === accessRequest.email);
    const userId = authUser?.id ?? null;

    const { error: insertError } = await supabaseAdmin
      .from('team_memberships')
      .insert({
        email:      accessRequest.email ?? null,
        phone_e164: null,
        team_id:    teamId,
        role,
        status:     'invited',
        user_id:    userId,
      });

    if (insertError) {
      console.error('[admin/approve] DB error inserting membership:', insertError.message);
      return res.status(500).json({ error: 'DB_ERROR' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('access_requests')
      .update({
        status: 'approved',
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('[admin/approve] DB error updating request:', updateError.message);
      return res.status(500).json({ error: 'DB_ERROR' });
    }

    // Look up team name for approval email
    const { data: teamRow } = await supabaseAdmin
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();
    const teamName = teamRow?.name || 'your team';

    await sendApprovalEmail({
      firstName: accessRequest.first_name,
      email:     accessRequest.email ?? accessRequest.phone_e164,
      role:      role ?? 'coach',
      teamName,
      teamId:    String(teamId),
    });

    return res.status(200).json({ message: 'Approved. Membership created.' });
  }
);

// ─── POST /admin/reject ───────────────────────────────────────────────────────

router.post(
  '/reject',
  [
    body('requestId').isUUID(),
    body('notes').optional().isString().trim(),
  ],
  async (req, res) => {
    if (validationGuard(req, res)) return;

    const { requestId, notes } = req.body;

    const { data: accessRequest, error: fetchError } = await supabaseAdmin
      .from('access_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (fetchError) {
      console.error('[admin/reject] DB error fetching request:', fetchError.message);
      return res.status(500).json({ error: 'DB_ERROR' });
    }

    if (!accessRequest || accessRequest.status !== 'pending') {
      return res.status(409).json({ error: 'ALREADY_PROCESSED' });
    }

    const update = {
      status: 'rejected',
      reviewed_by: req.user.id,
      reviewed_at: new Date().toISOString(),
    };
    if (notes !== undefined) update.notes = notes;

    const { error: updateError } = await supabaseAdmin
      .from('access_requests')
      .update(update)
      .eq('id', requestId);

    if (updateError) {
      console.error('[admin/reject] DB error updating request:', updateError.message);
      return res.status(500).json({ error: 'DB_ERROR' });
    }

    const { data: teamRowReject } = await supabaseAdmin
      .from('teams')
      .select('name')
      .eq('id', accessRequest.team_id)
      .single();
    const teamNameReject = teamRowReject?.name || 'your team';

    await sendDenialEmail({
      firstName: accessRequest.first_name,
      email:     accessRequest.email ?? accessRequest.phone_e164,
      teamName:  teamNameReject,
    });

    return res.status(200).json({ message: 'Request rejected.' });
  }
);

// ─── GET /admin/members ───────────────────────────────────────────────────────

router.get('/members', async (req, res) => {
  // Left join with profiles so invited members (user_id = null, no profile row yet)
  // still appear in the list — their firstName/lastName will be null until first login.
  const { data, error } = await supabaseAdmin
    .from('team_memberships')
    .select(`
      id,
      team_id,
      role,
      status,
      email,
      user_id,
      phone_e164,
      activated_at,
      profiles (
        first_name,
        last_name
      )
    `)
    .in('status', ['active', 'invited']);

  if (error) {
    console.error('[admin/members] DB error:', error.message);
    return res.status(500).json({ error: 'DB_ERROR' });
  }

  const members = data.map((m) => ({
    membershipId: m.id,
    teamId: m.team_id,
    role: m.role,
    status: m.status,
    firstName: m.profiles?.first_name ?? null,
    lastName: m.profiles?.last_name ?? null,
    email: m.email,
    userId: m.user_id,
    phone: m.phone_e164,
    activatedAt: m.activated_at,
  }));

  return res.status(200).json({ members });
});

// ─── POST /admin/update-role ──────────────────────────────────────────────────

router.post(
  '/update-role',
  [
    body('membershipId').isUUID(),
    body('role').isIn(CANONICAL_ROLES),
  ],
  async (req, res) => {
    if (validationGuard(req, res)) return;

    const { membershipId, role } = req.body;

    const { error } = await supabaseAdmin
      .from('team_memberships')
      .update({ role })
      .eq('id', membershipId);

    if (error) {
      console.error('[admin/update-role] DB error:', error.message);
      return res.status(500).json({ error: 'DB_ERROR' });
    }

    return res.status(200).json({ message: 'Role updated.' });
  }
);

// ─── POST /admin/reset-access ─────────────────────────────────────────────────

router.post(
  '/reset-access',
  [body('membershipId').isUUID()],
  async (req, res) => {
    if (validationGuard(req, res)) return;

    const { membershipId } = req.body;

    const { error } = await supabaseAdmin
      .from('team_memberships')
      .update({ status: 'invited', user_id: null, activated_at: null })
      .eq('id', membershipId);

    if (error) {
      console.error('[admin/reset-access] DB error:', error.message);
      return res.status(500).json({ error: 'DB_ERROR' });
    }

    return res.status(200).json({ message: 'Access reset. Coach must re-verify on next login.' });
  }
);

// ─── POST /admin/suspend ──────────────────────────────────────────────────────

router.post(
  '/suspend',
  [body('membershipId').isUUID()],
  async (req, res) => {
    if (validationGuard(req, res)) return;

    const { membershipId } = req.body;

    const { error } = await supabaseAdmin
      .from('team_memberships')
      .update({ status: 'suspended' })
      .eq('id', membershipId);

    if (error) {
      console.error('[admin/suspend] DB error:', error.message);
      return res.status(500).json({ error: 'DB_ERROR' });
    }

    return res.status(200).json({ message: 'Coach suspended.' });
  }
);

// ─── GET /admin/feedback ──────────────────────────────────────────────────────

router.get(
  '/feedback',
  [query('type').optional().isIn(['feedback', 'bug'])],
  async (req, res) => {
    if (validationGuard(req, res)) return;

    let q = supabaseAdmin
      .from('feedback')
      .select(`
        id,
        coach_id,
        phone_e164,
        type,
        category,
        location,
        body,
        change_types,
        severity,
        app_version,
        submitted_at,
        profiles (
          first_name,
          last_name,
          phone_e164
        )
      `, { count: 'exact' })
      .order('submitted_at', { ascending: false });

    if (req.query.type) {
      q = q.eq('type', req.query.type);
    }

    const { data, error, count } = await q;

    if (error) {
      console.error('[admin/feedback] DB error:', error.message);
      return res.status(500).json({ error: 'DB_ERROR' });
    }

    return res.status(200).json({ feedback: data, total: count });
  }
);

// ─── POST /teams ────────────────────────────────────────────────────────────
// Routes admin.html's Add Team action through the backend instead of a direct
// Supabase client write (#787, remaining scope after #338/PR #780).
//
// Uses supabaseAdmin (service-role) rather than the pattern of trusting the
// caller's own session — this fixes a live, silent bug for free per
// ADMIN_HTML_BYPASS_REMEDIATION_PLAN.md §3b: today, admin.html inserts using
// the platform admin's own authenticated Supabase session, so
// 018_auto_provision_team_membership_on_create.sql's AFTER INSERT trigger
// (which grants role=admin/status=active membership to auth.uid()) makes the
// platform admin silently a member of every team they create through the
// panel. A service-role insert carries no user JWT, so auth.uid() resolves
// NULL inside the trigger, and the trigger's own documented behavior is to
// no-op on NULL rather than error - net effect, this route creates a team
// with zero team_memberships rows, which is the correct/intended semantics
// (the real coach is added afterward via Add Coach, #790).
//
// Server generates the id (matching admin.html's own genId() format exactly:
// String(Date.now()) + a random 0-999 suffix - every other teams.id in the
// system is this shape) rather than trusting a client-supplied one.
//
// season is validated to Spring/Fall even though the DB CHECK for it
// (023_enforce_team_season_not_null.sql) is not live yet - see
// backend/CLAUDE.md § Migration Notes - validating to the intended values
// now is cheap and avoids a garbage value slipping in before 023 ships.

router.post(
  '/teams',
  [
    body('name').notEmpty().trim(),
    body('ageGroup').optional().isString().trim(),
    body('sport').optional().isString().trim(),
    body('season').isIn(['Spring', 'Fall']),
    body('year').optional().isInt({ min: 2000, max: 2100 }),
  ],
  async (req, res) => {
    if (validationGuard(req, res)) return;

    const { name, ageGroup, sport, season, year } = req.body;
    const id = String(Date.now()) + String(Math.floor(Math.random() * 1000));

    const { error } = await supabaseAdmin
      .from('teams')
      .insert({
        id,
        name,
        age_group: ageGroup ?? '',
        sport: sport ?? 'baseball',
        season,
        year: year ?? new Date().getFullYear(),
      });

    if (error) {
      console.error('[admin/teams] DB error:', error.message);
      return res.status(500).json({ error: 'DB_ERROR' });
    }

    return res.status(200).json({
      team: { id, name, age_group: ageGroup ?? '', sport: sport ?? 'baseball', season, year: year ?? new Date().getFullYear() },
    });
  }
);

// ─── POST /teams/:teamId/roster ─────────────────────────────────────────────
// Routes admin.html's roster save (add/remove player, CSV import - all three
// funnel through admin.html's one shared saveRoster() function) through the
// backend instead of a direct Supabase client write (#787, remaining scope
// after #338/PR #780). Reuses the existing rosterWipeGuard (see the require
// above) so an admin-panel action can't silently wipe a live roster, same
// protection POST /:teamId/data already has internally.
//
// No `force` override exposed here on purpose, per
// ADMIN_HTML_BYPASS_REMEDIATION_PLAN.md §4.4's explicit recommendation:
// admin.html has no force-override UI today, and an admin who genuinely
// needs to force-wipe a roster already has the recovery tooling
// (X-Admin-Key + GET .../history) for that - adding a second, weaker path
// to the same override isn't part of "route the existing action through
// the backend."
//
// Partial upsert - only team_id/roster columns, per plan §3e - admin.html's
// direct write never touched schedule/practices/etc. and this route must not
// either, or a roster save would silently null out a team's schedule.

router.post(
  '/teams/:teamId/roster',
  [
    param('teamId').notEmpty().trim(),
    body('roster').isArray(),
  ],
  async (req, res) => {
    if (validationGuard(req, res)) return;

    const { teamId } = req.params;
    const { roster } = req.body;

    const guard = await rosterWipeGuard(teamId, roster, undefined);
    if (guard.blocked) {
      return res.status(409).json({
        error: 'ROSTER_WIPE_GUARD',
        message:
          'Refusing to overwrite a non-empty roster with an empty one. ' +
          'Use the recovery tooling (X-Admin-Key + GET .../history) if this is intentional.',
        currentRosterCount: guard.currentRosterCount,
        ...(guard.readError ? { readError: guard.readError } : {}),
      });
    }

    const { error } = await supabaseAdmin
      .from('team_data')
      .upsert({ team_id: String(teamId), roster }, { onConflict: 'team_id' });

    if (error) {
      console.error('[admin/teams/roster] DB error:', error.message);
      return res.status(500).json({ error: 'DB_ERROR' });
    }

    return res.status(200).json({ ok: true });
  }
);

// ─── POST /teams/:teamId/schedule ───────────────────────────────────────────
// Routes admin.html's schedule save (add game, CSV import, and Clear
// Schedule - all three funnel through admin.html's one shared
// saveSchedule() function) through the backend instead of a direct
// Supabase client write (#787, remaining scope after #338/PR #780).
//
// Deliberately does NOT reuse rosterWipeGuard, per
// ADMIN_HTML_BYPASS_REMEDIATION_PLAN.md §3d: admin.html's Clear Schedule
// button (confirm() dialog, then _schedData = [] before calling
// saveSchedule()) is an intentional wipe-to-empty action already in the UI.
// Applying the roster guard here would outright break that feature - an
// empty schedule write must always be allowed through.
//
// Partial upsert only - team_id/schedule columns, per §3e - same reasoning
// as the roster route: does not touch roster/practices/etc.

router.post(
  '/teams/:teamId/schedule',
  [
    param('teamId').notEmpty().trim(),
    body('schedule').isArray(),
  ],
  async (req, res) => {
    if (validationGuard(req, res)) return;

    const { teamId } = req.params;
    const { schedule } = req.body;

    const { error } = await supabaseAdmin
      .from('team_data')
      .upsert({ team_id: String(teamId), schedule }, { onConflict: 'team_id' });

    if (error) {
      console.error('[admin/teams/schedule] DB error:', error.message);
      return res.status(500).json({ error: 'DB_ERROR' });
    }

    return res.status(200).json({ ok: true });
  }
);

// ─── POST /coaches ──────────────────────────────────────────────────────────
// Routes admin.html's Add Coach action through the backend instead of a
// direct Supabase client write (#787, remaining scope after #338/PR #780).
// Mirrors POST /admin/approve's insert shape and email->user lookup exactly
// (ADMIN_HTML_BYPASS_REMEDIATION_PLAN.md §4.2), including status: 'invited'
// (not the 'active'/activated_at admin.html currently sends) — a deliberate
// behavior change per the plan, aligning this path with /approve's existing
// "granting access by email" semantics (coach activates on first login).
//
// The plan flagged an open question: does team_memberships have a unique
// constraint on (team_id, email) to rely on for duplicate detection?
// Checked docs/db/schema.sql directly - it does not (no UNIQUE constraint
// beyond the id primary key), so a duplicate insert would otherwise succeed
// silently. Added an explicit pre-check instead of trusting a DB error that
// would never come.

router.post(
  '/coaches',
  [
    body('teamId').notEmpty().trim(),
    body('email').isEmail(),
    body('role').isIn(CANONICAL_ROLES),
  ],
  async (req, res) => {
    if (validationGuard(req, res)) return;

    const { teamId, email, role } = req.body;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('team_memberships')
      .select('id')
      .eq('team_id', teamId)
      .eq('email', email)
      .maybeSingle();

    if (existingError) {
      console.error('[admin/coaches] DB error checking existing membership:', existingError.message);
      return res.status(500).json({ error: 'DB_ERROR' });
    }

    if (existing) {
      return res.status(409).json({ error: 'ALREADY_MEMBER' });
    }

    const { data: userListData } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = userListData?.users?.find(u => u.email === email);
    const userId = authUser?.id ?? null;

    const { error: insertError } = await supabaseAdmin
      .from('team_memberships')
      .insert({
        email,
        phone_e164: null,
        team_id: teamId,
        role,
        status: 'invited',
        user_id: userId,
      });

    if (insertError) {
      console.error('[admin/coaches] DB error inserting membership:', insertError.message);
      return res.status(500).json({ error: 'DB_ERROR' });
    }

    return res.status(200).json({ message: 'Coach added.' });
  }
);

// ─── DELETE /coaches/:membershipId ─────────────────────────────────────────────
// Routes admin.html's Remove Coach action through the backend instead of a
// direct Supabase client write (#787, remaining scope after #338/PR #780).
// Preserves the existing hard-delete behavior exactly, matching
// ADMIN_HTML_BYPASS_REMEDIATION_PLAN.md §4.3 — /suspend already exists as a
// soft-remove alternative if that semantic ever needs revisiting; that's a
// separate, deliberate call, not part of "route the existing action through
// the backend."

router.delete(
  '/coaches/:membershipId',
  [param('membershipId').isUUID()],
  async (req, res) => {
    if (validationGuard(req, res)) return;

    const { membershipId } = req.params;

    const { error } = await supabaseAdmin
      .from('team_memberships')
      .delete()
      .eq('id', membershipId);

    if (error) {
      console.error('[admin/coaches] DB error:', error.message);
      return res.status(500).json({ error: 'DB_ERROR' });
    }

    return res.status(200).json({ message: 'Coach removed.' });
  }
);

// ─── PATCH /feature-flags/:flagName ────────────────────────────────────────────
// Routes admin.html's global feature-flag toggle through the backend instead of
// a direct Supabase client write (#787, remaining scope after #338/PR #780).
// Global flags only (team_id IS NULL) — matches admin.html's Flags tab scope;
// per-team overrides, if any, are out of scope here since the current UI
// doesn't manage them either.

router.patch(
  '/feature-flags/:flagName',
  [
    param('flagName').notEmpty().trim(),
    body('enabled').isBoolean(),
  ],
  async (req, res) => {
    if (validationGuard(req, res)) return;

    const { flagName } = req.params;
    const { enabled } = req.body;

    const { error } = await supabaseAdmin
      .from('feature_flags')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('flag_name', flagName)
      .is('team_id', null);

    if (error) {
      console.error('[admin/feature-flags] DB error:', error.message);
      return res.status(500).json({ error: 'DB_ERROR' });
    }

    return res.status(200).json({ message: `${flagName} set to ${enabled ? 'ON' : 'OFF'}.` });
  }
);

module.exports = router;
