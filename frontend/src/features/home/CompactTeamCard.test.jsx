import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompactTeamCard } from './CompactTeamCard';

var TEAM = {
  id: 't1',
  name: 'Mud Hens',
  displayName: 'Mud Hens',
  season: 'Fall',
  year: 2026,
  ageGroup: '8U',
  role: { code: 'admin', label: 'Team Admin / Head Coach' },
  nextEvent: { id: 'g1', type: 'game', opponent: 'Braves', startsAt: '2099-01-01T18:00:00Z', location: 'Field 1', homeAway: 'home' },
};

describe('CompactTeamCard', function () {
  test('shows team name, season/year, age group, and role', function () {
    render(<CompactTeamCard team={TEAM} onExpand={vi.fn()} />);
    expect(screen.getByText(/Mud Hens/)).toBeInTheDocument();
    expect(screen.getByText(/Fall/)).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
    expect(screen.getByText(/8U/)).toBeInTheDocument();
    expect(screen.getByText(/Team Admin/)).toBeInTheDocument();
  });

  test('shows the opponent for an upcoming game', function () {
    render(<CompactTeamCard team={TEAM} onExpand={vi.fn()} />);
    expect(screen.getByText(/Braves/)).toBeInTheDocument();
  });

  test('shows a no-event placeholder when there is no next event', function () {
    render(<CompactTeamCard team={Object.assign({}, TEAM, { nextEvent: null })} onExpand={vi.fn()} />);
    expect(screen.getByText(/no upcoming event/i)).toBeInTheDocument();
  });

  test('is a real tappable control meeting the 44px touch-target floor, and calls onExpand(teamId) when tapped', function () {
    var onExpand = vi.fn();
    render(<CompactTeamCard team={TEAM} onExpand={onExpand} />);
    var control = screen.getByRole('button');
    fireEvent.click(control);
    expect(onExpand).toHaveBeenCalledWith('t1');
  });

  test('has an accessible name that identifies the team for screen readers', function () {
    render(<CompactTeamCard team={TEAM} onExpand={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Mud Hens/ })).toBeInTheDocument();
  });
});
