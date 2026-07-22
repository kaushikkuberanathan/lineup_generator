/**
 * suite-admin.js
 * Verifies admin routes reject unauthenticated and non-admin requests.
 * Category 4.
 */

const TEAM_ID = '1774297491626';

async function run(test, BASE_URL, state) {

  // Admin-route auth boundary (401 no-token) is covered at the real bare
  // paths by admin.auth.test.js (unit). Prior dead-path /api/v1/admin/*
  // assertions removed as fake-green (#410): they 401'd via the router
  // catch-all, not the real guards. Malformed-token coverage on admin
  // routes logged as a gap in #410.

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
