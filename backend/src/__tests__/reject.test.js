/**
 * reject.test.js
 * Route-level coverage for POST /admin/reject — previously only exercised by
 * admin.auth.test.js's blanket 401-rejection check (no token). Nothing
 * verified what this route actually does for an authorized admin: update
 * access_requests to 'rejected', set reviewed_by/reviewed_at, send the
 * denial email. Notable because admin.html now calls this route for real in
 * production (PR #780) — previously it wrote directly to Supabase and never
 * exercised this code path at all (#798).
 *
 * Mocking pattern copied from approve.role.test.js (the first test to get
 * past requireAuth + requireAdmin) — same three stubs required to reach the
 * handler:
 *   - supabaseAdmin.auth.getUser(token)      -> requireAuth sets req.user
 *   - from('team_memberships').maybeSingle() -> requireAdmin finds an admin row
 *   - global.fetch                           -> sendDenialEmail never leaves the process
 *
 * CI-safe: no network.
 */

const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const request = require('supertest');
const { supabaseAdmin } = require('../lib/supabase');
const app = require('../../app');

const originalAdminFrom = supabaseAdmin.from;
const originalGetUser = supabaseAdmin.auth.getUser;
const REAL_FETCH = global.fetch;

const TEAM_ID = '1774297491626';
const REQUEST_ID = '33333333-3333-4333-8333-333333333333';
const ADMIN_USER_ID = '44444444-4444-4444-8444-444444444444';
const TOKEN = 'fake-bearer-token';

/** Per-test recorder, reset by installStubs. */
let calls;

function installStubs({ accessRequest } = {}) {
  calls = {
    accessRequestUpdates: [],
    emailFetchCount: 0,
  };

  supabaseAdmin.auth.getUser = async () => ({
    data: { user: { id: ADMIN_USER_ID, email: 'admin@example.com' } },
    error: null,
  });

  supabaseAdmin.from = (table) => {
    if (table === 'team_memberships') {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({
          data: {
            id: 'membership-admin',
            user_id: ADMIN_USER_ID,
            role: 'admin',
            status: 'active',
            team_id: TEAM_ID,
          },
          error: null,
        }),
      };
      return chain;
    }

    if (table === 'access_requests') {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: accessRequest, error: null }),
        update: (payload) => {
          calls.accessRequestUpdates.push(payload);
          return { eq: async () => ({ error: null }) };
        },
      };
      return chain;
    }

    if (table === 'teams') {
      const chain = {
        select: () => chain,
        eq: () => chain,
        single: async () => ({ data: { name: 'Mud Hens' }, error: null }),
      };
      return chain;
    }

    const chain = {
      select: () => chain,
      eq: () => chain,
      insert: () => chain,
      update: () => chain,
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: null, error: null }),
    };
    return chain;
  };

  global.fetch = async () => {
    calls.emailFetchCount += 1;
    return { ok: true, status: 200, text: async () => '', json: async () => ({}) };
  };
}

function pendingRequest() {
  return {
    id: REQUEST_ID,
    first_name: 'Stan',
    last_name: 'Hoover',
    email: 'stan@example.com',
    phone_e164: null,
    status: 'pending',
    team_id: TEAM_ID,
  };
}

afterEach(() => {
  supabaseAdmin.from = originalAdminFrom;
  supabaseAdmin.auth.getUser = originalGetUser;
  global.fetch = REAL_FETCH;
  calls = undefined;
});

describe('POST /admin/reject — authorized-admin success path (#798)', () => {

  test('R1: pending request -> 200, status set to rejected, reviewed_by set to the acting admin', async () => {
    installStubs({ accessRequest: pendingRequest() });

    const res = await request(app)
      .post('/api/v1/reject')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ requestId: REQUEST_ID });

    assert.equal(res.status, 200);
    assert.equal(calls.accessRequestUpdates.length, 1);
    assert.equal(calls.accessRequestUpdates[0].status, 'rejected');
    assert.equal(calls.accessRequestUpdates[0].reviewed_by, ADMIN_USER_ID);
    assert.ok(calls.accessRequestUpdates[0].reviewed_at);
  });

  // RESEND_API_KEY is deliberately absent in CI (ci.yml's backend-unit job
  // env block only sets the three Supabase vars) — sendDenialEmail() skips
  // the actual fetch call in that case (see backend/src/lib/email.js), so
  // asserting emailFetchCount === 1 here would fail in real CI, not just
  // locally. approve.role.test.js tracks the same counter without asserting
  // on it for this exact reason; this test instead asserts the route still
  // succeeds when the email is skipped, which is the CI-stable behavior.
  test('R2: reject still succeeds even when email sending is skipped (no RESEND_API_KEY)', async () => {
    installStubs({ accessRequest: pendingRequest() });

    const res = await request(app)
      .post('/api/v1/reject')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ requestId: REQUEST_ID });

    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'Request rejected.');
  });

  test('R3: notes passed through -> included in the update payload', async () => {
    installStubs({ accessRequest: pendingRequest() });

    await request(app)
      .post('/api/v1/reject')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ requestId: REQUEST_ID, notes: 'Not a fit for this team' });

    assert.equal(calls.accessRequestUpdates[0].notes, 'Not a fit for this team');
  });

  test('R4: notes omitted -> update payload has no notes key', async () => {
    installStubs({ accessRequest: pendingRequest() });

    await request(app)
      .post('/api/v1/reject')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ requestId: REQUEST_ID });

    assert.equal('notes' in calls.accessRequestUpdates[0], false);
  });

  test('R5: already-processed request -> 409 ALREADY_PROCESSED, no update issued', async () => {
    installStubs({ accessRequest: Object.assign(pendingRequest(), { status: 'approved' }) });

    const res = await request(app)
      .post('/api/v1/reject')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ requestId: REQUEST_ID });

    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'ALREADY_PROCESSED');
    assert.equal(calls.accessRequestUpdates.length, 0);
  });

  test('R6: nonexistent request -> 409 ALREADY_PROCESSED (maybeSingle returns null)', async () => {
    installStubs({ accessRequest: null });

    const res = await request(app)
      .post('/api/v1/reject')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ requestId: REQUEST_ID });

    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'ALREADY_PROCESSED');
  });

  test('R7: missing requestId -> 400 VALIDATION_ERROR, no DB update attempted', async () => {
    installStubs({ accessRequest: pendingRequest() });

    const res = await request(app)
      .post('/api/v1/reject')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.accessRequestUpdates.length, 0);
  });

  test('R8: non-UUID requestId -> 400 VALIDATION_ERROR', async () => {
    installStubs({ accessRequest: pendingRequest() });

    const res = await request(app)
      .post('/api/v1/reject')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ requestId: 'not-a-uuid' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
  });

});
