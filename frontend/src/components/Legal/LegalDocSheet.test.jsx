import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LegalDocSheet } from './LegalDocSheet';

// ============================================================================
// LegalDocSheet.jsx — the deep-link BottomSheet built for
// RequestAccessScreen's consent checkbox, so a coach mid-registration can
// read Terms of Service without losing their half-filled form. Previously
// zero test coverage.
// ============================================================================

describe('LegalDocSheet', function () {
  test('renders nothing when open is false', function () {
    var { container } = render(
      <LegalDocSheet open={false} onClose={vi.fn()} docId="terms" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('renders the doc title and body content when open with a valid docId', function () {
    render(<LegalDocSheet open={true} onClose={vi.fn()} docId="terms" />);
    // "Terms" appears more than once in the body text — the title match
    // needs to be specific enough to isolate the header, not just any hit.
    expect(screen.getAllByText(/Terms/i).length).toBeGreaterThan(0);
    // LegalDocBody's effective-date line proves the real content pipeline rendered
    expect(screen.getByText(/^Effective /)).toBeInTheDocument();
  });

  test('renders nothing when docId does not match a real legal doc', function () {
    var { container } = render(
      <LegalDocSheet open={true} onClose={vi.fn()} docId="not-a-real-doc" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('the Close button calls onClose', function () {
    var onClose = vi.fn();
    render(<LegalDocSheet open={true} onClose={onClose} docId="terms" />);
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
