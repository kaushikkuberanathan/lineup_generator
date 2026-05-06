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
        >Claim Scorer</button>
      </div>
    );
  },
}));

vi.mock('../ScoringMode/LiveScoringPanel', () => ({
  default: function MockLSP() {
    return (
      <div data-testid="live-scoring-panel">
        <div data-testid="pitch-map">pitch map area</div>
      </div>
    );
  },
}));

vi.mock('../ScoringMode/RestoreScoreModal', () => ({
  default: function() { return null; },
}));

vi.mock('../BattingOrderStrip', () => ({
  BattingOrderStrip: function MockBOS(props) {
    return (
      <div data-testid="batting-order-strip" data-batter-index={props.currentBatterIndex}>
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
    isScorer: false, scorerName: null, scorerLockExpired: false,
    suggestedBatter: null, pendingAdvancement: null,
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
    currentAtBat: { id: 'ab1', batter: { id: 'Aiden', name: 'Aiden' }, pitches: [] },
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
  user: null, session: null, schedule: [],
  currentBatterIndex: 0,
  grid: {},
};

beforeEach(function() {
  localStorage.clear();
  vi.mocked(useLiveScoring).mockReturnValue(createDefaultScoring());
  Object.defineProperty(window, 'innerWidth',  { writable: true, configurable: true, value: 375 });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 667 });
  window.dispatchEvent(new Event('resize'));
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DugoutView — 375px viewport', function() {
  function claimScorer() {
    act(function() {
      fireEvent.click(screen.getByTestId('claim-btn'));
    });
  }

  it('post-entry root uses flex column layout filling 100vh', function() {
    render(<DugoutView {...defaultProps} />);
    claimScorer();
    // The post-entry shell must be a flex column
    var shell = screen.getByTestId('dugout-shell');
    expect(shell.style.display).toBe('flex');
    expect(shell.style.flexDirection).toBe('column');
    expect(shell.style.height).toBe('100vh');
  });

  it('when dugoutFocusMode is lineup, DefenseDiamond wrapper is in the DOM', function() {
    // currentAtBat null → lineup mode
    render(<DugoutView {...defaultProps} />);
    claimScorer();
    // wrapper should be present (both mounts always rendered for instant switching)
    expect(screen.getByTestId('defense-diamond-mount')).toBeInTheDocument();
    expect(screen.getByTestId('mock-defense-diamond')).toBeInTheDocument();
  });

  it('when dugoutFocusMode is scoring, pitch-map area is in the DOM', function() {
    vi.mocked(useLiveScoring).mockReturnValue(createScoringWithAtBat());
    render(<DugoutView {...defaultProps} />);
    claimScorer();
    expect(screen.getByTestId('scoring-panel-mount')).toBeInTheDocument();
    // pitch-map comes from the MockLSP in this file — verifies testid is wired
    expect(screen.getByTestId('pitch-map')).toBeInTheDocument();
  });
});
