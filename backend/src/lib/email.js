/**
 * lib/email.js
 * Resend email utility for auth pipeline notifications.
 *
 * Two outbound emails:
 *   1. sendAdminNotification() — fires when a new access request is submitted
 *      To: icoachyouthball@gmail.com
 *      Tells you who requested access, what role, from what device
 *      Includes 1-tap approve + deny links
 *
 *   2. sendApprovalEmail() — fires when you approve a request
 *      To: the requesting user
 *      Tells them they're approved, includes pre-filled login link
 *
 * Never throws — email failures must never block the auth flow.
 * Errors are logged but swallowed.
 *
 * Usage:
 *   const { sendAdminNotification, sendApprovalEmail } = require('../lib/email');
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS   = 'Lineup Generator <noreply@dugoutlineup.com>';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL || 'kaushik.kuberanathan@gmail.com';
const APP_URL        = process.env.APP_URL || 'https://dugoutlineup.com';

/**
 * Send email via Resend REST API.
 * Using fetch (built into Node 18+) — no SDK needed.
 */
async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send');
    return;
  }

  // DEV OVERRIDE: Resend shared domain restricts sending to account owner only.
  // Remove this block when RESEND_DOMAIN_VERIFIED=true is set in .env
  if (!process.env.RESEND_DOMAIN_VERIFIED) {
    to = process.env.RESEND_TEST_RECIPIENT || 'kaushik.kuberanathan@gmail.com';
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    FROM_ADDRESS,
        to:      [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('[email] Resend API error:', response.status, body);
    }
  } catch (err) {
    // Intentionally swallowed — email must never break auth flow
    console.error('[email] Unexpected error:', err.message);
  }
}

// ─── Admin Notification ───────────────────────────────────────────────────────

/**
 * Notify admin when a new access request is submitted.
 * Includes 1-tap approve and deny links — no admin panel required.
 *
 * @param {object} opts
 * @param {string} opts.requestId     — access_requests.id (UUID)
 * @param {string} opts.firstName
 * @param {string} opts.lastName
 * @param {string} opts.email
 * @param {string} opts.requestedRole
 * @param {string} opts.teamId
 * @param {string} opts.platform      — from device context
 * @param {string} opts.accessMode    — 'pwa' | 'browser'
 * @param {string} opts.appVersion
 */
async function sendAdminNotification(opts) {
  const {
    requestId,
    firstName,
    lastName,
    email,
    requestedRole,
    teamId,
    teamName    = 'Unknown Team',
    platform    = 'unknown',
    accessMode  = 'unknown',
    appVersion  = 'unknown',
  } = opts;

  const BACKEND_URL = process.env.BACKEND_URL || 'https://lineup-generator-backend.onrender.com';
  const approveUrl = `${BACKEND_URL}/api/v1/admin/approve-link?requestId=${requestId}&teamId=${teamId}`;
  const denyUrl    = `${BACKEND_URL}/api/v1/admin/deny-link?requestId=${requestId}`;

  const subject = `New access request — ${firstName} ${lastName} (${requestedRole}) · ${teamName}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">New Access Request</h2>
      
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 0; color: #666; width: 140px;">Name</td>
          <td style="padding: 8px 0; font-weight: 500;">${firstName} ${lastName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Email</td>
          <td style="padding: 8px 0;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Requested role</td>
          <td style="padding: 8px 0; font-weight: 500; text-transform: capitalize;">${requestedRole.replace('_', ' ')}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666; width: 140px;">Team</td>
          <td style="padding: 8px 0;">${teamName} <span style="color: #999; font-size: 12px;">(${teamId})</span></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Platform</td>
          <td style="padding: 8px 0;">${platform} · ${accessMode} · v${appVersion}</td>
        </tr>
      </table>

      <div style="margin: 24px 0; display: flex; gap: 12px;">
        <a href="${approveUrl}" 
           style="background: #16a34a; color: white; padding: 12px 24px; 
                  border-radius: 6px; text-decoration: none; font-weight: 500;
                  display: inline-block; margin-right: 12px;">
          ✓ Approve
        </a>
        <a href="${denyUrl}" 
           style="background: #dc2626; color: white; padding: 12px 24px; 
                  border-radius: 6px; text-decoration: none; font-weight: 500;
                  display: inline-block;">
          ✕ Deny
        </a>
      </div>

      <p style="color: #888; font-size: 13px; margin-top: 24px;">
        Request ID: ${requestId}<br>
        Team: ${teamId}
      </p>
    </div>
  `;

  await sendEmail({ to: ADMIN_EMAIL, subject, html });
}

// ─── Approval Email to User ───────────────────────────────────────────────────

/**
 * Notify user that their access request was approved.
 * Includes pre-filled login link so they just tap and enter OTP.
 *
 * @param {object} opts
 * @param {string} opts.firstName
 * @param {string} opts.email
 * @param {string} opts.role
 * @param {string} opts.teamName
 * @param {string} opts.teamId
 */
async function sendApprovalEmail(opts) {
  const {
    firstName,
    email,
    role,
    teamName = 'your team',
    teamId,
  } = opts;

  const loginUrl = `${APP_URL}/login?email=${encodeURIComponent(email)}&team=${teamId}`;

  const subject = `You're approved — ${teamName} Lineup Generator`;

  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">You're in, ${firstName}! 🎉</h2>
      
      <p style="color: #444; line-height: 1.6;">
        Your request to join <strong>${teamName}</strong> has been approved.
        You've been added as <strong>${role.replace('_', ' ')}</strong>.
      </p>

      <div style="margin: 28px 0;">
        <a href="${loginUrl}"
           style="background: #2563eb; color: white; padding: 14px 28px;
                  border-radius: 6px; text-decoration: none; font-weight: 500;
                  display: inline-block; font-size: 16px;">
          Log in to Lineup Generator →
        </a>
      </div>

      <p style="color: #666; font-size: 14px; line-height: 1.6;">
        Tapping the button above will open the app with your email pre-filled.
        You'll receive a login code at <strong>${email}</strong> — 
        enter it and you're in.
      </p>

      <p style="color: #888; font-size: 13px; margin-top: 32px; 
                border-top: 1px solid #eee; padding-top: 16px;">
        ${teamName} · Lineup Generator<br>
        If you didn't request this, you can ignore this email.
      </p>
    </div>
  `;

  await sendEmail({ to: email, subject, html });
}

// ─── Denial Email to User ─────────────────────────────────────────────────────

/**
 * Notify user that their access request was denied.
 * Kept simple — no detail on why.
 *
 * @param {object} opts
 * @param {string} opts.firstName
 * @param {string} opts.email
 * @param {string} opts.teamName
 */
async function sendDenialEmail(opts) {
  const { firstName, email, teamName = 'the team' } = opts;

  const subject = `Access request update — ${teamName} Lineup Generator`;

  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Access Request Update</h2>
      
      <p style="color: #444; line-height: 1.6;">
        Hi ${firstName}, your request to join <strong>${teamName}</strong> 
        wasn't approved at this time.
      </p>

      <p style="color: #666; font-size: 14px; line-height: 1.6;">
        If you think this is a mistake, please reach out to your coach directly.
      </p>

      <p style="color: #888; font-size: 13px; margin-top: 32px;
                border-top: 1px solid #eee; padding-top: 16px;">
        ${teamName} · Lineup Generator
      </p>
    </div>
  `;

  await sendEmail({ to: email, subject, html });
}

module.exports = { sendAdminNotification, sendApprovalEmail, sendDenialEmail };
