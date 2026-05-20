import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { FAQSection } from './FAQSection';
import { FAQ_CATEGORIES } from '../../content/faqs';

var FAQ_SECTION_SOURCE_PATH = join(dirname(fileURLToPath(import.meta.url)), 'FAQSection.jsx');

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

  // ----------------------------------------------------------------------------
  // Phase 3 Step 3 RED tests — added 2026-05-20
  //
  // F5 — anti-pattern absence (RED against current code):
  //   The answer-body Text at L126–135 currently has
  //   `style={{ ..., fontSize: "13px", ... }}` which overrides the primitive's
  //   own size handling. Step 3 fix: switch to `<Text size="body">` and drop
  //   the fontSize from the style override.
  //
  //   JSDOM merges caller-passed `style.fontSize` with the primitive-internal
  //   fontSize (set by Text's `size` prop) into a single `element.style.fontSize`
  //   value, so a behavioral assertion on the rendered DOM cannot distinguish
  //   the two. Source-level regex is the appropriate tool: assert no `<Text ...>`
  //   opening tag has a `style={{ ... fontSize ... }}` prop.
  //
  // F6 — coverage gap fill:
  //   F3 only verifies a single category's picker label. F6 asserts every entry
  //   in FAQ_CATEGORIES renders its `emoji + ' ' + label` in the picker.
  // ----------------------------------------------------------------------------

  test('F5: answer body <Text> must not override fontSize via inline style (Step 3 anti-pattern check)', function () {
    var src = readFileSync(FAQ_SECTION_SOURCE_PATH, 'utf-8');
    var antiPattern = /<Text[^>]*style=\{\{[^}]*fontSize/;
    expect(antiPattern.test(src)).toBe(false);
  });

  test('F6: every FAQ_CATEGORIES label renders in the picker', function () {
    render(<FAQSection />);
    FAQ_CATEGORIES.forEach(function (cat) {
      var picker = cat.emoji + ' ' + cat.label;
      expect(screen.queryByText(picker)).not.toBeNull();
    });
  });

});
