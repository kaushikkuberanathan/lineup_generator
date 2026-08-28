/**
 * authRateLimiter.test.js
 *
 * Regression guard for meLimiter / logoutLimiter (#651 — CodeQL
 * js/missing-rate-limiting alerts #15 and #12, the two items deliberately
 * deferred out of the batch-1 PR pending their own scoping pass).
 *
 * Both routes sit behind requireAuth (mounted before the limiter, so
 * req.user.id is always set by the time it runs) and are keyed by user id
 * rather than email — the caller already holds a valid session, there's no
 * email to key on, and per-user is the budget that actually matters. Each
 * test uses its own dedicated bearer token (mapped to a unique user id by
 * the getUser() stub below) so tests never share a limiter budget with each
 * other, mirroring loginLimiter.test.js's independent-key pattern rather
 * than adminLinkLimiter.test.js's single-shared-budget one.
 *
 * Hermetic / CI-safe — no DB, no network. Each limiter's in-memory store is
 * module-level state scoped to this file's own process (node:test runs each
 * file in its own child process), so these counts never collide with any
 * other test file's.
 */
const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const request = require('supertest');
const { supabaseAdmin } = require('../lib/supabase');
const app = require('../../app');

const originalAdminFrom = supabaseAdmin.from;
const originalGetUser = supabaseAdmin.auth.getUser;

function installStubs() {
  // Any non-empty token is "valid" — the user id is derived from the token
  // itself, so distinct tokens always mean distinct rate-limit keys.
  supabaseAdmin.auth.getUser = async (token) => {
    if (!token) return { data: null, error: { message: 'invalid token' } };
    return { data: { user: { id: `user-${token}`, email: `${token}@example.com` } }, error: null };
  };

  supabaseAdmin.from = (table) => {
    if (table === 'auth_events') {
      return { insert: async () => ({ error: null }) };
    }
    const chain = {
      select: () => chain,
      or: () => chain,
      eq: () => chain,
      in: () => chain,
      is: () => chain,
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve) => resolve({ data: [], error: null }),
    };
    return chain;
  };
}

afterEach(() => {
  supabaseAdmin.from = originalAdminFrom;
  supabaseAdmin.auth.getUser = originalGetUser;
});

function getMe(token) {
  return request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
}

function logout(token) {
  return request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`).send({});
}

describe('meLimiter — GET /me rate limiting, keyed by user id (#651)', () => {

  test('ME-LIMIT-1: same user — 100 requests reach the handler (200), 101st is blocked (429)', async () => {
    installStubs();
    const token = 'me-limit-1';

    for (let i = 0; i < 100; i++) {
      const res = await getMe(token);
      assert.equal(res.status, 200, `request ${i + 1} should reach the handler`);
    }
    const blocked = await getMe(token);
    assert.equal(blocked.status, 429, 'the 101st request should be rate-limited (max: 100)');
  });

  test('ME-LIMIT-2: a different user is unaffected by another user\'s exhausted budget', async () => {
    installStubs();
    const exhaustedToken = 'me-limit-2-exhausted';
    const freshToken = 'me-limit-2-fresh';

    for (let i = 0; i < 101; i++) {
      await getMe(exhaustedToken);
    }
    const blocked = await getMe(exhaustedToken);
    assert.equal(blocked.status, 429, 'the exhausted user should stay blocked');

    const res = await getMe(freshToken);
    assert.equal(res.status, 200, 'a different user must not share the exhausted user\'s budget');
  });

  test('ME-LIMIT-3: an unauthenticated request is rejected before the limiter runs (401, not 429)', async () => {
    installStubs();

    const res = await request(app).get('/api/v1/auth/me');
    assert.equal(res.status, 401, 'requireAuth must reject before meLimiter ever sees the request');
  });

});

describe('logoutLimiter — POST /logout rate limiting, keyed by user id (#651)', () => {

  test('LOGOUT-LIMIT-1: same user — 20 requests reach the handler (200), 21st is blocked (429)', async () => {
    installStubs();
    const token = 'logout-limit-1';

    for (let i = 0; i < 20; i++) {
      const res = await logout(token);
      assert.equal(res.status, 200, `request ${i + 1} should reach the handler`);
    }
    const blocked = await logout(token);
    assert.equal(blocked.status, 429, 'the 21st request should be rate-limited (max: 20)');
  });

  test('LOGOUT-LIMIT-2: a different user is unaffected by another user\'s exhausted budget', async () => {
    installStubs();
    const exhaustedToken = 'logout-limit-2-exhausted';
    const freshToken = 'logout-limit-2-fresh';

    for (let i = 0; i < 21; i++) {
      await logout(exhaustedToken);
    }
    const blocked = await logout(exhaustedToken);
    assert.equal(blocked.status, 429, 'the exhausted user should stay blocked');

    const res = await logout(freshToken);
    assert.equal(res.status, 200, 'a different user must not share the exhausted user\'s budget');
  });

  test('LOGOUT-LIMIT-3: an unauthenticated request is rejected before the limiter runs (401, not 429)', async () => {
    installStubs();

    const res = await request(app).post('/api/v1/auth/logout').send({});
    assert.equal(res.status, 401, 'requireAuth must reject before logoutLimiter ever sees the request');
  });

});
