/**
 * teamsSearch.route.test.js
 * Route-level coverage for GET /api/v1/teams/search (Story 124, #655).
 *
 * Mock pattern follows teamData.routes.test.js — monkey-patch supabaseAdmin.from,
 * restore in afterEach. The stub chain covers this route's exact call shape:
 *   .from('teams').select(cols).ilike().eq().eq().order().limit(n)
 * (ilike/eq are conditional on which query params are present; order and
 * limit are always the terminal calls.)
 *
 * CI-safe: no live DB, no network.
 */
const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const request = require('supertest');
const { supabaseAdmin } = require('../lib/supabase');
const app = require('../../app');

const originalFrom = supabaseAdmin.from;

/** Per-test call recorder, reset by installStubs. */
let calls;

function installStubs({ searchResult = { data: [], error: null } } = {}) {
  calls = {
    fromTables: [],
    selectArg: undefined,
    ilikeArgs: null,
    eqArgs: [],
    orderArgs: null,
    limitArg: undefined,
  };

  supabaseAdmin.from = (table) => {
    calls.fromTables.push(table);
    const chain = {
      select: (cols) => {
        calls.selectArg = cols;
        return chain;
      },
      ilike: (col, val) => {
        calls.ilikeArgs = { col, val };
        return chain;
      },
      eq: (col, val) => {
        calls.eqArgs.push({ col, val });
        return chain;
      },
      order: (col, opts) => {
        calls.orderArgs = { col, opts };
        return chain;
      },
      limit: async (n) => {
        calls.limitArg = n;
        return searchResult;
      },
    };
    return chain;
  };
}

afterEach(() => {
  supabaseAdmin.from = originalFrom;
  calls = undefined;
});

describe('GET /api/v1/teams/search', () => {

  test('TS-1: no-auth success — 200 with team fields, no query params required', async () => {
    installStubs({
      searchResult: {
        data: [{ id: '1774297491626', name: 'Mud Hens', age_group: '8U', sport: 'baseball', year: 2026 }],
        error: null,
      },
    });

    const res = await request(app).get('/api/v1/teams/search');

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, [
      { id: '1774297491626', name: 'Mud Hens', age_group: '8U', sport: 'baseball', year: 2026 },
    ]);
  });

  test('TS-2: select() never requests owner_id — response never carries it', async () => {
    installStubs({
      searchResult: {
        data: [{ id: '1774297491626', name: 'Mud Hens', age_group: '8U', sport: 'baseball', year: 2026 }],
        error: null,
      },
    });

    const res = await request(app).get('/api/v1/teams/search');

    assert.ok(!/owner_id/.test(calls.selectArg), `select() requested owner_id: ${calls.selectArg}`);
    assert.ok(!Object.prototype.hasOwnProperty.call(res.body[0], 'owner_id'));
  });

  test('TS-3: empty query — no filters applied, still bounded by a limit, ordered newest-year-first', async () => {
    installStubs();

    const res = await request(app).get('/api/v1/teams/search');

    assert.equal(res.status, 200);
    assert.equal(calls.ilikeArgs, null);
    assert.deepEqual(calls.eqArgs, []);
    assert.deepEqual(calls.orderArgs, { col: 'year', opts: { ascending: false } });
    assert.equal(calls.limitArg, 50);
  });

  test('TS-4: single-field filter — q only maps to name ilike', async () => {
    installStubs();

    const res = await request(app).get('/api/v1/teams/search').query({ q: 'Mud Hens' });

    assert.equal(res.status, 200);
    assert.deepEqual(calls.ilikeArgs, { col: 'name', val: '%Mud Hens%' });
    assert.deepEqual(calls.eqArgs, []);
  });

  test('TS-5: multi-field filter — q + ageGroup + sport + season + year all applied together', async () => {
    installStubs();

    const res = await request(app)
      .get('/api/v1/teams/search')
      .query({ q: 'Mud', ageGroup: '8U', sport: 'baseball', season: 'Fall', year: '2026' });

    assert.equal(res.status, 200);
    assert.deepEqual(calls.ilikeArgs, { col: 'name', val: '%Mud%' });
    assert.deepEqual(calls.eqArgs, [
      { col: 'age_group', val: '8U' },
      { col: 'sport', val: 'baseball' },
      { col: 'season', val: 'Fall' },
      { col: 'year', val: 2026 },
    ]);
  });

  test('TS-6: injection-shaped q rejected — 400, DB never queried', async () => {
    installStubs();

    const res = await request(app)
      .get('/api/v1/teams/search')
      .query({ q: "'; DROP TABLE teams; --" });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.deepEqual(calls.fromTables, []);
  });

  test('TS-7: injection-shaped ageGroup rejected — 400, DB never queried', async () => {
    installStubs();

    const res = await request(app)
      .get('/api/v1/teams/search')
      .query({ ageGroup: '8U<script>alert(1)</script>' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.deepEqual(calls.fromTables, []);
  });

  test('TS-9b: injection-shaped season rejected — 400, DB never queried', async () => {
    installStubs();

    const res = await request(app)
      .get('/api/v1/teams/search')
      .query({ season: 'Fall<script>alert(1)</script>' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.deepEqual(calls.fromTables, []);
  });

  test('TS-9c: season-only filter maps to a season eq, select includes season', async () => {
    installStubs();

    const res = await request(app).get('/api/v1/teams/search').query({ season: 'Spring' });

    assert.equal(res.status, 200);
    assert.deepEqual(calls.eqArgs, [{ col: 'season', val: 'Spring' }]);
    assert.ok(/season/.test(calls.selectArg), `select() did not request season: ${calls.selectArg}`);
  });

  test('TS-9d: year-only filter maps to a year eq (parsed to an integer), independent of season', async () => {
    installStubs();

    const res = await request(app).get('/api/v1/teams/search').query({ year: '2025' });

    assert.equal(res.status, 200);
    assert.deepEqual(calls.eqArgs, [{ col: 'year', val: 2025 }]);
  });

  test('TS-9e: non-integer year rejected — 400, DB never queried', async () => {
    installStubs();

    const res = await request(app).get('/api/v1/teams/search').query({ year: 'not-a-year' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.deepEqual(calls.fromTables, []);
  });

  test('TS-8: DB error surfaces as 500, not a silent empty array', async () => {
    installStubs({ searchResult: { data: null, error: { message: 'db down' } } });

    const res = await request(app).get('/api/v1/teams/search');

    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'SEARCH_FAILED');
  });

  test('TS-9: legacy mount /api/teams/search also works (dual-mount smoke)', async () => {
    installStubs({ searchResult: { data: [], error: null } });

    const res = await request(app).get('/api/teams/search');

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

});
