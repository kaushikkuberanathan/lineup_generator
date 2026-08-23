/**
 * ErrorBoundary.test.jsx
 *
 * Coverage-analysis follow-up (session 2026-08-23): ErrorBoundary had zero
 * test coverage despite being the app's only defense against a white-screen
 * crash. A broken catch/reset path here is worse than not having a boundary
 * at all — it would fail exactly when it's needed.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Bomb({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('boom');
  }
  return <div>Safe content</div>;
}

describe('ErrorBoundary', function () {

  it('renders children normally when there is no error', function () {
    render(
      <ErrorBoundary fallback="Test Section">
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('catches a render error in a child and shows the fallback with the section name', function () {
    var spy = vi.spyOn(console, 'error').mockImplementation(function () {});

    render(
      <ErrorBoundary fallback="Game Day">
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Game Day is unavailable')).toBeInTheDocument();
    expect(screen.getByText('Tap to reload this section')).toBeInTheDocument();
    expect(screen.queryByText('Safe content')).not.toBeInTheDocument();

    spy.mockRestore();
  });

  it('falls back to a generic "This section" label when no fallback name is given', function () {
    var spy = vi.spyOn(console, 'error').mockImplementation(function () {});
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('This section is unavailable')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('calls the onError callback with the error and errorInfo', function () {
    var spy = vi.spyOn(console, 'error').mockImplementation(function () {});
    var onError = vi.fn();

    render(
      <ErrorBoundary fallback="Game Day" onError={onError}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    var args = onError.mock.calls[0];
    expect(args[0]).toBeInstanceOf(Error);
    expect(args[0].message).toBe('boom');
    expect(args[1]).toBeTruthy(); // React errorInfo object

    spy.mockRestore();
  });

  it('tapping the fallback resets state and re-renders children if the underlying error is gone', function () {
    var spy = vi.spyOn(console, 'error').mockImplementation(function () {});
    var shouldThrow = true;

    function Wrapper() {
      return (
        <ErrorBoundary fallback="Game Day">
          <Bomb shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    }

    var view = render(<Wrapper />);
    expect(screen.getByText('Game Day is unavailable')).toBeInTheDocument();

    // Fix the underlying condition and let it flow into props.children BEFORE
    // tapping reset — the boundary only re-renders children once it flips
    // hasError back to false, so children must already be safe by then, or
    // the retry throws immediately and resetAttempted locks the card.
    shouldThrow = false;
    view.rerender(<Wrapper />);

    // The click handler lives on the outer card div; a real DOM click on any
    // descendant bubbles up to it, so clicking the visible text is sufficient.
    fireEvent.click(screen.getByText('Tap to reload this section'));

    expect(screen.getByText('Safe content')).toBeInTheDocument();

    spy.mockRestore();
  });

  it('shows the "still having trouble" message and disables further taps once a reset has already been attempted', function () {
    var spy = vi.spyOn(console, 'error').mockImplementation(function () {});

    function AlwaysThrows() {
      return (
        <ErrorBoundary fallback="Game Day">
          <Bomb shouldThrow={true} />
        </ErrorBoundary>
      );
    }

    var view = render(<AlwaysThrows />);

    fireEvent.click(screen.getByText('Tap to reload this section'));
    view.rerender(<AlwaysThrows />);

    expect(screen.getByText('Still having trouble — try refreshing the page')).toBeInTheDocument();
    expect(screen.queryByText('Tap to reload this section')).not.toBeInTheDocument();

    spy.mockRestore();
  });
});
