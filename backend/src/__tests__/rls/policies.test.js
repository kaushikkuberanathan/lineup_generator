// backend/src/__tests__/rls/policies.test.js
//
// RLS policy suite for #348.
//
// This suite runs ONLY via `npm run test:rls` against the DEV Supabase project.
// It is quarantined from CI (see the test:rls script + backend-unit job).
//
// WHAT THIS SUITE IS FOR
//   It is the executable specification for the WS-3 RLS cutover. It asserts
//   what docs/db/schema.sql section 8 SHOULD be, not what the landmine
//   migration 004_rls_fixes.sql claims.
//
//   Five scenarios are RED today, on purpose. They reproduce the live exposure
//   (#342) from a test runner using the anon key that ships in the frontend
//   bundle. Landing them red, with the failures in the PR body, is the proof
//   that WS-3 is necessary. WS-3 turns them green.
//
//   Four scenarios are GREEN today. They are regression guards on last week's
//   emergency fixes (migrations 005, 006, 011). If a future change re-breaks
//   any of them, this suite catches it.
//
// HOW TO READ A FAILURE
//   A red S1b/S3/S4a/S4b/S6-anything is EXPECTED until WS-3 lands. The suite
//   is designed to be committed red. Do not "fix" the tests to make them pass —
//   fix the DATABASE (WS-3), and they pass on their own.

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const {
  adminClient,
  anonClient,
  authedClient,
  isGrantDenied,
  returnedRows,
} = require('./clients');
const {
  seed,
  teardown,
  TEAM_A,
  TEAM_B,
  COACH_A_EMAIL,
  SHARE_ID,
} = require('./seed');

// ─────────────────────────────────────────────────────────────────────────────
// Shared state. authedClient() mints a magic link per call and DEV enforces a
// per-email OTP rate limit — so we mint ONCE for coach A in before() and reuse
// the session across every scenario. Minting per-test would throttle and flake.
// ─────────────────────────────────────────────────────────────────────────────
let fixture;
let anon;
let coachA;

before(async () => {
  fixture = await seed();
  anon = anonClient();
  coachA = await authedClient(COACH_A_EMAIL);   // authenticates as team A's coach
});

after(async () => {
  await teardown();
});

// ═════════════════════════════════════════════════════════════════════════════
// S1 — Viewer path. Share links public; team_data not.
// ═════════════════════════════════════════════════════════════════════════════
describe('S1 — anon viewer access', () => {

  // GREEN today and forever. Viewer mode is non-negotiable (Principle #2).
  // The share link's payload is self-contained, so this must work with no session.
  test('S1a: anon CAN read share_links by id (viewer mode)', async () => {
    const res = await anon.from('share_links').select('id, payload').eq('id', SHARE_ID);
    assert.equal(res.error, null, 'anon share_links read must not error');
    assert.equal(res.data.length, 1, 'the seeded share link must be readable by anon');
  });

  // RED today: RLS is OFF on team_data, so anon reads every team's roster.
  // This is the #342 exposure. Turns green when WS-3 enables RLS on team_data.
  test('S1b: anon CANNOT read team_data [RED until WS-3]', async () => {
    const res = await anon.from('team_data').select('team_id').eq('team_id', TEAM_A);
    // Post-WS-3, anon gets either a grant denial (42501) or an empty RLS filter.
    // Either is a pass. Rows coming back is the breach.
    assert.ok(
      !returnedRows(res),
      'EXPOSURE: anon read a roster from team_data. RLS is off on this table (#342).'
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// S3 — Cross-team isolation. An authenticated coach must not read another
//      team's data. Requires TWO seeded teams with real rows in each, so that
//      "zero rows" can only mean "RLS filtered them", never "table was empty".
// ═════════════════════════════════════════════════════════════════════════════
describe('S3 — cross-team isolation', () => {

  // GREEN today only because RLS is off — coach A reads team B trivially, which
  // is ALSO the breach. The assertion is written for the POST-WS-3 world: coach
  // A must NOT see team B. So it is RED today (coach A can see team B) and green
  // after WS-3. The seeded team B row guarantees the filter is what's tested.
  test('S3: coach A CANNOT read team B team_data [RED until WS-3]', async () => {
    const res = await coachA.from('team_data').select('team_id').eq('team_id', TEAM_B);
    assert.ok(
      !returnedRows(res),
      'EXPOSURE: coach A read team B roster. No cross-team isolation until WS-3.'
    );
  });

  // Sanity control: coach A CAN read their OWN team. Post-WS-3 this proves the
  // policy grants access rather than blanket-denying. Today it passes because
  // RLS is off. It must STAY green through WS-3 — if it goes red, the WS-3
  // policy is too strict and has locked coaches out of their own team.
  test('S3-control: coach A CAN read own team A team_data', async () => {
    const res = await coachA.from('team_data').select('team_id').eq('team_id', TEAM_A);
    assert.equal(res.error, null, 'coach must be able to read their own team');
    assert.equal(res.data.length, 1, 'coach A must see team A');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// S4 — Write protection. Two halves.
//   S4a: anon cannot write rows (RLS / grant).
//   S4b: anon does not hold the TRUNCATE grant. THIS IS THE ONE THAT MATTERS.
// ═════════════════════════════════════════════════════════════════════════════
describe('S4 — anon write protection', () => {

  // RED today: RLS off + full grant means anon can UPDATE any roster.
  // We attempt a no-op-shaped update on the seeded team and assert it is rejected.
  test('S4a: anon CANNOT update team_data [RED until WS-3]', async () => {
    const res = await anon
      .from('team_data')
      .update({ innings: 7 })
      .eq('team_id', TEAM_A)
      .select();
    // Post-WS-3: rejected (error) or zero rows affected (RLS filtered the target).
    const wrote = res.error === null && Array.isArray(res.data) && res.data.length > 0;
    assert.ok(
      !wrote,
      'EXPOSURE: anon updated a roster in team_data. Write protection absent until WS-3.'
    );
    // Belt and braces: if the write slipped through, undo it so the fixture is clean.
    if (wrote) {
      await adminClient().from('team_data').update({ innings: 6 }).eq('team_id', TEAM_A);
    }
  });

  // RED today — and the single most important test in this file.
  //
  // PostgREST has no TRUNCATE verb, so supabase-js cannot ISSUE a truncate.
  // But TRUNCATE bypasses RLS entirely: enabling RLS in WS-3 does NOTHING to
  // stop it. The only defense is revoking the grant. schema.sql defect #4:
  // TRUNCATE is granted to anon on 14 tables.
  //
  // This asserts the GRANT is gone, not that a truncate fails. It is RED today
  // (anon holds the grant) and turns green ONLY when WS-3 does BOTH halves:
  // enable RLS *and* REVOKE the anon grants. An RLS-only cutover leaves this red
  // while every other test goes green — which is exactly the incomplete fix we
  // are guarding against.
  test('S4b: anon holds NO TRUNCATE/DELETE grant on exposed tables [RED until WS-3]', async () => {
    const admin = adminClient();
    const exposed = ['team_data', 'teams', 'roster_snapshots'];

    const { data, error } = await admin.rpc('rls_test_anon_grants', {
      table_names: exposed,
    });

    assert.equal(error, null, 'grant introspection RPC must not error');

    const offending = (data || []).map(
      (r) => `anon:${r.privilege_type} on ${r.table_name}`
    );
    assert.deepEqual(
      offending,
      [],
      'EXPOSURE: anon holds TRUNCATE/DELETE on exposed tables. ' +
      'TRUNCATE bypasses RLS — an RLS-only WS-3 does not close this. ' +
      'Found: ' + offending.join(', ')
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// S6 — Locked tables. GREEN today. These are REGRESSION GUARDS on last week's
//      emergency migrations (005 auth_events, 006 team_data_history, 011 view).
//      If any goes red, a fix was reverted or a policy drifted.
// ═════════════════════════════════════════════════════════════════════════════
describe('S6 — locked-table regression guards', () => {

  // Guard on migration 006. anon must get a GRANT denial (42501), not rows.
  test('S6a: anon CANNOT read team_data_history (migration 006)', async () => {
    const res = await anon.from('team_data_history').select('id').limit(1);
    assert.ok(
      isGrantDenied(res),
      'REGRESSION: team_data_history is no longer grant-denied to anon (migration 006 reverted?)'
    );
  });

  // Guard on migration 005.
  test('S6b: anon CANNOT read auth_events (migration 005)', async () => {
    const res = await anon.from('auth_events').select('id').limit(1);
    assert.ok(
      isGrantDenied(res),
      'REGRESSION: auth_events is no longer grant-denied to anon (migration 005 reverted?)'
    );
  });

  // Guard on migration 011 — the subtlest one. A VIEW without security_invoker
  // runs as its OWNER and reads straight THROUGH the base table's RLS. Migration
  // 011 set security_invoker=true on team_data_history_latest to close a leak of
  // 11 rows past the 006 lock. This asserts the leak stays closed: anon reading
  // the view must be denied, same as reading the base table.
  test('S6c: anon CANNOT read team_data_history_latest view (migration 011)', async () => {
    const res = await anon.from('team_data_history_latest').select('team_id').limit(1);
    assert.ok(
      res.error !== null && (res.data === null || res.data.length === 0),
      'REGRESSION: the team_data_history_latest view leaks past RLS (migration 011 reverted?)'
    );
  });
});
