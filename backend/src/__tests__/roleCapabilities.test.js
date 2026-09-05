const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const shared = require('../lib/roleCapabilities');
const home = require('../lib/homeCapabilities');

describe('shared role/capability policy (#1132)', () => {
  test('Home compatibility exports are the exact shared implementation', () => {
    assert.equal(home.resolveRole, shared.resolveRole);
    assert.equal(home.capabilitiesForRole, shared.capabilitiesForRole);
    assert.equal(home.CAPABILITY_MATRIX, shared.CAPABILITY_MATRIX);
    assert.equal(home.ROLE_LABELS, shared.ROLE_LABELS);
  });

  test('the same raw membership role produces one normalized role and capability set for every API surface', () => {
    for (const rawRole of ['admin', 'team_admin', 'coach', 'coordinator', 'scorekeeper', 'viewer', 'parent']) {
      const normalized = shared.resolveRole(rawRole);
      const accountOutput = {
        role: normalized,
        capabilities: shared.capabilitiesForRole(normalized.code),
      };
      const homeOutput = {
        role: home.resolveRole(rawRole),
        capabilities: home.capabilitiesForRole(home.resolveRole(rawRole).code),
      };
      assert.deepEqual(accountOutput, homeOutput, `policy drift for ${rawRole}`);
    }
  });

  test('callers receive copies and cannot mutate the shared matrix', () => {
    const capabilities = shared.capabilitiesForRole('admin');
    capabilities.push('invented.capability');
    assert.ok(!shared.capabilitiesForRole('admin').includes('invented.capability'));
    assert.ok(Object.isFrozen(shared.CAPABILITY_MATRIX.admin));
  });
});
