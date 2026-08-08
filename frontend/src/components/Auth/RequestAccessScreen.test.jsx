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
