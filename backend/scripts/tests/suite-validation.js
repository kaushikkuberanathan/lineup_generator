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
  // VAL-07 below can legitimately succeed (201) rather than reject — when it
  // does, it inserts a real access_requests row under TEST_EMAIL. This suite
  // runs unconditionally (even under CI_SAFE, even against prod), unlike the
  // gated write-heavy suites, so without this it's an untracked, permanent
  // leak on every single run. Track it so test-runner.js's end-of-run
  // cleanup (state.testEmails) actually deletes it. See #339.
  state.testEmails.push(TEST_EMAIL);

  // ─── /request-access validation ─────────────────────────────────────────────

  // VAL-01 through VAL-05 use a per-run-unique email (same state.runId pattern
  // as TEST_EMAIL above) rather than a fixed one. requestAccessLimiter
  // (auth.js) is email-keyed at 10 req/60min; a fixed email reused on every
  // CI run across the project's history can exceed that budget under normal
  // CI traffic, turning these 400-checks into false 429s (#785).
  await test('VAL-01', '/request-access: missing firstName', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      lastName: 'Test', email: `val01-${state.runId}@test.com`, teamId: TEAM_ID,
      requestedRole: 'coach', deviceContext: DEVICE,
    });
    return { pass: res.status === 400, expected: '400', actual: String(res.status) };
  });

  await test('VAL-02', '/request-access: missing lastName', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: 'Test', email: `val02-${state.runId}@test.com`, teamId: TEAM_ID,
      requestedRole: 'coach', deviceContext: DEVICE,
    });
    return { pass: res.status === 400, expected: '400', actual: String(res.status) };
  });

  await test('VAL-03', '/request-access: missing teamId', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: 'Test', lastName: 'User', email: `val03-${state.runId}@test.com`,
      requestedRole: 'coach', deviceContext: DEVICE,
    });
    return { pass: res.status === 400, expected: '400', actual: String(res.status) };
  });

  await test('VAL-04', '/request-access: missing role', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: 'Test', lastName: 'User', email: `val04-${state.runId}@test.com`,
      teamId: TEAM_ID, deviceContext: DEVICE,
    });
    return { pass: res.status === 400, expected: '400', actual: String(res.status) };
  });

  await test('VAL-05', '/request-access: invalid role value', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: 'Test', lastName: 'User', email: `val05-${state.runId}@test.com`,
      teamId: TEAM_ID, requestedRole: 'superadmin', deviceContext: DEVICE,
    });
    return { pass: res.status === 400, expected: '400', actual: String(res.status) };
  });

  await test('VAL-06', '/request-access: missing email', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: 'Test', lastName: 'User', teamId: TEAM_ID,
      requestedRole: 'coach', deviceContext: DEVICE,
    });
    // Phone was a valid alternative to email here until 2026-08-26 (#406/#410
    // survey removed it as dead code — the frontend never sent it). This now
    // fails email's own isEmail() validator (VALIDATION_ERROR), not the old
    // CONTACT_REQUIRED path.
    return { pass: res.status === 400, expected: '400 VALIDATION_ERROR', actual: String(res.status) };
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
    // loginLimiter runs before express-validator and is email-keyed
    // (ROADMAP Story 26), so a fixed email here would still consume budget
    // on every run and could eventually get 429 instead of the 400 this
    // test actually checks for. Unique per run, same as suite-rate-limits.js.
    const res = await post(BASE_URL, '/api/v1/auth/magic-link', {
      email: `val08-${process.pid}-${Date.now()}@test.com`, deviceContext: DEVICE,
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
    // #337: the route now derives requestId/teamId from a signed token
    // instead of raw query params, so reaching the "request not found" 404
    // path requires a validly-signed token pointing at an id that doesn't
    // exist — a bare requestId param (pre-#337 shape) never gets past the
    // route's own "missing token" check (see VAL-14/15) and can't exercise
    // this path at all.
    const { sign } = require('../../src/lib/approveLinkToken');
    const token = sign({ requestId: '00000000-0000-0000-0000-000000000000', teamId: TEAM_ID, action: 'approve' });
    const res = await fetch(`${BASE_URL}/api/v1/admin/approve-link?token=${encodeURIComponent(token)}`);
    return { pass: res.status === 404, expected: '404', actual: String(res.status) };
  });

}

module.exports = { run };
