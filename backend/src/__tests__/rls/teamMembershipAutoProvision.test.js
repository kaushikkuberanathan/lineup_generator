// backend/src/__tests__/rls/teamMembershipAutoProvision.test.js
//
// Regression suite for #561.
//
// Two distinct, stacked bugs were found investigating this issue — the
// original report only described the second one:
//
// 1. NOT in the original issue, found during this investigation: dbSaveTeams()
//    (frontend/src/supabase.js) used `.upsert(row, { onConflict: 'id' })` to
//    create a brand-new team. Postgres enforces the UPDATE policy's WITH
//    CHECK for INSERT ... ON CONFLICT DO UPDATE EVEN WHEN NO CONFLICT OCCURS
//    (documented Postgres RLS behavior — confirmed empirically against a
//    real project, see backend/migrations/018's header). teams_auth_update
//    requires an existing active admin/coach team_memberships row; a
//    brand-new team never has one, so that upsert was unconditionally
//    RLS-denied — for EVERY self-serve team creation, not just an existing
//    coach's *additional* team as originally scoped. Fixed by changing
//    dbSaveTeams() to a plain INSERT with a fallback UPDATE only on a real
//    conflict (23505) — never invokes the ON CONFLICT DO UPDATE construct.
//
// 2. THE ORIGINAL #561 REPORT: even once the teams row exists, no code path
//    ever wrote a team_memberships row for the creator — so the coach's
//    first team_data save (roster/schedule/anything) hit
//    team_data_auth_insert's WITH CHECK (same admin/coach + active
//    membership requirement) and was silently RLS-denied. Fixed by migration
//    018 (handle_new_team — a SECURITY DEFINER AFTER INSERT trigger on
//    public.teams) auto-provisioning role=admin/status=active membership for
//    auth.uid() whenever an authenticated session inserts a new team row.
//
// This suite reproduces the CORRECTED write shapes end-to-end (TM1 mirrors
// the fixed dbSaveTeams(), TM2 mirrors dbSaveTeamData() unchanged, TM4
// mirrors dbSaveTeams()'s fallback-to-UPDATE path for an existing team) —
// not the original buggy upsert-with-onConflict shape, which is documented
// above and in migration 018's header rather than re-asserted as a test,
// since asserting "this specific old pattern still fails" would need
// permanent skip-annotation upkeep (LS-block style) for a pattern the fix
// deliberately removes from the codebase rather than leaves in place broken.
//
// Self-contained: its own throwaway user + team id, not the shared seed.js
// fixture (TEAM_A/TEAM_B) — same "kept out of the shared before()" reasoning
// as seedAdminDeleteFixture()/seedAdminRecursionFixture() in seed.js, just
// carried one step further into its own file since this suite tests a new
// mechanism (a trigger + a changed write shape), not an existing policy.

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { adminClient, authedClient } = require('./clients');

const TEST_EMAIL = 'zzz-rls-membership-autoprovision@dugout-rls-test.invalid';
const TEST_TEAM_ID = 'zzz-rls-test-autoprovision-team';

async function findUserByEmail(admin, email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error('listUsers failed: ' + error.message);
  return data.users.find((u) => u.email === email) || null;
}

/** Safe to call when nothing exists — mirrors seed.js's teardown() shape. */
async function teardown() {
  const admin = adminClient();
  await admin.from('team_data').delete().eq('team_id', TEST_TEAM_ID);
  await admin.from('team_memberships').delete().eq('team_id', TEST_TEAM_ID);
  await admin.from('teams').delete().eq('id', TEST_TEAM_ID);
  const user = await findUserByEmail(admin, TEST_EMAIL);
  if (user) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw new Error('deleteUser failed for ' + TEST_EMAIL + ': ' + error.message);
  }
}

describe('TM — auto-provisioned team_memberships on team creation (#561)', () => {
  let coach;

  before(async () => {
    await teardown();
    const admin = adminClient();
    const { error: userErr } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      email_confirm: true,
    });
    if (userErr) throw new Error('createUser failed for ' + TEST_EMAIL + ': ' + userErr.message);
    coach = await authedClient(TEST_EMAIL);
  });

  after(async () => {
    await teardown();
  });

  // Mirrors the FIXED dbSaveTeams(): a plain INSERT, no ON CONFLICT clause.
  // This is what stopped being RLS-denied — see bug #1 in the file header.
  test('TM1: authenticated coach CAN create a new team via plain INSERT (bug #1 fix)', async () => {
    const res = await coach.from('teams').insert(
      { id: TEST_TEAM_ID, name: 'ZZZ RLS Test Auto-Provision', age_group: '8U', year: 2026, season: 'Spring', sport: 'baseball' }
    );
    assert.equal(
      res.error, null,
      'REGRESSION (#561 bug #1): plain INSERT into teams was RLS-denied for a brand-new team.'
    );
  });

  // THE ORIGINAL #561 REGRESSION GUARD (bug #2). Before migration 018: no
  // team_memberships row exists for (coach, TEST_TEAM_ID), so
  // team_data_auth_insert's WITH CHECK fails and this INSERT is silently
  // RLS-denied — reproducing #561 exactly (dbSaveTeamData()'s own bare
  // .upsert() shape, unchanged by this fix). After 018: the AFTER INSERT
  // trigger on teams already provisioned the membership by the time this
  // runs, so it succeeds.
  test('TM2: the SAME coach CAN save team_data for the team they just created (#561 bug #2 regression guard)', async () => {
    const res = await coach.from('team_data').upsert(
      {
        team_id: TEST_TEAM_ID, roster: [], schedule: [], practices: [],
        batting_order: [], grid: {}, innings: 6, locked: false,
      },
      { onConflict: 'team_id' }
    );
    assert.equal(
      res.error, null,
      'REGRESSION (#561 bug #2): a coach could not save team_data for a team they just created — ' +
      'createTeam() never provisions a team_memberships row, so team_data_auth_insert\'s ' +
      'WITH CHECK silently denies the write. Got: ' + JSON.stringify(res.error)
    );
  });

  // Direct proof of the mechanism, not just its downstream effect — confirms
  // the trigger inserted the expected row shape, not merely that some other
  // path happened to let TM2 through.
  test('TM3: team_memberships row exists for the creator with role=admin, status=active', async () => {
    const admin = adminClient();
    const res = await admin.from('team_memberships').select('role, status').eq('team_id', TEST_TEAM_ID);
    assert.equal(res.error, null, 'membership lookup must not error');
    assert.equal(res.data.length, 1, 'exactly one team_memberships row must exist for the creator');
    assert.equal(res.data[0].role, 'admin', 'the auto-provisioned role must be admin');
    assert.equal(res.data[0].status, 'active', 'the auto-provisioned status must be active');
  });

  // Mirrors dbSaveTeams()'s FALLBACK path (editingTeam / migration call
  // sites in App.jsx re-save an EXISTING team): a second plain INSERT for
  // the same id must hit a real conflict (23505), then the explicit
  // .update() fallback must succeed for the rightful owner, and must NOT
  // fire the teams AFTER INSERT trigger again (no duplicate membership row).
  test('TM4: re-saving the same team (INSERT-conflict -> UPDATE fallback) succeeds and does not duplicate the membership row', async () => {
    const conflictRes = await coach.from('teams').insert(
      { id: TEST_TEAM_ID, name: 'ZZZ RLS Test Auto-Provision (conflict attempt)', age_group: '8U', year: 2026, season: 'Spring', sport: 'baseball' }
    );
    assert.equal(conflictRes.error?.code, '23505', 're-inserting the same id must hit a real unique-constraint conflict');

    const updateRes = await coach.from('teams').update(
      { id: TEST_TEAM_ID, name: 'ZZZ RLS Test Auto-Provision (renamed)', age_group: '8U', year: 2026, season: 'Spring', sport: 'baseball' }
    ).eq('id', TEST_TEAM_ID);
    assert.equal(updateRes.error, null, 'the fallback UPDATE must succeed for the rightful (admin) owner');

    const admin = adminClient();
    const membershipRes = await admin.from('team_memberships').select('id').eq('team_id', TEST_TEAM_ID);
    assert.equal(membershipRes.data.length, 1, 'an UPDATE must not fire the teams AFTER INSERT trigger again');
  });
});
