/**
 * adminAddCoach.test.js
 * Route-level coverage for POST /admin/coaches — third endpoint from the
 * admin.html bypass remediation plan (#787, remaining scope after
 * #338/PR #780). admin.html's Coaches tab previously issued
 * `sb.from('team_memberships').insert({ email, role, team_id, status:
 * 'active', activated_at })` directly via the Supabase client SDK; this
 * route puts it behind requireAuth/requireAdmin, validates `role` against
 * CANONICAL_ROLES server-side, and mirrors POST /admin/approve's insert
 * shape (status: 'invited', not 'active' — a deliberate behavior change
 * documented in the route's own header comment and the PR body).
 *
 * Mocking pattern copied from approve.role.test.js / reject.test.js (same
 * requireAuth/requireAdmin stubs, same shared-`supabaseAdmin.from`
 * monkey-patch approach, same `auth.admin.listUsers()` stub for the
 * email->user lookup).
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
const originalListUsers = supabaseAdmin.auth.admin.listUsers;

const TEAM_ID = '1774297491626';
const ADMIN_USER_ID = '88888888-8888-4888-8888-888888888888';
const COACH_USER_ID = '99999999-9999-4999-8999-999999999999';
const TOKEN = 'fake-bearer-token';

/** Per-test recorder, reset by installStubs. */
let calls;

function installStubs({ existingMembership = null, existingError = null, insertError = null, matchingAuthUser = true } = {}) {
  calls = {
    membershipInserts: [],
  };

  supabaseAdmin.auth.getUser = async () => ({
    data: { user: { id: ADMIN_USER_ID, email: 'admin@example.com' } },
    error: null,
  });

  supabaseAdmin.auth.admin.listUsers = async () => ({
    data: {
      users: matchingAuthUser
        ? [{ id: COACH_USER_ID, email: 'stan@example.com' }]
        : [],
    },
    error: null,
  });

  supabaseAdmin.from = (table) => {
    if (table === 'team_memberships') {
      // Both requireAdmin's own admin-role lookup and this route's
      // duplicate-membership pre-check hit this same table/shape
      // (select().eq()...maybeSingle()) - distinguish by which column the
      // chain was filtered on: requireAdmin always filters by 'user_id'.
      let filteredCols = [];
      const chain = {
        select: () => chain,
        eq: (col) => { filteredCols.push(col); return chain; },
        maybeSingle: async () => {
          if (filteredCols.includes('user_id')) {
            return {
              data: {
                id: 'membership-admin',
                user_id: ADMIN_USER_ID,
                role: 'admin',
                status: 'active',
                team_id: TEAM_ID,
              },
              error: null,
            };
          }
          return { data: existingMembership, error: existingError };
        },
        insert: (payload) => {
          calls.membershipInserts.push(payload);
          return Promise.resolve({ error: insertError });
        },
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
}

afterEach(() => {
  supabaseAdmin.from = originalAdminFrom;
  supabaseAdmin.auth.getUser = originalGetUser;
  supabaseAdmin.auth.admin.listUsers = originalListUsers;
  calls = undefined;
});

describe('POST /admin/coaches — authorized-admin coverage (#790)', () => {

  test('A1: new coach, matching auth user -> 200, invited with user_id linked', async () => {
    installStubs({ matchingAuthUser: true });

    const res = await request(app)
      .post('/api/v1/coaches')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ teamId: TEAM_ID, email: 'stan@example.com', role: 'coach' });

    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'Coach added.');
    assert.equal(calls.membershipInserts.length, 1);
    assert.deepEqual(calls.membershipInserts[0], {
      email: 'stan@example.com',
      phone_e164: null,
      team_id: TEAM_ID,
      role: 'coach',
      status: 'invited',
      user_id: COACH_USER_ID,
    });
  });

  test('A2: new coach, no matching auth user yet -> user_id null, still 200', async () => {
    installStubs({ matchingAuthUser: false });

    const res = await request(app)
      .post('/api/v1/coaches')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ teamId: TEAM_ID, email: 'brandnew@example.com', role: 'scorekeeper' });

    assert.equal(res.status, 200);
    assert.equal(calls.membershipInserts[0].user_id, null);
  });

  test('A3: already a member of this team -> 409 ALREADY_MEMBER, no insert attempted', async () => {
    installStubs({ existingMembership: { id: 'membership-existing' } });

    const res = await request(app)
      .post('/api/v1/coaches')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ teamId: TEAM_ID, email: 'stan@example.com', role: 'coach' });

    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'ALREADY_MEMBER');
    assert.equal(calls.membershipInserts.length, 0);
  });

  test('A4: missing teamId -> 400 VALIDATION_ERROR', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/coaches')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ email: 'stan@example.com', role: 'coach' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.membershipInserts.length, 0);
  });

  test('A5: invalid email -> 400 VALIDATION_ERROR', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/coaches')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ teamId: TEAM_ID, email: 'not-an-email', role: 'coach' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
  });

  test('A6: role not in CANONICAL_ROLES -> 400 VALIDATION_ERROR', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/coaches')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ teamId: TEAM_ID, email: 'stan@example.com', role: 'superadmin' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.membershipInserts.length, 0);
  });

  test('A7: DB error checking existing membership -> 500 DB_ERROR, no insert attempted', async () => {
    installStubs({ existingError: { message: 'connection reset' } });

    const res = await request(app)
      .post('/api/v1/coaches')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ teamId: TEAM_ID, email: 'stan@example.com', role: 'coach' });

    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'DB_ERROR');
    assert.equal(calls.membershipInserts.length, 0);
  });

  test('A8: DB error on insert -> 500 DB_ERROR', async () => {
    installStubs({ insertError: { message: 'connection reset' } });

    const res = await request(app)
      .post('/api/v1/coaches')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ teamId: TEAM_ID, email: 'stan@example.com', role: 'coach' });

    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'DB_ERROR');
  });

});
