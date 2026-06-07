/**
 * teamData.routes.test.js
 * Route-level coverage for src/routes/teamData.js (Story 99 / #252).
 *
 * Drives the mounted Express app with request(app) — both the canonical
 * /api/v1/teams mount and the legacy /api/teams mount (app.js:146, :151).
 *
 * CI-safe / hermetic: no live DB, no network. supabaseAdmin.from AND
 * supabaseAdmin.rpc are monkey-patched per test (the POST handler calls
 * rpc('set_config') best-effort before the upsert — left unpatched it would
 * attempt a real network round-trip). Originals are restored in afterEach.
 * require('../lib/env') runs first so dotenv populates SUPABASE_* before
 * ../lib/supabase imports (node --test isolates each file's process; this
 * spec does not pull dotenv transitively the way admin.auth.test.js does via
 * require('../../app')).
 *
 * WHY there is no route-level 403 FORBIDDEN test here:
 *   The POST/GET handlers gate on isAdminRequest(req) (teamData.js:39),
 *   which whitelists localhost IPs (127.0.0.1 / ::1 / ::ffff:127.0.0.1).
 *   app.js sets NO `trust proxy`, so under supertest req.ip is always the
 *   loopback address — every in-process request passes the admin gate. The
 *   403 branch is therefore unreachable in-process. isAdminRequest's accept/
 *   reject logic (remote IP, X-Admin-Key match/mismatch, ADMIN_KEY unset) is
 *   covered as direct unit tests in teamData.guard.test.js instead.
 */
const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const request = require('supertest');
const { supabaseAdmin } = require('../lib/supabase');
const app = require('../../app');

const originalFrom = supabaseAdmin.from;
const originalRpc = supabaseAdmin.rpc;

// Per-test call recorder, reset by installStubs.
let calls;

/**
 * Install chainable stubs on supabaseAdmin.from / .rpc.
 * One chain object serves all three call shapes used by the routes:
 *   - guard read:  .from('team_data').select().eq().maybeSingle()  → guardRead
 *   - write:       .from('team_data').upsert(obj, opts)            → writeResult
 *   - history:     .from('team_data_history').select().eq().order().limit(n) → historyResult
 * Terminal methods (maybeSingle/upsert/limit) resolve the configured value and
 * record arguments on `calls` where a test asserts on them.
 */
function installStubs({ guardRead, writeResult, historyResult } = {}) {
  calls = {
    fromTables: [],
    upsertCount: 0,
    upsertArgs: null,
    limitArg: undefined,
    rpcCount: 0,
  };

  supabaseAdmin.from = (table) => {
    calls.fromTables.push(table);
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      maybeSingle: async () => guardRead,
      limit: async (n) => {
        calls.limitArg = n;
        return historyResult;
      },
      upsert: async (obj, opts) => {
        calls.upsertCount += 1;
        calls.upsertArgs = { obj, opts };
        return writeResult;
      },
    };
    return chain;
  };

  supabaseAdmin.rpc = async () => {
    calls.rpcCount += 1;
    return { data: null, error: null };
  };
}

afterEach(() => {
  supabaseAdmin.from = originalFrom;
  supabaseAdmin.rpc = originalRpc;
  calls = undefined;
});

describe('teamData routes', () => {

  test('1. POST /api/v1/teams/:id/data empty roster vs existing 2 → 409 ROSTER_WIPE_GUARD', async () => {
    installStubs({
      guardRead: { data: { roster: [{ name: 'Aiden' }, { name: 'Benji' }] }, error: null },
    });
    const res = await request(app)
      .post('/api/v1/teams/test-rt/data')
      .send({ roster: [] });
    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'ROSTER_WIPE_GUARD');
    assert.equal(res.body.currentRosterCount, 2);
    assert.equal(calls.upsertCount, 0);
  });

  test('2. POST with force:true → 200 { ok:true }, upsert called once with onConflict team_id + roster []', async () => {
    installStubs({ writeResult: { error: null } });
    const res = await request(app)
      .post('/api/v1/teams/test-rt/data')
      .send({ roster: [], force: true });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true });
    assert.equal(calls.upsertCount, 1);
    assert.equal(calls.upsertArgs.opts.onConflict, 'team_id');
    assert.deepEqual(calls.upsertArgs.obj.roster, []);
  });

  test('3. Legacy mount POST /api/teams/:id/data → 409 ROSTER_WIPE_GUARD (dual-mount smoke)', async () => {
    installStubs({
      guardRead: { data: { roster: [{ name: 'Aiden' }, { name: 'Benji' }] }, error: null },
    });
    const res = await request(app)
      .post('/api/teams/test-rt/data')
      .send({ roster: [] });
    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'ROSTER_WIPE_GUARD');
  });

  test('4. POST non-empty roster, upsert errors → 500 DB_ERROR', async () => {
    installStubs({ writeResult: { error: { message: 'db down' } } });
    const res = await request(app)
      .post('/api/v1/teams/test-rt/data')
      .send({ roster: [{ name: 'Benji' }] });
    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'DB_ERROR');
  });

  test('5. GET /api/v1/teams/:id/history → 200, snapshots length 1', async () => {
    installStubs({ historyResult: { data: [{ id: 1 }], error: null } });
    const res = await request(app).get('/api/v1/teams/test-rt/history');
    assert.equal(res.status, 200);
    assert.equal(res.body.snapshots.length, 1);
  });

  test('6. GET history?limit=999 → limit clamped to 50', async () => {
    installStubs({ historyResult: { data: [], error: null } });
    const res = await request(app).get('/api/v1/teams/test-rt/history?limit=999');
    assert.equal(res.status, 200);
    assert.equal(calls.limitArg, 50);
  });

});
