import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { BattingWorkspaceHeader } from './BattingWorkspaceHeader';

describe('BattingWorkspaceHeader', function () {
  test('makes Save the single primary action while an order is dirty', function () {
    const onSave = vi.fn();
    const onSuggest = vi.fn();
    render(<BattingWorkspaceHeader dirty orderCount={11} activeCount={10} onSave={onSave} onSuggest={onSuggest} onFinalize={vi.fn()} />);
    expect(screen.getByText('10/11 available tonight')).toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name:'Save Order' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name:'Finalize' })).toBeDisabled();
  });

  test('supports suggest, undo, and finalize when the order is clean', function () {
    const onSuggest = vi.fn(); const onUndo = vi.fn(); const onFinalize = vi.fn();
    render(<BattingWorkspaceHeader orderCount={11} activeCount={11} canUndo onSuggest={onSuggest} onUndo={onUndo} onFinalize={onFinalize} />);
    ['Suggest Order', 'Undo', 'Finalize'].forEach(function (name) { fireEvent.click(screen.getByRole('button', { name })); });
    expect(onSuggest).toHaveBeenCalledOnce(); expect(onUndo).toHaveBeenCalledOnce(); expect(onFinalize).toHaveBeenCalledOnce();
  });

  test('keeps finalized and empty states safe', function () {
    const { rerender } = render(<BattingWorkspaceHeader lineupLocked orderCount={11} activeCount={9} />);
    expect(screen.getByText('Finalized')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<BattingWorkspaceHeader orderCount={0} activeCount={0} onSuggest={vi.fn()} onFinalize={vi.fn()} />);
    expect(screen.getByText('Order needed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name:'Suggest Order' })).toBeDisabled();
  });
});
