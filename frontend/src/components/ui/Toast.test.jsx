import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import Toast from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when open is false', () => {
    render(<Toast open={false} message="Hi" onDismiss={() => {}} />);
    expect(screen.queryByTestId('toast-root')).toBeNull();
  });

  it('renders message when open is true', () => {
    render(<Toast open message="Half inning ended" onDismiss={() => {}} />);
    expect(screen.getByText('Half inning ended')).toBeInTheDocument();
  });

  it('has role=status and aria-live=polite for non-intrusive announcement', () => {
    render(<Toast open message="Hi" onDismiss={() => {}} />);
    const root = screen.getByTestId('toast-root');
    expect(root).toHaveAttribute('role', 'status');
    expect(root).toHaveAttribute('aria-live', 'polite');
  });

  it('calls onDismiss after durationMs elapses', () => {
    const onDismiss = vi.fn();
    render(<Toast open message="Hi" durationMs={5000} onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does NOT auto-dismiss when durationMs is 0', () => {
    const onDismiss = vi.fn();
    render(<Toast open message="Hi" durationMs={0} onDismiss={onDismiss} />);
    act(() => { vi.advanceTimersByTime(60000); });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('pauses auto-dismiss on mouseEnter and resumes on mouseLeave', () => {
    const onDismiss = vi.fn();
    render(<Toast open message="Hi" durationMs={5000} onDismiss={onDismiss} />);
    const root = screen.getByTestId('toast-root');

    act(() => { vi.advanceTimersByTime(2000); });
    fireEvent.mouseEnter(root);
    act(() => { vi.advanceTimersByTime(10000); });
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.mouseLeave(root);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismiss button calls onDismiss and clears the timer', () => {
    const onDismiss = vi.fn();
    render(<Toast open message="Hi" durationMs={5000} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('toast-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(10000); });
    expect(onDismiss).toHaveBeenCalledTimes(1); // timer was cleared, no second call
  });

  it('action button calls onAction and clears the timer', () => {
    const onAction = vi.fn();
    const onDismiss = vi.fn();
    render(
      <Toast
        open
        message="Half inning ended"
        actionLabel="Undo"
        onAction={onAction}
        onDismiss={onDismiss}
        durationMs={5000}
      />
    );
    fireEvent.click(screen.getByTestId('toast-action'));
    expect(onAction).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(10000); });
    expect(onDismiss).not.toHaveBeenCalled(); // action cleared the timer
  });

  it('does not render action button when actionLabel or onAction is missing', () => {
    render(<Toast open message="Hi" onDismiss={() => {}} />);
    expect(screen.queryByTestId('toast-action')).toBeNull();
  });

  it('always renders the dismiss button', () => {
    render(<Toast open message="Hi" onDismiss={() => {}} />);
    expect(screen.getByTestId('toast-dismiss')).toBeInTheDocument();
  });
});
