/**
 * test-runner.js
 * Orchestrates all backend test suites and outputs a summary table.
 *
 * Usage:
 *   node scripts/tests/test-runner.js
 *   npm test (after adding to package.json scripts)
 *
 * Environment:
 *   Requires backend/.env to be loaded (uses dotenv)
 *   Requires local backend running on PORT (default 3000)
 *   Requires Supabase admin client for DB verification tests
 */

require('../../src/lib/env');
const { createClient } = require('@supabase/supabase-js');

// BACKEND_URL lets CI point at the production Render instance without starting a local server.
// CI_SAFE=true skips suites that write to the database, keeping CI runs read-only against prod.
const BASE_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
const CI_SAFE  = process.env.CI_SAFE === 'true';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── Test Registry ────────────────────────────────────────────────────────────

const results = [];
let passed = 0;
let failed = 0;
let skipped = 0;

async function test(id, description, fn) {
  try {
    const result = await fn({ BASE_URL, supabaseAdmin });
    if (result.skip) {
      results.push({ id, description, expected: result.expected, actual: 'SKIPPED — ' + result.reason, status: 'SKIP' });
      skipped++;
    } else if (result.pass) {
      results.push({ id, description, expected: result.expected, actual: result.actual, status: 'PASS' });
      passed++;
    } else {
      results.push({ id, description, expected: result.expected, actual: result.actual, status: 'FAIL' });
      failed++;
    }
  } catch (err) {
    results.push({ id, description, expected: 'No error', actual: `THREW: ${err.message}`, status: 'FAIL' });
    failed++;
  }
}

// ─── Shared State ─────────────────────────────────────────────────────────────
// Tests can store values here to share between dependent tests

const state = {
  e2eRequestId: null,
  accessToken: null,
  testEmails: [],
};

// ─── Suite Imports ────────────────────────────────────────────────────────────

const suiteRegression      = require('./suite-regression');
const suiteValidation      = require('./suite-validation');
const suiteAuthFlow        = require('./suite-auth-flow');
const suiteIdempotency     = require('./suite-idempotency');
const suiteAdminProtection = require('./suite-admin');
const suiteDeviceContext   = require('./suite-device-context');
const suiteAuditTrail      = require('./suite-audit-trail');
const suiteDataIntegrity   = require('./suite-data-integrity');
const suiteRateLimits      = require('./suite-rate-limits');
// Phase A additions
const suiteTeamData        = require('./suite-team-data');
const suiteFeedback        = require('./suite-feedback');
const suiteContracts       = require('./suite-contracts');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  // Unique suffix prevents email collisions between test runs
  state.runId = Date.now().toString().slice(-6);

  console.log('\n🧪 Lineup Generator — Backend Test Suite');
  console.log(`   Target: ${BASE_URL}`);
  if (CI_SAFE) {
    console.log('   🔒 CI_SAFE mode: write-heavy suites skipped (auth-flow, idempotency, device-context, audit-trail, data-integrity)');
  }
  console.log('   ⚠️  Restart server between runs to reset rate limits\n');
  console.log('   Running...\n');

  // ── Read-only / safe suites (always run) ──────────────────────────────────
  await suiteRegression.run(test, BASE_URL, state);
  await suiteValidation.run(test, BASE_URL, state);
  await suiteAdminProtection.run(test, BASE_URL, state);
  await suiteTeamData.run(test, BASE_URL, supabaseAdmin, state);
  await suiteFeedback.run(test, BASE_URL, state);
  await suiteContracts.run(test, BASE_URL, supabaseAdmin, state);
  await suiteRateLimits.run(test, BASE_URL, state); // must run last — exhausts rate limits

  // ── Write-heavy suites (skipped in CI_SAFE mode) ──────────────────────────
  // WRITE-HEAVY: these suites create rows in access_requests, team_memberships,
  // and auth_events. Do not run against prod without cleanup being available.
  if (!CI_SAFE) {
    await suiteAuthFlow.run(test, BASE_URL, state);
    await suiteIdempotency.run(test, BASE_URL, state);
    await suiteDeviceContext.run(test, BASE_URL, supabaseAdmin, state);
    await suiteAuditTrail.run(test, BASE_URL, supabaseAdmin, state);
    await suiteDataIntegrity.run(test, BASE_URL, supabaseAdmin, state);
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────────
  // Remove test rows created during this run
  if (state.testEmails.length > 0) {
    await supabaseAdmin
      .from('access_requests')
      .delete()
      .in('email', state.testEmails);

    await supabaseAdmin
      .from('team_memberships')
      .delete()
      .in('email', state.testEmails);

    await supabaseAdmin
      .from('auth_events')
      .delete()
      .eq('app_version', 'test-suite-1.0');
  }

  // ─── Results Table ──────────────────────────────────────────────────────────

  const idW   = 8;
  const descW = 52;
  const expW  = 28;
  const actW  = 36;
  const statW = 6;

  const hr = `${'─'.repeat(idW)}┼${'─'.repeat(descW)}┼${'─'.repeat(expW)}┼${'─'.repeat(actW)}┼${'─'.repeat(statW)}`;

  const pad = (s, w) => String(s ?? '').slice(0, w).padEnd(w);

  console.log('\n' + hr);
  console.log(`${pad('Test ID', idW)}│${pad('Description', descW)}│${pad('Expected', expW)}│${pad('Actual', actW)}│${pad('Status', statW)}`);
  console.log(hr);

  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'SKIP' ? '⏭ ' : '❌';
    console.log(`${pad(r.id, idW)}│${pad(r.description, descW)}│${pad(r.expected, expW)}│${pad(r.actual, actW)}│${icon}`);
  }

  console.log(hr);
  console.log(`\n  Total: ${results.length} | ✅ ${passed} passed | ❌ ${failed} failed | ⏭  ${skipped} skipped\n`);

  if (failed > 0) {
    console.log('❌ Failed tests:\n');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ${r.id}: ${r.description}`);
      console.log(`       Expected: ${r.expected}`);
      console.log(`       Actual:   ${r.actual}\n`);
    });
    process.exit(1);
  } else {
    console.log('✅ All tests passed.\n');
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
