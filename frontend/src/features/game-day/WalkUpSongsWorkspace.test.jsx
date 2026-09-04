import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { WalkUpSongsWorkspace } from './WalkUpSongsWorkspace';

const PLAYERS = [
  { name:'Jordan Lee', order:1, song:'Thunderstruck', artist:'AC/DC', start:'0:45', end:'1:10', notes:'Start after announcement', link:'https://example.com/song' },
  { name:'Sam Diaz', order:2 },
];

describe('WalkUpSongsWorkspace', function () {
  test('renders configured and empty display cards with contemporary actions', function () {
    const onShare = vi.fn(); const onPrint = vi.fn();
    render(<WalkUpSongsWorkspace players={PLAYERS} onShare={onShare} onPrint={onPrint} />);
    expect(screen.getByRole('heading', { name:'Walk-up songs' })).toBeInTheDocument();
    expect(screen.getByText('1 of 2 configured')).toBeInTheDocument();
    expect(screen.getByText('Thunderstruck')).toBeInTheDocument();
    expect(screen.getByText('No song set')).toBeInTheDocument();
    expect(screen.getByRole('link', { name:'Open Jordan song' })).toHaveAttribute('href', 'https://example.com/song');
    fireEvent.click(screen.getByRole('button', { name:'Share list' }));
    fireEvent.click(screen.getByRole('button', { name:'Print list' }));
    expect(onShare).toHaveBeenCalledOnce(); expect(onPrint).toHaveBeenCalledOnce();
  });

  test('edits metadata through one player-and-patch callback', function () {
    const onUpdate = vi.fn();
    render(<WalkUpSongsWorkspace mode="edit" players={PLAYERS} onModeChange={vi.fn()} onUpdate={onUpdate} onShare={vi.fn()} onPrint={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Jordan song title'), { target:{ value:'New song' } });
    expect(onUpdate).toHaveBeenCalledWith('Jordan Lee', { walkUpSong:'New song' });
  });

  test('keeps absent players visible but unavailable for editing', function () {
    render(<WalkUpSongsWorkspace mode="edit" players={[{ ...PLAYERS[0], absent:true }]} onModeChange={vi.fn()} onUpdate={vi.fn()} onShare={vi.fn()} onPrint={vi.fn()} />);
    expect(screen.getByText('Out tonight')).toBeInTheDocument();
    expect(screen.getByLabelText('Jordan song title')).toBeDisabled();
  });

  test('locks the workspace to Game Day view and explains offline limits', function () {
    const { rerender } = render(<WalkUpSongsWorkspace players={PLAYERS} locked offline onShare={vi.fn()} onPrint={vi.fn()} />);
    expect(screen.getByText('Lineup finalized')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name:'Edit' })).not.toBeInTheDocument();
    expect(screen.getByText(/Song details remain available offline/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name:'Share list' })).toBeEnabled();
    rerender(<WalkUpSongsWorkspace players={[]} onShare={vi.fn()} onPrint={vi.fn()} />);
    expect(screen.getByText('Add players to the batting order first.')).toBeInTheDocument();
  });
});
