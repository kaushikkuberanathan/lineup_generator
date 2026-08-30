// backend/src/__tests__/rls/writeSourceRoleFallback.test.js
//
// Regression suite for #379 / migration 026.
//
// team_data_history.write_source was 'unknown' on every row in prod (3,000/3,000,
// confirmed 2026-08-28) despite backend/src/routes/teamData.js appearing to set it.
// Root cause: it set app.write_source via a SEPARATE Supabase RPC call
// (set_config(..., is_local: true)), then upserted in a SEPARATE call — different
// transactions, so the setting never reached the write it was meant to tag. This
// affects every write path, including the DOMINANT one: frontend/src/supabase.js's
// dbSaveTeamData() writes team_data directly from the browser and never touches
// app.write_source at all (see migration 006's header).
//
// Migration 026 adds a role-based fallback instead: snapshot_team_data reads
// PostgREST's transaction-local request.jwt.claims and records its `role` claim.
// The final live implementation is one SECURITY DEFINER trigger function; an
// earlier two-trigger/GUC attempt was removed before the migration settled.
//
// This is real-role behavior, not something a monkey-patched supabase-js client can
// exercise — it needs an actual Postgres role switch per write, which is exactly
// what this suite's authedClient()/adminClient() give via real Supabase auth. A
// SET LOCAL ROLE simulation through the SQL Editor was tried while diagnosing this
// and gave inconsistent results that didn't match real request behavior — do not
// use that approach to verify this; real clients only.
//
// anon is deliberately not tested here: the auth gate (v2.6.0, "editing requires a
// session") means anon has no live write path to team_data post-WS-3 to exercise in
// the first place — there is nothing to assert.

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { adminClient, authedClient } = require('./clients');

const TEST_EMAIL = 'zzz-rls-write-source-fallback@dugout-rls-test.invalid';
const TEST_TEAM_ID = 'zzz-rls-test-write-source-fallback';

async function findUserByEmail(admin, email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error('listUsers failed: ' + error.message);
  return data.users.find((u) => u.email === email) || null;
}

async function latestWriteSource(admin, teamId) {
  const { data, error } = await admin
    .from('team_data_history')
    .select('write_source')
    .eq('team_id', teamId)
    .order('written_at', { ascending: false })
    .limit(1);
  if (error) throw new Error('team_data_history lookup failed: ' + error.message);
  return data[0]?.write_source;
}

async function teardown() {
  const admin = adminClient();
  await admin.from('team_data_history').delete().eq('team_id', TEST_TEAM_ID);
  await admin.from('team_memberships').delete().eq('team_id', TEST_TEAM_ID);
  await admin.from('team_data').delete().eq('team_id', TEST_TEAM_ID);
  await admin.from('teams').delete().eq('id', TEST_TEAM_ID);
  const user = await findUserByEmail(admin, TEST_EMAIL);
  if (user) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw new Error('deleteUser failed for ' + TEST_EMAIL + ': ' + error.message);
  }
}

describe('WSF — write_source role-based fallback (#379 / migration 026)', () => {
  let coach;

  before(async () => {
    await teardown();
    const admin = adminClient();

    const { data, error: userErr } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      email_confirm: true,
    });
    if (userErr) throw new Error('createUser failed for ' + TEST_EMAIL + ': ' + userErr.message);

    const { error: teamErr } = await admin.from('teams').insert({
      id: TEST_TEAM_ID, name: 'ZZZ RLS Test Write-Source Fallback', age_group: '8U', year: 2026, season: 'Spring', sport: 'baseball',
    });
    if (teamErr) throw new Error('teams insert failed: ' + teamErr.message);

    const { error: memErr } = await admin.from('team_memberships').insert({
      user_id: data.user.id, team_id: TEST_TEAM_ID, role: 'admin', status: 'active', email: TEST_EMAIL,
    });
    if (memErr) throw new Error('team_memberships insert failed: ' + memErr.message);

    coach = await authedClient(TEST_EMAIL);
  });

  after(async () => {
    await teardown();
  });

  test('WSF1: a service_role write records write_source = service_role, not unknown', async () => {
    const admin = adminClient();
    const res = await admin.from('team_data').upsert(
      { team_id: TEST_TEAM_ID, roster: [], schedule: [], practices: [], batting_order: [], grid: {}, innings: 6, locked: false },
      { onConflict: 'team_id' }
    );
    assert.equal(res.error, null, 'service-role upsert must succeed');

    const got = await latestWriteSource(admin, TEST_TEAM_ID);
    assert.equal(
      got, 'service_role',
      'REGRESSION (#379): expected write_source=service_role for a service-role write, got ' + got
    );
  });

  // Mirrors dbSaveTeamData() exactly: a plain upsert from an authenticated client,
  // no app.write_source involved — this IS the dominant real-world write path.
  test('WSF2: an authenticated coach write records write_source = authenticated, not unknown', async () => {
    const res = await coach.from('team_data').upsert(
      { team_id: TEST_TEAM_ID, roster: [], schedule: [], practices: [], batting_order: [], grid: {}, innings: 6, locked: true },
      { onConflict: 'team_id' }
    );
    assert.equal(res.error, null, 'authenticated coach upsert must succeed for their own team');

    const admin = adminClient();
    const got = await latestWriteSource(admin, TEST_TEAM_ID);
    assert.equal(
      got, 'authenticated',
      'REGRESSION (#379): expected write_source=authenticated for the dominant real-world write path ' +
      '(frontend dbSaveTeamData(), direct-to-Supabase, no backend route involved), got ' + got
    );
  });
});
