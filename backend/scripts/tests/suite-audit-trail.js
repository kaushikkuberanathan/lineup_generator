/**
 * suite-audit-trail.js
 * Verifies auth_events are written for every auth action.
 * Category 8.
 */

const TEAM_ID = '1774297491626';
const DEVICE  = { platform: 'Windows', device_type: 'desktop', browser: 'Chrome', access_mode: 'browser', app_version: 'test-suite-1.0', timezone: 'America/New_York' };
const delay   = ms => new Promise(resolve => setTimeout(resolve, ms));

async function post(BASE_URL, path, body) {
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function run(test, BASE_URL, supabaseAdmin, state) {
  const TEST_EMAIL = `audit-suite-${state.runId}@test.com`;

  let auditRequestId = null;

  // access_requested event
  await test('AUD-01', 'access_requested event logged on request-access', async () => {
    const before = new Date();

    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: 'Audit', lastName: 'Suite',
      email: TEST_EMAIL, teamId: TEAM_ID,
      requestedRole: 'coach', deviceContext: DEVICE,
    });
    const data = await res.json();
    auditRequestId = data.requestId;
    if (!state.testEmails) state.testEmails = [];
    state.testEmails.push(TEST_EMAIL);

    await delay(800);
    const { data: event } = await supabaseAdmin
      .from('auth_events')
      .select('event_type, auth_channel, team_id')
      .eq('event_type', 'access_requested')
      .eq('auth_channel', 'email')
      .gte('created_at', before.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      pass: !!event && event.team_id === TEAM_ID,
      expected: 'auth_events row event_type=access_requested',
      actual: event ? `event_type=${event.event_type} channel=${event.auth_channel}` : 'no event found',
    };
  });

  // otp_requested event
  await test('AUD-02', 'otp_requested event logged on login', async () => {
    return {
      skip: true,
      expected: 'auth_events row event_type=otp_requested',
      reason: 'Depends on OTP send — Supabase rate limits rapid OTP requests',
    };
  });

  // access_denied event (login with no membership)
  await test('AUD-03', 'access_denied event logged on unauthorized login attempt', async () => {
    return {
      skip: true,
      expected: 'auth_events row event_type=access_denied',
      reason: 'Depends on OTP send to unknown email — Supabase rate limits rapid OTP requests',
    };
  });

  // otp_failed event
  await test('AUD-04', 'otp_failed event logged on wrong OTP', async () => {
    return {
      skip: true,
      expected: 'auth_events row event_type=otp_failed',
      reason: 'OTP verify route removed — replaced by magic link flow',
    };
  });

  // otp_verified event — manual
  await test('AUD-05', 'otp_verified event logged on successful verify', async () => {
    return {
      skip: true,
      expected: 'auth_events row event_type=otp_verified',
      reason: 'Requires live OTP — run manually',
    };
  });

  // auth_events has correct team_id
  await test('AUD-06', 'auth_events team_id matches request', async () => {
    const { data: event } = await supabaseAdmin
      .from('auth_events')
      .select('team_id, event_type')
      .eq('event_type', 'access_requested')
      .eq('team_id', TEAM_ID)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      pass: event?.team_id === TEAM_ID,
      expected: `team_id=${TEAM_ID}`,
      actual: `team_id=${event?.team_id}`,
    };
  });

}

module.exports = { run };
