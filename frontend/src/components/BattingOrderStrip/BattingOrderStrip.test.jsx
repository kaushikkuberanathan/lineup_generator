import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BattingOrderStrip } from './index';

describe('BattingOrderStrip', () => {
  it('renders empty-state copy when battingOrder is empty', () => {
    render(<BattingOrderStrip battingOrder={[]} currentBatterIndex={0} />);
    expect(screen.getByTestId('bos-empty')).toBeInTheDocument();
    expect(screen.getByText(/no batters/i)).toBeInTheDocument();
  });

  it('renders current, on-deck, in-hole and +N more badge for 4+ batters', () => {
    var order = ['Aiden', 'Benji', 'Cassius', 'Connor'];
    render(<BattingOrderStrip battingOrder={order} currentBatterIndex={0} />);
    expect(screen.getByTestId('bos-now')).toHaveTextContent('Aiden');
    expect(screen.getByTestId('bos-on-deck')).toHaveTextContent('Benji');
    expect(screen.getByTestId('bos-in-hole')).toHaveTextContent('Cassius');
    expect(screen.getByTestId('bos-more')).toHaveTextContent('+1 more');
  });

  it('highlights current batter at currentBatterIndex', () => {
    var order = ['Aiden', 'Benji', 'Cassius'];
    render(<BattingOrderStrip battingOrder={order} currentBatterIndex={1} />);
    expect(screen.getByTestId('bos-now')).toHaveTextContent('Benji');
    expect(screen.getByTestId('bos-on-deck')).toHaveTextContent('Cassius');
    expect(screen.getByTestId('bos-in-hole')).toHaveTextContent('Aiden');
  });

  it('wraps currentBatterIndex when it exceeds length', () => {
    var order = ['Aiden', 'Benji', 'Cassius'];
    // index 3 % 3 = 0 → Aiden is Now Batting
    render(<BattingOrderStrip battingOrder={order} currentBatterIndex={3} />);
    expect(screen.getByTestId('bos-now')).toHaveTextContent('Aiden');
  });

  it('handles single-batter list showing current only', () => {
    render(<BattingOrderStrip battingOrder={['Ezra']} currentBatterIndex={0} />);
    expect(screen.getByTestId('bos-now')).toHaveTextContent('Ezra');
    expect(screen.queryByTestId('bos-on-deck')).toBeNull();
    expect(screen.queryByTestId('bos-in-hole')).toBeNull();
    expect(screen.queryByTestId('bos-more')).toBeNull();
  });

  it('renders correctly with pre-filtered absent-removed input', () => {
    var filtered = ['Connor', 'Ezra', 'Jackson'];
    render(<BattingOrderStrip battingOrder={filtered} currentBatterIndex={1} />);
    expect(screen.getByTestId('bos-now')).toHaveTextContent('Ezra');
    expect(screen.getByTestId('bos-on-deck')).toHaveTextContent('Jackson');
    expect(screen.getByTestId('bos-in-hole')).toHaveTextContent('Connor');
  });
});
