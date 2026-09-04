import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccountTeamsSection } from './AccountTeamsSection';

var TEAMS = [
  { id: 't1', name: 'Mud Hens', ageGroup: '10U', season: 'Fall', year: 2026 },
  { id: 't2', name: 'Bananas', ageGroup: '8U', season: 'Spring', year: 2026 },
];

function renderSection(overrides) {
  var props = Object.assign({
    session: { user: { email: 'coach@example.com' } },
    memberships: [
      { id: 'm1', team_id: 't2', role: 'coach' },
      { id: 'm2', team_id: 't1', role: 'admin' },
    ],
    teams: TEAMS,
    loadTeam: vi.fn(),
  }, overrides || {});
  return { ...render(<AccountTeamsSection {...props} />), props: props };
}

describe('AccountTeamsSection', function() {
  it('shows the signed-in email', function() {
    renderSection();
    expect(screen.getByText('coach@example.com')).toBeTruthy();
  });

  it('renders every membership, newest season first', function() {
    renderSection();
    var names = screen.getAllByText(/Mud Hens|Bananas/).map(function(el) { return el.textContent; });
    expect(names[0]).toBe('Mud Hens');
    expect(names[1]).toBe('Bananas');
  });

  it('calls loadTeam with the matching team on row tap', function() {
    var r = renderSection();
    fireEvent.click(screen.getByText('Mud Hens'));
    expect(r.props.loadTeam).toHaveBeenCalledWith(TEAMS[0]);
  });

  it('renders a disabled "Not loaded" row for a membership with no matching team, without crashing loadTeam', function() {
    var r = renderSection({ memberships: [{ id: 'm3', team_id: 't-missing', role: 'coach' }] });
    expect(screen.getByText('Team t-missing')).toBeTruthy();
    expect(screen.getByText('Not loaded')).toBeTruthy();
    expect(r.props.loadTeam).not.toHaveBeenCalled();
  });

  it('shows an empty state when there are no memberships', function() {
    renderSection({ memberships: [] });
    expect(screen.getByText('Not on any team yet')).toBeTruthy();
  });

  it('falls back to an em dash when there is no session email', function() {
    renderSection({ session: null });
    expect(screen.getByText('—')).toBeTruthy();
  });
});
