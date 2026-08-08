import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ============================================================================
// Story B (frontend) — role picker vocabulary fix. Prior ROLE_OPTIONS had
// only 3 entries and two mismapped values (Head Coach -> 'admin' instead of
// 'team_admin', Coordinator -> 'coach' instead of 'coordinator'). Zero prior
// coverage existed for this component.
// ============================================================================

vi.mock('@/utils/analytics', () => ({ track: vi.fn() }));

import { RequestAccessScreen } from './RequestAccessScreen';

function baseProps(overrides) {
  return Object.assign(
    { onBack: vi.fn(), requestAccess: vi.fn().mockResolvedValue({ success: true }) },
    overrides
  );
}

function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText('Jane'), { target: { value: 'Jane' } });
  fireEvent.change(screen.getByPlaceholderText('Smith'), { target: { value: 'Smith' } });
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'jane@example.com' } });
}

describe('RequestAccessScreen — role picker', function () {

  test('renders all 5 role options', function () {
    render(<RequestAccessScreen {...baseProps()} />);
    var select = screen.getByLabelText(/your role/i);
    var labels = Array.from(select.options).map(function (o) { return o.textContent; });
    expect(labels).toEqual(['Head Coach', 'Assistant Coach', 'Team Coordinator', 'Scorekeeper', 'Parent / Family']);
  });

  test('Head Coach shows the manual-review note; other roles do not', function () {
    render(<RequestAccessScreen {...baseProps()} />);
    var select = screen.getByLabelText(/your role/i);

    fireEvent.change(select, { target: { value: 'head_coach' } });
    expect(screen.getByText(/requires manual review before approval/i)).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'assistant_coach' } });
    expect(screen.queryByText(/requires manual review before approval/i)).not.toBeInTheDocument();
  });

  test.each([
    ['head_coach', 'team_admin'],
    ['assistant_coach', 'coach'],
    ['coordinator', 'coordinator'],
    ['scorekeeper', 'scorekeeper'],
    ['parent', 'viewer'],
  ])('selecting %s submits stored value %s, not the display label', async function (roleId, storedValue) {
    var requestAccess = vi.fn().mockResolvedValue({ success: true });
    render(<RequestAccessScreen {...baseProps({ requestAccess })} />);

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/your role/i), { target: { value: roleId } });
    fireEvent.click(screen.getByRole('button', { name: /request access/i }));

    await waitFor(function () {
      expect(requestAccess).toHaveBeenCalledTimes(1);
    });
    expect(requestAccess.mock.calls[0][0].role).toBe(storedValue);
  });
});

// ============================================================================
// Story 124 (#655) — Home tab "add a second team" flow. RequestAccessScreen
// is reused for this flow via three additive props (all default to prior
// behavior — no existing call site passes any of them).
// ============================================================================
describe('RequestAccessScreen — additive props for the Home tab discovery flow', function () {

  var TEAM = { id: '999', name: 'Bananas', age_group: '9U', sport: 'baseball', year: 2026 };

  test('default (no preselectedTeam): still shows the editable Team ID input', function () {
    render(<RequestAccessScreen {...baseProps()} />);
    expect(screen.getByText(/team id/i)).toBeInTheDocument();
    expect(screen.queryByText('Bananas')).not.toBeInTheDocument();
  });

  test('preselectedTeam: shows a read-only team confirmation, not the editable Team ID input', function () {
    render(<RequestAccessScreen {...baseProps({ preselectedTeam: TEAM })} />);
    expect(screen.getByText('Bananas')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('1774297491626')).not.toBeInTheDocument();
  });

  test('preselectedTeam: submitting sends the preselected team id as tid, without requiring manual entry', async function () {
    var requestAccess = vi.fn().mockResolvedValue({ success: true });
    render(<RequestAccessScreen {...baseProps({ requestAccess, preselectedTeam: TEAM })} />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /request access/i }));

    await waitFor(function () {
      expect(requestAccess).toHaveBeenCalledTimes(1);
    });
    expect(requestAccess.mock.calls[0][0].tid).toBe('999');
  });

  test('preserveSession defaults to false when omitted', async function () {
    var requestAccess = vi.fn().mockResolvedValue({ success: true });
    render(<RequestAccessScreen {...baseProps({ requestAccess })} />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /request access/i }));

    await waitFor(function () {
      expect(requestAccess).toHaveBeenCalledTimes(1);
    });
    expect(requestAccess.mock.calls[0][1]).toEqual({ preserveSession: false });
  });

  test('preserveSession:true is forwarded to requestAccess as the second argument', async function () {
    var requestAccess = vi.fn().mockResolvedValue({ success: true });
    render(<RequestAccessScreen {...baseProps({ requestAccess, preserveSession: true })} />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /request access/i }));

    await waitFor(function () {
      expect(requestAccess).toHaveBeenCalledTimes(1);
    });
    expect(requestAccess.mock.calls[0][1]).toEqual({ preserveSession: true });
  });

  test('backLabel defaults to "← Back to login"; a custom value overrides it', function () {
    var { unmount } = render(<RequestAccessScreen {...baseProps()} />);
    expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
    unmount();

    render(<RequestAccessScreen {...baseProps({ backLabel: '← Back to search' })} />);
    expect(screen.getByRole('button', { name: /back to search/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /back to login/i })).not.toBeInTheDocument();
  });
});
