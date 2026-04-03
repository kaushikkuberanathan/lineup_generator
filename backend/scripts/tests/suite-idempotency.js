/**
 * suite-idempotency.js
 * Verifies state consistency — duplicates blocked, re-processing handled.
 * Category 6.
 *
 * Seed strategy: all tests share a single access_request created in an upfront
 * seed block. If the seed fails, every test skips with a clear reason.
 * Tests IDEM-03/04/05 each fetch the request fresh so they never depend on
 * runtime state from a prior test's execution.
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
  const TEST_EMAIL = `idempotency-suite-${state.runId}@test.com`;

  // ─── Upfront seed ────────────────────────────────────────────────────────────
  // Create one access_request that all tests below will operate on.
  // If this fails, all tests in this suite skip rather than giving confusing errors.

  let seedRequestId = null;
  let seedFailed = false;

  try {
    const seedRes = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: 'Idem', lastName: 'Test',
      email: TEST_EMAIL, teamId: TEAM_ID,
      requestedRole: 'coach', deviceContext: DEVICE,
    });
    const seedData = await seedRes.json();
    if (seedRes.status === 201 && seedData.requestId) {
      seedRequestId = seedData.requestId;
      if (!state.testEmails) state.testEmails = [];
      state.testEmails.push(TEST_EMAIL);
    } else {
      seedFailed = `Seed POST returned ${seedRes.status} ${JSON.stringify(seedData)}`;
    }
  } catch (err) {
    seedFailed = `Seed POST threw: ${err.message}`;
  }

  // ─── IDEM-01: First request-access succeeds ──────────────────────────────────

  await test('IDEM-01', 'First request-access succeeds (verified via seed)', async () => {
    if (seedFailed) return { pass: false, expected: '201 success=true', actual: `Seed failed: ${seedFailed}` };
    return {
      pass: seedRequestId !== null,
      expected: '201 with requestId',
      actual: seedRequestId ? `201 requestId=${seedRequestId}` : 'No requestId in seed response',
    };
  });

  // ─── IDEM-02: Duplicate blocked ──────────────────────────────────────────────

  await test('IDEM-02', 'Duplicate request-access returns REQUEST_PENDING', async () => {
    if (seedFailed) return { pass: false, expected: '409 REQUEST_PENDING', actual: `Seed failed: ${seedFailed}` };
    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: 'Idem', lastName: 'Test',
      email: TEST_EMAIL, teamId: TEAM_ID,
      requestedRole: 'coach', deviceContext: DEVICE,
    });
    const data = await res.json();
    return {
      pass: res.status === 409 && data.error === 'REQUEST_PENDING',
      expected: '409 REQUEST_PENDING',
      actual: `${res.status} ${data.error}`,
    };
  });

  // ─── IDEM-03: Approve-link succeeds ─────────────────────────────────────────

  await test('IDEM-03', 'Approve-link succeeds on pending request', async () => {
    if (seedFailed || !seedRequestId) return { pass: false, expected: '200 HTML Approved!', actual: `Seed failed: ${seedFailed || 'no requestId'}` };
    const res = await fetch(`${BASE_URL}/api/v1/admin/approve-link?requestId=${seedRequestId}&teamId=${TEAM_ID}`);
    const text = await res.text();
    return {
      pass: res.status === 200 && text.includes('Approved!'),
      expected: '200 HTML Approved!',
      actual: `${res.status} contains-Approved=${text.includes('Approved!')}`,
    };
  });

  // ─── IDEM-04: Re-approve blocked ─────────────────────────────────────────────

  await test('IDEM-04', 'Approve-link returns Already Processed on re-approve', async () => {
    if (seedFailed || !seedRequestId) return { pass: false, expected: '200 Already Processed', actual: `Seed failed: ${seedFailed || 'no requestId'}` };
    // Re-fetch after IDEM-03 approved it — idempotency check
    const res = await fetch(`${BASE_URL}/api/v1/admin/approve-link?requestId=${seedRequestId}&teamId=${TEAM_ID}`);
    const text = await res.text();
    return {
      pass: res.status === 200 && text.includes('Already Processed'),
      expected: '200 HTML Already Processed',
      actual: `${res.status} contains-AlreadyProcessed=${text.includes('Already Processed')}`,
    };
  });

  // ─── IDEM-05: Deny-link on approved request ───────────────────────────────────

  await test('IDEM-05', 'Deny-link returns Already Processed on approved request', async () => {
    if (seedFailed || !seedRequestId) return { pass: false, expected: '200 Already Processed', actual: `Seed failed: ${seedFailed || 'no requestId'}` };
    const res = await fetch(`${BASE_URL}/api/v1/admin/deny-link?requestId=${seedRequestId}`);
    const text = await res.text();
    return {
      pass: res.status === 200 && text.includes('Already Processed'),
      expected: '200 HTML Already Processed',
      actual: `${res.status} contains-AlreadyProcessed=${text.includes('Already Processed')}`,
    };
  });

  // ─── IDEM-06: Nonexistent requestId — no seed dependency ─────────────────────

  await test('IDEM-06', 'Approve-link with nonexistent requestId returns Not Found', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/approve-link?requestId=00000000-0000-0000-0000-000000000000&teamId=${TEAM_ID}`);
    const text = await res.text();
    return {
      pass: res.status === 404 && text.includes('Not Found'),
      expected: '404 HTML Not Found',
      actual: `${res.status} contains-NotFound=${text.includes('Not Found')}`,
    };
  });

}

module.exports = { run };
