import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AboutTab } from './AboutTab';

// ============================================================================
// AboutTab smoke tests (AT1–AT13) — Story 106 / issue #284
//
// AboutTab is the Support → About sub-tab, extracted from App.jsx renderAbout()
// in Story 105 (#281). 5-card layout:
//   1. What Is Dugout Lineup?  (token-driven; feature bullets + Share CTA)
//   2. Built by a Coach        (token-driven; navy top-accent)
//   3. Open to Partnerships    (token-driven; Email + LinkedIn buttons)
//   4. App Info                (legacy C/S styled; version + browser link)
//   5. How to Use (collapsible)(legacy C/S styled)
//
// IMPORTANT — AboutTab is STATELESS. `aboutGuideOpen` / `setAboutGuideOpen`
// are PROPS (state lifted to App.jsx). Clicking the Card 5 header does NOT
// re-render the component with steps; it calls setAboutGuideOpen(!aboutGuideOpen).
// So the toggle test asserts the setter is called with the negated value
// (AT13), and visibility is driven by the aboutGuideOpen prop (AT11/AT12).
//
// Unlike the fully token-driven ParentView, Cards 4 & 5 still consume C/S/
// APP_VERSION props — the fixture must supply minimal mocks or render throws.
// ============================================================================

// Minimal prop fixture. C/S are mocked (Cards 4–5 require them); APP_VERSION
// uses a sentinel "9.9.9" so the version assertion can't false-match real copy.
function renderAboutTab(overrides) {
  var props = Object.assign({
    aboutGuideOpen:    false,
    setAboutGuideOpen: vi.fn(),
    APP_VERSION:       "9.9.9",
    C: { navy: "#0F1F3D", textMuted: "#6b7280", red: "#c0392b", text: "#374151" },
    S: { card: {}, sectionTitle: {} },
  }, overrides || {});
  return render(<AboutTab {...props} />);
}

describe('AboutTab — smoke', function () {

  test('AT1: renders without crashing', function () {
    var result = renderAboutTab();
    expect(result.container.firstChild).toBeTruthy();
  });

  test('AT2: Card 1 — "What Is Dugout Lineup?" headline visible', function () {
    renderAboutTab();
    expect(screen.getByText('What Is Dugout Lineup?')).toBeTruthy();
  });

  test('AT3: Card 1 — all 6 feature bullets render', function () {
    renderAboutTab();
    var features = [
      'Create fair lineups in seconds',
      'Rotate players so everyone gets equal time',
      'Track positions inning by inning',
      'Share with parents and scorekeepers instantly',
      'Works offline at the field — no signal needed',
      'Free forever, no account required',
    ];
    features.forEach(function (feat) {
      expect(screen.getByText(feat)).toBeTruthy();
    });
  });

  test('AT4: Card 1 — "Share App Now" button present', function () {
    renderAboutTab();
    expect(screen.getByText('Share App Now')).toBeTruthy();
  });

  test('AT5: Card 2 — "Why I Built This" eyebrow visible', function () {
    renderAboutTab();
    expect(screen.getByText('Why I Built This')).toBeTruthy();
  });

  test('AT6: Card 2 — "Built by a Coach, Shipped like a Product" visible', function () {
    renderAboutTab();
    expect(screen.getByText('Built by a Coach, Shipped like a Product')).toBeTruthy();
  });

  test('AT7: Card 2 — credential line "Youth Baseball Coach" visible', function () {
    renderAboutTab();
    // Node text is "Youth Baseball Coach · Sharon Springs 8U". Anchor on the full
    // credential — a bare /Youth Baseball Coach/i also matches Card 4's "Built for
    // youth baseball coaches…" subtitle (substring), which throws MultipleElements.
    expect(screen.getByText(/Youth Baseball Coach.*Sharon Springs 8U/i)).toBeTruthy();
  });

  test('AT8: Card 3 — Email link has correct mailto href', function () {
    renderAboutTab();
    var link = screen.getByRole('link', { name: 'Email' });
    expect(link.getAttribute('href')).toBe('mailto:kaushik.kuberanathan@gmail.com');
  });

  test('AT9: Card 3 — LinkedIn link has correct href', function () {
    renderAboutTab();
    var link = screen.getByRole('link', { name: 'LinkedIn' });
    expect(link.getAttribute('href')).toBe('https://www.linkedin.com/in/kaushikkumarkuberanathan/');
  });

  test('AT10: Card 4 — APP_VERSION prop renders', function () {
    renderAboutTab({ APP_VERSION: '9.9.9' });
    // Exact string (not regex) — the outer div also contains "9.9.9" as a
    // substring, so a regex would match two elements and throw.
    expect(screen.getByText('v9.9.9')).toBeTruthy();
  });

  test('AT11: Card 5 — onboarding steps hidden when aboutGuideOpen=false', function () {
    renderAboutTab({ aboutGuideOpen: false });
    // Header is always present; only the steps are conditional.
    expect(screen.getByText('How to Use This App')).toBeTruthy();
    expect(screen.queryByText(/Install the App/i)).toBeNull();
  });

  test('AT12: Card 5 — onboarding steps visible when aboutGuideOpen=true', function () {
    renderAboutTab({ aboutGuideOpen: true });
    // First and last steps confirm the full list rendered.
    expect(screen.getByText(/Install the App/i)).toBeTruthy();
    expect(screen.getByText(/Back Up Your Data/i)).toBeTruthy();
  });

  test('AT13: Card 5 — header click calls setAboutGuideOpen with negated value', function () {
    var spy = vi.fn();
    renderAboutTab({ aboutGuideOpen: false, setAboutGuideOpen: spy });
    // Clicking the inner title bubbles to the parent div's onClick handler.
    fireEvent.click(screen.getByText('How to Use This App'));
    expect(spy).toHaveBeenCalledWith(true); // !false === true
  });

});
