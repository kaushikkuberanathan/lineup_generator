import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DugoutView } from './DugoutView';

vi.mock('../../hooks/useLiveScoring', () => ({
  useLiveScoring: function() {
    return {
      gameState: {
        inning: 1, halfInning: 'top', outs: 0, balls: 0, strikes: 0,
        myScore: 0, oppScore: 0, runners: {},
      },
      currentAtBat: null, isScorer: false, scorerName: null,
      scorerLockExpired: false, suggestedBatter: null, pendingAdvancement: null,
      claimScorerLock: vi.fn(), claimError: null, releaseScorerLock: vi.fn(),
      startAtBat: vi.fn(), recordPitch: vi.fn(), resolveAtBat: vi.fn(),
      undoLastPitch: vi.fn(), confirmRunnerAdvancement: vi.fn(),
      resolveRunnerConflict: vi.fn(), runnerConflict: null,
      incrementOpponentScore: vi.fn(), addManualRun: vi.fn(),
      endHalfInning: vi.fn(), undoHalfInning: vi.fn(), endGame: vi.fn(),
      runsThisHalf: 0, rules: {}, pitchUIConfig: {}, ruleWarnings: [],
    };
  },
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
};

describe('DugoutView', () => {
  beforeEach(function() {
    localStorage.clear();
  });

  it('mounts without crashing', () => {
    render(<DugoutView {...defaultProps} />);
  });

  it('renders ScoringModeEntry when scorerClaimed is false and not viewer', () => {
    render(<DugoutView {...defaultProps} />);
    expect(screen.getByTestId('scoring-mode-entry')).toBeInTheDocument();
  });

  it('renders LiveScoringPanel after scorer is claimed', () => {
    render(<DugoutView {...defaultProps} />);
    act(function() {
      fireEvent.click(screen.getByTestId('claim-btn'));
    });
    expect(screen.getByTestId('live-scoring-panel')).toBeInTheDocument();
  });

  it('renders BattingOrderStrip in entry state and active scoring state', () => {
    render(<DugoutView {...defaultProps} />);
    // Entry state
    expect(screen.getByTestId('batting-order-strip')).toBeInTheDocument();
    // Transition to active scoring
    act(function() {
      fireEvent.click(screen.getByTestId('claim-btn'));
    });
    expect(screen.getByTestId('batting-order-strip')).toBeInTheDocument();
  });

  it('passes currentBatterIndex to BattingOrderStrip', () => {
    render(<DugoutView {...defaultProps} currentBatterIndex={5} />);
    expect(screen.getByTestId('batting-order-strip')).toHaveAttribute(
      'data-batter-index', '5'
    );
  });
});
