// Regression tests for scripts/check-version-currency.js.
// Built after #1049's release (v3.3.2) found CLAUDE.md, ROADMAP.md,
// FEATURE_MAP.md, and three other docs all still asserting a stale
// production version, with nothing automated to catch it — see
// docs/product/RELEASE_RITUAL_PLAYBOOK.md § Version-currency check.
// Uses Node's built-in test runner (node:test).
//
// Run from repo root:
//   node --test scripts/__tests__/check-version-currency.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runChecks, findLiveLine, HISTORICAL_LEAD_IN } = require('../check-version-currency.js');

// ── findLiveLine / HISTORICAL_LEAD_IN ───────────────────────────────────────

test('findLiveLine: extracts the version anchored to the live phrase, not the first version-shaped string in the line', () => {
  // Real bug this test locks in: a line legitimately mentions an OLD version
  // (what it superseded) before the NEW live claim — a naive "first version
  // in the line" extractor grabs the wrong one.
  const line = '> **Reconciled 2026-09-03 (updated; supersedes the 2026-08-30 v3.1.0 note):** production is v3.3.2 (PR #1054).';
  const found = findLiveLine(line, /production is v(\d+\.\d+\.\d+)/i);
  assert.equal(found.version, '3.3.2');
});

test('findLiveLine: skips a line whose own bold lead-in marks it historical', () => {
  const line = '> **Superseded — 2026-08-30 (kept for history):** production is v3.1.0 at `02abfc0`.';
  const found = findLiveLine(line, /production is v(\d+\.\d+\.\d+)/i);
  assert.equal(found, null);
});

test('findLiveLine: does NOT skip a live line merely because it mentions the word "superseded" describing what it replaces', () => {
  // Real bug this test locks in: the first version of HISTORICAL_LEAD_IN
  // matched "superseded" ANYWHERE in the line, which wrongly excluded a
  // live line whose own prose says "superseded the old note" about a
  // DIFFERENT version. Anchoring to "**" + marker word fixed it.
  const line = '> **Branch boundary — 2026-09-03 (updated; superseded the 2026-08-30 v3.1.0 note kept below for history):** production is v3.3.2 at `162061c`.';
  const found = findLiveLine(line, /production is v(\d+\.\d+\.\d+)/i);
  assert.equal(found.version, '3.3.2');
});

test('HISTORICAL_LEAD_IN: matches only when "**" is immediately followed by the marker word', () => {
  assert.equal(HISTORICAL_LEAD_IN.test('**Superseded — old note'), true);
  assert.equal(HISTORICAL_LEAD_IN.test('**Historical note only**'), true);
  assert.equal(HISTORICAL_LEAD_IN.test('**Branch boundary — superseded the old note'), false);
});

// ── runChecks ────────────────────────────────────────────────────────────────

function fixtureFiles(overrides) {
  const base = {
    'frontend/package.json': '{\n  "name": "lineup-generator",\n  "version": "3.3.2",\n',
    'backend/package.json': '{\n  "name": "backend",\n  "version": "3.3.2",\n',
    'frontend/package-lock.json': '{\n  "name": "lineup-generator",\n  "version": "3.3.2",\n  "lockfileVersion": 3,\n',
    'backend/package-lock.json': '{\n  "name": "backend",\n  "version": "3.3.2",\n  "lockfileVersion": 3,\n',
    'frontend/src/App.jsx': 'var APP_VERSION = "3.3.2";\n',
    'CLAUDE.md': '## Current Version\n**v3.3.2** — **promoted to `main`, live in production**.\n',
    'docs/product/ROADMAP.md': '> Last updated: 2026-09-03 (v3.3.2 promoted to `main`).\n',
    'docs/product/FEATURE_MAP.md': '> **Current production version: v3.3.2** (promoted 2026-09-03).\n',
    'docs/product/DOC_TEST_DEBT.md': '> **Branch boundary — 2026-09-03:** production is v3.3.2 at `abc123`.\n',
    'docs/product/PRODUCT_OPS.md': '> **Reconciled 2026-09-03:** production is v3.3.2.\n',
    'docs/product/MASTER_DEV_REFERENCE.md': '> **Production reconciliation — 2026-09-03:** production is v3.3.2 through PR #1.\n',
  };
  return Object.assign({}, base, overrides);
}

function readFileFromFixture(files) {
  return (relPath) => {
    if (!(relPath in files)) {
      const err = new Error(`fixture missing ${relPath}`);
      err.code = 'ENOENT';
      throw err;
    }
    return files[relPath];
  };
}

test('runChecks: all-consistent fixture set produces zero failures', () => {
  const { failures, canonical } = runChecks(readFileFromFixture(fixtureFiles({})));
  assert.equal(canonical, '3.3.2');
  assert.deepEqual(failures, []);
});

test('runChecks: a single stale file produces exactly one failure naming it', () => {
  const files = fixtureFiles({
    'docs/product/FEATURE_MAP.md': '> **Current production version: v3.3.0** (stale).\n',
  });
  const { failures } = runChecks(readFileFromFixture(files));
  assert.equal(failures.length, 1);
  assert.match(failures[0], /docs\/product\/FEATURE_MAP\.md: claims v3\.3\.0, canonical is v3\.3\.2/);
});

test('runChecks: CLAUDE.md banner mismatch is caught even with historical bullets below it', () => {
  const files = fixtureFiles({
    'CLAUDE.md':
      '## Current Version\n**v3.3.0** — stale banner.\n\n' +
      '- v3.3.2 (2026-09-03, **promoted to `main`, live in prod**): ...\n' +
      '- v3.3.1 (2026-09-03, **promoted to `main`**): ...\n',
  });
  const { failures } = runChecks(readFileFromFixture(files));
  assert.equal(failures.length, 1);
  assert.match(failures[0], /CLAUDE\.md: claims v3\.3\.0/);
});

test('runChecks: a file legitimately marked historical (no live claim) is not a failure', () => {
  const files = fixtureFiles({
    'docs/product/DOC_TEST_DEBT.md':
      '> **Superseded — 2026-08-30 (kept for history):** production is v3.1.0 at `xyz`.\n',
  });
  const { results, failures } = runChecks(readFileFromFixture(files));
  const debtResult = results.find((r) => r.file === 'docs/product/DOC_TEST_DEBT.md');
  assert.equal(debtResult.version, null);
  assert.equal(failures.length, 0);
});

test('runChecks: a missing file is reported as a failure, not silently skipped', () => {
  const files = fixtureFiles({});
  delete files['CLAUDE.md'];
  const { failures } = runChecks(readFileFromFixture(files));
  assert.equal(failures.length, 1);
  assert.match(failures[0], /CLAUDE\.md: could not read file/);
});
