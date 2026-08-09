/**
 * teamData.logInjection.test.js
 * Regression guard for the log-injection fix in src/routes/teamData.js
 * (Security hardening batch 1 — CodeQL CWE-134 tainted-format-string alerts).
 *
 * Before this fix, five console.error() call sites did:
 *   console.error(`[label] message for team ${teamId}:`, error.message)
 * where teamId is a URL path param (attacker-controlled) and error.message is
 * a second argument. Node's console.* does util.format-style %-substitution
 * whenever 2+ arguments are passed — a teamId containing "%s"/"%d"/"%j"
 * would consume or corrupt the second (error) field, or throw off log
 * parsers relying on that field being intact.
 *
 * The fix passes exactly one literal-string first argument and one object
 * second argument: console.error('[label] message:', { teamId, error }).
 * This spec proves teamId is never re-interpreted as a format string by
 * spying on console.error and asserting the actual arguments passed — not
 * by matching stdout text, which util.format's substitution would corrupt
 * exactly in the case this spec needs to catch.
 *
 * Reuses the existing route-level stub patterns from teamData.routes.test.js
 * (POST/GET) and teamData.delete.test.js (DELETE + requireAuth). Hermetic /
 * CI-safe — no live DB, no network.
 */
const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const request = require('supertest');
const { supabaseAdmin } = require('../lib/supabase');
const app = require('../../app');

const originalFrom = supabaseAdmin.from;
const originalRpc = supabaseAdmin.rpc;
const originalGetUser = supabaseAdmin.auth.getUser;
const originalConsoleError = console.error;

const TEAM_ID = 'test-%s-team'; // contains a printf-style format specifier
// %s is not a valid percent-encoding (needs 2 hex digits), so it must be
// escaped as %25s in the actual HTTP request path — Express's router calls
// decodeURIComponent() on each path segment and throws a URIError on a raw,
// unescaped "%s", which would 400 before ever reaching the handler. Using
// the pre-encoded path lets req.params.teamId decode back to the literal
// 'test-%s-team' string this spec needs to exercise.
const ENCODED_TEAM_ID = encodeURIComponent(TEAM_ID);
const USER_ID = '44444444-4444-4444-8444-444444444444';
const TOKEN = 'fake-bearer-token';

let errorCalls;

function installConsoleErrorSpy() {
  errorCalls = [];
  console.error = (...args) => { errorCalls.push(args); };
}

afterEach(() => {
  supabaseAdmin.from = originalFrom;
  supabaseAdmin.rpc = originalRpc;
  supabaseAdmin.auth.getUser = originalGetUser;
  console.error = originalConsoleError;
  errorCalls = undefined;
});

/** Assert a spied console.error call matches the fixed 2-arg shape. */
function assertFixedShape(call, expectedError) {
  assert.equal(call.length, 2, 'must be called with exactly 2 arguments');
  assert.equal(typeof call[0], 'string', 'first argument must be a literal string label');
  assert.doesNotMatch(call[0], /%[sdifjoOc%]/, 'first argument must not contain a format specifier — teamId must not be interpolated into it');
  assert.deepEqual(call[1], { teamId: TEAM_ID, error: expectedError }, 'second argument must be an object carrying teamId and error intact — not consumed by %s substitution');
}

describe('teamData.js log-injection fix — 5 call sites (Security hardening batch 1)', () => {

  test('1. roster-wipe-guard DB read error — console.error({ teamId, error }) intact', async () => {
    installConsoleErrorSpy();
    supabaseAdmin.from = () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'read fail' } }) }) }),
    });

    const res = await request(app)
      .post(`/api/v1/teams/${ENCODED_TEAM_ID}/data`)
      .send({ roster: [] });

    assert.equal(res.status, 409); // fail-safe: blocked on read error
    const call = errorCalls.find((c) => c[0] === '[roster-wipe-guard] DB read error:');
    assert.ok(call, 'expected [roster-wipe-guard] DB read error: to be logged');
    assertFixedShape(call, 'read fail');
  });

  test('2. teamData write upsert DB error — console.error({ teamId, error }) intact', async () => {
    installConsoleErrorSpy();
    supabaseAdmin.from = () => ({ upsert: async () => ({ error: { message: 'upsert fail' } }) });
    supabaseAdmin.rpc = async () => ({ data: null, error: null });

    const res = await request(app)
      .post(`/api/v1/teams/${ENCODED_TEAM_ID}/data`)
      .send({ roster: [{ name: 'Benji' }] });

    assert.equal(res.status, 500);
    const call = errorCalls.find((c) => c[0] === '[teamData/write] DB upsert error:');
    assert.ok(call, 'expected [teamData/write] DB upsert error: to be logged');
    assertFixedShape(call, 'upsert fail');
  });

  test('3. teamData history DB error — console.error({ teamId, error }) intact', async () => {
    installConsoleErrorSpy();
    supabaseAdmin.from = () => ({
      select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: null, error: { message: 'history fail' } }) }) }) }),
    });

    const res = await request(app).get(`/api/v1/teams/${ENCODED_TEAM_ID}/history`);

    assert.equal(res.status, 500);
    const call = errorCalls.find((c) => c[0] === '[teamData/history] DB error:');
    assert.ok(call, 'expected [teamData/history] DB error: to be logged');
    assertFixedShape(call, 'history fail');
  });

  test('4. DELETE membership-check DB error — console.error({ teamId, error }) intact', async () => {
    installConsoleErrorSpy();
    supabaseAdmin.auth.getUser = async () => ({ data: { user: { id: USER_ID } }, error: null });
    supabaseAdmin.from = (table) => {
      if (table === 'team_memberships') {
        return { select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'membership check fail' } }) }) }) }) }) }) };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
    };

    const res = await request(app)
      .delete(`/api/v1/teams/${ENCODED_TEAM_ID}`)
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 500);
    const call = errorCalls.find((c) => c[0] === '[teamData/delete] membership check error:');
    assert.ok(call, 'expected [teamData/delete] membership check error: to be logged');
    assertFixedShape(call, 'membership check fail');
  });

  test('5. DELETE teams.delete() DB error — console.error({ teamId, error }) intact', async () => {
    installConsoleErrorSpy();
    supabaseAdmin.auth.getUser = async () => ({ data: { user: { id: USER_ID } }, error: null });
    supabaseAdmin.from = (table) => {
      if (table === 'team_memberships') {
        return { select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'm-1' }, error: null }) }) }) }) }) }) };
      }
      if (table === 'teams') {
        return { delete: () => ({ eq: async () => ({ error: { message: 'delete fail' } }) }) };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
    };

    const res = await request(app)
      .delete(`/api/v1/teams/${ENCODED_TEAM_ID}`)
      .set('Authorization', `Bearer ${TOKEN}`);

    assert.equal(res.status, 500);
    const call = errorCalls.find((c) => c[0] === '[teamData/delete] delete error:');
    assert.ok(call, 'expected [teamData/delete] delete error: to be logged');
    assertFixedShape(call, 'delete fail');
  });

});
