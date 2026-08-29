import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function normalize(filePath) {
  return path.resolve(filePath).replaceAll('\\', '/');
}

export function discoverExpectedTestFiles(frontendRoot) {
  const srcRoot = path.join(frontendRoot, 'src');
  const results = [];

  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (/\.test\.(js|jsx)$/.test(entry.name)) results.push(normalize(fullPath));
    }
  }

  visit(srcRoot);
  return results.sort();
}

export function executedTestFiles(report) {
  if (!report || !Array.isArray(report.testResults)) {
    throw new Error('Vitest JSON report is missing testResults');
  }
  return [...new Set(report.testResults.map((result) => normalize(result.name)))].sort();
}

export function verifyInventory({ frontendRoot, report }) {
  const expected = discoverExpectedTestFiles(frontendRoot);
  const executed = executedTestFiles(report);
  const executedSet = new Set(executed);
  const missing = expected.filter((file) => !executedSet.has(file));

  return { expected, executed, missing };
}

function runCli() {
  const [frontendRootArg, reportPathArg] = process.argv.slice(2);
  if (!frontendRootArg || !reportPathArg) {
    throw new Error('Usage: node scripts/verify-vitest-file-inventory.mjs <frontend-root> <vitest-json-report>');
  }

  const frontendRoot = path.resolve(frontendRootArg);
  const report = JSON.parse(fs.readFileSync(path.resolve(reportPathArg), 'utf8'));
  const result = verifyInventory({ frontendRoot, report });

  if (result.missing.length > 0) {
    console.error(
      '[vitest-inventory] FAIL: Vitest did not execute ' + result.missing.length +
      ' of ' + result.expected.length + ' expected test files:\n' +
      result.missing.map((file) => '  - ' + path.relative(frontendRoot, file)).join('\n')
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    '[vitest-inventory] PASS: executed all ' + result.executed.length +
    ' expected frontend test files.'
  );
}

if (process.argv[1] && normalize(process.argv[1]) === normalize(fileURLToPath(import.meta.url))) {
  runCli();
}
