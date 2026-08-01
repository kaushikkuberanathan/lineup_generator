/**
 * feedback.test.js
 * Route coverage for POST /api/v1/feedback (Story 99 closure).
 *
 * Zero backend-unit coverage existed for this route before this file — it
 * is the only route in backend/src/routes/feedback.js, and no test file
 * referenced it.
 *
 * Writing this coverage surfaced a real production bug (fixed in the same
 * commit, app.js mount order): admin.js and feedback.js both mount at the
 * /api/v1 base, and admin.js has an unconditional, path-agnostic
 * router.use(requireAuth, requireAdmin) gate. With adminRouter mounted
 * before feedbackRouter, every POST /api/v1/feedback request hit that gate
 * first and requireAdmin 403'd any non-admin coach — the feedback feature
 * was only reachable by the one admin account. Fixed by mounting
 * feedbackRouter first. FB-7 is the regression guard for this exact bug:
 * a non-admin coach must reach 201, not 403.
 *
 * requireAuth stubbing follows the same pattern as auth.session.test.js /
 * approve.role.test.js: stub supabaseAdmin.auth.getUser() for req.user,
 * then stub supabaseAdmin.from() per table. team_memberships is stubbed
 * defensively (not expected to be queried post-fix, but if admin.js's gate
 * ever intercepts this route again, the stub makes that failure surface as
 * a clear 403 in FB-7 rather than an unrelated crash).
 *
 * Hermetic / CI-safe — no DB, no network.
 */
const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const request = require('supertest');
const { supabaseAdmin } = require('../lib/supabase');
const app = require('../../app');

const originalAdminFrom = supabaseAdmin.from;
const originalGetUser = supabaseAdmin.auth.getUser;

const COACH_ID = '44444444-4444-4444-8444-444444444444';
const TOKEN = 'fake-bearer-token';

let calls;

function installStubs({ rejectAuth = false, insertError = null, isAdmin = false } = {}) {
  calls = { fromTables: [], feedbackInserts: [] };

  supabaseAdmin.auth.getUser = async () => {
    if (rejectAuth) return { data: null, error: { message: 'invalid token' } };
    return { data: { user: { id: COACH_ID, email: 'coach@example.com' } }, error: null };
  };

  supabaseAdmin.from = (table) => {
    calls.fromTables.push(table);

    if (table === 'profiles') {
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { phone_e164: null }, error: null }) }) }),
      };
    }

    if (table === 'feedback') {
      return {
        insert: async (payload) => {
          calls.feedbackInserts.push(payload);
          return { error: insertError };
        },
      };
    }

    // Defensive stub for admin.js's requireAdmin gate — see file header.
    // Every request in this file is a non-admin coach unless isAdmin is set.
    if (table === 'team_memberships') {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => (isAdmin
          ? { data: { id: 'm-admin', role: 'admin', status: 'active' }, error: null }
          : { data: null, error: null }),
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

describe('POST /api/v1/feedback', () => {

  test('FB-1: valid feedback submission → 201, insert reaches the feedback table with the caller\'s coach_id', async () => {
    installStubs({});

    const res = await request(app)
      .post('/api/v1/feedback')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ type: 'feedback', body: 'Love the new lineup screen.' });

    assert.equal(res.status, 201);
    assert.equal(calls.feedbackInserts.length, 1);
    assert.equal(calls.feedbackInserts[0].coach_id, COACH_ID);
    assert.equal(calls.feedbackInserts[0].type, 'feedback');
  });

  test('FB-2: valid bug report with optional fields → 201, optional fields reach the insert', async () => {
    installStubs({});

    const res = await request(app)
      .post('/api/v1/feedback')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({
        type: 'bug', body: 'Batting order drag is glitchy on iPad.',
        category: 'ui', severity: 'medium', appVersion: '2.8.2',
      });

    assert.equal(res.status, 201);
    assert.equal(calls.feedbackInserts[0].category, 'ui');
    assert.equal(calls.feedbackInserts[0].severity, 'medium');
    assert.equal(calls.feedbackInserts[0].app_version, '2.8.2');
  });

  test('FB-3: invalid type → 400 VALIDATION_ERROR, no insert attempted', async () => {
    installStubs({});

    const res = await request(app)
      .post('/api/v1/feedback')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ type: 'not-a-real-type', body: 'x' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.feedbackInserts.length, 0);
  });

  test('FB-4: empty body → 400 VALIDATION_ERROR', async () => {
    installStubs({});

    const res = await request(app)
      .post('/api/v1/feedback')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ type: 'feedback', body: '' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
  });

  test('FB-5: DB insert error → 500 DB_ERROR', async () => {
    installStubs({ insertError: { message: 'db down' } });

    const res = await request(app)
      .post('/api/v1/feedback')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ type: 'feedback', body: 'x' });

    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'DB_ERROR');
  });

  test('FB-6: no Bearer token → 401 UNAUTHORIZED, never reaches the handler', async () => {
    installStubs({ rejectAuth: true });

    const res = await request(app)
      .post('/api/v1/feedback')
      .send({ type: 'feedback', body: 'x' });

    assert.equal(res.status, 401);
    assert.equal(calls.fromTables.length, 0);
  });

  // FB-7: regression guard for the mount-order bug this file's own authoring
  // discovered and app.js fixed. Before the fix, this exact scenario (a
  // real, non-admin coach — every coach except the one admin account —
  // submitting feedback) returned 403 FORBIDDEN from admin.js's requireAdmin
  // gate and never reached this route at all. Must be 201.
  test('FB-7: non-admin coach → 201, NOT 403 (regression guard for the admin.js mount-order bug)', async () => {
    installStubs({ isAdmin: false });

    const res = await request(app)
      .post('/api/v1/feedback')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ type: 'bug', body: 'Regression guard for #feedback-403.' });

    assert.equal(res.status, 201, `non-admin coach must be able to submit feedback — got ${res.status} ${JSON.stringify(res.body)}`);
    assert.equal(calls.feedbackInserts.length, 1);
    assert.ok(!calls.fromTables.includes('team_memberships'), 'admin.js\'s requireAdmin gate must not run for this route at all post-fix');
  });

});
