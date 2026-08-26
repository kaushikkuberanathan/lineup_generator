/**
 * adminLinkLimiter.test.js
 *
 * #337 follow-up: CodeQL (js/missing-rate-limiting) flagged both public
 * 1-tap links as performing authorization (the new HMAC token verification)
 * with no rate limit — the standard brute-force/DoS pattern. Fixed with
 * adminLinkLimiter (admin.js) — IP-keyed since no email exists pre-verification,
 * same express-rate-limit shape as loginLimiter/requestAccessLimiter (auth.js).
 *
 * IP-keyed means every request in this file's process shares ONE budget
 * (unlike loginLimiter's tests, which isolate cases with different email
 * keys) — this version of express-rate-limit exposes resetKey(key) but not
 * resetAll(), and the exact key string isn't worth depending on. So this is
 * a single ordered test tracking the running request count explicitly,
 * rather than several independent tests relying on a reset between them.
 *
 * Only proves the limiter itself trips and scopes correctly; token
 * verification behavior (tamper/expiry/reviewed_by) is covered separately in
 * adminLinkToken.route.test.js and is not re-tested here.
 */

const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const request = require('supertest');
const { supabaseAdmin } = require('../lib/supabase');
const app = require('../../app');

const originalAdminFrom = supabaseAdmin.from;
const originalListUsers = supabaseAdmin.auth.admin.listUsers;

function installNotFoundStub() {
  // Any token that parses (even a malformed one, which 400s before ever
  // reaching the DB) is fine for this file's purpose — it only needs the
  // route to be REACHABLE repeatedly, not to succeed.
  supabaseAdmin.auth.admin.listUsers = async () => ({ data: { users: [] }, error: null });
  supabaseAdmin.from = () => ({
    select: function () { return this; },
    eq: function () { return this; },
    maybeSingle: async () => ({ data: null, error: null }),
  });
}

afterEach(() => {
  supabaseAdmin.from = originalAdminFrom;
  supabaseAdmin.auth.admin.listUsers = originalListUsers;
});

describe('adminLinkLimiter — rate limiting on the public approve/deny links (#337)', () => {

  test('AL: max 20 requests per 15min shared across both routes, keyed by IP', async () => {
    installNotFoundStub();

    // Request 1: no token at all -> proves the real handler runs (400), not
    // the limiter blocking it (429) or a crash.
    const first = await request(app).get('/api/v1/admin/deny-link');
    assert.equal(first.status, 400);

    // Requests 2-20: 19 more, split across both routes, must all still reach
    // the real handler (never 429) - proves the limit isn't tripping early.
    for (let i = 0; i < 9; i++) {
      const a = await request(app).get('/api/v1/admin/approve-link').query({ token: 'garbage' });
      assert.notEqual(a.status, 429, `approve-link request should not be rate-limited yet (running total ${2 + i * 2})`);
      const d = await request(app).get('/api/v1/admin/deny-link').query({ token: 'garbage' });
      assert.notEqual(d.status, 429, `deny-link request should not be rate-limited yet (running total ${3 + i * 2})`);
    }
    // Running total after the loop: 1 + 18 = 19. This is the 20th overall.
    const twentieth = await request(app).get('/api/v1/admin/approve-link').query({ token: 'garbage' });
    assert.notEqual(twentieth.status, 429, 'the 20th request overall should still be allowed (max: 20)');

    // Request 21 (overall): budget of 20 is now exhausted -> 429.
    const twentyFirst = await request(app).get('/api/v1/admin/deny-link').query({ token: 'garbage' });
    assert.equal(twentyFirst.status, 429,
      'the 21st request overall should be rate-limited (max: 20)');

    // And the OTHER route is blocked too - proves one shared IP-keyed
    // budget across both routes, not two independent 20-request budgets.
    const stillBlocked = await request(app).get('/api/v1/admin/approve-link').query({ token: 'garbage' });
    assert.equal(stillBlocked.status, 429,
      'approve-link must also be blocked - shared budget, not a separate one per route');
  });

});
