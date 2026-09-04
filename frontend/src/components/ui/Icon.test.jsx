import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Icon, ICON_NAMES } from './Icon';

describe('Icon semantic registry', function () {
  test('exposes the catalog needed by the first migration waves', function () {
    expect(ICON_NAMES).toEqual(expect.arrayContaining([
      'home', 'team', 'calendar', 'gameDay', 'support', 'add', 'player',
      'lineup', 'roster', 'settings', 'share', 'chevronRight', 'overflow',
      'success', 'attention', 'baseball',
      'edit', 'delete', 'close', 'download', 'upload', 'music', 'lock',
      'unlock', 'view', 'info', 'externalLink',
    ]));
  });

  test('every registered semantic icon renders as an SVG', function () {
    ICON_NAMES.forEach(function (name) {
      var { container, unmount } = render(<Icon name={name} />);
      expect(container.querySelector('svg'), name).not.toBeNull();
      unmount();
    });
  });

  test.each([['sm', '16'], ['md', '20'], ['lg', '24']])('maps %s to the shared pixel size', function (size, pixels) {
    var { container } = render(<Icon name="lineup" size={size} />);
    expect(container.querySelector('svg')).toHaveAttribute('width', pixels);
  });

  test('decorative icons are hidden from assistive technology by default', function () {
    var { container } = render(<Icon name="home" />);
    var svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
  });

  test('a labeled icon exposes an image role and accessible name', function () {
    render(<Icon name="calendar" label="Schedule" />);
    expect(screen.getByRole('img', { name: 'Schedule' })).toBeInTheDocument();
  });

  test('size tokens and inherited color are applied consistently', function () {
    var { container } = render(<Icon name="team" size="lg" />);
    var svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
    expect(svg).toHaveAttribute('color', 'currentColor');
  });

  test('unknown names fail safely without crashing rendering', function () {
    var error = vi.spyOn(console, 'error').mockImplementation(function () {});
    var { container } = render(<Icon name="not-real" />);

    expect(container.firstChild).toBeNull();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
