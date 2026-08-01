// backend/src/__tests__/rls/policies.test.js
//
// RLS policy suite for #348.
//
// Two run modes, same file: locally via `npm run test:rls` against the DEV
// Supabase project (backend/.env.rls.local), and in CI via the `rls` job
// (.github/workflows/ci.yml) against a self-contained ephemeral local
// Postgres stack (#415) — never against prod, see clients.js's fence. This
// comment previously said "quarantined from CI"; that predates #415's
// ephemeral-stack CI job and was stale.
//
// WHAT THIS SUITE IS FOR
//   It is the executable specification for the WS-3 RLS cutover. It asserts
//   what docs/db/schema.sql section 8 SHOULD be, not what the landmine
//   migration 004_rls_fixes.sql claims.
//
//   The original nine scenarios (S1/S3/S4/S6) are GREEN as of WS-3
//   (004_rls_fixes.sql applied to DEV 2026-07-19). Four of them — S1b, S3,
//   S4a, S4b — once reproduced the live #342 exposure from a test runner
//   using the anon key that ships in the frontend bundle; they were
//   committed RED on purpose, and WS-3 turned them green. They now stand as
//   regression guards: if a change re-opens the exposure, they go red again.
//
//   The other five — S1a, S3-control, S6a, S6b, S6c — guard viewer-mode access
//   (Principle #2) and last week's emergency fixes (migrations 005, 006, 011).
//   If a future change re-breaks any of them, this suite catches it.
//
//   RS1-RS5 (#477, added 2026-08-01) extend the same S1/S3/S4 scenario
//   shapes — anon-blocked, cross-team-blocked, own-team-allowed — to
//   roster_snapshots, which had zero coverage despite being one of the three
//   tables #342 originally exposed. See the RS describe block for detail.
//   `teams` coverage is a deliberately separate follow-up (#477 sequences
//   roster_snapshots first — higher stakes, its sibling view exposes real
//   children's names).
//
// HOW TO READ A FAILURE
//   Every test here should be GREEN. A red S1b/S3/S4a/S4b means the WS-3 RLS
//   lockdown has regressed in DEV — fix the DATABASE, not the test. A red
//   S6-anything means an emergency-fix migration (005/006/011) regressed. A
//   red RS-anything means the same class of regression on roster_snapshots
//   specifically (migration 004's "4. roster_snapshots" section).

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const {
  adminClient,
  anonClient,
  authedClient,
  isGrantDenied,
  isWriteBlocked,
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

  // GREEN post-WS-3: RLS is now ON for team_data, so anon reads are filtered or
  // denied. This once reproduced the #342 exposure (anon reading every team's
  // roster); it now guards against RLS being disabled on team_data again.
  test('S1b: anon CANNOT read team_data', async () => {
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

  // GREEN post-WS-3: cross-team isolation is enforced — coach A cannot see team
  // B. Before WS-3 this was the breach (RLS off, coach A read team B trivially).
  // It now guards against the cross-team policy regressing. The seeded team B
  // row guarantees the filter is what's tested, never an empty table.
  test('S3: coach A CANNOT read team B team_data', async () => {
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

  // GREEN post-WS-3: anon UPDATE on team_data is now rejected by RLS. Before
  // WS-3 (RLS off + full grant) anon could UPDATE any roster. It now guards
  // against write protection regressing. We attempt a no-op-shaped update on
  // the seeded team and assert it is rejected.
  test('S4a: anon CANNOT update team_data', async () => {
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

  // GREEN after WS-3 (004_rls_fixes.sql applied to DEV) — and the single most
  // important test in this file.
  //
  // PostgREST has no TRUNCATE verb, so supabase-js cannot ISSUE a truncate.
  // But TRUNCATE bypasses RLS entirely: enabling RLS in WS-3 does NOTHING to
  // stop it. The only defense is revoking the grant. This asserts the GRANTs
  // are gone, not that a truncate fails. It turns green ONLY when WS-3 does
  // BOTH halves: enable RLS *and* REVOKE the anon grants. An RLS-only cutover
  // would leave this red while every other test goes green — the incomplete
  // fix we are guarding against.
  //
  // #380 EXCEPTION — DO NOT "fix" this back: anon KEEPS its DELETE grant on
  // `teams`. dbDeleteTeam() (frontend/src/supabase.js:38) deletes teams
  // direct-to-Supabase and supabase.js:40 swallows the error to console.warn,
  // so revoking DELETE would break delete-team SILENTLY. teams_auth_delete
  // already scopes DELETE to team admins (the correct control). #380 tracks
  // routing delete-team through a backend service_role endpoint, after which
  // DELETE on teams gets revoked too. Until then, anon:DELETE on teams is an
  // allowed, deliberate exception — every OTHER TRUNCATE/DELETE grant must be gone.
  test('S4b: anon holds no ungoverned TRUNCATE/DELETE grant on exposed tables', async () => {
    const admin = adminClient();
    const exposed = ['team_data', 'teams', 'roster_snapshots'];

    const { data, error } = await admin.rpc('rls_test_anon_grants', {
      table_names: exposed,
    });

    assert.equal(error, null, 'grant introspection RPC must not error');

    const offending = (data || [])
      .map((r) => `anon:${r.privilege_type} on ${r.table_name}`)
      // #380 exception: anon:DELETE on teams is intentional and documented.
      // dbDeleteTeam() writes direct-to-Supabase; teams_auth_delete scopes it
      // to team admins. Revoking it before the backend delete route exists would
      // break delete-team silently. Filtered out so it is not flagged.
      .filter((g) => g !== 'anon:DELETE on teams');

    assert.deepEqual(
      offending,
      [],
      'EXPOSURE: anon holds an ungoverned TRUNCATE/DELETE grant on an exposed ' +
      'table. TRUNCATE bypasses RLS — an RLS-only WS-3 does not close it. ' +
      '(anon:DELETE on teams is the one allowed exception — see #380.) ' +
      'Found: ' + offending.join(', ')
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// RS — roster_snapshots read + write isolation (#477, Test-Health Survey Pass 3
//      / D-S348a). team_data and teams already had S1/S3/S4-equivalent
//      coverage; roster_snapshots did not, despite being one of the three
//      tables #342 originally exposed and despite holding the same PII shape
//      as team_data (real children's names, per FAKE_ROSTER's shape in the
//      seed). Sequenced first (#477) because it is the higher-stakes of the
//      two remaining gaps — `teams` coverage is a separate follow-up PR.
//
//      migration 004's policies for this table (see "4. roster_snapshots"
//      section): roster_snapshots_auth_select (SELECT, TO authenticated,
//      membership + active status, no anon policy at all) and
//      roster_snapshots_auth_insert (INSERT, TO authenticated, membership +
//      role IN admin/coach + active status). No UPDATE policy exists for any
//      role — snapshots are insert-only + auto-pruned by trigger, so that is
//      intentional and out of scope here. TRUNCATE/DELETE grant revocation on
//      this table is already covered generically by S4b's `exposed` array
//      above; this block adds the RLS-level (not grant-level) read/write
//      scoping that S4b does not test.
// ═════════════════════════════════════════════════════════════════════════════
describe('RS — roster_snapshots read + write isolation', () => {

  // Mirrors S1b. No anon policy exists on this table at all, so under RLS
  // (default-deny) anon must get zero rows with no error — never real rows.
  test('RS1: anon CANNOT read roster_snapshots', async () => {
    const res = await anon.from('roster_snapshots').select('team_id, roster').eq('team_id', TEAM_A);
    assert.ok(
      !returnedRows(res),
      'EXPOSURE: anon read a roster_snapshots row. No anon SELECT policy should exist on this table.'
    );
  });

  // Mirrors S3. roster_snapshots_auth_select scopes to the caller's own
  // team_id via team_memberships — coach A must not see team B's snapshot,
  // which the seed fixture guarantees is a real, non-empty row.
  test('RS2: coach A CANNOT read team B roster_snapshots', async () => {
    const res = await coachA.from('roster_snapshots').select('team_id, roster').eq('team_id', TEAM_B);
    assert.ok(
      !returnedRows(res),
      'EXPOSURE: coach A read team B\'s roster_snapshots row. Cross-team isolation absent on this table.'
    );
  });

  // Mirrors S3-control. Proves roster_snapshots_auth_select grants access
  // rather than blanket-denying every authenticated caller.
  test('RS2-control: coach A CAN read own team A roster_snapshots', async () => {
    const res = await coachA.from('roster_snapshots').select('team_id, roster').eq('team_id', TEAM_A);
    assert.equal(res.error, null, 'coach must be able to read their own team\'s roster_snapshots');
    assert.equal(res.data.length, 1, 'coach A must see team A\'s seeded snapshot');
  });

  // Mirrors S4a, but for INSERT rather than UPDATE — roster_snapshots has no
  // UPDATE policy for any role, so INSERT is the meaningful write path here.
  // No anon policy exists, so this must be rejected under RLS.
  test('RS3: anon CANNOT insert into roster_snapshots', async () => {
    const res = await anon.from('roster_snapshots').insert({
      team_id: TEAM_A, team_name: 'HACKED', roster: [], trigger_event: 'manual_export',
    }).select();
    assert.ok(
      isWriteBlocked(res) || !returnedRows(res),
      'EXPOSURE: anon inserted into roster_snapshots. Write protection absent on this table.'
    );
  });

  // roster_snapshots_auth_insert's WITH CHECK scopes tm.team_id to the
  // INSERTED row's team_id — a valid coach role is not enough on its own.
  // Coach A (role=coach on team A) attempting to write a team B row proves
  // that scoping, distinct from RS3's anon-has-no-policy-at-all case.
  test('RS4: coach A CANNOT insert a roster_snapshots row for team B', async () => {
    const res = await coachA.from('roster_snapshots').insert({
      team_id: TEAM_B, team_name: 'CROSS-TEAM WRITE', roster: [], trigger_event: 'manual_export',
    }).select();
    assert.ok(
      isWriteBlocked(res) || !returnedRows(res),
      'EXPOSURE: coach A inserted a roster_snapshots row for team B. Cross-team write isolation absent.'
    );
  });

  // Positive control, mirrors S3-control's role for the write side: proves
  // roster_snapshots_auth_insert grants the intended access (membership +
  // admin/coach role + active status on the CALLER'S OWN team) rather than
  // RS3/RS4 passing because every insert on this table is blocked outright.
  test('RS5: coach A CAN insert a roster_snapshots row for own team A', async () => {
    const res = await coachA.from('roster_snapshots').insert({
      team_id: TEAM_A, team_name: 'RS5 control', roster: [], trigger_event: 'manual_export',
    }).select();
    assert.equal(res.error, null, 'coach must be able to insert a snapshot for their own team');
    assert.equal(res.data.length, 1, 'the insert must return the new row');
    // Not relying on teardown() alone: delete this specific row immediately so
    // a failed/partial run doesn't leave an extra row shifting which snapshot
    // RS2-control's "length === 1" assertion would see on a re-run before the
    // next teardown() executes.
    if (res.data?.[0]?.id) {
      await adminClient().from('roster_snapshots').delete().eq('id', res.data[0].id);
    }
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
