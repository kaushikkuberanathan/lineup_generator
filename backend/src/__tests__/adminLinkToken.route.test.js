/**
 * adminLinkToken.route.test.js
 * Route-level coverage for #337's token security on the public 1-tap links:
 *   GET /api/v1/admin/approve-link
 *   GET /api/v1/admin/deny-link
 *
 * approveLinkToken.test.js proves the sign/verify FUNCTIONS are correct in
 * isolation. This file proves the ROUTES are wired to them correctly - that
 * a tampered token 401s, an expired one 410s, action-binding is enforced
 * cross-route, and reviewed_by gets attributed to the resolved admin user
 * rather than left null. approveLink.role.test.js covers the pre-existing
 * WS-1 role-normalization behavior and is unaffected by this file.
 *
 * Mock pattern matches approveLink.role.test.js / approve.role.test.js:
 * monkey-patch the shared supabaseAdmin singleton, restore in afterEach.
 * CI-safe: no network, global.fetch stubbed.
 */

const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const request = require('supertest');
const { supabaseAdmin } = require('../lib/supabase');
const app = require('../../app');
const { sign: signApproveLinkToken } = require('../lib/approveLinkToken');

const originalAdminFrom = supabaseAdmin.from;
const originalListUsers = supabaseAdmin.auth.admin.listUsers;
const REAL_FETCH = global.fetch;

const TEAM_ID = '1774297491626';
const REQUEST_ID = 'req-337-test';
const ADMIN_AUTH_USER_ID = 'admin-auth-user-id';

let calls;

function installStubs({ accessRequest, adminAuthEmail = 'kaushik.kuberanathan@gmail.com' } = {}) {
  calls = {
    membershipInserts: [],
    accessRequestUpdates: [],
    emailFetchCount: 0,
    listUsersCalled: false,
  };

  supabaseAdmin.auth.admin.listUsers = async () => {
    calls.listUsersCalled = true;
    return {
      data: { users: [{ id: ADMIN_AUTH_USER_ID, email: adminAuthEmail }] },
      error: null,
    };
  };

  supabaseAdmin.from = (table) => {
    if (table === 'auth_events') {
      return { insert: async () => ({ error: null }) };
    }

    if (table === 'team_memberships') {
      return {
        insert: async (payload) => {
          calls.membershipInserts.push(payload);
          return { error: null };
        },
      };
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

function pendingRequest(overrides = {}) {
  return {
    id: REQUEST_ID,
    team_id: TEAM_ID,
    first_name: 'Stan',
    last_name: 'Hoover',
    email: 'stan@example.com',
    phone_e164: null,
    status: 'pending',
    requested_role: 'coach',
    ...overrides,
  };
}

/** Builds a validly-signed-but-expired token by re-signing with a past exp. */
function expiredToken(requestId, teamId, action) {
  const crypto = require('crypto');
  const payload = {
    requestId, teamId: teamId ?? null, action,
    iat: Date.now() - 1000, exp: Date.now() - 1,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', process.env.APPROVE_LINK_HMAC_SECRET)
    .update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

afterEach(() => {
  supabaseAdmin.from = originalAdminFrom;
  supabaseAdmin.auth.admin.listUsers = originalListUsers;
  global.fetch = REAL_FETCH;
  calls = undefined;
});

describe('GET /admin/approve-link - token security (#337)', () => {

  test('LT-1: valid unexpired token approves and sets reviewed_by to the resolved admin', async () => {
    installStubs({ accessRequest: pendingRequest() });
    const token = signApproveLinkToken({ requestId: REQUEST_ID, teamId: TEAM_ID, action: 'approve' });

    const res = await request(app).get('/api/v1/admin/approve-link').query({ token });

    assert.equal(res.status, 200);
    assert.equal(calls.membershipInserts.length, 1);
    assert.equal(calls.accessRequestUpdates.length, 1);
    assert.equal(calls.accessRequestUpdates[0].status, 'approved');
    assert.equal(calls.accessRequestUpdates[0].reviewed_by, ADMIN_AUTH_USER_ID);
  });

  test('LT-2: a token signed with the wrong secret (tampered) returns 401, no writes', async () => {
    installStubs({ accessRequest: pendingRequest() });
    const [payloadB64] = signApproveLinkToken({ requestId: REQUEST_ID, teamId: TEAM_ID, action: 'approve' }).split('.');
    const forgedToken = `${payloadB64}.forged-signature`;

    const res = await request(app).get('/api/v1/admin/approve-link').query({ token: forgedToken });

    assert.equal(res.status, 401);
    assert.equal(calls.membershipInserts.length, 0);
    assert.equal(calls.accessRequestUpdates.length, 0);
    assert.equal(calls.emailFetchCount, 0);
  });

  test('LT-3: an expired token returns 410 with a "request a new link" message, no writes', async () => {
    installStubs({ accessRequest: pendingRequest() });
    const token = expiredToken(REQUEST_ID, TEAM_ID, 'approve');

    const res = await request(app).get('/api/v1/admin/approve-link').query({ token });

    assert.equal(res.status, 410);
    assert.match(res.text, /expired/i);
    assert.match(res.text, /new/i);
    assert.equal(calls.membershipInserts.length, 0);
  });

  test('LT-4: a deny token replayed against approve-link is rejected (action binding), 401', async () => {
    installStubs({ accessRequest: pendingRequest() });
    const denyToken = signApproveLinkToken({ requestId: REQUEST_ID, action: 'deny' });

    const res = await request(app).get('/api/v1/admin/approve-link').query({ token: denyToken });

    assert.equal(res.status, 401);
    assert.equal(calls.membershipInserts.length, 0);
  });

  test('LT-5: missing token is 400, not 401 (unchanged contract for absent params)', async () => {
    const res = await request(app).get('/api/v1/admin/approve-link');
    assert.equal(res.status, 400);
  });

  test('LT-6: a valid token whose ADMIN_EMAIL has no matching auth user still approves, reviewed_by null', async () => {
    installStubs({ accessRequest: pendingRequest(), adminAuthEmail: 'someone-else@example.com' });
    const token = signApproveLinkToken({ requestId: REQUEST_ID, teamId: TEAM_ID, action: 'approve' });

    const res = await request(app).get('/api/v1/admin/approve-link').query({ token });

    assert.equal(res.status, 200);
    assert.equal(calls.accessRequestUpdates[0].reviewed_by, null);
  });

});

describe('GET /admin/deny-link - token security (#337)', () => {

  test('LT-7: valid unexpired deny token denies and sets reviewed_by', async () => {
    installStubs({ accessRequest: pendingRequest() });
    const token = signApproveLinkToken({ requestId: REQUEST_ID, action: 'deny' });

    const res = await request(app).get('/api/v1/admin/deny-link').query({ token });

    assert.equal(res.status, 200);
    assert.equal(calls.accessRequestUpdates.length, 1);
    assert.equal(calls.accessRequestUpdates[0].status, 'denied');
    assert.equal(calls.accessRequestUpdates[0].reviewed_by, ADMIN_AUTH_USER_ID);
  });

  test('LT-8: a tampered deny token returns 401, no writes', async () => {
    installStubs({ accessRequest: pendingRequest() });
    const [payloadB64] = signApproveLinkToken({ requestId: REQUEST_ID, action: 'deny' }).split('.');
    const forgedToken = `${payloadB64}.forged-signature`;

    const res = await request(app).get('/api/v1/admin/deny-link').query({ token: forgedToken });

    assert.equal(res.status, 401);
    assert.equal(calls.accessRequestUpdates.length, 0);
  });

  test('LT-9: an expired deny token returns 410, no writes', async () => {
    installStubs({ accessRequest: pendingRequest() });
    const token = expiredToken(REQUEST_ID, null, 'deny');

    const res = await request(app).get('/api/v1/admin/deny-link').query({ token });

    assert.equal(res.status, 410);
    assert.equal(calls.accessRequestUpdates.length, 0);
  });

  test('LT-10: an approve token replayed against deny-link is rejected (action binding), 401', async () => {
    installStubs({ accessRequest: pendingRequest() });
    const approveToken = signApproveLinkToken({ requestId: REQUEST_ID, teamId: TEAM_ID, action: 'approve' });

    const res = await request(app).get('/api/v1/admin/deny-link').query({ token: approveToken });

    assert.equal(res.status, 401);
    assert.equal(calls.accessRequestUpdates.length, 0);
  });

  test('LT-11: missing token is 400, not 401 (unchanged contract for absent params)', async () => {
    const res = await request(app).get('/api/v1/admin/deny-link');
    assert.equal(res.status, 400);
  });

});
