import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoMembershipScreen } from './NoMembershipScreen';

// ============================================================================
// D-S428b (#481) — NoMembershipScreen has zero tests.
//
// v2.7.0 shipped Google sign-in "gate-first: memberless sessions route to
// NoMembershipScreen." A Google-authenticated user with no team_memberships
// row must never fall through to team data. This file covers the component
// itself: given the props App.jsx passes when authState === 'no_membership'
// (email, onRequestAccess, onSignOut), it must render the gate copy, the
// email it was given, and wire both actions correctly — and it must not
// render any team-data affordance (roster, schedule, batting order, etc.).
//
// The routing DECISION — that App.jsx actually reaches this component when
// memberships is empty, and routes past it otherwise — is covered separately
// in frontend/src/__tests__/AppNoMembershipRouting.test.jsx, since that
// invariant lives in App.jsx's render logic, not in this component.
// ============================================================================

const baseProps = {
  email: 'coach@example.com',
  onRequestAccess: vi.fn(),
  onSignOut: vi.fn(),
};

describe('NoMembershipScreen — component (#481)', function () {

  test('renders the gate-first heading and the signed-in email', function () {
    render(<NoMembershipScreen {...baseProps} />);
    expect(screen.getByText(/signed in, but not on a team/i)).toBeInTheDocument();
    expect(screen.getByText('coach@example.com')).toBeInTheDocument();
  });

  test('omits the email clause entirely when email is not provided', function () {
    render(<NoMembershipScreen email={undefined} onRequestAccess={vi.fn()} onSignOut={vi.fn()} />);
    expect(screen.getByText(/signed in, but not on a team/i)).toBeInTheDocument();
    // Body copy renders "You're signed in, but this account isn't..." with no
    // "as <email>" clause when email is falsy.
    expect(screen.queryByText(/ as /)).not.toBeInTheDocument();
  });

  test('calls onRequestAccess when "Request access" is clicked', function () {
    var onRequestAccess = vi.fn();
    render(<NoMembershipScreen {...baseProps} onRequestAccess={onRequestAccess} />);
    fireEvent.click(screen.getByRole('button', { name: 'Request access' }));
    expect(onRequestAccess).toHaveBeenCalledTimes(1);
  });

  test('calls onSignOut when "Use a different account" is clicked', function () {
    var onSignOut = vi.fn();
    render(<NoMembershipScreen {...baseProps} onSignOut={onSignOut} />);
    fireEvent.click(screen.getByRole('button', { name: 'Use a different account' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  test('renders no team-data surface — no roster, schedule, or batting-order affordance', function () {
    render(<NoMembershipScreen {...baseProps} />);
    // Only two actionable buttons exist on this screen. Nothing that
    // resembles the tab bar, a roster list, or game-day content is present.
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.queryByText(/roster/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/batting order/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/game day/i)).not.toBeInTheDocument();
  });
});

describe('NoMembershipScreen — Wave F contemporary treatment', function () {
  test('uses the reusable auth workspace and gold primary action when enabled', function () {
    render(<NoMembershipScreen {...baseProps} contemporary />);
    expect(document.querySelector('[data-auth-workspace="true"]')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Request access' })).toHaveStyle({ minHeight: '44px' });
  });
});
