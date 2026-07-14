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

const COACH_A_EMAIL = 'zzz-rls-coach-a@dugout-rls-test.invalid';
const COACH_B_EMAIL = 'zzz-rls-coach-b@dugout-rls-test.invalid';

const SHARE_ID = 'zzzrls01';   // share_links.id is TEXT; prod ids are 8 hex chars

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
  const teams = [TEAM_A, TEAM_B];

  await admin.from('share_links').delete().eq('id', SHARE_ID);
  await admin.from('team_data_history').delete().in('team_id', teams);
  await admin.from('roster_snapshots').delete().in('team_id', teams);
  await admin.from('team_memberships').delete().in('team_id', teams);
  await admin.from('team_data').delete().in('team_id', teams);
  await admin.from('teams').delete().in('id', teams);

  for (const email of [COACH_A_EMAIL, COACH_B_EMAIL]) {
    const user = await findUserByEmail(admin, email);
    if (user) {
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) throw new Error('deleteUser failed for ' + email + ': ' + error.message);
    }
  }
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
  COACH_A_EMAIL,
  COACH_B_EMAIL,
  SHARE_ID,
  FAKE_ROSTER,
  seed,
  teardown,
};
