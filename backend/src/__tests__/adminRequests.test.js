/**
 * adminRequests.test.js
 * Route-level coverage for GET /api/v1/requests — previously only exercised
 * by admin.auth.test.js's blanket 401-rejection check. Found during the
 * #406/#410 test-health survey (#474, tranche B).
 *
 * Mocking pattern copied from reject.test.js / adminFeedback.test.js.
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

const ADMIN_USER_ID = '77777777-7777-4777-8777-777777777777';
const TOKEN = 'fake-bearer-token';

let calls;

function requestRows() {
  return [
    { id: 'req-1', first_name: 'Stan', last_name: 'Hoover', status: 'pending', requested_at: '2026-08-20T00:00:00Z' },
    { id: 'req-2', first_name: 'Pat', last_name: 'Lee', status: 'pending', requested_at: '2026-08-19T00:00:00Z' },
  ];
}

function installStubs({ rows = requestRows(), dbError = null } = {}) {
  calls = { statusFilters: [] };

  supabaseAdmin.auth.getUser = async () => ({
    data: { user: { id: ADMIN_USER_ID, email: 'admin@example.com' } },
    error: null,
  });

  supabaseAdmin.from = (table) => {
    if (table === 'team_memberships') {
      const adminChain = {
        select: () => adminChain,
        eq: () => adminChain,
        maybeSingle: async () => ({
          data: { id: 'membership-admin', user_id: ADMIN_USER_ID, role: 'admin', status: 'active' },
          error: null,
        }),
      };
      return adminChain;
    }

    if (table === 'access_requests') {
      const result = dbError
        ? { data: null, error: dbError, count: null }
        : { data: rows, error: null, count: rows.length };

      const chain = {
        select: () => chain,
        eq: (col, val) => { if (col === 'status') calls.statusFilters.push(val); return chain; },
        order: () => chain,
        then: (resolve) => resolve(result),
      };
      return chain;
    }

    return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
  };
}

afterEach(() => {
  supabaseAdmin.from = originalAdminFrom;
  supabaseAdmin.auth.getUser = originalGetUser;
  calls = undefined;
});

describe('GET /api/v1/requests — authorized-admin path', () => {

  test('R1: no ?status -> defaults to pending, 200 with requests + total', async () => {
    installStubs();

    const res = await request(app)
      .get('/api/v1/requests')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 200);
    assert.deepEqual(calls.statusFilters, ['pending']);
    assert.equal(res.body.requests.length, 2);
    assert.equal(res.body.total, 2);
  });

  test('R2: ?status=approved -> filter applied instead of the default', async () => {
    installStubs();

    await request(app)
      .get('/api/v1/requests?status=approved')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.deepEqual(calls.statusFilters, ['approved']);
  });

  test('R3: DB error -> 500 DB_ERROR', async () => {
    installStubs({ dbError: { message: 'connection reset' } });

    const res = await request(app)
      .get('/api/v1/requests')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'DB_ERROR');
  });

});
