/**
 * a11y.test.jsx — Story #1032's "mobile widths and 44px targets are
 * verified" criterion for the Home feature's interactive elements. Real
 * device/viewport testing (mobile-width layout, real touch) needs a
 * browser — this verifies the computed minHeight the primitives actually
 * ship, which is what makes the 44px floor true or false in the first
 * place.
 */
import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompactTeamCard } from './CompactTeamCard.jsx';
import { TeamAction } from './TeamAction.jsx';

var TEAM = {
  id: 't1', name: 'Mud Hens', displayName: 'Mud Hens', season: 'Fall', year: 2026, ageGroup: '8U',
  role: { code: 'admin', label: 'Team Admin / Head Coach' }, nextEvent: null,
};

function minHeightPx(el) {
  return parseFloat(getComputedStyle(el).minHeight);
}

describe('Home feature — 44px touch-target floor', function () {
  test('CompactTeamCard (built on ListRow) meets the 44px floor', function () {
    render(<CompactTeamCard team={TEAM} onExpand={vi.fn()} />);
    expect(minHeightPx(screen.getByRole('button', { name: /Mud Hens/ }))).toBeGreaterThanOrEqual(44);
  });

  test('TeamAction (built on Button) meets the 44px floor when enabled', function () {
    render(<TeamAction action={{ id: 'a', label: 'View roster', href: '/app/teams/t1/roster', enabled: true, disabledReason: null }} onSelect={vi.fn()} />);
    expect(minHeightPx(screen.getByRole('button', { name: 'View roster' }))).toBeGreaterThanOrEqual(44);
  });

  test('TeamAction meets the 44px floor when disabled too — a smaller disabled target would be a worse regression, not an exempt one', function () {
    render(<TeamAction action={{ id: 'a', label: 'Edit lineup', href: '/app/teams/t1/lineups', enabled: false, disabledReason: 'Locked.' }} />);
    expect(minHeightPx(screen.getByRole('button', { name: 'Edit lineup' }))).toBeGreaterThanOrEqual(44);
  });
});
