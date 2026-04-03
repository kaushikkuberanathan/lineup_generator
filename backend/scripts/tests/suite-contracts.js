/**
 * suite-contracts.js
 * Verifies API response SHAPES — not just status codes.
 * A contract failure means an endpoint changed its response structure in a
 * breaking way that could silently corrupt frontend behaviour.
 *
 * Authenticated-only shapes (e.g. /admin/members members array) are marked
 * SKIP — run manually after logging in via the admin UI.
 *
 * CI_SAFE: CON-06 writes to a throwaway team ID and cleans up. Skipped in
 * CI_SAFE mode to avoid any writes against the prod DB.
 */

const TEAM_ID = '1774297491626';
const CI_SAFE = process.env.CI_SAFE === 'true';

async function run(test, BASE_URL, supabaseAdmin, state) {

  // ── CON-01: /ping shape ───────────────────────────────────────────────────────

  await test('CON-01', 'GET /ping — shape: {status:"ok", timestamp:<ISO>}', async () => {
    const res  = await fetch(`${BASE_URL}/ping`);
    const data = await res.json();
    const isIso = typeof data.timestamp === 'string' && /\d{4}-\d{2}-\d{2}T/.test(data.timestamp);
    return {
      pass: res.status === 200 && data.status === 'ok' && isIso,
      expected: '{ status: "ok", timestamp: ISO string }',
      actual:   `status=${data.status} timestamp=${typeof data.timestamp}(${data.timestamp?.slice(0,19)})`,
    };
  });

  // ── CON-02: /health shape ─────────────────────────────────────────────────────

  await test('CON-02', 'GET /health — shape: {status,uptime:number,timestamp,version:string}', async () => {
    const res  = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    const ok = data.status === 'ok'
      && typeof data.uptime  === 'number'
      && typeof data.timestamp === 'string'
      && typeof data.version  === 'string'
      && data.version.match(/^\d+\.\d+\.\d+$/);
    return {
      pass: res.status === 200 && !!ok,
      expected: '{ status:"ok", uptime:number, timestamp:string, version:"x.y.z" }',
      actual:   `status=${data.status} uptime=${typeof data.uptime} version=${data.version}`,
    };
  });

  // ── CON-03: /auth/me unauthenticated error shape ──────────────────────────────
  // Must be exactly { error: "UNAUTHORIZED" } — no extra keys, no nested objects.

  await test('CON-03', 'GET /auth/me unauthenticated — exactly {error:"UNAUTHORIZED"} (1 key)', async () => {
    const res  = await fetch(`${BASE_URL}/api/v1/auth/me`);
    const data = await res.json();
    const keys = Object.keys(data);
    return {
      pass: res.status === 401 && data.error === 'UNAUTHORIZED' && keys.length === 1,
      expected: '401 { error: "UNAUTHORIZED" } — exactly 1 key',
      actual:   `${res.status} keys=[${keys.join(',')}] error=${data.error}`,
    };
  });

  // ── CON-04: admin route unauthenticated error shape ───────────────────────────
  // Any 401 response from an admin route must have an `error` string field.

  await test('CON-04', 'GET /admin/requests unauthenticated — {error:<string>} present', async () => {
    const res  = await fetch(`${BASE_URL}/api/v1/admin/requests`);
    const data = await res.json();
    return {
      pass: res.status === 401 && typeof data.error === 'string' && data.error.length > 0,
      expected: '401 { error: <non-empty string> }',
      actual:   `${res.status} error=${JSON.stringify(data.error)}`,
    };
  });

  // ── CON-05: /admin/members authenticated shape — SKIP ────────────────────────
  // Requires a live admin JWT. Run manually: GET /api/v1/admin/members with
  // Authorization: Bearer <token>. Expect:
  //   { members: [{ membershipId, teamId, role, status, email, userId, ... }] }

  await test('CON-05', 'GET /admin/members — members[].{email,userId,role,status} present', async () => {
    return {
      skip: true,
      expected: '{ members: [{ email, userId, role, status, ... }] }',
      reason: 'Requires valid admin JWT — run manually after login via admin UI',
    };
  });

  // ── CON-06: POST /api/teams/:id/data shape ────────────────────────────────────
  // From localhost the route is accessible. Response must be exactly {ok:true}.

  await test('CON-06', 'POST /api/teams/:id/data (localhost) — returns {ok:boolean}', async () => {
    if (CI_SAFE) {
      return { skip: true, expected: '200 {ok:true}', reason: 'CI_SAFE: skipping DB write against prod' };
    }
    const testTeamId = `test-con-${state.runId}`;
    const res  = await fetch(`${BASE_URL}/api/teams/${testTeamId}/data`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        roster:      [{ id: 'p1', firstName: 'Con', lastName: 'Test' }],
        writeSource: 'test-suite',
      }),
    });
    const data = await res.json();
    // Cleanup
    if (supabaseAdmin) {
      await supabaseAdmin.from('team_data').delete().eq('team_id', testTeamId);
      await supabaseAdmin.from('team_data_history').delete().eq('team_id', testTeamId);
    }
    return {
      pass: res.status === 200 && data.ok === true && typeof data.ok === 'boolean',
      expected: '200 { ok: true } (ok is boolean)',
      actual:   `${res.status} ok=${data.ok} (${typeof data.ok})`,
    };
  });

  // ── CON-07: validation error shape ───────────────────────────────────────────
  // Every 400 validation error must have { error: "VALIDATION_ERROR", details: [...] }.

  await test('CON-07', 'POST /request-access empty body — {error,details:[]} validation shape', async () => {
    const res  = await fetch(`${BASE_URL}/api/v1/auth/request-access`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({}),
    });
    const data = await res.json();
    return {
      pass: res.status === 400
        && data.error === 'VALIDATION_ERROR'
        && Array.isArray(data.details)
        && data.details.length > 0,
      expected: '400 { error: "VALIDATION_ERROR", details: [..non-empty..] }',
      actual:   `${res.status} error=${data.error} details=${Array.isArray(data.details) ? data.details.length + ' items' : typeof data.details}`,
    };
  });

}

module.exports = { run };
