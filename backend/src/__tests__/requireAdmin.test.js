/**
 * requireAdmin.test.js
 * Direct unit coverage for middleware/requireAdmin.js — previously exercised
 * only indirectly, via route-specific test files stubbing it to always
 * resolve as an admin so they could reach their own handler under test.
 * Nothing verified the middleware's own decision logic in isolation.
 *
 * Found during the #406/#410 test-health survey (Pass 2): requireAdmin gates
 * on an exact `.eq('role', 'admin').eq('status', 'active')` filter. Root
 * CLAUDE.md documents ~596 team_memberships rows still holding
 * pre-normalization legacy values (team_admin/coordinator/parent) because
 * normalizeRole() only runs at write-time on new inserts, never
 * retroactively. RA4 below asserts the exact filter values in use today —
 * confirming (not silently fixing) that a row literally holding 'team_admin'
 * is excluded by this query before requireAdmin ever sees it. Whether that's
 * the intended behavior for the ~596-row legacy population is a product
 * decision, not something this test resolves.
 *
 * Calls the middleware function directly (no app/supertest) since it has no
 * dependency on req.headers or the route layer — only req.user.id, set by
 * requireAuth upstream.
 */

const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const { supabaseAdmin } = require('../lib/supabase');
const requireAdmin = require('../middleware/requireAdmin');

const originalAdminFrom = supabaseAdmin.from;
const USER_ID = '66666666-6666-4666-8666-666666666666';

let eqCalls;

function stubMembership(result) {
  eqCalls = [];
  supabaseAdmin.from = (table) => {
    if (table !== 'team_memberships') throw new Error(`unexpected table in test: ${table}`);
    const chain = {
      select: () => chain,
      eq: (col, val) => { eqCalls.push([col, val]); return chain; },
      maybeSingle: async () => (result instanceof Error
        ? { data: null, error: result }
        : { data: result, error: null }),
    };
    return chain;
  };
}

function fakeReqRes() {
  const req = { user: { id: USER_ID } };
  let statusCode = null;
  let body = null;
  const res = {
    status(code) { statusCode = code; return this; },
    json(payload) { body = payload; return this; },
  };
  return { req, res, getStatus: () => statusCode, getBody: () => body };
}

afterEach(() => {
  supabaseAdmin.from = originalAdminFrom;
});

describe('requireAdmin middleware', () => {

  test('RA1: active admin membership -> next() called, req.adminMembership set', async () => {
    const row = { id: 'm-1', user_id: USER_ID, role: 'admin', status: 'active' };
    stubMembership(row);
    const { req, res, getStatus } = fakeReqRes();

    let nextCalled = false;
    await requireAdmin(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.equal(getStatus(), null, 'res.status must not be called on success');
    assert.deepEqual(req.adminMembership, row);
  });

  test('RA2: no matching row -> 403 FORBIDDEN, next() not called', async () => {
    stubMembership(null);
    const { req, res, getStatus, getBody } = fakeReqRes();

    let nextCalled = false;
    await requireAdmin(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(getStatus(), 403);
    assert.equal(getBody().error, 'FORBIDDEN');
  });

  test('RA3: DB error -> 403 FORBIDDEN (fail-closed, not a 500/throw)', async () => {
    stubMembership(new Error('connection reset'));
    const { req, res, getStatus, getBody } = fakeReqRes();

    let nextCalled = false;
    await requireAdmin(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(getStatus(), 403);
    assert.equal(getBody().error, 'FORBIDDEN');
  });

  test('RA4 (known limitation, not fixed here): the query filters on the exact canonical strings "admin"/"active" — a legacy "team_admin" row is excluded before requireAdmin ever inspects it', async () => {
    stubMembership({ id: 'm-1', user_id: USER_ID, role: 'admin', status: 'active' });
    const { req, res } = fakeReqRes();

    await requireAdmin(req, res, () => {});

    assert.deepEqual(eqCalls, [
      ['user_id', USER_ID],
      ['role', 'admin'],
      ['status', 'active'],
    ]);
  });

});
