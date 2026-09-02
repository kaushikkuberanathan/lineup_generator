import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpandedTeamCard } from './ExpandedTeamCard';

var TEAM = {
  id: 't1',
  name: 'Mud Hens',
  displayName: 'Mud Hens',
  season: 'Fall',
  year: 2026,
  ageGroup: '8U',
  role: { code: 'admin', label: 'Team Admin / Head Coach' },
  nextEvent: { id: 'g1', type: 'game', opponent: 'Braves', startsAt: '2099-01-01T18:00:00Z', location: 'Field 1', homeAway: 'home' },
  readiness: { rosterCount: 11, confirmedCount: 9, lineupStatus: 'ready', lineupId: null },
  actions: [
    { id: 'start_game_mode', label: 'Start Mud Hens Game Mode', href: '/app/teams/t1/games/g1/mode', enabled: true, disabledReason: null },
    { id: 'manage_roster', label: 'Manage Mud Hens roster', href: '/app/teams/t1/roster', enabled: false, disabledReason: 'Fewer than 9 confirmed players.' },
  ],
};

describe('ExpandedTeamCard', function () {
  test('renders as a labeled region so screen readers announce which team this is', function () {
    render(<ExpandedTeamCard team={TEAM} onSelectAction={vi.fn()} />);
    expect(screen.getByRole('region', { name: /Mud Hens/ })).toBeInTheDocument();
  });

  test('shows team, season/year, age group, role, and next event', function () {
    render(<ExpandedTeamCard team={TEAM} onSelectAction={vi.fn()} />);
    expect(screen.getAllByText(/Mud Hens/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Fall/)).toBeInTheDocument();
    expect(screen.getByText(/8U/)).toBeInTheDocument();
    expect(screen.getByText(/Team Admin/)).toBeInTheDocument();
    expect(screen.getByText(/Braves/)).toBeInTheDocument();
  });

  test('shows a roster readiness summary', function () {
    render(<ExpandedTeamCard team={TEAM} onSelectAction={vi.fn()} />);
    expect(screen.getByText(/9\/11/)).toBeInTheDocument();
  });

  test('every action from the team is rendered inside this card, contained within the region', function () {
    render(<ExpandedTeamCard team={TEAM} onSelectAction={vi.fn()} />);
    var region = screen.getByRole('region', { name: /Mud Hens/ });
    expect(region).toHaveTextContent('Start Mud Hens Game Mode');
    expect(region).toHaveTextContent('Manage Mud Hens roster');
  });

  test('clicking an enabled action calls onSelectAction with that action', function () {
    var onSelectAction = vi.fn();
    render(<ExpandedTeamCard team={TEAM} onSelectAction={onSelectAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start Mud Hens Game Mode' }));
    expect(onSelectAction).toHaveBeenCalledWith(TEAM.actions[0]);
  });

  test('renders with no actions gracefully when the team has none', function () {
    render(<ExpandedTeamCard team={Object.assign({}, TEAM, { actions: [] })} onSelectAction={vi.fn()} />);
    expect(screen.getByRole('region', { name: /Mud Hens/ })).toBeInTheDocument();
  });
});

describe('ExpandedTeamCard — role explanation (#1029)', function () {
  test('admin gets no restriction caption — full access needs no explanation', function () {
    render(<ExpandedTeamCard team={Object.assign({}, TEAM, { role: { code: 'admin', label: 'Team Admin / Head Coach' } })} onSelectAction={vi.fn()} />);
    expect(screen.queryByText(/changes are made by/i)).toBeNull();
  });

  test('a viewer/parent sees a human-readable explanation of what they can and can\'t do', function () {
    render(<ExpandedTeamCard team={Object.assign({}, TEAM, { role: { code: 'viewer', label: 'Team Member / Parent' } })} onSelectAction={vi.fn()} />);
    expect(screen.getByText(/changes are made by this team's coaches/i)).toBeInTheDocument();
  });

  test('a scorekeeper sees a human-readable explanation scoped to scoring', function () {
    render(<ExpandedTeamCard team={Object.assign({}, TEAM, { role: { code: 'scorekeeper', label: 'Scorekeeper' } })} onSelectAction={vi.fn()} />);
    expect(screen.getByText(/start game mode and score games/i)).toBeInTheDocument();
  });
});
