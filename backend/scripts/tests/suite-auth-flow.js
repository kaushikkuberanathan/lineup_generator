/**
 * suite-auth-flow.js
 * Happy paths and failure paths for the full auth flow.
 * Categories 2 + 3.
 *
 * Note: OTP verify tests (2d, 3a, 3b) require live email delivery
 * and are marked MANUAL.
 */

const TEAM_ID = '1774297491626';
const DEVICE  = { platform: 'Windows', device_type: 'desktop', browser: 'Chrome', access_mode: 'browser', app_version: 'test-suite-1.0', timezone: 'America/New_York' };

async function post(BASE_URL, path, body) {
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function run(test, BASE_URL, state) {
  const TEST_EMAIL = `auth-suite-${state.runId}@test.com`;

  // ─── Happy paths ─────────────────────────────────────────────────────────────

  await test('AUTH-01', 'Request access — valid email + role', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: 'Auth', lastName: 'Suite',
      email: TEST_EMAIL, teamId: TEAM_ID,
      requestedRole: 'coach', deviceContext: DEVICE,
    });
    const data = await res.json();
    if (data.requestId) state.authSuiteRequestId = data.requestId;
    if (!state.testEmails) state.testEmails = [];
    state.testEmails.push(TEST_EMAIL);
    return {
      pass: res.status === 201 && data.success === true && !!data.requestId,
      expected: '201 success=true requestId present',
      actual: `${res.status} success=${data.success} requestId=${!!data.requestId}`,
    };
  });

  await test('AUTH-02', 'Login — no membership returns NOT_AUTHORIZED', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/login', {
      email: 'nobody-nomembership@test.com', teamId: TEAM_ID, deviceContext: DEVICE,
    });
    const data = await res.json();
    return {
      pass: res.status === 403 && data.error === 'NOT_AUTHORIZED',
      expected: '403 NOT_AUTHORIZED',
      actual: `${res.status} ${data.error}`,
    };
  });

  await test('AUTH-03', 'Login — valid email with active membership sends OTP', async () => {
    return {
      skip: true,
      expected: '200 success=true channel=email',
      reason: 'Supabase rate limits OTP sends per email address — run manually with a fresh email',
    };
  });

  // ─── Manual tests ────────────────────────────────────────────────────────────

  await test('AUTH-04', 'Verify OTP — valid code returns session', async () => {
    return {
      skip: true,
      expected: '200 session.access_token present',
      reason: 'Requires live OTP from email — run manually',
    };
  });

  await test('AUTH-05', 'GET /me — returns profile + memberships', async () => {
    return {
      skip: true,
      expected: '200 profile + memberships[]',
      reason: 'Requires valid session token — run manually after AUTH-04',
    };
  });

  // ─── Failure paths ───────────────────────────────────────────────────────────

  await test('AUTH-06', 'Verify OTP — wrong code returns INVALID_TOKEN', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/verify', {
      email: 'kaushik.kuberanathan@gmail.com',
      token: '000000',
      teamId: TEAM_ID,
      deviceContext: DEVICE,
    });
    const data = await res.json();
    return {
      pass: res.status === 401 && data.error === 'INVALID_TOKEN',
      expected: '401 INVALID_TOKEN',
      actual: `${res.status} ${data.error}`,
    };
  });

  await test('AUTH-07', 'GET /me — no token returns UNAUTHORIZED', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/me`);
    const data = await res.json();
    return {
      pass: res.status === 401 && data.error === 'UNAUTHORIZED',
      expected: '401 UNAUTHORIZED',
      actual: `${res.status} ${data.error}`,
    };
  });

  await test('AUTH-08', 'GET /me — malformed token returns UNAUTHORIZED', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: 'Bearer not-a-real-token' },
    });
    const data = await res.json();
    return {
      pass: res.status === 401 && data.error === 'UNAUTHORIZED',
      expected: '401 UNAUTHORIZED',
      actual: `${res.status} ${data.error}`,
    };
  });

}

module.exports = { run };
