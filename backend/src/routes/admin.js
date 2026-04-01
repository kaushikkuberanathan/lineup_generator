const { Router } = require('express');
const { body, query, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../lib/supabase');
const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');

const router = Router();

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
      .select('id, phone_e164, status')
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
      .select('id, status')
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
