/**
 * QuickSwap.test.jsx — P0 test-coverage gap (DOC_TEST_DEBT.md, Game Mode
 * Rendering + State). Zero prior coverage existed for this component.
 *
 * Focused specifically on the candidate-list filtering logic the debt
 * ticket calls out by name: absent-player exclusion. This is exactly the
 * kind of silent regression the March 2026 QuickSwap onClick bug
 * (DefenseDiamond missing handlers) represents — a filter or handler wired
 * wrong with no test to catch it. GameModeScreen.test.jsx covers the
 * open/close wiring; this file covers QuickSwap's own internal logic in
 * isolation, unmocked.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickSwap } from './QuickSwap';

vi.mock('../../utils/analytics', () => ({ track: vi.fn() }));

function fixtureRoster() {
  return [{ name: 'Aiden' }, { name: 'Benji' }, { name: 'Cassius' }, { name: 'Ezra' }];
}

var defaultProps = {
  position: 'SS',
  inning: 0,
  roster: fixtureRoster(),
  grid: { Aiden: ['SS'] },
  onSwap: vi.fn(),
  onClose: vi.fn(),
  absentTonight: [],
};

function props(overrides) {
  return Object.assign({}, defaultProps, { onSwap: vi.fn(), onClose: vi.fn() }, overrides || {});
}

describe('QuickSwap — candidate list filtering (absent-player exclusion)', function() {
  it('lists every roster player when nobody is marked absent', function() {
    render(<QuickSwap {...props()} />);
    expect(screen.getByText('Aiden')).toBeInTheDocument();
    expect(screen.getByText('Benji')).toBeInTheDocument();
    expect(screen.getByText('Cassius')).toBeInTheDocument();
    expect(screen.getByText('Ezra')).toBeInTheDocument();
  });

  it('excludes a player marked absent tonight from the candidate list', function() {
    render(<QuickSwap {...props({ absentTonight: ['Benji'] })} />);
    expect(screen.queryByText('Benji')).not.toBeInTheDocument();
    // Everyone else still present — this is a filter, not a broken render.
    expect(screen.getByText('Aiden')).toBeInTheDocument();
    expect(screen.getByText('Cassius')).toBeInTheDocument();
    expect(screen.getByText('Ezra')).toBeInTheDocument();
  });

  it('excludes multiple absent players simultaneously', function() {
    render(<QuickSwap {...props({ absentTonight: ['Benji', 'Ezra'] })} />);
    expect(screen.queryByText('Benji')).not.toBeInTheDocument();
    expect(screen.queryByText('Ezra')).not.toBeInTheDocument();
    expect(screen.getByText('Aiden')).toBeInTheDocument();
    expect(screen.getByText('Cassius')).toBeInTheDocument();
  });

  it('excludes the CURRENT occupant of the position too, if they are marked absent', function() {
    // Aiden occupies SS (per defaultProps' grid) — an absent current-occupant
    // should still disappear from the list, not just be shown as "HERE".
    render(<QuickSwap {...props({ absentTonight: ['Aiden'] })} />);
    expect(screen.queryByText('Aiden')).not.toBeInTheDocument();
  });
});

describe('QuickSwap — swap interaction', function() {
  it('tapping a non-current player calls onSwap(currentOccupant, tappedPlayer)', function() {
    var p = props();
    render(<QuickSwap {...p} />);
    screen.getByText('Benji').click();
    expect(p.onSwap).toHaveBeenCalledWith('Aiden', 'Benji');
  });

  it('the current occupant\'s row is disabled and does not call onSwap when clicked', function() {
    var p = props();
    render(<QuickSwap {...p} />);
    var aidenButton = screen.getByText('Aiden').closest('button');
    expect(aidenButton).toBeDisabled();
    aidenButton.click();
    expect(p.onSwap).not.toHaveBeenCalled();
  });

  it('labels the current occupant "HERE"', function() {
    render(<QuickSwap {...props()} />);
    expect(screen.getByText('HERE')).toBeInTheDocument();
  });

  it('when the position is unassigned, no one is marked HERE and every candidate is tappable', function() {
    var p = props({ grid: {} }); // nobody occupies SS this inning
    render(<QuickSwap {...p} />);
    expect(screen.queryByText('HERE')).not.toBeInTheDocument();
    screen.getByText('Aiden').click();
    // currentPlayer is null here, so onSwap's first arg is null (assigning fresh, not swapping).
    expect(p.onSwap).toHaveBeenCalledWith(null, 'Aiden');
  });

  it('clicking the backdrop calls onClose', function() {
    var p = props();
    var container = render(<QuickSwap {...p} />).container;
    var backdrop = container.firstChild;
    backdrop.click();
    expect(p.onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking the × button calls onClose', function() {
    var p = props();
    render(<QuickSwap {...p} />);
    screen.getByText('×').click();
    expect(p.onClose).toHaveBeenCalledTimes(1);
  });
});

describe('QuickSwap — header content', function() {
  it('shows the position code and full label', function() {
    // Scoped to "no current occupant" so the position code renders exactly
    // once (in the header) — with Aiden occupying SS, the code also appears
    // a second time as his row's position badge, making a bare getByText
    // ambiguous.
    render(<QuickSwap {...props({ position: 'SS', grid: {} })} />);
    expect(screen.getByText('SS')).toBeInTheDocument();
    expect(screen.getByText('Shortstop')).toBeInTheDocument();
  });

  it('shows "Currently: <name>" when the position is occupied', function() {
    render(<QuickSwap {...props()} />);
    expect(screen.getByText(/Currently: Aiden/)).toBeInTheDocument();
  });

  it('shows "Unassigned" when nobody occupies the position this inning', function() {
    render(<QuickSwap {...props({ grid: {} })} />);
    expect(screen.getByText(/Unassigned/)).toBeInTheDocument();
  });
});
