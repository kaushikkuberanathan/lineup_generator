/**
 * auth.session.test.js
 * Route coverage for GET /me, PATCH /me, POST /logout (Story 99 closure).
 *
 * These three routes had zero backend-unit coverage before this file — the
 * only prior auth.js coverage (auth.happy.test.js) exercises
 * /request-access and /magic-link, and admin.auth.test.js's rejection-only
 * pattern is scoped to admin.js's own routes, not these.
 *
 * Follows the requireAuth stubbing pattern established in
 * approve.role.test.js (the first spec to get past requireAuth): stub
 * supabaseAdmin.auth.getUser() to hand back req.user, then stub
 * supabaseAdmin.from() per-table for whatever each route queries.
 *
 * Hermetic / CI-safe — no DB, no network. global.fetch is not touched here;
 * none of these three routes send email.
 */
const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const request = require('supertest');
const { supabaseAdmin } = require('../lib/supabase');
const app = require('../../app');

const originalAdminFrom = supabaseAdmin.from;
const originalGetUser = supabaseAdmin.auth.getUser;

const USER_ID = '33333333-3333-4333-8333-333333333333';
const USER_EMAIL = 'coach@example.com';
const TOKEN = 'fake-bearer-token';

let calls;

/**
 * @param {object} opts
 * @param {object|null} [opts.profile]       — profiles row returned by GET /me and PATCH /me's update().select()
 * @param {Array}       [opts.memberships]    — team_memberships rows returned by GET /me
 * @param {boolean}     [opts.rejectAuth]     — if true, getUser() returns an error (simulates an invalid/expired token)
 */
function installStubs({ profile = null, memberships = [], rejectAuth = false } = {}) {
  calls = { fromTables: [], profileUpdates: [], membershipUpdates: [] };

  supabaseAdmin.auth.getUser = async () => {
    if (rejectAuth) return { data: null, error: { message: 'invalid token' } };
    return { data: { user: { id: USER_ID, email: USER_EMAIL } }, error: null };
  };

  supabaseAdmin.from = (table) => {
    calls.fromTables.push(table);

    if (table === 'auth_events') {
      return { insert: async () => ({ error: null }) };
    }

    if (table === 'profiles') {
      const chain = {
        select: () => chain,
        eq: () => chain,
        update: (patch) => { calls.profileUpdates.push(patch); return chain; },
        maybeSingle: async () => ({ data: profile, error: null }),
      };
      return chain;
    }

    if (table === 'team_memberships') {
      const chain = {
        select: () => chain,
        or: () => chain,
        eq: () => chain,
        in: () => chain,
        is: () => chain,
        update: (patch) => { calls.membershipUpdates.push(patch); return Promise.resolve({ data: null, error: null }); },
        then: (resolve) => resolve({ data: memberships, error: null }), // GET /me awaits the chain directly (no maybeSingle)
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

describe('GET /api/v1/auth/me', () => {

  test('SESSION-1: valid session + profile + active membership → 200 with hydrated user', async () => {
    installStubs({
      profile: { id: USER_ID, first_name: 'Stan', last_name: 'Hoover', email: USER_EMAIL, phone_e164: null, created_at: '2026-01-01' },
      memberships: [{ id: 'm-1', user_id: USER_ID, team_id: '1774297491626', role: 'coach', status: 'active', activated_at: '2026-01-01' }],
    });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.id, USER_ID);
    assert.equal(res.body.user.profile.first_name, 'Stan');
    assert.equal(res.body.user.memberships.length, 1);
  });

  test('SESSION-2: valid session, no profile row yet → 200 with profile: null, not a crash', async () => {
    installStubs({ profile: null, memberships: [] });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.user.profile, null);
    assert.deepEqual(res.body.user.memberships, []);
  });

  // Added 2026-08-26 (#406/#410 Pass 2). GET /me selects `role` straight off
  // team_memberships with no normalization pass — by design, per the documented
  // role model (richer labels are a LABEL layer on top of these strings, not
  // something to translate away on read; see lib/normalizeRole.js). Root
  // CLAUDE.md documents ~596 prod rows still holding pre-normalization legacy
  // values (team_admin/coordinator/parent). This test locks in the current,
  // presumed-intentional behavior: the raw DB value reaches the client as-is.
  test('SESSION-9: a membership row still holding a legacy role value is returned verbatim, not normalized', async () => {
    installStubs({
      profile: { id: USER_ID, first_name: 'Pat', last_name: 'Lee', email: USER_EMAIL, phone_e164: null, created_at: '2026-01-01' },
      memberships: [{ id: 'm-2', user_id: USER_ID, team_id: '1774297491626', role: 'team_admin', status: 'active', activated_at: '2026-01-01' }],
    });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.user.memberships[0].role, 'team_admin');
  });

  test('SESSION-3: no Bearer token → 401 UNAUTHORIZED, never reaches the handler', async () => {
    installStubs({ rejectAuth: true });

    const res = await request(app).get('/api/v1/auth/me');

    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'UNAUTHORIZED');
    assert.equal(calls.fromTables.length, 0, 'requireAuth must reject before any DB call');
  });

});

describe('PATCH /api/v1/auth/me', () => {

  test('SESSION-4: valid session + valid name → 200 with updated profile', async () => {
    installStubs({ profile: { id: USER_ID, first_name: 'Stan', last_name: 'H', email: USER_EMAIL } });

    const res = await request(app)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ firstName: 'Stan', lastName: 'H' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.profile.first_name, 'Stan');
    assert.equal(calls.profileUpdates.length, 1);
    assert.equal(calls.profileUpdates[0].first_name, 'Stan');
  });

  test('SESSION-5: empty firstName → 400 VALIDATION_ERROR, no DB update attempted', async () => {
    installStubs({});

    const res = await request(app)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ firstName: '' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.profileUpdates.length, 0);
  });

  test('SESSION-6: updating a nonexistent profile row → 404 PROFILE_NOT_FOUND', async () => {
    installStubs({ profile: null }); // update().select().maybeSingle() → null row affected

    const res = await request(app)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ firstName: 'Stan' });

    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'PROFILE_NOT_FOUND');
  });

});

describe('POST /api/v1/auth/logout', () => {

  test('SESSION-7: valid session → 200 success, session_resumed-style logout event logged', async () => {
    installStubs({});

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ teamId: '1774297491626' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(calls.fromTables.includes('auth_events'));
  });

  test('SESSION-8: no Bearer token → 401 UNAUTHORIZED, never logs an event', async () => {
    installStubs({ rejectAuth: true });

    const res = await request(app).post('/api/v1/auth/logout').send({});

    assert.equal(res.status, 401);
    assert.equal(calls.fromTables.length, 0);
  });

});
