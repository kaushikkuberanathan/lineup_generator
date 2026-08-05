/**
 * GameModeScreen.test.jsx — P0 test-coverage gap (DOC_TEST_DEBT.md).
 *
 * Zero prior coverage existed for this component before this file — only
 * DugoutView (the container) had a smoke test. The March 2026 QuickSwap
 * onClick regression (DefenseDiamond missing handlers) would not have been
 * caught by any existing test, which is exactly the risk this closes.
 *
 * Follows DugoutView.test.jsx's established pattern: mock the heavy child
 * components (DefenseDiamond, NowBattingBar) to expose simple testid-driven
 * triggers, and test GameModeScreen's own state machine in isolation.
 * InningModal and QuickSwap are left un-mocked — they're simple enough to
 * render for real, and doing so gives genuine integration coverage of the
 * exact wiring (onConfirm, onSwap) the March regression broke. QuickSwap's
 * own absent-player-filtering logic gets a second, focused look in
 * QuickSwap.test.jsx.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GameModeScreen } from './GameModeScreen';

vi.mock('../../utils/analytics', () => ({ track: vi.fn() }));

vi.mock('../GameDay/DefenseDiamond', () => ({
  DefenseDiamond: function MockDD(props) {
    return (
      <div data-testid="mock-defense-diamond">
        <button data-testid="tap-ss" onClick={function() { props.onPositionTap('SS'); }}>
          Tap SS
        </button>
      </div>
    );
  },
}));

vi.mock('../GameDay/NowBattingStrip', () => ({
  NowBattingBar: function MockNBB(props) {
    return (
      <div data-testid="mock-now-batting">
        <button data-testid="advance-batter" onClick={props.onAdvance}>Advance</button>
        <button data-testid="back-batter" onClick={props.onBack}>Back</button>
      </div>
    );
  },
}));

function fixtureRoster() {
  return [{ name: 'Aiden' }, { name: 'Benji' }, { name: 'Cassius' }];
}

var defaultProps = {
  teamId: 'team-1',
  roster: fixtureRoster(),
  grid: {},
  battingOrder: ['Aiden', 'Benji', 'Cassius'],
  innings: 6,
  currentBatterIndex: 0,
  initialInning: 0,
  sport: 'baseball',
  absentTonight: [],
  onSwap: vi.fn(),
  onBatterAdvance: vi.fn(),
  onBatterBack: vi.fn(),
  onInningChange: vi.fn(),
  onBatterReset: vi.fn(),
  onExit: vi.fn(),
};

// Fresh vi.fn() mocks per call so call-count assertions never leak between
// tests, with a fresh callback set applied BEFORE overrides so a test can
// still substitute its own mock for a specific callback if it needs to.
function props(overrides) {
  return Object.assign({}, defaultProps, {
    onSwap: vi.fn(), onBatterAdvance: vi.fn(), onBatterBack: vi.fn(),
    onInningChange: vi.fn(), onBatterReset: vi.fn(), onExit: vi.fn(),
  }, overrides || {});
}

// Three clicks on the SAME button, not two: click 1 marks defense done and
// flips the label to "End Batting"; click 2 marks batting done, which makes
// bothHalvesDone true for the NEXT render but the click handler itself still
// read the pre-click (false) value and just called handleEndHalf() again;
// only click 3 sees bothHalvesDone already true and actually opens the
// modal. Captured once via the real DOM node (not a live query) so the same
// element can be clicked through all three label changes.
function completeBothHalves() {
  var advanceBtn = screen.getByText('End Defense →');
  fireEvent.click(advanceBtn);
  fireEvent.click(advanceBtn);
  fireEvent.click(advanceBtn);
}

describe('GameModeScreen — rendering', function() {
  it('mounts without crashing and shows inning 1 of N', function() {
    render(<GameModeScreen {...props()} />);
    expect(screen.getByText('Inning 1')).toBeInTheDocument();
    expect(screen.getByText(/of 6/)).toBeInTheDocument();
  });

  it('restores to the persisted initialInning on open', function() {
    render(<GameModeScreen {...props({ initialInning: 3 })} />);
    expect(screen.getByText('Inning 4')).toBeInTheDocument();
  });

  it('clicking Exit calls onExit', function() {
    var p = props();
    render(<GameModeScreen {...p} />);
    fireEvent.click(screen.getByText('✕ Exit'));
    expect(p.onExit).toHaveBeenCalledTimes(1);
  });
});

describe('GameModeScreen — half-completion state machine', function() {
  it('starts on the defense half', function() {
    render(<GameModeScreen {...props()} />);
    expect(screen.getByText(/End Defense/)).toBeInTheDocument();
  });

  it('clicking the advance button once marks defense done and switches to the batting half', function() {
    render(<GameModeScreen {...props()} />);
    fireEvent.click(screen.getByText(/End Defense/));
    expect(screen.getByText(/End Batting/)).toBeInTheDocument();
  });

  it('does not open the inning modal until BOTH halves are marked done', function() {
    render(<GameModeScreen {...props()} />);
    fireEvent.click(screen.getByText(/End Defense/));
    // Only one half done — advance button still reads "End Batting", no modal.
    expect(screen.queryByText("What's Next?")).not.toBeInTheDocument();
  });

  it('opens the inning modal once both halves are marked done', function() {
    render(<GameModeScreen {...props()} />);
    completeBothHalves();
    expect(screen.getByText("What's Next?")).toBeInTheDocument();
  });
});

describe('GameModeScreen — inning advance', function() {
  it('confirming the modal advances the inning and calls onBatterAdvance + onInningChange', async function() {
    var p = props();
    render(<GameModeScreen {...p} />);
    completeBothHalves();

    // InningModal's real confirm button — "Take the Field — Inning N".
    fireEvent.click(screen.getByText(/Take the Field/));

    expect(p.onBatterAdvance).toHaveBeenCalledTimes(1);

    // currentInning increments inside a 200ms setTimeout in handleInningConfirm.
    await act(async function() {
      await new Promise(function(resolve) { setTimeout(resolve, 250); });
    });

    expect(p.onInningChange).toHaveBeenCalledWith(1);
    expect(screen.getByText('Inning 2')).toBeInTheDocument();
  });

  it('on the last inning, confirming the modal calls onExit instead of advancing', async function() {
    var p = props({ initialInning: 5 }); // innings=6, 0-based -> this IS the last inning
    render(<GameModeScreen {...p} />);
    completeBothHalves();

    fireEvent.click(screen.getByText('Exit Game Mode'));

    expect(p.onExit).toHaveBeenCalledTimes(1);
    expect(p.onInningChange).not.toHaveBeenCalled();
  });
});

describe('GameModeScreen — QuickSwap wiring', function() {
  it('tapping a defense position opens QuickSwap for that position', function() {
    render(<GameModeScreen {...props()} />);
    fireEvent.click(screen.getByTestId('tap-ss'));
    expect(screen.getByText('SS')).toBeInTheDocument();
    expect(screen.getByText('Shortstop')).toBeInTheDocument();
  });

  it('closing QuickSwap without selecting a player does not call onSwap', function() {
    var p = props();
    render(<GameModeScreen {...p} />);
    fireEvent.click(screen.getByTestId('tap-ss'));
    // QuickSwap's own × close button.
    fireEvent.click(screen.getByText('×'));
    expect(p.onSwap).not.toHaveBeenCalled();
  });

  it('selecting a player in QuickSwap calls onSwap with the current inning and both names', function() {
    var p = props({ grid: { Aiden: ['SS', 'SS', 'SS', 'SS', 'SS', 'SS'] } });
    render(<GameModeScreen {...p} />);
    fireEvent.click(screen.getByTestId('tap-ss'));
    // Benji is unassigned this inning and not the current SS occupant — tapping swaps Aiden <-> Benji.
    fireEvent.click(screen.getByText('Benji'));
    expect(p.onSwap).toHaveBeenCalledWith(0, 'Aiden', 'Benji');
  });
});

describe('GameModeScreen — Out Tonight strip (absent-player visibility)', function() {
  it('shows nothing when no one is marked Out this inning', function() {
    render(<GameModeScreen {...props()} />);
    expect(screen.queryByText('Out Tonight')).not.toBeInTheDocument();
  });

  it('shows a player explicitly assigned "Out" for the current inning', function() {
    render(<GameModeScreen {...props({ grid: { Aiden: ['Out'] } })} />);
    expect(screen.getByText('Out Tonight')).toBeInTheDocument();
    expect(screen.getByText('Aiden')).toBeInTheDocument();
  });

  it('does not show a player who is absent but not assigned "Out" in the grid for this inning', function() {
    // absentTonight alone does not populate the strip — only an actual grid
    // assignment of "Out" for the current inning does. This is GameModeScreen's
    // own logic (roster.filter grid[name][currentInning] === "Out"), separate
    // from QuickSwap's absentTonight-based candidate filtering.
    render(<GameModeScreen {...props({ absentTonight: ['Aiden'], grid: {} })} />);
    expect(screen.queryByText('Out Tonight')).not.toBeInTheDocument();
  });
});
