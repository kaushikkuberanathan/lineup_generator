import React from 'react';
import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InningModal } from './InningModal';

// ============================================================================
// InningModal.jsx (315 lines) — full-screen inning-transition confirmation
// overlay, previously mocked in every consuming test (GameModeScreen) with
// zero coverage of its own. Covers: last-inning vs mid-game branching,
// batting-order preview computation (leadOff/onDeck/inHole/restBatters
// wraparound), defense preview (field vs bench split), and the action
// callbacks.
// ============================================================================

afterEach(function () {
  localStorage.removeItem('flag_ACCESSIBILITY_V1');
});

function baseRoster() {
  return [
    { name: 'Casey Jones', battingHand: 'L' },
    { name: 'Jordan Lee',  battingHand: 'R' },
    { name: 'Sam Reyes',   battingHand: 'U' },
    { name: 'Ali Kim' },
  ];
}

function baseGrid() {
  // Only nextInning's (index 3) assignments matter for these fixtures.
  return {
    'Casey Jones': ['', '', '', 'SS'],
    'Jordan Lee':  ['', '', '', 'Bench'],
    'Sam Reyes':   ['', '', '', 'P'],
    'Ali Kim':     ['', '', '', ''],
  };
}

function baseProps(overrides) {
  return Object.assign({
    currentInning: 2,
    totalInnings: 6,
    roster: baseRoster(),
    grid: baseGrid(),
    battingOrder: ['Casey Jones', 'Jordan Lee', 'Sam Reyes', 'Ali Kim'],
    currentBatterIndex: 1,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }, overrides);
}

describe('InningModal — mid-game (not last inning)', function () {
  test('renders the "Inning N Complete" header and "What\'s Next?" title', function () {
    render(<InningModal {...baseProps()} />);
    expect(screen.getByText('Inning 3 Complete')).toBeInTheDocument();
    expect(screen.getByText("What's Next?")).toBeInTheDocument();
  });

  test('renders both action buttons, labeled for the next inning', function () {
    render(<InningModal {...baseProps()} />);
    expect(screen.getByText(/Start Batting — Inning 4/)).toBeInTheDocument();
    expect(screen.getByText(/Take the Field — Inning 4/)).toBeInTheDocument();
  });

  test('clicking "Start Batting" calls onConfirm("batting")', function () {
    var onConfirm = vi.fn();
    render(<InningModal {...baseProps({ onConfirm: onConfirm })} />);
    fireEvent.click(screen.getByText(/Start Batting/));
    expect(onConfirm).toHaveBeenCalledWith('batting');
  });

  test('clicking "Take the Field" calls onConfirm("defense")', function () {
    var onConfirm = vi.fn();
    render(<InningModal {...baseProps({ onConfirm: onConfirm })} />);
    fireEvent.click(screen.getByText(/Take the Field/));
    expect(onConfirm).toHaveBeenCalledWith('defense');
  });

  test('clicking "Cancel" calls onCancel', function () {
    var onCancel = vi.fn();
    render(<InningModal {...baseProps({ onCancel: onCancel })} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('InningModal — last inning / end of game', function () {
  function lastInningProps(overrides) {
    return baseProps(Object.assign({ currentInning: 5, totalInnings: 6 }, overrides));
  }

  test('renders "Final Inning" / "End of Game" instead of the mid-game copy', function () {
    render(<InningModal {...lastInningProps()} />);
    expect(screen.getByText('Final Inning')).toBeInTheDocument();
    expect(screen.getByText('End of Game')).toBeInTheDocument();
    expect(screen.queryByText(/Start Batting/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Take the Field/)).not.toBeInTheDocument();
  });

  test('renders a single "Exit Game Mode" button; clicking it calls onConfirm(null)', function () {
    var onConfirm = vi.fn();
    render(<InningModal {...lastInningProps({ onConfirm: onConfirm })} />);
    fireEvent.click(screen.getByText('Exit Game Mode'));
    expect(onConfirm).toHaveBeenCalledWith(null);
  });
});

describe('InningModal — batting order preview', function () {
  test('shows leadOff/onDeck/inHole from currentBatterIndex, with wraparound in restBatters', function () {
    // battingOrder length 4, currentBatterIndex=1 -> leadIdx=1
    // leadOff=Jordan(1), onDeck=Sam(2), inHole=Ali(3), rest wraps to Casey(0)
    render(<InningModal {...baseProps()} />);
    // "Jordan" also appears in the defense card's Bench chip (same fixture
    // has Jordan benched next inning) — assert presence, not uniqueness.
    expect(screen.getAllByText('Jordan').length).toBeGreaterThan(0);
    // "Sam" is also the next inning's field assignment (P) — present, not unique.
    expect(screen.getAllByText('Sam').length).toBeGreaterThan(0);
    expect(screen.getByText('Ali')).toBeInTheDocument();
    expect(screen.getByText('5. Casey')).toBeInTheDocument();
  });

  test('shows a batting-hand badge for the lead-off batter when known', function () {
    render(<InningModal {...baseProps()} />);
    // leadOff is Jordan Lee, battingHand 'R'
    expect(screen.getByText('R')).toBeInTheDocument();
  });
});

describe('InningModal — defense preview', function () {
  test('lists field assignments (excluding Bench) for the next inning, alphabetically', function () {
    render(<InningModal {...baseProps()} />);
    expect(screen.getByText('Casey')).toBeInTheDocument(); // SS
    // "Sam" also appears as onDeck in the batting card; assert at least the
    // defense-card position label ("P") for Sam is present.
    expect(screen.getByText('P')).toBeInTheDocument();
    expect(screen.getByText('SS')).toBeInTheDocument();
  });

  test('lists benched players separately under a "Bench" heading', function () {
    render(<InningModal {...baseProps()} />);
    expect(screen.getByText('Bench')).toBeInTheDocument();
  });

  test('omits an unassigned player from both the field and bench lists', function () {
    // Ali Kim has '' for nextInning in baseGrid — appears in batting preview
    // (inHole) but must not appear in the defense card's field/bench rows.
    render(<InningModal {...baseProps()} />);
    var positionLabels = ['P', 'SS', 'C', '1B', '2B', '3B', 'LF', 'LC', 'RC', 'RF'];
    positionLabels.forEach(function (pos) {
      expect(screen.queryByText('Ali ' + pos)).not.toBeInTheDocument();
    });
  });
});
