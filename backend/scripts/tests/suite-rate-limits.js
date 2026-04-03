/**
 * suite-rate-limits.js
 * Verifies rate limiting blocks brute-force attempts.
 * Category 5.
 *
 * Note: magic-link endpoint relies on Supabase's built-in rate limiting.
 * RATE-01 tests that the endpoint responds consistently (403 for no membership).
 *
 * WARNING: Running this suite will temporarily block your test email
 * from the magic-link endpoint for up to 15 minutes.
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

  // RATE-01a: single request with no membership → 403 (membership check fires before Supabase OTP)
  await test('RATE-01a', 'Magic link: unknown email returns 403 NOT_APPROVED', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/magic-link', {
      email: TEST_EMAIL, teamId: TEAM_ID, deviceContext: DEVICE,
    });
    const body = await res.json().catch(() => ({}));
    return {
      pass: res.status === 403 && body.error === 'NOT_APPROVED',
      expected: '403 NOT_APPROVED',
      actual: `${res.status} ${body.error || '(no error field)'}`,
    };
  });

  // RATE-01b: rapid-fire 11 requests → 429 from express-rate-limit before Supabase is hit
  await test('RATE-01b', 'Magic link: 11th rapid attempt → 429 from rate limiter', async () => {
    let hit429 = false;
    let lastStatus = null;
    for (let i = 0; i < 11; i++) {
      const res = await post(BASE_URL, '/api/v1/auth/magic-link', {
        email: `rate-b-${i}@test.com`, teamId: TEAM_ID, deviceContext: DEVICE,
      });
      lastStatus = res.status;
      if (res.status === 429) { hit429 = true; break; }
    }
    return {
      pass: hit429,
      expected: '429 on or before 11th attempt',
      actual: hit429 ? '429 received' : `No 429 after 11 attempts — last status: ${lastStatus}`,
    };
  });


}

module.exports = { run };
