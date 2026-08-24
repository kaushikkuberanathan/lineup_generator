import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiamondView } from './DiamondView';

// ============================================================================
// DiamondView.jsx (204 lines) — the SVG baseball diamond rendering all 10
// defensive positions for a given inning in Game Mode, previously with zero
// test coverage. Covers assigned vs. unassigned position rendering, correct
// per-inning lookup, tap-to-select wiring, and all 10 positions rendering.
// ============================================================================

describe('DiamondView', function () {
  function noop() {}

  test('an assigned position renders the initial, first name, and (POS) abbreviation', function () {
    var roster = [{ name: 'Alice Smith' }];
    var grid = { 'Alice Smith': ['C'] };
    render(<DiamondView roster={roster} grid={grid} inning={0} onTapPosition={noop} />);

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('(C)')).toBeInTheDocument();
  });

  test('an unassigned position renders the dashed placeholder with the bare position key', function () {
    render(<DiamondView roster={[]} grid={{}} inning={0} onTapPosition={noop} />);

    expect(screen.getByText('SS')).toBeInTheDocument();
    expect(screen.queryByText('(SS)')).not.toBeInTheDocument();
  });

  test('all 10 defensive positions render when nothing is assigned', function () {
    render(<DiamondView roster={[]} grid={{}} inning={0} onTapPosition={noop} />);

    ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'LC', 'RC', 'RF'].forEach(function (key) {
      expect(screen.getByText(key)).toBeInTheDocument();
    });
  });

  test('per-inning lookup: a player assigned in a later inning does not show in an earlier one', function () {
    var roster = [{ name: 'Dana Lee' }];
    var grid = { 'Dana Lee': ['Bench', 'SS'] };
    var view = render(<DiamondView roster={roster} grid={grid} inning={0} onTapPosition={noop} />);

    expect(screen.getByText('SS')).toBeInTheDocument();
    expect(screen.queryByText('Dana')).not.toBeInTheDocument();

    view.rerender(<DiamondView roster={roster} grid={grid} inning={1} onTapPosition={noop} />);

    expect(screen.getByText('Dana')).toBeInTheDocument();
    expect(screen.getByText('(SS)').closest('svg')).toBeInTheDocument();
  });

  test('tapping an assigned position calls onTapPosition with that position key', function () {
    var onTapPosition = vi.fn();
    var roster = [{ name: 'Eve' }];
    var grid = { Eve: ['1B'] };
    render(<DiamondView roster={roster} grid={grid} inning={0} onTapPosition={onTapPosition} />);

    fireEvent.click(screen.getByText('Eve'));
    expect(onTapPosition).toHaveBeenCalledWith('1B');
  });

  test('tapping an unassigned position calls onTapPosition with that position key', function () {
    var onTapPosition = vi.fn();
    render(<DiamondView roster={[]} grid={{}} inning={0} onTapPosition={onTapPosition} />);

    fireEvent.click(screen.getByText('RF'));
    expect(onTapPosition).toHaveBeenCalledWith('RF');
  });

  test('an empty-string roster name still renders (assigned but no name to show)', function () {
    var roster = [{ name: '' }];
    var grid = { '': ['C'] };
    render(<DiamondView roster={roster} grid={grid} inning={0} onTapPosition={noop} />);

    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('(C)')).toBeInTheDocument();
  });
});
