/**
 * routes/auth.js
 * Authentication routes — email OTP (primary) + phone OTP (when Twilio live)
 *
 * POST /request-access  — submit access request (email or phone)
 * POST /login           — request OTP via email or phone
 * POST /verify          — verify OTP, activate membership, return session
 * GET  /me              — return profile + active memberships (requireAuth)
 * POST /logout          — clear session, log auth_event
 *
 * Channel detection: if request body contains `email` → email channel
 *                    if request body contains `phone` → phone channel
 *                    both present → email takes priority
 *
 * Changes from previous version:
 *   - Email OTP support added throughout (login, verify, request-access)
 *   - auth_events logging on every auth action
 *   - device context captured from req.body.deviceContext on all routes
 *   - /me now returns id on team_memberships (was missing — known bug)
 *   - /logout route added
 *   - Debug console.log statements removed
 *   - requested_role and team_id now written to access_requests
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { supabaseAdmin, supabaseAnon } = require('../lib/supabase');
const requireAuth = require('../middleware/requireAuth');
const { logAuthEvent } = require('../lib/authEvents');

const router = express.Router();

// ─── Rate Limiters ────────────────────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,
  message: { error: 'TOO_MANY_ATTEMPTS', message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'TOO_MANY_ATTEMPTS', message: 'Too many verification attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Detect auth channel from request body.
 * Email takes priority if both are present.
 */
function detectChannel(body) {
  if (body.email && typeof body.email === 'string' && body.email.includes('@')) {
    return 'email';
  }
  if (body.phone && typeof body.phone === 'string') {
    return 'phone';
  }
  return null;
}

/**
 * Normalize contact identifier for consistent DB queries.
 * Returns { email, phone } with one populated and one null.
 */
function normalizeContact(body, channel) {
  return {
    email: channel === 'email' ? body.email.toLowerCase().trim() : null,
    phone: channel === 'phone' ? body.phone.trim() : null,
  };
}

// ─── POST /request-access ─────────────────────────────────────────────────────

router.post(
  '/request-access',
  [
    body('firstName').notEmpty().trim().escape(),
    body('lastName').notEmpty().trim().escape(),
    body('teamId').notEmpty().trim(),
    body('requestedRole').notEmpty().isIn([
      'team_admin', 'coordinator', 'coach', 'scorekeeper', 'parent',
    ]),
    // At least one contact method required — validated below
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: errors.array() });
    }

    const { firstName, lastName, teamId, requestedRole, deviceContext } = req.body;
    const channel = detectChannel(req.body);

    if (!channel) {
      return res.status(400).json({
        error: 'CONTACT_REQUIRED',
        message: 'Email or phone number is required.',
      });
    }

    const { email, phone } = normalizeContact(req.body, channel);

    try {
      // Check for duplicate pending request for this team + contact
      const contactFilter = channel === 'email'
        ? { email, team_id: String(teamId) }
        : { phone_e164: phone, team_id: String(teamId) };

      const { data: existing } = await supabaseAdmin
        .from('access_requests')
        .select('id, status')
        .match(contactFilter)
        .maybeSingle();

      if (existing?.status === 'pending') {
        return res.status(409).json({
          error: 'REQUEST_PENDING',
          message: 'A request for this team is already pending review.',
        });
      }

      if (existing?.status === 'approved') {
        return res.status(409).json({
          error: 'ALREADY_APPROVED',
          message: 'This account already has access. Try logging in.',
        });
      }

      // Insert access request
      const { data, error } = await supabaseAdmin
        .from('access_requests')
        .insert({
          first_name:     firstName,
          last_name:      lastName,
          email:          email ?? null,
          phone_e164:     phone ?? null,
          team_id:        String(teamId),
          requested_role: requestedRole,
          status:         'pending',
          // Device context
          platform:        deviceContext?.platform        ?? null,
          device_type:     deviceContext?.device_type     ?? null,
          browser:         deviceContext?.browser         ?? null,
          browser_version: deviceContext?.browser_version ?? null,
          os_version:      deviceContext?.os_version      ?? null,
          access_mode:     deviceContext?.access_mode     ?? null,
          app_version:     deviceContext?.app_version     ?? null,
          timezone:        deviceContext?.timezone        ?? null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Log auth event
      await logAuthEvent('access_requested', {
        teamId: String(teamId),
        authChannel: channel,
        deviceContext: deviceContext ?? {},
      });

      return res.status(201).json({
        success: true,
        requestId: data.id,
        message: 'Access request submitted. You will be notified once approved.',
      });

    } catch (err) {
      console.error('[auth/request-access]', err.message);
      return res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  }
);

// ─── POST /login ──────────────────────────────────────────────────────────────

router.post(
  '/login',
  loginLimiter,
  [
    body('teamId').notEmpty().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: errors.array() });
    }

    const { teamId, deviceContext } = req.body;
    const channel = detectChannel(req.body);

    if (!channel) {
      return res.status(400).json({
        error: 'CONTACT_REQUIRED',
        message: 'Email or phone number is required.',
      });
    }

    const { email, phone } = normalizeContact(req.body, channel);
    const contactFilter = channel === 'email' ? { email } : { phone_e164: phone };

    try {
      // Verify membership exists and is invited or active
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from('team_memberships')
        .select('id, status, role, team_id')
        .match({ ...contactFilter, team_id: String(teamId) })
        .in('status', ['invited', 'active'])
        .maybeSingle();

      if (membershipError) throw membershipError;

      if (!membership) {
        await logAuthEvent('access_denied', {
          teamId: String(teamId),
          authChannel: channel,
          deviceContext: deviceContext ?? {},
        });
        return res.status(403).json({
          error: 'NOT_AUTHORIZED',
          message: 'No approved membership found. Request access first.',
        });
      }

      // Send OTP via appropriate channel
      let otpError;

      if (channel === 'email') {
        const { error } = await supabaseAnon.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        otpError = error;
      } else {
        const { error } = await supabaseAnon.auth.signInWithOtp({
          phone,
          options: { shouldCreateUser: true },
        });
        otpError = error;
      }

      if (otpError) {
        console.error('[auth/login] OTP send error:', otpError.message);
        return res.status(500).json({
          error: 'OTP_SEND_FAILED',
          message: 'Failed to send login code. Please try again.',
        });
      }

      // Log auth event
      await logAuthEvent('otp_requested', {
        teamId: String(teamId),
        role: membership.role,
        authChannel: channel,
        deviceContext: deviceContext ?? {},
      });

      return res.status(200).json({
        success: true,
        channel,
        message: channel === 'email'
          ? 'Login code sent to your email. Check your inbox.'
          : 'Login code sent via SMS.',
      });

    } catch (err) {
      console.error('[auth/login]', err.message);
      return res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  }
);

// ─── POST /verify ─────────────────────────────────────────────────────────────

router.post(
  '/verify',
  verifyLimiter,
  [
    body('token').notEmpty().trim().isLength({ min: 6, max: 8 }).withMessage('Token must be 6-8 digits'),
    body('teamId').notEmpty().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: errors.array() });
    }

    const { token, teamId, deviceContext } = req.body;
    const channel = detectChannel(req.body);

    if (!channel) {
      return res.status(400).json({
        error: 'CONTACT_REQUIRED',
        message: 'Email or phone number is required.',
      });
    }

    const { email, phone } = normalizeContact(req.body, channel);

    try {
      // Verify OTP with Supabase
      let verifyResult;

      if (channel === 'email') {
        verifyResult = await supabaseAnon.auth.verifyOtp({
          email,
          token,
          type: 'email',
        });
      } else {
        verifyResult = await supabaseAnon.auth.verifyOtp({
          phone,
          token,
          type: 'sms',
        });
      }

      const { data: verifyData, error: verifyError } = verifyResult;

      if (verifyError || !verifyData?.user) {
        await logAuthEvent('otp_failed', {
          teamId: String(teamId),
          authChannel: channel,
          deviceContext: deviceContext ?? {},
        });
        return res.status(401).json({
          error: 'INVALID_TOKEN',
          message: 'Invalid or expired login code. Please request a new one.',
        });
      }

      const userId = verifyData.user.id;

      // Activate membership via RPC (atomic — handles invited → active transition)
      const contactParam = channel === 'email'
        ? { p_email: email, p_phone: null }
        : { p_phone: phone, p_email: null };

      const { data: activateData, error: activateError } = await supabaseAdmin
        .rpc('activate_membership', {
          p_user_id: userId,
          p_team_id: String(teamId),
          ...contactParam,
        });

      if (activateError) {
        console.error('[auth/verify] activate_membership error:', activateError.message);
        // Don't block login — membership may already be active
      }

      // Fetch membership + profile for response
      const contactFilter = channel === 'email' ? { email } : { phone_e164: phone };

      const { data: membership } = await supabaseAdmin
        .from('team_memberships')
        .select('id, role, status, team_id')
        .match({ ...contactFilter, team_id: String(teamId) })
        .single();

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, email, phone_e164')
        .eq('id', userId)
        .maybeSingle();

      // Log successful verification
      await logAuthEvent('otp_verified', {
        userId,
        teamId: String(teamId),
        role: membership?.role ?? null,
        authChannel: channel,
        deviceContext: deviceContext ?? {},
      });

      return res.status(200).json({
        success: true,
        session: verifyData.session,
        user: {
          id: userId,
          email: verifyData.user.email ?? null,
          phone: verifyData.user.phone ?? null,
          profile: profile ?? null,
          membership: membership ?? null,
        },
      });

    } catch (err) {
      console.error('[auth/verify]', err.message);
      return res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  }
);

// ─── GET /me ──────────────────────────────────────────────────────────────────

router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email, phone_e164, created_at')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Fixed: now includes `id` on team_memberships (was missing — known bug)
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('team_memberships')
      .select('id, team_id, role, status, activated_at')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (membershipError) throw membershipError;

    // Log session resume
    const primaryMembership = memberships?.[0];
    await logAuthEvent('session_resumed', {
      userId,
      teamId: primaryMembership?.team_id ?? null,
      role: primaryMembership?.role ?? null,
      authChannel: 'unknown',  // channel not known on session resume
      deviceContext: req.body?.deviceContext ?? {},
    });

    return res.status(200).json({
      success: true,
      user: {
        id: userId,
        profile,
        memberships: memberships ?? [],
      },
    });

  } catch (err) {
    console.error('[auth/me]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ─── POST /logout ─────────────────────────────────────────────────────────────

router.post('/logout', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { deviceContext, teamId } = req.body;

    await logAuthEvent('logout', {
      userId,
      teamId: teamId ? String(teamId) : null,
      authChannel: 'unknown',
      deviceContext: deviceContext ?? {},
    });

    // Supabase session invalidation happens client-side via supabase.auth.signOut()
    // This endpoint exists to log the event and confirm to the client
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[auth/logout]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
