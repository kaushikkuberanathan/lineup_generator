/**
 * Branch-level contract coverage for the operational health router (#916).
 * Hermetic: supabaseAdmin.from is replaced; no database or network calls.
 */
const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const request = require('supertest');
const { supabaseAdmin } = require('../lib/supabase');
const app = require('../../app');
const { version } = require('../../package.json');

const originalFrom = supabaseAdmin.from;
const TEAM_ID = '1774297491626';

function installHealthResult(result) {
  const calls = { table: null, selected: null, teamId: null };
  supabaseAdmin.from = (table) => {
    calls.table = table;
    const chain = {
      select: (columns) => { calls.selected = columns; return chain; },
      eq: (column, value) => {
        assert.equal(column, 'id');
        calls.teamId = value;
        return chain;
      },
      single: async () => result,
    };
    return chain;
  };
  return calls;
}

afterEach(() => {
  supabaseAdmin.from = originalFrom;
});

describe('GET /api/v1/ops/health', () => {
  test('OPS-HEALTH-1: successful DB round-trip returns the stable healthy contract', async () => {
    const calls = installHealthResult({ data: { id: TEAM_ID }, error: null });

    const res = await request(app).get('/api/v1/ops/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.db, 'ok');
    assert.equal(res.body.version, version);
    assert.equal(typeof res.body.uptime, 'number');
    assert.equal(typeof res.body.db_latency_ms, 'number');
    assert.equal(calls.table, 'teams');
    assert.equal(calls.selected, 'id');
    assert.equal(calls.teamId, TEAM_ID);
  });

  test('OPS-HEALTH-2: resolved Supabase error returns 503 degraded with diagnostics', async () => {
    installHealthResult({ data: null, error: { message: 'database unavailable' } });

    const res = await request(app).get('/api/v1/ops/health');

    assert.equal(res.status, 503);
    assert.equal(res.body.status, 'degraded');
    assert.equal(res.body.db, 'error');
    assert.equal(res.body.db_error, 'database unavailable');
    assert.equal(typeof res.body.db_latency_ms, 'number');
  });

  test('OPS-HEALTH-3: thrown dependency error returns 503 unreachable without escaping Express', async () => {
    supabaseAdmin.from = () => { throw new Error('socket closed'); };

    const res = await request(app).get('/api/v1/ops/health');

    assert.equal(res.status, 503);
    assert.equal(res.body.status, 'error');
    assert.equal(res.body.db, 'unreachable');
    assert.equal(res.body.db_error, 'socket closed');
    assert.equal(typeof res.body.db_latency_ms, 'number');
  });
});

describe('GET /api/v1/ops/ping', () => {
  test('OPS-PING-1: returns the public liveness contract without touching the DB', async () => {
    let dbTouched = false;
    supabaseAdmin.from = () => { dbTouched = true; throw new Error('must not run'); };

    const res = await request(app).get('/api/v1/ops/ping');

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.match(res.body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(dbTouched, false);
  });
});
