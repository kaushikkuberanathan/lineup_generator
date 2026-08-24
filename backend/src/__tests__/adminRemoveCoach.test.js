/**
 * adminRemoveCoach.test.js
 * Route-level coverage for DELETE /admin/coaches/:membershipId — second
 * endpoint from the admin.html bypass remediation plan (#787, remaining
 * scope after #338/PR #780). admin.html's Coaches tab previously issued
 * `sb.from('team_memberships').delete().eq('id', id)` directly via the
 * Supabase client SDK; this route puts it behind requireAuth/requireAdmin
 * like every other admin.js action, with `membershipId` validated as a UUID
 * before it reaches the DB.
 *
 * Mocking pattern copied from reject.test.js / adminFeatureFlags.test.js
 * (same requireAuth/requireAdmin stubs, same shared-`supabaseAdmin.from`
 * monkey-patch approach).
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

const TEAM_ID = '1774297491626';
const ADMIN_USER_ID = '66666666-6666-4666-8666-666666666666';
const MEMBERSHIP_ID = '77777777-7777-4777-8777-777777777777';
const TOKEN = 'fake-bearer-token';

/** Per-test recorder, reset by installStubs. */
let calls;

function installStubs({ deleteError = null } = {}) {
  calls = {
    membershipDeletes: [],
  };

  supabaseAdmin.auth.getUser = async () => ({
    data: { user: { id: ADMIN_USER_ID, email: 'admin@example.com' } },
    error: null,
  });

  supabaseAdmin.from = (table) => {
    if (table === 'team_memberships') {
      // Distinguish requireAdmin's own membership lookup (select().eq().maybeSingle())
      // from this route's delete().eq() chain by branching on the method called.
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
        delete: () => {
          const deleteChain = {
            eq: (col, val) => {
              calls.membershipDeletes.push({ col, val });
              return Promise.resolve({ error: deleteError });
            },
          };
          return deleteChain;
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
  calls = undefined;
});

describe('DELETE /admin/coaches/:membershipId — authorized-admin coverage (#789)', () => {

  test('C1: valid membershipId -> 200, delete issued with the right id', async () => {
    installStubs();

    const res = await request(app)
      .delete(`/api/v1/coaches/${MEMBERSHIP_ID}`)
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'Coach removed.');
    assert.equal(calls.membershipDeletes.length, 1);
    assert.equal(calls.membershipDeletes[0].col, 'id');
    assert.equal(calls.membershipDeletes[0].val, MEMBERSHIP_ID);
  });

  test('C2: non-UUID membershipId -> 400 VALIDATION_ERROR, no delete attempted', async () => {
    installStubs();

    const res = await request(app)
      .delete('/api/v1/coaches/not-a-uuid')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.membershipDeletes.length, 0);
  });

  test('C3: DB error on delete -> 500 DB_ERROR', async () => {
    installStubs({ deleteError: { message: 'connection reset' } });

    const res = await request(app)
      .delete(`/api/v1/coaches/${MEMBERSHIP_ID}`)
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'DB_ERROR');
  });

});
