/**
 * suite-idempotency.js
 * Verifies state consistency — duplicates blocked, re-processing handled.
 * Category 6.
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

  let idemRequestId = null;

  // Create initial request
  await test('IDEM-01', 'First request-access succeeds', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: 'Idem', lastName: 'Test',
      email: TEST_EMAIL, teamId: TEAM_ID,
      requestedRole: 'coach', deviceContext: DEVICE,
    });
    const data = await res.json();
    idemRequestId = data.requestId;
    if (!state.testEmails) state.testEmails = [];
    state.testEmails.push(TEST_EMAIL);
    return {
      pass: res.status === 201 && data.success === true,
      expected: '201 success=true',
      actual: `${res.status} success=${data.success}`,
    };
  });

  // Duplicate blocked
  await test('IDEM-02', 'Duplicate request-access returns REQUEST_PENDING', async () => {
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

  // Approve it
  await test('IDEM-03', 'Approve-link succeeds on pending request', async () => {
    if (!idemRequestId) return { pass: false, expected: 'requestId from IDEM-01', actual: 'IDEM-01 failed — no requestId' };
    const res = await fetch(`${BASE_URL}/api/v1/admin/approve-link?requestId=${idemRequestId}&teamId=${TEAM_ID}`);
    const text = await res.text();
    return {
      pass: res.status === 200 && text.includes('Approved!'),
      expected: '200 HTML Approved!',
      actual: `${res.status} contains-Approved=${text.includes('Approved!')}`,
    };
  });

  // Re-approve blocked
  await test('IDEM-04', 'Approve-link returns Already Processed on re-approve', async () => {
    if (!idemRequestId) return { pass: false, expected: 'requestId from IDEM-01', actual: 'IDEM-01 failed — no requestId' };
    const res = await fetch(`${BASE_URL}/api/v1/admin/approve-link?requestId=${idemRequestId}&teamId=${TEAM_ID}`);
    const text = await res.text();
    return {
      pass: res.status === 200 && text.includes('Already Processed'),
      expected: '200 HTML Already Processed',
      actual: `${res.status} contains-AlreadyProcessed=${text.includes('Already Processed')}`,
    };
  });

  // Deny-link on already-approved
  await test('IDEM-05', 'Deny-link returns Already Processed on approved request', async () => {
    if (!idemRequestId) return { pass: false, expected: 'requestId from IDEM-01', actual: 'IDEM-01 failed — no requestId' };
    const res = await fetch(`${BASE_URL}/api/v1/admin/deny-link?requestId=${idemRequestId}`);
    const text = await res.text();
    return {
      pass: res.status === 200 && text.includes('Already Processed'),
      expected: '200 HTML Already Processed',
      actual: `${res.status} contains-AlreadyProcessed=${text.includes('Already Processed')}`,
    };
  });

  // Nonexistent requestId
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
