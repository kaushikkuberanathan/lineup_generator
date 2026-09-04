import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ScheduleScreen } from './ScheduleScreen';

describe('ScheduleScreen #1089', function () {
  test('prioritizes the next game and keeps one clear Game Day action', function () {
    const openGameDay = vi.fn();
    render(<ScheduleScreen nextGame={{ opponent:'River Cats', date:'2026-09-12', time:'10:00 AM', location:'Field 2', home:true }} onOpenGameDay={openGameDay} scheduleContent={<div>Game list</div>} practices={[]} />);
    expect(screen.getByRole('heading', { name:'Schedule' })).toBeInTheDocument();
    expect(screen.getByText('vs. River Cats')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name:'Open Game Day' }));
    expect(openGameDay).toHaveBeenCalledTimes(1);
  });

  test('shows empty and practice states', function () {
    render(<ScheduleScreen practices={[{ id:'p1', title:'Fielding Practice', date:'2026-09-14', location:'Field 3' }]} scheduleContent={<div>No games</div>} />);
    expect(screen.getByText('No upcoming game')).toBeInTheDocument();
    expect(screen.getByText('Fielding Practice')).toBeInTheDocument();
    expect(screen.getByText(/Field 3/)).toBeInTheDocument();
  });
});
