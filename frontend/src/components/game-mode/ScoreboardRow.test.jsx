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
});
