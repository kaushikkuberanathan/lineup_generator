import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PageHeader, SectionHeader } from './Headers';
import { ReadinessStrip } from './ReadinessStrip';
import { CoachWorkflowRow } from './CoachWorkflowRow';
import { EventCard, HelpRow, PlayerRow } from './WorkflowRows';

describe('coach workflow compositions', function () {
  test('headers use semantic heading levels', function () {
    const { getByRole } = render(<><PageHeader title="My Team" /><SectionHeader title="Upcoming" /></>);
    expect(getByRole('heading', { level: 1, name: 'My Team' })).toBeTruthy();
    expect(getByRole('heading', { level: 2, name: 'Upcoming' })).toBeTruthy();
  });

  test('readiness strip announces roster and lineup status', function () {
    const { getByRole } = render(<ReadinessStrip confirmedCount={9} rosterCount={11} lineupStatus="ready" />);
    expect(getByRole('status')).toHaveTextContent('9/11 confirmed');
    expect(getByRole('status')).toHaveTextContent('Lineup ready');
  });

  test('workflow row remains callback-driven', function () {
    const onClick = vi.fn();
    const { getByRole } = render(<CoachWorkflowRow icon="calendar" title="Next game" subtitle="Saturday at 10:00 AM" onClick={onClick} />);
    getByRole('button', { name: /Next game/ }).click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  test('named workflow compositions preserve domain labels', function () {
    const { getByRole } = render(<><EventCard title="vs Braves" detail="Saturday" /><PlayerRow name="Aiden" detail="Shortstop" /><HelpRow title="Build a lineup" summary="Step by step" /></>);
    expect(getByRole('button', { name: /vs Braves/ })).toBeTruthy();
    expect(getByRole('button', { name: /Aiden/ })).toBeTruthy();
    expect(getByRole('button', { name: /Build a lineup/ })).toBeTruthy();
  });
});
