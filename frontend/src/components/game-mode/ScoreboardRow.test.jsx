import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ScoreboardRow from './ScoreboardRow';

describe('ScoreboardRow', () => {
  it('renders scores from props', () => {
    render(<ScoreboardRow myScore={4} oppScore={2} />);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders team labels from props', () => {
    render(<ScoreboardRow myTeamLabel="MUD HENS" oppLabel="BANANAS" />);
    expect(screen.getByText('MUD HENS')).toBeInTheDocument();
    expect(screen.getByText('BANANAS')).toBeInTheDocument();
  });

  it('shows +1 buttons when isScorer is true and fires callbacks', () => {
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

  it('hides +1 buttons and shows defaults gracefully when props omitted', () => {
    render(<ScoreboardRow />);
    expect(screen.queryByText('+1')).toBeNull();
    // Default labels and scores render without crashing
    expect(screen.getByText('TEAM')).toBeInTheDocument();
    expect(screen.getByText('OPP')).toBeInTheDocument();
    var zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });
});
