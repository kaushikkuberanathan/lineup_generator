import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FAQSection } from './FAQSection';
import { FAQ_CATEGORIES } from '../../content/faqs';

// ============================================================================
// FAQSection — Phase 3 primitive migration regression guard
//
// FAQSection renders the Support → FAQ sub-tab: a horizontal category picker
// and a vertical Q&A accordion. Both surfaces are slated for Badge/Button/
// Card/Stack/Text primitive substitution in the v2.5.x UX track.
//
// These tests pin BEHAVIOR (not computed styles): default state, accordion
// toggle, category switch closing any open item, and structural footer text.
// They must stay GREEN across the upcoming primitive swap — any failure
// after refactor indicates a real regression, not a style drift.
//
// Style assertions belong in primitive-level tests (Badge.test.jsx etc.).
// No props required — component is self-styled via design tokens.
// Real FAQ_CATEGORIES content is used (no vi.mock).
// ============================================================================

describe('FAQSection — primitive migration guard', function () {

  test('F1: default render shows first category active and no answer expanded', function () {
    render(<FAQSection />);

    // First category's first question renders (active category questions are mapped)
    var firstQ = FAQ_CATEGORIES[0].items[0].q;
    expect(screen.queryByText(firstQ)).not.toBeNull();

    // Its answer is NOT rendered (no item is open by default)
    var firstA = FAQ_CATEGORIES[0].items[0].a;
    expect(screen.queryByText(firstA)).toBeNull();
  });

  test('F2: clicking a question reveals its answer; clicking again hides it', function () {
    render(<FAQSection />);

    var firstQ = FAQ_CATEGORIES[0].items[0].q;
    var firstA = FAQ_CATEGORIES[0].items[0].a;

    expect(screen.queryByText(firstA)).toBeNull();

    fireEvent.click(screen.getByText(firstQ));
    expect(screen.queryByText(firstA)).not.toBeNull();

    fireEvent.click(screen.getByText(firstQ));
    expect(screen.queryByText(firstA)).toBeNull();
  });

  test('F3: switching category resets any open item to closed', function () {
    if (FAQ_CATEGORIES.length < 2) {
      throw new Error('F3 requires at least 2 FAQ_CATEGORIES entries');
    }

    render(<FAQSection />);

    var cat0FirstQ = FAQ_CATEGORIES[0].items[0].q;
    var cat0FirstA = FAQ_CATEGORIES[0].items[0].a;

    // Open item 0 in category 0
    fireEvent.click(screen.getByText(cat0FirstQ));
    expect(screen.queryByText(cat0FirstA)).not.toBeNull();

    // Switch to category 1 (category picker button label = "emoji label")
    var cat1 = FAQ_CATEGORIES[1];
    fireEvent.click(screen.getByText(cat1.emoji + ' ' + cat1.label));

    // Category 0's answer is gone (different category now rendering)
    expect(screen.queryByText(cat0FirstA)).toBeNull();

    // No answer from category 1 should be open either — openItem was reset to null
    var cat1FirstA = cat1.items[0].a;
    expect(screen.queryByText(cat1FirstA)).toBeNull();
  });

  test('F4: footer hint text is rendered', function () {
    render(<FAQSection />);
    expect(screen.queryByText('Still have questions? Use the Feedback tab to ask.')).not.toBeNull();
  });

});
