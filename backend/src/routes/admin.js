const { Router } = require('express');
const { body, query, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../lib/supabase');
const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');
const { sendApprovalEmail, sendDenialEmail } = require('../lib/email');

const router = Router();

// ─── GET /admin/approve-link ─────────────────────────────────────────────────
// 1-tap approve from email link — no auth required (Phase 4 MVP)
// TODO Phase 5: add signed token validation (see docs/TODO_approve_link_security.md)

router.get('/admin/approve-link', async (req, res) => {
  const { requestId, teamId } = req.query;

  if (!requestId || !teamId) {
    return res.status(400).send(htmlPage('Invalid Link',
      'This approval link is missing required parameters.'));
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

    // Create team membership
    const { error: membershipError } = await supabaseAdmin
      .from('team_memberships')
      .insert({
        team_id:      String(teamId),
        email:        accessRequest.email ?? null,
        phone_e164:   accessRequest.phone_e164 ?? null,
        role:         accessRequest.requested_role ?? 'coach',
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
    await supabaseAdmin
      .from('access_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', requestId);

    // Send approval email to user
    await sendApprovalEmail({
      firstName: accessRequest.first_name,
      email:     accessRequest.email ?? accessRequest.phone_e164,
      role:      accessRequest.requested_role ?? 'coach',
      teamName:  'Mud Hens',
      teamId:    String(teamId),
    });

    return res.status(200).send(htmlPage('Approved!',
      `${accessRequest.first_name} ${accessRequest.last_name} has been approved as ${accessRequest.requested_role}. They will receive a login email shortly.`));

  } catch (err) {
    console.error('[approve-link]', err.message);
    return res.status(500).send(htmlPage('Error', 'Something went wrong. Please try again.'));
  }
});

// ─── GET /admin/deny-link ─────────────────────────────────────────────────────

router.get('/admin/deny-link', async (req, res) => {
  const { requestId } = req.query;

  if (!requestId) {
    return res.status(400).send(htmlPage('Invalid Link',
      'This denial link is missing required parameters.'));
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

    await supabaseAdmin
      .from('access_requests')
      .update({ status: 'denied', reviewed_at: new Date().toISOString() })
      .eq('id', requestId);

    await sendDenialEmail({
      firstName: accessRequest.first_name,
      email:     accessRequest.email ?? accessRequest.phone_e164,
      teamName:  'Mud Hens',
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
    body('role').isIn(['coach', 'scorekeeper', 'viewer']),
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

    const { error: insertError } = await supabaseAdmin
      .from('team_memberships')
      .insert({
        phone_e164: accessRequest.phone_e164,
        team_id: teamId,
        role,
        status: 'invited',
        user_id: null,
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

    await sendApprovalEmail({
      firstName: accessRequest.first_name,
      email:     accessRequest.email ?? accessRequest.phone_e164,
      role:      role ?? 'coach',
      teamName:  'Mud Hens',
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

    await sendDenialEmail({
      firstName: accessRequest.first_name,
      email:     accessRequest.email ?? accessRequest.phone_e164,
      teamName:  'Mud Hens',
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
    body('role').isIn(['admin', 'coach', 'scorekeeper', 'viewer']),
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

module.exports = router;
