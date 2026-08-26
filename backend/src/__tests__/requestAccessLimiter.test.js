/**
 * requestAccessLimiter.test.js
 * Regression guard for the requestAccessLimiter added to POST /request-access
 * (Security hardening batch 1 — CodeQL alert: missing rate limiter).
 *
 * Before this fix, /request-access had no rate limiter at all — unlimited
 * signup submissions from a single source. The fix mirrors loginLimiter's
 * proven keying shape (ROADMAP Story 26, fix D) rather than re-deriving it:
 * key by email (falling back to IP only when no email is present, via
 * skip() + keyGenerator() in backend/src/routes/auth.js), with a looser
 * budget (10 req / 60 min) since this is a one-time signup action, not a
 * repeated auth flow.
 *
 * This spec proves the three properties the fix depends on, in the same
 * shape as loginLimiter.test.js:
 *
 *   RA-LIMIT-1: the SAME email is rate-limited after 10 requests.
 *   RA-LIMIT-2: a DIFFERENT email is unaffected by another email's
 *               exhausted budget (two different emails from the same
 *               source/IP must NOT share a budget).
 *   RA-LIMIT-3: a request with no email is never rate-limited (never a
 *               429), even after other emails' budgets are exhausted —
 *               skip() excludes it from the limiter entirely, matching
 *               loginLimiter's own no-email behavior. It still gets
 *               rejected, just by validation (400), not the limiter —
 *               phone was a valid alternative to email here until
 *               2026-08-26 (#406/#410 test-health survey, dead code:
 *               the frontend never sent it); this test's own payload no
 *               longer offers it.
 *
 * Hermetic / CI-safe — no DB, no network. Stubs supabaseAdmin.from (shared
 * singleton — also intercepts logAuthEvent's auth_events insert) and
 * global.fetch (sendAdminNotification → sendEmail in lib/email.js), same
 * seams as auth.happy.test.js. The existing-request check always returns
 * "no existing row" so every request that reaches the handler proceeds to
 * 201 — this spec only cares about which requests reach the handler at
 * all, distinguishing 429 (blocked by the limiter) from 201 (reached it).
 *
 * requestAccessLimiter's in-memory store is module-level state scoped to
 * this file's own process (node:test runs each file in its own child
 * process), so this file's requests can never collide with any other test
 * file's, or with a prior run's.
 */
const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const request = require('supertest');
const { supabaseAdmin } = require('../lib/supabase');
const app = require('../../app');

const originalAdminFrom = supabaseAdmin.from;
const REAL_FETCH = global.fetch;

function installStubs() {
  let insertCounter = 0;

  supabaseAdmin.from = (table) => {
    if (table === 'auth_events') {
      return { insert: async () => ({ error: null }) };
    }
    const chain = {
      select: () => chain,
      eq: () => chain,
      match: () => chain,
      in: () => chain,
      order: () => chain,
      insert: () => chain,
      maybeSingle: async () => {
        if (table === 'teams') return { data: { name: 'Test Team' }, error: null };
        return { data: null, error: null }; // access_requests: no existing row
      },
      single: async () => {
        insertCounter += 1;
        return { data: { id: `req-${insertCounter}` }, error: null };
      },
    };
    return chain;
  };

  global.fetch = async () => ({ ok: true, status: 200, text: async () => '', json: async () => ({}) });
}

afterEach(() => {
  supabaseAdmin.from = originalAdminFrom;
  global.fetch = REAL_FETCH;
});

const TEAM_ID = '1774297491626';

function requestAccess({ email } = {}) {
  const payload = {
    firstName: 'Stan',
    lastName: 'Hoover',
    teamId: TEAM_ID,
    requestedRole: 'coach',
  };
  if (email !== undefined) payload.email = email;
  return request(app).post('/api/v1/auth/request-access').send(payload);
}

describe('requestAccessLimiter keying (Security hardening batch 1)', () => {

  test('RA-LIMIT-1: same email — 10 requests reach the handler (201), 11th is blocked (429)', async () => {
    installStubs();
    const email = 'ralimit1@example.com';

    const statuses = [];
    for (let i = 0; i < 11; i++) {
      const res = await requestAccess({ email });
      statuses.push(res.status);
    }

    assert.deepEqual(statuses, [201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 429]);
  });

  test('RA-LIMIT-2: a different email is unaffected by another email\'s exhausted budget', async () => {
    installStubs();
    const exhaustedEmail = 'ralimit2-exhausted@example.com';
    const freshEmail = 'ralimit2-fresh@example.com';

    // Exhaust exhaustedEmail's budget (10 requests reach the handler, 11th is blocked).
    for (let i = 0; i < 11; i++) {
      await requestAccess({ email: exhaustedEmail });
    }

    // freshEmail has never been used — must still reach the handler, not be blocked.
    const res = await requestAccess({ email: freshEmail });
    assert.equal(res.status, 201, 'a different email must not share the exhausted email\'s budget');
  });

  test('RA-LIMIT-3: a request with no email is never rate-limited (400 from validation, not 429 from the limiter), even after other emails are exhausted', async () => {
    installStubs();
    const exhaustedEmail = 'ralimit3-exhausted@example.com';

    for (let i = 0; i < 11; i++) {
      await requestAccess({ email: exhaustedEmail });
    }

    // No email → skip() excludes this request from the limiter entirely,
    // regardless of how many other budgets are already exhausted. It's
    // still rejected — email is required — but by validation (400), not
    // the limiter (429).
    const res = await requestAccess({});
    assert.equal(res.status, 400, 'a request with no email must be rejected by validation, never by the rate limiter');
    assert.equal(res.body.error, 'VALIDATION_ERROR');
  });

});
