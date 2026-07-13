/**
 * approve.role.test.js
 * Route-level coverage for role validation in POST /admin/approve (WS-1, #336).
 *
 * Why this exists: HUNK 2 of WS-1 step 3 changed this route's validator from
 * isIn(['coach','scorekeeper','viewer']) to isIn(CANONICAL_ROLES), which ADDS
 * 'admin'. Before the fix, an admin using the panel could not approve a Head
 * Coach - the request 400'd at validationGuard. Nothing tested that.
 *
 * NOTE ON THE PATTERN: this is the FIRST backend test to get past
 * requireAuth + requireAdmin. Every prior admin test asserts a rejection path
 * (401 before the guard). To reach the handler we must stub:
 *   - supabaseAdmin.auth.getUser(token)      -> requireAuth sets req.user
 *   - from('team_memberships').maybeSingle() -> requireAdmin finds an admin row
 *   - supabaseAdmin.auth.admin.listUsers()   -> the handler's user lookup
 *
 * team_memberships is queried by requireAdmin (select/eq/maybeSingle) AND
 * inserted into by the handler, so its stub branch must serve both chains.
 *
 * CI-safe: no network. global.fetch stubbed so sendApprovalEmail never leaves
 * the process.
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
const REAL_FETCH = global.fetch;

const TEAM_ID = '1774297491626';
// isUUID() validators - these must be real UUID shapes or we 400 before role check.
const REQUEST_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_USER_ID = '22222222-2222-4222-8222-222222222222';
const TOKEN = 'fake-bearer-token';

/** Per-test recorder, reset by installStubs. */
let calls;

function installStubs({ accessRequest } = {}) {
  calls = {
    fromTables: [],
    membershipInserts: [],
    accessRequestUpdates: [],
    emailFetchCount: 0,
  };

  // requireAuth: validate the Bearer token -> req.user
  supabaseAdmin.auth.getUser = async () => ({
    data: { user: { id: ADMIN_USER_ID, email: 'admin@example.com' } },
    error: null,
  });

  // POST /approve line ~264: look up the auth user by email
  supabaseAdmin.auth.admin.listUsers = async () => ({
    data: { users: [] }, // no existing auth user -> userId null, links on first login
    error: null,
  });

  supabaseAdmin.from = (table) => {
    calls.fromTables.push(table);

    if (table === 'auth_events') {
      return { insert: async () => ({ error: null }) };
    }

    // team_memberships serves TWO callers:
    //   requireAdmin -> .select().eq().eq().eq().maybeSingle()  (must find an admin row)
    //   the handler  -> .insert(payload)                        (terminal, returns { error })
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
        insert: async (payload) => {
          calls.membershipInserts.push(payload);
          return { error: null };
        },
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

/** A pending access request. */
function pendingRequest() {
  return {
    id: REQUEST_ID,
    first_name: 'Stan',
    last_name: 'Hoover',
    email: 'stan@example.com',
    phone_e164: null,
    status: 'pending',
    requested_role: 'team_admin',
  };
}

afterEach(() => {
  supabaseAdmin.from = originalAdminFrom;
  supabaseAdmin.auth.getUser = originalGetUser;
  supabaseAdmin.auth.admin.listUsers = originalListUsers;
  global.fetch = REAL_FETCH;
  calls = undefined;
});

describe('POST /admin/approve - role validation (WS-1 #336)', () => {

  // ── THE FIX: admin was missing from the validator, so this used to 400 ───────
  test('WS1-8: role admin -> 200, membership inserted with role admin', async () => {
    installStubs({ accessRequest: pendingRequest() });

    const res = await request(app)
      .post('/api/v1/approve')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ requestId: REQUEST_ID, teamId: TEAM_ID, role: 'admin' });

    // Before HUNK 2 this was 400 VALIDATION_ERROR - admin can now approve a Head Coach.
    assert.equal(res.status, 200);
    assert.equal(calls.membershipInserts.length, 1);
    assert.equal(calls.membershipInserts[0].role, 'admin');
  });

  // ── Consolidating to CANONICAL_ROLES must not weaken the reject contract ─────
  test('WS1-9: unknown role -> 400 VALIDATION_ERROR, NO insert', async () => {
    installStubs({ accessRequest: pendingRequest() });

    const res = await request(app)
      .post('/api/v1/approve')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ requestId: REQUEST_ID, teamId: TEAM_ID, role: 'wizard' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.membershipInserts.length, 0);
  });

  // ── platform_admin is a GLOBAL role - the validator must reject it too ───────
  test('WS1-10: platform_admin -> 400 VALIDATION_ERROR, NO insert', async () => {
    installStubs({ accessRequest: pendingRequest() });

    const res = await request(app)
      .post('/api/v1/approve')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ requestId: REQUEST_ID, teamId: TEAM_ID, role: 'platform_admin' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.membershipInserts.length, 0);
  });

  // ── Legacy label is NOT canonical - the validator rejects, it does not map ────
  // This route takes an admin-chosen value from a panel dropdown, not a legacy
  // requested_role. Rejection (not transformation) is the correct contract here.
  test('WS1-11: legacy team_admin -> 400 VALIDATION_ERROR (not transformed)', async () => {
    installStubs({ accessRequest: pendingRequest() });

    const res = await request(app)
      .post('/api/v1/approve')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ requestId: REQUEST_ID, teamId: TEAM_ID, role: 'team_admin' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.membershipInserts.length, 0);
  });

  // ── Remaining canonical roles still accepted ─────────────────────────────────
  test('WS1-12: role viewer -> 200, membership inserted with role viewer', async () => {
    installStubs({ accessRequest: pendingRequest() });

    const res = await request(app)
      .post('/api/v1/approve')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ requestId: REQUEST_ID, teamId: TEAM_ID, role: 'viewer' });

    assert.equal(res.status, 200);
    assert.equal(calls.membershipInserts[0].role, 'viewer');
  });

  // ── reviewed_by attribution (already working; lock it in - #337 depends on it) ─
  test('WS1-13: approval sets reviewed_by to the acting admin', async () => {
    installStubs({ accessRequest: pendingRequest() });

    await request(app)
      .post('/api/v1/approve')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ requestId: REQUEST_ID, teamId: TEAM_ID, role: 'coach' });

    assert.equal(calls.accessRequestUpdates.length, 1);
    assert.equal(calls.accessRequestUpdates[0].status, 'approved');
    assert.equal(calls.accessRequestUpdates[0].reviewed_by, ADMIN_USER_ID);
  });

});
