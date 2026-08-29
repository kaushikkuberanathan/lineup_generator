/**
 * emailNormalization.test.js
 * Regression guard for #374 — Gmail dot-variant login lockout.
 *
 * team_memberships.email was written in whatever form the coach (or an
 * admin adding them) originally typed - only .toLowerCase().trim() at
 * POST /request-access, no normalization at all at POST /coaches. Login's
 * POST /magic-link, meanwhile, normalized the INCOMING email (via
 * express-validator's normalizeEmail(), which strips Gmail dots and
 * +subaddress) before comparing. A coach whose membership was created as
 * "sam.jones@gmail.com" who later typed "samjones@gmail.com" at login got
 * "No approved membership found" - not because the match was naive, but
 * because the two sides disagreed on what "the same email" means.
 *
 * The fix (lib/normalizeEmail.js) is applied on BOTH sides now: write paths
 * store the canonical form going forward, and /magic-link's read path
 * fetches all candidate rows for the team and matches on
 * normalizeEmail(stored) === normalizeEmail(incoming) in JS - fixing login
 * for EXISTING non-canonical rows too, with no backfill required.
 *
 * Hermetic / CI-safe — no DB, no network. Same three-seam stub pattern as
 * auth.happy.test.js.
 */
const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const request = require('supertest');
const { supabaseAdmin, supabaseAnon } = require('../lib/supabase');
const app = require('../../app');

const originalAdminFrom = supabaseAdmin.from;
const originalSignIn = supabaseAnon.auth.signInWithOtp;

const TEAM_ID = '1774297491626';

function installStub(storedEmail) {
  supabaseAdmin.from = (table) => {
    if (table === 'auth_events') {
      return { insert: async () => ({ error: null }) };
    }
    const chain = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: null, error: null }),
      then: (resolve) => resolve({
        data: [{ id: 'm-1', status: 'active', role: 'coach', team_id: TEAM_ID, email: storedEmail }],
        error: null,
      }),
    };
    return chain;
  };
}

let signInCalls;
function stubSignIn() {
  signInCalls = [];
  supabaseAnon.auth.signInWithOtp = async (opts) => {
    signInCalls.push(opts);
    return { error: null };
  };
}

afterEach(() => {
  supabaseAdmin.from = originalAdminFrom;
  supabaseAnon.auth.signInWithOtp = originalSignIn;
});

describe('Gmail dot-variant login match (#374)', () => {

  test('EN1: membership stored WITH dots, login typed WITHOUT dots → 200, matches', async () => {
    installStub('sam.jones@gmail.com');
    stubSignIn();

    const res = await request(app)
      .post('/api/v1/auth/magic-link')
      .send({ email: 'samjones@gmail.com', teamId: TEAM_ID });

    assert.equal(res.status, 200, 'REGRESSION (#374): expected a dot-variant login to match, got ' + res.status);
    assert.equal(signInCalls.length, 1);
  });

  test('EN2: membership stored WITHOUT dots, login typed WITH dots → 200, matches', async () => {
    installStub('samjones@gmail.com');
    stubSignIn();

    const res = await request(app)
      .post('/api/v1/auth/magic-link')
      .send({ email: 'sam.jones@gmail.com', teamId: TEAM_ID });

    assert.equal(res.status, 200, 'REGRESSION (#374): expected a dot-variant login to match, got ' + res.status);
    assert.equal(signInCalls.length, 1);
  });

  test('EN3: membership stored mixed-case, login typed lowercase → 200, matches', async () => {
    installStub('Sam.Jones@Gmail.com');
    stubSignIn();

    const res = await request(app)
      .post('/api/v1/auth/magic-link')
      .send({ email: 'samjones@gmail.com', teamId: TEAM_ID });

    assert.equal(res.status, 200, 'REGRESSION (#374): expected a case-insensitive match, got ' + res.status);
  });

  test('EN4: a genuinely different email is still rejected (not over-matching)', async () => {
    installStub('sam.jones@gmail.com');
    stubSignIn();

    const res = await request(app)
      .post('/api/v1/auth/magic-link')
      .send({ email: 'someone.else@gmail.com', teamId: TEAM_ID });

    assert.equal(res.status, 403);
    assert.equal(signInCalls.length, 0);
  });

});
