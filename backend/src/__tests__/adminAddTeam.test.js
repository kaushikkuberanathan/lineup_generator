/**
 * adminAddTeam.test.js
 * Route-level coverage for POST /admin/teams — fourth endpoint from the
 * admin.html bypass remediation plan (#787, remaining scope after
 * #338/PR #780). admin.html's Teams tab previously issued
 * `sb.from('teams').insert({ id, name, age_group, sport, season, year })`
 * directly via the Supabase client SDK, with a client-generated id and the
 * admin's own session (not service-role). This route puts it behind
 * requireAuth/requireAdmin, generates the id server-side, validates `season`
 * to Spring/Fall, and uses supabaseAdmin so the platform admin doesn't
 * silently become a member of every team they create (see the route's own
 * header comment in admin.js for the trigger mechanics).
 *
 * Also confirms the mount-order fallthrough this route depends on: app.js
 * mounts teamDataRouter at /api/v1/teams before adminRouter at bare /api/v1
 * (backend/CLAUDE.md's documented mount order). teamDataRouter has no
 * handler for a bare POST /, so Express falls through to adminRouter's
 * POST /teams for this exact path — T1 below is the regression guard for
 * that fallthrough actually working, not just the route's own logic.
 *
 * Mocking pattern copied from approve.role.test.js / adminAddCoach.test.js
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

const ADMIN_USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TEAM_ID = '1774297491626';
const TOKEN = 'fake-bearer-token';

/** Per-test recorder, reset by installStubs. */
let calls;

function installStubs({ insertError = null } = {}) {
  calls = {
    teamInserts: [],
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

    if (table === 'teams') {
      const chain = {
        insert: (payload) => {
          calls.teamInserts.push(payload);
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
  calls = undefined;
});

describe('POST /admin/teams — authorized-admin coverage (#791)', () => {

  test('T1: full payload -> 200, team inserted with a server-generated id (mount-order fallthrough works)', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ name: 'Mud Hens', ageGroup: '8U', sport: 'baseball', season: 'Spring', year: 2026 });

    assert.equal(res.status, 200);
    assert.equal(res.body.team.name, 'Mud Hens');
    assert.ok(res.body.team.id, 'response should include a server-generated id');
    assert.equal(calls.teamInserts.length, 1);
    assert.equal(calls.teamInserts[0].id, res.body.team.id);
    assert.equal(calls.teamInserts[0].name, 'Mud Hens');
    assert.equal(calls.teamInserts[0].age_group, '8U');
    assert.equal(calls.teamInserts[0].sport, 'baseball');
    assert.equal(calls.teamInserts[0].season, 'Spring');
    assert.equal(calls.teamInserts[0].year, 2026);
  });

  test('T2: a client-supplied id is ignored, not trusted', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ id: 'attacker-supplied-id', name: 'Mud Hens', season: 'Spring' });

    assert.equal(res.status, 200);
    assert.notEqual(calls.teamInserts[0].id, 'attacker-supplied-id');
    assert.notEqual(res.body.team.id, 'attacker-supplied-id');
  });

  test('T3: optional fields omitted -> sensible defaults (age_group empty, sport baseball, year current)', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ name: 'Fall Ball Crew', season: 'Fall' });

    assert.equal(res.status, 200);
    assert.equal(calls.teamInserts[0].age_group, '');
    assert.equal(calls.teamInserts[0].sport, 'baseball');
    assert.equal(calls.teamInserts[0].year, new Date().getFullYear());
  });

  test('T4: missing name -> 400 VALIDATION_ERROR, no insert attempted', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ season: 'Spring' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.teamInserts.length, 0);
  });

  test('T5: missing season -> 400 VALIDATION_ERROR', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ name: 'Mud Hens' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
  });

  test('T6: invalid season value -> 400 VALIDATION_ERROR', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ name: 'Mud Hens', season: 'Summer' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.teamInserts.length, 0);
  });

  test('T7: year out of bounds -> 400 VALIDATION_ERROR', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ name: 'Mud Hens', season: 'Spring', year: 1899 });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
  });

  test('T8: DB error on insert -> 500 DB_ERROR', async () => {
    installStubs({ insertError: { message: 'connection reset' } });

    const res = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ name: 'Mud Hens', season: 'Spring' });

    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'DB_ERROR');
  });

});
