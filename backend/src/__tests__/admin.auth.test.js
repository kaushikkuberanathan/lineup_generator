/**
 * admin.auth.test.js
 * Auth-rejection coverage for admin routes (Story 99 / #252).
 *
 * Why this exists: the legacy suite-admin.js asserted 401 against
 * /api/v1/admin/* paths that have NO matching handlers. Those 401s came from
 * the path/method-agnostic `router.use(requireAuth, requireAdmin)` catch-all
 * (admin.js:172) — so the REAL admin routes had zero auth coverage. This spec
 * hits the actual mounted paths + methods (bare under /api/v1, per app.js).
 *
 * CI-safe: with no Authorization header, requireAuth returns 401 UNAUTHORIZED
 * (requireAuth.js:14) BEFORE calling supabaseAdmin.auth.getUser — no DB or
 * network access. Uses request(app); no port is bound.
 */
const request = require('supertest');
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../../app');

describe('Admin routes — auth rejection (no token)', () => {

  // ── Protected routes: no token → 401 UNAUTHORIZED ───────────────────────────
  test('GET /api/v1/requests → 401 without token', async () => {
    const res = await request(app).get('/api/v1/requests');
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'UNAUTHORIZED');
  });

  test('GET /api/v1/members → 401 without token', async () => {
    const res = await request(app).get('/api/v1/members');
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'UNAUTHORIZED');
  });

  test('POST /api/v1/approve → 401 without token', async () => {
    const res = await request(app).post('/api/v1/approve');
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'UNAUTHORIZED');
  });

  test('POST /api/v1/reject → 401 without token', async () => {
    const res = await request(app).post('/api/v1/reject');
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'UNAUTHORIZED');
  });

  // NOTE: update-role is registered as POST (admin.js:402), not PUT.
  test('POST /api/v1/update-role → 401 without token', async () => {
    const res = await request(app).post('/api/v1/update-role');
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'UNAUTHORIZED');
  });

  test('POST /api/v1/reset-access → 401 without token', async () => {
    const res = await request(app).post('/api/v1/reset-access');
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'UNAUTHORIZED');
  });

  test('POST /api/v1/suspend → 401 without token', async () => {
    const res = await request(app).post('/api/v1/suspend');
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'UNAUTHORIZED');
  });

  // ── Public routes: registered BEFORE the auth guard → must NEVER 401 ────────
  // 1-tap email links, used unauthenticated. Missing query params → 400
  // (admin.js:17, :96). Security contract = "never 401".
  test('GET /api/v1/admin/approve-link → NOT 401 (missing params → 400)', async () => {
    const res = await request(app).get('/api/v1/admin/approve-link');
    assert.notEqual(res.status, 401);
    assert.equal(res.status, 400);
  });

  test('GET /api/v1/admin/deny-link → NOT 401 (missing params → 400)', async () => {
    const res = await request(app).get('/api/v1/admin/deny-link');
    assert.notEqual(res.status, 401);
    assert.equal(res.status, 400);
  });

});
