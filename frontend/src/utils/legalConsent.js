/**
 * utils/legalConsent.js
 * Fire-and-forget call to POST /api/v1/auth/consent (migration 028's
 * legal_consents table) — records which VERSION of a legal document a
 * coach accepted, never the document's text. See that migration's header
 * and backend/src/routes/auth.js's route comment for the full rationale.
 *
 * A pure network call, not app state — no useAuth() dependency, so it's
 * imported directly (same pattern as utils/analytics.js's track()) rather
 * than threaded through App.jsx as a prop. Never throws; a failed consent
 * log must never block or surface an error on the registration flow it
 * accompanies (frontend/src/components/Auth/RequestAccessScreen.jsx).
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://lineup-generator-backend.onrender.com';

/**
 * @param {object} opts
 * @param {string} opts.email
 * @param {{docId: string, version: string}[]} opts.consents
 * @param {string} [opts.context]  defaults server-side to "request_access"
 * @returns {Promise<{success: boolean}>}
 */
export async function logLegalConsent({ email, consents, context }) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, consents, context }),
    });
    return { success: res.ok };
  } catch {
    return { success: false };
  }
}
