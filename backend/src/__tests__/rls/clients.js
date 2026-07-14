// backend/src/__tests__/rls/clients.js
//
// Client factories for the RLS policy suite (#348).
//
// This is the ONLY test surface in the repo that holds a service-role key and
// issues writes + deletes. It is fenced accordingly:
//   - It refuses to run against any project other than DEV.
//   - It reads credentials from .env.rls.local ONLY, never the app's .env.
//
// Ground truth for what these tests assert is docs/db/schema.sql (introspected
// from prod 2026-07-13), NOT backend/migrations/004_rls_fixes.sql — 004 is a
// known landmine (see 006_p0_lock_team_data_history.sql header).

const path = require('path');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({
  path: path.resolve(__dirname, '../../../.env.rls.local'),
});

const DEV_PROJECT_REF  = 'psqvzppphdedqkpmarwx';
const PROD_PROJECT_REF = 'hzaajccyurlyeweekvma';

const URL          = process.env.RLS_TEST_SUPABASE_URL;
const ANON_KEY     = process.env.RLS_TEST_SUPABASE_ANON_KEY;
const SERVICE_KEY  = process.env.RLS_TEST_SUPABASE_SERVICE_ROLE_KEY;

// ─── BLAST-RADIUS FENCE ──────────────────────────────────────────────────────
// This suite seeds and deletes rows with a service-role key. It must be
// structurally incapable of touching production, even if someone pastes the
// wrong credentials into .env.rls.local.
function assertDevProject() {
  if (!URL || !ANON_KEY || !SERVICE_KEY) {
    throw new Error(
      'RLS suite: missing credentials. Expected RLS_TEST_SUPABASE_URL, ' +
      'RLS_TEST_SUPABASE_ANON_KEY, RLS_TEST_SUPABASE_SERVICE_ROLE_KEY in ' +
      'backend/.env.rls.local'
    );
  }
  if (URL.includes(PROD_PROJECT_REF)) {
    throw new Error(
      'RLS suite: URL points at PRODUCTION (' + PROD_PROJECT_REF + '). ' +
      'This suite writes and deletes rows. REFUSING TO RUN.'
    );
  }
  if (!URL.includes(DEV_PROJECT_REF)) {
    throw new Error(
      'RLS suite: URL does not point at the DEV project (' + DEV_PROJECT_REF +
      '). REFUSING TO RUN. Got: ' + URL
    );
  }
}
assertDevProject();

// ─── CLIENT FACTORIES ────────────────────────────────────────────────────────

/** Service-role client. Bypasses RLS. Seed + teardown ONLY — never an assertion subject. */
function adminClient() {
  return createClient(URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Anon client, no session. THIS IS THE ATTACKER — the key that ships in the bundle. */
function anonClient() {
  return createClient(URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Anon-key client carrying a real authenticated session for `email`.
 *
 * Hermetic: mints a magic link server-side with the service key, then redeems
 * the hashed token on a fresh anon client. No mailbox, no interactive step.
 * The resulting client authenticates as the Postgres `authenticated` role —
 * which is what every "TO authenticated" policy in schema.sql targets.
 */
async function authedClient(email) {
  const admin = adminClient();

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (error) throw new Error('generateLink failed for ' + email + ': ' + error.message);

  const tokenHash = data?.properties?.hashed_token;
  if (!tokenHash) throw new Error('generateLink returned no hashed_token for ' + email);

  const client = createClient(URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: session, error: verifyErr } = await client.auth.verifyOtp({
    type: 'magiclink',
    token_hash: tokenHash,
  });
  if (verifyErr) throw new Error('verifyOtp failed for ' + email + ': ' + verifyErr.message);
  if (!session?.session) throw new Error('verifyOtp returned no session for ' + email);

  return client;
}

// ─── ASSERTION HELPERS ───────────────────────────────────────────────────────
//
// The spike surfaced the distinction these exist to protect:
//
//   authorized-but-empty  ->  rows = 0, error = null      (share_links in DEV)
//   denied by GRANT       ->  rows = 0, error.code 42501  (team_data_history)
//   denied by RLS policy  ->  rows = 0, error = null      (!!)
//
// A test that asserts "blocked" by checking rows === 0 passes against an empty
// authorized table and proves NOTHING. Never assert on row count alone.

/** True when the GRANT itself denied access (REVOKE ALL). Migrations 005/006 produce this. */
function isGrantDenied(result) {
  return result.error?.code === '42501';
}

/**
 * True when RLS filtered every row away but the grant allowed the query.
 * Postgres returns zero rows with NO error — RLS is a row filter, not a gate.
 * This is what a correct policy on team_data looks like post-WS-3.
 */
function isRlsFiltered(result) {
  return result.error === null && Array.isArray(result.data) && result.data.length === 0;
}

/** True when the caller got rows back. Used for the breach assertions (red today). */
function returnedRows(result) {
  return result.error === null && Array.isArray(result.data) && result.data.length > 0;
}

/** True when a write was rejected — either by grant (42501) or RLS check (42501 / PGRST). */
function isWriteBlocked(result) {
  return result.error !== null;
}

module.exports = {
  DEV_PROJECT_REF,
  PROD_PROJECT_REF,
  adminClient,
  anonClient,
  authedClient,
  isGrantDenied,
  isRlsFiltered,
  returnedRows,
  isWriteBlocked,
};
