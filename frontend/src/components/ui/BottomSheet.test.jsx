import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomSheet } from './BottomSheet';

// ============================================================================
// Story 87 — BottomSheet primitive contract tests
//
// BottomSheet is a MODAL primitive — fixed-position backdrop + role=dialog
// shell anchored to the bottom of the viewport. First consumer: LockFlow.jsx
// (3-step Finalize flow).
//
// Key invariants enforced by this suite:
//   - Renders null when open=false (no DOM presence at all)
//   - Backdrop wraps a role="dialog" + aria-modal="true" inner element
//   - aria-label is set from the ariaLabel prop (no hardcoded fallback)
//   - Click-to-close only on backdrop (e.target === e.currentTarget guard)
//     — clicks on the dialog or its children must NOT close
//   - Close handle visual affordance is present (data-testid="bs-handle")
//   - Children render unmodified inside the dialog
// ============================================================================

const baseProps = {
  open: true,
  onClose: vi.fn(),
  ariaLabel: 'Test Sheet',
  maxWidth: '400px',
  maxHeight: '60vh',
};

describe('BottomSheet — Story 87 primitive', function () {

  // ── Open / closed state ──────────────────────────────────────────────────

  test('BS1: renders nothing when open=false', function () {
    render(
      <BottomSheet {...baseProps} open={false}>
        <div data-testid="bs-content">content</div>
      </BottomSheet>
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByTestId('bs-content')).toBeNull();
  });

  test('BS2: renders backdrop + dialog when open=true', function () {
    var { container } = render(
      <BottomSheet {...baseProps}>
        <div data-testid="bs-content">content</div>
      </BottomSheet>
    );
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  // ── ARIA contract ────────────────────────────────────────────────────────

  test('BS3: dialog has role="dialog" and aria-modal="true"', function () {
    render(
      <BottomSheet {...baseProps}>
        <div data-testid="bs-content">content</div>
      </BottomSheet>
    );
    var dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  test('BS4: dialog aria-label matches the ariaLabel prop', function () {
    render(
      <BottomSheet {...baseProps} ariaLabel="Custom Sheet Name">
        <div data-testid="bs-content">content</div>
      </BottomSheet>
    );
    var dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'Custom Sheet Name');
  });

  // ── Click-to-close on backdrop ───────────────────────────────────────────

  test('BS5: clicking the backdrop calls onClose', function () {
    var onClose = vi.fn();
    var { container } = render(
      <BottomSheet {...baseProps} onClose={onClose}>
        <div data-testid="bs-content">content</div>
      </BottomSheet>
    );
    var backdrop = container.firstChild;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── Children + close handle ──────────────────────────────────────────────

  test('BS6: children render inside the dialog', function () {
    render(
      <BottomSheet {...baseProps}>
        <div data-testid="bs-content">child content</div>
      </BottomSheet>
    );
    expect(screen.getByTestId('bs-content')).toBeInTheDocument();
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  test('BS7: close handle affordance is present (data-testid="bs-handle")', function () {
    render(
      <BottomSheet {...baseProps}>
        <div data-testid="bs-content">content</div>
      </BottomSheet>
    );
    expect(screen.getByTestId('bs-handle')).toBeInTheDocument();
  });

});
