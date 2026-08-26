/**
 * adminScheduleSave.test.js
 * Route-level coverage for POST /admin/teams/:teamId/schedule — sixth and
 * final endpoint from the admin.html bypass remediation plan (#787,
 * remaining scope after #338/PR #780). admin.html's Schedule tab previously
 * issued `sb.from('team_data').upsert({ team_id, schedule }, { onConflict:
 * 'team_id' })` directly via the Supabase client SDK. This route puts it
 * behind requireAuth/requireAdmin.
 *
 * S3 is the important negative test in this file: it exists specifically to
 * prove this route does NOT apply the roster-wipe guard the sibling roster
 * route (#792) uses — ADMIN_HTML_BYPASS_REMEDIATION_PLAN.md §3d is explicit
 * that Clear Schedule's intentional empty write must never be blocked.
 *
 * Mocking pattern copied from adminRosterSave.test.js / approve.role.test.js
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

const ADMIN_USER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const TEAM_ID = '1774297491626';
const TOKEN = 'fake-bearer-token';

/** Per-test recorder, reset by installStubs. */
let calls;

function installStubs({ upsertError = null } = {}) {
  calls = {
    teamDataUpserts: [],
  };

  supabaseAdmin.auth.getUser = async () => ({
    data: { user: { id: ADMIN_USER_ID, email: 'admin@example.com' } },
    error: null,
  });

  supabaseAdmin.from = (table) => {
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
      };
      return chain;
    }

    if (table === 'team_data') {
      const chain = {
        upsert: (payload) => {
          calls.teamDataUpserts.push(payload);
          return Promise.resolve({ error: upsertError });
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

describe('POST /admin/teams/:teamId/schedule — authorized-admin coverage (#793)', () => {

  test('S1: non-empty schedule -> 200, upsert issued with the right payload', async () => {
    installStubs();

    const schedule = [{ id: 'g1', date: '2026-09-06', opponent: 'Wildcats', home: true }];
    const res = await request(app)
      .post(`/api/v1/teams/${TEAM_ID}/schedule`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ schedule });

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true });
    assert.equal(calls.teamDataUpserts.length, 1);
    assert.deepEqual(calls.teamDataUpserts[0], { team_id: TEAM_ID, schedule });
  });

  test('S2: schedule field missing entirely -> 400 VALIDATION_ERROR, no upsert attempted', async () => {
    installStubs();

    const res = await request(app)
      .post(`/api/v1/teams/${TEAM_ID}/schedule`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.teamDataUpserts.length, 0);
  });

  test('S3: empty schedule (Clear Schedule) -> 200, NOT blocked (no wipe guard on this route)', async () => {
    installStubs();

    const res = await request(app)
      .post(`/api/v1/teams/${TEAM_ID}/schedule`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ schedule: [] });

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true });
    assert.equal(calls.teamDataUpserts.length, 1);
    assert.deepEqual(calls.teamDataUpserts[0].schedule, []);
  });

  test('S4: schedule is not an array -> 400 VALIDATION_ERROR', async () => {
    installStubs();

    const res = await request(app)
      .post(`/api/v1/teams/${TEAM_ID}/schedule`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ schedule: 'not-an-array' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.teamDataUpserts.length, 0);
  });

  test('S5: DB error on upsert -> 500 DB_ERROR', async () => {
    installStubs({ upsertError: { message: 'connection reset' } });

    const res = await request(app)
      .post(`/api/v1/teams/${TEAM_ID}/schedule`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ schedule: [{ id: 'g1', date: '2026-09-06' }] });

    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'DB_ERROR');
  });

});
