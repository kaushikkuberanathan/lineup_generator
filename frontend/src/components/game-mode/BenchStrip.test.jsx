import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BenchStrip } from './BenchStrip';

// BenchStrip.jsx had zero test coverage anywhere in the repo despite being a
// live, migrated component (Story 133 token migration, PR #705). Found during
// the #406/#410 test-health survey (Pass 4).

describe('BenchStrip', () => {

  test('renders the "Bench" label', () => {
    render(<BenchStrip benchPlayers={['Aiden', 'Benji']} />);
    expect(screen.getByText('Bench')).toBeInTheDocument();
  });

  test('empty bench renders the em-dash placeholder, not a player list', () => {
    render(<BenchStrip benchPlayers={[]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  test('renders one pill per benched player, in order', () => {
    render(<BenchStrip benchPlayers={['Aiden', 'Benji', 'Cassius']} />);
    expect(screen.getByText('Aiden')).toBeInTheDocument();
    expect(screen.getByText('Benji')).toBeInTheDocument();
    expect(screen.getByText('Cassius')).toBeInTheDocument();
  });

  test('single benched player renders exactly one pill', () => {
    render(<BenchStrip benchPlayers={['Aiden']} />);
    expect(screen.getByText('Aiden')).toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  test('duplicate names do not crash the list (React key collision tolerated)', () => {
    expect(function () {
      render(<BenchStrip benchPlayers={['Aiden', 'Aiden']} />);
    }).not.toThrow();
    expect(screen.getAllByText('Aiden')).toHaveLength(2);
  });
});
