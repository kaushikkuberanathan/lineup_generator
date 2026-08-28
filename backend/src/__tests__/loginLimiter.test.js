/**
 * loginLimiter.test.js
 * Regression guard for the loginLimiter keying fix (ROADMAP Story 26, fix D).
 *
 * Before this fix, loginLimiter had no keyGenerator, so express-rate-limit
 * defaulted to keying by req.ip: every caller behind the same address shared
 * one 5-request/15-minute budget. In CI that meant every workflow run against
 * the same runner IP pool drew from one shared budget - unrelated test runs
 * starved each other. This produced live 429s on VAL-08/VAL-09/RATE-01a in CI
 * on 2026-07-31 - a real, reproducible failure, not a flake.
 *
 * The fix keys by email instead (falling back to IP only when no email is
 * present, via skip() + keyGenerator() in backend/src/routes/auth.js). This
 * spec proves the three properties that fix depends on:
 *
 *   LIMIT-1: the SAME email is rate-limited after 5 requests (the limiter
 *            still actually limits something - this is not a no-op).
 *   LIMIT-2: a DIFFERENT email is unaffected by another email's exhausted
 *            budget (the actual bug this fix closes).
 *   LIMIT-3: a request with NO email is never rate-limited, even after other
 *            emails' budgets are exhausted (skip() excludes it entirely,
 *            matching VAL-09's real-world shape).
 *
 * LIMIT-4 (#329) covers a gap LIMIT-3 does not: skip() only excludes a
 * request with NO email at all. A request that HAS a valid email but fails
 * validation for another reason (e.g. missing teamId, VAL-08's shape) still
 * has hasEmail(req) === true, so skip() does not exclude it — before #329's
 * fix, that meant loginLimiter still ran (and could consume/exhaust that
 * email's budget) before validation ever rejected the request. #329 moves
 * validation ahead of loginLimiter in the route's middleware chain so a
 * malformed-but-not-emailless request also always gets a deterministic 400.
 *
 * Hermetic / CI-safe — no DB, no network. Same three-seam stub pattern as
 * auth.happy.test.js (team_memberships stubbed to "no membership" for every
 * request, so every request that reaches the handler gets a deterministic
 * 403 - this spec only cares about which requests reach the handler at all,
 * distinguishing 429 (blocked by the limiter) from 403 (reached it)).
 *
 * loginLimiter's in-memory store is module-level state scoped to this file's
 * own process (node:test runs each file in its own child process), so this
 * file's requests can never collide with any other test file's, or with a
 * prior run's.
 */
const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const request = require('supertest');
const { supabaseAdmin } = require('../lib/supabase');
const app = require('../../app');

const originalAdminFrom = supabaseAdmin.from;

function installNoMembershipStub() {
  supabaseAdmin.from = (table) => {
    if (table === 'auth_events') {
      return { insert: async () => ({ error: null }) };
    }
    const chain = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      maybeSingle: async () => ({ data: null, error: null }), // no membership → every request that reaches the handler gets 403
      single: async () => ({ data: null, error: null }),
    };
    return chain;
  };
}

afterEach(() => {
  supabaseAdmin.from = originalAdminFrom;
});

const TEAM_ID = '1774297491626';

function magicLink(email) {
  const payload = { teamId: TEAM_ID };
  if (email !== undefined) payload.email = email;
  return request(app).post('/api/v1/auth/magic-link').send(payload);
}

describe('loginLimiter keying (Story 26 fix D)', () => {

  test('LIMIT-1: same email — 5 requests reach the handler (403), 6th is blocked by the limiter (429)', async () => {
    installNoMembershipStub();
    const email = 'limit1@example.com';

    const statuses = [];
    for (let i = 0; i < 6; i++) {
      const res = await magicLink(email);
      statuses.push(res.status);
    }

    assert.deepEqual(statuses, [403, 403, 403, 403, 403, 429]);
  });

  test('LIMIT-2: a different email is unaffected by another email\'s exhausted budget', async () => {
    installNoMembershipStub();
    const exhaustedEmail = 'limit2-exhausted@example.com';
    const freshEmail = 'limit2-fresh@example.com';

    // Exhaust exhaustedEmail's budget (5 requests reach the handler, 6th is blocked).
    for (let i = 0; i < 6; i++) {
      await magicLink(exhaustedEmail);
    }

    // freshEmail has never been used — must still reach the handler, not be blocked.
    const res = await magicLink(freshEmail);
    assert.equal(res.status, 403, 'a different email must not share the exhausted email\'s budget');
  });

  test('LIMIT-3: no email at all is never rate-limited, even after other emails are exhausted', async () => {
    installNoMembershipStub();
    const exhaustedEmail = 'limit3-exhausted@example.com';

    for (let i = 0; i < 6; i++) {
      await magicLink(exhaustedEmail);
    }

    // No email → express-validator rejects with 400 before ever reaching the
    // handler's membership check — but critically, NOT 429. skip() must
    // exclude no-email requests from the limiter entirely, regardless of how
    // many other budgets are already exhausted.
    const res = await magicLink(undefined);
    assert.equal(res.status, 400, 'a request with no email must never be rate-limited (400 from validation, not 429)');
  });

  test('LIMIT-4 (#329): a request with a valid email but a missing teamId is never rate-limited, even 6 times in a row', async () => {
    installNoMembershipStub();
    const email = 'limit4-malformed@example.com';

    // teamId omitted on every request — payload fails validation, never the
    // membership check. Before #329, loginLimiter ran first and this email's
    // budget would exhaust on the 6th call (429); validation now runs first,
    // so every call should get the same deterministic 400.
    const statuses = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app).post('/api/v1/auth/magic-link').send({ email });
      statuses.push(res.status);
    }

    assert.deepEqual(statuses, [400, 400, 400, 400, 400, 400]);
  });

});
