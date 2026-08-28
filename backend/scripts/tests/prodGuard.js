/**
 * prodGuard.js
 * Blast-radius fence for the write-heavy backend integration suites (#339).
 *
 * Same pattern and same hardcoded project ref as
 * backend/src/__tests__/rls/clients.js's assertDevProject() — that suite
 * fences itself against ever touching PROD; this fences test-runner.js's
 * write-heavy block (suite-auth-flow, suite-idempotency, suite-device-context,
 * suite-audit-trail, suite-data-integrity) the same way. Those suites create
 * rows in access_requests/team_memberships/auth_events; relying on
 * "CI_SAFE skips them" plus "cleanup runs at the end" was not enough —
 * an interrupted/crashed run against a local .env that happened to point
 * SUPABASE_URL at prod (the default before SUPABASE_TARGET=dev existed)
 * left orphaned rows in prod with no guard to stop it. This makes it
 * structurally impossible regardless of CI_SAFE or how the run ends.
 */

const PROD_PROJECT_REF = 'hzaajccyurlyeweekvma';

/**
 * Throws if `supabaseUrl` points at the production Supabase project.
 * Silently returns for anything else (DEV, local/ephemeral, missing/unset —
 * an absent URL is a different, already-loud failure elsewhere in the boot
 * path, not this guard's job to catch).
 *
 * @param {string} supabaseUrl
 * @throws {Error} if supabaseUrl resolves to the PROD project
 */
function assertNotProd(supabaseUrl) {
  if (supabaseUrl && supabaseUrl.includes(PROD_PROJECT_REF)) {
    throw new Error(
      'REFUSING TO RUN write-heavy test suites against PRODUCTION ' +
      `(${PROD_PROJECT_REF}). These suites create rows in access_requests, ` +
      'team_memberships, and auth_events. Point SUPABASE_URL at the DEV ' +
      'project or a local backend instead (see backend/CLAUDE.md — ' +
      'SUPABASE_TARGET=dev). See #339.'
    );
  }
}

module.exports = { assertNotProd, PROD_PROJECT_REF };
