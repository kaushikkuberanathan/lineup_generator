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
//   Sequenced first — higher stakes, its sibling view exposes real
//   children's names.
//
//   T1-T7(+controls) (#477 second half, added 2026-08-01) do the same for
//   `teams` — the third of the three originally-exposed tables. teams has a
//   richer policy shape than roster_snapshots (four operations, not two;
//   an unconditionally-open INSERT; a stricter admin-only DELETE), so the
//   scenario count reflects that real shape rather than a forced 1:1 mirror
//   of RS's five. See the T describe blocks for detail.
//
//   M1-M4 (#478, D-S348b, added 2026-08-02) cover migration 007's admin-panel
//   recursion fix — a distinct RLS gap from #342/#477 (data exposure) rather
//   than a regression on it. Authenticates as a real admin-role member and
//   reads team_memberships/access_requests/feedback, the three tables 007's
//   fix touched. See the M describe block for detail.
//
//   LS1-LS7(+control) (#355 / D-S355, Test-Health Survey Pass 3, added
//   2026-08-02) are DIFFERENT from every block above: LS1-LS7 are
//   RED-BY-DESIGN executable specs for a REAL, CONFIRMED-LIVE-IN-PROD
//   vulnerability — four hardcoded team-id backdoors (at_bats_anon_test,
//   game_state_anon_test, scorer_lock_anon_test, audit_log_anon_test,
//   confirmed against docs/db/schema.sql's own "captured from prod" header)
//   plus a fully-open allow_scorer_writes (USING(true) WITH CHECK(true))
//   catch-all on live_game_state / game_scoring_sessions / scoring_audit_log.
//   Because the `rls` CI job is now a REQUIRED status check (#480) — unlike
//   when S1b/S3/S4a were originally red, before #480 existed — merging these
//   7 as permanently-failing tests would make `rls` fail on every subsequent
//   PR until #355 is fixed, blocking all merges. KK's explicit decision
//   (2026-08-02, after the finding was escalated and confirmed prod-live):
//   skip LS1-LS7 with `{ skip: '#355 tracked...' }` so `rls` stays green,
//   while keeping the executable spec visible in source (NOT deleted) for
//   whoever fixes #355 to un-skip and turn green. LS7-control is NOT
//   skipped — it asserts already-secure behavior and should stay green.
//   See the LS describe block for the full policy-by-policy breakdown.
//
// HOW TO READ A FAILURE
//   Every test here should be GREEN. LS1-LS7 are currently SKIPPED (see
//   above) — do not un-skip them without #355 actually being fixed in the
//   database first; un-skipping prematurely will fail the required `rls`
//   check for everyone. Every failure among the non-skipped tests IS a
//   regression: a red S1b/S3/S4a/S4b means the WS-3 RLS lockdown has
//   regressed in DEV — fix the DATABASE, not the test. A red S6-anything
//   means an emergency-fix migration (005/006/011) regressed. A red
//   RS-anything means the same class of regression on roster_snapshots
//   specifically (migration 004's "4. roster_snapshots" section). A red
//   T-anything means the same on `teams` (migration 004's "2. teams"
//   section). A red M-anything means migration 007's recursion fix has
//   regressed — a future edit reintroduced an inline self-referential
//   subquery on team_memberships instead of calling is_active_admin().

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
  TEAM_D,
  COACH_A_EMAIL,
  SHARE_ID,
  seedAdminDeleteFixture,
  seedAdminRecursionFixture,
  LS_BACKDOOR_TEAM_ID,
  LS_ARBITRARY_TEAM_ID,
  LS_GAME_ID_BACKDOOR,
  LS_GAME_ID_ARBITRARY,
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
// T — teams read + write isolation (#477, second half — sequenced after
//     roster_snapshots deliberately, higher-stakes table first).
//
//     teams' actual policy shape (migration 004, "2. teams" section) was read
//     before writing any of this, not assumed from the roster_snapshots
//     template — and it differs in two real ways:
//
//       - teams_auth_insert is `WITH CHECK (true)` — completely unscoped. Any
//         authenticated user can insert ANY team row, no membership check at
//         all. This is intentional: a brand-new team has no membership yet,
//         so there is nothing to scope against. There is no "cross-team
//         insert block" test to write here (T3/T3-control only), unlike
//         roster_snapshots_auth_insert which DID scope to the caller's team.
//       - teams_auth_delete requires role = 'admin' specifically — stricter
//         than teams_auth_update's role IN ('admin','coach'). The shared
//         coachA/coachB fixture identities are both role='coach', so they
//         can prove the admin-only restriction blocks a coach (T7), but
//         proving an admin CAN delete needs a real admin identity — see
//         seedAdminDeleteFixture() in seed.js, used only by T7-control.
//
//     No trigger complications found on this table: teams_updated_at just
//     sets NEW.updated_at and returns — no cross-table DML, so no
//     SECURITY DEFINER exposure like roster_snapshots' prune trigger had
//     (checked explicitly, not assumed, given what that check found there).
// ═════════════════════════════════════════════════════════════════════════════
describe('T — teams read isolation (SELECT)', () => {

  // Mirrors S1b/RS1. No anon policy exists on teams at all.
  test('T1: anon CANNOT read teams', async () => {
    const res = await anon.from('teams').select('id, name').eq('id', TEAM_A);
    assert.ok(
      !returnedRows(res),
      'EXPOSURE: anon read a teams row. No anon SELECT policy should exist on this table.'
    );
  });

  // Mirrors S3/RS2. teams_auth_select scopes to the caller's own team_id via
  // team_memberships — coach A must not see team B's row.
  test('T2: coach A CANNOT read team B', async () => {
    const res = await coachA.from('teams').select('id, name').eq('id', TEAM_B);
    assert.ok(
      !returnedRows(res),
      'EXPOSURE: coach A read team B\'s teams row. Cross-team isolation absent on this table.'
    );
  });

  // Mirrors S3-control/RS2-control. Proves teams_auth_select grants access
  // rather than blanket-denying every authenticated caller.
  test('T2-control: coach A CAN read own team A', async () => {
    const res = await coachA.from('teams').select('id, name').eq('id', TEAM_A);
    assert.equal(res.error, null, 'coach must be able to read their own team');
    assert.equal(res.data.length, 1, 'coach A must see team A');
  });

});

describe('T — teams write isolation (INSERT)', () => {

  // No anon policy exists for INSERT either.
  test('T3: anon CANNOT insert into teams', async () => {
    const res = await anon.from('teams').insert({
      id: 'zzz-rls-test-anon-insert', name: 'HACKED', age_group: '8U', year: 2026, sport: 'baseball',
    }).select();
    assert.ok(
      isWriteBlocked(res) || !returnedRows(res),
      'EXPOSURE: anon inserted into teams. Write protection absent on this table.'
    );
  });

  // teams_auth_insert is WITH CHECK (true) — deliberately unscoped, since a
  // brand-new team has no membership row to check against yet. This proves
  // that unconditional grant actually works for a real authenticated user,
  // not just that unauthenticated inserts are blocked (T3 alone could pass
  // even if EVERY insert failed, authenticated included — same gap RS5
  // caught on roster_snapshots).
  //
  // Deliberately NOT chaining .select() here. A first attempt did, and it
  // failed with "new row violates row-level security policy for table
  // teams" — NOT a WITH CHECK failure (that clause is unconditionally
  // true), but RETURNING's separate requirement that the inserted row also
  // satisfy the table's SELECT policy. teams_auth_select requires an
  // existing active team_memberships row, which a brand-new team doesn't
  // have yet (nothing here creates one for the creator). Confirmed this is
  // a test-design issue, not an app-facing bug: dbSaveTeams()
  // (frontend/src/supabase.js) creates teams via a bare .upsert() with no
  // .select() chained, so the real app never hits this RETURNING-vs-SELECT-
  // policy interaction at all. Verifying success via error-is-null plus an
  // admin-bypassed follow-up read is the correct match for actual usage.
  test('T3-control: authenticated coach CAN insert a new team (unscoped by design)', async () => {
    const res = await coachA.from('teams').insert({
      id: TEAM_D, name: 'ZZZ RLS Test D (insert control)', age_group: '8U', year: 2026, sport: 'baseball',
    });
    assert.equal(res.error, null, 'an authenticated user must be able to create a new team');

    const admin = adminClient();
    const verify = await admin.from('teams').select('id').eq('id', TEAM_D);
    assert.equal(verify.data?.length, 1, 'the row must actually exist (service-role bypasses RLS to confirm)');

    // Clean up immediately rather than relying solely on the end-of-suite
    // teardown() — keeps this test's side effect from lingering across the
    // rest of the run.
    await admin.from('teams').delete().eq('id', TEAM_D);
  });

});

describe('T — teams write isolation (UPDATE)', () => {

  test('T4: anon CANNOT update teams', async () => {
    const res = await anon.from('teams').update({ name: 'HACKED' }).eq('id', TEAM_A).select();
    assert.ok(
      isWriteBlocked(res) || !returnedRows(res),
      'EXPOSURE: anon updated a teams row. Write protection absent on this table.'
    );
  });

  // teams_auth_update's EXISTS clause scopes to the caller's own team_id —
  // coach A (role='coach', which IS in the allowed 'admin','coach' set for
  // UPDATE) must still be blocked from updating team B specifically.
  test('T5: coach A CANNOT update team B', async () => {
    const res = await coachA.from('teams').update({ name: 'HACKED BY COACH A' }).eq('id', TEAM_B).select();
    assert.ok(
      isWriteBlocked(res) || !returnedRows(res),
      'EXPOSURE: coach A updated team B. Cross-team write isolation absent on this table.'
    );
  });

  // Positive control: role='coach' is sufficient for UPDATE (unlike DELETE,
  // below, which requires role='admin' specifically) — proves the policy
  // grants access for the caller's OWN team, not blanket-denying every write.
  test('T5-control: coach A CAN update own team A', async () => {
    const res = await coachA.from('teams').update({ name: 'ZZZ RLS Test A (updated)' }).eq('id', TEAM_A).select();
    assert.equal(res.error, null, 'a coach-role member must be able to update their own team');
    assert.equal(res.data.length, 1, 'the update must return the affected row');
    // Restore the name so later tests (T2-control's implicit assumptions,
    // any re-run) see the fixture's original state rather than this test's
    // leftover edit.
    await adminClient().from('teams').update({ name: 'ZZZ RLS Test A' }).eq('id', TEAM_A);
  });

});

describe('T — teams write isolation (DELETE)', () => {

  test('T6: anon CANNOT delete teams', async () => {
    // #380: anon KEEPS its DELETE grant on teams (deliberate — see S4b's
    // header). So unlike T3/T4's anon cases, a rejection here MUST come from
    // RLS (no matching policy), not a grant-level 42501 — this is the
    // closest analog on this table to the roster_snapshots trigger bug: a
    // control that is only as strong as the RLS policy actually is, because
    // the grant alone would allow it.
    const res = await anon.from('teams').delete().eq('id', TEAM_A).select();
    assert.ok(
      isWriteBlocked(res) || !returnedRows(res),
      'EXPOSURE: anon deleted a teams row. RLS did not block a DELETE the grant still allows (#380).'
    );
  });

  // teams_auth_delete requires role = 'admin' specifically. Coach A holds
  // role='coach' (sufficient for UPDATE, above) but must NOT be able to
  // delete their own team — proves DELETE's stricter role check, distinct
  // from UPDATE's, is actually enforced and not just documented.
  test('T7: coach A (role=coach, not admin) CANNOT delete own team A', async () => {
    const res = await coachA.from('teams').delete().eq('id', TEAM_A).select();
    assert.ok(
      isWriteBlocked(res) || !returnedRows(res),
      'EXPOSURE: a coach-role member deleted their own team. DELETE must require role=admin, not just admin/coach.'
    );
  });

  // Positive control: a REAL admin-role member CAN delete their own team.
  // Without this, T6/T7 alone could pass even if DELETE were broken for
  // every role including admin — the same blind spot RS5 exposed on
  // roster_snapshots. Self-contained: seedAdminDeleteFixture() creates a
  // throwaway team + admin membership that only this test touches; the
  // DELETE assertion below IS the cleanup for the happy path, with
  // teardown() as the backstop if this test fails first.
  test('T7-control: admin-role member CAN delete their own team', async () => {
    const { teamId, adminEmail } = await seedAdminDeleteFixture();
    const admin = await authedClient(adminEmail);

    const res = await admin.from('teams').delete().eq('id', teamId).select();
    assert.equal(res.error, null, 'an admin-role member must be able to delete their own team');
    assert.equal(res.data.length, 1, 'the delete must return the removed row');
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// M — team_memberships / access_requests / feedback admin-authenticated RLS
//     (#478, D-S348b, Test-Health Survey Pass 3). Migration 007's own header
//     names the exact gap this closes: "nothing in any test suite exercises
//     RLS as an authenticated user" was the reason a self-referential
//     subquery on team_memberships ("admin_manages_memberships" reading
//     team_memberships FROM a policy ON team_memberships) recursed for every
//     authenticated reader of that table — not just admins — and was only
//     found by KK logging into the admin panel for the first time. 007's fix
//     replaced the inline subquery with is_active_admin(), a SECURITY
//     DEFINER function (schema.sql "5. FUNCTIONS") that reads team_memberships
//     as its owner, bypassing RLS and breaking the loop. Blast radius per
//     007's header was wider than team_memberships alone: access_requests and
//     feedback's admin policies call the same function, and both failed
//     pre-007 too, because evaluating them required reading team_memberships,
//     which tripped THAT table's recursive policy.
//
//     GREEN today (007 already applied) — this is a regression guard, not a
//     RED-by-design spec. A red M-anything means a future edit reintroduced
//     an inline self-referential subquery on team_memberships (007's own
//     documented rollback SQL, in its header, is exactly that shape) and the
//     admin panel would silently deny real admins again.
// ═════════════════════════════════════════════════════════════════════════════
describe('M — team_memberships / access_requests / feedback admin-authenticated RLS', () => {
  let recursionAdmin;
  let recursionAdminClient;

  before(async () => {
    recursionAdmin = await seedAdminRecursionFixture();
    recursionAdminClient = await authedClient(recursionAdmin.adminEmail);
  });

  after(async () => {
    // team_memberships_team_id_fkey is ON DELETE CASCADE (schema.sql), so
    // deleting the team also removes the membership row created above.
    // teardown() (module-level after()) is the crash backstop if this fails.
    await adminClient().from('teams').delete().eq('id', recursionAdmin.teamId);
  });

  // Multiple permissive SELECT policies on the same table are combined with
  // OR — so a NON-admin reading team_memberships still requires Postgres to
  // evaluate admin_manages_memberships's USING clause (is_active_admin()),
  // not just user_sees_own_membership's. Pre-007, this is exactly why EVERY
  // authenticated reader of team_memberships hit the recursion error, not
  // only admins. Broadest-reach regression guard in this block.
  test('M1: coach A (non-admin) CAN read own team_memberships row (no recursion)', async () => {
    const res = await coachA.from('team_memberships').select('id, role, status').eq('team_id', TEAM_A);
    assert.equal(
      res.error, null,
      'REGRESSION: reading team_memberships as an authenticated non-admin errored ' +
      '(migration 007\'s recursion fix may have regressed). Got: ' + JSON.stringify(res.error)
    );
    assert.equal(res.data.length, 1, 'coach A must see their own team_memberships row');
  });

  // The scenario migration 007's header names directly: an admin
  // authenticating and reading team_memberships. admin_manages_memberships's
  // USING clause calls is_active_admin(), which itself queries
  // team_memberships — the exact self-referential shape that recursed
  // before 007's SECURITY DEFINER fix broke the loop.
  test('M2: admin-authenticated CAN read team_memberships (migration 007 regression guard)', async () => {
    const res = await recursionAdminClient.from('team_memberships').select('id, role, status');
    assert.equal(
      res.error, null,
      'REGRESSION: reading team_memberships as an authenticated admin errored — ' +
      'migration 007\'s recursion fix may have regressed. Got: ' + JSON.stringify(res.error)
    );
    assert.ok(res.data.length >= 1, 'admin must see at least their own team_memberships row');
  });

  // access_requests' admin_manages_requests policy was rewritten by the same
  // migration to call is_active_admin() instead of the same inline
  // subquery. Reading team_memberships from inside that USING clause is
  // cross-table, not self-recursive, but it still failed pre-007 — see
  // 007's header, "blast radius was wider than one table".
  test('M3: admin-authenticated CAN read access_requests (migration 007 regression guard)', async () => {
    const res = await recursionAdminClient.from('access_requests').select('id').limit(1);
    assert.equal(
      res.error, null,
      'REGRESSION: reading access_requests as an authenticated admin errored — ' +
      'migration 007\'s cross-table fix may have regressed. Got: ' + JSON.stringify(res.error)
    );
  });

  // Same cross-table shape as M3, for feedback's "feedback: admin select" policy.
  test('M4: admin-authenticated CAN read feedback (migration 007 regression guard)', async () => {
    const res = await recursionAdminClient.from('feedback').select('id').limit(1);
    assert.equal(
      res.error, null,
      'REGRESSION: reading feedback as an authenticated admin errored — migration ' +
      '007\'s cross-table fix may have regressed. Got: ' + JSON.stringify(res.error)
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

// ═════════════════════════════════════════════════════════════════════════════
// LS — live-scoring anon-test backdoors (#355 / D-S355, Test-Health Survey
//      Pass 3, added 2026-08-02). UNLIKE EVERY OTHER BLOCK IN THIS FILE, these
//      tests are NOT expected to pass. #355 is a real, unfixed vulnerability —
//      this block is the RED-by-design executable spec that #355's eventual
//      fix must turn GREEN, mirroring exactly how S1b/S3/S4a were committed
//      RED before WS-3 closed #342 (see this file's top-of-file header). A
//      failure here is not a regression to chase; it is the tracked, open
//      vulnerability, expected, until the database itself is fixed.
//
//      Policies under test (docs/db/schema.sql § 8, all reproduced there
//      "because they are in prod, not because they are correct"):
//        - at_bats_anon_test    FOR ALL, USING/WITH CHECK scoped to
//          team_id = ANY(ARRAY['1774297491626', '9000000000001']) — the two
//          hardcoded ids.
//        - game_state_anon_test / scorer_lock_anon_test / audit_log_anon_test
//          — the same hardcoded-array scoping, on live_game_state /
//          game_scoring_sessions / scoring_audit_log respectively.
//        - allow_scorer_writes — USING(true) WITH CHECK(true), FOR ALL, on
//          live_game_state / game_scoring_sessions / scoring_audit_log ONLY.
//          NO team scoping whatsoever — strictly BROADER than the four named
//          backdoors above, since it grants anon a write on ANY team's row,
//          not just the two hardcoded ones. at_bats has no such catch-all: its
//          only anon write path is the scoped at_bats_anon_test, so at_bats'
//          exposure is bounded to the two hardcoded ids while the other three
//          tables' is not. LS7-control below is the test that proves that
//          distinction, and is the one test in this block expected to PASS.
//
//      Test team id: LS_BACKDOOR_TEAM_ID ('9000000000001', seed.js) is the
//      SECOND of the two hardcoded ids — the "Demo All-Stars" fixture team
//      already named in docs/db/dev_rebuild.sql / docs/TROUBLESHOOTING.md.
//      The FIRST id, the real Mud Hens team, is deliberately never typed into
//      this test file even though clients.js's blast-radius fence already
//      makes this suite structurally incapable of running against prod — both
//      ids are equally exposed by the live policy, so there is no reason to
//      prefer the real one. LS_ARBITRARY_TEAM_ID is a synthetic id that
//      appears NOWHERE in the hardcoded array, used to prove
//      allow_scorer_writes' lack of scoping is broader than the array itself.
//
//      Cleanup: each test deletes its own inserted row by game_id immediately
//      (mirrors RS5/T3-control/T5-control/T7-control's inline cleanup);
//      seed.js's teardown() carries a LIKE-pattern sweep on game_id as the
//      crash backstop. Deliberately never a team_id-scoped delete —
//      LS_BACKDOOR_TEAM_ID is a real fixture team that may hold legitimate
//      rows on DEV outside this suite's own game_ids.
// ═════════════════════════════════════════════════════════════════════════════
describe('LS — live-scoring anon-test backdoors (#355, RED-by-design)', () => {

  test('LS1: anon CANNOT write live_game_state for the hardcoded backdoor team (game_state_anon_test)', { skip: '#355 tracked, unfixed — see PR #506. Not a regression to chase; do not un-skip without the vulnerability actually being fixed first.' }, async () => {
    const res = await anon.from('live_game_state').insert({
      game_id: LS_GAME_ID_BACKDOOR, team_id: LS_BACKDOOR_TEAM_ID, my_score: 99, opponent_score: 0,
    }).select();
    assert.ok(
      isWriteBlocked(res) || !returnedRows(res),
      'EXPOSURE (#355): anon wrote a live_game_state row via the hardcoded ' +
      'game_state_anon_test backdoor. A live game\'s score is forgeable by ' +
      'anyone holding the public anon key, no session required.'
    );
    if (returnedRows(res)) {
      await adminClient().from('live_game_state').delete().eq('game_id', LS_GAME_ID_BACKDOOR);
    }
  });

  test('LS2: anon CANNOT write live_game_state for an arbitrary (non-hardcoded) team (allow_scorer_writes)', { skip: '#355 tracked, unfixed — see PR #506. Not a regression to chase; do not un-skip without the vulnerability actually being fixed first.' }, async () => {
    const res = await anon.from('live_game_state').insert({
      game_id: LS_GAME_ID_ARBITRARY, team_id: LS_ARBITRARY_TEAM_ID, my_score: 99, opponent_score: 0,
    }).select();
    assert.ok(
      isWriteBlocked(res) || !returnedRows(res),
      'EXPOSURE (#355): anon wrote a live_game_state row for a team NOT in the ' +
      'backdoor\'s hardcoded array. allow_scorer_writes (USING(true) WITH ' +
      'CHECK(true)) has no team scoping at all — broader than the four named ' +
      'backdoors, not narrower.'
    );
    if (returnedRows(res)) {
      await adminClient().from('live_game_state').delete().eq('game_id', LS_GAME_ID_ARBITRARY);
    }
  });

  test('LS3: anon CANNOT claim/overwrite the scorer lock in game_scoring_sessions for the hardcoded backdoor team (scorer_lock_anon_test)', { skip: '#355 tracked, unfixed — see PR #506. Not a regression to chase; do not un-skip without the vulnerability actually being fixed first.' }, async () => {
    const res = await anon.from('game_scoring_sessions').insert({
      game_id: LS_GAME_ID_BACKDOOR, team_id: LS_BACKDOOR_TEAM_ID, scorer_name: 'RLS TEST INTRUDER',
    }).select();
    assert.ok(
      isWriteBlocked(res) || !returnedRows(res),
      'EXPOSURE (#355): anon created/claimed a game_scoring_sessions lock row ' +
      'via the hardcoded scorer_lock_anon_test backdoor. Anyone holding the ' +
      'anon key can steal the scorer lock on a live game.'
    );
    if (returnedRows(res)) {
      await adminClient().from('game_scoring_sessions').delete().eq('game_id', LS_GAME_ID_BACKDOOR);
    }
  });

  test('LS4: anon CANNOT claim the scorer lock for an arbitrary (non-hardcoded) team (allow_scorer_writes)', { skip: '#355 tracked, unfixed — see PR #506. Not a regression to chase; do not un-skip without the vulnerability actually being fixed first.' }, async () => {
    const res = await anon.from('game_scoring_sessions').insert({
      game_id: LS_GAME_ID_ARBITRARY, team_id: LS_ARBITRARY_TEAM_ID, scorer_name: 'RLS TEST INTRUDER',
    }).select();
    assert.ok(
      isWriteBlocked(res) || !returnedRows(res),
      'EXPOSURE (#355): anon claimed a scorer lock for a team NOT in the ' +
      'backdoor\'s hardcoded array. allow_scorer_writes grants this ' +
      'unconditionally, with no scoping at all.'
    );
    if (returnedRows(res)) {
      await adminClient().from('game_scoring_sessions').delete().eq('game_id', LS_GAME_ID_ARBITRARY);
    }
  });

  test('LS5: anon CANNOT forge a scoring_audit_log entry for the hardcoded backdoor team (audit_log_anon_test)', { skip: '#355 tracked, unfixed — see PR #506. Not a regression to chase; do not un-skip without the vulnerability actually being fixed first.' }, async () => {
    const res = await anon.from('scoring_audit_log').insert({
      game_id: LS_GAME_ID_BACKDOOR, team_id: LS_BACKDOOR_TEAM_ID,
      action: 'rls_test_forged_entry', actor_name: 'RLS TEST INTRUDER',
    }).select();
    assert.ok(
      isWriteBlocked(res) || !returnedRows(res),
      'EXPOSURE (#355): anon forged a scoring_audit_log entry via the ' +
      'hardcoded audit_log_anon_test backdoor. The audit trail is fabricable ' +
      'by anyone holding the anon key — worse than the already-known ' +
      'forgeable-identity gap (WS-4, TEXT actor_user_id), since here the ' +
      'entire row is anon-writable, not just the actor identity within it.'
    );
    if (returnedRows(res)) {
      await adminClient().from('scoring_audit_log').delete().eq('game_id', LS_GAME_ID_BACKDOOR);
    }
  });

  test('LS6: anon CANNOT forge a scoring_audit_log entry for an arbitrary (non-hardcoded) team (allow_scorer_writes)', { skip: '#355 tracked, unfixed — see PR #506. Not a regression to chase; do not un-skip without the vulnerability actually being fixed first.' }, async () => {
    const res = await anon.from('scoring_audit_log').insert({
      game_id: LS_GAME_ID_ARBITRARY, team_id: LS_ARBITRARY_TEAM_ID,
      action: 'rls_test_forged_entry', actor_name: 'RLS TEST INTRUDER',
    }).select();
    assert.ok(
      isWriteBlocked(res) || !returnedRows(res),
      'EXPOSURE (#355): anon forged a scoring_audit_log entry for a team NOT ' +
      'in the backdoor\'s hardcoded array. allow_scorer_writes grants this ' +
      'unconditionally, with no scoping at all.'
    );
    if (returnedRows(res)) {
      await adminClient().from('scoring_audit_log').delete().eq('game_id', LS_GAME_ID_ARBITRARY);
    }
  });

  test('LS7: anon CANNOT forge an at_bats row for the hardcoded backdoor team (at_bats_anon_test)', { skip: '#355 tracked, unfixed — see PR #506. Not a regression to chase; do not un-skip without the vulnerability actually being fixed first.' }, async () => {
    const res = await anon.from('at_bats').insert({
      game_id: LS_GAME_ID_BACKDOOR, team_id: LS_BACKDOOR_TEAM_ID, inning: 1,
      batter_id: 'rls-test-intruder', batter_name: 'RLS TEST INTRUDER',
    }).select();
    assert.ok(
      isWriteBlocked(res) || !returnedRows(res),
      'EXPOSURE (#355): anon inserted an at_bats row via the hardcoded ' +
      'at_bats_anon_test backdoor. Any anon caller can forge at-bat history ' +
      'for the two hardcoded teams.'
    );
    if (returnedRows(res)) {
      await adminClient().from('at_bats').delete().eq('game_id', LS_GAME_ID_BACKDOOR);
    }
  });

  // Control, NOT red: at_bats has no allow_scorer_writes catch-all — its only
  // anon write path is the scoped at_bats_anon_test exercised by LS7 above.
  // So unlike LS2/LS4/LS6, an arbitrary (non-hardcoded) team id should already
  // be blocked here, today, with no fix required. This is the one test in the
  // LS block expected to PASS — it documents that at_bats' #355 exposure is
  // narrower than the other three tables', not that the table is unaffected
  // (LS7 shows it is, for the two hardcoded ids specifically).
  test('LS7-control: anon CANNOT insert at_bats for an arbitrary (non-hardcoded) team (no catch-all exists on this table)', async () => {
    const res = await anon.from('at_bats').insert({
      game_id: LS_GAME_ID_ARBITRARY, team_id: LS_ARBITRARY_TEAM_ID, inning: 1,
      batter_id: 'rls-test-intruder', batter_name: 'RLS TEST INTRUDER',
    }).select();
    assert.ok(
      isWriteBlocked(res) || !returnedRows(res),
      'at_bats has no allow_scorer_writes catch-all, so a non-hardcoded team ' +
      'should already be blocked — if this fails, at_bats gained a broader ' +
      'anon write path than at_bats_anon_test alone, and #355 is worse than documented.'
    );
    if (returnedRows(res)) {
      await adminClient().from('at_bats').delete().eq('game_id', LS_GAME_ID_ARBITRARY);
    }
  });

});
