import React from 'react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ============================================================================
// Story 124 (#655) — Home tab team search. Zero prior coverage; new component.
// Covers loading/error/empty/populated/offline states per the search skill
// guidance (empty state must include a real next step, not a dead end).
//
// Uses fake timers to control the 400ms debounce deterministically. Testing
// Library's waitFor() polls with real timers and hangs under vi.useFakeTimers,
// so state settling is driven explicitly via act() + advanceTimersByTimeAsync.
// ============================================================================

import { TeamSearch } from './TeamSearch';

function baseProps(overrides) {
  return Object.assign({ isOnline: true, onSelectTeam: vi.fn() }, overrides);
}

beforeEach(function () {
  vi.useFakeTimers();
});

afterEach(function () {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function typeAndSettle(input, value) {
  fireEvent.change(input, { target: { value } });
  await act(async () => { await vi.advanceTimersByTimeAsync(400); });
}

async function flush() {
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
}

describe('TeamSearch — idle and query gating', function () {
  test('renders idle guidance with no fetch call before a query is entered', function () {
    var fetchSpy = vi.spyOn(global, 'fetch');
    render(<TeamSearch {...baseProps()} />);
    expect(screen.getByText(/enter a team name/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('a 1-character query does not trigger a search (below MIN_QUERY_LENGTH)', async function () {
    var fetchSpy = vi.spyOn(global, 'fetch');
    render(<TeamSearch {...baseProps()} />);
    await typeAndSettle(screen.getByLabelText(/team name/i), 'M');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('TeamSearch — loading, populated, empty', function () {
  test('shows Searching… while the request is in flight, then renders results', async function () {
    var deferred;
    var fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(function () {
      return new Promise(function (resolve) { deferred = resolve; });
    });

    render(<TeamSearch {...baseProps()} />);
    fireEvent.change(screen.getByLabelText(/team name/i), { target: { value: 'Mud' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });

    expect(screen.getByText(/searching/i)).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toContain('/api/v1/teams/search');
    expect(fetchSpy.mock.calls[0][0]).toContain('q=Mud');

    deferred({ ok: true, json: () => Promise.resolve([
      { id: '1', name: 'Mud Hens', age_group: '8U', sport: 'baseball', year: 2026 },
    ]) });
    await flush();

    expect(screen.getByText('Mud Hens')).toBeInTheDocument();
    expect(screen.getByText(/8U.*baseball.*2026/)).toBeInTheDocument();
  });

  test('empty result set shows "No teams found" with a real next step, not a dead end', async function () {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
    render(<TeamSearch {...baseProps()} />);
    await typeAndSettle(screen.getByLabelText(/team name/i), 'Nonexistent');
    await flush();

    expect(screen.getByText(/no teams found/i)).toBeInTheDocument();
    expect(screen.getByText(/ask your head coach/i)).toBeInTheDocument();
  });

  test('selecting a result calls onSelectTeam with the full team object', async function () {
    var onSelectTeam = vi.fn();
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: () => Promise.resolve([
      { id: '42', name: 'Bananas', age_group: '9U', sport: 'baseball', year: 2026 },
    ]) });
    render(<TeamSearch {...baseProps({ onSelectTeam })} />);
    await typeAndSettle(screen.getByLabelText(/team name/i), 'Bananas');
    await flush();

    expect(screen.getByText('Bananas')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Bananas'));
    expect(onSelectTeam).toHaveBeenCalledWith({ id: '42', name: 'Bananas', age_group: '9U', sport: 'baseball', year: 2026 });
  });
});

describe('TeamSearch — error and retry', function () {
  test('a failed fetch shows an error message with a working Try again retry', async function () {
    var fetchSpy = vi.spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([
        { id: '7', name: 'Firefighters', age_group: '8U', sport: 'baseball', year: 2026 },
      ]) });

    render(<TeamSearch {...baseProps()} />);
    await typeAndSettle(screen.getByLabelText(/team name/i), 'Fire');
    await flush();

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    await flush();

    expect(screen.getByText('Firefighters')).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test('a non-ok response is treated as an error, not parsed as results', async function () {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'VALIDATION_ERROR' }) });
    render(<TeamSearch {...baseProps()} />);
    await typeAndSettle(screen.getByLabelText(/team name/i), 'xx');
    await flush();

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});

describe('TeamSearch — offline', function () {
  test('offline with an active query shows an offline message and never calls fetch', async function () {
    var fetchSpy = vi.spyOn(global, 'fetch');
    render(<TeamSearch {...baseProps({ isOnline: false })} />);
    await typeAndSettle(screen.getByLabelText(/team name/i), 'Mud');

    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
