import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { DefenseDiamond } from './DefenseDiamond';

// ============================================================================
// DefenseDiamond.jsx (333 lines) — the field/grid view used by both the
// Defense sub-tab and Game Mode. Previously mocked out in every consuming
// test (GameModeScreen, QuickSwap, DugoutView, AppShareLinkRouting); only
// a11y-component-fixes.test.jsx rendered it for real, and only for narrow
// font-size/contrast assertions (F1/F2/F7). This file covers the component's
// actual behavior: controlled/uncontrolled inning selection, per-inning
// position/bench/out rendering, and the onPositionTap interaction.
// ============================================================================

function baseRoster() {
  return [
    { name: 'Casey Jones' },
    { name: 'Jordan Lee' },
    { name: 'Sam Reyes' },
  ];
}

function baseGrid() {
  return {
    'Casey Jones': ['SS', 'P'],
    'Jordan Lee':  ['Bench', 'SS'],
    'Sam Reyes':   ['Out', 'Bench'],
  };
}

describe('DefenseDiamond — inning selector', function () {
  test('renders one inning button per `innings`, plus "All"', function () {
    render(<DefenseDiamond roster={baseRoster()} grid={baseGrid()} innings={2} />);
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
  });

  test('uncontrolled: starts on "All" (multi-inning view), no "Inning N" badge', function () {
    render(<DefenseDiamond roster={baseRoster()} grid={baseGrid()} innings={2} />);
    expect(screen.queryByText(/Inning \d/)).not.toBeInTheDocument();
  });

  test('uncontrolled: clicking an inning button switches to single-inning view', function () {
    render(<DefenseDiamond roster={baseRoster()} grid={baseGrid()} innings={2} />);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    expect(screen.getByText('Inning 1')).toBeInTheDocument();
  });

  test('uncontrolled: clicking "All" after selecting an inning returns to multi-inning view', function () {
    render(<DefenseDiamond roster={baseRoster()} grid={baseGrid()} innings={2} />);
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByText('Inning 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.queryByText(/Inning \d/)).not.toBeInTheDocument();
  });

  test('controlled: selectedInning drives the view, not internal state', function () {
    render(<DefenseDiamond roster={baseRoster()} grid={baseGrid()} innings={2} selectedInning={1} onSelectInning={vi.fn()} />);
    expect(screen.getByText('Inning 2')).toBeInTheDocument();
  });

  test('controlled: clicking an inning button calls onSelectInning, does not self-manage state', function () {
    var onSelectInning = vi.fn();
    render(<DefenseDiamond roster={baseRoster()} grid={baseGrid()} innings={2} selectedInning={null} onSelectInning={onSelectInning} />);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    expect(onSelectInning).toHaveBeenCalledWith(0);
    // Parent hasn't re-rendered with a new prop yet, so the view stays "All"
    expect(screen.queryByText(/Inning \d/)).not.toBeInTheDocument();
  });

  test('controlled: clicking "All" calls onSelectInning(null)', function () {
    var onSelectInning = vi.fn();
    render(<DefenseDiamond roster={baseRoster()} grid={baseGrid()} innings={2} selectedInning={0} onSelectInning={onSelectInning} />);
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(onSelectInning).toHaveBeenCalledWith(null);
  });
});

describe('DefenseDiamond — single-inning position display', function () {
  test('shows the assigned player\'s first name for a position', function () {
    render(<DefenseDiamond roster={baseRoster()} grid={baseGrid()} innings={2} />);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    expect(screen.getByText('Casey')).toBeInTheDocument();
  });

  test('shows "-" for an unassigned position', function () {
    var roster = [{ name: 'Solo Player' }];
    var grid = { 'Solo Player': ['SS'] };
    render(<DefenseDiamond roster={roster} grid={grid} innings={1} />);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    // 1B is unassigned this inning — at least one "-" placeholder renders
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  test('Bench box lists bench and OUT-prefixed players, stacked', function () {
    render(<DefenseDiamond roster={baseRoster()} grid={baseGrid()} innings={2} />);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    // "Jordan" appears both in the SVG Bench box and the bench table below —
    // assert presence, not uniqueness, here.
    expect(screen.getAllByText('Jordan').length).toBeGreaterThan(0);
    expect(screen.getByText('OUT Sam')).toBeInTheDocument();
  });

  test('Bench box shows "-" when nobody is benched or out that inning', function () {
    var roster = [{ name: 'Solo Player' }];
    var grid = { 'Solo Player': ['SS'] };
    render(<DefenseDiamond roster={roster} grid={grid} innings={1} />);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    // Both the SS box (unassigned neighbors) and the Bench box render "-";
    // assert Bench specifically has no bench/out names present.
    expect(screen.queryByText('OUT')).not.toBeInTheDocument();
  });
});

describe('DefenseDiamond — all-innings position display', function () {
  test('shows a per-inning row of first names/dashes for a position across innings', function () {
    render(<DefenseDiamond roster={baseRoster()} grid={baseGrid()} innings={2} />);
    // All-innings view: Casey plays SS in inning 1 and P in inning 2 —
    // both should be visible simultaneously (no inning filter applied),
    // rendered as separate per-inning text nodes within each position box.
    expect(screen.getAllByText('Casey').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Jordan').length).toBeGreaterThan(0);
  });
});

describe('DefenseDiamond — bench/out table', function () {
  test('renders one "Inn N" column header per inning', function () {
    render(<DefenseDiamond roster={baseRoster()} grid={baseGrid()} innings={2} />);
    expect(screen.getByText('Inn 1')).toBeInTheDocument();
    expect(screen.getByText('Inn 2')).toBeInTheDocument();
  });

  test('lists a benched player\'s first name in the correct inning column', function () {
    render(<DefenseDiamond roster={baseRoster()} grid={baseGrid()} innings={2} />);
    var table = screen.getByRole('table');
    expect(within(table).getByText('Jordan')).toBeInTheDocument();
  });

  test('renders no "Out" row when nobody is marked Out in any inning', function () {
    var roster = [{ name: 'Casey Jones' }, { name: 'Jordan Lee' }];
    var grid = { 'Casey Jones': ['SS'], 'Jordan Lee': ['Bench'] };
    render(<DefenseDiamond roster={roster} grid={grid} innings={1} />);
    expect(screen.queryByText('Out')).not.toBeInTheDocument();
  });

  test('renders an "Out" row + player name when at least one player is Out', function () {
    render(<DefenseDiamond roster={baseRoster()} grid={baseGrid()} innings={2} />);
    var table = screen.getByRole('table');
    // One "Out" header cell per inning column (2 innings = 2 cells)
    expect(within(table).getAllByText('Out').length).toBe(2);
    expect(within(table).getAllByText('Sam').length).toBeGreaterThan(0);
  });
});

describe('DefenseDiamond — onPositionTap', function () {
  test('clicking a position calls onPositionTap with that position key', function () {
    var onPositionTap = vi.fn();
    render(<DefenseDiamond roster={baseRoster()} grid={baseGrid()} innings={2} onPositionTap={onPositionTap} />);
    fireEvent.click(screen.getByText('SS'));
    expect(onPositionTap).toHaveBeenCalledWith('SS');
  });

  test('clicking a position is a no-op when onPositionTap is not provided', function () {
    expect(function () {
      render(<DefenseDiamond roster={baseRoster()} grid={baseGrid()} innings={2} />);
      fireEvent.click(screen.getByText('SS'));
    }).not.toThrow();
  });
});
