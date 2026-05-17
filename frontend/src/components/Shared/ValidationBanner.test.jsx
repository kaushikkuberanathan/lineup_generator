import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValidationBanner } from './ValidationBanner';

// ============================================================================
// Phase 3 Step 4 — ValidationBanner contract tests
//
// These tests lock the current visual contract before the primitive migration.
// They are characterization tests — all assertions match the pre-migration
// inline-styled implementation. The migration to Stack/Text must preserve
// every assertion below; visual identity is the primary requirement.
//
// JSDOM inline-style normalization (same conventions as all prior tests):
//   hex colors → rgb():
//     #d1fae5 (success bg, green-100)  = rgb(209, 250, 229)
//     #fef3c7 (warning bg, amber-100)  = rgb(254, 243, 199)
//     #065f46 (success title, green-900) = rgb(6, 95, 70)
//     #92400e (warning title, amber-800) = rgb(146, 64, 14)
//
// Note: these dark-on-tint text colors have no token equivalents (no
// successText / warningText tokens exist). Style escapes will preserve
// the literal values across the migration. Token gap filed as follow-up
// to Story 60.
//
// List items: <ul>/<li> stay semantic. Tests assert li count, not li styling.
// ============================================================================

describe('ValidationBanner — Phase 3 primitive migration contract', function () {

  // ── VB1 — Ready state (bannerReady=true) ─────────────────────────────────

  test('VB1.1: renders when bannerReady=true (not null)', function () {
    var { container } = render(<ValidationBanner bannerReady={true} bannerIssues={[]} />);
    expect(container.firstChild).not.toBeNull();
  });

  test('VB1.2: success background is rgb(209,250,229) (#d1fae5)', function () {
    var { container } = render(<ValidationBanner bannerReady={true} bannerIssues={[]} />);
    expect(container.firstChild.style.background).toBe('rgb(209, 250, 229)');
  });

  test('VB1.3: success title text is present in DOM', function () {
    render(<ValidationBanner bannerReady={true} bannerIssues={[]} />);
    // Exact text from L21 — em-dash and middle-dot characters preserved
    expect(screen.getByText('Lineup Ready — All innings valid · Bench rotation balanced')).toBeInTheDocument();
  });

  // ── VB2 — Issues state (bannerReady=false) ───────────────────────────────

  test('VB2.1: renders when bannerReady=false', function () {
    var { container } = render(<ValidationBanner bannerReady={false} bannerIssues={['a']} />);
    expect(container.firstChild).not.toBeNull();
  });

  test('VB2.2: warning background is rgb(254,243,199) (#fef3c7)', function () {
    var { container } = render(<ValidationBanner bannerReady={false} bannerIssues={['a']} />);
    expect(container.firstChild.style.background).toBe('rgb(254, 243, 199)');
  });

  test('VB2.3: title text shows correct issue count (2 issues → "Fix 2 issues")', function () {
    render(<ValidationBanner bannerReady={false} bannerIssues={['first issue', 'second issue']} />);
    expect(screen.getByText('Fix 2 issues')).toBeInTheDocument();
  });

  test('VB2.4: title text uses singular form for 1 issue ("Fix 1 issue")', function () {
    render(<ValidationBanner bannerReady={false} bannerIssues={['only issue']} />);
    // Pluralization branch at L26: bannerIssues.length === 1 ? " issue" : " issues"
    expect(screen.getByText('Fix 1 issue')).toBeInTheDocument();
  });

  test('VB2.5: issues list renders correct number of <li> elements', function () {
    var { container } = render(
      <ValidationBanner bannerReady={false} bannerIssues={['one', 'two', 'three']} />
    );
    expect(container.querySelectorAll('li')).toHaveLength(3);
  });

  // ── VB3 — Layout structure (locks the flex contract for Stack migration) ─

  test('VB3.1: outer container has display:flex', function () {
    var { container } = render(<ValidationBanner bannerReady={true} bannerIssues={[]} />);
    expect(container.firstChild.style.display).toBe('flex');
  });

  test('VB3.2: outer container alignItems is "flex-start"', function () {
    var { container } = render(<ValidationBanner bannerReady={true} bannerIssues={[]} />);
    expect(container.firstChild.style.alignItems).toBe('flex-start');
  });

  // ── VB4 — Style escape contract (locks literal colors with no tokens) ────

  test('VB4.1: success title color is rgb(6,95,70) (#065f46 — no token)', function () {
    render(<ValidationBanner bannerReady={true} bannerIssues={[]} />);
    var title = screen.getByText('Lineup Ready — All innings valid · Bench rotation balanced');
    expect(title.style.color).toBe('rgb(6, 95, 70)');
  });

  test('VB4.2: warning title color is rgb(146,64,14) (#92400e — no token)', function () {
    render(<ValidationBanner bannerReady={false} bannerIssues={['a']} />);
    var title = screen.getByText('Fix 1 issue');
    expect(title.style.color).toBe('rgb(146, 64, 14)');
  });

});
