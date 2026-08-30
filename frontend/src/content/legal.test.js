import { describe, test, expect } from 'vitest';
import { LEGAL_DOCS, getLegalDoc, getLegalDocVersion, getCurrentLegalVersion } from './legal';

// Coverage for the versioning accessors introduced alongside the
// registration-screen consent flow (RequestAccessScreen.jsx) and the
// legal_consents audit table (backend migration 028). The whole point of
// this layer is that bumping a document's text is a single edit — append a
// new entry to that doc's versions[] — with no other code change required;
// these tests lock in the contract that makes that true.

describe('content/legal.js — LEGAL_DOCS shape', function () {
  test('every doc has a non-empty versions array, each entry with a version string and sections', function () {
    LEGAL_DOCS.forEach(function (doc) {
      expect(Array.isArray(doc.versions)).toBe(true);
      expect(doc.versions.length).toBeGreaterThan(0);
      doc.versions.forEach(function (v) {
        expect(typeof v.version).toBe('string');
        expect(v.version.length).toBeGreaterThan(0);
        expect(Array.isArray(v.sections)).toBe(true);
      });
    });
  });

  test('doc ids are unique', function () {
    var ids = LEGAL_DOCS.map(function (d) { return d.id; });
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getLegalDoc', function () {
  test('resolves to the LAST entry in versions — the current version', function () {
    var doc = getLegalDoc('terms');
    expect(doc.version).toBe('2.0');
    expect(doc.effectiveDate).toBe('August 2026');
    expect(doc.title).toBe('Terms of Service');
  });

  test('flattened shape carries doc-level identity plus the version entry fields, and nothing else', function () {
    var doc = getLegalDoc('terms');
    expect(Object.keys(doc).sort()).toEqual(
      ['effectiveDate', 'emoji', 'id', 'sections', 'summary', 'title', 'tldr', 'version'].sort()
    );
  });

  test('a doc with only one version returns that version as current', function () {
    var doc = getLegalDoc('privacy');
    expect(doc.version).toBe('1.0');
  });

  test('unknown id returns null', function () {
    expect(getLegalDoc('does-not-exist')).toBeNull();
  });
});

describe('getLegalDocVersion', function () {
  test('retrieves a specific PRIOR version, distinct text from the current version', function () {
    var v1 = getLegalDocVersion('terms', '1.0');
    var v2 = getLegalDocVersion('terms', '2.0');

    expect(v1.effectiveDate).toBe('April 2026');
    expect(v2.effectiveDate).toBe('August 2026');
    // The actual words differ between versions — this is what makes a
    // legal_consents row's stamped version meaningful as an audit pointer.
    expect(v1.sections).not.toEqual(v2.sections);
    expect(v1.title).toBe(v2.title); // doc-level identity is shared across versions
  });

  test('getLegalDocVersion(id, currentVersion) matches getLegalDoc(id)', function () {
    var current = getCurrentLegalVersion('terms');
    expect(getLegalDocVersion('terms', current)).toEqual(getLegalDoc('terms'));
  });

  test('unknown version on a real doc returns null', function () {
    expect(getLegalDocVersion('terms', '99.0')).toBeNull();
  });

  test('unknown id returns null', function () {
    expect(getLegalDocVersion('does-not-exist', '1.0')).toBeNull();
  });
});

describe('getCurrentLegalVersion', function () {
  test('returns just the version string, not the doc', function () {
    expect(getCurrentLegalVersion('terms')).toBe('2.0');
    expect(typeof getCurrentLegalVersion('terms')).toBe('string');
  });

  test('unknown id returns null', function () {
    expect(getCurrentLegalVersion('does-not-exist')).toBeNull();
  });
});
