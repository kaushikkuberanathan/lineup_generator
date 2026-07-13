/**
 * requestAccess.role.test.js
 * Route-level coverage for role normalization at ingestion in
 * POST /api/v1/auth/request-access (WS-1, #336).
 *
 * Why this exists: normalizeRole.test.js proves the FUNCTION is correct. AUTH-1 in
 * auth.happy.test.js only sends a canonical 'coach', which is a no-op pass-through -
 * it would still pass even if the normalization were wired up wrong. Nothing asserts
 * that a legacy 'team_admin' is actually WRITTEN to access_requests as 'admin', or
 * that platform_admin / unknown values are now rejected at ingest.
 *
 * This is the source boundary: access_requests.requested_role was persisted verbatim,
 * which is why approve-link had to transform on read. Production data confirmed the
 * problem was real - a team_admin/pending row existed that would have thrown a CHECK
 * violation on approval.
 *
 * Contract note: the validator still ACCEPTS legacy labels (team_admin, coordinator,
 * parent) because this is a public form and the frontend still sends them. Accept,
 * then translate. Contrast POST /admin/approve, which REJECTS legacy values because
 * it takes an admin-chosen dropdown value.
 *
 * CI-safe: no network. global.fetch is stubbed so sendAdminNotification never leaves
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

/** Per-test recorder, reset by installStubs. */
let calls;

function installStubs() {
  calls = {
    fromTables: [],
    accessRequestInserts: [],
    notificationFetchCount: 0,
  };

  supabaseAdmin.from = (table) => {
    calls.fromTables.push(table);

    if (table === 'auth_events') {
      return { insert: async () => ({ error: null }) };
    }

    if (table === 'access_requests') {
      const chain = {
        select: () => chain,
        match: () => chain,
        eq: () => chain,
        // Duplicate-check terminal: no existing request.
        maybeSingle: async () => ({ data: null, error: null }),
        // Insert terminal: .insert(payload).select('id').single()
        insert: (payload) => {
          calls.accessRequestInserts.push(payload);
          return {
            select: () => ({
              single: async () => ({ data: { id: 'req-new' }, error: null }),
            }),
          };
        },
      };
      return chain;
    }

    if (table === 'teams') {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: { name: 'Mud Hens' }, error: null }),
      };
      return chain;
    }

    const chain = {
      select: () => chain,
      eq: () => chain,
      match: () => chain,
      insert: () => chain,
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: null, error: null }),
    };
    return chain;
  };

  // Intercept the Resend admin-notification fetch - keeps CI offline.
  global.fetch = async () => {
    calls.notificationFetchCount += 1;
    return { ok: true, status: 200, text: async () => '', json: async () => ({}) };
  };
}

/** A valid request-access payload with the given requestedRole. */
function payload(requestedRole) {
  return {
    firstName: 'Stan',
    lastName: 'Hoover',
    email: 'stan@example.com',
    teamId: TEAM_ID,
    requestedRole,
  };
}

afterEach(() => {
  supabaseAdmin.from = originalAdminFrom;
  global.fetch = REAL_FETCH;
  calls = undefined;
});

describe('POST /auth/request-access - ingestion normalization (WS-1 #336)', () => {

  // The source of the whole bug: team_admin used to be persisted verbatim.
  test('WS1-14: requestedRole team_admin -> persists canonical admin', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/auth/request-access')
      .send(payload('team_admin'));

    assert.equal(res.status, 201);
    assert.equal(calls.accessRequestInserts.length, 1);
    // The whole point: raw 'team_admin' must never reach access_requests.
    assert.equal(calls.accessRequestInserts[0].requested_role, 'admin');
  });

  test('WS1-15: requestedRole coordinator -> persists canonical coach', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/auth/request-access')
      .send(payload('coordinator'));

    assert.equal(res.status, 201);
    assert.equal(calls.accessRequestInserts[0].requested_role, 'coach');
  });

  test('WS1-16: requestedRole parent -> persists canonical viewer', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/auth/request-access')
      .send(payload('parent'));

    assert.equal(res.status, 201);
    assert.equal(calls.accessRequestInserts[0].requested_role, 'viewer');
  });

  test('WS1-17: already-canonical coach persists unchanged', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/auth/request-access')
      .send(payload('coach'));

    assert.equal(res.status, 201);
    assert.equal(calls.accessRequestInserts[0].requested_role, 'coach');
  });

  // The validator array rejects platform_admin before normalizeRole is reached.
  // Either way the contract holds: it never reaches the DB.
  test('WS1-18: platform_admin -> 400, nothing persisted', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/auth/request-access')
      .send(payload('platform_admin'));

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.accessRequestInserts.length, 0);
    assert.equal(calls.notificationFetchCount, 0);
  });

  test('WS1-19: unrecognized role -> 400, nothing persisted', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/auth/request-access')
      .send(payload('wizard'));

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.accessRequestInserts.length, 0);
  });

  // No requested_role at all. Production data showed a null/approved row that the
  // old '?? coach' fallback would have silently made a coach.
  test('WS1-20: missing requestedRole -> 400, nothing persisted', async () => {
    installStubs();

    const body = payload('coach');
    delete body.requestedRole;

    const res = await request(app)
      .post('/api/v1/auth/request-access')
      .send(body);

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.accessRequestInserts.length, 0);
  });

});
