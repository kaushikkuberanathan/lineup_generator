/**
 * routes/auth.js
 * Authentication routes — email magic-link (primary)
 *
 * POST /request-access  — submit access request (email only)
 * POST /magic-link       — send a magic-link login email
 * GET  /me              — return profile + active memberships (requireAuth)
 * PATCH /me             — update the signed-in user's profile name
 * POST /logout          — clear session, log auth_event
 * POST /consent          — record a legal-doc version accepted (migration 028)
 *
 * Phone-based request-access (a channel this route accepted alongside email)
 * was removed 2026-08-26 — dead code found during the #406/#410 test-health
 * survey: the frontend never sent a `phone` field (confirmed by grep across
 * `RequestAccessScreen.jsx` and every request-access test file before
 * removing this), and it contradicted root CLAUDE.md's Auth Strategy
 * section, which states this app has "no phone or SMS dependency anywhere
 * in the stack." Historical `access_requests`/`team_memberships` rows that
 * already hold a `phone_e164` value are untouched — this only removes the
 * ability to create a *new* request via phone; `admin.js`'s existing
 * `email ?? phone_e164` read-side fallbacks for those old rows are
 * unaffected.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { supabaseAdmin, supabaseAnon } = require('../lib/supabase');
const requireAuth = require('../middleware/requireAuth');
const { logAuthEvent } = require('../lib/authEvents');
const { sendAdminNotification } = require('../lib/email');
const { normalizeRole, isNormalizableRole } = require('../lib/normalizeRole');
const { normalizeEmail } = require('../lib/normalizeEmail');

const router = express.Router();

// ─── Rate Limiters ────────────────────────────────────────────────────────────

function hasEmail(req) {
  const email = req.body && req.body.email;
  return typeof email === 'string' && email.trim().length > 0;
}

// Keyed by email, not IP (ROADMAP Story 26, fix D). The default IP-keyed
// limiter shares one budget across every caller behind the same address —
// in CI, that means every workflow run and every PR/push trigger against
// the same runner IP pool draws from one 5-request/15-minute budget, so
// unrelated test runs starve each other (this is what produced live
// 429s on VAL-08/VAL-09/RATE-01a in CI on 2026-07-31, not a flake).
// Keying by email scopes the budget to the account being targeted, which
// is also the behavior that actually matters for abuse prevention — a
// real attacker enumerating accounts from one IP should be limited per
// target account, not merely per source address.
// A request with no email isn't a login attempt against any account — it
// has nothing to rate-limit and express-validator will reject it with 400
// regardless. skip() excludes it from consuming budget at all (e.g.
// VAL-09's deliberately-missing-email case), rather than falling it back
// onto a still-shared IP bucket. keyGenerator's own IP fallback (via the
// library's ipKeyGenerator helper, which normalizes IPv6 correctly) is
// defensive only, for the case skip() doesn't already exclude.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'TOO_MANY_ATTEMPTS', message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !hasEmail(req),
  keyGenerator: (req) => (hasEmail(req) ? req.body.email.trim().toLowerCase() : ipKeyGenerator(req.ip)),
});

// /request-access is a one-time signup action, not a repeated auth flow, so
// the budget is looser than loginLimiter's — but the keying rationale above
// (email, not IP; skip() over IP-fallback for the no-email case) applies
// identically here and is replicated verbatim rather than re-derived.
const requestAccessLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'TOO_MANY_ATTEMPTS', message: 'Too many access requests. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !hasEmail(req),
  keyGenerator: (req) => (hasEmail(req) ? req.body.email.trim().toLowerCase() : ipKeyGenerator(req.ip)),
});

// /me and /logout sit behind requireAuth (mounted before these limiters, so
// req.user.id is always set), so they're keyed by user id rather than email —
// the caller already holds a valid session, there's no email to key on, and
// per-user is the budget that actually matters here. Deliberately NOT a
// reuse of loginLimiter/requestAccessLimiter's shape (CodeQL #12/#15,
// tracked under #651): /me fires on every page load and session-resume
// (useAuth.js), so its budget has to be generous enough to survive multiple
// tabs and flaky-network reconnects without ever touching a real coach.
// /logout is a rare, explicit action, so it gets a tighter budget with
// still-comfortable headroom. keyGenerator's ipKeyGenerator fallback is
// defensive only — requireAuth guarantees req.user.id is set by the time
// either limiter runs.

// /consent fires alongside /request-access (same public, pre-auth moment),
// so it gets the same email-keyed shape and a comparable budget — generous
// enough to survive a retried submission, tight enough to not be a useful
// write amplifier for an attacker.
const legalConsentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'TOO_MANY_ATTEMPTS', message: 'Too many requests. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !hasEmail(req),
  keyGenerator: (req) => (hasEmail(req) ? req.body.email.trim().toLowerCase() : ipKeyGenerator(req.ip)),
});
const meLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'TOO_MANY_ATTEMPTS', message: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip),
});

const logoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'TOO_MANY_ATTEMPTS', message: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip),
});

// ─── POST /request-access ─────────────────────────────────────────────────────

router.post(
  '/request-access',
  requestAccessLimiter,
  [
    body('firstName').notEmpty().trim().escape(),
    body('lastName').notEmpty().trim().escape(),
    body('email').isEmail(),
    body('teamId').notEmpty().trim(),
    body('requestedRole').notEmpty()
      .custom((v) => isNormalizableRole(v))
      .withMessage('requestedRole must be a recognized role'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: errors.array() });
    }

    const { firstName, lastName, teamId, requestedRole, deviceContext } = req.body;
    // normalizeEmail (#374), not a bare toLowerCase/trim: a Gmail dot
    // variant (sam.jones@ vs samjones@) must land in access_requests (and
    // from there, team_memberships on approval) in the same canonical form
    // /magic-link's login check compares against, or a coach who later
    // types a different-but-equivalent variant gets locked out.
    const email = normalizeEmail(req.body.email);

    // Normalize the requested role to a canonical team_memberships value before
    // it is persisted. WS-1 (#336): access_requests.requested_role was written
    // verbatim, so team_admin/coordinator/parent landed in the DB - values the
    // team_memberships CHECK constraint rejects. That is why approve-link had to
    // transform on read.
    //
    // The validator above still ACCEPTS legacy labels: this is a public form and
    // the frontend sends team_admin/coordinator today. Accept, then translate.
    let canonicalRole;
    try {
      canonicalRole = normalizeRole(requestedRole);
    } catch (roleErr) {
      console.error('[auth/request-access] role normalization failed:',
        roleErr.code, roleErr.message, '| raw:', requestedRole);
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Unrecognized role.',
      });
    }

    try {
      // Check for duplicate pending request for this team + email
      const { data: existing } = await supabaseAdmin
        .from('access_requests')
        .select('id, status')
        .match({ email, team_id: String(teamId) })
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
          email,
          team_id:        String(teamId),
          requested_role: canonicalRole,
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

      let teamName = 'Unknown Team';
      try {
        const { data: teamRow } = await supabaseAdmin
          .from('teams')
          .select('name')
          .eq('id', String(teamId))
          .maybeSingle();
        if (teamRow?.name) teamName = teamRow.name;
      } catch { /* non-blocking */ }

      // Log auth event
      await logAuthEvent('access_requested', {
        teamId: String(teamId),
        authChannel: 'email',
        deviceContext: deviceContext ?? {},
      });

      await sendAdminNotification({
        requestId: data.id,
        firstName,
        lastName,
        email,
        requestedRole: canonicalRole,
        teamId:        String(teamId),
        teamName,
        platform:      deviceContext?.platform    ?? 'unknown',
        accessMode:    deviceContext?.access_mode ?? 'unknown',
        appVersion:    deviceContext?.app_version ?? 'unknown',
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

// ─── POST /magic-link ─────────────────────────────────────────────────────────
// Sends a magic link email via Supabase.
// User clicks the link → lands on /auth/callback → session established.
// Replaces the two-step OTP flow (login + verify).

router.post(
  '/magic-link',
  [
    // isEmail() only here, deliberately no .normalizeEmail() (#374): that
    // express-validator helper applies broader per-provider rules (Outlook/
    // Yahoo/iCloud +subaddress stripping) that the write side does not
    // mirror, which would reintroduce the exact same read/write mismatch
    // this fix closes for those providers. normalizeEmail() below (the
    // shared, narrower Gmail-only helper) is applied explicitly instead, to
    // both sides of the comparison.
    body('email').isEmail(),
    body('teamId').notEmpty().trim(),
  ],
  // Validation runs BEFORE loginLimiter (#329): a malformed request (e.g.
  // missing email) must always get a deterministic 400, never a 429 from a
  // warm rate-limit window. Reject here so loginLimiter never sees the
  // request at all, rather than relying on its own skip()/keyGenerator
  // fallback to sort it out after the fact.
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: errors.array() });
    }
    next();
  },
  loginLimiter,
  async (req, res) => {
    const { teamId, deviceContext } = req.body;
    const email = normalizeEmail(req.body.email);

    try {
      // Verify membership exists and is invited or active. Matched in JS
      // against normalizeEmail(m.email) rather than a DB-side .eq('email',
      // email) (#374): existing team_memberships rows were written before
      // this fix landed and may still hold a non-canonical form (a Gmail
      // dot variant, mixed case) - normalizing both sides at comparison
      // time fixes login for those rows too, with no backfill required.
      const { data: candidates, error: membershipError } = await supabaseAdmin
        .from('team_memberships')
        .select('id, status, role, team_id, email')
        .eq('team_id', String(teamId))
        .in('status', ['invited', 'active']);

      if (membershipError) throw membershipError;

      const membership = (candidates ?? []).find(
        (m) => normalizeEmail(m.email) === email
      ) ?? null;

      if (!membership) {
        await logAuthEvent('access_denied', {
          teamId: String(teamId),
          authChannel: 'email',
          deviceContext: deviceContext ?? {},
        });
        return res.status(403).json({
          error: 'NOT_AUTHORIZED',
          message: 'No approved membership found. Request access first.',
        });
      }

      // Send magic link via Supabase
      const { error: magicLinkError } = await supabaseAnon.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.APP_URL}/auth/callback`,
          shouldCreateUser: true,
        },
      });

      if (magicLinkError) {
        console.error('[auth/magic-link] error:', magicLinkError.message);
        const isRateLimit = magicLinkError.message?.toLowerCase().includes('security purposes') ||
                            magicLinkError.message?.toLowerCase().includes('after');
        return res.status(isRateLimit ? 429 : 500).json({
          error: isRateLimit ? 'TOO_MANY_ATTEMPTS' : 'MAGIC_LINK_FAILED',
          message: isRateLimit
            ? 'Please wait a moment before requesting another link.'
            : 'Failed to send login link. Please try again.',
        });
      }

      await logAuthEvent('magic_link_requested', {
        teamId: String(teamId),
        role: membership.role,
        authChannel: 'email',
        deviceContext: deviceContext ?? {},
      });

      return res.status(200).json({
        success: true,
        message: 'Login link sent. Check your email and tap the link to sign in.',
      });

    } catch (err) {
      console.error('[auth/magic-link]', err.message);
      return res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  }
);

// ─── GET /me ──────────────────────────────────────────────────────────────────

router.get('/me', requireAuth, meLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email, phone_e164, created_at')
      .eq('id', userId)
      .maybeSingle();

    // maybeSingle() returns null (not an error) when no profile row exists.
    // A real query failure still throws; a missing profile does not — a valid
    // coach with a membership must still hydrate even if their profile row is
    // absent (Piece 1's trigger provisions new users; this guards the rest).
    if (profileError) throw profileError;

    // Fixed: now includes `id` on team_memberships (was missing — known bug)
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('team_memberships')
      .select('id, user_id, team_id, role, status, activated_at')
      .or(`user_id.eq.${userId},email.eq.${userEmail}`)
      .eq('status', 'active');

    if (membershipError) throw membershipError;

    // Back-fill user_id on memberships matched by email (written before the
    // coach signed up, so user_id was NULL). Links them to the auth user so
    // future lookups hit the user_id path. Guarded to only fill NULLs.
    const unlinked = (memberships ?? []).filter((m) => !m.user_id);
    if (unlinked.length > 0) {
      await supabaseAdmin
        .from('team_memberships')
        .update({ user_id: userId })
        .in('id', unlinked.map((m) => m.id))
        .is('user_id', null);
    }

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

// ─── PATCH /me ──────────────────────────────────────────────────────────────────
// Update the signed-in user's profile name (#405). Self-scoped: the row is
// always keyed by req.user.id from the verified token, NEVER from the body —
// supabaseAdmin bypasses RLS, so this .eq scope is the only thing preventing a
// user from writing another user's row.
//
// No .escape() on the name fields: React escapes on render, so storing HTML
// entities here would double-encode names like O'Brien. lastName is optional
// (single-word names) and defaults to '' — profiles.last_name is NOT NULL.

router.patch(
  '/me',
  requireAuth,
  [
    body('firstName').isString().trim().notEmpty().isLength({ max: 100 }),
    body('lastName').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: errors.array() });
    }

    try {
      const { firstName, lastName } = req.body;

      const { data: profile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          first_name: firstName,
          last_name:  lastName ?? '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.user.id)
        .select()
        .maybeSingle();

      if (updateError) throw updateError;

      // Updating a nonexistent row affects nothing → maybeSingle() returns null.
      // A signed-in user should always have a profiles row post-#402 trigger,
      // but a pre-trigger magic-link user might not.
      if (!profile) {
        return res.status(404).json({ error: 'PROFILE_NOT_FOUND' });
      }

      return res.status(200).json({ success: true, profile });

    } catch (err) {
      console.error('[auth/me-patch]', err.message);
      return res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  }
);

// ─── POST /logout ─────────────────────────────────────────────────────────────

router.post('/logout', requireAuth, logoutLimiter, async (req, res) => {
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

// ─── POST /consent ────────────────────────────────────────────────────────────
// Records that a specific version of a specific legal document (see
// frontend/src/content/legal.js's LEGAL_DOCS[].versions[]) was accepted, at
// what time, by what email. Deliberately does NOT store the document text —
// only the version string, which is the pointer back to the exact text in
// that file's version history. A brand-new route + a brand-new table
// (legal_consents, migration 028) rather than adding fields to
// POST /request-access's existing insert — see that migration's header for
// why, per the Zero-Downtime Constraint above.
//
// Fired by RequestAccessScreen.jsx alongside (not gating) the access request
// itself — see frontend/src/utils/legalConsent.js. A person's consent is a
// fact about that moment regardless of whether the access request that
// accompanied it later succeeds, is a duplicate, or fails.

router.post(
  '/consent',
  legalConsentLimiter,
  [
    body('email').isEmail(),
    body('consents').isArray({ min: 1 }).withMessage('consents must be a non-empty array'),
    body('consents.*.docId').notEmpty().trim().isLength({ max: 50 }),
    body('consents.*.version').notEmpty().trim().isLength({ max: 20 }),
    body('context').optional().isString().trim().isLength({ max: 50 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: errors.array() });
    }

    const email = normalizeEmail(req.body.email);
    const context = req.body.context || 'request_access';
    const rows = req.body.consents.map((c) => ({
      email,
      doc_id:  String(c.docId).trim(),
      version: String(c.version).trim(),
      context,
    }));

    try {
      const { error } = await supabaseAdmin.from('legal_consents').insert(rows);
      if (error) throw error;

      return res.status(201).json({ success: true, count: rows.length });

    } catch (err) {
      console.error('[auth/consent]', err.message);
      return res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  }
);

module.exports = router;
