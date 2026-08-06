import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerFilterToggle } from './PlayerFilterToggle';

// ============================================================================
// Story 104 slice 4.1 (#592) — PlayerFilterToggle extraction from App.jsx
//
// Characterization tests: lock the pre-extraction behavior so the move to
// components/Shared/PlayerFilterToggle.jsx is provably verbatim, not a
// rewrite. Verified against App.jsx's own pre-extraction source (git history)
// before writing these — every assertion below matches the original inline
// implementation exactly, including the deliberately unstyled "#555"/"#f5a623"
// literals (not tokens — this component predates the token system and was
// out of scope for the var C sweep since it never referenced `C`).
// ============================================================================

describe('PlayerFilterToggle — extraction characterization (Story 104 slice 4.1)', function () {
  const players = ['Aiden Smith', 'Benji Jones'];

  test('renders an "All Players" pill plus one pill per player, using first names only', function () {
    render(<PlayerFilterToggle players={players} selected={null} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: 'All Players' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aiden' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Benji' })).toBeInTheDocument();
  });

  test('"All Players" is the selected pill when selected is null', function () {
    render(<PlayerFilterToggle players={players} selected={null} onSelect={() => {}} />);
    const allBtn = screen.getByRole('button', { name: 'All Players' });
    expect(allBtn.style.background).toBe('rgb(245, 166, 35)');
    expect(allBtn.style.color).toBe('rgb(15, 31, 61)');
    expect(allBtn.style.fontWeight).toBe('bold');
  });

  test('the matching player pill is selected when selected is set, "All Players" is not', function () {
    render(<PlayerFilterToggle players={players} selected="Aiden Smith" onSelect={() => {}} />);
    const aidenBtn = screen.getByRole('button', { name: 'Aiden' });
    const allBtn = screen.getByRole('button', { name: 'All Players' });
    expect(aidenBtn.style.background).toBe('rgb(245, 166, 35)');
    expect(allBtn.style.background).toBe('rgb(255, 255, 255)');
    expect(allBtn.style.color).toBe('rgb(85, 85, 85)');
  });

  test('clicking "All Players" calls onSelect(null)', function () {
    const onSelect = vi.fn();
    render(<PlayerFilterToggle players={players} selected="Aiden Smith" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'All Players' }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  test('clicking a player pill calls onSelect with the full player name', function () {
    const onSelect = vi.fn();
    render(<PlayerFilterToggle players={players} selected={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Benji' }));
    expect(onSelect).toHaveBeenCalledWith('Benji Jones');
  });

  test('renders only the "All Players" pill when the roster is empty', function () {
    render(<PlayerFilterToggle players={[]} selected={null} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: 'All Players' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
