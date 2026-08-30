// backend/src/__tests__/rls/schemaIntegrity.test.js
//
// Regression suite for #347.
//
// team_memberships had a declared FK to auth.users(id) but NONE to
// teams(id) — both columns were already TEXT, the FK simply never existed.
// admin.html's Coaches tab does `.from('team_memberships').select('*,
// teams(name)')`; PostgREST can only embed across a declared FK, so it threw
// "Could not find a relationship between 'team_memberships' and 'teams' in
// the schema cache" and the tab returned nothing. Fixed in prod 2026-07-13
// by migration 008. This survived 93 backend tests + 786 frontend tests +
// multiple CI runs — nothing asserted the FK inventory itself, only
// behavior built on top of an assumed schema shape.
//
// Two independent techniques, deliberately not just one:
//   1. Direct FK enforcement: insert a row with a dangling reference and
//      assert Postgres rejects it (23503, foreign_key_violation). This is
//      what a FK constraint IS — the most direct possible proof.
//   2. PostgREST embed resolution: the exact query shape that broke in
//      production. A FK can exist and (1) still pass while PostgREST's
//      schema cache is stale or the embed direction is wrong — this is the
//      user-facing symptom, not just the catalog fact.
//
// Runs against the real ephemeral Postgres (the `rls` CI job / a local
// `supabase start` stack) via clients.js's service-role adminClient() —
// bypasses RLS on purpose, since this checks schema SHAPE, not authorization.

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { adminClient } = require('./clients');

const TEST_TEAM_ID = 'zzz-rls-test-schema-integrity-team';
const NONEXISTENT_TEAM_ID = 'zzz-rls-test-schema-integrity-nonexistent-team';
// Well-formed UUID guaranteed not to exist in auth.users — never issued to a
// real Supabase Auth user (all-zeros with a valid v4 marker byte).
const DANGLING_USER_ID = '00000000-0000-4000-8000-000000000000';
const TEST_EMAIL_PREFIX = 'zzz-si-schema-integrity';

async function teardown() {
  const admin = adminClient();
  await admin.from('access_requests').delete().ilike('email', `${TEST_EMAIL_PREFIX}%`);
  await admin.from('team_memberships').delete().ilike('email', `${TEST_EMAIL_PREFIX}%`);
  await admin.from('teams').delete().eq('id', TEST_TEAM_ID);
}

describe('Schema integrity — foreign key inventory (#347)', () => {

  before(async () => {
    await teardown();
    const admin = adminClient();
    const { error } = await admin.from('teams').insert({
      id: TEST_TEAM_ID, name: 'ZZZ RLS Test Schema Integrity', age_group: '8U', year: 2026, season: 'Spring', sport: 'baseball',
    });
    if (error) throw new Error('seed teams insert failed: ' + error.message);
  });

  after(async () => {
    await teardown();
  });

  test('SI-1: team_memberships.team_id -> teams.id FK rejects a dangling team_id (23503)', async () => {
    const admin = adminClient();
    const res = await admin.from('team_memberships').insert({
      team_id: NONEXISTENT_TEAM_ID,
      email: `${TEST_EMAIL_PREFIX}-1@dugout-rls-test.invalid`,
      role: 'coach', status: 'invited',
    });
    assert.equal(res.error?.code, '23503',
      'REGRESSION (#347): team_memberships.team_id has no FK to teams.id — a dangling ' +
      'team_id was silently accepted instead of rejected. Got: ' + JSON.stringify(res.error));
  });

  test('SI-2: team_memberships.user_id -> auth.users.id FK rejects a dangling user_id (23503)', async () => {
    const admin = adminClient();
    // team_id is a REAL seeded team here — isolates the assertion to the
    // user_id FK specifically, not a side effect of SI-1's team_id check.
    const res = await admin.from('team_memberships').insert({
      team_id: TEST_TEAM_ID, user_id: DANGLING_USER_ID,
      email: `${TEST_EMAIL_PREFIX}-2@dugout-rls-test.invalid`,
      role: 'coach', status: 'invited',
    });
    assert.equal(res.error?.code, '23503',
      'REGRESSION (#347): team_memberships.user_id has no FK to auth.users.id — a dangling ' +
      'user_id was silently accepted instead of rejected. Got: ' + JSON.stringify(res.error));
  });

  test('SI-3: PostgREST resolves the team_memberships -> teams embed (the exact shape that broke the Coaches tab)', async () => {
    const admin = adminClient();
    const seed = await admin.from('team_memberships').insert({
      team_id: TEST_TEAM_ID,
      email: `${TEST_EMAIL_PREFIX}-3@dugout-rls-test.invalid`,
      role: 'coach', status: 'invited',
    });
    assert.equal(seed.error, null, 'seed insert must succeed');

    // Same select shape as admin.js's GET /admin/members and admin.html's
    // loadCoachesTab() — .select('*, teams(name)').
    const res = await admin.from('team_memberships').select('*, teams(name)').eq('team_id', TEST_TEAM_ID);
    assert.equal(res.error, null,
      'REGRESSION (#347, the original bug): PostgREST could not resolve the team_memberships ' +
      '-> teams embed — "Could not find a relationship... in the schema cache". This is the ' +
      'exact failure that broke the Coaches tab before migration 008. Got: ' + JSON.stringify(res.error));
    const row = res.data.find((r) => r.email === `${TEST_EMAIL_PREFIX}-3@dugout-rls-test.invalid`);
    assert.equal(row?.teams?.name, 'ZZZ RLS Test Schema Integrity',
      'the embed resolved with no error but did not actually return the joined team name');
  });

  // KNOWN GAP, tracked not silently assumed. #347's own body: "Audit for
  // OTHER missing FKs. Known: access_requests.team_id has no FK either (and
  // holds one NULL row)." Still true as of this test's authoring
  // (docs/db/schema.sql lists no FK on this column). Asserted as CURRENTLY
  // ACCEPTING a dangling team_id — the inverse of SI-1/SI-2 — specifically
  // so that if a future migration adds this FK, this test starts FAILING
  // and must be noticed and flipped to the SI-1/SI-2 shape, rather than a
  // real fix landing silently with no test ever updated either way.
  test('SI-4 (KNOWN GAP): access_requests.team_id has NO FK to teams.id yet', async () => {
    const admin = adminClient();
    const res = await admin.from('access_requests').insert({
      first_name: 'ZZZ', last_name: 'Schema Integrity Test',
      email: `${TEST_EMAIL_PREFIX}-4@dugout-rls-test.invalid`,
      team_id: NONEXISTENT_TEAM_ID, status: 'pending',
    });
    assert.equal(res.error, null,
      'This assertion is inverted from SI-1/SI-2 on purpose — if it now fails, a migration ' +
      'likely added the missing FK to access_requests.team_id. Flip this test to assert ' +
      '23503 instead of deleting it.');
  });

});
