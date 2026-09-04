#!/usr/bin/env node
/**
 * scripts/check-version-currency.js
 *
 * Fails if any "this is the live production version" claim anywhere in the
 * repo doesn't match frontend/package.json's version — the exact bug class
 * found and fixed in #1049's release (v3.3.2, PR #1056): CLAUDE.md's Current
 * Version banner, ROADMAP.md's own release entries, FEATURE_MAP.md, and
 * three other docs all kept asserting a version 1-3 releases stale, with no
 * automated check to catch it. See docs/product/RELEASE_RITUAL_PLAYBOOK.md
 * § Version-currency check for the full incident writeup.
 *
 * Deliberately narrow: this checks a fixed, named list of "live" banner
 * lines, not every version-shaped string in the repo — a blanket grep would
 * explode on legitimate historical changelog entries (CLAUDE.md and
 * ROADMAP.md are mostly made of those by design). Historical/superseded
 * lines are recognized by an explicit marker word (see EXCLUDE_MARKERS) and
 * skipped, not flagged.
 *
 * Usage:
 *   node scripts/check-version-currency.js          ← check (exit 1 on drift)
 *   node scripts/check-version-currency.js --list    ← print what each check found, then exit 0
 *
 * Adding a new file to the check list: add an entry to CHECKS below. Every
 * entry needs a `find(content)` function returning either `null` (no live
 * claim in this file — fine, e.g. a file with only historical notes) or
 * `{ version, line }` for the live claim it found. Throwing from `find()`
 * is treated as a hard failure (ambiguous match — fix the extractor).
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const LIST_ONLY = process.argv.includes('--list');

// A line is historical record, not a live claim, only when its OWN bolded
// lead-in says so — e.g. "**Superseded — 2026-08-30 ..." or "**Historical
// ...". Deliberately anchored to "**" immediately followed by the marker
// word, not "contains this word anywhere" — a live line describing what it
// replaces (e.g. "supersedes the 2026-08-30 v3.1.0 note") legitimately
// mentions an old version and the word "superseded" without itself being
// historical. Getting this distinction wrong was a real bug caught while
// building this check (see docs/product/RELEASE_RITUAL_PLAYBOOK.md).
const HISTORICAL_LEAD_IN = /\*\*(superseded|historical)\b/i;

function readFile(relPath) {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A live "production is vX.Y.Z" line legitimately lags the canonical
 * (frontend/package.json) version during release prep, between bumping the
 * package version on a release branch and the actual develop→main promote —
 * found doing exactly that for v3.3.3. That's not staleness (the doc hasn't
 * failed to keep up with a promote that already happened); it's an
 * explicitly acknowledged pending one. A line naming the canonical version
 * alongside "release candidate" is accepted as current rather than flagged,
 * the same way HISTORICAL_LEAD_IN accepts a line explicitly marked
 * superseded — both are "the doc already says the honest, current thing,"
 * just for the two different sides of a promote.
 */
function isAcknowledgedReleaseCandidate(line, canonical) {
  if (!canonical) return false;
  const versionMentioned = new RegExp(`v${escapeRegExp(canonical)}\\b`).test(line);
  return versionMentioned && /release candidate/i.test(line);
}

// Generic helper: scan `content` line by line, skip lines whose own lead-in
// marks them historical, return the version captured by `versionRegex`'s
// single capture group in the first surviving matching line. `versionRegex`
// must anchor to the specific phrase carrying the live claim (e.g.
// "production is v(...)") — matching "any version-shaped string in the
// line" is not enough when a line legitimately mentions two versions (the
// live one and the old one it superseded). `canonical`, when given, lets a
// line that names it alongside "release candidate" count as current even
// though the regex's own capture is the still-live older version (see
// isAcknowledgedReleaseCandidate above).
function findLiveLine(content, versionRegex, canonical) {
  const lines = content.split('\n');
  for (const line of lines) {
    if (HISTORICAL_LEAD_IN.test(line)) continue;
    const m = line.match(versionRegex);
    if (m) {
      if (m[1] !== canonical && isAcknowledgedReleaseCandidate(line, canonical)) {
        return { version: canonical, line: line.trim().slice(0, 160) };
      }
      return { version: m[1], line: line.trim().slice(0, 160) };
    }
  }
  return null;
}

const CHECKS = [
  {
    file: 'frontend/src/App.jsx',
    find: (c) => {
      const m = c.match(/var APP_VERSION = "(\d+\.\d+\.\d+)"/);
      return m ? { version: m[1], line: m[0] } : null;
    },
  },
  {
    file: 'frontend/package.json',
    find: (c) => {
      const m = c.match(/"version":\s*"(\d+\.\d+\.\d+)"/);
      return m ? { version: m[1], line: m[0] } : null;
    },
  },
  {
    file: 'backend/package.json',
    find: (c) => {
      const m = c.match(/"version":\s*"(\d+\.\d+\.\d+)"/);
      return m ? { version: m[1], line: m[0] } : null;
    },
  },
  {
    // Lockfiles repeat "version" for every nested dependency — restrict to
    // the first 10 lines, where npm always places the package's own two
    // top-level version fields (root object + packages[""]).
    file: 'frontend/package-lock.json',
    find: (c) => {
      const head = c.split('\n').slice(0, 10).join('\n');
      const m = head.match(/"version":\s*"(\d+\.\d+\.\d+)"/);
      return m ? { version: m[1], line: m[0] } : null;
    },
  },
  {
    file: 'backend/package-lock.json',
    find: (c) => {
      const head = c.split('\n').slice(0, 10).join('\n');
      const m = head.match(/"version":\s*"(\d+\.\d+\.\d+)"/);
      return m ? { version: m[1], line: m[0] } : null;
    },
  },
  {
    // The "## Current Version" banner's own headline version, e.g.
    // "**v3.3.2** — **promoted to `main`, live in production** as of ...".
    // Deliberately does NOT check the changelog bullets below it — those
    // are dated history by design (root CLAUDE.md's own "previously
    // updated" convention) and each carries its own promotion facts once
    // fixed, not a fixed current-version slot to validate generically.
    file: 'CLAUDE.md',
    find: (c) => {
      const idx = c.indexOf('## Current Version');
      if (idx === -1) return null;
      const after = c.slice(idx, idx + 400);
      const m = after.match(/\*\*v(\d+\.\d+\.\d+)\*\*/);
      return m ? { version: m[1], line: m[0] } : null;
    },
  },
  {
    file: 'docs/product/ROADMAP.md',
    find: (c) => findLiveLine(c, /^>\s*Last updated:\s*\d{4}-\d{2}-\d{2}\s*\(v(\d+\.\d+\.\d+)/),
  },
  {
    file: 'docs/product/FEATURE_MAP.md',
    find: (c, canonical) => findLiveLine(c, /Current production version:\s*v(\d+\.\d+\.\d+)/i, canonical),
  },
  {
    file: 'docs/product/DOC_TEST_DEBT.md',
    find: (c, canonical) => findLiveLine(c, /production is v(\d+\.\d+\.\d+)/i, canonical),
  },
  {
    file: 'docs/product/PRODUCT_OPS.md',
    find: (c, canonical) => findLiveLine(c, /production is v(\d+\.\d+\.\d+)/i, canonical),
  },
  {
    file: 'docs/product/MASTER_DEV_REFERENCE.md',
    find: (c, canonical) => findLiveLine(c, /production is v(\d+\.\d+\.\d+)/i, canonical),
  },
];

// Pure core: takes a `readFileFn(relPath) => string` so tests can inject
// fixture content instead of touching the real filesystem. Returns
// { canonical, results, failures } and never touches process.exit/console —
// only the CLI block below does that.
function runChecks(readFileFn) {
  const canonical = CHECKS.find((c) => c.file === 'frontend/package.json').find(
    readFileFn('frontend/package.json')
  ).version;

  const results = [];
  const failures = [];

  for (const check of CHECKS) {
    let content;
    try {
      content = readFileFn(check.file);
    } catch (err) {
      failures.push(`${check.file}: could not read file (${err.code || err.message})`);
      continue;
    }

    let found;
    try {
      found = check.find(content, canonical);
    } catch (err) {
      failures.push(`${check.file}: extractor threw (${err.message}) — fix check-version-currency.js`);
      continue;
    }

    if (found === null) {
      results.push({ file: check.file, version: null, line: null });
      continue;
    }

    results.push({ file: check.file, version: found.version, line: found.line });

    if (found.version !== canonical) {
      failures.push(
        `${check.file}: claims v${found.version}, canonical is v${canonical}\n    ↳ "${found.line}"`
      );
    }
  }

  return { canonical, results, failures };
}

function main() {
  const { canonical, results, failures } = runChecks(readFile);

  if (LIST_ONLY) {
    console.log(`Canonical version (frontend/package.json): v${canonical}\n`);
    for (const r of results) {
      console.log(`${r.file}: ${r.version ? 'v' + r.version : '(no live claim found — fine)'}`);
      if (r.line) console.log(`    ↳ "${r.line}"`);
    }
    process.exit(0);
  }

  if (failures.length > 0) {
    console.error(`❌ Version-currency check failed — canonical version is v${canonical}, but:\n`);
    for (const f of failures) console.error(`  ${f}\n`);
    console.error(
      'Fix: update each listed file\'s live banner to the canonical version, or if the ' +
      'file\'s claim is intentionally historical, mark that line with "Superseded" or ' +
      '"kept for history" so this check skips it (see CLAUDE.md\'s own convention).'
    );
    process.exit(1);
  }

  console.log(`✅ Version-currency check passed — all live claims match v${canonical}.`);
  process.exit(0);
}

module.exports = { runChecks, findLiveLine, HISTORICAL_LEAD_IN, isAcknowledgedReleaseCandidate, CHECKS };

if (require.main === module) {
  main();
}
