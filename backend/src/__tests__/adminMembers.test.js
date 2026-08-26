/**
 * adminMembers.test.js
 * Route-level coverage for GET /api/v1/members — previously only exercised
 * by admin.auth.test.js's blanket 401-rejection check. Found during the
 * #406/#410 test-health survey (#474, tranche B).
 *
 * Covers the field-rename mapping (id -> membershipId, team_id -> teamId,
 * phone_e164 -> phone, etc.) and the invited-member-with-no-profile-row
 * case (profiles is a left join — user_id null, no profile yet).
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
const ADMIN_USER_ID = '88888888-8888-4888-8888-888888888888';
const TOKEN = 'fake-bearer-token';

function installStubs({ rows, dbError = null } = {}) {
  supabaseAdmin.auth.getUser = async () => ({
    data: { user: { id: ADMIN_USER_ID, email: 'admin@example.com' } },
    error: null,
  });

  var callCount = 0;
  supabaseAdmin.from = (table) => {
    if (table === 'team_memberships') {
      callCount += 1;
      // First call is requireAdmin's own lookup (select/eq/eq/eq/maybeSingle);
      // the second is the route's own select/in. Distinguish by call order
      // rather than by shape, since both target the same table.
      if (callCount === 1) {
        const adminChain = {
          select: () => adminChain,
          eq: () => adminChain,
          maybeSingle: async () => ({
            data: { id: 'membership-admin', user_id: ADMIN_USER_ID, role: 'admin', status: 'active' },
            error: null,
          }),
        };
        return adminChain;
      }
      const chain = {
        select: () => chain,
        in: async () => (dbError ? { data: null, error: dbError } : { data: rows, error: null }),
      };
      return chain;
    }
    return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
  };
}

afterEach(() => {
  supabaseAdmin.from = originalAdminFrom;
  supabaseAdmin.auth.getUser = originalGetUser;
});

describe('GET /api/v1/members — authorized-admin path', () => {

  test('M1: active member with a profile -> field names mapped correctly', async () => {
    installStubs({
      rows: [{
        id: 'm-1', team_id: TEAM_ID, role: 'coach', status: 'active',
        email: 'stan@example.com', user_id: 'user-1', phone_e164: null,
        activated_at: '2026-08-01T00:00:00Z',
        profiles: { first_name: 'Stan', last_name: 'Hoover' },
      }],
    });

    const res = await request(app)
      .get('/api/v1/members')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 200);
    assert.deepEqual(res.body.members[0], {
      membershipId: 'm-1', teamId: TEAM_ID, role: 'coach', status: 'active',
      firstName: 'Stan', lastName: 'Hoover', email: 'stan@example.com',
      userId: 'user-1', phone: null, activatedAt: '2026-08-01T00:00:00Z',
    });
  });

  test('M2: invited member, no profile row yet -> firstName/lastName null, not a crash', async () => {
    installStubs({
      rows: [{
        id: 'm-2', team_id: TEAM_ID, role: 'coach', status: 'invited',
        email: 'new@example.com', user_id: null, phone_e164: null,
        activated_at: null, profiles: null,
      }],
    });

    const res = await request(app)
      .get('/api/v1/members')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.members[0].firstName, null);
    assert.equal(res.body.members[0].lastName, null);
    assert.equal(res.body.members[0].status, 'invited');
  });

  test('M3: empty membership list -> 200 with an empty array, not an error', async () => {
    installStubs({ rows: [] });

    const res = await request(app)
      .get('/api/v1/members')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 200);
    assert.deepEqual(res.body.members, []);
  });

  test('M4: DB error -> 500 DB_ERROR', async () => {
    installStubs({ rows: null, dbError: { message: 'connection reset' } });

    const res = await request(app)
      .get('/api/v1/members')
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'DB_ERROR');
  });

});
