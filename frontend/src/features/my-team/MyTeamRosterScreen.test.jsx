import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { MyTeamRosterScreen } from './MyTeamRosterScreen';

const TEAM = { name: 'Mud Hens', ageGroup: '8U', sport: 'baseball', seasonLabel: 'Fall 2026' };
const PLAYERS = [
  { name: 'Alex Rivera', firstName: 'Alex', prefs: [], outThisGame: true },
  { name: 'Blair Chen', firstName: 'Blair', prefs: ['SS'] },
];

describe('MyTeamRosterScreen #1086', function () {
  test('shows a calm roster overview with one primary action and profile statuses', function () {
    render(<MyTeamRosterScreen team={TEAM} players={PLAYERS} onAddPlayer={vi.fn()} onOpenPlayer={vi.fn()} onViewAll={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'My Team' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add player' })).toBeInTheDocument();
    expect(screen.getByText('2 players')).toBeInTheDocument();
    expect(screen.getByText('1 needs attention')).toBeInTheDocument();
    expect(screen.getByText('Out tonight')).toBeInTheDocument();
    expect(screen.getByText('Profile complete')).toBeInTheDocument();
  });

  test('filters players by name and preserves first-name display', function () {
    render(<MyTeamRosterScreen team={TEAM} players={PLAYERS} onAddPlayer={vi.fn()} onOpenPlayer={vi.fn()} onViewAll={vi.fn()} />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search players' }), { target: { value: 'Blair' } });
    expect(screen.queryByRole('button', { name: /Open Alex player profile/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open Blair player profile/ })).toBeInTheDocument();
  });

  test('makes the roster read-only when editing is unavailable', function () {
    render(<MyTeamRosterScreen team={TEAM} players={PLAYERS} canEdit={false} onOpenPlayer={vi.fn()} onViewAll={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Add player' })).not.toBeInTheDocument();
    expect(screen.getByText('View only')).toBeInTheDocument();
  });

  test('covers loading and empty roster states', function () {
    const { rerender } = render(<MyTeamRosterScreen team={TEAM} players={[]} loading />);
    expect(screen.getByText('Loading roster…')).toBeInTheDocument();

    rerender(<MyTeamRosterScreen team={TEAM} players={[]} onAddPlayer={vi.fn()} />);
    expect(screen.getByText('Your roster is ready for its first player.')).toBeInTheDocument();
  });
});
