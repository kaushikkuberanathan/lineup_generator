/**
 * teamData.envGuard.test.js
 * Proves the FORBIDDEN_TEST_DATA param guard fires in PRODUCTION mode
 * (Story 99 / #252).
 *
 * The router.param('teamId') hook (teamData.js:21) calls
 * rejectTestDataInProd (envGuard.js:29): when NODE_ENV === 'production' AND
 * the teamId is in TEST_TEAM_IDS, it throws a 403 FORBIDDEN_TEST_DATA before
 * any handler — isAdminRequest and all DB access are never reached.
 *
 * Process isolation — why this is safe:
 *   `node --test` runs EACH test file in its own child process. The
 *   process.env mutations below (NODE_ENV='production', TEST_TEAM_IDS) are
 *   scoped to THIS process only and cannot bleed into the other suites
 *   (teamData.routes/guard, admin.auth) which run in separate processes and
 *   still see their normal dev env.
 *
 * Ordering — why the env is set BEFORE any require:
 *   - envGuard.js parses TEST_TEAM_IDS once at module load into a Set, so the
 *     value must exist before the first require pulls envGuard in (transitively
 *     via app → teamData router).
 *   - src/lib/env.js does NOT load dotenv when NODE_ENV === 'production', and
 *     both env.js and src/lib/supabase.js throw at import if SUPABASE_URL /
 *     SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY are absent. We therefore
 *     set syntactically plausible FAKE values for all three. They are never
 *     exercised: the param guard rejects with 403 before any Supabase call, so
 *     no network round-trip ever happens against these fakes.
 */

// ── Production env MUST be configured before any require below ────────────────
process.env.NODE_ENV = 'production';
process.env.TEST_TEAM_IDS = 'test-eg-suite';
// Fake Supabase creds — satisfy the import-time presence checks in
// src/lib/env.js + src/lib/supabase.js; never actually called (see header).
process.env.SUPABASE_URL = 'https://fake-eg.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-role-key-eg';
process.env.SUPABASE_ANON_KEY = 'fake-anon-key-eg';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const request = require('supertest');
const app = require('../../app');

describe('teamData envGuard — FORBIDDEN_TEST_DATA in production', () => {

  test('POST /api/v1/teams/:testId/data → 403 FORBIDDEN_TEST_DATA', async () => {
    const res = await request(app)
      .post('/api/v1/teams/test-eg-suite/data')
      .send({ roster: [] });
    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'FORBIDDEN_TEST_DATA');
  });

  test('GET /api/v1/teams/:testId/history → 403 FORBIDDEN_TEST_DATA', async () => {
    const res = await request(app).get('/api/v1/teams/test-eg-suite/history');
    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'FORBIDDEN_TEST_DATA');
  });

});
