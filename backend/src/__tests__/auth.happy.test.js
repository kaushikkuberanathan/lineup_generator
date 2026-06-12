/**
 * auth.happy.test.js
 * Happy-path + primary-gate coverage for src/routes/auth.js (Story 99 / #252).
 * Closes the "auth happy-path" half of #252 — the integration suite covers
 * these flows but requires a live server + real Supabase/Resend; this spec is
 * hermetic and runs in the backend-unit CI job.
 *
 * Routes exercised:
 *   POST /api/v1/auth/request-access  (auth.js:74)  → 201 on new request
 *   POST /api/v1/auth/magic-link      (auth.js:203) → 200 on valid membership
 *
 * Hermetic / CI-safe — no DB, no network. Three seams are stubbed per test
 * and restored in afterEach:
 *
 *   1. supabaseAdmin.from — chainable stub with per-table result queues.
 *      supabaseAdmin is a SHARED singleton (lib/supabase.js), so the same
 *      patch also intercepts logAuthEvent's auth_events insert (authEvents.js
 *      imports the same instance). auth_events is special-cased to a terminal
 *      insert; every other table returns a chain whose terminal (maybeSingle/
 *      single) shifts the next queued result for that table.
 *   2. supabaseAnon.auth.signInWithOtp — the magic-link send; returns {error}.
 *   3. global.fetch — sendAdminNotification → sendEmail uses fetch directly
 *      (lib/email.js). Stubbed so the Resend call never leaves the process
 *      regardless of whether RESEND_API_KEY is set in the test env. (sendEmail
 *      swallows all errors anyway, so email is never asserted on — it is
 *      fire-and-forget and must never gate the auth response.)
 *
 * loginLimiter budget: /magic-link is rate-limited to 5 req / 15 min / IP and
 * the in-memory store persists across this file's run. Only two requests hit
 * it here (AUTH-3, AUTH-4) — well under the cap.
 *
 * require('../lib/env') runs first so dotenv populates SUPABASE_* before
 * ../lib/supabase imports (same pattern as teamData.routes.test.js).
 */
const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const request = require('supertest');
const { supabaseAdmin, supabaseAnon } = require('../lib/supabase');
const app = require('../../app');

const originalAdminFrom = supabaseAdmin.from;
const originalSignIn = supabaseAnon.auth.signInWithOtp;
const REAL_FETCH = global.fetch;

// Per-test call recorder, reset by installStubs.
let calls;

/**
 * @param {object} opts
 * @param {object} [opts.queues]       — { tableName: [result, ...] } shifted FIFO by terminal calls
 * @param {object} [opts.signInResult] — value returned by supabaseAnon.auth.signInWithOtp
 */
function installStubs({ queues = {}, signInResult = { error: null } } = {}) {
  calls = { fromTables: [], signInCount: 0, emailFetchCount: 0 };

  const q = {};
  for (const k of Object.keys(queues)) q[k] = [...queues[k]];
  const shift = (table) =>
    (q[table] && q[table].length ? q[table].shift() : { data: null, error: null });

  supabaseAdmin.from = (table) => {
    calls.fromTables.push(table);
    // logAuthEvent does `await from('auth_events').insert(...)` — terminal insert.
    if (table === 'auth_events') {
      return { insert: async () => ({ error: null }) };
    }
    const chain = {
      select: () => chain,
      eq: () => chain,
      match: () => chain,
      in: () => chain,
      order: () => chain,
      insert: () => chain,        // request-access: insert().select('id').single()
      maybeSingle: async () => shift(table),
      single: async () => shift(table),
    };
    return chain;
  };

  supabaseAnon.auth.signInWithOtp = async () => {
    calls.signInCount += 1;
    return signInResult;
  };

  // Intercept the Resend email fetch (lib/email.js sendEmail).
  global.fetch = async () => {
    calls.emailFetchCount += 1;
    return { ok: true, status: 200, text: async () => '', json: async () => ({}) };
  };
}

afterEach(() => {
  supabaseAdmin.from = originalAdminFrom;
  supabaseAnon.auth.signInWithOtp = originalSignIn;
  global.fetch = REAL_FETCH;
  calls = undefined;
});

const VALID_REQUEST = {
  firstName: 'Stan',
  lastName: 'Hoover',
  teamId: '1774297491626',
  requestedRole: 'coach',
  email: 'stan@example.com',
};

describe('POST /api/v1/auth/request-access', () => {

  // ── AUTH-1: new request, no duplicate → 201 ─────────────────────────────────
  test('AUTH-1: valid new request → 201 success + requestId, insert + team lookup reached', async () => {
    installStubs({
      queues: {
        access_requests: [
          { data: null, error: null },                       // existing-check → none
          { data: { id: 'req-abc' }, error: null },          // insert().select().single()
        ],
        teams: [{ data: { name: 'Mud Hens' }, error: null }],
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/request-access')
      .send(VALID_REQUEST);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.requestId, 'req-abc');
    assert.ok(calls.fromTables.includes('access_requests'));
    assert.ok(calls.fromTables.includes('teams'));
  });

  // ── AUTH-2: duplicate pending request → 409 (primary gate) ───────────────────
  test('AUTH-2: existing pending request → 409 REQUEST_PENDING, no insert', async () => {
    installStubs({
      queues: {
        access_requests: [
          { data: { id: 'req-old', status: 'pending' }, error: null }, // existing-check → pending
        ],
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/request-access')
      .send(VALID_REQUEST);

    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'REQUEST_PENDING');
    // Only the existing-check from() ran; the insert branch was short-circuited.
    assert.equal(calls.fromTables.filter((t) => t === 'access_requests').length, 1);
  });

});

describe('POST /api/v1/auth/magic-link', () => {

  // ── AUTH-3: valid active membership → 200, magic link sent ───────────────────
  test('AUTH-3: active membership → 200 success, signInWithOtp called once', async () => {
    installStubs({
      queues: {
        team_memberships: [
          { data: { id: 'm-1', status: 'active', role: 'coach', team_id: '1774297491626' }, error: null },
        ],
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/magic-link')
      .send({ email: 'stan@example.com', teamId: '1774297491626' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(calls.signInCount, 1);
  });

  // ── AUTH-4: no membership → 403, magic link NOT sent (primary gate) ──────────
  test('AUTH-4: no membership → 403 NOT_AUTHORIZED, signInWithOtp not called', async () => {
    installStubs({
      queues: {
        team_memberships: [{ data: null, error: null }], // no invited/active row
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/magic-link')
      .send({ email: 'nobody@example.com', teamId: '1774297491626' });

    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'NOT_AUTHORIZED');
    assert.equal(calls.signInCount, 0);
  });

});
