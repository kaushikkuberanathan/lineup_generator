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

describe('TeamHub — mixed-role, multi-team, permission-aware behavior (#1029)', function () {
  test('switching the expanded team never leaks the previous team\'s actions into the document', function () {
    var teamA = makeTeam({ id: 't1', displayName: 'Mud Hens', actions: [{ id: 'manage_roster', label: 'Manage Mud Hens roster', href: '/app/teams/t1/roster', enabled: true, disabledReason: null }] });
    var teamB = makeTeam({ id: 't2', displayName: 'Knights', actions: [{ id: 'view_roster', label: 'View Knights roster', href: '/app/teams/t2/roster', enabled: true, disabledReason: null }] });

    var { rerender } = render(<TeamHub teams={[teamA, teamB]} expandedTeamId="t1" onExpand={vi.fn()} />);
    expect(screen.getByText('Manage Mud Hens roster')).toBeInTheDocument();
    expect(screen.queryByText('View Knights roster')).toBeNull();

    rerender(<TeamHub teams={[teamA, teamB]} expandedTeamId="t2" onExpand={vi.fn()} />);
    expect(screen.queryByText('Manage Mud Hens roster')).toBeNull();
    expect(screen.getByText('View Knights roster')).toBeInTheDocument();
  });

  test('coach, parent, and scorekeeper roles are all visible and human-readable across teams in one Hub', function () {
    var coachTeam = makeTeam({ id: 't1', displayName: 'Mud Hens', role: { code: 'coach', label: 'Coach / Coordinator' } });
    var viewerTeam = makeTeam({ id: 't2', displayName: 'Knights', role: { code: 'viewer', label: 'Team Member / Parent' } });
    var scorerTeam = makeTeam({ id: 't3', displayName: 'Eagles', role: { code: 'scorekeeper', label: 'Scorekeeper' } });

    render(<TeamHub teams={[coachTeam, viewerTeam, scorerTeam]} expandedTeamId="t1" onExpand={vi.fn()} />);
    expect(screen.getByText(/Coach \/ Coordinator/)).toBeInTheDocument(); // expanded team's role
    expect(screen.getByText(/Team Member \/ Parent/)).toBeInTheDocument(); // compact card role
    expect(screen.getByText(/Scorekeeper/)).toBeInTheDocument(); // compact card role
  });

  test('duplicate team names are disambiguated end-to-end — the Hub renders whatever displayName the API already computed', function () {
    var teamFall = makeTeam({ id: 't1', name: 'Mud Hens', displayName: 'Mud Hens (Fall 2026)' });
    var teamSpring = makeTeam({ id: 't2', name: 'Mud Hens', displayName: 'Mud Hens (Spring 2026)' });
    render(<TeamHub teams={[teamFall, teamSpring]} expandedTeamId="t1" onExpand={vi.fn()} />);
    expect(screen.getByRole('region', { name: /Mud Hens \(Fall 2026\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mud Hens \(Spring 2026\)/ })).toBeInTheDocument();
  });

  test('React renders exactly the actions the API provided, even an unusual set — it never recreates or filters role policy client-side', function () {
    // A viewer role would never realistically get a "manage_roster" action
    // from the real backend (homeCapabilities.js), but this component must
    // not be the place that would catch or block it either way — proving
    // there is no hardcoded "if role==='viewer', hide manage actions"
    // branch hiding here, only in the API.
    var unusualTeam = makeTeam({
      id: 't1',
      displayName: 'Mud Hens',
      role: { code: 'viewer', label: 'Team Member / Parent' },
      actions: [{ id: 'manage_roster', label: 'Manage Mud Hens roster', href: '/app/teams/t1/roster', enabled: true, disabledReason: null }],
    });
    render(<TeamHub teams={[unusualTeam]} expandedTeamId="t1" onExpand={vi.fn()} />);
    expect(screen.getByText('Manage Mud Hens roster')).toBeInTheDocument();
  });

  test('every action label names its own team — no CTA is ambiguous about which team it affects', function () {
    var teamA = makeTeam({ id: 't1', displayName: 'Mud Hens', actions: [
      { id: 'manage_roster', label: 'Manage Mud Hens roster', href: '/app/teams/t1/roster', enabled: true, disabledReason: null },
      { id: 'manage_schedule', label: 'Manage Mud Hens schedule', href: '/app/teams/t1/schedule', enabled: true, disabledReason: null },
    ] });
    render(<TeamHub teams={[teamA]} expandedTeamId="t1" onExpand={vi.fn()} />);
    teamA.actions.forEach(function (action) {
      expect(screen.getByText(action.label)).toBeInTheDocument();
      expect(action.label.includes('Mud Hens')).toBe(true);
    });
  });
});
