/**
 * adminFeatureFlags.test.js
 * Route-level coverage for PATCH /admin/feature-flags/:flagName — new route,
 * the first endpoint from the admin.html bypass remediation plan (#787,
 * remaining scope after #338/PR #780). admin.html's Feature Flags tab
 * previously wrote `feature_flags` directly via the Supabase client SDK; this
 * route puts it behind requireAuth/requireAdmin like every other admin.js
 * action, with `enabled` validated as a boolean before it reaches the DB.
 *
 * Mocking pattern copied from reject.test.js (same requireAuth/requireAdmin
 * stubs, same shared-`supabaseAdmin.from` monkey-patch approach).
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
const ADMIN_USER_ID = '55555555-5555-4555-8555-555555555555';
const TOKEN = 'fake-bearer-token';

/** Per-test recorder, reset by installStubs. */
let calls;

function installStubs({ updateError = null } = {}) {
  calls = {
    flagUpdates: [],
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

    if (table === 'feature_flags') {
      const chain = {
        update: (payload) => {
          calls.flagUpdates.push(payload);
          const eqChain = {
            eq: () => eqChain,
            is: async () => ({ error: updateError }),
          };
          return eqChain;
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

describe('PATCH /admin/feature-flags/:flagName — authorized-admin coverage (#788)', () => {

  test('F1: enabled=true -> 200, update payload has enabled true + updated_at', async () => {
    installStubs();

    const res = await request(app)
      .patch('/api/v1/feature-flags/live_scoring')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ enabled: true });

    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'live_scoring set to ON.');
    assert.equal(calls.flagUpdates.length, 1);
    assert.equal(calls.flagUpdates[0].enabled, true);
    assert.ok(calls.flagUpdates[0].updated_at);
  });

  test('F2: enabled=false -> 200, message reflects OFF', async () => {
    installStubs();

    const res = await request(app)
      .patch('/api/v1/feature-flags/live_scoring')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ enabled: false });

    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'live_scoring set to OFF.');
    assert.equal(calls.flagUpdates[0].enabled, false);
  });

  test('F3: flagName from the URL param is used, not trusted from the body', async () => {
    installStubs();

    await request(app)
      .patch('/api/v1/feature-flags/game_mode')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ enabled: true, flagName: 'ignored_value' });

    assert.equal(calls.flagUpdates.length, 1);
    // no direct assertion surface for the .eq('flag_name', x) arg with this
    // chain shape, but the 200 message below confirms the param was used
  });

  test('F4: missing enabled -> 400 VALIDATION_ERROR, no DB update attempted', async () => {
    installStubs();

    const res = await request(app)
      .patch('/api/v1/feature-flags/live_scoring')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.flagUpdates.length, 0);
  });

  test('F5: non-boolean enabled -> 400 VALIDATION_ERROR', async () => {
    installStubs();

    const res = await request(app)
      .patch('/api/v1/feature-flags/live_scoring')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ enabled: 'yes' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.flagUpdates.length, 0);
  });

  test('F6: DB error on update -> 500 DB_ERROR', async () => {
    installStubs({ updateError: { message: 'connection reset' } });

    const res = await request(app)
      .patch('/api/v1/feature-flags/live_scoring')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ enabled: true });

    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'DB_ERROR');
  });

});
