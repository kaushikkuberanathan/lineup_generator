/**
 * adminMembershipActions.test.js
 * Route-level coverage for POST /api/v1/update-role, POST /api/v1/reset-access,
 * and POST /api/v1/suspend — grouped in one file since all three are simple,
 * near-identical single-field mutations on the same team_memberships row.
 * Previously only exercised by admin.auth.test.js's blanket 401-rejection
 * check. Found during the #406/#410 test-health survey (#474, tranche B).
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

const ADMIN_USER_ID = '99999999-9999-4999-8999-999999999999';
const MEMBERSHIP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TOKEN = 'fake-bearer-token';

let calls;

function installStubs({ updateError = null } = {}) {
  calls = { updates: [], eqTargets: [] };

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
      return {
        select: adminChain.select,
        eq: adminChain.eq,
        maybeSingle: adminChain.maybeSingle,
        update: (payload) => {
          calls.updates.push(payload);
          return {
            eq: async (col, val) => {
              calls.eqTargets.push({ col, val });
              return { error: updateError };
            },
          };
        },
      };
    }
    return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
  };
}

afterEach(() => {
  supabaseAdmin.from = originalAdminFrom;
  supabaseAdmin.auth.getUser = originalGetUser;
  calls = undefined;
});

describe('POST /api/v1/update-role — authorized-admin path', () => {

  test('UR1: valid membershipId + role -> 200, correct update payload + target row', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/update-role')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ membershipId: MEMBERSHIP_ID, role: 'coach' });

    assert.equal(res.status, 200);
    assert.deepEqual(calls.updates[0], { role: 'coach' });
    assert.deepEqual(calls.eqTargets[0], { col: 'id', val: MEMBERSHIP_ID });
  });

  test('UR2: role not in CANONICAL_ROLES -> 400 VALIDATION_ERROR, no DB update', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/update-role')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ membershipId: MEMBERSHIP_ID, role: 'team_admin' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.updates.length, 0);
  });

  test('UR3: non-UUID membershipId -> 400 VALIDATION_ERROR', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/update-role')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ membershipId: 'not-a-uuid', role: 'coach' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
  });

  test('UR4: DB error -> 500 DB_ERROR', async () => {
    installStubs({ updateError: { message: 'connection reset' } });

    const res = await request(app)
      .post('/api/v1/update-role')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ membershipId: MEMBERSHIP_ID, role: 'coach' });

    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'DB_ERROR');
  });

});

describe('POST /api/v1/reset-access — authorized-admin path', () => {

  test('RA1: valid membershipId -> 200, resets status/user_id/activated_at', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/reset-access')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ membershipId: MEMBERSHIP_ID });

    assert.equal(res.status, 200);
    assert.deepEqual(calls.updates[0], { status: 'invited', user_id: null, activated_at: null });
    assert.deepEqual(calls.eqTargets[0], { col: 'id', val: MEMBERSHIP_ID });
  });

  test('RA2: non-UUID membershipId -> 400 VALIDATION_ERROR', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/reset-access')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ membershipId: 'not-a-uuid' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
  });

  test('RA3: DB error -> 500 DB_ERROR', async () => {
    installStubs({ updateError: { message: 'connection reset' } });

    const res = await request(app)
      .post('/api/v1/reset-access')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ membershipId: MEMBERSHIP_ID });

    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'DB_ERROR');
  });

});

describe('POST /api/v1/suspend — authorized-admin path', () => {

  test('SU1: valid membershipId -> 200, status set to suspended', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/suspend')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ membershipId: MEMBERSHIP_ID });

    assert.equal(res.status, 200);
    assert.deepEqual(calls.updates[0], { status: 'suspended' });
    assert.deepEqual(calls.eqTargets[0], { col: 'id', val: MEMBERSHIP_ID });
  });

  test('SU2: non-UUID membershipId -> 400 VALIDATION_ERROR', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/suspend')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ membershipId: 'not-a-uuid' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
  });

  test('SU3: DB error -> 500 DB_ERROR', async () => {
    installStubs({ updateError: { message: 'connection reset' } });

    const res = await request(app)
      .post('/api/v1/suspend')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ membershipId: MEMBERSHIP_ID });

    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'DB_ERROR');
  });

});
