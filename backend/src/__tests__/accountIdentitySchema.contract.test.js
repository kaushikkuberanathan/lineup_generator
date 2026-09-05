const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { validateAccountIdentityResponse } = require('../contracts/validateAccountIdentityResponse');
const schema = require('../contracts/accountIdentity.v1.schema.json');

const FIXTURES_DIR = path.join(__dirname, '..', 'contracts', 'fixtures', 'account');

describe('Account/Identity fixtures conform to accountIdentity.v1.schema.json', () => {
  const fixtureFiles = fs.readdirSync(FIXTURES_DIR).filter((file) => file.endsWith('.json'));

  assert.ok(fixtureFiles.length >= 5, 'expected the five representative fixtures from #1130');

  for (const file of fixtureFiles) {
    test(`fixture ${file} is schema-valid`, () => {
      const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, file), 'utf8'));
      assert.deepEqual(validateAccountIdentityResponse(fixture).errors, []);
    });
  }

  test('rejects non-canonical roles, unknown capabilities, and unsafe pending destinations', () => {
    const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'pending-destination.json'), 'utf8'));
    fixture.memberships[0].role.code = 'team_admin';
    fixture.memberships[0].capabilities.push('account.fly');
    fixture.pendingDestination.path = '//evil.example/app';

    const result = validateAccountIdentityResponse(fixture);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes('role.code')));
    assert.ok(result.errors.some((error) => error.includes('unknown capability')));
    assert.ok(result.errors.some((error) => error.includes('safe internal')));
  });

  test('rejects an encoded external redirect in a superficially internal path', () => {
    const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'pending-destination.json'), 'utf8'));
    fixture.pendingDestination.path = '/app/https%3A%2F%2Fevil.example';
    const result = validateAccountIdentityResponse(fixture);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes('safe internal')));
  });

  test('rejects screen-owned data added to the contract', () => {
    const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'one-team.json'), 'utf8'));
    fixture.memberships[0].team.roster = [{ name: 'Child' }];
    const result = validateAccountIdentityResponse(fixture);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes('unexpected key "roster"')));
  });

  test('declares measurable latency, payload, and query-count budgets', () => {
    assert.equal(schema['x-budgets'].maxServerLatencyMs, 300);
    assert.equal(schema['x-budgets'].maxPayloadBytesForTenTeams, 25 * 1024);
    assert.equal(schema['x-budgets'].maxDatabaseRoundTrips, 1);
  });

  test('deliberately malformed fixture is rejected', () => {
    const invalidFixture = JSON.parse(fs.readFileSync(
      path.join(FIXTURES_DIR, 'invalid', 'unknown-role.json'),
      'utf8'
    ));
    const result = validateAccountIdentityResponse(invalidFixture);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes('role.code')));
  });
});
