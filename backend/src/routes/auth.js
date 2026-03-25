const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { normalizePhone } = require('../lib/phone');
const { supabaseAdmin, supabaseAnon } = require('../lib/supabase');
const requireAuth = require('../middleware/requireAuth');

const router = Router();

// ─── Shared helpers ───────────────────────────────────────────────────────────

function validationGuard(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: errors.array() });
    return true;
  }
  return false;
}

// ─── Rate limiters ────────────────────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({ error: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Try again in 15 minutes.' }),
});

// Stricter than loginLimiter — a 6-digit OTP has 1,000,000 combinations and
// must not be brute-forceable. 10 attempts per 15 minutes per IP.
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({ error: 'TOO_MANY_REQUESTS', message: 'Too many verification attempts. Try again in 15 minutes.' }),
});

// ─── POST /request-access ─────────────────────────────────────────────────────

router.post(
  '/request-access',
  [
    body('firstName').isString().trim().notEmpty().isLength({ max: 50 }),
    body('lastName').isString().trim().notEmpty().isLength({ max: 50 }),
    body('phone').isString().trim().notEmpty(),
  ],
  async (req, res) => {
    if (validationGuard(req, res)) return;

    const { firstName, lastName, phone } = req.body;

    let normalizedPhone;
    try {
      normalizedPhone = normalizePhone(phone);
    } catch (err) {
      if (err.code === 'INVALID_PHONE') return res.status(400).json({ error: 'INVALID_PHONE' });
      throw err;
    }

    const { data: existing } = await supabaseAdmin
      .from('access_requests')
      .select('id')
      .eq('phone_e164', normalizedPhone)
      .in('status', ['pending', 'approved'])
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        error: 'ALREADY_REQUESTED',
        message: 'A request for this number is already on file.',
      });
    }

    await supabaseAdmin.from('access_requests').insert({
      first_name: firstName,
      last_name: lastName,
      phone_e164: normalizedPhone,
      status: 'pending',
    });

    return res.status(201).json({
      message: 'Request received. You will be notified when approved.',
    });
  }
);

// ─── POST /login ──────────────────────────────────────────────────────────────

router.post(
  '/login',
  loginLimiter,
  [body('phone').isString().trim().notEmpty()],
  async (req, res) => {
    if (validationGuard(req, res)) return;

    let normalizedPhone;
    try {
      normalizedPhone = normalizePhone(req.body.phone);
    } catch (err) {
      if (err.code === 'INVALID_PHONE') return res.status(400).json({ error: 'INVALID_PHONE' });
      throw err;
    }
    console.log('[login debug] normalized:', normalizedPhone);

    const { data: membership } = await supabaseAdmin
      .from('team_memberships')
      .select('id')
      .eq('phone_e164', normalizedPhone)
      .in('status', ['invited', 'active'])
      .maybeSingle();
    console.log('[login debug] membership result:', membership);

    if (!membership) {
      // CRITICAL: identical message regardless of whether the person never requested,
      // is still pending, or was rejected — do not differentiate, ever.
      return res.status(403).json({
        error: 'ACCESS_NOT_APPROVED',
        message: 'Your access has not been approved yet.',
      });
    }

    // We use supabaseAnon here because Supabase OTP sending requires the anon key,
    // not the service role key. The service role key bypasses auth entirely and
    // cannot trigger the Supabase Auth OTP flow.
    const { error: otpError } = await supabaseAnon.auth.signInWithOtp({
      phone: normalizedPhone,
    });

    if (otpError) {
      console.error('[auth/login] OTP send failed:', otpError.message);
      return res.status(500).json({ error: 'OTP_SEND_FAILED' });
    }

    return res.status(200).json({ message: 'OTP sent.' });
  }
);

// ─── POST /verify ─────────────────────────────────────────────────────────────

router.post(
  '/verify',
  verifyLimiter,
  [
    body('phone').isString().trim().notEmpty(),
    body('token').isString().matches(/^\d{6}$/),
  ],
  async (req, res) => {
    if (validationGuard(req, res)) return;

    const { token } = req.body;

    let normalizedPhone;
    try {
      normalizedPhone = normalizePhone(req.body.phone);
    } catch (err) {
      if (err.code === 'INVALID_PHONE') return res.status(400).json({ error: 'INVALID_PHONE' });
      throw err;
    }

    const { data: otpData, error: otpError } = await supabaseAdmin.auth.verifyOtp({
      phone: normalizedPhone,
      token,
      type: 'sms',
    });

    if (otpError) {
      if (otpError.message?.toLowerCase().includes('expired')) {
        return res.status(410).json({ error: 'OTP_EXPIRED' });
      }
      return res.status(401).json({ error: 'INVALID_OTP' });
    }

    const userId = otpData.user?.id;

    const { data: accessRequest } = await supabaseAdmin
      .from('access_requests')
      .select('first_name, last_name')
      .eq('phone_e164', normalizedPhone)
      .maybeSingle();

    const firstName = accessRequest?.first_name ?? '';
    const lastName = accessRequest?.last_name ?? '';

    const { data: memberships, error: rpcError } = await supabaseAdmin.rpc('activate_membership', {
      p_user_id: userId,
      p_phone_e164: normalizedPhone,
      p_first_name: firstName,
      p_last_name: lastName,
    });

    if (rpcError) {
      console.error('[auth/verify] activate_membership rpc error:', rpcError.message);
      return res.status(500).json({ error: 'ACTIVATION_FAILED' });
    }

    if (!memberships || memberships.length === 0) {
      return res.status(403).json({ error: 'MEMBERSHIP_NOT_FOUND' });
    }

    const membership = memberships[0];

    return res.status(200).json({
      session: {
        access_token: otpData.session.access_token,
        refresh_token: otpData.session.refresh_token,
      },
      user: {
        id: userId,
        firstName,
        lastName,
        role: membership.role,
        teamId: membership.team_id,
      },
    });
  }
);

// ─── GET /me ──────────────────────────────────────────────────────────────────

router.get('/me', requireAuth, async (req, res) => {
  const userId = req.user.id;

  const [{ data: profile, error: profileErr }, { data: memberships, error: membershipsErr }] = await Promise.all([
    supabaseAdmin.from('profiles').select('first_name, last_name, phone_e164').eq('id', userId).maybeSingle(),
    supabaseAdmin
      .from('team_memberships')
      .select('team_id, role, status')
      .eq('user_id', userId)
      .eq('status', 'active'),
  ]);

  console.log('[me debug] userId:', userId, 'profile:', profile, 'memberships:', memberships);
  console.log('[me debug] errors:', profileErr, membershipsErr);

  return res.status(200).json({
    id: userId,
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    phone: profile?.phone_e164 ?? null,
    memberships: (memberships ?? []).map((m) => ({
      teamId: m.team_id,
      role: m.role,
      status: m.status,
    })),
  });
});

module.exports = router;
