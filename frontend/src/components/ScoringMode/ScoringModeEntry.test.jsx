import React from 'react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ScoringModeEntry, { computeNextGames } from './ScoringModeEntry';

// ============================================================================
// ScoringModeEntry.jsx (255 lines) — the Game Mode / Live Scoring entry
// screen, previously only referenced as a mock in DugoutView.test.jsx and
// AppShareLinkRouting.test.jsx, with zero coverage of its own logic. Covers
// the exported pure fn computeNextGames directly, plus golden-path coverage
// of game selection, the Claim Scorer / Join as Viewer / Practice Mode
// callbacks, and the "We bat" half toggle feeding into onClaimScorer.
// ============================================================================

describe('computeNextGames', function () {
  function item(date, id) {
    return { game: { id: id || date, date: date }, days: 0 };
  }

  test('no todayGame: returns the game(s) at the soonest upcoming date', function () {
    var upcoming = [item('2026-06-16'), item('2026-06-20')];
    expect(computeNextGames(upcoming, null)).toEqual([item('2026-06-16')]);
  });

  test('todayGame present: skips it and finds the next soonest date after it', function () {
    var today = item('2026-06-15');
    var upcoming = [today, item('2026-06-16'), item('2026-06-20')];
    expect(computeNextGames(upcoming, today.game)).toEqual([item('2026-06-16')]);
  });

  test('doubleheader: returns every game sharing the soonest date', function () {
    var upcoming = [item('2026-06-16', 'g1'), item('2026-06-16', 'g2'), item('2026-06-20', 'g3')];
    var result = computeNextGames(upcoming, null);
    expect(result.length).toBe(2);
    expect(result.map(function (r) { return r.game.id; })).toEqual(['g1', 'g2']);
  });

  test('empty upcoming: returns []', function () {
    expect(computeNextGames([], null)).toEqual([]);
  });

  test('todayGame present with nothing after it: returns []', function () {
    var today = item('2026-06-15');
    expect(computeNextGames([today], today.game)).toEqual([]);
  });
});

describe('ScoringModeEntry', function () {
  beforeEach(function () {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T10:00:00'));
  });

  afterEach(function () {
    vi.useRealTimers();
  });

  function baseProps(overrides) {
    return Object.assign({
      activeTeam: { name: 'Mud Hens' },
      schedule: [],
      selectedGame: null,
      onSelectGame: vi.fn(),
      onClaimScorer: vi.fn(),
      onJoinViewer: vi.fn(),
      onPractice: vi.fn(),
      onClose: vi.fn(),
    }, overrides);
  }

  function gameToday() {
    return { id: 'g-today', date: '2026-06-15', opponent: 'Tigers', time: '6:00 PM', location: 'Home' };
  }
  function gameTomorrow() {
    return { id: 'g-tmrw', date: '2026-06-16', opponent: 'Bears' };
  }
  function gameLater() {
    return { id: 'g-later', date: '2026-06-20', opponent: 'Cubs' };
  }

  test('renders the active team name, or "—" when none', function () {
    render(<ScoringModeEntry {...baseProps()} />);
    expect(screen.getByText('Mud Hens')).toBeInTheDocument();

    render(<ScoringModeEntry {...baseProps({ activeTeam: null })} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  test('shows the "Today\'s Game" card when a game is scheduled today', function () {
    render(<ScoringModeEntry {...baseProps({ schedule: [gameToday()] })} />);
    expect(screen.getByText("Today's Game")).toBeInTheDocument();
    expect(screen.getByText('vs Tigers')).toBeInTheDocument();
  });

  test('no game today, upcoming games exist: shows "No game today" + Upcoming list', function () {
    render(<ScoringModeEntry {...baseProps({ schedule: [gameTomorrow(), gameLater()] })} />);
    expect(screen.getByText('No game today')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('vs Bears')).toBeInTheDocument();
  });

  test('shows "Tomorrow" instead of a formatted date for a next-day game', function () {
    render(<ScoringModeEntry {...baseProps({ schedule: [gameTomorrow()] })} />);
    expect(screen.getByText(/Tomorrow/)).toBeInTheDocument();
  });

  test('no game today and no upcoming games: shows the empty state', function () {
    render(<ScoringModeEntry {...baseProps({ schedule: [] })} />);
    expect(screen.getByText('No upcoming games scheduled')).toBeInTheDocument();
  });

  test('a completed game (has a result) is excluded from today/upcoming', function () {
    var played = Object.assign(gameToday(), { result: 'W 5-3' });
    render(<ScoringModeEntry {...baseProps({ schedule: [played] })} />);
    expect(screen.queryByText("Today's Game")).not.toBeInTheDocument();
    expect(screen.getByText('No upcoming games scheduled')).toBeInTheDocument();
  });

  test('clicking an upcoming game calls onSelectGame with that game', function () {
    var onSelectGame = vi.fn();
    render(<ScoringModeEntry {...baseProps({ schedule: [gameTomorrow()], onSelectGame: onSelectGame })} />);
    fireEvent.click(screen.getByText('vs Bears'));
    expect(onSelectGame).toHaveBeenCalledWith(gameTomorrow());
  });

  test('Claim Scorer is disabled with no active game', function () {
    var onClaimScorer = vi.fn();
    render(<ScoringModeEntry {...baseProps({ schedule: [], onClaimScorer: onClaimScorer })} />);
    var btn = screen.getByText(/Claim Scorer/);
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClaimScorer).not.toHaveBeenCalled();
  });

  test('Claim Scorer calls onClaimScorer(activeGame, "top") by default', function () {
    var onClaimScorer = vi.fn();
    render(<ScoringModeEntry {...baseProps({ schedule: [gameToday()], onClaimScorer: onClaimScorer })} />);
    fireEvent.click(screen.getByText(/Claim Scorer/));
    expect(onClaimScorer).toHaveBeenCalledWith(gameToday(), 'top');
  });

  test('toggling "Bottom" changes the half passed to onClaimScorer', function () {
    var onClaimScorer = vi.fn();
    render(<ScoringModeEntry {...baseProps({ schedule: [gameToday()], onClaimScorer: onClaimScorer })} />);
    fireEvent.click(screen.getByText('▼ Bottom'));
    fireEvent.click(screen.getByText(/Claim Scorer/));
    expect(onClaimScorer).toHaveBeenCalledWith(gameToday(), 'bottom');
  });

  test('selectedGame overrides todayGame as the active game', function () {
    var onClaimScorer = vi.fn();
    render(<ScoringModeEntry {...baseProps({
      schedule: [gameTomorrow()], selectedGame: gameLater(), onClaimScorer: onClaimScorer,
    })} />);
    fireEvent.click(screen.getByText(/Claim Scorer/));
    expect(onClaimScorer).toHaveBeenCalledWith(gameLater(), 'top');
  });

  test('Join as Viewer calls onJoinViewer(activeGame) when a game is active', function () {
    var onJoinViewer = vi.fn();
    render(<ScoringModeEntry {...baseProps({ schedule: [gameToday()], onJoinViewer: onJoinViewer })} />);
    fireEvent.click(screen.getByText(/Join as Viewer/));
    expect(onJoinViewer).toHaveBeenCalledWith(gameToday());
  });

  test('Join as Viewer is disabled with no active game', function () {
    render(<ScoringModeEntry {...baseProps({ schedule: [] })} />);
    expect(screen.getByText(/Join as Viewer/)).toBeDisabled();
  });

  test('Practice Mode calls onPractice', function () {
    var onPractice = vi.fn();
    render(<ScoringModeEntry {...baseProps({ onPractice: onPractice })} />);
    fireEvent.click(screen.getByText('🏋 Practice Mode'));
    expect(onPractice).toHaveBeenCalledTimes(1);
  });

  test('the close button calls onClose', function () {
    var onClose = vi.fn();
    render(<ScoringModeEntry {...baseProps({ onClose: onClose })} />);
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
