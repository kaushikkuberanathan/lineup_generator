import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeSkeleton } from './HomeSkeleton.jsx';

describe('HomeSkeleton', function () {
  test('announces loading exactly once via role="status"', function () {
    render(<HomeSkeleton />);
    var statuses = screen.getAllByRole('status');
    expect(statuses.length).toBe(1);
    expect(statuses[0]).toHaveTextContent(/loading your teams/i);
  });

  test('placeholder shapes are hidden from assistive tech (aria-hidden) so nothing reads "blank" repeatedly', function () {
    var { container } = render(<HomeSkeleton />);
    var hidden = container.querySelectorAll('[aria-hidden="true"]');
    expect(hidden.length).toBeGreaterThan(0);
  });
});
