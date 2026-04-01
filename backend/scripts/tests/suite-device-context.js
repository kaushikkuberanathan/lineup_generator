/**
 * suite-device-context.js
 * Verifies device context is captured correctly in access_requests and auth_events.
 * Category 7.
 */

const TEAM_ID   = '1774297491626';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function post(BASE_URL, path, body) {
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function run(test, BASE_URL, supabaseAdmin, state) {
  const TEST_EMAIL = `device-ctx-suite-${state.runId}@test.com`;

  // Full device context stored correctly
  await test('DEV-01', 'Full device context stored in access_requests', async () => {
    const device = {
      platform: 'iOS', device_type: 'mobile', browser: 'Safari',
      browser_version: '17.4', os_version: '17.4', access_mode: 'pwa',
      app_version: 'test-suite-1.0', timezone: 'America/Chicago',
    };

    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: 'Device', lastName: 'Test',
      email: TEST_EMAIL, teamId: TEAM_ID,
      requestedRole: 'coach', deviceContext: device,
    });

    if (!state.testEmails) state.testEmails = [];
    state.testEmails.push(TEST_EMAIL);

    if (res.status !== 201) {
      const data = await res.json();
      return { pass: false, expected: '201', actual: `${res.status} ${data.error}` };
    }

    // Verify DB
    const { data: row } = await supabaseAdmin
      .from('access_requests')
      .select('platform, device_type, browser, access_mode, app_version, timezone')
      .eq('email', TEST_EMAIL)
      .maybeSingle();

    const ok = row?.platform === 'iOS' &&
               row?.device_type === 'mobile' &&
               row?.browser === 'Safari' &&
               row?.access_mode === 'pwa' &&
               row?.app_version === 'test-suite-1.0' &&
               row?.timezone === 'America/Chicago';

    return {
      pass: ok,
      expected: 'DB row has all device fields',
      actual: ok ? 'All fields match' : `platform=${row?.platform} device_type=${row?.device_type} access_mode=${row?.access_mode}`,
    };
  });

  // No device context — no crash
  await test('DEV-02', 'Missing deviceContext does not crash', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: 'NoDevice', lastName: 'Test',
      email: 'nodevice-suite@test.com', teamId: TEAM_ID,
      requestedRole: 'coach',
      // No deviceContext
    });
    state.testEmails.push('nodevice-suite@test.com');
    return {
      pass: res.status === 201 || res.status === 409,
      expected: '201 or 409 (no crash)',
      actual: String(res.status),
    };
  });

  // auth_events has device context
  await test('DEV-03', 'auth_events captures device context on access_requested', async () => {
    await delay(800);
    const before = new Date(Date.now() - 2 * 60 * 1000);
    const { data: row } = await supabaseAdmin
      .from('auth_events')
      .select('event_type, platform, device_type, access_mode, app_version')
      .eq('event_type', 'access_requested')
      .eq('app_version', 'test-suite-1.0')
      .eq('auth_channel', 'email')
      .gte('created_at', before.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      pass: row?.platform === 'iOS' && row?.access_mode === 'pwa',
      expected: 'auth_events row with platform=iOS access_mode=pwa',
      actual: row ? `platform=${row.platform} access_mode=${row.access_mode}` : 'no row found',
    };
  });

}

module.exports = { run };
