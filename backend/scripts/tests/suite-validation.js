/**
 * suite-validation.js
 * Verifies every endpoint rejects malformed, missing, or malicious input.
 * Category 1: input validation.
 */

const TEAM_ID = '1774297491626';
const DEVICE = { platform: 'Windows', device_type: 'desktop', browser: 'Chrome', access_mode: 'browser', app_version: 'test-suite-1.0', timezone: 'America/New_York' };

async function post(BASE_URL, path, body) {
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function run(test, BASE_URL, state) {
  const TEST_EMAIL = `val-suite-${state.runId}@test.com`;

  // ─── /request-access validation ─────────────────────────────────────────────

  await test('VAL-01', '/request-access: missing firstName', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      lastName: 'Test', email: 'val01@test.com', teamId: TEAM_ID,
      requestedRole: 'coach', deviceContext: DEVICE,
    });
    return { pass: res.status === 400, expected: '400', actual: String(res.status) };
  });

  await test('VAL-02', '/request-access: missing lastName', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: 'Test', email: 'val02@test.com', teamId: TEAM_ID,
      requestedRole: 'coach', deviceContext: DEVICE,
    });
    return { pass: res.status === 400, expected: '400', actual: String(res.status) };
  });

  await test('VAL-03', '/request-access: missing teamId', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: 'Test', lastName: 'User', email: 'val03@test.com',
      requestedRole: 'coach', deviceContext: DEVICE,
    });
    return { pass: res.status === 400, expected: '400', actual: String(res.status) };
  });

  await test('VAL-04', '/request-access: missing role', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: 'Test', lastName: 'User', email: 'val04@test.com',
      teamId: TEAM_ID, deviceContext: DEVICE,
    });
    return { pass: res.status === 400, expected: '400', actual: String(res.status) };
  });

  await test('VAL-05', '/request-access: invalid role value', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: 'Test', lastName: 'User', email: 'val05@test.com',
      teamId: TEAM_ID, requestedRole: 'superadmin', deviceContext: DEVICE,
    });
    return { pass: res.status === 400, expected: '400', actual: String(res.status) };
  });

  await test('VAL-06', '/request-access: no contact method', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: 'Test', lastName: 'User', teamId: TEAM_ID,
      requestedRole: 'coach', deviceContext: DEVICE,
    });
    return { pass: res.status === 400, expected: '400 CONTACT_REQUIRED', actual: String(res.status) };
  });

  await test('VAL-07', '/request-access: XSS in firstName is rejected or stored escaped', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: '<script>alert(1)</script>', lastName: 'Test',
      email: TEST_EMAIL, teamId: TEAM_ID,
      requestedRole: 'coach', deviceContext: DEVICE,
    });
    // Prefer 400 (reject on input). If 201, body must not echo raw <script> tag.
    if (res.status === 400) {
      return { pass: true, expected: '400 (XSS rejected)', actual: '400' };
    }
    if (res.status === 201) {
      const body = await res.text();
      const unescaped = body.includes('<script>');
      return { pass: !unescaped, expected: '201 without raw <script> in response', actual: unescaped ? '201 with unescaped XSS' : '201 clean' };
    }
    return { pass: false, expected: '400 or 201', actual: String(res.status) };
  });

  // ─── /magic-link validation ──────────────────────────────────────────────────

  await test('VAL-08', '/magic-link: missing teamId', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/magic-link', {
      email: 'val08@test.com', deviceContext: DEVICE,
    });
    return { pass: res.status === 400, expected: '400', actual: String(res.status) };
  });

  await test('VAL-09', '/magic-link: no email', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/magic-link', {
      teamId: TEAM_ID, deviceContext: DEVICE,
    });
    return { pass: res.status === 400, expected: '400', actual: String(res.status) };
  });

  // ─── approve-link validation ─────────────────────────────────────────────────

  await test('VAL-14', '/admin/approve-link: missing requestId', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/approve-link?teamId=${TEAM_ID}`);
    return { pass: res.status === 400, expected: '400', actual: String(res.status) };
  });

  await test('VAL-15', '/admin/approve-link: missing teamId', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/approve-link?requestId=00000000-0000-0000-0000-000000000000`);
    return { pass: res.status === 400, expected: '400', actual: String(res.status) };
  });

  await test('VAL-16', '/admin/approve-link: nonexistent requestId', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/approve-link?requestId=00000000-0000-0000-0000-000000000000&teamId=${TEAM_ID}`);
    return { pass: res.status === 404, expected: '404', actual: String(res.status) };
  });

}

module.exports = { run };
