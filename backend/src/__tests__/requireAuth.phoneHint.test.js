/**
 * requireAuth.phoneHint.test.js
 *
 * Direct unit coverage for middleware/requireAuth.js's rejection-logging
 * phone-hint branch (lines ~21-25):
 *
 *   if (error || !data?.user) {
 *     const phone = data?.user?.phone;
 *     const hint = phone ? ` phone=${maskPhone(phone)}` : '';
 *     console.warn(`[requireAuth] rejected: invalid or expired token${hint}`);
 *     return res.status(401).json({ error: 'UNAUTHORIZED' });
 *   }
 *
 * Filed as #966 on the (correct, since disproven) suspicion that this was
 * dead code left over from a removed phone-auth era. A live read-only query
 * against production (hzaajccyurlyeweekvma) found 7 total auth.users rows,
 * 1 of which has `phone` set — so `error` truthy AND `data.user.phone`
 * present is a real, reachable production shape (Supabase can return a user
 * object alongside certain token-validation errors), not a hypothetical.
 * requireAuth.js itself is NOT changed by this file — this only adds the
 * missing coverage for existing behavior.
 *
 * ~15 existing backend unit tests exercise requireAuth's rejection path via
 * a full app + supertest (e.g. admin.auth.test.js, teamData.delete.test.js)
 * but every one of them mocks either { data: null, error } or
 * { data: { user: {...} }, error: null } — never error-truthy-with-a-user
 * simultaneously. This file calls the middleware function directly (no
 * app/supertest needed — pure middleware logic, same pattern as
 * requireAdmin.test.js) to construct that missing case.
 *
 * maskPhone's own masking behavior is already covered directly by
 * phone.test.js — this file only asserts requireAuth calls it correctly and
 * includes its real output in the warn line, not a hardcoded expectation.
 */

const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const { supabaseAdmin } = require('../lib/supabase');
const { maskPhone } = require('../lib/phone');
const requireAuth = require('../middleware/requireAuth');

const originalGetUser = supabaseAdmin.auth.getUser;
const originalWarn = console.warn;

function stubGetUser(result) {
  supabaseAdmin.auth.getUser = async () => result;
}

function fakeReqRes(authHeader) {
  const req = { headers: authHeader ? { authorization: authHeader } : {} };
  let statusCode = null;
  let body = null;
  const res = {
    status(code) { statusCode = code; return this; },
    json(payload) { body = payload; return this; },
  };
  return { req, res, getStatus: () => statusCode, getBody: () => body };
}

function spyWarn() {
  const calls = [];
  console.warn = (...args) => { calls.push(args.join(' ')); };
  return calls;
}

afterEach(() => {
  supabaseAdmin.auth.getUser = originalGetUser;
  console.warn = originalWarn;
});

describe('requireAuth middleware — phone-hint rejection logging (#966)', () => {

  test('RA1: no Authorization header at all -> 401, no phone hint possible, getUser never called', async () => {
    const warnCalls = spyWarn();
    let getUserCalled = false;
    supabaseAdmin.auth.getUser = async () => { getUserCalled = true; return { data: null, error: null }; };

    const { req, res, getStatus, getBody } = fakeReqRes(undefined);
    let nextCalled = false;

    await requireAuth(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(getStatus(), 401);
    assert.equal(getBody().error, 'UNAUTHORIZED');
    assert.equal(getUserCalled, false, 'getUser should never be reached with no Bearer token');
    assert.equal(warnCalls.length, 1);
    assert.match(warnCalls[0], /no Bearer token/);
    assert.ok(!warnCalls[0].includes('phone='));
  });

  test('RA2: getUser() returns { data: null, error } (no user object at all) -> 401, no phone hint', async () => {
    const warnCalls = spyWarn();
    stubGetUser({ data: null, error: { message: 'invalid JWT' } });

    const { req, res, getStatus, getBody } = fakeReqRes('Bearer sometoken');
    let nextCalled = false;

    await requireAuth(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(getStatus(), 401);
    assert.equal(getBody().error, 'UNAUTHORIZED');
    assert.equal(warnCalls.length, 1);
    assert.match(warnCalls[0], /rejected: invalid or expired token$/);
    assert.ok(!warnCalls[0].includes('phone='));
  });

  test('RA3 (the real gap): error present AND data.user.phone present -> 401, warn line includes real maskPhone() output', async () => {
    const warnCalls = spyWarn();
    const rawPhone = '+15551234567';
    stubGetUser({
      data: { user: { id: 'u-1', phone: rawPhone } },
      error: { message: 'token expired' },
    });

    const { req, res, getStatus, getBody } = fakeReqRes('Bearer sometoken');
    let nextCalled = false;

    await requireAuth(req, res, () => { nextCalled = true; });

    const expectedMasked = maskPhone(rawPhone);

    assert.equal(nextCalled, false);
    assert.equal(getStatus(), 401);
    assert.equal(getBody().error, 'UNAUTHORIZED');
    assert.equal(warnCalls.length, 1);
    assert.ok(
      warnCalls[0].includes(`phone=${expectedMasked}`),
      `expected warn line to contain "phone=${expectedMasked}", got: ${warnCalls[0]}`
    );
    assert.match(warnCalls[0], /^\[requireAuth\] rejected: invalid or expired token phone=/);
  });

  test('RA4: getUser() succeeds (data.user present, no error) -> next() called, req.user set, no 401', async () => {
    const warnCalls = spyWarn();
    const user = { id: 'u-2', email: 'coach@example.com' };
    stubGetUser({ data: { user }, error: null });

    const { req, res, getStatus } = fakeReqRes('Bearer sometoken');
    let nextCalled = false;

    await requireAuth(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.equal(getStatus(), null, 'res.status must not be called on success');
    assert.deepEqual(req.user, user);
    assert.equal(warnCalls.length, 0, 'no rejection warning on the success path');
  });

});
