import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { GameDayEntryScreen } from './GameDayEntryScreen';

const game = { opponent:'Tigers', date:'2026-09-05', time:'6:00 PM', location:'Riverside', home:false };

describe('GameDayEntryScreen', function () {
  test('shows game context, attendance readiness, and the ready primary action', function () {
    const onStart = vi.fn();
    render(<GameDayEntryScreen nextGame={game} rosterCount={11} availableCount={10} lineupStatus="ready" onStartGameMode={onStart} />);
    expect(screen.getByRole('heading', { name:'Game Day' })).toBeInTheDocument();
    expect(screen.getByText('vs. Tigers')).toBeInTheDocument();
    expect(screen.getByText('10/11 available')).toBeInTheDocument();
    expect(screen.getByText('Lineup ready')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name:/Start Game Mode/i }));
    expect(onStart).toHaveBeenCalledOnce();
  });

  test('keeps the primary action disabled until a playable game and lineup are ready', function () {
    const { rerender } = render(<GameDayEntryScreen nextGame={null} rosterCount={11} availableCount={11} lineupStatus="draft" onStartGameMode={vi.fn()} />);
    expect(screen.getByText('No upcoming game')).toBeInTheDocument();
    expect(screen.getByRole('button', { name:/Add a game to continue/i })).toBeDisabled();
    rerender(<GameDayEntryScreen nextGame={game} rosterCount={8} availableCount={8} lineupStatus="draft" onStartGameMode={vi.fn()} />);
    expect(screen.getByRole('button', { name:/Finish lineup setup/i })).toBeDisabled();
  });

  test('announces locked lineups without changing the launch behavior', function () {
    render(<GameDayEntryScreen nextGame={game} rosterCount={11} availableCount={11} lineupStatus="locked" onStartGameMode={vi.fn()} />);
    expect(screen.getByText('Lineup locked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name:/Open Game Mode/i })).toBeEnabled();
  });
});
