/**
 * Hermetic contract coverage for the Resend request builder (#917).
 * Uses dummy credentials and a fetch stub; no email or network call occurs.
 */
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const EMAIL_PATH = require.resolve('../lib/email');
const REAL_FETCH = global.fetch;
const MANAGED_ENV = [
  'RESEND_API_KEY',
  'RESEND_DOMAIN_VERIFIED',
  'RESEND_TEST_RECIPIENT',
  'ADMIN_EMAIL',
  'APP_URL',
  'BACKEND_URL',
  'APPROVE_LINK_HMAC_SECRET',
];
let originalEnv;

function loadEmail(env = {}) {
  for (const key of MANAGED_ENV) delete process.env[key];
  Object.assign(process.env, {
    APPROVE_LINK_HMAC_SECRET: 'test-hmac-secret-at-least-32-characters',
    ...env,
  });
  delete require.cache[EMAIL_PATH];
  return require('../lib/email');
}

function installFetch(response = { ok: true, status: 200, text: async () => '' }) {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return response;
  };
  return calls;
}

beforeEach(() => {
  originalEnv = {};
  for (const key of MANAGED_ENV) originalEnv[key] = process.env[key];
});

afterEach(() => {
  global.fetch = REAL_FETCH;
  for (const key of MANAGED_ENV) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  delete require.cache[EMAIL_PATH];
});

describe('email.js Resend contract', () => {
  test('EMAIL-1: missing API key skips fetch without throwing', async () => {
    let fetchCalled = false;
    global.fetch = async () => { fetchCalled = true; throw new Error('must not run'); };
    const { sendApprovalEmail } = loadEmail({ RESEND_DOMAIN_VERIFIED: 'true' });

    await sendApprovalEmail({
      firstName: 'Avery', email: 'avery@example.com', role: 'coach', teamName: 'Mud Hens', teamId: 'team-1',
    });

    assert.equal(fetchCalled, false);
  });

  test('EMAIL-2: approval email sends the production recipient and login contract', async () => {
    const calls = installFetch();
    const { sendApprovalEmail } = loadEmail({
      RESEND_API_KEY: 're_dummy',
      RESEND_DOMAIN_VERIFIED: 'true',
      APP_URL: 'https://app.example.test',
    });

    await sendApprovalEmail({
      firstName: 'Avery', email: 'avery+coach@example.com', role: 'team_admin', teamName: 'Mud Hens', teamId: 'team-1',
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.resend.com/emails');
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(calls[0].init.headers.Authorization, 'Bearer re_dummy');
    assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
    assert.equal(calls[0].body.from, 'Lineup Generator <noreply@dugoutlineup.com>');
    assert.deepEqual(calls[0].body.to, ['avery+coach@example.com']);
    assert.match(calls[0].body.subject, /Mud Hens/);
    assert.match(calls[0].body.html, /https:\/\/app\.example\.test\/login\?email=avery%2Bcoach%40example\.com&amp;team=team-1|https:\/\/app\.example\.test\/login\?email=avery%2Bcoach%40example\.com&team=team-1/);
    assert.match(calls[0].body.html, /team admin/);
  });

  test('EMAIL-3: unverified DEV domain overrides the recipient', async () => {
    const calls = installFetch();
    const { sendDenialEmail } = loadEmail({
      RESEND_API_KEY: 're_dummy',
      RESEND_TEST_RECIPIENT: 'safe-inbox@example.com',
    });

    await sendDenialEmail({ firstName: 'Avery', email: 'real-user@example.com', teamName: 'Mud Hens' });

    assert.deepEqual(calls[0].body.to, ['safe-inbox@example.com']);
    assert.match(calls[0].body.subject, /Access request update/);
    assert.match(calls[0].body.html, /wasn't approved/);
  });

  test('EMAIL-4: admin notification contains signed, action-bound approve and deny links', async () => {
    const calls = installFetch();
    const { sendAdminNotification } = loadEmail({
      RESEND_API_KEY: 're_dummy',
      RESEND_DOMAIN_VERIFIED: 'true',
      ADMIN_EMAIL: 'admin@example.com',
      BACKEND_URL: 'https://backend.example.test',
    });

    await sendAdminNotification({
      requestId: 'request-123', firstName: 'Avery', lastName: 'Coach', email: 'avery@example.com',
      requestedRole: 'coach', teamId: 'team-1', teamName: 'Mud Hens', platform: 'iOS', accessMode: 'pwa', appVersion: '3.0.0',
    });

    assert.deepEqual(calls[0].body.to, ['admin@example.com']);
    assert.match(calls[0].body.subject, /Avery Coach \(coach\) · Mud Hens/);
    assert.match(calls[0].body.html, /https:\/\/backend\.example\.test\/api\/v1\/admin\/approve-link\?token=/);
    assert.match(calls[0].body.html, /https:\/\/backend\.example\.test\/api\/v1\/admin\/deny-link\?token=/);
    assert.doesNotMatch(calls[0].body.html, /approve-link\?requestId=/);
  });

  test('EMAIL-5: denial email preserves the intended production recipient and context', async () => {
    const calls = installFetch();
    const { sendDenialEmail } = loadEmail({ RESEND_API_KEY: 're_dummy', RESEND_DOMAIN_VERIFIED: 'true' });

    await sendDenialEmail({ firstName: 'Avery', email: 'avery@example.com', teamName: 'Mud Hens' });

    assert.deepEqual(calls[0].body.to, ['avery@example.com']);
    assert.match(calls[0].body.subject, /Mud Hens/);
    assert.match(calls[0].body.html, /Hi Avery/);
  });

  test('EMAIL-6: non-2xx Resend response is logged and swallowed', async () => {
    installFetch({ ok: false, status: 422, text: async () => 'invalid recipient' });
    const errors = [];
    const originalError = console.error;
    console.error = (...args) => errors.push(args.join(' '));
    try {
      const { sendDenialEmail } = loadEmail({ RESEND_API_KEY: 're_dummy', RESEND_DOMAIN_VERIFIED: 'true' });
      await assert.doesNotReject(sendDenialEmail({ firstName: 'Avery', email: 'avery@example.com', teamName: 'Mud Hens' }));
    } finally {
      console.error = originalError;
    }
    assert.ok(errors.some((line) => line.includes('422') && line.includes('invalid recipient')));
  });

  test('EMAIL-7: thrown fetch failure is logged and swallowed', async () => {
    global.fetch = async () => { throw new Error('network down'); };
    const errors = [];
    const originalError = console.error;
    console.error = (...args) => errors.push(args.join(' '));
    try {
      const { sendApprovalEmail } = loadEmail({ RESEND_API_KEY: 're_dummy', RESEND_DOMAIN_VERIFIED: 'true' });
      await assert.doesNotReject(sendApprovalEmail({
        firstName: 'Avery', email: 'avery@example.com', role: 'coach', teamName: 'Mud Hens', teamId: 'team-1',
      }));
    } finally {
      console.error = originalError;
    }
    assert.ok(errors.some((line) => line.includes('network down')));
  });
});
