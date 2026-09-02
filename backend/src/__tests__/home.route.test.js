/**
 * home.route.test.js
 * Route-level coverage for GET /api/v1/home (Story #1023) — the versioned
 * Home read-model contract's real implementation. Hermetic: supabaseAdmin
 * is monkey-patched per table, no network, no live DB.
 */
const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const request = require('supertest');
const { supabaseAdmin } = require('../lib/supabase');
const app = require('../../app');

const originalAdminFrom = supabaseAdmin.from;
const originalGetUser = supabaseAdmin.auth.getUser;

const USER_ID = '44444444-4444-4444-8444-444444444444';
const USER_EMAIL = 'coach@example.com';
const TOKEN = 'fake-bearer-token';

/**
 * @param {object} opts
 * @param {Array}  [opts.memberships] - team_memberships rows the .or().eq('status','active') query returns
 * @param {Array}  [opts.teams]       - teams rows the .in('id', ...) query returns
 * @param {Array}  [opts.teamData]    - team_data rows the .in('team_id', ...) query returns
 * @param {boolean}[opts.rejectAuth]
 */
function installStubs({ memberships = [], teams = [], teamData = [], rejectAuth = false } = {}) {
  const calls = { fromTables: [], membershipFilter: null };

  supabaseAdmin.auth.getUser = async () => {
    if (rejectAuth) return { data: null, error: { message: 'invalid token' } };
    return { data: { user: { id: USER_ID, email: USER_EMAIL } }, error: null };
  };

  supabaseAdmin.from = (table) => {
    calls.fromTables.push(table);

    if (table === 'team_memberships') {
      const chain = {
        select: () => chain,
        or: () => chain,
        eq: async (field, value) => {
          calls.membershipFilter = [field, value];
          return { data: memberships, error: null };
        },
      };
      return chain;
    }

    if (table === 'teams') {
      const chain = {
        select: () => chain,
        in: async () => ({ data: teams, error: null }),
      };
      return chain;
    }

    if (table === 'team_data') {
      const chain = {
        select: () => chain,
        in: async () => ({ data: teamData, error: null }),
      };
      return chain;
    }

    throw new Error(`Unexpected table in home.route.test.js: ${table}`);
  };

  return calls;
}

afterEach(() => {
  supabaseAdmin.from = originalAdminFrom;
  supabaseAdmin.auth.getUser = originalGetUser;
});

describe('GET /api/v1/home', () => {
  test('H1: no Authorization header -> 401, no queries run', async () => {
    const calls = installStubs({ rejectAuth: true });
    const res = await request(app).get('/api/v1/home');
    assert.equal(res.status, 401);
    assert.equal(calls.fromTables.length, 0);
  });

  test('H2: zero active memberships -> 200 with defaultTeamId null and an empty teams array', async () => {
    installStubs({ memberships: [] });
    const res = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.version, 1);
    assert.equal(res.body.defaultTeamId, null);
    assert.deepEqual(res.body.teams, []);
  });

  test('H3: the membership query filters on status=active', async () => {
    const calls = installStubs({ memberships: [] });
    await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    assert.deepEqual(calls.membershipFilter, ['status', 'active']);
  });

  test('H4: one admin-role team with an upcoming game -> full response shape', async () => {
    installStubs({
      memberships: [{ team_id: 't1', role: 'admin', status: 'active' }],
      teams: [{ id: 't1', name: 'Mud Hens', age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' }],
      teamData: [{
        team_id: 't1',
        roster: [{ name: 'A' }, { name: 'B' }],
        schedule: [{ id: 'g1', date: '2099-01-01', time: '18:00', type: 'game', opponent: 'Braves', home: true }],
        grid: {},
        batting_order: [],
        locked: true,
        attendance_overrides: {},
      }],
    });
    const res = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.defaultTeamId, 't1');
    assert.equal(res.body.teams.length, 1);
    const team = res.body.teams[0];
    assert.equal(team.id, 't1');
    assert.equal(team.displayName, 'Mud Hens');
    assert.equal(team.role.code, 'admin');
    assert.ok(team.capabilities.includes('team.manage'));
    assert.equal(team.nextEvent.opponent, 'Braves');
    assert.equal(team.readiness.rosterCount, 2);
    assert.equal(team.readiness.lineupStatus, 'ready');
    assert.equal(team.readiness.lineupId, null);
    assert.ok(team.actions.some((a) => a.id === 'start_game_mode'));
  });

  test('H5: response never leaks full roster/schedule/grid payloads, only summaries', async () => {
    installStubs({
      memberships: [{ team_id: 't1', role: 'admin', status: 'active' }],
      teams: [{ id: 't1', name: 'Mud Hens', age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' }],
      teamData: [{ team_id: 't1', roster: [{ name: 'Secret Kid' }], schedule: [], grid: {}, batting_order: [], locked: false, attendance_overrides: {} }],
    });
    const res = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    const raw = JSON.stringify(res.body);
    assert.ok(!raw.includes('Secret Kid'));
    assert.equal(res.body.teams[0].roster, undefined);
    assert.equal(res.body.teams[0].schedule, undefined);
    assert.equal(res.body.teams[0].grid, undefined);
  });

  test('H6: two teams sharing a name are disambiguated by season/year in the response', async () => {
    installStubs({
      memberships: [
        { team_id: 't1', role: 'admin', status: 'active' },
        { team_id: 't2', role: 'admin', status: 'active' },
      ],
      teams: [
        { id: 't1', name: 'Mud Hens', age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' },
        { id: 't2', name: 'Mud Hens', age_group: '8U', season: 'Spring', year: 2026, sport: 'baseball' },
      ],
      teamData: [
        { team_id: 't1', roster: [], schedule: [], grid: {}, batting_order: [], locked: false, attendance_overrides: {} },
        { team_id: 't2', roster: [], schedule: [], grid: {}, batting_order: [], locked: false, attendance_overrides: {} },
      ],
    });
    const res = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    const names = res.body.teams.map((t) => t.displayName).sort();
    assert.deepEqual(names, ['Mud Hens (Fall 2026)', 'Mud Hens (Spring 2026)']);
  });

  test('H7: a membership pointing at a team row that no longer exists is excluded, not a crash', async () => {
    installStubs({
      memberships: [{ team_id: 'orphaned', role: 'admin', status: 'active' }],
      teams: [],
      teamData: [],
    });
    const res = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.teams, []);
    assert.equal(res.body.defaultTeamId, null);
  });

  test('H8: an unrecognized/unnormalizable role is excluded rather than crashing the response', async () => {
    installStubs({
      memberships: [
        { team_id: 't1', role: 'totally_bogus_role', status: 'active' },
        { team_id: 't2', role: 'coach', status: 'active' },
      ],
      teams: [
        { id: 't1', name: 'Bad Role Team', age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' },
        { id: 't2', name: 'Good Team', age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' },
      ],
      teamData: [
        { team_id: 't1', roster: [], schedule: [], grid: {}, batting_order: [], locked: false, attendance_overrides: {} },
        { team_id: 't2', roster: [], schedule: [], grid: {}, batting_order: [], locked: false, attendance_overrides: {} },
      ],
    });
    const res = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.teams.length, 1);
    assert.equal(res.body.teams[0].id, 't2');
  });

  test('H9: exactly three supabaseAdmin.from() calls regardless of team count (no per-team amplification)', async () => {
    const memberships = Array.from({ length: 6 }, (_, i) => ({ team_id: `t${i}`, role: 'coach', status: 'active' }));
    const teams = memberships.map((m, i) => ({ id: m.team_id, name: `Team ${i}`, age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' }));
    const teamData = memberships.map((m) => ({ team_id: m.team_id, roster: [], schedule: [], grid: {}, batting_order: [], locked: false, attendance_overrides: {} }));
    const calls = installStubs({ memberships, teams, teamData });
    const res = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.teams.length, 6);
    assert.equal(calls.fromTables.length, 3);
    assert.deepEqual(calls.fromTables.sort(), ['team_data', 'team_memberships', 'teams']);
  });

  test('H10: caller-supplied X-Request-ID is echoed back on the response', async () => {
    installStubs({ memberships: [] });
    const res = await request(app)
      .get('/api/v1/home')
      .set('Authorization', `Bearer ${TOKEN}`)
      .set('X-Request-ID', 'my-custom-request-id-123');
    assert.equal(res.body.requestId, 'my-custom-request-id-123');
    assert.equal(res.headers['x-request-id'], 'my-custom-request-id-123');
  });

  test('H11: a malformed X-Request-ID is replaced with a server-generated one, not rejected', async () => {
    installStubs({ memberships: [] });
    const res = await request(app)
      .get('/api/v1/home')
      .set('Authorization', `Bearer ${TOKEN}`)
      .set('X-Request-ID', 'has spaces! not valid');
    assert.equal(res.status, 200);
    assert.notEqual(res.body.requestId, 'has spaces! not valid');
    assert.match(res.body.requestId, /^[A-Za-z0-9._:-]{1,128}$/);
  });

  test('H12: response sets private, no-cache headers (section 25.4)', async () => {
    installStubs({ memberships: [] });
    const res = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    assert.match(res.headers['cache-control'], /private/);
    assert.match(res.headers['cache-control'], /no-cache/);
    assert.equal(res.headers['vary'], 'Authorization');
  });

  test('H13: a missing team_data row for a team defaults to empty readiness, not a crash', async () => {
    installStubs({
      memberships: [{ team_id: 't1', role: 'coach', status: 'active' }],
      teams: [{ id: 't1', name: 'No Data Yet', age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' }],
      teamData: [],
    });
    const res = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    assert.equal(res.status, 200);
    const team = res.body.teams[0];
    assert.equal(team.readiness.rosterCount, 0);
    assert.equal(team.readiness.lineupStatus, 'none');
    assert.equal(team.nextEvent, null);
  });

  test('H14: a DB error on the memberships query returns the standard 500 error envelope', async () => {
    supabaseAdmin.auth.getUser = async () => ({ data: { user: { id: USER_ID, email: USER_EMAIL } }, error: null });
    supabaseAdmin.from = () => ({
      select: function () { return this; },
      or: function () { return this; },
      eq: async () => ({ data: null, error: { message: 'boom' } }),
    });
    const res = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    assert.equal(res.status, 500);
    assert.equal(res.body.error.code, 'INTERNAL_ERROR');
    assert.equal(typeof res.body.error.requestId, 'string');
  });

  test('H15: cross-team resource leakage is rejected — each team\'s nextEvent/action IDs never reference another team (#1024)', async () => {
    installStubs({
      memberships: [
        { team_id: 'team_a', role: 'admin', status: 'active' },
        { team_id: 'team_b', role: 'admin', status: 'active' },
      ],
      teams: [
        { id: 'team_a', name: 'Team A', age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' },
        { id: 'team_b', name: 'Team B', age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' },
      ],
      teamData: [
        {
          team_id: 'team_a',
          roster: [], grid: {}, batting_order: [], locked: false, attendance_overrides: {},
          schedule: [{ id: 'game_a1', date: '2099-01-01', time: '18:00', type: 'game', opponent: 'Rivals A' }],
        },
        {
          team_id: 'team_b',
          roster: [], grid: {}, batting_order: [], locked: false, attendance_overrides: {},
          schedule: [{ id: 'game_b1', date: '2099-01-02', time: '18:00', type: 'game', opponent: 'Rivals B' }],
        },
      ],
    });
    const res = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    assert.equal(res.status, 200);
    const teamA = res.body.teams.find((t) => t.id === 'team_a');
    const teamB = res.body.teams.find((t) => t.id === 'team_b');

    assert.equal(teamA.nextEvent.id, 'game_a1');
    assert.equal(teamB.nextEvent.id, 'game_b1');

    // Every href on team A's actions must be scoped under team_a and must
    // never reference team B's team ID or game ID, and vice versa.
    for (const action of teamA.actions) {
      assert.match(action.href, /^\/app\/teams\/team_a(\/|$)/);
      assert.ok(!action.href.includes('team_b'));
      assert.ok(!action.href.includes('game_b1'));
    }
    for (const action of teamB.actions) {
      assert.match(action.href, /^\/app\/teams\/team_b(\/|$)/);
      assert.ok(!action.href.includes('team_a'));
      assert.ok(!action.href.includes('game_a1'));
    }
  });

  test('H16: a malformed/expired token is rejected with 401 before any query runs', async () => {
    const calls = installStubs({ rejectAuth: true });
    const res = await request(app).get('/api/v1/home').set('Authorization', 'Bearer garbage-token');
    assert.equal(res.status, 401);
    assert.equal(calls.fromTables.length, 0);
  });

  test('H17: the profiles table is never queried — a missing profile row cannot hide a valid membership (#1025)', async () => {
    const calls = installStubs({
      memberships: [{ team_id: 't1', role: 'coach', status: 'active' }],
      teams: [{ id: 't1', name: 'No Profile Yet', age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' }],
      teamData: [{ team_id: 't1', roster: [], schedule: [], grid: {}, batting_order: [], locked: false, attendance_overrides: {} }],
    });
    const res = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.teams.length, 1);
    assert.ok(!calls.fromTables.includes('profiles'));
  });

  test('H18: mixed roles across teams in one response — each team carries only its own role\'s actions', async () => {
    installStubs({
      memberships: [
        { team_id: 't_admin', role: 'admin', status: 'active' },
        { team_id: 't_viewer', role: 'parent', status: 'active' },
      ],
      teams: [
        { id: 't_admin', name: 'Admin Team', age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' },
        { id: 't_viewer', name: 'Viewer Team', age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' },
      ],
      teamData: [
        { team_id: 't_admin', roster: [], schedule: [{ id: 'g1', date: '2099-01-01', time: '18:00' }], grid: {}, batting_order: [], locked: false, attendance_overrides: {} },
        { team_id: 't_viewer', roster: [], schedule: [{ id: 'g2', date: '2099-01-01', time: '18:00' }], grid: {}, batting_order: [], locked: false, attendance_overrides: {} },
      ],
    });
    const res = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    const admin = res.body.teams.find((t) => t.id === 't_admin');
    const viewer = res.body.teams.find((t) => t.id === 't_viewer');
    assert.equal(admin.role.code, 'admin');
    assert.equal(viewer.role.code, 'viewer');
    assert.ok(admin.actions.some((a) => a.id === 'manage_roster'));
    assert.ok(!viewer.actions.some((a) => a.id === 'manage_roster' || a.id === 'claim_scoring'));
  });

  test('H19: no event — schedule present but empty yields nextEvent null and no game-mode/scoring actions', async () => {
    installStubs({
      memberships: [{ team_id: 't1', role: 'admin', status: 'active' }],
      teams: [{ id: 't1', name: 'Offseason', age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' }],
      teamData: [{ team_id: 't1', roster: [], schedule: [], grid: {}, batting_order: [], locked: false, attendance_overrides: {} }],
    });
    const res = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    const team = res.body.teams[0];
    assert.equal(team.nextEvent, null);
    assert.ok(!team.actions.some((a) => a.id === 'start_game_mode' || a.id === 'claim_scoring'));
  });

  test('H20: ten teams — payload stays under the 50KB budget and query count stays at 3 (section 4.3)', async () => {
    const memberships = Array.from({ length: 10 }, (_, i) => ({ team_id: `team_${i}`, role: 'coach', status: 'active' }));
    const teams = memberships.map((m, i) => ({ id: m.team_id, name: `Team ${i}`, age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' }));
    const teamData = memberships.map((m) => ({
      team_id: m.team_id, roster: Array.from({ length: 12 }, (_, j) => ({ name: `Player ${j}` })),
      schedule: [{ id: `g_${m.team_id}`, date: '2099-01-01', time: '18:00', type: 'game', opponent: 'Rivals' }],
      grid: {}, batting_order: [], locked: false, attendance_overrides: {},
    }));
    const calls = installStubs({ memberships, teams, teamData });
    const res = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.teams.length, 10);
    assert.equal(calls.fromTables.length, 3);
    const payloadBytes = Buffer.byteLength(JSON.stringify(res.body), 'utf8');
    assert.ok(payloadBytes < 50 * 1024, `payload was ${payloadBytes} bytes, budget is 50KB`);
  });

  test('H21: response includes an ETag header (section 25.4)', async () => {
    installStubs({
      memberships: [{ team_id: 't1', role: 'admin', status: 'active' }],
      teams: [{ id: 't1', name: 'Mud Hens', age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' }],
      teamData: [{ team_id: 't1', roster: [], schedule: [], grid: {}, batting_order: [], locked: false, attendance_overrides: {} }],
    });
    const res = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    assert.equal(res.status, 200);
    assert.equal(typeof res.headers['etag'], 'string');
    assert.ok(res.headers['etag'].length > 0);
  });

  test('H22: two requests against unchanged underlying state produce the same ETag', async () => {
    const opts = {
      memberships: [{ team_id: 't1', role: 'admin', status: 'active' }],
      teams: [{ id: 't1', name: 'Mud Hens', age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' }],
      teamData: [{ team_id: 't1', roster: [], schedule: [], grid: {}, batting_order: [], locked: false, attendance_overrides: {} }],
    };
    installStubs(opts);
    const res1 = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    installStubs(opts);
    const res2 = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    assert.equal(res1.headers['etag'], res2.headers['etag']);
  });

  test('H23: matching If-None-Match returns 304 with no body, but still carries X-Request-ID and cache headers', async () => {
    const opts = {
      memberships: [{ team_id: 't1', role: 'admin', status: 'active' }],
      teams: [{ id: 't1', name: 'Mud Hens', age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' }],
      teamData: [{ team_id: 't1', roster: [], schedule: [], grid: {}, batting_order: [], locked: false, attendance_overrides: {} }],
    };
    installStubs(opts);
    const first = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    const etag = first.headers['etag'];

    installStubs(opts);
    const second = await request(app)
      .get('/api/v1/home')
      .set('Authorization', `Bearer ${TOKEN}`)
      .set('If-None-Match', etag);

    assert.equal(second.status, 304);
    assert.deepEqual(second.body, {});
    assert.equal(typeof second.headers['x-request-id'], 'string');
    assert.match(second.headers['cache-control'], /private/);
  });

  test('H24: a stale If-None-Match (state changed) still returns 200 with the new ETag', async () => {
    installStubs({
      memberships: [{ team_id: 't1', role: 'admin', status: 'active' }],
      teams: [{ id: 't1', name: 'Mud Hens', age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' }],
      teamData: [{ team_id: 't1', roster: [], schedule: [], grid: {}, batting_order: [], locked: false, attendance_overrides: {} }],
    });
    const stale = await request(app)
      .get('/api/v1/home')
      .set('Authorization', `Bearer ${TOKEN}`)
      .set('If-None-Match', '"not-the-real-etag"');
    assert.equal(stale.status, 200);
    assert.ok(stale.body.teams.length === 1);
    assert.notEqual(stale.headers['etag'], '"not-the-real-etag"');
  });

  test('H25: the zero-membership empty response also carries a stable ETag and honors If-None-Match', async () => {
    installStubs({ memberships: [] });
    const first = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    assert.equal(typeof first.headers['etag'], 'string');

    installStubs({ memberships: [] });
    const second = await request(app)
      .get('/api/v1/home')
      .set('Authorization', `Bearer ${TOKEN}`)
      .set('If-None-Match', first.headers['etag']);
    assert.equal(second.status, 304);
  });
});
