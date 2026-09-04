import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { ActionRow } from './ActionRow';
import { IconAction } from './IconAction';
import { SearchField } from './SearchField';
import { SegmentedControl } from './SegmentedControl';
import { StatusPill } from './StatusPill';

describe('contemporary action and status primitives', function () {
  test('ActionRow is a 44px outlined action with semantic icon and chevron', function () {
    const { getByRole, container } = render(<ActionRow icon="team" label="Manage team" onClick={vi.fn()} />);
    expect(getByRole('button', { name: 'Manage team' }).style.minHeight).toBe('44px');
    expect(container.querySelectorAll('svg')).toHaveLength(2);
  });

  test('IconAction requires a visible accessible name', function () {
    const { getByRole } = render(<IconAction icon="overflow" label="More team actions" />);
    expect(getByRole('button', { name: 'More team actions' })).toBeTruthy();
  });

  test('StatusPill maps ready status to restrained success treatment', function () {
    const { getByText } = render(<StatusPill status="ready">Ready</StatusPill>);
    expect(getByText('Ready').closest('[data-status]')).toHaveAttribute('data-status', 'ready');
  });

  test('SegmentedControl exposes pressed state and callbacks', function () {
    const onChange = vi.fn();
    const { getByRole } = render(<SegmentedControl value="focused" onChange={onChange} options={[{ value: 'focused', label: 'Focused' }, { value: 'all', label: 'All teams' }]} />);
    expect(getByRole('button', { name: 'Focused' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(getByRole('button', { name: 'All teams' }));
    expect(onChange).toHaveBeenCalledWith('all');
  });

  test('SearchField provides a labeled 44px input', function () {
    const { getByRole } = render(<SearchField label="Search teams" value="Mud" onChange={vi.fn()} />);
    expect(getByRole('searchbox', { name: 'Search teams' }).style.minHeight).toBe('44px');
  });
});
