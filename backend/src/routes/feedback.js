const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../lib/supabase');
const requireAuth = require('../middleware/requireAuth');

const router = Router();

function validationGuard(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: errors.array() });
    return true;
  }
  return false;
}

// ─── POST /feedback ───────────────────────────────────────────────────────────

router.post(
  '/feedback',
  requireAuth,
  [
    body('type').isIn(['feedback', 'bug']),
    body('body').isString().trim().notEmpty(),
    body('category').optional().isString().trim(),
    body('location').optional().isString().trim(),
    body('changeTypes').optional().isArray(),
    body('severity').optional().isString().trim(),
    body('appVersion').optional().isString().trim(),
  ],
  async (req, res) => {
    if (validationGuard(req, res)) return;

    const { type, category, location, body: feedbackBody, changeTypes, severity, appVersion } = req.body;
    const coachId = req.user.id;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('phone_e164')
      .eq('id', coachId)
      .maybeSingle();

    const { error } = await supabaseAdmin.from('feedback').insert({
      coach_id: coachId,
      phone_e164: profile?.phone_e164 ?? null,
      type,
      category: category ?? null,
      location: location ?? null,
      body: feedbackBody,
      change_types: changeTypes ?? null,
      severity: severity ?? null,
      app_version: appVersion ?? null,
    });

    if (error) {
      console.error('[feedback/submit] DB error:', error.message);
      return res.status(500).json({ error: 'DB_ERROR' });
    }

    return res.status(201).json({ message: 'Feedback received.' });
  }
);

module.exports = router;
