/**
 * lib/authEvents.js
 * Thin wrapper for writing to the auth_events audit table.
 * Never throws — logging must never break the auth flow.
 * Called from auth.js and admin.js routes.
 *
 * Usage:
 *   const { logAuthEvent } = require('../lib/authEvents');
 *   await logAuthEvent('otp_requested', {
 *     teamId: '1774297491626',
 *     authChannel: 'email',
 *     deviceContext: req.body.deviceContext ?? {},
 *   });
 */

const { supabaseAdmin } = require('./supabase');

/**
 * @param {string} eventType
 *   One of: otp_requested | otp_verified | otp_failed | session_resumed |
 *           logout | access_denied | access_requested |
 *           access_approved | access_denied_by_admin
 *
 * @param {object} opts
 * @param {string}  [opts.userId]        — auth.users UUID (null if not yet verified)
 * @param {string}  [opts.teamId]        — team context at time of event
 * @param {string}  [opts.role]          — role snapshot at time of event
 * @param {string}  [opts.authChannel]   — 'email' | 'phone' | 'unknown'
 * @param {object}  [opts.deviceContext] — output of client-side getDeviceContext()
 */
async function logAuthEvent(eventType, opts = {}) {
  const {
    userId = null,
    teamId = null,
    role = null,
    authChannel = 'unknown',
    deviceContext = {},
  } = opts;

  try {
    const { error } = await supabaseAdmin.from('auth_events').insert({
      user_id:         userId,
      team_id:         teamId ? String(teamId) : null,
      role,
      event_type:      eventType,
      auth_channel:    authChannel,
      platform:        deviceContext.platform        ?? null,
      device_type:     deviceContext.device_type     ?? null,
      browser:         deviceContext.browser         ?? null,
      browser_version: deviceContext.browser_version ?? null,
      os_version:      deviceContext.os_version      ?? null,
      access_mode:     deviceContext.access_mode     ?? null,
      app_version:     deviceContext.app_version     ?? null,
      timezone:        deviceContext.timezone        ?? null,
    });

    if (error) {
      console.error('[authEvents] Insert error:', eventType, error.message);
    }
  } catch (err) {
    // Intentionally swallowed — analytics must never block auth
    console.error('[authEvents] Unexpected error:', eventType, err.message);
  }
}

module.exports = { logAuthEvent };
