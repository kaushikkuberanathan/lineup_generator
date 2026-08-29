import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BattingOrderStrip } from './index';

describe('BattingOrderStrip', () => {
  it('renders empty-state copy when battingOrder is empty', () => {
    render(<BattingOrderStrip battingOrder={[]} currentBatterIndex={0} />);
    expect(screen.getByTestId('bos-empty')).toBeInTheDocument();
    expect(screen.getByText(/no batters/i)).toBeInTheDocument();
  });

  it('renders the full lineup as current, on-deck, in-hole and upcoming swipe cards', () => {
    var order = ['Aiden', 'Benji', 'Cassius', 'Connor', 'Ezra'];
    render(<BattingOrderStrip battingOrder={order} currentBatterIndex={0} />);
    expect(screen.getByTestId('bos-now')).toHaveTextContent('Aiden');
    expect(screen.getByTestId('bos-on-deck')).toHaveTextContent('Benji');
    expect(screen.getByTestId('bos-in-hole')).toHaveTextContent('Cassius');
    expect(screen.getByTestId('bos-up-4')).toHaveTextContent('Connor');
    expect(screen.getByTestId('bos-up-4')).toHaveTextContent('Up 4th');
    expect(screen.getByTestId('bos-up-5')).toHaveTextContent('Ezra');
    expect(screen.queryByTestId('bos-more')).toBeNull();
    expect(screen.getByRole('region', { name: 'Batting order' })).toHaveStyle({ overflowX: 'auto' });
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

  it('rotates every upcoming batter after the active index', () => {
    var order = ['Aiden', 'Benji', 'Cassius', 'Connor'];
    render(<BattingOrderStrip battingOrder={order} currentBatterIndex={2} />);
    expect(screen.getByTestId('bos-now')).toHaveTextContent('Cassius');
    expect(screen.getByTestId('bos-on-deck')).toHaveTextContent('Connor');
    expect(screen.getByTestId('bos-in-hole')).toHaveTextContent('Aiden');
    expect(screen.getByTestId('bos-up-4')).toHaveTextContent('Benji');
  });

  it('renders correctly with pre-filtered absent-removed input', () => {
    var filtered = ['Connor', 'Ezra', 'Jackson'];
    render(<BattingOrderStrip battingOrder={filtered} currentBatterIndex={1} />);
    expect(screen.getByTestId('bos-now')).toHaveTextContent('Ezra');
    expect(screen.getByTestId('bos-on-deck')).toHaveTextContent('Jackson');
    expect(screen.getByTestId('bos-in-hole')).toHaveTextContent('Connor');
  });

  // ── #128: batting-hand badges (parity with NowBattingBar) ──────────────────

  describe('batting-hand badges (#128)', () => {
    var roster = [
      { name: 'Aiden', battingHand: 'L' },
      { name: 'Benji', battingHand: 'R' },
      { name: 'Cassius' }, // no battingHand set — should show no badge
    ];

    it('shows an L badge for a left-handed batter when roster is passed', () => {
      render(<BattingOrderStrip battingOrder={['Aiden', 'Benji', 'Cassius']} currentBatterIndex={0} roster={roster} />);
      expect(screen.getByTestId('bos-now')).toHaveTextContent('L');
    });

    it('shows an R badge for a right-handed on-deck batter', () => {
      render(<BattingOrderStrip battingOrder={['Aiden', 'Benji', 'Cassius']} currentBatterIndex={0} roster={roster} />);
      expect(screen.getByTestId('bos-on-deck')).toHaveTextContent('R');
    });

    it('shows no badge for a batter with no battingHand set', () => {
      render(<BattingOrderStrip battingOrder={['Aiden', 'Benji', 'Cassius']} currentBatterIndex={0} roster={roster} />);
      expect(screen.getByTestId('bos-in-hole')).not.toHaveTextContent('U');
      expect(screen.getByTestId('bos-in-hole')).toHaveTextContent('Cassius');
    });

    it('shows no badge for anyone when roster is not passed (backward compatible)', () => {
      render(<BattingOrderStrip battingOrder={['Aiden', 'Benji', 'Cassius']} currentBatterIndex={0} />);
      expect(screen.getByTestId('bos-now')).not.toHaveTextContent('L');
      expect(screen.getByTestId('bos-now')).toHaveTextContent('Aiden');
    });
  });
});
