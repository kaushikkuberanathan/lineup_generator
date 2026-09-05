const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');
const request = require('supertest');
const { supabaseAdmin } = require('../lib/supabase');
const app = require('../../app');
const { validateAccountIdentityResponse } = require('../contracts/validateAccountIdentityResponse');

const USER_ID = '55555555-5555-4555-8555-555555555555';
const USER_EMAIL = 'coach@example.com';
const TOKEN = 'fake-bearer-token';

describe('GET /api/v1/account (#1131)', () => {
  const originalRpc = supabaseAdmin.rpc;
  const originalFrom = supabaseAdmin.from;
  const originalGetUser = supabaseAdmin.auth.getUser;

  afterEach(() => {
    supabaseAdmin.rpc = originalRpc;
    supabaseAdmin.from = originalFrom;
    supabaseAdmin.auth.getUser = originalGetUser;
  });

  function installStubs({ profile = null, memberships = [], teams = [], rpcError = null, rejectAuth = false } = {}) {
    const calls = { rpcCalls: [], rpcArgs: [] };
    supabaseAdmin.auth.getUser = async () => rejectAuth
      ? { data: { user: null }, error: { message: 'bad token' } }
      : { data: { user: { id: USER_ID, email: USER_EMAIL } }, error: null };
    supabaseAdmin.from = (table) => {
      throw new Error(`Unexpected .from('${table}') call; Account must use one account_read_model RPC`);
    };
    supabaseAdmin.rpc = async (name, args) => {
      calls.rpcCalls.push(name);
      calls.rpcArgs.push(args);
      return rpcError
        ? { data: null, error: rpcError }
        : { data: { profile, memberships, teams }, error: null };
    };
    return calls;
  }

  test('rejects an unauthenticated request before querying', async () => {
    const calls = installStubs({ rejectAuth: true });
    const response = await request(app).get('/api/v1/account');
    assert.equal(response.status, 401);
    assert.equal(calls.rpcCalls.length, 0);
  });

  test('uses exactly one RPC and returns a schema-valid zero-membership response', async () => {
    const calls = installStubs();
    const response = await request(app).get('/api/v1/account').set('Authorization', `Bearer ${TOKEN}`);
    assert.equal(response.status, 200);
    assert.deepEqual(calls.rpcCalls, ['account_read_model']);
    assert.deepEqual(calls.rpcArgs[0], { p_user_id: USER_ID, p_email: USER_EMAIL });
    assert.deepEqual(response.body.memberships, []);
    assert.equal(response.body.identity.displayName, 'coach');
    assert.deepEqual(validateAccountIdentityResponse(response.body).errors, []);
  });

  test('hydrates profile and mixed-role memberships without per-team queries', async () => {
    const calls = installStubs({
      profile: { id: USER_ID, first_name: 'Casey', last_name: 'Coach', email: USER_EMAIL },
      memberships: [
        { team_id: 't1', role: 'team_admin', status: 'active' },
        { team_id: 't2', role: 'parent', status: 'active' },
        { team_id: 't3', role: 'scorekeeper', status: 'active' },
      ],
      teams: [
        { id: 't1', name: 'Mud Hens', age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' },
        { id: 't2', name: 'Mud Hens', age_group: '8U', season: 'Spring', year: 2026, sport: 'baseball' },
        { id: 't3', name: 'Knights', age_group: '10U', season: 'Fall', year: 2026, sport: 'baseball' },
      ],
    });
    const response = await request(app).get('/api/v1/account').set('Authorization', `Bearer ${TOKEN}`);
    assert.equal(response.status, 200);
    assert.equal(response.body.identity.displayName, 'Casey Coach');
    assert.deepEqual(response.body.memberships.map((m) => m.role.code), ['admin', 'viewer', 'scorekeeper']);
    assert.deepEqual(response.body.memberships.slice(0, 2).map((m) => m.team.displayName), [
      'Mud Hens (Fall 2026)', 'Mud Hens (Spring 2026)',
    ]);
    assert.equal(calls.rpcCalls.length, 1);
    assert.deepEqual(validateAccountIdentityResponse(response.body).errors, []);
  });

  test('excludes orphaned teams and unrecognized roles without failing the response', async () => {
    installStubs({
      memberships: [
        { team_id: 'orphan', role: 'coach', status: 'active' },
        { team_id: 'bad-role', role: 'wizard', status: 'active' },
        { team_id: 'valid', role: 'coach', status: 'active' },
      ],
      teams: [
        { id: 'bad-role', name: 'Bad', age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' },
        { id: 'valid', name: 'Valid', age_group: '8U', season: 'Fall', year: 2026, sport: 'baseball' },
      ],
    });
    const response = await request(app).get('/api/v1/account').set('Authorization', `Bearer ${TOKEN}`);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.memberships.map((membership) => membership.team.id), ['valid']);
  });

  test('sets private cache headers, echoes request ID, and honors ETag', async () => {
    installStubs();
    const first = await request(app)
      .get('/api/v1/account')
      .set('Authorization', `Bearer ${TOKEN}`)
      .set('X-Request-ID', 'account-request-1');
    assert.equal(first.headers['x-request-id'], 'account-request-1');
    assert.match(first.headers['cache-control'], /private/);
    assert.equal(first.headers.vary, 'Authorization');
    assert.equal(typeof first.headers.etag, 'string');

    installStubs();
    const second = await request(app)
      .get('/api/v1/account')
      .set('Authorization', `Bearer ${TOKEN}`)
      .set('If-None-Match', first.headers.etag);
    assert.equal(second.status, 304);
  });

  test('returns the standard retryable error envelope for RPC failure', async () => {
    installStubs({ rpcError: { message: 'database unavailable' } });
    const response = await request(app).get('/api/v1/account').set('Authorization', `Bearer ${TOKEN}`);
    assert.equal(response.status, 500);
    assert.equal(response.body.error.code, 'INTERNAL_ERROR');
    assert.equal(response.body.error.retryable, true);
    assert.equal(typeof response.body.error.requestId, 'string');
  });
});
