const BASE = 'http://localhost:3000';

async function run() {
  const results = [];
  let E2E_REQUEST_ID = null;

  function record(id, desc, expected, actual, pass) {
    results.push({ id, desc, expected, actual, pass });
  }

  // TEST 1a
  try {
    const r = await fetch(BASE + '/health');
    const j = await r.json();
    record('1a', 'GET /health', 'status ok', JSON.stringify(j), j.status === 'ok' ? 'PASS' : 'FAIL');
  } catch(e) { record('1a', 'GET /health', 'status ok', e.message, 'FAIL'); }

  // TEST 1b
  try {
    const r = await fetch(BASE + '/ping');
    const j = await r.json();
    record('1b', 'GET /ping', 'status ok', JSON.stringify(j), j.status === 'ok' ? 'PASS' : 'FAIL');
  } catch(e) { record('1b', 'GET /ping', 'status ok', e.message, 'FAIL'); }

  // TEST 2a
  try {
    const r = await fetch(BASE + '/api/v1/auth/request-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'End', lastName: 'Test', email: 'endtoend@gmail.com',
        teamId: '1774297491626', requestedRole: 'coach',
        deviceContext: { platform: 'Windows', device_type: 'desktop', browser: 'Chrome', access_mode: 'browser', app_version: '1.7.1', timezone: 'America/New_York' }
      })
    });
    const j = await r.json();
    if (j.success && j.requestId) E2E_REQUEST_ID = j.requestId;
    record('2a', 'POST /auth/request-access (new)', 'success true + requestId', JSON.stringify(j), (j.success && j.requestId) ? 'PASS' : 'FAIL');
  } catch(e) { record('2a', 'POST /auth/request-access (new)', 'success true + requestId', e.message, 'FAIL'); }

  // TEST 2b
  try {
    const r = await fetch(BASE + '/api/v1/auth/request-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'End', lastName: 'Test', email: 'endtoend@gmail.com',
        teamId: '1774297491626', requestedRole: 'coach',
        deviceContext: { platform: 'Windows', device_type: 'desktop', browser: 'Chrome', access_mode: 'browser', app_version: '1.7.1', timezone: 'America/New_York' }
      })
    });
    const j = await r.json();
    record('2b', 'POST /auth/request-access (duplicate)', 'error REQUEST_PENDING', JSON.stringify(j), j.error === 'REQUEST_PENDING' ? 'PASS' : 'FAIL');
  } catch(e) { record('2b', 'POST /auth/request-access (duplicate)', 'error REQUEST_PENDING', e.message, 'FAIL'); }

  // TEST 2c
  try {
    const r = await fetch(BASE + '/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'kaushik.kuberanathan@gmail.com', teamId: '1774297491626',
        deviceContext: { platform: 'Windows', device_type: 'desktop', browser: 'Chrome', access_mode: 'browser', app_version: '1.7.1', timezone: 'America/New_York' }
      })
    });
    const j = await r.json();
    record('2c', 'POST /auth/login (valid member)', 'success true + channel email', JSON.stringify(j), (j.success && j.channel === 'email') ? 'PASS' : 'FAIL');
  } catch(e) { record('2c', 'POST /auth/login (valid member)', 'success true + channel email', e.message, 'FAIL'); }

  // TEST 2d MANUAL
  record('2d', 'POST /auth/verify (OTP)', 'session + user object', 'SKIPPED - requires live OTP from email', 'MANUAL');

  // TEST 2e
  try {
    const r = await fetch(BASE + '/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nobody@gmail.com', teamId: '1774297491626',
        deviceContext: { platform: 'Windows', device_type: 'desktop', browser: 'Chrome', access_mode: 'browser', app_version: '1.7.1', timezone: 'America/New_York' }
      })
    });
    const j = await r.json();
    record('2e', 'POST /auth/login (no membership)', 'error NOT_AUTHORIZED', JSON.stringify(j), j.error === 'NOT_AUTHORIZED' ? 'PASS' : 'FAIL');
  } catch(e) { record('2e', 'POST /auth/login (no membership)', 'error NOT_AUTHORIZED', e.message, 'FAIL'); }

  // TEST 3a/3b MANUAL
  record('3a', 'GET /auth/me (authenticated)', 'profile + memberships', 'SKIPPED - requires Bearer token from OTP verify', 'MANUAL');
  record('3b', 'POST /auth/logout (authenticated)', 'success true', 'SKIPPED - requires Bearer token from OTP verify', 'MANUAL');

  // TEST 4a
  try {
    const url = BASE + '/api/v1/admin/approve-link?requestId=' + E2E_REQUEST_ID + '&teamId=1774297491626';
    const r = await fetch(url);
    const text = await r.text();
    const pass = text.includes('Approved!') ? 'PASS' : 'FAIL';
    const snippet = text.includes('Approved!') ? 'HTML contains Approved!' : ('HTML: ' + text.slice(0, 150));
    record('4a', 'GET /admin/approve-link (valid)', 'HTML contains Approved!', snippet, pass);
  } catch(e) { record('4a', 'GET /admin/approve-link (valid)', 'HTML contains Approved!', e.message, 'FAIL'); }

  // TEST 4b
  try {
    const url = BASE + '/api/v1/admin/approve-link?requestId=' + E2E_REQUEST_ID + '&teamId=1774297491626';
    const r = await fetch(url);
    const text = await r.text();
    const pass = text.includes('Already Processed') ? 'PASS' : 'FAIL';
    const snippet = text.includes('Already Processed') ? 'HTML contains Already Processed' : ('HTML: ' + text.slice(0, 150));
    record('4b', 'GET /admin/approve-link (repeat)', 'HTML contains Already Processed', snippet, pass);
  } catch(e) { record('4b', 'GET /admin/approve-link (repeat)', 'HTML contains Already Processed', e.message, 'FAIL'); }

  // TEST 5a
  try {
    const r = await fetch(BASE + '/generate-lineup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players: ['Alice','Bob','Charlie','Dave','Eve','Frank','Grace','Henry','Iris','Jack','Karen'] })
    });
    const j = await r.json();
    const pass = Array.isArray(j.lineup) && j.lineup.length === 11 ? 'PASS' : 'FAIL';
    record('5a', 'POST /generate-lineup (11 players)', 'lineup array length 11', 'lineup length: ' + (j.lineup ? j.lineup.length : 'N/A'), pass);
  } catch(e) { record('5a', 'POST /generate-lineup (11 players)', 'lineup array length 11', e.message, 'FAIL'); }

  console.log('E2E_REQUEST_ID: ' + E2E_REQUEST_ID);
  console.log('');
  console.log('| Test ID | Description | Expected | Actual Response | Pass/Fail |');
  console.log('|---------|-------------|----------|-----------------|-----------|');
  for (const r of results) {
    console.log('| ' + r.id + ' | ' + r.desc + ' | ' + r.expected + ' | ' + r.actual + ' | ' + r.pass + ' |');
  }
}

run().catch(console.error);
