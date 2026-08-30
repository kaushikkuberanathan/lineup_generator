import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LegalDocBody } from './LegalDocBody';
import { getLegalDoc } from '../../content/legal';

// ============================================================================
// LegalDocBody.jsx — the single rendering path for legal-doc content, shared
// by Support/LegalSection.jsx and Legal/LegalDocSheet.jsx. Previously with
// zero test coverage despite being the one place that could silently drift
// or break for every legal-doc consumer at once.
// ============================================================================

describe('LegalDocBody', function () {
  test('renders null when no doc is given', function () {
    var { container } = render(<LegalDocBody doc={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('renders the effective date and version for a real doc', function () {
    var doc = getLegalDoc('terms');
    render(<LegalDocBody doc={doc} />);
    expect(screen.getByText(new RegExp('Effective ' + doc.effectiveDate))).toBeInTheDocument();
    expect(screen.getByText(new RegExp('v' + doc.version))).toBeInTheDocument();
  });

  test('renders the "In Plain English" tldr card when doc.tldr is a non-empty array', function () {
    var doc = getLegalDoc('terms');
    expect(Array.isArray(doc.tldr) && doc.tldr.length > 0).toBe(true);
    render(<LegalDocBody doc={doc} />);
    expect(screen.getByText('In Plain English')).toBeInTheDocument();
    doc.tldr.forEach(function (line) {
      expect(screen.getByText(line)).toBeInTheDocument();
    });
  });

  test('does not render the tldr card when doc.tldr is absent', function () {
    var doc = getLegalDoc('safety');
    expect(doc.tldr).toBeFalsy();
    render(<LegalDocBody doc={doc} />);
    expect(screen.queryByText('In Plain English')).not.toBeInTheDocument();
  });

  test('renders every section by type — h3 headings, p paragraphs, ul list items', function () {
    var doc = {
      id: 'fixture',
      effectiveDate: 'January 2026',
      version: '1.0',
      sections: [
        { type: 'h3', text: 'A Heading' },
        { type: 'p', text: 'A paragraph of body text.' },
        { type: 'ul', items: ['First item', 'Second item'] },
      ],
    };
    render(<LegalDocBody doc={doc} />);
    expect(screen.getByText('A Heading')).toBeInTheDocument();
    expect(screen.getByText('A paragraph of body text.')).toBeInTheDocument();
    expect(screen.getByText('First item')).toBeInTheDocument();
    expect(screen.getByText('Second item')).toBeInTheDocument();
  });

  test('an unrecognized section type renders nothing for that entry, without crashing', function () {
    var doc = {
      id: 'fixture',
      effectiveDate: 'January 2026',
      version: '1.0',
      sections: [
        { type: 'h3', text: 'Kept Heading' },
        { type: 'unknown-type', text: 'Should not render' },
      ],
    };
    render(<LegalDocBody doc={doc} />);
    expect(screen.getByText('Kept Heading')).toBeInTheDocument();
    expect(screen.queryByText('Should not render')).not.toBeInTheDocument();
  });
});
