/**
 * approveLink.role.test.js
 * Route-level coverage for role normalization in GET /admin/approve-link (WS-1, #336).
 *
 * Why this exists: normalizeRole.test.js proves the FUNCTION is correct. It does not
 * prove the WIRING is correct - that the handler calls it, catches its throws, returns
 * 400 HTML instead of crashing, and that a legacy 'team_admin' request actually reaches
 * team_memberships as 'admin'. Those are different failure modes.
 *
 * Mock pattern follows auth.happy.test.js (monkey-patch the supabaseAdmin singleton,
 * restore in afterEach) and adds insert-payload capture, which auth.happy.test.js
 * does not do. Terminal call shapes match this route:
 *   from('access_requests').select().eq().maybeSingle()
 *   from('team_memberships').insert(payload)          <- terminal, returns { error }
 *   from('access_requests').update(payload).eq()      <- terminal
 *   from('teams').select().eq().single()
 *
 * CI-safe: no network. global.fetch is stubbed so sendApprovalEmail never leaves
 * the process.
 */

const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const request = require('supertest');
const { supabaseAdmin } = require('../lib/supabase');
const app = require('../../app');

const originalAdminFrom = supabaseAdmin.from;
const REAL_FETCH = global.fetch;

const TEAM_ID = '1774297491626';
const REQUEST_ID = 'req-ws1-test';

/** Per-test recorder, reset by installStubs. */
let calls;

function installStubs({ accessRequest, membershipInsertResult = { error: null } } = {}) {
  calls = {
    fromTables: [],
    membershipInserts: [],
    accessRequestUpdates: [],
    emailFetchCount: 0,
  };

  supabaseAdmin.from = (table) => {
    calls.fromTables.push(table);

    if (table === 'auth_events') {
      return { insert: async () => ({ error: null }) };
    }

    if (table === 'team_memberships') {
      return {
        insert: async (payload) => {
          calls.membershipInserts.push(payload);
          return membershipInsertResult;
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

/** A pending access request with the given requested_role. */
function pendingRequest(requestedRole) {
  return {
    id: REQUEST_ID,
    first_name: 'Stan',
    last_name: 'Hoover',
    email: 'stan@example.com',
    phone_e164: null,
    status: 'pending',
    requested_role: requestedRole,
  };
}

afterEach(() => {
  supabaseAdmin.from = originalAdminFrom;
  global.fetch = REAL_FETCH;
  calls = undefined;
});

describe('GET /admin/approve-link - role normalization (WS-1 #336)', () => {

  test('WS1-1: requested_role team_admin -> inserts canonical admin', async () => {
    installStubs({ accessRequest: pendingRequest('team_admin') });

    const res = await request(app)
      .get('/api/v1/admin/approve-link')
      .query({ requestId: REQUEST_ID, teamId: TEAM_ID });

    assert.equal(res.status, 200);
    assert.equal(calls.membershipInserts.length, 1);
    assert.equal(calls.membershipInserts[0].role, 'admin');
    assert.ok(res.text.includes('admin'));
    assert.ok(!res.text.includes('team_admin'));
  });

  test('WS1-2: requested_role coordinator -> inserts canonical coach', async () => {
    installStubs({ accessRequest: pendingRequest('coordinator') });

    const res = await request(app)
      .get('/api/v1/admin/approve-link')
      .query({ requestId: REQUEST_ID, teamId: TEAM_ID });

    assert.equal(res.status, 200);
    assert.equal(calls.membershipInserts[0].role, 'coach');
  });

  test('WS1-3: requested_role parent -> inserts canonical viewer', async () => {
    installStubs({ accessRequest: pendingRequest('parent') });

    const res = await request(app)
      .get('/api/v1/admin/approve-link')
      .query({ requestId: REQUEST_ID, teamId: TEAM_ID });

    assert.equal(res.status, 200);
    assert.equal(calls.membershipInserts[0].role, 'viewer');
  });

  test('WS1-4: requested_role platform_admin -> 400, NO insert attempted', async () => {
    installStubs({ accessRequest: pendingRequest('platform_admin') });

    const res = await request(app)
      .get('/api/v1/admin/approve-link')
      .query({ requestId: REQUEST_ID, teamId: TEAM_ID });

    assert.equal(res.status, 400);
    assert.equal(calls.membershipInserts.length, 0);
    assert.equal(calls.accessRequestUpdates.length, 0);
    assert.equal(calls.emailFetchCount, 0);
  });

  test('WS1-5: unrecognized requested_role -> 400, NO insert attempted', async () => {
    installStubs({ accessRequest: pendingRequest('wizard') });

    const res = await request(app)
      .get('/api/v1/admin/approve-link')
      .query({ requestId: REQUEST_ID, teamId: TEAM_ID });

    assert.equal(res.status, 400);
    assert.equal(calls.membershipInserts.length, 0);
    assert.equal(calls.emailFetchCount, 0);
  });

  test('WS1-6: null requested_role -> 400, does NOT silently default to coach', async () => {
    installStubs({ accessRequest: pendingRequest(null) });

    const res = await request(app)
      .get('/api/v1/admin/approve-link')
      .query({ requestId: REQUEST_ID, teamId: TEAM_ID });

    assert.equal(res.status, 400);
    assert.equal(calls.membershipInserts.length, 0);
  });

  test('WS1-7: already-canonical coach passes through unchanged', async () => {
    installStubs({ accessRequest: pendingRequest('coach') });

    const res = await request(app)
      .get('/api/v1/admin/approve-link')
      .query({ requestId: REQUEST_ID, teamId: TEAM_ID });

    assert.equal(res.status, 200);
    assert.equal(calls.membershipInserts[0].role, 'coach');
  });

});
