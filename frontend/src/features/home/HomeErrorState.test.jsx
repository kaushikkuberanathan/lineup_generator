import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeErrorState } from './HomeErrorState.jsx';

describe('HomeErrorState', function () {
  test('renders as an alert so assistive tech announces it immediately', function () {
    render(<HomeErrorState onRetry={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  test('clicking Try again calls onRetry', function () {
    var onRetry = vi.fn();
    render(<HomeErrorState onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('renders without a retry button when onRetry is not provided', function () {
    render(<HomeErrorState />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
