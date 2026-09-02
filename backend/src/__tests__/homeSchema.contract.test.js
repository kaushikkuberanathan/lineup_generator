/**
 * homeSchema.contract.test.js
 * Contract coverage for the Home read model (Story #1025's "response
 * schema is contract-tested" criterion): every #1022 fixture, plus live
 * GET /api/v1/home responses from the #1023 implementation, are validated
 * against homeReadModel.v1.schema.json via validateHomeResponse().
 */
const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

require('../lib/env');

const request = require('supertest');
const { supabaseAdmin } = require('../lib/supabase');
const app = require('../../app');
const { validateHomeResponse } = require('../contracts/validateHomeResponse');

const FIXTURES_DIR = path.join(__dirname, '..', 'contracts', 'fixtures', 'home');

describe('Home read-model fixtures conform to homeReadModel.v1.schema.json', () => {
  const fixtureFiles = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.json'));

  assert.ok(fixtureFiles.length >= 5, 'expected at least the 5 fixtures from #1022');

  for (const file of fixtureFiles) {
    test(`fixture ${file} is schema-valid`, () => {
      const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, file), 'utf8'));
      const result = validateHomeResponse(fixture);
      assert.deepEqual(result.errors, []);
      assert.equal(result.valid, true);
    });
  }
});

describe('Live GET /api/v1/home responses conform to the schema', () => {
  const originalAdminFrom = supabaseAdmin.from;
  const originalGetUser = supabaseAdmin.auth.getUser;
  const TOKEN = 'fake-bearer-token';

  afterEach(() => {
    supabaseAdmin.from = originalAdminFrom;
    supabaseAdmin.auth.getUser = originalGetUser;
  });

  function installStubs({ memberships, teams, teamData }) {
    supabaseAdmin.auth.getUser = async () => ({
      data: { user: { id: '55555555-5555-4555-8555-555555555555', email: 'coach@example.com' } },
      error: null,
    });
    supabaseAdmin.from = (table) => {
      if (table === 'team_memberships') {
        const chain = { select: () => chain, or: () => chain, eq: async () => ({ data: memberships, error: null }) };
        return chain;
      }
      if (table === 'teams') {
        const chain = { select: () => chain, in: async () => ({ data: teams, error: null }) };
        return chain;
      }
      if (table === 'team_data') {
        const chain = { select: () => chain, in: async () => ({ data: teamData, error: null }) };
        return chain;
      }
      throw new Error(`Unexpected table: ${table}`);
    };
  }

  test('empty-memberships response is schema-valid', async () => {
    installStubs({ memberships: [], teams: [], teamData: [] });
    const res = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    const result = validateHomeResponse(res.body);
    assert.deepEqual(result.errors, []);
  });

  test('multi-team mixed-role response is schema-valid', async () => {
    installStubs({
      memberships: [
        { team_id: 't1', role: 'admin', status: 'active' },
        { team_id: 't2', role: 'parent', status: 'active' },
        { team_id: 't3', role: 'scorekeeper', status: 'active' },
      ],
      teams: [
        { id: 't1', name: 'Mud Hens', age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' },
        { id: 't2', name: 'Mud Hens', age_group: '8U', season: 'Spring', year: 2026, sport: 'baseball' },
        { id: 't3', name: 'Knights', age_group: '10U', season: 'Fall', year: 2026, sport: 'baseball' },
      ],
      teamData: [
        { team_id: 't1', roster: [{ name: 'A' }], schedule: [{ id: 'g1', date: '2099-01-01', time: '18:00' }], grid: {}, batting_order: [], locked: true, attendance_overrides: {} },
        { team_id: 't2', roster: [], schedule: [], grid: {}, batting_order: [], locked: false, attendance_overrides: {} },
        { team_id: 't3', roster: [{ name: 'B' }], schedule: [{ id: 'g2', date: '2099-01-02', time: '18:00' }], grid: {}, batting_order: [], locked: false, attendance_overrides: {} },
      ],
    });
    const res = await request(app).get('/api/v1/home').set('Authorization', `Bearer ${TOKEN}`);
    const result = validateHomeResponse(res.body);
    assert.deepEqual(result.errors, []);
  });

  test('validateHomeResponse actually catches a broken response (negative control)', () => {
    const broken = { version: 2, teams: [{ id: 't1', role: { code: 'wizard' }, capabilities: ['fly'] }] };
    const result = validateHomeResponse(broken);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('version')));
    assert.ok(result.errors.some((e) => e.includes('role.code')));
    assert.ok(result.errors.some((e) => e.includes('capability')));
  });
});
