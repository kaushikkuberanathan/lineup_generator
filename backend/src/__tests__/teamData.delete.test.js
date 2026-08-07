/**
 * teamData.delete.test.js
 * Route coverage for DELETE /api/v1/teams/:teamId (#380).
 *
 * Routes team deletion through the backend with a service_role client and an
 * explicit per-team admin check (team_memberships: role=admin, status=active
 * for that team_id) — mirrors teams_auth_delete's RLS scoping, re-implemented
 * here because supabaseAdmin bypasses RLS entirely.
 *
 * Follows the requireAuth stubbing pattern established in
 * approve.role.test.js / auth.session.test.js: stub supabaseAdmin.auth
 * .getUser() to hand back req.user, then stub supabaseAdmin.from() per-table
 * for the membership check and the delete itself.
 *
 * Hermetic / CI-safe — no DB, no network.
 */
const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const request = require('supertest');
const { supabaseAdmin } = require('../lib/supabase');
const app = require('../../app');

const originalFrom = supabaseAdmin.from;
const originalGetUser = supabaseAdmin.auth.getUser;

const USER_ID = '44444444-4444-4444-8444-444444444444';
const TOKEN = 'fake-bearer-token';

let calls;

/**
 * @param {object} opts
 * @param {object|null} [opts.membershipRow]   — team_memberships row returned by the admin check (null = not an admin)
 * @param {object|null} [opts.membershipError] — error object for the membership check, if any
 * @param {object|null} [opts.deleteError]     — error object for the teams delete, if any
 * @param {boolean}     [opts.rejectAuth]      — if true, getUser() returns an error (simulates an invalid/expired token)
 */
function installStubs({ membershipRow = null, membershipError = null, deleteError = null, rejectAuth = false } = {}) {
  calls = { fromTables: [], deletedIds: [] };

  supabaseAdmin.auth.getUser = async () => {
    if (rejectAuth) return { data: null, error: { message: 'invalid token' } };
    return { data: { user: { id: USER_ID } }, error: null };
  };

  supabaseAdmin.from = (table) => {
    calls.fromTables.push(table);

    if (table === 'team_memberships') {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: membershipRow, error: membershipError }),
      };
      return chain;
    }

    if (table === 'teams') {
      const chain = {
        delete: () => chain,
        eq: (col, val) => {
          if (col === 'id') calls.deletedIds.push(val);
          return Promise.resolve({ error: deleteError });
        },
      };
      return chain;
    }

    return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
  };
}

afterEach(() => {
  supabaseAdmin.from = originalFrom;
  supabaseAdmin.auth.getUser = originalGetUser;
  calls = undefined;
});

describe('DELETE /api/v1/teams/:teamId (#380)', () => {

  test('1. No Bearer token → 401 UNAUTHORIZED, never reaches the membership check or delete', async () => {
    installStubs({ rejectAuth: true });

    const res = await request(app).delete('/api/v1/teams/test-td');

    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'UNAUTHORIZED');
    assert.equal(calls.fromTables.length, 0);
  });

  test('2. Authenticated but NOT an active admin of this team → 403 NOT_TEAM_ADMIN, delete never called', async () => {
    installStubs({ membershipRow: null });

    const res = await request(app)
      .delete('/api/v1/teams/test-td')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'NOT_TEAM_ADMIN');
    assert.equal(calls.deletedIds.length, 0);
  });

  test('3. Authenticated active admin → 200 { ok: true }, teams.delete().eq(\'id\', teamId) called once', async () => {
    installStubs({ membershipRow: { id: 'm-1' }, deleteError: null });

    const res = await request(app)
      .delete('/api/v1/teams/test-td')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true });
    assert.deepEqual(calls.deletedIds, ['test-td']);
  });

  test('4. Membership check DB error → 500 DB_ERROR, delete never called', async () => {
    installStubs({ membershipError: { message: 'db down' } });

    const res = await request(app)
      .delete('/api/v1/teams/test-td')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'DB_ERROR');
    assert.equal(calls.deletedIds.length, 0);
  });

  test('5. Delete itself errors → 500 DB_ERROR', async () => {
    installStubs({ membershipRow: { id: 'm-1' }, deleteError: { message: 'constraint violation' } });

    const res = await request(app)
      .delete('/api/v1/teams/test-td')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'DB_ERROR');
  });

  test('6. Legacy mount DELETE /api/teams/:teamId → 200 { ok: true } (dual-mount smoke)', async () => {
    installStubs({ membershipRow: { id: 'm-1' }, deleteError: null });

    const res = await request(app)
      .delete('/api/teams/test-td')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true });
  });

});
