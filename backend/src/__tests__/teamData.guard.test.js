/**
 * teamData.guard.test.js
 * Unit coverage for rosterWipeGuard (Story 99 / #252).
 *
 * Why this exists: rosterWipeGuard is the 409 ROSTER_WIPE_GUARD decision for
 * POST /api/teams/:teamId/data — the last line of defense against an empty
 * roster overwriting a live one. It is exported from src/routes/teamData.js
 * specifically so it can be unit-tested in isolation from the route handler.
 *
 * CI-safe: no live DB or network. supabaseAdmin.from is stubbed per-test with
 * a chainable object whose maybeSingle() resolves the scenario's { data, error }.
 * The stub is shared via the require cache (same supabaseAdmin instance as
 * teamData.js) and restored in afterEach. Tests that exercise the early-return
 * paths (force / non-empty incoming roster) assert from is NEVER called.
 * Uses no test framework — node:test + node:assert/strict only.
 */
const { test, describe, afterEach, before, after } = require('node:test');
const assert = require('node:assert/strict');

// Bootstrap env the same way app.js does (require('./src/lib/env') at app.js:1):
// loads dotenv in non-prod so the supabase.js import below finds SUPABASE_URL.
// Under `node --test` each file runs isolated, so unlike admin.auth.test.js
// (which gets dotenv transitively via require('../../app')) this spec must
// load env itself before requiring the supabase client.
require('../lib/env');

const { supabaseAdmin } = require('../lib/supabase');
const { rosterWipeGuard, isAdminRequest } = require('../routes/teamData');

const TEAM_ID = 'test-td-guard';

// Original `from` so each test can restore it in afterEach.
const originalFrom = supabaseAdmin.from;

// Tracks whether the stubbed `from` was invoked this test.
let fromCalled = false;

/**
 * Replace supabaseAdmin.from with a chainable stub whose terminal
 * maybeSingle() resolves to `resolved` ({ data, error }). Mirrors the call
 * chain in rosterWipeGuard: from().select().eq().maybeSingle().
 */
function stubFrom(resolved) {
  fromCalled = false;
  supabaseAdmin.from = () => {
    fromCalled = true;
    const chain = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => resolved,
    };
    return chain;
  };
}

afterEach(() => {
  supabaseAdmin.from = originalFrom;
  fromCalled = false;
});

describe('rosterWipeGuard', () => {

  // ── Early-return paths: DB must NOT be touched ──────────────────────────────
  test('force=true → blocked:false, from NOT called', async () => {
    stubFrom({ data: { roster: [{ name: 'Aiden' }] }, error: null });
    const result = await rosterWipeGuard(TEAM_ID, [], true);
    assert.deepEqual(result, { blocked: false });
    assert.equal(fromCalled, false);
  });

  test('incoming roster non-empty → blocked:false, from NOT called', async () => {
    stubFrom({ data: { roster: [{ name: 'Aiden' }, { name: 'Benji' }] }, error: null });
    const result = await rosterWipeGuard(TEAM_ID, [{ name: 'Aiden' }], false);
    assert.deepEqual(result, { blocked: false });
    assert.equal(fromCalled, false);
  });

  // ── Block paths: empty incoming + populated DB ──────────────────────────────
  test('empty roster vs existing 3-player roster → blocked, currentRosterCount:3', async () => {
    stubFrom({
      data: { roster: [{ name: 'Aiden' }, { name: 'Benji' }, { name: 'Cassius' }] },
      error: null,
    });
    const result = await rosterWipeGuard(TEAM_ID, [], false);
    assert.equal(fromCalled, true);
    assert.deepEqual(result, { blocked: true, currentRosterCount: 3 });
  });

  test('undefined roster vs existing non-empty roster → blocked', async () => {
    stubFrom({
      data: { roster: [{ name: 'Aiden' }, { name: 'Benji' }] },
      error: null,
    });
    const result = await rosterWipeGuard(TEAM_ID, undefined, false);
    assert.equal(fromCalled, true);
    assert.equal(result.blocked, true);
    assert.equal(result.currentRosterCount, 2);
  });

  // ── Fail-safe path: DB read error blocks the write ──────────────────────────
  test('DB read error → blocked, currentRosterCount:-1, readError surfaced', async () => {
    stubFrom({ data: null, error: { message: 'boom' } });
    const result = await rosterWipeGuard(TEAM_ID, [], false);
    assert.equal(fromCalled, true);
    assert.deepEqual(result, { blocked: true, currentRosterCount: -1, readError: 'boom' });
  });

  // ── Safe paths: empty incoming but nothing to protect ───────────────────────
  test('no existing row (data:null, error:null) → blocked:false', async () => {
    stubFrom({ data: null, error: null });
    const result = await rosterWipeGuard(TEAM_ID, [], false);
    assert.equal(fromCalled, true);
    assert.deepEqual(result, { blocked: false });
  });

  test('existing roster empty → blocked:false', async () => {
    stubFrom({ data: { roster: [] }, error: null });
    const result = await rosterWipeGuard(TEAM_ID, [], false);
    assert.equal(fromCalled, true);
    assert.deepEqual(result, { blocked: false });
  });

});

describe('isAdminRequest', () => {

  // Save/restore ADMIN_KEY so env mutation in this block never leaks.
  const REAL_ADMIN_KEY = process.env.ADMIN_KEY;

  before(() => {
    process.env.ADMIN_KEY = 'test-key-123';
  });

  after(() => {
    if (REAL_ADMIN_KEY === undefined) {
      delete process.env.ADMIN_KEY;
    } else {
      process.env.ADMIN_KEY = REAL_ADMIN_KEY;
    }
  });

  test('remote IP, no x-admin-key header → false', () => {
    const req = { ip: '203.0.113.7', headers: {} };
    assert.equal(isAdminRequest(req), false);
  });

  test('remote IP, matching x-admin-key header → true', () => {
    const req = { ip: '203.0.113.7', headers: { 'x-admin-key': 'test-key-123' } };
    assert.equal(isAdminRequest(req), true);
  });

  test('localhost IP (::ffff:127.0.0.1), no headers → true', () => {
    const req = { ip: '::ffff:127.0.0.1', headers: {} };
    assert.equal(isAdminRequest(req), true);
  });

  test('remote IP, wrong x-admin-key header → false', () => {
    const req = { ip: '203.0.113.7', headers: { 'x-admin-key': 'wrong' } };
    assert.equal(isAdminRequest(req), false);
  });

  test('remote IP, header present but ADMIN_KEY unset → falsy (key auth unavailable)', () => {
    delete process.env.ADMIN_KEY;
    const req = { ip: '203.0.113.7', headers: { 'x-admin-key': 'test-key-123' } };
    // NOTE: the guard is `isLocalhost || (adminKey && headerKey === adminKey)`.
    // With ADMIN_KEY unset, adminKey is undefined, so the expression short-
    // circuits to `undefined` — falsy and correctly "not admin", but NOT
    // strictly `false`. Assert the security-relevant property (falsy) and pin
    // the exact return value so the behavior is documented, not papered over.
    assert.ok(!isAdminRequest(req));
    assert.equal(isAdminRequest(req), undefined);
    process.env.ADMIN_KEY = 'test-key-123'; // restore for the after() hook's symmetry
  });

});
