import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { PlayerProfileScreen } from './PlayerProfileScreen';

describe('PlayerProfileScreen #1087', function () {
  test('frames one player editor with reusable navigation and status', function () {
    const onBack = vi.fn();
    render(<PlayerProfileScreen playerName="Alex Rivera" incomplete onBack={onBack}><div>Editor fields</div></PlayerProfileScreen>);

    expect(screen.getByRole('heading', { name:'Alex' })).toBeInTheDocument();
    expect(screen.getByText('Needs preferences')).toBeInTheDocument();
    expect(screen.getByText('Editor fields')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name:'Back to roster' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('frames the all-player editor without inventing a second action system', function () {
    render(<PlayerProfileScreen allPlayers playerCount={2} onBack={vi.fn()}><div>All editors</div></PlayerProfileScreen>);

    expect(screen.getByRole('heading', { name:'All player profiles' })).toBeInTheDocument();
    expect(screen.getByText('2 players')).toBeInTheDocument();
    expect(screen.getByText('All editors')).toBeInTheDocument();
  });

  test('can preserve the legacy surface when its flag is off', function () {
    render(<PlayerProfileScreen enabled={false}><div>Legacy profile</div></PlayerProfileScreen>);
    expect(screen.getByText('Legacy profile')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
