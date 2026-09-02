/**
 * homeCapabilities.test.js
 * Pure unit coverage for the Home read-model capability/action assembly
 * (Story #1023/#1024) — no Supabase, no server, no network.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { resolveRole, capabilitiesForRole, buildActions } = require('../lib/homeCapabilities');

describe('resolveRole', () => {
  test('canonical and legacy role values normalize to the same 4-role vocabulary', () => {
    assert.deepEqual(resolveRole('admin'), { code: 'admin', label: 'Team Admin / Head Coach' });
    assert.deepEqual(resolveRole('team_admin'), { code: 'admin', label: 'Team Admin / Head Coach' });
    assert.deepEqual(resolveRole('coach'), { code: 'coach', label: 'Coach / Coordinator' });
    assert.deepEqual(resolveRole('coordinator'), { code: 'coach', label: 'Coach / Coordinator' });
    assert.deepEqual(resolveRole('scorekeeper'), { code: 'scorekeeper', label: 'Scorekeeper' });
    assert.deepEqual(resolveRole('viewer'), { code: 'viewer', label: 'Team Member / Parent' });
    assert.deepEqual(resolveRole('parent'), { code: 'viewer', label: 'Team Member / Parent' });
  });

  test('platform_admin is forbidden as a team role', () => {
    assert.throws(() => resolveRole('platform_admin'), (err) => err.code === 'ROLE_FORBIDDEN');
  });

  test('unrecognized role throws ROLE_UNKNOWN', () => {
    assert.throws(() => resolveRole('not_a_real_role'), (err) => err.code === 'ROLE_UNKNOWN');
  });
});

describe('capabilitiesForRole — section 26.1 baseline matrix', () => {
  test('admin gets team.manage and membership.manage; coach does not', () => {
    const admin = capabilitiesForRole('admin');
    const coach = capabilitiesForRole('coach');
    assert.ok(admin.includes('team.manage'));
    assert.ok(admin.includes('membership.manage'));
    assert.ok(!coach.includes('team.manage'));
    assert.ok(!coach.includes('membership.manage'));
  });

  test('scorekeeper has scoring.claim/record but not roster.manage or lineup.create', () => {
    const scorekeeper = capabilitiesForRole('scorekeeper');
    assert.ok(scorekeeper.includes('scoring.claim'));
    assert.ok(scorekeeper.includes('scoring.record'));
    assert.ok(!scorekeeper.includes('roster.manage'));
    assert.ok(!scorekeeper.includes('lineup.create'));
  });

  test('viewer never receives scoring.claim, scoring.record, or scoring.finalize by role alone', () => {
    const viewer = capabilitiesForRole('viewer');
    assert.ok(!viewer.includes('scoring.claim'));
    assert.ok(!viewer.includes('scoring.record'));
    assert.ok(!viewer.includes('scoring.finalize'));
    assert.ok(viewer.includes('scoring.view'));
  });

  test('unknown role code returns an empty capability list, not a crash', () => {
    assert.deepEqual(capabilitiesForRole('bogus'), []);
  });

  test('returned array is a copy — mutating it does not corrupt the shared matrix', () => {
    const first = capabilitiesForRole('admin');
    first.push('fake.capability');
    const second = capabilitiesForRole('admin');
    assert.ok(!second.includes('fake.capability'));
  });
});

describe('buildActions', () => {
  const baseTeam = {
    id: 'team_1',
    displayName: 'Mud Hens',
    nextEvent: null,
  };

  test('viewer with no next event gets only view actions, never scoring.claim', () => {
    const capabilities = capabilitiesForRole('viewer');
    const actions = buildActions({ ...baseTeam, capabilities });
    const ids = actions.map((a) => a.id);
    assert.ok(ids.includes('view_roster'));
    assert.ok(ids.includes('view_schedule'));
    assert.ok(ids.includes('view_lineup'));
    assert.ok(!ids.includes('claim_scoring'));
    assert.ok(!ids.includes('start_game_mode'));
    assert.ok(!ids.includes('manage_roster'));
  });

  test('admin with an upcoming game gets manage actions plus start_game_mode and claim_scoring', () => {
    const capabilities = capabilitiesForRole('admin');
    const nextEvent = { id: 'game_1' };
    const actions = buildActions({ ...baseTeam, capabilities, nextEvent });
    const ids = actions.map((a) => a.id);
    assert.ok(ids.includes('manage_roster'));
    assert.ok(ids.includes('manage_schedule'));
    assert.ok(ids.includes('manage_team'));
    assert.ok(ids.includes('start_game_mode'));
    assert.ok(ids.includes('claim_scoring'));
  });

  test('scorekeeper with an upcoming game can claim scoring but never gets manage_roster', () => {
    const capabilities = capabilitiesForRole('scorekeeper');
    const nextEvent = { id: 'game_1' };
    const actions = buildActions({ ...baseTeam, capabilities, nextEvent });
    const ids = actions.map((a) => a.id);
    assert.ok(ids.includes('claim_scoring'));
    assert.ok(ids.includes('start_game_mode'));
    assert.ok(!ids.includes('manage_roster'));
    assert.ok(!ids.includes('manage_team'));
  });

  test('coach with no upcoming event never gets start_game_mode or claim_scoring (no fake game ID)', () => {
    const capabilities = capabilitiesForRole('coach');
    const actions = buildActions({ ...baseTeam, capabilities, nextEvent: null });
    const ids = actions.map((a) => a.id);
    assert.ok(!ids.includes('start_game_mode'));
    assert.ok(!ids.includes('claim_scoring'));
  });

  test('every action href is team-scoped under /app/teams/:teamId', () => {
    const capabilities = capabilitiesForRole('admin');
    const actions = buildActions({ ...baseTeam, capabilities, nextEvent: { id: 'game_1' } });
    for (const action of actions) {
      assert.match(action.href, /^\/app\/teams\/team_1(\/|$)/);
    }
  });

  test('every action carries a non-null id, label, href, and boolean enabled, with disabledReason present (possibly null)', () => {
    const capabilities = capabilitiesForRole('admin');
    const actions = buildActions({ ...baseTeam, capabilities, nextEvent: { id: 'game_1' } });
    for (const action of actions) {
      assert.equal(typeof action.id, 'string');
      assert.equal(typeof action.label, 'string');
      assert.equal(typeof action.href, 'string');
      assert.equal(typeof action.enabled, 'boolean');
      assert.ok('disabledReason' in action);
    }
  });
});
