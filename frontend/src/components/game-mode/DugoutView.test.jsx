import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useLiveScoring } from '../../hooks/useLiveScoring';
import { DugoutView } from './DugoutView';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../hooks/useLiveScoring', () => ({
  useLiveScoring: vi.fn(),
}));

vi.mock('../../hooks/useFeatureFlag', () => ({
  useFeatureFlag: function() { return { enabled: false, loading: false }; },
}));

vi.mock('../ScoringMode/ScoringModeEntry', () => ({
  default: function MockSME(props) {
    return (
      <div data-testid="scoring-mode-entry">
        <button
          data-testid="claim-btn"
          onClick={function() { props.onClaimScorer({ id: 'g1' }, 'top'); }}
        >
          Claim Scorer
        </button>
      </div>
    );
  },
}));

vi.mock('../ScoringMode/LiveScoringPanel', () => ({
  default: function MockLSP() {
    return <div data-testid="live-scoring-panel" />;
  },
}));

vi.mock('../ScoringMode/RestoreScoreModal', () => ({
  default: function MockRSM() { return null; },
}));

vi.mock('../BattingOrderStrip', () => ({
  BattingOrderStrip: function MockBOS(props) {
    return (
      <div
        data-testid="batting-order-strip"
        data-batter-index={props.currentBatterIndex}
      >
        {(props.battingOrder || []).join(',')}
      </div>
    );
  },
}));

vi.mock('../GameDay/DefenseDiamond', () => ({
  DefenseDiamond: function MockDD() {
    return <div data-testid="mock-defense-diamond" />;
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function createDefaultScoring() {
  return {
    gameState: {
      inning: 1, halfInning: 'top', outs: 0, balls: 0, strikes: 0,
      myScore: 0, opponentScore: 0, runners: {}, battingOrderIndex: 0,
    },
    currentAtBat: null,
    isScorer: false, scorerName: null,
    scorerLockExpired: false, suggestedBatter: null, pendingAdvancement: null,
    claimScorerLock: vi.fn(), claimError: null, releaseScorerLock: vi.fn(),
    startAtBat: vi.fn(), recordPitch: vi.fn(), resolveAtBat: vi.fn(),
    undoLastPitch: vi.fn(), confirmRunnerAdvancement: vi.fn(),
    resolveRunnerConflict: vi.fn(), runnerConflict: null,
    incrementOpponentScore: vi.fn(), addManualRun: vi.fn(),
    endHalfInning: vi.fn(), undoHalfInning: vi.fn(), endGame: vi.fn(),
    runsThisHalf: 0, rules: {}, pitchUIConfig: {}, ruleWarnings: [],
  };
}

function createScoringWithAtBat() {
  var base = createDefaultScoring();
  return Object.assign({}, base, {
    currentAtBat: { id: 'ab1', batter: { id: 'Aiden', name: 'Aiden' }, pitches: [], startedAt: Date.now() },
    gameState: Object.assign({}, base.gameState, { battingOrderIndex: 2 }),
  });
}

var defaultProps = {
  teamId: 'team-1',
  roster: [{ name: 'Aiden' }, { name: 'Benji' }, { name: 'Cassius' }],
  battingOrder: ['Aiden', 'Benji', 'Cassius'],
  innings: 6,
  sport: 'baseball',
  absentTonight: [],
  isViewer: false,
  onExit: function() {},
  activeTeam: { name: 'Mud Hens', sport: 'baseball' },
  activeTeamId: 'team-1',
  user: null,
  session: null,
  schedule: [],
  currentBatterIndex: 0,
  grid: {},
};

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(function() {
  localStorage.clear();
  vi.mocked(useLiveScoring).mockReturnValue(createDefaultScoring());
});

// ── Original smoke tests ───────────────────────────────────────────────────────

describe('DugoutView', function() {
  it('mounts without crashing', function() {
    render(<DugoutView {...defaultProps} />);
  });

  it('renders ScoringModeEntry when scorerClaimed is false and not viewer', function() {
    render(<DugoutView {...defaultProps} />);
    expect(screen.getByTestId('scoring-mode-entry')).toBeInTheDocument();
  });

  it('renders LiveScoringPanel after scorer is claimed', function() {
    render(<DugoutView {...defaultProps} />);
    act(function() {
      fireEvent.click(screen.getByTestId('claim-btn'));
    });
    expect(screen.getByTestId('live-scoring-panel')).toBeInTheDocument();
  });

  it('renders BattingOrderStrip in entry state and active scoring state', function() {
    render(<DugoutView {...defaultProps} />);
    expect(screen.getByTestId('batting-order-strip')).toBeInTheDocument();
    act(function() {
      fireEvent.click(screen.getByTestId('claim-btn'));
    });
    expect(screen.getByTestId('batting-order-strip')).toBeInTheDocument();
  });

  it('passes currentBatterIndex to BattingOrderStrip', function() {
    render(<DugoutView {...defaultProps} currentBatterIndex={5} />);
    expect(screen.getByTestId('batting-order-strip')).toHaveAttribute(
      'data-batter-index', '5'
    );
  });
});

// ── Slice 2: dugoutFocusMode state machine ────────────────────────────────────

describe('dugoutFocusMode state machine', function() {
  function claimScorer() {
    act(function() {
      fireEvent.click(screen.getByTestId('claim-btn'));
    });
  }

  it('when currentAtBat is null, DefenseDiamond mount is visible and scoring mount is hidden', function() {
    // currentAtBat: null (default) → dugoutFocusMode = 'lineup'
    render(<DugoutView {...defaultProps} />);
    claimScorer();

    var defMount = screen.getByTestId('defense-diamond-mount');
    expect(defMount.style.display).not.toBe('none');

    var scoreMount = screen.getByTestId('scoring-panel-mount');
    expect(scoreMount.style.display).toBe('none');
  });

  it('when currentAtBat is non-null, scoring mount is visible and DefenseDiamond mount is hidden', function() {
    vi.mocked(useLiveScoring).mockReturnValue(createScoringWithAtBat());
    render(<DugoutView {...defaultProps} />);
    claimScorer();

    var scoreMount = screen.getByTestId('scoring-panel-mount');
    expect(scoreMount.style.display).not.toBe('none');

    var defMount = screen.getByTestId('defense-diamond-mount');
    expect(defMount.style.display).toBe('none');
  });

  it('mode transitions: lineup → scoring → lineup as currentAtBat changes', function() {
    var rendered = render(<DugoutView {...defaultProps} />);
    claimScorer();

    // lineup mode: defense visible
    expect(screen.getByTestId('defense-diamond-mount').style.display).not.toBe('none');

    // scoring mode: currentAtBat becomes non-null
    vi.mocked(useLiveScoring).mockReturnValue(createScoringWithAtBat());
    rendered.rerender(<DugoutView {...defaultProps} />);
    expect(screen.getByTestId('scoring-panel-mount').style.display).not.toBe('none');
    expect(screen.getByTestId('defense-diamond-mount').style.display).toBe('none');

    // back to lineup mode: currentAtBat null again
    vi.mocked(useLiveScoring).mockReturnValue(createDefaultScoring());
    rendered.rerender(<DugoutView {...defaultProps} />);
    expect(screen.getByTestId('defense-diamond-mount').style.display).not.toBe('none');
    expect(screen.getByTestId('scoring-panel-mount').style.display).toBe('none');
  });

  it('Bug 8: BattingOrderStrip reads gameState.battingOrderIndex when COMBINED flag is ON', function() {
    localStorage.setItem('flag:combined_gamemode_and_scoring', '1');
    vi.mocked(useLiveScoring).mockReturnValue(
      Object.assign(createDefaultScoring(), {
        gameState: Object.assign({}, createDefaultScoring().gameState, { battingOrderIndex: 3 }),
      })
    );
    render(<DugoutView {...defaultProps} currentBatterIndex={0} />);
    claimScorer();
    var strip = screen.getByTestId('batting-order-strip');
    expect(strip.getAttribute('data-batter-index')).toBe('3');
  });

  it('Bug 8: BattingOrderStrip reads App-passed currentBatterIndex when COMBINED flag is OFF', function() {
    // localStorage cleared in beforeEach → combinedFlag = false
    vi.mocked(useLiveScoring).mockReturnValue(
      Object.assign(createDefaultScoring(), {
        gameState: Object.assign({}, createDefaultScoring().gameState, { battingOrderIndex: 3 }),
      })
    );
    render(<DugoutView {...defaultProps} currentBatterIndex={1} />);
    claimScorer();
    var strip = screen.getByTestId('batting-order-strip');
    // flag OFF → reads prop, not gameState.battingOrderIndex
    expect(strip.getAttribute('data-batter-index')).toBe('1');
  });
});
