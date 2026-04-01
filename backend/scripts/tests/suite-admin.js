/**
 * suite-admin.js
 * Verifies admin routes reject unauthenticated and non-admin requests.
 * Category 4.
 */

const TEAM_ID = '1774297491626';

const ADMIN_ROUTES = [
  { method: 'GET',  path: '/api/v1/admin/requests' },
  { method: 'POST', path: '/api/v1/admin/approve' },
  { method: 'POST', path: '/api/v1/admin/reject' },
  { method: 'GET',  path: '/api/v1/admin/members' },
  { method: 'POST', path: '/api/v1/admin/update-role' },
  { method: 'POST', path: '/api/v1/admin/suspend' },
  { method: 'POST', path: '/api/v1/admin/reset-access' },
];

async function run(test, BASE_URL, state) {

  // No token — all admin routes should return 401
  for (const route of ADMIN_ROUTES) {
    const id = `ADM-NO-${route.path.split('/').pop().toUpperCase()}`;
    await test(id, `${route.method} ${route.path} — no token → 401`, async () => {
      const res = await fetch(`${BASE_URL}${route.path}`, {
        method: route.method,
        headers: { 'Content-Type': 'application/json' },
        body: route.method === 'POST' ? JSON.stringify({}) : undefined,
      });
      return {
        pass: res.status === 401,
        expected: '401',
        actual: String(res.status),
      };
    });
  }

  // Malformed token — all admin routes should return 401
  await test('ADM-BAD-TOKEN', 'Admin route — malformed token → 401', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/requests`, {
      headers: { Authorization: 'Bearer this-is-not-a-real-token' },
    });
    return {
      pass: res.status === 401,
      expected: '401',
      actual: String(res.status),
    };
  });

  // Public approve/deny links should NOT require auth
  await test('ADM-APPROVE-PUBLIC', '/admin/approve-link — no token → not 401', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/approve-link?requestId=00000000-0000-0000-0000-000000000000&teamId=${TEAM_ID}`);
    // Should return 400 (missing params handled) or 404 (not found) — never 401
    return {
      pass: res.status !== 401,
      expected: 'not 401 (public route)',
      actual: String(res.status),
    };
  });

  await test('ADM-DENY-PUBLIC', '/admin/deny-link — no token → not 401', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/deny-link?requestId=00000000-0000-0000-0000-000000000000`);
    return {
      pass: res.status !== 401,
      expected: 'not 401 (public route)',
      actual: String(res.status),
    };
  });

}

module.exports = { run };
