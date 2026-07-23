/**
 * suite-auth-middleware.js
 * Verifies requireAuth middleware behaviour on protected endpoints.
 * Category 7 — CI_SAFE: all tests are read-only or rejection tests.
 *
 * Endpoints under test:
 *   GET  /api/v1/auth/me              (requireAuth in auth.js)
 *   POST /api/v1/auth/logout          (requireAuth in auth.js)
 */

async function get(BASE_URL, path, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${BASE_URL}${path}`, { method: 'GET', headers });
}

async function post(BASE_URL, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

async function run(test, BASE_URL, state) {

  // ─── /me — no token ──────────────────────────────────────────────────────────

  await test('AUTH-MW-01', 'GET /me — no Authorization header → 401 UNAUTHORIZED', async () => {
    const res = await get(BASE_URL, '/api/v1/auth/me');
    const data = await res.json().catch(() => ({}));
    return {
      pass: res.status === 401 && data.error === 'UNAUTHORIZED',
      expected: '401 UNAUTHORIZED',
      actual: `${res.status} ${data.error || '(no error field)'}`,
    };
  });

  // ─── /me — malformed token ───────────────────────────────────────────────────

  await test('AUTH-MW-02', 'GET /me — malformed Bearer token → 401 UNAUTHORIZED', async () => {
    const res = await get(BASE_URL, '/api/v1/auth/me', 'not-a-real-jwt');
    const data = await res.json().catch(() => ({}));
    return {
      pass: res.status === 401 && data.error === 'UNAUTHORIZED',
      expected: '401 UNAUTHORIZED',
      actual: `${res.status} ${data.error || '(no error field)'}`,
    };
  });

  // ─── /me — expired/invalid JWT ───────────────────────────────────────────────

  await test('AUTH-MW-03', 'GET /me — expired JWT → 401 UNAUTHORIZED', async () => {
    // A structurally valid but expired JWT (well-formed header.payload.sig — will fail getUser)
    const expiredJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJleHAiOjE2MDAwMDAwMDB9.invalid';
    const res = await get(BASE_URL, '/api/v1/auth/me', expiredJwt);
    const data = await res.json().catch(() => ({}));
    return {
      pass: res.status === 401 && data.error === 'UNAUTHORIZED',
      expected: '401 UNAUTHORIZED',
      actual: `${res.status} ${data.error || '(no error field)'}`,
    };
  });

  // ─── /logout — no token ──────────────────────────────────────────────────────

  await test('AUTH-MW-04', 'POST /logout — no token → 401 UNAUTHORIZED', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/logout', {});
    const data = await res.json().catch(() => ({}));
    return {
      pass: res.status === 401 && data.error === 'UNAUTHORIZED',
      expected: '401 UNAUTHORIZED',
      actual: `${res.status} ${data.error || '(no error field)'}`,
    };
  });

  // Admin-route auth boundary (401 no-token) is covered at the real bare
  // paths by admin.auth.test.js (unit). Prior dead-path /api/v1/admin/*
  // assertions removed as fake-green (#410): they 401'd via the router
  // catch-all, not the real guards. Malformed-token coverage on admin
  // routes logged as a gap in #410.

}

module.exports = { run };
