import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { DefenseWorkspaceHeader } from './DefenseWorkspaceHeader';

function props(overrides = {}) {
  return {
    availableCount:10,
    rosterCount:11,
    issueCount:2,
    hasLastAutoGrid:true,
    onAutoAssign:vi.fn(),
    onCheck:vi.fn(),
    onAutoFix:vi.fn(),
    onRevert:vi.fn(),
    onClear:vi.fn(),
    onFinalize:vi.fn(),
    onToggleDiamond:vi.fn(),
    onGridViewChange:vi.fn(),
    ...overrides,
  };
}

describe('DefenseWorkspaceHeader', function () {
  test('offers one primary assignment action and preserves every defense command', function () {
    const p = props();
    render(<DefenseWorkspaceHeader {...p} />);
    expect(screen.getByText('10/11 players available')).toBeInTheDocument();
    expect(screen.getByText('2 issues')).toBeInTheDocument();
    ['Auto-Assign', 'Review issues', 'Auto-Fix All', 'Revert', 'Clear', 'Finalize'].forEach(function (name) {
      fireEvent.click(screen.getByRole('button', { name }));
    });
    expect(p.onAutoAssign).toHaveBeenCalledOnce();
    expect(p.onCheck).toHaveBeenCalledOnce();
    expect(p.onAutoFix).toHaveBeenCalledOnce();
    expect(p.onRevert).toHaveBeenCalledOnce();
    expect(p.onClear).toHaveBeenCalledOnce();
    expect(p.onFinalize).toHaveBeenCalledOnce();
  });

  test('keeps diamond and table-view controls available when finalized', function () {
    const p = props({ lineupLocked:true, showDiamond:true, gridView:'player' });
    render(<DefenseWorkspaceHeader {...p} />);
    expect(screen.getByText('Finalized')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name:'Auto-Assign' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name:'Hide diamond' }));
    fireEvent.click(screen.getByRole('button', { name:'By position' }));
    expect(p.onToggleDiamond).toHaveBeenCalledOnce();
    expect(p.onGridViewChange).toHaveBeenCalledWith('position');
  });

  test('disables assignment when fewer than nine players are available', function () {
    render(<DefenseWorkspaceHeader {...props({ availableCount:8, rosterCount:8, issueCount:0, hasLastAutoGrid:false })} />);
    expect(screen.getByRole('button', { name:'Auto-Assign' })).toBeDisabled();
    expect(screen.getByText('Ready to review')).toBeInTheDocument();
  });
});
