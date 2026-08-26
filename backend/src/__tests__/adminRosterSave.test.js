/**
 * adminRosterSave.test.js
 * Route-level coverage for POST /admin/teams/:teamId/roster — fifth endpoint
 * from the admin.html bypass remediation plan (#787, remaining scope after
 * #338/PR #780). admin.html's Rosters tab previously issued
 * `sb.from('team_data').upsert({ team_id, roster }, { onConflict: 'team_id' })`
 * directly via the Supabase client SDK, with no protection at all against
 * accidentally overwriting a live roster with an empty one. This route puts
 * it behind requireAuth/requireAdmin and reuses the existing
 * `rosterWipeGuard` from teamData.js (already exported, not duplicated —
 * see admin.js's own import comment).
 *
 * Mocking pattern copied from approve.role.test.js / adminAddTeam.test.js
 * (same requireAuth/requireAdmin stubs, same shared-`supabaseAdmin.from`
 * monkey-patch approach). `team_data` needs both a select/maybeSingle chain
 * (rosterWipeGuard's own internal read) and an upsert chain (this route's
 * actual write) on the same table stub.
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

const ADMIN_USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TEAM_ID = '1774297491626';
const TOKEN = 'fake-bearer-token';

/** Per-test recorder, reset by installStubs. */
let calls;

function installStubs({ existingRoster = undefined, readError = null, upsertError = null } = {}) {
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
      const selectChain = {
        select: () => selectChain,
        eq: () => selectChain,
        maybeSingle: async () => ({
          data: existingRoster === undefined ? null : { roster: existingRoster },
          error: readError,
        }),
        upsert: (payload) => {
          calls.teamDataUpserts.push(payload);
          return Promise.resolve({ error: upsertError });
        },
      };
      return selectChain;
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

describe('POST /admin/teams/:teamId/roster — authorized-admin coverage (#792)', () => {

  test('R1: non-empty roster -> 200, upsert issued, guard never reads (short-circuits on non-empty incoming)', async () => {
    installStubs();

    const roster = [{ name: 'Stan Hoover' }, { name: 'Aiden' }];
    const res = await request(app)
      .post(`/api/v1/teams/${TEAM_ID}/roster`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ roster });

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true });
    assert.equal(calls.teamDataUpserts.length, 1);
    assert.deepEqual(calls.teamDataUpserts[0], { team_id: TEAM_ID, roster });
  });

  test('R2: empty roster over an existing non-empty one -> 409 ROSTER_WIPE_GUARD, no upsert attempted', async () => {
    installStubs({ existingRoster: [{ name: 'Stan Hoover' }, { name: 'Aiden' }] });

    const res = await request(app)
      .post(`/api/v1/teams/${TEAM_ID}/roster`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ roster: [] });

    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'ROSTER_WIPE_GUARD');
    assert.equal(res.body.currentRosterCount, 2);
    assert.equal(calls.teamDataUpserts.length, 0);
  });

  test('R3: empty roster, no existing row -> 200, upsert issued (safe write)', async () => {
    installStubs({ existingRoster: undefined });

    const res = await request(app)
      .post(`/api/v1/teams/${TEAM_ID}/roster`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ roster: [] });

    assert.equal(res.status, 200);
    assert.equal(calls.teamDataUpserts.length, 1);
  });

  test('R4: empty roster, existing row also empty -> 200, upsert issued', async () => {
    installStubs({ existingRoster: [] });

    const res = await request(app)
      .post(`/api/v1/teams/${TEAM_ID}/roster`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ roster: [] });

    assert.equal(res.status, 200);
    assert.equal(calls.teamDataUpserts.length, 1);
  });

  test('R5: roster field missing entirely -> 400 VALIDATION_ERROR, no upsert attempted', async () => {
    installStubs();

    const res = await request(app)
      .post(`/api/v1/teams/${TEAM_ID}/roster`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.teamDataUpserts.length, 0);
  });

  test('R6: roster is not an array -> 400 VALIDATION_ERROR', async () => {
    installStubs();

    const res = await request(app)
      .post(`/api/v1/teams/${TEAM_ID}/roster`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ roster: 'not-an-array' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
  });

  test('R7: wipe-guard read error, empty incoming -> 409 ROSTER_WIPE_GUARD (fail-safe), no upsert attempted', async () => {
    installStubs({ existingRoster: [], readError: { message: 'connection reset' } });

    const res = await request(app)
      .post(`/api/v1/teams/${TEAM_ID}/roster`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ roster: [] });

    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'ROSTER_WIPE_GUARD');
    assert.equal(res.body.currentRosterCount, -1);
    assert.equal(calls.teamDataUpserts.length, 0);
  });

  test('R8: DB error on the upsert itself -> 500 DB_ERROR', async () => {
    installStubs({ upsertError: { message: 'connection reset' } });

    const res = await request(app)
      .post(`/api/v1/teams/${TEAM_ID}/roster`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ roster: [{ name: 'Stan Hoover' }] });

    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'DB_ERROR');
  });

});
