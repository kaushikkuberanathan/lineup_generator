import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PITCH, OUTCOME } from '../hooks/useLiveScoring';

// ============================================================================
// LiveScoringPanel.jsx (1302 lines) — the main live-scoring UI, previously
// with zero direct test coverage. Golden-path coverage across its 3 render
// states (no scorer / another scorer / I am scorer) plus the key scorer
// interactions: pitch recording, mercy banner, outcome sheet, roster swap,
// opponent-half tracking. Children with their own dedicated test files
// (GameModeGearMenu, FinishGameModal, RunnerConflictModal) are mocked here
// to keep this suite focused on LiveScoringPanel's own logic.
// ============================================================================

vi.mock('../components/ScoringMode/LiveScoreViewer', () => ({
  default: function MockLiveScoreViewer(props) {
    return (
      <div data-testid="live-score-viewer">
        <button onClick={props.onClaimScorer}>Viewer Claim</button>
      </div>
    );
  },
}));

vi.mock('../components/ScoringMode/GameModeGearMenu', () => ({
  default: function MockGearMenu(props) {
    return <div data-testid="gear-menu" data-open={props.isOpen ? 'true' : 'false'} />;
  },
}));

vi.mock('../components/ScoringMode/FinishGameModal', () => ({
  default: function MockFinishGameModal(props) {
    return <div data-testid="finish-modal" data-open={props.isOpen ? 'true' : 'false'} />;
  },
}));

vi.mock('../components/ScoringMode/RunnerConflictModal', () => ({
  default: function MockRunnerConflictModal(props) {
    return <div data-testid="runner-conflict-modal" data-conflict={props.conflict ? 'true' : 'false'} />;
  },
}));

import LiveScoringPanel from '../components/ScoringMode/LiveScoringPanel';

function baseGameState(overrides) {
  return Object.assign({
    inning: 1, halfInning: 'top', outs: 0, balls: 0, strikes: 0,
    myScore: 0, opponentScore: 0, runners: [], currentBatter: null,
    battingOrderIndex: 0,
  }, overrides);
}

function baseProps(overrides) {
  return Object.assign({
    gameState: baseGameState(),
    currentAtBat: null,
    isScorer: false,
    scorerName: null,
    scorerLockExpired: false,
    suggestedBatter: null,
    pendingAdvancement: null,
    battingOrder: [],
    claimScorerLock: vi.fn(),
    claimError: '',
    releaseScorerLock: vi.fn(),
    startAtBat: vi.fn(),
    recordPitch: vi.fn(),
    resolveAtBat: vi.fn(),
    undoLastPitch: vi.fn(),
    confirmRunnerAdvancement: vi.fn(),
    resolveRunnerConflict: vi.fn(),
    runnerConflict: null,
    endHalfInning: vi.fn(),
    undoHalfInning: vi.fn(),
    endGame: vi.fn().mockResolvedValue({ ok: true }),
    selectedGame: null,
    activeTeam: null,
    isPractice: false,
    isAdminTestMode: false,
    onExit: vi.fn(),
    onPause: vi.fn(),
    pitchUIConfig: {
      showBallButton: true, showCalledStrike: true, showSwingMiss: true,
      showFoul: true, showContact: true, showAttemptButton: false,
    },
    ruleWarnings: [],
    runsThisHalf: 0,
    myTeamHalf: 'top',
    scoring: {
      addManualRun: vi.fn(), recordOppPitch: vi.fn(),
      endHalfInning: vi.fn(), oppRunsThisHalf: 0,
    },
  }, overrides);
}

describe('LiveScoringPanel — STATE 1: no active scorer', function () {
  test('renders "No active scorer" with a Claim Scorer Role button', function () {
    render(<LiveScoringPanel {...baseProps()} />);
    expect(screen.getByText('No active scorer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /claim scorer role/i })).toBeInTheDocument();
  });

  test('clicking Claim Scorer Role calls claimScorerLock', function () {
    var claimScorerLock = vi.fn();
    render(<LiveScoringPanel {...baseProps({ claimScorerLock })} />);
    fireEvent.click(screen.getByRole('button', { name: /claim scorer role/i }));
    expect(claimScorerLock).toHaveBeenCalledTimes(1);
  });

  test('claimError renders as a visible warning', function () {
    render(<LiveScoringPanel {...baseProps({ claimError: 'Someone else just claimed it' })} />);
    expect(screen.getByText(/someone else just claimed it/i)).toBeInTheDocument();
  });

  test('"Join as Viewer" is hidden in practice mode', function () {
    render(<LiveScoringPanel {...baseProps({ isPractice: true })} />);
    expect(screen.queryByText(/join as viewer/i)).not.toBeInTheDocument();
  });

  test('clicking "Join as Viewer" switches to the viewer surface', function () {
    render(<LiveScoringPanel {...baseProps()} />);
    fireEvent.click(screen.getByText(/join as viewer/i));
    expect(screen.getByTestId('live-score-viewer')).toBeInTheDocument();
  });
});

describe('LiveScoringPanel — STATE 3: another scorer is active', function () {
  test('renders the scorer banner and disables all pitch buttons', function () {
    render(<LiveScoringPanel {...baseProps({ scorerName: 'Coach Sam', isScorer: false })} />);
    expect(screen.getByText(/coach sam is scoring/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ball' })).toBeDisabled();
  });
});

describe('LiveScoringPanel — STATE 2: I am scorer — batter area', function () {
  test('renders the suggested-batter card; Confirm calls startAtBat(suggestedBatter, true)', function () {
    var startAtBat = vi.fn();
    var suggestedBatter = { id: 'p2', name: 'Jordan Lee', orderPosition: 1 };
    render(<LiveScoringPanel {...baseProps({
      isScorer: true, scorerName: 'Me', suggestedBatter: suggestedBatter,
      battingOrder: [{ id: 'p1', name: 'Casey Jones' }, suggestedBatter],
      startAtBat: startAtBat,
    })} />);

    expect(screen.getByText('Jordan Lee')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(startAtBat).toHaveBeenCalledWith(suggestedBatter, true);
  });

  test('renders the "Now Batting" card with a SWAP button when an at-bat is active', function () {
    var currentAtBat = { batter: { id: 'p1', name: 'Casey Jones', number: 7 }, pitches: [] };
    render(<LiveScoringPanel {...baseProps({ isScorer: true, scorerName: 'Me', currentAtBat: currentAtBat })} />);
    expect(screen.getByText('#7 Casey Jones')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SWAP' })).toBeInTheDocument();
  });

  test('renders "No batting order set" when there is no current or suggested batter', function () {
    render(<LiveScoringPanel {...baseProps({ isScorer: true, scorerName: 'Me' })} />);
    expect(screen.getByText('No batting order set')).toBeInTheDocument();
  });

  test('SWAP opens the roster picker; selecting a player calls startAtBat(player, false)', function () {
    var startAtBat = vi.fn();
    var currentAtBat = { batter: { id: 'p1', name: 'Casey Jones', number: 7 }, pitches: [] };
    var battingOrder = [{ id: 'p1', name: 'Casey Jones' }, { id: 'p2', name: 'Jordan Lee' }];
    render(<LiveScoringPanel {...baseProps({
      isScorer: true, scorerName: 'Me', currentAtBat: currentAtBat,
      battingOrder: battingOrder, startAtBat: startAtBat,
    })} />);

    fireEvent.click(screen.getByRole('button', { name: 'SWAP' }));
    expect(screen.getByText('Select Batter')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Jordan Lee'));
    expect(startAtBat).toHaveBeenCalledWith(battingOrder[1], false);
    expect(screen.queryByText('Select Batter')).not.toBeInTheDocument();
  });
});

describe('LiveScoringPanel — STATE 2: pitch recording', function () {
  test('clicking a pitch button records that pitch when a batter is up', function () {
    var recordPitch = vi.fn();
    var currentAtBat = { batter: { id: 'p1', name: 'Casey Jones' }, pitches: [] };
    render(<LiveScoringPanel {...baseProps({ isScorer: true, scorerName: 'Me', currentAtBat: currentAtBat, recordPitch: recordPitch })} />);

    fireEvent.click(screen.getByRole('button', { name: /^B\s*Ball$/ }));
    expect(recordPitch).toHaveBeenCalledWith(PITCH.BALL);
  });

  test('pitch buttons are disabled and inert when no batter is up', function () {
    var recordPitch = vi.fn();
    render(<LiveScoringPanel {...baseProps({ isScorer: true, scorerName: 'Me', recordPitch: recordPitch })} />);

    var ballBtn = screen.getByRole('button', { name: /^B\s*Ball$/ });
    expect(ballBtn).toBeDisabled();
    fireEvent.click(ballBtn);
    expect(recordPitch).not.toHaveBeenCalled();
  });

  test('Undo is disabled with zero pitches, enabled and wired once pitches exist', function () {
    var undoLastPitch = vi.fn();
    var currentAtBat = { batter: { id: 'p1', name: 'Casey Jones' }, pitches: [] };
    var { rerender } = render(<LiveScoringPanel {...baseProps({ isScorer: true, scorerName: 'Me', currentAtBat: currentAtBat, undoLastPitch: undoLastPitch })} />);
    expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled();

    var withPitches = Object.assign({}, currentAtBat, { pitches: [{ type: PITCH.BALL }] });
    rerender(<LiveScoringPanel {...baseProps({ isScorer: true, scorerName: 'Me', currentAtBat: withPitches, undoLastPitch: undoLastPitch })} />);
    var undoBtn = screen.getByRole('button', { name: /undo/i });
    expect(undoBtn).not.toBeDisabled();
    fireEvent.click(undoBtn);
    expect(undoLastPitch).toHaveBeenCalledTimes(1);
  });
});

describe('LiveScoringPanel — STATE 2: outcome sheet after contact', function () {
  test('a contact pitch opens the outcome sheet; picking an outcome calls resolveAtBat', function () {
    var resolveAtBat = vi.fn();
    var currentAtBat = { batter: { id: 'p1', name: 'Casey Jones' }, pitches: [{ type: PITCH.CONTACT }] };
    render(<LiveScoringPanel {...baseProps({ isScorer: true, scorerName: 'Me', currentAtBat: currentAtBat, resolveAtBat: resolveAtBat })} />);

    expect(screen.getByText('At-bat outcome')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Single' }));
    expect(resolveAtBat).toHaveBeenCalledWith(OUTCOME.SINGLE);
  });

  test('the sheet\'s own Foul option records a foul pitch instead of resolving the at-bat', function () {
    var recordPitch = vi.fn();
    var currentAtBat = { batter: { id: 'p1', name: 'Casey Jones' }, pitches: [{ type: PITCH.CONTACT }] };
    render(<LiveScoringPanel {...baseProps({ isScorer: true, scorerName: 'Me', currentAtBat: currentAtBat, recordPitch: recordPitch })} />);

    fireEvent.click(screen.getByRole('button', { name: /foul ball — at-bat continues/i }));
    expect(recordPitch).toHaveBeenCalledWith('foul');
  });
});

describe('LiveScoringPanel — STATE 2: mercy rule (our half)', function () {
  test('shows the mercy banner at 5+ runs; End Half calls endHalfInning', function () {
    var endHalfInning = vi.fn();
    render(<LiveScoringPanel {...baseProps({
      isScorer: true, scorerName: 'Me', runsThisHalf: 5, endHalfInning: endHalfInning,
    })} />);

    expect(screen.getByText(/5 runs this half/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'End Half' }));
    expect(endHalfInning).toHaveBeenCalledTimes(1);
  });
});

describe('LiveScoringPanel — STATE 2: opponent half', function () {
  test('renders opponent pitch buttons and records opponent pitches', function () {
    var recordOppPitch = vi.fn();
    render(<LiveScoringPanel {...baseProps({
      isScorer: true, scorerName: 'Me',
      gameState: baseGameState({ halfInning: 'bottom' }),
      myTeamHalf: 'top',
      scoring: { addManualRun: vi.fn(), recordOppPitch: recordOppPitch, endHalfInning: vi.fn(), oppRunsThisHalf: 0 },
    })} />);

    fireEvent.click(screen.getByRole('button', { name: /K\nStrike/ }));
    expect(recordOppPitch).toHaveBeenCalledWith('strike');
  });

  test('#118 — ScoreboardRow shows the active-half dot on our team during our half', function () {
    render(<LiveScoringPanel {...baseProps({ isScorer: true, scorerName: 'Me' })} />);
    expect(screen.getByTestId('scoreboard-mine-active-dot')).toBeInTheDocument();
    expect(screen.queryByTestId('scoreboard-opp-active-dot')).toBeNull();
  });

  test('#118 — ScoreboardRow shows the active-half dot on the opponent during their half', function () {
    render(<LiveScoringPanel {...baseProps({
      isScorer: true, scorerName: 'Me',
      gameState: baseGameState({ halfInning: 'bottom' }),
      myTeamHalf: 'top',
      scoring: { addManualRun: vi.fn(), recordOppPitch: vi.fn(), endHalfInning: vi.fn(), oppRunsThisHalf: 0 },
    })} />);

    expect(screen.getByTestId('scoreboard-opp-active-dot')).toBeInTheDocument();
    expect(screen.queryByTestId('scoreboard-mine-active-dot')).toBeNull();
  });

  test('#105 — diamond shows opponent runners, not our own, during their half', function () {
    var { container } = render(<LiveScoringPanel {...baseProps({
      isScorer: true, scorerName: 'Me',
      gameState: baseGameState({
        halfInning: 'bottom',
        runners: [{ runnerId: 'p1', base: 1 }],
        oppRunners: [{ runnerId: 'opp-2', base: 2 }],
      }),
      myTeamHalf: 'top',
      scoring: { addManualRun: vi.fn(), recordOppPitch: vi.fn(), endHalfInning: vi.fn(), oppRunsThisHalf: 0 },
    })} />);

    expect(container.querySelector('[data-base="2"]')).not.toBeNull();
    expect(container.querySelector('[data-base="1"]')).toBeNull();
  });

  test('#105 — diamond shows our own runners, not opponent runners, during our half', function () {
    var { container } = render(<LiveScoringPanel {...baseProps({
      isScorer: true, scorerName: 'Me',
      gameState: baseGameState({
        halfInning: 'top',
        runners: [{ runnerId: 'p1', base: 1 }],
        oppRunners: [{ runnerId: 'opp-2', base: 2 }],
        currentBatter: { id: 'p2', name: 'Batter' },
      }),
      myTeamHalf: 'top',
    })} />);

    expect(container.querySelector('[data-base="1"]')).not.toBeNull();
    expect(container.querySelector('[data-base="2"]')).toBeNull();
  });
});

describe('LiveScoringPanel — STATE 2: header controls', function () {
  test('the gear icon opens the (mocked) gear menu', function () {
    render(<LiveScoringPanel {...baseProps({ isScorer: true, scorerName: 'Me' })} />);
    expect(screen.getByTestId('gear-menu')).toHaveAttribute('data-open', 'false');
    fireEvent.click(screen.getByText('⚙'));
    expect(screen.getByTestId('gear-menu')).toHaveAttribute('data-open', 'true');
  });

  test('the pause control calls onPause', function () {
    var onPause = vi.fn();
    render(<LiveScoringPanel {...baseProps({ isScorer: true, scorerName: 'Me', onPause: onPause })} />);
    fireEvent.click(screen.getByText('✕'));
    expect(onPause).toHaveBeenCalledTimes(1);
  });
});
