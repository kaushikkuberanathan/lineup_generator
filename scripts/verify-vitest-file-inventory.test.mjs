import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  discoverExpectedTestFiles,
  executedTestFiles,
  verifyInventory,
} from './verify-vitest-file-inventory.mjs';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vitest-inventory-'));
  fs.mkdirSync(path.join(root, 'src', 'nested'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'alpha.test.js'), '');
  fs.writeFileSync(path.join(root, 'src', 'nested', 'beta.test.jsx'), '');
  fs.writeFileSync(path.join(root, 'src', 'nested', 'not-a-test.js'), '');
  return root;
}

test('discovers the same js/jsx test-file contract configured in vite.config.js', () => {
  const root = fixture();
  try {
    const files = discoverExpectedTestFiles(root);
    assert.equal(files.length, 2);
    assert.ok(files[0].endsWith('/src/alpha.test.js'));
    assert.ok(files[1].endsWith('/src/nested/beta.test.jsx'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('normalizes and de-duplicates executed file names from the Vitest JSON report', () => {
  const files = executedTestFiles({ testResults: [
    { name: './src/example.test.js' },
    { name: './src/example.test.js' },
  ] });
  assert.equal(files.length, 1);
  assert.ok(files[0].endsWith('/src/example.test.js'));
});

test('controlled omission fails inventory comparison even when the report itself says success', () => {
  const root = fixture();
  try {
    const alpha = path.join(root, 'src', 'alpha.test.js');
    const result = verifyInventory({
      frontendRoot: root,
      report: { success: true, testResults: [{ name: alpha }] },
    });
    assert.equal(result.missing.length, 1);
    assert.ok(result.missing[0].endsWith('/src/nested/beta.test.jsx'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('complete report passes with no missing files', () => {
  const root = fixture();
  try {
    const expected = discoverExpectedTestFiles(root);
    const result = verifyInventory({
      frontendRoot: root,
      report: { success: true, testResults: expected.map((name) => ({ name })) },
    });
    assert.deepEqual(result.missing, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('malformed report fails closed', () => {
  assert.throws(() => executedTestFiles({ success: true }), /missing testResults/);
});
