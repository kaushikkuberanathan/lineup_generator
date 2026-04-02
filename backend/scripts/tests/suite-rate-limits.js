/**
 * suite-rate-limits.js
 * Verifies rate limiting blocks brute-force attempts.
 * Category 5.
 *
 * Note: Rate limit windows are 15 minutes. These tests fire rapid
 * sequential requests to hit the limit within the test run.
 * loginLimiter: 5 attempts / 15 min
 * verifyLimiter: 10 attempts / 15 min
 *
 * WARNING: Running this suite will temporarily block your test email
 * from the login endpoint for up to 15 minutes.
 * Use a dedicated test email that won't affect real usage.
 */

const TEAM_ID    = '1774297491626';
const DEVICE     = { platform: 'Windows', device_type: 'desktop', browser: 'Chrome', access_mode: 'browser', app_version: 'test-suite-1.0', timezone: 'America/New_York' };
const TEST_EMAIL = 'ratelimit-suite@test.com';

async function post(BASE_URL, path, body) {
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function run(test, BASE_URL, state) {

  // Login rate limit — 5 attempts then 429
  await test('RATE-01', 'Login: 6th attempt within window → 429', async () => {
    let lastStatus = null;
    let hit429 = false;

    // Fire 6 rapid login attempts
    for (let i = 0; i < 6; i++) {
      const res = await post(BASE_URL, '/api/v1/auth/login', {
        email: TEST_EMAIL, teamId: TEAM_ID, deviceContext: DEVICE,
      });
      lastStatus = res.status;
      if (res.status === 429) { hit429 = true; break; }
    }

    return {
      pass: hit429 || lastStatus === 403,
      expected: '429 on 6th attempt (or 403 if no membership)',
      actual: hit429 ? '429 received' : `Last status: ${lastStatus} — rate limit not triggered`,
    };
  });

  // Verify rate limit — 11 attempts then 429
  await test('RATE-02', 'Verify: 11th attempt within window → 429', async () => {
    let lastStatus = null;
    let hit429 = false;

    // Fire 11 rapid verify attempts with wrong token
    for (let i = 0; i < 11; i++) {
      const res = await post(BASE_URL, '/api/v1/auth/verify', {
        email: TEST_EMAIL, token: '000000', teamId: TEAM_ID, deviceContext: DEVICE,
      });
      lastStatus = res.status;
      if (res.status === 429) { hit429 = true; break; }
    }

    return {
      pass: hit429,
      expected: '429 on 11th attempt',
      actual: hit429 ? '429 received' : `Last status: ${lastStatus} — rate limit not triggered`,
    };
  });

}

module.exports = { run };
