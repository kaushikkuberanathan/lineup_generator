import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamAction } from './TeamAction';

describe('TeamAction', function () {
  test('renders nothing for a null action', function () {
    var { container } = render(<TeamAction action={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('an enabled action renders as a clickable control and calls onSelect with the action', function () {
    var onSelect = vi.fn();
    var action = { id: 'view_roster', label: 'View Mud Hens roster', href: '/app/teams/t1/roster', enabled: true, disabledReason: null };
    render(<TeamAction action={action} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'View Mud Hens roster' }));
    expect(onSelect).toHaveBeenCalledWith(action);
  });

  test('a disabled action is not clickable and shows its reason', function () {
    var onSelect = vi.fn();
    var action = { id: 'edit_lineup', label: 'Edit lineup', href: '/app/teams/t1/lineups', enabled: false, disabledReason: 'Lineup is locked for this game.' };
    render(<TeamAction action={action} onSelect={onSelect} />);
    var button = screen.getByRole('button', { name: 'Edit lineup' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText('Lineup is locked for this game.')).toBeInTheDocument();
  });

  test('a disabled action with no reason renders no reason text', function () {
    var action = { id: 'x', label: 'X', href: '/app/teams/t1', enabled: false, disabledReason: null };
    render(<TeamAction action={action} />);
    expect(screen.queryByText(/./, { selector: 'p' })).toBeNull();
  });

  test('primary marks one emphasized action while supporting actions stay outlined', function () {
    var { rerender } = render(<TeamAction primary action={{ id: 'start_game_mode', label: 'Start Game Mode', enabled: true, href: '#' }} />);
    expect(screen.getByRole('button').style.background).toBe('rgb(245, 200, 66)');
    rerender(<TeamAction action={{ id: 'manage_roster', label: 'Manage roster', enabled: true, href: '#' }} />);
    expect(screen.getByRole('button').style.background).toBe('rgb(255, 255, 255)');
  });
});
