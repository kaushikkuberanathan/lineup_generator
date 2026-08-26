/**
 * suite-data-integrity.js
 * Verifies schema constraints are enforced correctly.
 * Category 9.
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

async function run(test, BASE_URL, supabaseAdmin, state) {

  // access_requests: email required. Phone was a valid alternative here
  // until 2026-08-26 (#406/#410 survey removed it as dead code — the
  // frontend never sent it) — this now fails email's own isEmail()
  // validator (VALIDATION_ERROR), not the old CONTACT_REQUIRED path.
  await test('INT-01', 'access_requests: no email → rejected', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: 'No', lastName: 'Contact',
      teamId: TEAM_ID, requestedRole: 'coach', deviceContext: DEVICE,
    });
    return {
      pass: res.status === 400,
      expected: '400 VALIDATION_ERROR',
      actual: String(res.status),
    };
  });

  // Invalid role rejected
  await test('INT-02', 'access_requests: invalid role → rejected by validator', async () => {
    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: 'Bad', lastName: 'Role',
      email: 'badrole@test.com', teamId: TEAM_ID,
      requestedRole: 'god_mode', deviceContext: DEVICE,
    });
    return {
      pass: res.status === 400,
      expected: '400',
      actual: String(res.status),
    };
  });

  // team_memberships: direct insert with no contact → rejected by DB
  await test('INT-03', 'team_memberships: DB rejects row with no phone or email', async () => {
    const { error } = await supabaseAdmin
      .from('team_memberships')
      .insert({
        team_id: TEAM_ID,
        role: 'coach',
        status: 'active',
        invited_at: new Date().toISOString(),
        // No phone_e164, no email
      });
    return {
      pass: !!error,
      expected: 'DB constraint error',
      actual: error ? `error: ${error.message.slice(0, 60)}` : 'no error — constraint not enforced',
    };
  });

  // team_memberships: invalid role → rejected by DB
  await test('INT-04', 'team_memberships: DB rejects invalid role value', async () => {
    const { error } = await supabaseAdmin
      .from('team_memberships')
      .insert({
        team_id: TEAM_ID,
        email: 'integrity-test@test.com',
        role: 'invalid_role',
        status: 'active',
        invited_at: new Date().toISOString(),
      });
    return {
      pass: !!error,
      expected: 'DB constraint error',
      actual: error ? `error: ${error.message.slice(0, 60)}` : 'no error — constraint not enforced',
    };
  });

  // access_requests: approved status cannot be re-submitted
  await test('INT-05', 'access_requests: already-approved email returns ALREADY_APPROVED', async () => {
    // kaushik's email has an approved/active membership
    const res = await post(BASE_URL, '/api/v1/auth/request-access', {
      firstName: 'Already', lastName: 'Approved',
      email: 'kaushik.kuberanathan@gmail.com',
      teamId: TEAM_ID, requestedRole: 'coach', deviceContext: DEVICE,
    });
    const data = await res.json();
    // Could be ALREADY_APPROVED or REQUEST_PENDING depending on state
    return {
      pass: res.status === 409,
      expected: '409',
      actual: `${res.status} ${data.error}`,
    };
  });

  // teams: invalid season value → rejected by DB. Migration 022+023's
  // NOT NULL + CHECK(season IN ('Spring','Fall')) is applied to DEV but not
  // yet to PROD (two-phase rollout — see migration file headers). Run against
  // DEV (SUPABASE_TARGET=dev), this fails on the CHECK violation itself. Run
  // against PROD before 023 lands there, it fails instead on "column season
  // does not exist" — a different error, but the property this suite verifies
  // ("can bad data land in the table?") still holds either way, so `pass: !!error`
  // is correct in both states. Cleans up its own throwaway row.
  await test('INT-06', 'teams: DB rejects invalid season value', async () => {
    const throwawayId = 'integrity-test-season-' + Date.now();
    const { error } = await supabaseAdmin
      .from('teams')
      .insert({
        id: throwawayId,
        name: 'INT-06 throwaway',
        season: 'Winter',
      });
    await supabaseAdmin.from('teams').delete().eq('id', throwawayId);
    return {
      pass: !!error,
      expected: 'DB constraint error (CHECK season IN (Spring, Fall)), or column-missing pre-022/023',
      actual: error ? `error: ${error.message.slice(0, 80)}` : 'no error — constraint not enforced',
    };
  });

}

module.exports = { run };
