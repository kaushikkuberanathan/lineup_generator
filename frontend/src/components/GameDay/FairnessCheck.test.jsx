import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FairnessCheck } from './FairnessCheck';

// ============================================================================
// FairnessCheck.jsx (94 lines) — post-finalization fairness signal card,
// previously with zero test coverage. Covers each of the four independent
// pass/fail checks (bench > once, position balance, back-to-back catching,
// catches > once) in isolation and in combination, plus the all-pass state,
// first-violator-only surfacing, and the empty-roster edge case.
// ============================================================================

describe('FairnessCheck', function () {
  test('all checks pass: renders the passed header and all four pass lines', function () {
    var roster = [{ name: 'Alice' }, { name: 'Bob' }];
    var grid = {
      Alice: ['P', '1B', 'OF'],
      Bob: ['C', '1B', 'OF'],
    };
    render(<FairnessCheck roster={roster} grid={grid} />);

    expect(screen.getByText('✅ Fairness Check Passed')).toBeInTheDocument();
    expect(screen.getByText('✅ No player benched more than once')).toBeInTheDocument();
    expect(screen.getByText('✅ Positions balanced')).toBeInTheDocument();
    expect(screen.getByText('✅ No back-to-back catching')).toBeInTheDocument();
    expect(screen.getByText('✅ No player catches more than once')).toBeInTheDocument();
  });

  test('checkA violation: a player benched more than once', function () {
    var roster = [{ name: 'Alice' }, { name: 'Bob' }];
    var grid = {
      Alice: ['Bench', 'P', 'Bench'],
      Bob: ['C', '1B', 'OF'],
    };
    render(<FairnessCheck roster={roster} grid={grid} />);

    expect(screen.getByText(/⚠️ Fairness Check — 1 issue/)).toBeInTheDocument();
    expect(screen.getByText('❌ Alice is benched 2 times — no player should bench more than once')).toBeInTheDocument();
    // the other three checks remain isolated passes
    expect(screen.getByText('✅ Positions balanced')).toBeInTheDocument();
    expect(screen.getByText('✅ No back-to-back catching')).toBeInTheDocument();
    expect(screen.getByText('✅ No player catches more than once')).toBeInTheDocument();
  });

  test('checkB violation: positions imbalanced beyond the 2x-average threshold', function () {
    var roster = [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Carol' }];
    var grid = {
      Alice: ['P', 'P', 'P', 'P'],
      Bob: ['OF', 'OF', 'OF', 'OF'],
      Carol: ['OF', 'OF', 'OF', 'OF'],
    };
    render(<FairnessCheck roster={roster} grid={grid} />);

    expect(screen.getByText(/⚠️ Fairness Check — 1 issue/)).toBeInTheDocument();
    // checkB's label text is static regardless of pass/fail — only the icon flips
    expect(screen.getByText('❌ Positions balanced')).toBeInTheDocument();
    expect(screen.getByText('✅ No player benched more than once')).toBeInTheDocument();
    expect(screen.getByText('✅ No back-to-back catching')).toBeInTheDocument();
    expect(screen.getByText('✅ No player catches more than once')).toBeInTheDocument();
  });

  test('checkD-only violation: a player catches more than once, non-consecutively', function () {
    var roster = [{ name: 'Alice' }, { name: 'Bob' }];
    var grid = {
      Alice: ['C', '1B', 'C'],
      Bob: ['1B', 'OF', '1B'],
    };
    render(<FairnessCheck roster={roster} grid={grid} />);

    expect(screen.getByText(/⚠️ Fairness Check — 1 issue/)).toBeInTheDocument();
    expect(screen.getByText('❌ Alice catches 2 innings — catcher should only catch once per game')).toBeInTheDocument();
    expect(screen.getByText('✅ No back-to-back catching')).toBeInTheDocument();
    expect(screen.getByText('✅ Positions balanced')).toBeInTheDocument();
    expect(screen.getByText('✅ No player benched more than once')).toBeInTheDocument();
  });

  test('checkC+checkD combined: back-to-back catching also trips the catches-more-than-once check', function () {
    var roster = [{ name: 'Alice' }, { name: 'Bob' }];
    var grid = {
      Alice: ['C', 'C', '1B'],
      Bob: ['1B', 'OF', '1B'],
    };
    render(<FairnessCheck roster={roster} grid={grid} />);

    expect(screen.getByText(/⚠️ Fairness Check — 2 issues/)).toBeInTheDocument();
    expect(screen.getByText('❌ Alice catches back-to-back innings — rotate the catcher each inning')).toBeInTheDocument();
    expect(screen.getByText('❌ Alice catches 2 innings — catcher should only catch once per game')).toBeInTheDocument();
    expect(screen.getByText('✅ No player benched more than once')).toBeInTheDocument();
    expect(screen.getByText('✅ Positions balanced')).toBeInTheDocument();
  });

  test('first-violator-only surfacing: only the first offending player is named when several violate the same check', function () {
    var roster = [{ name: 'Alice' }, { name: 'Bob' }];
    var grid = {
      Alice: ['Bench', 'P', 'Bench'],
      Bob: ['Bench', '1B', 'Bench'],
    };
    render(<FairnessCheck roster={roster} grid={grid} />);

    expect(screen.getByText('❌ Alice is benched 2 times — no player should bench more than once')).toBeInTheDocument();
    expect(screen.queryByText(/Bob is benched/)).not.toBeInTheDocument();
  });

  test('empty roster: renders the all-pass state with no errors', function () {
    render(<FairnessCheck roster={[]} grid={{}} />);

    expect(screen.getByText('✅ Fairness Check Passed')).toBeInTheDocument();
    expect(screen.getByText('✅ No player benched more than once')).toBeInTheDocument();
    expect(screen.getByText('✅ Positions balanced')).toBeInTheDocument();
    expect(screen.getByText('✅ No back-to-back catching')).toBeInTheDocument();
    expect(screen.getByText('✅ No player catches more than once')).toBeInTheDocument();
  });
});
