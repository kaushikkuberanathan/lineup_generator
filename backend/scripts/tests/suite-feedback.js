/**
 * suite-feedback.js
 * Tests for POST /api/v1/feedback.
 *
 * Auth: requireAuth middleware is applied BEFORE express-validator, so any
 * request without a valid Supabase JWT returns 401 before validation runs.
 * This means happy-path, missing-field, and oversized-body tests cannot be
 * automated without a live session token. Those tests are marked MANUAL with
 * instructions for running them by hand after logging in via the admin UI.
 *
 * What IS automatable:
 *   FB-01 — no token → 401 UNAUTHORIZED
 *   FB-02 — malformed token → 401 UNAUTHORIZED
 */

async function run(test, BASE_URL, state) {

  // ── FB-01: no auth token ─────────────────────────────────────────────────────

  await test('FB-01', 'POST /feedback — no token → 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'feedback', body: 'test feedback' }),
    });
    const data = await res.json();
    return {
      pass: res.status === 401 && data.error === 'UNAUTHORIZED',
      expected: '401 UNAUTHORIZED',
      actual:   `${res.status} ${data.error}`,
    };
  });

  // ── FB-02: malformed bearer token ───────────────────────────────────────────

  await test('FB-02', 'POST /feedback — malformed token → 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer not-a-real-token',
      },
      body: JSON.stringify({ type: 'feedback', body: 'test feedback' }),
    });
    const data = await res.json();
    return {
      pass: res.status === 401 && data.error === 'UNAUTHORIZED',
      expected: '401 UNAUTHORIZED',
      actual:   `${res.status} ${data.error}`,
    };
  });

  // ── FB-03 through FB-06: MANUAL — blocked by requireAuth ────────────────────
  // To run these: log in via admin UI, copy the access_token from localStorage
  // (supabase.auth.getSession), then POST with Authorization: Bearer <token>.

  await test('FB-03', 'POST /feedback — missing type → 400 VALIDATION_ERROR', async () => {
    return {
      skip: true,
      expected: '400 VALIDATION_ERROR',
      reason: 'requireAuth blocks all unauthenticated requests — run manually with a valid session token',
    };
  });

  await test('FB-04', 'POST /feedback — missing body → 400 VALIDATION_ERROR', async () => {
    return {
      skip: true,
      expected: '400 VALIDATION_ERROR',
      reason: 'requireAuth blocks all unauthenticated requests — run manually with a valid session token',
    };
  });

  await test('FB-05', 'POST /feedback — invalid type value → 400 VALIDATION_ERROR', async () => {
    return {
      skip: true,
      expected: '400 VALIDATION_ERROR',
      reason: 'requireAuth blocks all unauthenticated requests — run manually with a valid session token',
    };
  });

  await test('FB-06', 'POST /feedback — happy path (valid type + body) → 201', async () => {
    return {
      skip: true,
      expected: '201 { message: "Feedback received." }',
      reason: 'requireAuth blocks all unauthenticated requests — run manually with a valid session token',
    };
  });

}

module.exports = { run };
