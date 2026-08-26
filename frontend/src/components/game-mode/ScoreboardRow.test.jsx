import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ScoreboardRow from './ScoreboardRow';

describe('ScoreboardRow', function() {
  it('renders scores from props', function() {
    render(<ScoreboardRow myScore={4} oppScore={2} />);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders team labels from props', function() {
    render(<ScoreboardRow myTeamLabel="MUD HENS" oppLabel="BANANAS" />);
    expect(screen.getByText('MUD HENS')).toBeInTheDocument();
    expect(screen.getByText('BANANAS')).toBeInTheDocument();
  });

  it('shows +1 buttons when isScorer is true and fires callbacks', function() {
    var onMyRun = vi.fn();
    var onOppRun = vi.fn();
    render(
      <ScoreboardRow
        isScorer={true}
        myTeamLabel="TEAM"
        oppLabel="OPP"
        onAddMyRun={onMyRun}
        onAddOppRun={onOppRun}
      />
    );
    var buttons = screen.getAllByText('+1');
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    expect(onMyRun).toHaveBeenCalledTimes(1);
    fireEvent.click(buttons[1]);
    expect(onOppRun).toHaveBeenCalledTimes(1);
  });

  it('hides +1 buttons and shows defaults gracefully when props omitted', function() {
    render(<ScoreboardRow />);
    expect(screen.queryByText('+1')).toBeNull();
    expect(screen.getByText('TEAM')).toBeInTheDocument();
    expect(screen.getByText('OPP')).toBeInTheDocument();
    var zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });

  // ── Slice 2: inning + half-inning indicator ──────────────────────────────────

  it('renders "Top 3rd" when inning=2 and halfInning="top"', function() {
    render(<ScoreboardRow inning={2} halfInning="top" />);
    expect(screen.getByText('Top 3rd')).toBeInTheDocument();
  });

  it('renders "Bot 5th" when inning=4 and halfInning="bottom"', function() {
    render(<ScoreboardRow inning={4} halfInning="bottom" />);
    expect(screen.getByText('Bot 5th')).toBeInTheDocument();
  });

  it('omits inning indicator when inning prop is undefined', function() {
    render(<ScoreboardRow halfInning="top" />);
    expect(screen.queryByText(/^Top |^Bot /)).toBeNull();
  });

  // ── Slice 2 fix-up: onExit prop (Story 50) ───────────────────────────────────

  describe('onExit prop', function() {
    it('renders exit button when onExit is provided', function() {
      render(<ScoreboardRow onExit={vi.fn()} />);
      expect(screen.getByTestId('scoreboard-exit')).toBeInTheDocument();
    });

    it('does not render exit button when onExit is not provided', function() {
      render(<ScoreboardRow />);
      expect(screen.queryByTestId('scoreboard-exit')).toBeNull();
    });

    it('clicking exit button calls onExit exactly once', function() {
      var onExit = vi.fn();
      render(<ScoreboardRow onExit={onExit} />);
      fireEvent.click(screen.getByTestId('scoreboard-exit'));
      expect(onExit).toHaveBeenCalledTimes(1);
    });
  });

  // ── Slice 2 fix-up: isAtBat active-half indicator (#118) ─────────────────────

  describe('isAtBat prop', function() {
    it('shows the pulsing dot next to my team when isAtBat is true', function() {
      render(<ScoreboardRow isAtBat={true} />);
      expect(screen.getByTestId('scoreboard-mine-active-dot')).toBeInTheDocument();
      expect(screen.queryByTestId('scoreboard-opp-active-dot')).toBeNull();
    });

    it('shows the pulsing dot next to the opponent when isAtBat is false', function() {
      render(<ScoreboardRow isAtBat={false} />);
      expect(screen.getByTestId('scoreboard-opp-active-dot')).toBeInTheDocument();
      expect(screen.queryByTestId('scoreboard-mine-active-dot')).toBeNull();
    });

    it('shows no dot when isAtBat is omitted', function() {
      render(<ScoreboardRow />);
      expect(screen.queryByTestId('scoreboard-mine-active-dot')).toBeNull();
      expect(screen.queryByTestId('scoreboard-opp-active-dot')).toBeNull();
    });
  });
});
