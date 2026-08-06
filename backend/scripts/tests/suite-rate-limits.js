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

  // RATE-01b: un-skipped 2026-08-05 (issue #586). The email-keying fix
  // (Story 26/99) shipped to prod in v2.8.3 (2026-08-01) and has since
  // survived the v2.8.4 promote (2026-08-05) — a full release cycle live,
  // per the original skip condition. Live-probed directly against prod
  // before writing this assertion: same email, 6 rapid magic-link requests
  // → 5x 403 NOT_AUTHORIZED, 6th → 429 TOO_MANY_ATTEMPTS; a different email
  // from the same run immediately after → 403, not 429 (budgets are
  // per-email, not shared). Both properties now hold against the deployed
  // snapshot. Real RED→GREEN proof for the fix itself still lives in
  // backend/src/__tests__/loginLimiter.test.js (hermetic, in-process); this
  // test additionally confirms the fix is actually live in prod, not just
  // in code.
  await test('RATE-01b', 'Magic link: 6th rapid attempt within the 5-request budget → 429 from rate limiter', async () => {
    const email = `ratelimit-b-${process.pid}-${Date.now()}@test.com`;
    let lastRes;
    for (let i = 0; i < 6; i++) {
      lastRes = await post(BASE_URL, '/api/v1/auth/magic-link', {
        email, teamId: TEAM_ID, deviceContext: DEVICE,
      });
    }
    const body = await lastRes.json().catch(() => ({}));
    return {
      pass: lastRes.status === 429 && body.error === 'TOO_MANY_ATTEMPTS',
      expected: '429 TOO_MANY_ATTEMPTS on the 6th request',
      actual: `${lastRes.status} ${body.error || '(no error field)'}`,
    };
  });

  // RATE-01c: companion assertion — a different email is unaffected by
  // RATE-01b's exhausted budget (the actual bug Story 26 fixed: IP-keying
  // meant every caller behind one IP shared a single 5-request budget).
  await test('RATE-01c', 'Magic link: different email is unaffected by another email\'s exhausted budget', async () => {
    const email = `ratelimit-c-${process.pid}-${Date.now()}@test.com`;
    const res = await post(BASE_URL, '/api/v1/auth/magic-link', {
      email, teamId: TEAM_ID, deviceContext: DEVICE,
    });
    const body = await res.json().catch(() => ({}));
    return {
      pass: res.status === 403 && body.error === 'NOT_AUTHORIZED',
      expected: '403 NOT_AUTHORIZED (not 429 — separate budget)',
      actual: `${res.status} ${body.error || '(no error field)'}`,
    };
  });


}

module.exports = { run };
