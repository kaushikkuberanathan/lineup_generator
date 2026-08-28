import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PendingApprovalScreen } from './PendingApprovalScreen';

// ============================================================================
// Issue #696 — PendingApprovalScreen had zero tests. Found during Phase 5
// (UX Auth Re-Skin, Story 131/#690) token-migration work while auditing all
// 4 auth screens — the other 3 (LoginScreen, RequestAccessScreen,
// NoMembershipScreen) each already had a colocated test file.
//
// Shown after a user submits an access request (App.jsx routes here when
// authState === 'pending_approval'). Covers: the confirmation heading + the
// 4-step status list always render, the pending email is read from
// localStorage('lg_pending_email') and shown/omitted correctly, and "Try
// logging in" wires to onTryLogin. Mirrors NoMembershipScreen.test.jsx's
// shape (D-S428b/#481), the direct precedent for this exact gap.
// ============================================================================

beforeEach(function () {
  localStorage.clear();
});

describe('PendingApprovalScreen — component (#696)', function () {

  test('renders the confirmation heading and the 4-step status list', function () {
    render(<PendingApprovalScreen onTryLogin={vi.fn()} />);
    // "Request submitted" appears twice by design — the h1 heading and step
    // 1's own label — so both must be selector-scoped, not a bare getByText.
    expect(screen.getByText('Request submitted', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.getByText('Request submitted', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Admin reviews and approves')).toBeInTheDocument();
    expect(screen.getByText('You receive an approval email')).toBeInTheDocument();
    expect(screen.getByText('Tap the link and log in')).toBeInTheDocument();
  });

  test('shows the pending email from localStorage when present', function () {
    localStorage.setItem('lg_pending_email', 'coach@example.com');
    render(<PendingApprovalScreen onTryLogin={vi.fn()} />);
    expect(screen.getByText('coach@example.com')).toBeInTheDocument();
    expect(screen.getByText(/receive an email at/i)).toBeInTheDocument();
  });

  test('omits the "receive an email at" clause entirely when no pending email is stored', function () {
    render(<PendingApprovalScreen onTryLogin={vi.fn()} />);
    expect(screen.queryByText(/receive an email at/i)).not.toBeInTheDocument();
  });

  test('calls onTryLogin when "Try logging in" is clicked', function () {
    var onTryLogin = vi.fn();
    render(<PendingApprovalScreen onTryLogin={onTryLogin} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try logging in' }));
    expect(onTryLogin).toHaveBeenCalledTimes(1);
  });

  test('renders exactly one button — no other actionable affordance', function () {
    render(<PendingApprovalScreen onTryLogin={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
