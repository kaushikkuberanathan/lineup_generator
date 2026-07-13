/**
 * Unit tests for normalizeRole — the single source of truth for team-membership
 * role translation (WS-1, Issue #336).
 *
 * Runner: node:test + node:assert/strict (matches backend house style —
 * see auth.happy.test.js). Runs in CI via `npm run test:unit`
 * (node --test src/__tests__/*.test.js). No external test dependency.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeRole,
  isNormalizableRole,
  CANONICAL_ROLES,
} = require('../lib/normalizeRole');

describe('normalizeRole — canonical pass-through', () => {
  for (const role of ['admin', 'coach', 'scorekeeper', 'viewer']) {
    test(`maps canonical ${role} to itself`, () => {
      assert.equal(normalizeRole(role), role);
    });
  }
});

describe('normalizeRole — legacy/label translation', () => {
  test('team_admin -> admin', () => {
    assert.equal(normalizeRole('team_admin'), 'admin');
  });
  test('coordinator -> coach', () => {
    assert.equal(normalizeRole('coordinator'), 'coach');
  });
  test('parent -> viewer', () => {
    assert.equal(normalizeRole('parent'), 'viewer');
  });
});

describe('normalizeRole — output is always canonical', () => {
  for (const input of [
    'admin', 'coach', 'scorekeeper', 'viewer',
    'team_admin', 'coordinator', 'parent',
  ]) {
    test(`${input} normalizes into the canonical set`, () => {
      assert.ok(CANONICAL_ROLES.includes(normalizeRole(input)));
    });
  }
});

describe('normalizeRole — idempotency', () => {
  for (const input of [
    'team_admin', 'coordinator', 'parent',
    'admin', 'coach', 'scorekeeper', 'viewer',
  ]) {
    test(`normalizeRole(normalizeRole(${input})) is stable`, () => {
      const once = normalizeRole(input);
      assert.equal(normalizeRole(once), once);
    });
  }
});

describe('normalizeRole — case & whitespace tolerance', () => {
  test('trims and lowercases team_admin', () => {
    assert.equal(normalizeRole('  Team_Admin '), 'admin');
  });
  test('uppercase COACH', () => {
    assert.equal(normalizeRole('COACH'), 'coach');
  });
});

describe('normalizeRole — platform_admin is forbidden in team_memberships', () => {
  test('throws ROLE_FORBIDDEN for platform_admin', () => {
    assert.throws(
      () => normalizeRole('platform_admin'),
      (err) => err.code === 'ROLE_FORBIDDEN' && /global role/.test(err.message)
    );
  });
});

describe('normalizeRole — unknown / missing input', () => {
  for (const bad of [undefined, null, '', '   ', 'wizard', 'ADMINISTRATOR', 42, {}]) {
    test(`throws ROLE_UNKNOWN for ${JSON.stringify(bad)}`, () => {
      assert.throws(
        () => normalizeRole(bad),
        (err) => err.code === 'ROLE_UNKNOWN'
      );
    });
  }
});

describe('isNormalizableRole — non-throwing guard', () => {
  test('true for translatable values', () => {
    assert.equal(isNormalizableRole('team_admin'), true);
    assert.equal(isNormalizableRole('viewer'), true);
  });
  test('false for forbidden / unknown', () => {
    assert.equal(isNormalizableRole('platform_admin'), false);
    assert.equal(isNormalizableRole('wizard'), false);
    assert.equal(isNormalizableRole(''), false);
  });
});
