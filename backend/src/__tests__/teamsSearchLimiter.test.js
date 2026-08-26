/**
 * teamsSearchLimiter.test.js
 * Regression guard for searchLimiter on GET /api/v1/teams/search — item 2 of
 * #664's original 5-item list. searchLimiter (teamData.js) exists in the
 * route code (20 req/15min, IP-keyed) but nothing asserted it actually fires;
 * confirmed missing during the #406/#410 test-health survey follow-up.
 *
 * IP-keyed, not identity-keyed (this route is public, no caller identity to
 * key on) — so unlike loginLimiter.test.js's per-email tests, every request
 * in this file shares ONE budget. Kept in its own file, not mixed into
 * teamsSearch.route.test.js, specifically so its budget isn't partially
 * consumed by that file's own ~13 requests before this test runs — node:test
 * gives each file its own child process, so this file's IP-keyed budget
 * starts fresh regardless of what any other file does.
 *
 * Hermetic / CI-safe — no DB, no network.
 */
const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const request = require('supertest');
const { supabaseAdmin } = require('../lib/supabase');
const app = require('../../app');

const originalFrom = supabaseAdmin.from;

function installStubs() {
  supabaseAdmin.from = (table) => {
    const chain = {
      select: () => chain,
      ilike: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: async () => ({ data: [], error: null }),
    };
    return chain;
  };
}

afterEach(() => {
  supabaseAdmin.from = originalFrom;
});

describe('GET /api/v1/teams/search — searchLimiter (20 req/15min, IP-keyed)', () => {

  test('SEARCHLIMIT-1: 20 requests reach the handler (200), the 21st is blocked by the limiter (429)', async () => {
    installStubs();

    const statuses = [];
    for (let i = 0; i < 21; i++) {
      const res = await request(app).get('/api/v1/teams/search');
      statuses.push(res.status);
    }

    assert.deepEqual(statuses, Array(20).fill(200).concat([429]));
  });

});
