/**
 * suite-auth-middleware.js
 * Verifies requireAuth middleware behaviour on protected endpoints.
 * Category 7 — CI_SAFE: all tests are read-only or rejection tests.
 *
 * Endpoints under test:
 *   GET  /api/v1/auth/me              (requireAuth in auth.js)
 *   POST /api/v1/auth/logout          (requireAuth in auth.js)
 *   GET  /api/v1/admin/requests       (requireAuth + requireAdmin in admin.js)
 *   POST /api/v1/admin/approve        (requireAuth + requireAdmin in admin.js)
 *   POST /api/v1/admin/reject         (requireAuth + requireAdmin in admin.js)
 *   GET  /api/v1/admin/members        (requireAuth + requireAdmin in admin.js)
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

  // ─── /admin/requests — no token ──────────────────────────────────────────────

  await test('AUTH-MW-05', 'GET /admin/requests — no token → 401 UNAUTHORIZED', async () => {
    const res = await get(BASE_URL, '/api/v1/admin/requests');
    const data = await res.json().catch(() => ({}));
    return {
      pass: res.status === 401 && data.error === 'UNAUTHORIZED',
      expected: '401 UNAUTHORIZED',
      actual: `${res.status} ${data.error || '(no error field)'}`,
    };
  });

  // ─── /admin/approve — no token ───────────────────────────────────────────────

  await test('AUTH-MW-06', 'POST /admin/approve — no token → 401 UNAUTHORIZED', async () => {
    const res = await post(BASE_URL, '/api/v1/admin/approve', { requestId: '00000000-0000-0000-0000-000000000000', teamId: '1774297491626', role: 'coach' });
    const data = await res.json().catch(() => ({}));
    return {
      pass: res.status === 401 && data.error === 'UNAUTHORIZED',
      expected: '401 UNAUTHORIZED',
      actual: `${res.status} ${data.error || '(no error field)'}`,
    };
  });

  // ─── /admin/reject — no token ────────────────────────────────────────────────

  await test('AUTH-MW-07', 'POST /admin/reject — no token → 401 UNAUTHORIZED', async () => {
    const res = await post(BASE_URL, '/api/v1/admin/reject', { requestId: '00000000-0000-0000-0000-000000000000' });
    const data = await res.json().catch(() => ({}));
    return {
      pass: res.status === 401 && data.error === 'UNAUTHORIZED',
      expected: '401 UNAUTHORIZED',
      actual: `${res.status} ${data.error || '(no error field)'}`,
    };
  });

  // ─── /admin/members — no token ───────────────────────────────────────────────

  await test('AUTH-MW-08', 'GET /admin/members — no token → 401 UNAUTHORIZED', async () => {
    const res = await get(BASE_URL, '/api/v1/admin/members');
    const data = await res.json().catch(() => ({}));
    return {
      pass: res.status === 401 && data.error === 'UNAUTHORIZED',
      expected: '401 UNAUTHORIZED',
      actual: `${res.status} ${data.error || '(no error field)'}`,
    };
  });

}

module.exports = { run };
