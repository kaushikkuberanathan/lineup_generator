import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamHub } from './TeamHub';

function makeTeam(overrides) {
  return Object.assign({
    id: 't1',
    name: 'Mud Hens',
    displayName: 'Mud Hens',
    season: 'Fall',
    year: 2026,
    ageGroup: '8U',
    role: { code: 'admin', label: 'Team Admin / Head Coach' },
    nextEvent: null,
    readiness: { rosterCount: 0, confirmedCount: 0, lineupStatus: 'none', lineupId: null },
    actions: [],
  }, overrides);
}

var TEAM_A = makeTeam({ id: 't1', name: 'Mud Hens', displayName: 'Mud Hens' });
var TEAM_B = makeTeam({ id: 't2', name: 'Knights', displayName: 'Knights' });
var TEAM_C = makeTeam({ id: 't3', name: 'Eagles', displayName: 'Eagles' });

describe('TeamHub — single-expanded-team model', function () {
  test('renders nothing for an empty team list', function () {
    var { container } = render(<TeamHub teams={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test('exactly one team is expanded (rendered as a region) at a time', function () {
    render(<TeamHub teams={[TEAM_A, TEAM_B, TEAM_C]} expandedTeamId="t2" onExpand={vi.fn()} />);
    expect(screen.getAllByRole('region').length).toBe(1);
    expect(screen.getByRole('region', { name: /Knights/ })).toBeInTheDocument();
  });

  test('the other teams render as compact tappable cards, not regions', function () {
    render(<TeamHub teams={[TEAM_A, TEAM_B, TEAM_C]} expandedTeamId="t2" onExpand={vi.fn()} />);
    expect(screen.queryByRole('region', { name: /Mud Hens/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Mud Hens/ })).toBeInTheDocument();
  });

  test('an invalid/stale expandedTeamId falls back deterministically to the first team', function () {
    render(<TeamHub teams={[TEAM_A, TEAM_B, TEAM_C]} expandedTeamId="team-that-no-longer-exists" onExpand={vi.fn()} />);
    expect(screen.getByRole('region', { name: /Mud Hens/ })).toBeInTheDocument();
  });

  test('tapping a compact card calls onExpand with that team\'s id', function () {
    var onExpand = vi.fn();
    render(<TeamHub teams={[TEAM_A, TEAM_B, TEAM_C]} expandedTeamId="t1" onExpand={onExpand} />);
    fireEvent.click(screen.getByRole('button', { name: /Knights/ }));
    expect(onExpand).toHaveBeenCalledWith('t2');
  });

  test('with only one team, no view-filter toggle is shown (nothing to filter)', function () {
    render(<TeamHub teams={[TEAM_A]} expandedTeamId="t1" onExpand={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /all teams/i })).toBeNull();
  });
});

describe('TeamHub — "All teams" view filter', function () {
  test('selecting "All teams" shows every team compact and no expanded region', function () {
    var onViewFilterChange = vi.fn();
    render(
      <TeamHub teams={[TEAM_A, TEAM_B]} expandedTeamId="t1" viewFilter="all" onExpand={vi.fn()} onViewFilterChange={onViewFilterChange} />
    );
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.getByRole('button', { name: /Mud Hens/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Knights/ })).toBeInTheDocument();
  });

  test('clicking the "All teams" pill calls onViewFilterChange("all"), not onExpand', function () {
    var onViewFilterChange = vi.fn();
    var onExpand = vi.fn();
    render(
      <TeamHub teams={[TEAM_A, TEAM_B]} expandedTeamId="t1" viewFilter="single" onExpand={onExpand} onViewFilterChange={onViewFilterChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: /all teams/i }));
    expect(onViewFilterChange).toHaveBeenCalledWith('all');
    expect(onExpand).not.toHaveBeenCalled();
  });

  test('"All teams" does not change which team is expanded — switching back to "single" restores the same expanded team', function () {
    var { rerender } = render(
      <TeamHub teams={[TEAM_A, TEAM_B]} expandedTeamId="t2" viewFilter="all" onExpand={vi.fn()} onViewFilterChange={vi.fn()} />
    );
    expect(screen.queryByRole('region')).toBeNull();
    rerender(<TeamHub teams={[TEAM_A, TEAM_B]} expandedTeamId="t2" viewFilter="single" onExpand={vi.fn()} onViewFilterChange={vi.fn()} />);
    expect(screen.getByRole('region', { name: /Knights/ })).toBeInTheDocument();
  });
});
