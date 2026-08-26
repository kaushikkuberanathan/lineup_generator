import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrandMark } from './BrandMark';

// BrandMark.jsx had zero test coverage anywhere in the repo despite being the
// always-present brand identity — rendered in the app header and on the
// public, unauthenticated SharedView share page (v2.5.28/v2.5.29). Found
// during the #406/#410 test-health survey (Pass 4).

describe('BrandMark', () => {

  test('renders an SVG with role="img" and the default aria-label', () => {
    render(<BrandMark />);
    const svg = screen.getByRole('img', { name: 'Dugout Lineup' });
    expect(svg).toBeInTheDocument();
    expect(svg.tagName.toLowerCase()).toBe('svg');
  });

  test('defaults to a 42x42 size', () => {
    render(<BrandMark />);
    const svg = screen.getByRole('img', { name: 'Dugout Lineup' });
    expect(svg).toHaveAttribute('width', '42');
    expect(svg).toHaveAttribute('height', '42');
  });

  test('custom size prop is applied to both width and height', () => {
    render(<BrandMark size={64} />);
    const svg = screen.getByRole('img', { name: 'Dugout Lineup' });
    expect(svg).toHaveAttribute('width', '64');
    expect(svg).toHaveAttribute('height', '64');
  });

  test('custom title prop overrides the aria-label and <title> text', () => {
    render(<BrandMark title="Mud Hens" />);
    const svg = screen.getByRole('img', { name: 'Mud Hens' });
    expect(svg).toBeInTheDocument();
    expect(svg.querySelector('title').textContent).toBe('Mud Hens');
  });

  test('renders exactly one <title> element for accessible naming', () => {
    render(<BrandMark />);
    const svg = screen.getByRole('img', { name: 'Dugout Lineup' });
    expect(svg.querySelectorAll('title')).toHaveLength(1);
  });

  test('preserves the 0 0 100 100 viewBox regardless of rendered size', () => {
    render(<BrandMark size={16} />);
    const svg = screen.getByRole('img', { name: 'Dugout Lineup' });
    expect(svg).toHaveAttribute('viewBox', '0 0 100 100');
  });
});
