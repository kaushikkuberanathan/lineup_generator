// backend/src/__tests__/rls/seed.js
//
// Fixture for the RLS policy suite (#348).
//
// Two teams, two coaches, each scoped to their own team. That shape is what
// makes S3 (cross-team block) testable at all — one team proves nothing.
//
// NO REAL PLAYER NAMES. The whole point of this workstream is that six teams'
// rosters of children are exposed. The fixture that tests it must not add more.

const { adminClient } = require('./clients');

// Fixed IDs, not random. A crashed run leaves identifiable orphans that the next
// run cleans up, rather than accumulating untracked UUIDs forever.
const TEAM_A = 'zzz-rls-test-a';
const TEAM_B = 'zzz-rls-test-b';

// Throwaway, single-test-use teams (#477 teams RLS coverage). Not part of the
// shared before()/after() fixture — each is created and destroyed by the one
// test that needs it (teams_auth_insert's positive control literally IS an
// insert; teams_auth_delete's positive control literally IS a delete), with
// teardown() below as an unconditional safety net if either test crashes
// mid-way. Kept out of the main seed() so a failure in one doesn't affect
// the TEAM_A/TEAM_B-based SELECT/UPDATE scenarios sharing the module-level
// `before()` session.
const TEAM_C = 'zzz-rls-test-c-admin-delete';
const TEAM_D = 'zzz-rls-test-d-insert-control';

// Throwaway team for the migration-007 recursion regression guard (#478 /
// D-S348b). Same "self-contained, single-test-use" reasoning as TEAM_C/TEAM_D
// above — kept out of the shared seed() so it cannot affect the TEAM_A/TEAM_B
// scenarios, with teardown() below as the crash backstop.
const TEAM_E = 'zzz-rls-test-e-recursion-admin';

const COACH_A_EMAIL = 'zzz-rls-coach-a@dugout-rls-test.invalid';
const COACH_B_EMAIL = 'zzz-rls-coach-b@dugout-rls-test.invalid';
const ADMIN_EMAIL   = 'zzz-rls-admin-delete@dugout-rls-test.invalid';
const ADMIN_RECURSION_EMAIL = 'zzz-rls-admin-recursion@dugout-rls-test.invalid';

const SHARE_ID = 'zzzrls01';   // share_links.id is TEXT; prod ids are 8 hex chars

// ─── D-S355 / #479 (LS scenarios) fixture constants ─────────────────────────
// LS_BACKDOOR_TEAM_ID is the SECOND of the two hardcoded ids in the
// *_anon_test backdoor policies (docs/db/schema.sql § 8: ANY(ARRAY[
// '1774297491626', '9000000000001'])) — the "Demo All-Stars" fixture team
// already named in docs/db/dev_rebuild.sql and docs/TROUBLESHOOTING.md. The
// FIRST id, '1774297491626', is the real, live Mud Hens team — deliberately
// never typed into test source here, even though clients.js's blast-radius
// fence already makes this suite incapable of running against prod. Both ids
// are equally exposed by the live policy; there is no reason to prefer the
// real one when a second, already-public placeholder proves the identical
// defect (same "no real names/ids beyond what's necessary" ethos as
// FAKE_ROSTER above).
const LS_BACKDOOR_TEAM_ID = '9000000000001';
// Deliberately NOT in the backdoor's hardcoded array — proves
// allow_scorer_writes (USING(true) WITH CHECK(true)) has NO team scoping at
// all, which is broader than the four named *_anon_test backdoors.
const LS_ARBITRARY_TEAM_ID = 'zzz-rls-test-ls-arbitrary';
// Unique game_ids, not random — same "identifiable orphan" reasoning as the
// fixed team ids above. Never delete LS_BACKDOOR_TEAM_ID rows by team_id: it
// is a real fixture team that may hold legitimate rows on DEV outside this
// suite's own game_ids.
const LS_GAME_ID_BACKDOOR = 'zzz-rls-test-ls-backdoor-game';
const LS_GAME_ID_ARBITRARY = 'zzz-rls-test-ls-arbitrary-game';

const FAKE_ROSTER = [
  { id: 'p1', name: 'Test Player One',   number: '1' },
  { id: 'p2', name: 'Test Player Two',   number: '2' },
  { id: 'p3', name: 'Test Player Three', number: '3' },
];

async function findUserByEmail(admin, email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error('listUsers failed: ' + error.message);
  return data.users.find((u) => u.email === email) || null;
}

/**
 * Delete every artifact this fixture creates. Safe to call when nothing exists.
 *
 * Order matters: team_data_history first. It has NO FK to teams (schema.sql),
 * so the ON DELETE CASCADE from teams will NOT reach it. Deleting the team
 * without this leaves orphan history rows in a table that is RLS-locked and
 * grant-revoked — invisible junk that only the service role can ever clean up.
 *
 * That this delete works AT ALL is the first proof in the suite that migration
 * 006 did what it claimed: the table is locked to anon, open to service_role.
 */
async function teardown() {
  const admin = adminClient();
  const teams = [TEAM_A, TEAM_B, TEAM_C, TEAM_D, TEAM_E];

  // D-S355 / #479 (LS scenarios) crash backstop. Matched by game_id, NEVER by
  // team_id — LS_BACKDOOR_TEAM_ID ('9000000000001') is a real fixture team
  // that may hold legitimate rows on DEV outside this suite's own game_ids,
  // and a team_id-scoped delete would risk wiping them. Each LS test also
  // cleans up its own row inline (mirrors RS5/T5-control); this is only the
  // safety net for a run that crashed before reaching that cleanup.
  await admin.from('scoring_audit_log').delete().like('game_id', 'zzz-rls-test-ls-%');
  await admin.from('at_bats').delete().like('game_id', 'zzz-rls-test-ls-%');
  await admin.from('game_scoring_sessions').delete().like('game_id', 'zzz-rls-test-ls-%');
  await admin.from('live_game_state').delete().like('game_id', 'zzz-rls-test-ls-%');

  await admin.from('share_links').delete().eq('id', SHARE_ID);
  await admin.from('team_data_history').delete().in('team_id', teams);
  await admin.from('roster_snapshots').delete().in('team_id', teams);
  await admin.from('team_memberships').delete().in('team_id', teams);
  await admin.from('team_data').delete().in('team_id', teams);
  await admin.from('teams').delete().in('id', teams);

  for (const email of [COACH_A_EMAIL, COACH_B_EMAIL, ADMIN_EMAIL, ADMIN_RECURSION_EMAIL]) {
    const user = await findUserByEmail(admin, email);
    if (user) {
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) throw new Error('deleteUser failed for ' + email + ': ' + error.message);
    }
  }
}

/**
 * Self-contained fixture for teams_auth_delete's positive control (#477):
 * a throwaway team with a real admin-role, active membership, so a test can
 * prove an actual admin CAN delete their own team — not just that a coach
 * (role='coach', the shared fixture's role) cannot. teams_auth_delete
 * requires role = 'admin' specifically, stricter than teams_auth_update's
 * role IN ('admin','coach'), so the shared coachA/coachB identities cannot
 * exercise this path at all.
 *
 * Called directly by the one test that needs it, not the module-level
 * before() — the test's own DELETE assertion is what tears this down in the
 * success case; teardown() above is the backstop if the test fails first.
 */
async function seedAdminDeleteFixture() {
  const admin = adminClient();

  const { data, error: userErr } = await admin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    email_confirm: true,
  });
  if (userErr) throw new Error('createUser failed for ' + ADMIN_EMAIL + ': ' + userErr.message);

  const { error: teamErr } = await admin.from('teams').insert({
    id: TEAM_C, name: 'ZZZ RLS Test C (admin delete)', age_group: '8U', year: 2026, sport: 'baseball',
  });
  if (teamErr) throw new Error('teams insert failed for TEAM_C: ' + teamErr.message);

  const { error: memErr } = await admin.from('team_memberships').insert({
    user_id: data.user.id, team_id: TEAM_C, role: 'admin', status: 'active', email: ADMIN_EMAIL,
  });
  if (memErr) throw new Error('team_memberships insert failed for TEAM_C admin: ' + memErr.message);

  return { teamId: TEAM_C, adminEmail: ADMIN_EMAIL };
}

/**
 * Self-contained fixture for the migration-007 recursion regression guard
 * (#478 / D-S348b): a throwaway team + a real admin-role, active
 * team_memberships row, so a test can authenticate AS that admin and read
 * team_memberships / access_requests / feedback — the three tables 007's fix
 * touched — proving none of them throw "infinite recursion detected in
 * policy for relation team_memberships" (the exact bug 007 fixed).
 * is_active_admin() is SECURITY DEFINER, so evaluating admin_manages_memberships's
 * USING clause (which calls it) reads team_memberships as the function's
 * owner, bypassing RLS and breaking the loop that the inline-subquery version
 * could not.
 *
 * Same reasoning as seedAdminDeleteFixture() above: kept out of the shared
 * seed()/before() fixture so a failure here cannot affect the TEAM_A/TEAM_B
 * scenarios. The test that uses this is responsible for its own cleanup
 * (delete the team; team_memberships_team_id_fkey is ON DELETE CASCADE per
 * schema.sql, so the membership row goes with it); teardown() above is the
 * crash backstop.
 */
async function seedAdminRecursionFixture() {
  const admin = adminClient();

  const { data, error: userErr } = await admin.auth.admin.createUser({
    email: ADMIN_RECURSION_EMAIL,
    email_confirm: true,
  });
  if (userErr) throw new Error('createUser failed for ' + ADMIN_RECURSION_EMAIL + ': ' + userErr.message);

  const { error: teamErr } = await admin.from('teams').insert({
    id: TEAM_E, name: 'ZZZ RLS Test E (recursion admin)', age_group: '8U', year: 2026, sport: 'baseball',
  });
  if (teamErr) throw new Error('teams insert failed for TEAM_E: ' + teamErr.message);

  const { error: memErr } = await admin.from('team_memberships').insert({
    user_id: data.user.id, team_id: TEAM_E, role: 'admin', status: 'active', email: ADMIN_RECURSION_EMAIL,
  });
  if (memErr) throw new Error('team_memberships insert failed for TEAM_E admin: ' + memErr.message);

  return { teamId: TEAM_E, adminEmail: ADMIN_RECURSION_EMAIL };
}

/**
 * Build the fixture. Runs teardown() first, unconditionally.
 *
 * team_memberships has a UNIQUE index on (team_id, email) — a crashed prior run
 * would otherwise wedge every subsequent run on a constraint violation.
 * Teardown-first makes the seed idempotent.
 */
async function seed() {
  await teardown();

  const admin = adminClient();

  // ─── Auth users ────────────────────────────────────────────────────────────
  // email_confirm: true — skips the confirmation step so generateLink works.
  const users = {};
  for (const [key, email] of [['a', COACH_A_EMAIL], ['b', COACH_B_EMAIL]]) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (error) throw new Error('createUser failed for ' + email + ': ' + error.message);
    users[key] = data.user;
  }

  // ─── Teams ─────────────────────────────────────────────────────────────────
  // teams.id is TEXT (schema.sql) — slugs are valid, no uuid cast needed.
  {
    const { error } = await admin.from('teams').insert([
      { id: TEAM_A, name: 'ZZZ RLS Test A', age_group: '8U', year: 2026, sport: 'baseball' },
      { id: TEAM_B, name: 'ZZZ RLS Test B', age_group: '8U', year: 2026, sport: 'baseball' },
    ]);
    if (error) throw new Error('teams insert failed: ' + error.message);
  }

  // ─── team_data ─────────────────────────────────────────────────────────────
  // This INSERT fires trg_snapshot_team_data -> writes to team_data_history.
  // Expected. teardown() cleans it up explicitly (no FK cascade reaches it).
  {
    const { error } = await admin.from('team_data').insert([
      { team_id: TEAM_A, roster: FAKE_ROSTER, innings: 6, locked: false },
      { team_id: TEAM_B, roster: FAKE_ROSTER, innings: 6, locked: false },
    ]);
    if (error) throw new Error('team_data insert failed: ' + error.message);
  }

  // ─── Memberships ───────────────────────────────────────────────────────────
  // role 'coach', status 'active'. Both are inside the SEVEN-value CHECK that
  // prod actually enforces (schema.sql) — NOT the four the repo's migration
  // tree claims. Building against the repo's version is what broke signup (009).
  {
    const { error } = await admin.from('team_memberships').insert([
      { user_id: users.a.id, team_id: TEAM_A, role: 'coach', status: 'active', email: COACH_A_EMAIL },
      { user_id: users.b.id, team_id: TEAM_B, role: 'coach', status: 'active', email: COACH_B_EMAIL },
    ]);
    if (error) throw new Error('team_memberships insert failed: ' + error.message);
  }

  // ─── roster_snapshots ──────────────────────────────────────────────────────
  // One real row per team so a SELECT returning zero rows can only mean "RLS
  // filtered it", never "the table happened to be empty" (#477). trigger_event
  // must be one of the CHECK constraint's four values (schema.sql) — the
  // column's own DEFAULT ('manual') is NOT one of them, so every insert here,
  // including this fixture, must pass an explicit valid value or hit that
  // constraint. trg_prune_roster_snapshots fires AFTER INSERT and keeps only
  // the latest 10 rows per team_id — one row per team is nowhere near that
  // cap, so it's a no-op here.
  {
    const { error } = await admin.from('roster_snapshots').insert([
      { team_id: TEAM_A, team_name: 'ZZZ RLS Test A', roster: FAKE_ROSTER, trigger_event: 'manual_export' },
      { team_id: TEAM_B, team_name: 'ZZZ RLS Test B', roster: FAKE_ROSTER, trigger_event: 'manual_export' },
    ]);
    if (error) throw new Error('roster_snapshots insert failed: ' + error.message);
  }

  // ─── Share link ────────────────────────────────────────────────────────────
  // Payload is inline and self-contained. This is the architectural fact that
  // lets team_data be fully locked without breaking viewer mode: the viewer
  // reads share_links.payload, never team_data. The suite must PROVE that.
  {
    const { error } = await admin.from('share_links').insert({
      id: SHARE_ID,
      payload: {
        teamName: 'ZZZ RLS Test A',
        roster: FAKE_ROSTER,
        battingOrder: ['p1', 'p2', 'p3'],
        grid: {},
        innings: 6,
      },
    });
    if (error) throw new Error('share_links insert failed: ' + error.message);
  }

  return {
    teamA: TEAM_A,
    teamB: TEAM_B,
    coachA: { id: users.a.id, email: COACH_A_EMAIL },
    coachB: { id: users.b.id, email: COACH_B_EMAIL },
    shareId: SHARE_ID,
  };
}

module.exports = {
  TEAM_A,
  TEAM_B,
  TEAM_C,
  TEAM_D,
  TEAM_E,
  COACH_A_EMAIL,
  COACH_B_EMAIL,
  ADMIN_EMAIL,
  ADMIN_RECURSION_EMAIL,
  SHARE_ID,
  FAKE_ROSTER,
  LS_BACKDOOR_TEAM_ID,
  LS_ARBITRARY_TEAM_ID,
  LS_GAME_ID_BACKDOOR,
  LS_GAME_ID_ARBITRARY,
  seed,
  teardown,
  seedAdminDeleteFixture,
  seedAdminRecursionFixture,
};
