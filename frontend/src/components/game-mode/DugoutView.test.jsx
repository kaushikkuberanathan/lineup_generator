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

  it('when scorer is claimed and currentAtBat is null, scoring mount is visible (v2.5.12 deadlock fix)', function() {
    // v2.5.12 revision: dugoutFocusMode = (currentAtBat !== null || scorerClaimed) ? 'scoring' : 'lineup'.
    // Once the coach claims scorer, focus is 'scoring' so the suggestedBatter card is reachable
    // and startAtBat() can be called. Pre-v2.5.12 this state showed DefenseDiamond, which
    // deadlocked the scorer (no UI to start the first at-bat). See Story 16.
    render(<DugoutView {...defaultProps} />);
    claimScorer();

    var scoreMount = screen.getByTestId('scoring-panel-mount');
    expect(scoreMount.style.display).not.toBe('none');

    var defMount = screen.getByTestId('defense-diamond-mount');
    expect(defMount.style.display).toBe('none');
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

  it('scorer mode: focus stays scoring across currentAtBat transitions (v2.5.12)', function() {
    // v2.5.12 revision: once scorerClaimed is true, dugoutFocusMode stays 'scoring' for the
    // whole session. currentAtBat transitions no longer flip the focus mode for a scorer.
    // (Viewer path — scorerClaimed=false, viewerMode=true — still has the original
    // currentAtBat-driven transitions; not covered here.)
    var rendered = render(<DugoutView {...defaultProps} />);
    claimScorer();

    // scorerClaimed=true, currentAtBat=null → scoring visible
    expect(screen.getByTestId('scoring-panel-mount').style.display).not.toBe('none');
    expect(screen.getByTestId('defense-diamond-mount').style.display).toBe('none');

    // currentAtBat becomes non-null → still scoring
    vi.mocked(useLiveScoring).mockReturnValue(createScoringWithAtBat());
    rendered.rerender(<DugoutView {...defaultProps} />);
    expect(screen.getByTestId('scoring-panel-mount').style.display).not.toBe('none');
    expect(screen.getByTestId('defense-diamond-mount').style.display).toBe('none');

    // currentAtBat null again → still scoring (scorerClaimed remains true)
    vi.mocked(useLiveScoring).mockReturnValue(createDefaultScoring());
    rendered.rerender(<DugoutView {...defaultProps} />);
    expect(screen.getByTestId('scoring-panel-mount').style.display).not.toBe('none');
    expect(screen.getByTestId('defense-diamond-mount').style.display).toBe('none');
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


});

// ── Security hardening batch 1: crypto.randomUUID for scorer_local_id ────────

describe('scorer_local_id generation (crypto.randomUUID fix)', function() {
  it('uses crypto.randomUUID() when available and persists a valid UUID v4 to localStorage', function() {
    var spy = vi.spyOn(globalThis.crypto, 'randomUUID');
    render(<DugoutView {...defaultProps} />);
    expect(spy).toHaveBeenCalledTimes(1);

    var stored = localStorage.getItem('scorer_local_id');
    expect(stored).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(stored).toBe(spy.mock.results[0].value);

    spy.mockRestore();
  });

  it('reuses an existing scorer_local_id from localStorage without generating a new one', function() {
    localStorage.setItem('scorer_local_id', 'existing-id-123');
    var spy = vi.spyOn(globalThis.crypto, 'randomUUID');
    render(<DugoutView {...defaultProps} />);
    expect(spy).not.toHaveBeenCalled();
    expect(localStorage.getItem('scorer_local_id')).toBe('existing-id-123');
    spy.mockRestore();
  });

  it('falls back to crypto.getRandomValues() (not Math.random()) when crypto.randomUUID is unavailable, and still produces a valid v4 UUID', function() {
    var original = globalThis.crypto.randomUUID;
    // Simulate an older browser without crypto.randomUUID. randomUUID is
    // defined on the Crypto prototype (writable/configurable), so this
    // direct assignment creates a shadowing own-property that reads back
    // as undefined — verified empirically, not assumed.
    // eslint-disable-next-line no-param-reassign
    globalThis.crypto.randomUUID = undefined;

    // Precondition: fail loudly here, before rendering, if the override
    // above didn't take (e.g. a future crypto polyfill makes randomUUID
    // non-configurable). Without this, a silently-failed override would
    // let the real crypto.randomUUID() run and this test would still
    // "pass" for the wrong reason - it would never touch the fallback
    // branch this test exists to cover.
    expect(globalThis.crypto.randomUUID).toBeUndefined();

    var getRandomValuesSpy = vi.spyOn(globalThis.crypto, 'getRandomValues');

    render(<DugoutView {...defaultProps} />);

    // The fallback branch must be the one that actually ran. Can't also
    // spy on crypto.randomUUID here to assert "not called" - it's been set
    // to undefined above (vi.spyOn requires an existing function to wrap),
    // and it doesn't need to be: the precondition assertion above already
    // guarantees crypto.randomUUID is genuinely falsy, so the source's
    // ternary condition short-circuits without ever evaluating
    // crypto.randomUUID() as a call in the first place.
    expect(getRandomValuesSpy).toHaveBeenCalledTimes(1);

    var stored = localStorage.getItem('scorer_local_id');
    // Full UUID v4 shape check, not just "hex string of the right length":
    // version nibble must be '4' (13th hex digit), variant nibble must be
    // one of 8/9/a/b (17th hex digit) — this is what CodeQL's insecure-
    // randomness rule actually cares about not being predictable/degraded.
    expect(stored).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    var versionNibble = stored.charAt(14);
    var variantNibble = stored.charAt(19);
    expect(versionNibble).toBe('4');
    expect(['8', '9', 'a', 'b']).toContain(variantNibble.toLowerCase());

    getRandomValuesSpy.mockRestore();
    globalThis.crypto.randomUUID = original;
  });
});

// ── Slice 2 fix-up: exit affordance across modes (Story 50) ──────────────────

describe('exit affordance across modes', function() {
  function claimScorer() {
    act(function() {
      fireEvent.click(screen.getByTestId('claim-btn'));
    });
  }

  it('in lineup mode (currentAtBat=null), exit button is visible on ScoreboardRow', function() {
    var onExit = vi.fn();
    render(<DugoutView {...defaultProps} onExit={onExit} />);
    claimScorer();
    // dugoutFocusMode='lineup' — ScoreboardRow must show exit button
    expect(screen.getByTestId('scoreboard-exit')).toBeInTheDocument();
  });

  it('in scoring mode (currentAtBat non-null), exit button is still visible on ScoreboardRow', function() {
    var onExit = vi.fn();
    vi.mocked(useLiveScoring).mockReturnValue(createScoringWithAtBat());
    render(<DugoutView {...defaultProps} onExit={onExit} />);
    claimScorer();
    // dugoutFocusMode='scoring' — exit button must persist
    expect(screen.getByTestId('scoreboard-exit')).toBeInTheDocument();
  });

  it('clicking exit button calls the onExit prop passed to DugoutView', function() {
    var onExit = vi.fn();
    render(<DugoutView {...defaultProps} onExit={onExit} />);
    claimScorer();
    act(function() {
      fireEvent.click(screen.getByTestId('scoreboard-exit'));
    });
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
