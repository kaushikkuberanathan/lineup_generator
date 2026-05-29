// Regression tests for scripts/sync-stories-to-issues.js patch logic.
// Story 97 / issue #234 — guards against CRLF byte-corruption of Story
// headings on marker patch. Uses Node's built-in test runner (node:test).
//
// Run from repo root:
//   node --test scripts/__tests__/sync-patch.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseStories, patchHeading } = require('../sync-stories-to-issues.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const CRLF = '\r\n';

// Minimal CRLF ROADMAP with one open story (<!-- #N -->), one resolved
// story (also <!-- #N --> so the Resolved-skip body branch fires), and
// one already-linked story (skipped at heading regex before body parse).
const FIXTURE = [
  '# ROADMAP',
  '',
  '### Story 100 (P2) — sample open story <!-- #N -->',
  '',
  'Status: Open',
  'Discovered: 2026-05-29',
  '',
  '### Story 101 (P3) — sample resolved <!-- #N -->',
  '',
  'Status: Resolved',
  '',
  '### Story 102 (P2) — sample already linked <!-- #151 -->',
  '',
  'Status: Open',
  '',
].join(CRLF);

// ── parseStories ─────────────────────────────────────────────────────────────

test('parseStories: strips CRLF \\r from originalLine', () => {
  const stories = parseStories(FIXTURE);
  // Only Story 100 should appear:
  //   - Story 101 has <!-- #N --> + Status:Resolved → skipped in body parse
  //   - Story 102 has <!-- #151 --> → skipped at heading regex (already linked)
  assert.equal(stories.length, 1, 'only Story 100 should pass through');
  const s = stories[0];
  assert.equal(s.num, 100);
  assert.equal(s.priority, '2');
  // Critical assertion — no trailing \r on originalLine:
  assert.equal(s.originalLine.endsWith('\r'), false,
    'originalLine must not retain trailing \\r from CRLF split');
  // Full content matches expected clean string:
  assert.equal(s.originalLine,
    '### Story 100 (P2) — sample open story <!-- #N -->');
});

// ── patchHeading: POST-success / de-dup parity ───────────────────────────────

test('patchHeading: replaces #N marker, preserves CRLF terminator', () => {
  const stories = parseStories(FIXTURE);
  const story = stories[0];
  const updated = patchHeading(FIXTURE, story.originalLine, 234);

  const expectedHeading = '### Story 100 (P2) — sample open story <!-- #234 -->';
  assert.ok(updated.includes(expectedHeading + CRLF),
    'patched heading must be followed by CRLF terminator');

  // Check that the PATCHED LINE specifically no longer contains the #N
  // placeholder. (Story 101 also has <!-- #N --> in the fixture by design —
  // it tests the Resolved-skip path and should be left untouched.)
  const lineStart = updated.indexOf('### Story 100');
  const lineEnd = updated.indexOf('\n', lineStart);
  const patchedLineWithCR = updated.slice(lineStart, lineEnd);          // ends with \r
  assert.ok(!patchedLineWithCR.includes('<!-- #N -->'),
    'patched line must no longer contain #N placeholder');

  // No mid-line \r introduced on the patched heading. Count \r occurrences
  // excluding the terminating \r:
  const innerCount = (patchedLineWithCR.slice(0, -1).match(/\r/g) || []).length;
  assert.equal(innerCount, 0,
    `mid-line \\r forbidden; got ${innerCount} in: ${JSON.stringify(patchedLineWithCR)}`);

  // Confirm Story 101's #N placeholder is intentionally untouched (sanity
  // check that patchHeading is line-scoped, not global):
  assert.ok(updated.includes('### Story 101 (P3) — sample resolved <!-- #N -->'),
    'unrelated story #N markers must NOT be touched by patchHeading');
});

// ── patchHeading: idempotency ────────────────────────────────────────────────

test('patchHeading: second call with same originalLine is a no-op', () => {
  // Once patchHeading has rewritten the heading, the originalLine no longer
  // exists as a substring in `once`, so a second call returns `once` unchanged.
  // Guards against accidental double-patching if the script is re-run.
  const stories = parseStories(FIXTURE);
  const story = stories[0];
  const once = patchHeading(FIXTURE, story.originalLine, 234);
  const twice = patchHeading(once, story.originalLine, 999);
  assert.equal(once, twice,
    'second patchHeading with the same originalLine must not change content');
});

// ── Byte-level CRLF integrity guard ──────────────────────────────────────────

test('patchHeading: byte-level CRLF integrity around patched zone', () => {
  const stories = parseStories(FIXTURE);
  const story = stories[0];
  const updated = patchHeading(FIXTURE, story.originalLine, 234);

  const buf = Buffer.from(updated, 'utf8');
  const idx = buf.indexOf(Buffer.from('### Story 100'));
  assert.ok(idx >= 0, 'patched heading must be present');

  // 80-byte slice covers heading + CRLF + blank-line CRLF + 'Status:'
  const slice = buf.slice(idx, idx + 80).toString('utf8');
  assert.match(slice,
    /### Story 100 \(P2\) — sample open story <!-- #234 -->\r\n\r\nStatus:/,
    `byte slice must show clean CRLF terminator on patched heading; got: ${JSON.stringify(slice)}`);
});
