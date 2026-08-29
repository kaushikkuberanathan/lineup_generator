import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UpdatesTab } from './UpdatesTab';

const history = [
  { version: '2.0.0', date: 'Aug 29', headline: 'Current headline', userChanges: ['Visible change'], techNote: 'Internal note' },
  { version: '1.0.0', date: 'Aug 1', headline: 'Older headline', userChanges: [] },
];

function renderTab(overrides = {}) {
  const props = {
    versionHistory: history,
    appVersion: '2.0.0',
    expandedVersion: null,
    onExpandedVersionChange: vi.fn(),
    sectionTitleStyle: {},
    ...overrides,
  };
  return { ...render(<UpdatesTab {...props} />), props };
}

describe('UpdatesTab', () => {
  it('renders versions and marks only the current version', () => {
    renderTab();
    expect(screen.getByText("What's New")).toBeTruthy();
    expect(screen.getByText('v2.0.0')).toBeTruthy();
    expect(screen.getByText('v1.0.0')).toBeTruthy();
    expect(screen.getAllByText('Current')).toHaveLength(1);
  });

  it('keeps details collapsed until the controlled version is open', () => {
    const { rerender, props } = renderTab();
    expect(screen.queryByText('Current headline')).toBeNull();
    rerender(<UpdatesTab {...props} expandedVersion="2.0.0" />);
    expect(screen.getByText('Current headline')).toBeTruthy();
    expect(screen.getByText('Visible change')).toBeTruthy();
    expect(screen.getByText(/Internal note/)).toBeTruthy();
  });

  it('requests expansion and collapse through the controlled callback', () => {
    const open = renderTab();
    fireEvent.click(screen.getByText('v2.0.0'));
    expect(open.props.onExpandedVersionChange).toHaveBeenCalledWith('2.0.0');
    open.unmount();

    const close = renderTab({ expandedVersion: '2.0.0' });
    fireEvent.click(screen.getByText('v2.0.0'));
    expect(close.props.onExpandedVersionChange).toHaveBeenCalledWith(null);
  });
});
