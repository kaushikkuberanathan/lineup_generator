/**
 * suite-team-data.js
 * Tests for POST /api/teams/:teamId/data and GET /api/teams/:teamId/history.
 *
 * NOTE: There is no GET /api/teams/:teamId/data endpoint. The frontend reads
 * team data directly via the Supabase anon client. This backend endpoint is
 * used only for protected writes (scripts, migrations, admin ops).
 *
 * Auth: isAdminRequest — passes for localhost OR valid X-Admin-Key header.
 * The test runner hits a local server, so all requests qualify automatically.
 *
 * CI_SAFE: TD-02 and TD-03 write to a throwaway test team ID and clean up.
 * In CI_SAFE mode these are skipped to avoid any writes against the prod DB.
 * TD-04 is a safe read+reject (ROSTER_WIPE_GUARD blocks before any write).
 */

const TEAM_ID      = '1774297491626';        // Mud Hens — has existing players
const TEST_TEAM_ID = 'test-td-suite';        // throwaway — written + cleaned up

const CI_SAFE = process.env.CI_SAFE === 'true';

async function run(test, BASE_URL, supabaseAdmin, state) {

  // ── TD-01: non-admin rejected ────────────────────────────────────────────────
  // isAdminRequest always passes from localhost — cannot test 403 from this runner.

  await test('TD-01', 'POST /api/teams/:id/data — non-admin → 403 FORBIDDEN', async () => {
    return {
      skip: true,
      expected: '403 FORBIDDEN',
      reason: 'isAdminRequest passes for all localhost requests — test manually from non-localhost client',
    };
  });

  // ── TD-02: valid roster write ────────────────────────────────────────────────

  await test('TD-02', 'POST /api/teams/:id/data — valid roster → 200 {ok:true}', async () => {
    if (CI_SAFE) {
      return { skip: true, expected: '200 {ok:true}', reason: 'CI_SAFE: skipping DB write against prod' };
    }
    const res = await fetch(`${BASE_URL}/api/teams/${TEST_TEAM_ID}/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.ADMIN_KEY ? { 'X-Admin-Key': process.env.ADMIN_KEY } : {})
      },
      body: JSON.stringify({
        roster:      [{ id: 'p1', firstName: 'Test', lastName: 'Player' }],
        schedule:    [],
        writeSource: 'test-suite',
      }),
    });
    const data = await res.json();
    return {
      pass: res.status === 200 && data.ok === true,
      expected: '200 { ok: true }',
      actual:   `${res.status} ok=${data.ok}`,
    };
  });

  // ── TD-03: empty roster on new team (no wipe guard) ─────────────────────────

  await test('TD-03', 'POST empty roster on new team → 200 (wipe guard not triggered)', async () => {
    if (CI_SAFE) {
      return { skip: true, expected: '200 {ok:true}', reason: 'CI_SAFE: skipping DB write against prod' };
    }
    const emptyTeamId = `test-td-empty-${state.runId}`;
    const res = await fetch(`${BASE_URL}/api/teams/${emptyTeamId}/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.ADMIN_KEY ? { 'X-Admin-Key': process.env.ADMIN_KEY } : {})
      },
      body: JSON.stringify({ roster: [], writeSource: 'test-suite' }),
    });
    const data = await res.json();
    // Clean up immediately
    if (supabaseAdmin) {
      await supabaseAdmin.from('team_data').delete().eq('team_id', emptyTeamId);
    }
    return {
      pass: res.status === 200 && data.ok === true,
      expected: '200 { ok: true }',
      actual:   `${res.status} ok=${data.ok}`,
    };
  });

  // ── TD-04: wipe guard blocks empty write on live team ────────────────────────
  // Safe: the guard reads current roster then refuses the write — no data changes.

  await test('TD-04', 'POST empty roster on live team → 409 ROSTER_WIPE_GUARD', async () => {
    const res = await fetch(`${BASE_URL}/api/teams/${TEAM_ID}/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.ADMIN_KEY ? { 'X-Admin-Key': process.env.ADMIN_KEY } : {})
      },
      body: JSON.stringify({ roster: [], writeSource: 'test-suite' }),
    });
    const data = await res.json();
    return {
      pass: res.status === 409 && data.error === 'ROSTER_WIPE_GUARD',
      expected: '409 ROSTER_WIPE_GUARD',
      actual:   `${res.status} ${data.error}`,
    };
  });

  // ── TD-05: force:true override ───────────────────────────────────────────────
  // Skipped: would overwrite the live Mud Hens roster with an empty array.

  await test('TD-05', 'POST empty roster + force:true bypasses wipe guard → 200', async () => {
    return {
      skip: true,
      expected: '200 { ok: true }',
      reason: 'Would write empty roster to live Mud Hens team — run manually with a dedicated test team',
    };
  });

  // ── TD-06: history returns snapshots array ───────────────────────────────────

  await test('TD-06', 'GET /api/teams/:id/history → 200 { snapshots: [...] }', async () => {
    const res = await fetch(`${BASE_URL}/api/teams/${TEAM_ID}/history`, {
      headers: { ...(process.env.ADMIN_KEY ? { 'X-Admin-Key': process.env.ADMIN_KEY } : {}) }
    });
    const data = await res.json();
    return {
      pass: res.status === 200 && Array.isArray(data.snapshots),
      expected: '200 { snapshots: array }',
      actual:   `${res.status} snapshots=${Array.isArray(data.snapshots) ? data.snapshots.length + ' items' : typeof data.snapshots}`,
    };
  });

  // ── TD-07: snapshot shape ────────────────────────────────────────────────────

  await test('TD-07', 'GET /history — snapshots have id, team_id, roster_count, written_at', async () => {
    const res = await fetch(`${BASE_URL}/api/teams/${TEAM_ID}/history`, {
      headers: { ...(process.env.ADMIN_KEY ? { 'X-Admin-Key': process.env.ADMIN_KEY } : {}) }
    });
    const data = await res.json();
    const snap = data.snapshots?.[0];
    if (!snap) {
      return {
        skip: true,
        expected: '{ id, team_id, roster_count, written_at }',
        reason: 'No history rows found for Mud Hens — write at least one snapshot first',
      };
    }
    const hasShape = 'id' in snap && 'team_id' in snap && 'roster_count' in snap && 'written_at' in snap;
    return {
      pass: hasShape,
      expected: 'id, team_id, roster_count, written_at all present',
      actual:   `keys: [${Object.keys(snap).join(', ')}]`,
    };
  });

  // ── Cleanup: remove test rows written in TD-02 ───────────────────────────────

  if (!CI_SAFE && supabaseAdmin) {
    await supabaseAdmin.from('team_data').delete().eq('team_id', TEST_TEAM_ID);
    await supabaseAdmin.from('team_data_history').delete().eq('team_id', TEST_TEAM_ID);
  }
}

module.exports = { run };
