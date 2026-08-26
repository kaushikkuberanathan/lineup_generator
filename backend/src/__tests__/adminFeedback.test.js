/**
 * adminFeedback.test.js
 * Route-level coverage for GET /api/v1/feedback — the admin-only feedback
 * listing route (admin.js, mounted bare at /api/v1, gated by the router-level
 * requireAuth+requireAdmin). Previously had ZERO test coverage of any kind —
 * unlike every other admin.js route, not even a 401-rejection case existed in
 * admin.auth.test.js. Found during the #406/#410 test-health survey (Pass 2)
 * and also missing from backend/CLAUDE.md's route enumeration entirely.
 *
 * Mocking pattern copied from reject.test.js (requireAuth/requireAdmin stubs).
 * The route's query builder is awaited directly (`await q`), so the mock
 * chain's terminal object must itself be thenable regardless of whether
 * `.eq()` was called — `.select()`/`.order()`/`.eq()` all return the same
 * thenable chain here rather than a plain object.
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

const ADMIN_USER_ID = '55555555-5555-4555-8555-555555555555';
const TOKEN = 'fake-bearer-token';

let calls;

function feedbackRows() {
  return [
    {
      id: 'fb-1', coach_id: 'coach-1', phone_e164: null, type: 'feedback',
      category: 'general', location: 'roster', body: 'Love the app',
      change_types: null, severity: null, app_version: '2.14.0',
      submitted_at: '2026-08-20T00:00:00Z',
      profiles: { first_name: 'Stan', last_name: 'Hoover' },
    },
    {
      id: 'fb-2', coach_id: 'coach-2', phone_e164: null, type: 'bug',
      category: 'scoring', location: 'game-mode', body: 'Count reset weirdly',
      change_types: null, severity: 'medium', app_version: '2.14.0',
      submitted_at: '2026-08-19T00:00:00Z',
      profiles: { first_name: 'Pat', last_name: 'Lee' },
    },
  ];
}

function installStubs({ rows = feedbackRows(), dbError = null } = {}) {
  calls = { typeFilters: [] };

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
          data: { id: 'membership-admin', user_id: ADMIN_USER_ID, role: 'admin', status: 'active' },
          error: null,
        }),
      };
      return chain;
    }

    if (table === 'feedback') {
      const result = dbError
        ? { data: null, error: dbError, count: null }
        : { data: rows, error: null, count: rows.length };

      const chain = {
        select: () => chain,
        order: () => chain,
        eq: (col, val) => {
          if (col === 'type') calls.typeFilters.push(val);
          return chain;
        },
        then: (resolve) => resolve(result),
      };
      return chain;
    }

    const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: null, error: null }) };
    return chain;
  };
}

afterEach(() => {
  supabaseAdmin.from = originalAdminFrom;
  supabaseAdmin.auth.getUser = originalGetUser;
  calls = undefined;
});

describe('GET /api/v1/feedback — authorized-admin path', () => {

  test('F1: authorized admin -> 200, feedback array + total count returned', async () => {
    installStubs();

    const res = await request(app)
      .get('/api/v1/feedback')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.feedback.length, 2);
    assert.equal(res.body.total, 2);
    assert.equal(res.body.feedback[0].id, 'fb-1');
  });

  test('F2: ?type=feedback -> filter applied to the query', async () => {
    installStubs();

    const res = await request(app)
      .get('/api/v1/feedback?type=feedback')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 200);
    assert.deepEqual(calls.typeFilters, ['feedback']);
  });

  test('F3: ?type=bug -> filter applied to the query', async () => {
    installStubs();

    const res = await request(app)
      .get('/api/v1/feedback?type=bug')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 200);
    assert.deepEqual(calls.typeFilters, ['bug']);
  });

  test('F4: no ?type -> no filter applied, both rows returned', async () => {
    installStubs();

    const res = await request(app)
      .get('/api/v1/feedback')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.deepEqual(calls.typeFilters, []);
    assert.equal(res.body.feedback.length, 2);
  });

  test('F5: ?type=not-a-real-type -> 400 VALIDATION_ERROR', async () => {
    installStubs();

    const res = await request(app)
      .get('/api/v1/feedback?type=not-a-real-type')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
  });

  test('F6: DB error -> 500 DB_ERROR', async () => {
    installStubs({ dbError: { message: 'connection reset' } });

    const res = await request(app)
      .get('/api/v1/feedback')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'DB_ERROR');
  });

});
