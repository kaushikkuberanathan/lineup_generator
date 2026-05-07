import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from './EmptyState';

// ============================================================================
// R1 Roster Polish — EmptyState token characterization tests
//
// These tests lock in the rendered style values that map to design tokens:
//   button background  → tokens.color.brand.navy   (#0f1f3d)
//   subtitle color     → tokens.color.text.disabled (#9ca3af)
//   button borderRadius→ tokens.radius.md           (8px)
//   button fontSize    → tokens.font.size.body      (13px)
//   subtitle fontSize  → tokens.font.size.sm        (12px)
//
// RED→GREEN protocol: values already match tokens, so GREEN is expected on
// first run. Mutation test (inject wrong value → RED, restore → GREEN) is
// the required RED evidence per CLAUDE.md §RED Checkpoint.
// ============================================================================

describe('EmptyState — R1 token characterization', function () {

  // ── Functional: content and interactivity ─────────────────────────────────

  test('R1.1: no-query state renders correct heading', function () {
    render(<EmptyState hasQuery={false} onCreateTeam={() => {}} />);
    expect(screen.getByText('No teams yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first team to get started.')).toBeInTheDocument();
  });

  test('R1.2: has-query state renders correct heading', function () {
    render(<EmptyState hasQuery={true} onCreateTeam={() => {}} />);
    expect(screen.getByText('No teams found')).toBeInTheDocument();
    expect(screen.getByText('Try a different search, or create a new team.')).toBeInTheDocument();
  });

  test('R1.3: button fires onCreateTeam on click', function () {
    var handler = vi.fn();
    render(<EmptyState hasQuery={false} onCreateTeam={handler} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // ── Style: values must match token equivalents ────────────────────────────

  test('R1.4: button border-radius is 8px (tokens.radius.md)', function () {
    var { container } = render(<EmptyState hasQuery={false} onCreateTeam={() => {}} />);
    var btn = container.querySelector('button');
    expect(btn).not.toBeNull();
    expect(btn.style.borderRadius).toBe('8px');
  });

  test('R1.5: button font-size is 13px (tokens.font.size.body)', function () {
    var { container } = render(<EmptyState hasQuery={false} onCreateTeam={() => {}} />);
    var btn = container.querySelector('button');
    expect(btn.style.fontSize).toBe('13px');
  });

  test('R1.6: subtitle font-size is 12px (tokens.font.size.sm)', function () {
    render(<EmptyState hasQuery={false} onCreateTeam={() => {}} />);
    var subtitle = screen.getByText('Create your first team to get started.');
    expect(subtitle.style.fontSize).toBe('12px');
  });

  test('R1.7: button background is brand navy (tokens.color.brand.navy = #0f1f3d)', function () {
    var { container } = render(<EmptyState hasQuery={false} onCreateTeam={() => {}} />);
    var btn = container.querySelector('button');
    // JSDOM normalizes hex to rgb(); #0f1f3d = rgb(15, 31, 61)
    expect(btn.style.background).toBe('rgb(15, 31, 61)');
  });

  test('R1.8: subtitle color is text-disabled (tokens.color.text.disabled = #9ca3af)', function () {
    render(<EmptyState hasQuery={false} onCreateTeam={() => {}} />);
    var subtitle = screen.getByText('Create your first team to get started.');
    // JSDOM normalizes hex to rgb(); #9ca3af = rgb(156, 163, 175)
    expect(subtitle.style.color).toBe('rgb(156, 163, 175)');
  });

});
