/**
 * env.legacyKeyWarning.test.js
 * Regression guard for the legacy-Supabase-key boot warning added for #387
 * (the 2026-07-20 cutover incident: a stale `eyJ...` legacy JWT in Render's
 * SUPABASE_ANON_KEY silently broke every login for ~15min, with no signal
 * until someone manually read the Render logs).
 *
 * env.js runs its checks as module-level side effects on require, so this
 * spec clears the require cache and re-requires it under controlled env vars
 * for each case, spying on console.warn rather than matching stdout text.
 */
const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const ENV_PATH = require.resolve('../lib/env');

const BASE_ENV = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_placeholder',
  SUPABASE_ANON_KEY: 'sb_publishable_placeholder',
  APPROVE_LINK_HMAC_SECRET: 'test-hmac-secret',
};

const savedEnv = {};
let originalConsoleWarn;
let warnCalls;

function withEnv(overrides, fn) {
  for (const key of Object.keys(BASE_ENV)) savedEnv[key] = process.env[key];
  Object.assign(process.env, BASE_ENV, overrides);
  delete require.cache[ENV_PATH];
  try {
    require('../lib/env');
    fn();
  } finally {
    for (const key of Object.keys(BASE_ENV)) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    delete require.cache[ENV_PATH];
  }
}

afterEach(() => {
  console.warn = originalConsoleWarn;
  warnCalls = undefined;
});

function installConsoleWarnSpy() {
  originalConsoleWarn = console.warn;
  warnCalls = [];
  console.warn = (...args) => { warnCalls.push(args.join(' ')); };
}

describe('env.js legacy Supabase key boot warning (#387)', () => {
  test('warns when SUPABASE_ANON_KEY looks like a legacy JWT (eyJ...)', () => {
    installConsoleWarnSpy();
    withEnv({ SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiJ9.fake.jwt' }, () => {
      const hit = warnCalls.find((line) => line.includes('SUPABASE_ANON_KEY') && line.includes('legacy Supabase JWT'));
      assert.ok(hit, `expected a legacy-key warning for SUPABASE_ANON_KEY, got: ${JSON.stringify(warnCalls)}`);
    });
  });

  test('warns when SUPABASE_SERVICE_ROLE_KEY looks like a legacy JWT (eyJ...)', () => {
    installConsoleWarnSpy();
    withEnv({ SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiJ9.fake.jwt' }, () => {
      const hit = warnCalls.find((line) => line.includes('SUPABASE_SERVICE_ROLE_KEY') && line.includes('legacy Supabase JWT'));
      assert.ok(hit, `expected a legacy-key warning for SUPABASE_SERVICE_ROLE_KEY, got: ${JSON.stringify(warnCalls)}`);
    });
  });

  test('does not warn when both keys are new-style (sb_secret_ / sb_publishable_)', () => {
    installConsoleWarnSpy();
    withEnv({}, () => {
      const hit = warnCalls.find((line) => line.includes('legacy Supabase JWT'));
      assert.equal(hit, undefined, `expected no legacy-key warning, got: ${JSON.stringify(warnCalls)}`);
    });
  });
});
