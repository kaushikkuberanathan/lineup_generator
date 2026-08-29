import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LegalSection } from './LegalSection';
import { LEGAL_DOCS, getLegalDoc } from '../../content/legal';

// ============================================================================
// LegalSection — Phase 3 primitive migration regression guard
//
// LegalSection renders the Support → Legal sub-tab as a list of policy
// buttons (e.g. Privacy Policy, Terms of Use). Tapping a button mounts
// LegalViewer, a detail surface rendering the doc's typed sections (h3, p,
// ul). Both surfaces are slated for Card/Button/Stack/Text primitive
// substitution in the v2.5.x UX track.
//
// These tests pin BEHAVIOR (not computed styles): list-view enumeration,
// list→detail transition, section type rendering, back navigation, and a
// structural footer anchor. They must stay GREEN across the primitive swap.
//
// Style assertions belong in primitive-level tests. No props required —
// component is self-styled via design tokens. Real LEGAL_DOCS content
// is used (no vi.mock).
// ============================================================================

describe('LegalSection — primitive migration guard', function () {

  test('L1: list view renders every LEGAL_DOCS entry with title and summary', function () {
    if (LEGAL_DOCS.length === 0) {
      throw new Error('L1 requires at least 1 LEGAL_DOCS entry');
    }

    render(<LegalSection />);

    LEGAL_DOCS.forEach(function (doc) {
      expect(screen.queryByText(doc.title)).not.toBeNull();
      expect(screen.queryByText(doc.summary)).not.toBeNull();
    });
  });

  test('L2: clicking a doc opens the detail view (Back button appears)', function () {
    render(<LegalSection />);

    // Before click: no Back button
    expect(screen.queryByText('‹ Back')).toBeNull();

    var firstDoc = LEGAL_DOCS[0];
    fireEvent.click(screen.getByText(firstDoc.title));

    // After click: detail view rendered, Back button present
    expect(screen.queryByText('‹ Back')).not.toBeNull();
  });

  test('L3: detail view renders h3, p, and ul section types', function () {
    // Current-version sections, via getLegalDoc — same accessor the
    // component itself uses (LEGAL_DOCS entries nest text under
    // versions[], not a flat .sections).
    var docWithAllTypes = LEGAL_DOCS
      .map(function (doc) { return getLegalDoc(doc.id); })
      .find(function (doc) {
        var types = doc.sections.map(function (s) { return s.type; });
        return types.indexOf('h3') >= 0
            && types.indexOf('p')  >= 0
            && types.indexOf('ul') >= 0;
      });

    if (!docWithAllTypes) {
      throw new Error('L3 requires at least one LEGAL_DOCS entry containing h3, p, and ul sections');
    }

    render(<LegalSection />);
    fireEvent.click(screen.getByText(docWithAllTypes.title));

    var h3 = docWithAllTypes.sections.find(function (s) { return s.type === 'h3'; });
    var p  = docWithAllTypes.sections.find(function (s) { return s.type === 'p';  });
    var ul = docWithAllTypes.sections.find(function (s) { return s.type === 'ul'; });

    expect(screen.queryByText(h3.text)).not.toBeNull();
    expect(screen.queryByText(p.text)).not.toBeNull();
    expect(screen.queryByText(ul.items[0])).not.toBeNull();
  });

  test('L4: clicking Back from detail view returns to list', function () {
    render(<LegalSection />);

    var firstDoc = LEGAL_DOCS[0];
    fireEvent.click(screen.getByText(firstDoc.title));
    expect(screen.queryByText('‹ Back')).not.toBeNull();

    fireEvent.click(screen.getByText('‹ Back'));

    // Back button gone — list view re-rendered
    expect(screen.queryByText('‹ Back')).toBeNull();

    // All docs visible again
    LEGAL_DOCS.forEach(function (doc) {
      expect(screen.queryByText(doc.title)).not.toBeNull();
    });
  });

  test('L5: list-view footer text is rendered', function () {
    render(<LegalSection />);
    // Footer contains an HTML-entity middle dot (&middot; → ·) which is
    // brittle as an exact-match string; regex matches the stable tail.
    expect(screen.queryByText(/Questions\? Use the Feedback tab\./)).not.toBeNull();
  });

  test('L7: detail-view footer text renders after opening a doc', function () {
    render(<LegalSection />);

    var firstDoc = LEGAL_DOCS[0];
    fireEvent.click(screen.getByText(firstDoc.title));

    // Detail view replaces list view entirely (LegalViewer is a separate return).
    // List-view footer is gone; detail-view footer (no HTML entities) is the
    // only "Use the Feedback tab" string visible — exact-match is safe.
    expect(screen.queryByText('Questions about this policy? Use the Feedback tab.')).not.toBeNull();
  });

  // ============================================================================
  // initialDocId — the Account tab's "Terms of Service" row deep-links here
  // (App.jsx's renderAccount(), via legalInitialDoc state). Covered at the
  // component level since App.jsx has no dedicated render harness in this
  // suite; these tests lock in the actual contract App.jsx relies on.
  // ============================================================================

  test('initialDocId opens straight to that doc\'s detail view — no click needed, Back button present immediately', function () {
    render(<LegalSection initialDocId="terms" />);

    expect(screen.queryByText('‹ Back')).not.toBeNull();
    var termsDoc = getLegalDoc('terms');
    // Detail-view header renders "{emoji} {title}" as one text node —
    // regex substring match, not exact equality.
    expect(screen.queryByText(new RegExp(termsDoc.title))).not.toBeNull();
    expect(screen.queryByText('Questions about this policy? Use the Feedback tab.')).not.toBeNull();
  });

  test('initialDocId resolves to the CURRENT version of the doc, matching getLegalDoc', function () {
    render(<LegalSection initialDocId="terms" />);

    var current = getLegalDoc('terms');
    expect(screen.queryByText(new RegExp('Effective ' + current.effectiveDate))).not.toBeNull();
    // "Liability" and the "In Plain English" tldr card exist only on terms
    // v2.0, not the historical v1.0 entry — proves this rendered the
    // CURRENT version, not an arbitrary/first entry in versions[].
    expect(screen.queryByText('Liability')).not.toBeNull();
    expect(screen.queryByText('In Plain English')).not.toBeNull();
  });

  test('an unknown initialDocId falls back to the list view, not a crash', function () {
    render(<LegalSection initialDocId="does-not-exist" />);
    expect(screen.queryByText('‹ Back')).toBeNull();
    LEGAL_DOCS.forEach(function (doc) {
      expect(screen.queryByText(doc.title)).not.toBeNull();
    });
  });

  test('omitting initialDocId behaves exactly as before this prop existed — list view first', function () {
    render(<LegalSection />);
    expect(screen.queryByText('‹ Back')).toBeNull();
  });

});
