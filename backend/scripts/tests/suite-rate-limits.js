/**
 * suite-rate-limits.js
 * Verifies rate limiting blocks brute-force attempts.
 * Category 5.
 *
 * The magic-link endpoint is rate-limited by this app's own loginLimiter
 * (backend/src/routes/auth.js, express-rate-limit, 5 req / 15 min, keyed by
 * email — ROADMAP Story 26), not by anything Supabase provides.
 * RATE-01a tests that the endpoint responds consistently (403 for no
 * membership); RATE-01b tests that the limiter itself actually fires.
 *
 * WARNING: Running this suite will temporarily block each test email used
 * from the magic-link endpoint for up to 15 minutes. Each test generates its
 * own unique email per run, so this never affects real usage or collides
 * across runs.
 */

const TEAM_ID    = '1774297491626';
const DEVICE     = { platform: 'Windows', device_type: 'desktop', browser: 'Chrome', access_mode: 'browser', app_version: 'test-suite-1.0', timezone: 'America/New_York' };
// Unique per process run (ROADMAP Story 26, defense in depth) — loginLimiter
// is now email-keyed, not IP-keyed, so a fixed email here would still share
// one 5-request/15-minute budget across every CI run that happens to land
// in the same window. A fresh email per run gives every run its own budget
// regardless of how many other runs are in flight.
const TEST_EMAIL = `ratelimit-suite-${process.pid}-${Date.now()}@test.com`;

async function post(BASE_URL, path, body) {
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function run(test, BASE_URL, state) {

  // RATE-01a: single request with no membership → 403 (membership check fires before Supabase OTP)
  await test('RATE-01a', 'Magic link: unknown email returns 403 NOT_AUTHORIZED', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/magic-link', {
      email: TEST_EMAIL, teamId: TEAM_ID, deviceContext: DEVICE,
    });
    const body = await res.json().catch(() => ({}));
    return {
      pass: res.status === 403 && body.error === 'NOT_AUTHORIZED',
      expected: '403 NOT_AUTHORIZED',
      actual: `${res.status} ${body.error || '(no error field)'}`,
    };
  });

  // RATE-01b: was a permanent [SKIPPED] stub — "tests share the CI runner IP
  // pool" (ROADMAP Story 26). loginLimiter is now email-keyed with a fresh
  // email per suite run (see TEST_EMAIL above), so that blocker no longer
  // applies: this run's budget cannot collide with any other run's, past or
  // concurrent. Uses its own dedicated email, separate from RATE-01a's, so
  // this test's result never depends on RATE-01a having run first.
  //
  // max is 5 (backend/src/routes/auth.js loginLimiter) — the first 5 requests
  // reach the route handler and get membership-check 403s (same as RATE-01a,
  // and each one writes an access_denied row to auth_events, exactly as
  // RATE-01a already does today); the 6th is stopped by the rate-limit
  // middleware itself before reaching the handler, so it does not.
  await test('RATE-01b', 'Magic link: 6th rapid attempt within the 5-request budget → 429 from rate limiter', async () => {
    const rateLimitEmail = `ratelimit-suite-b-${process.pid}-${Date.now()}@test.com`;
    const results = [];
    for (let i = 0; i < 6; i++) {
      const res = await post(BASE_URL, '/api/v1/auth/magic-link', {
        email: rateLimitEmail, teamId: TEAM_ID, deviceContext: DEVICE,
      });
      results.push(res.status);
    }
    const firstFive = results.slice(0, 5);
    const sixth = results[5];
    const firstFiveOk = firstFive.every((s) => s === 403);
    return {
      pass: firstFiveOk && sixth === 429,
      expected: '[403,403,403,403,403,429]',
      actual: `[${results.join(',')}]`,
    };
  });


}

module.exports = { run };
