import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { HomeScreen } from './HomeScreen.jsx';
import { setHomeCache } from '../../api/homeCache.js';

function jsonResponse(status, body, headers) {
  var h = new Headers(headers || {});
  return Promise.resolve({ status: status, ok: status >= 200 && status < 300, headers: h, json: () => Promise.resolve(body) });
}

var HOME_ONE_TEAM = {
  version: 1, generatedAt: '2026-09-02T18:00:00Z', requestId: 'r1', defaultTeamId: 't1',
  teams: [{ id: 't1', name: 'Mud Hens', displayName: 'Mud Hens', season: 'Fall', year: 2026, ageGroup: '8U', role: { code: 'admin', label: 'Team Admin / Head Coach' }, nextEvent: { id: 'g1', type: 'game', opponent: 'Braves', startsAt: '2099-01-01T18:00:00Z' }, readiness: { rosterCount: 0, confirmedCount: 0, lineupStatus: 'none', lineupId: null }, actions: [{ id: 'start_game_mode', label: 'Start Mud Hens Game Mode', href: '/app/teams/t1/games/g1/mode', enabled: true, disabledReason: null }] }],
};

var HOME_TWO_TEAMS = {
  version: 1, generatedAt: '2026-09-02T18:00:00Z', requestId: 'r2', defaultTeamId: 't2',
  teams: [
    { id: 't1', name: 'Mud Hens', displayName: 'Mud Hens', season: 'Fall', year: 2026, ageGroup: '8U', role: { code: 'admin', label: 'x' }, nextEvent: null, readiness: { rosterCount: 0, confirmedCount: 0, lineupStatus: 'none', lineupId: null }, actions: [] },
    { id: 't2', name: 'Knights', displayName: 'Knights', season: 'Fall', year: 2026, ageGroup: '10U', role: { code: 'coach', label: 'x' }, nextEvent: null, readiness: { rosterCount: 0, confirmedCount: 0, lineupStatus: 'none', lineupId: null }, actions: [] },
  ],
};

function memoryStorage() {
  var store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    get length() { return store.size; },
    key: (i) => Array.from(store.keys())[i] ?? null,
  };
}

describe('HomeScreen — core states', function () {
  test('shows a loading skeleton, then the Team Hub once data arrives', async function () {
    var fetchImpl = vi.fn(() => jsonResponse(200, HOME_ONE_TEAM, {}));
    render(<HomeScreen userId="user-1" getAccessToken={async () => 't'} fetchImpl={fetchImpl} cacheStorage={memoryStorage()} />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading your teams/i);
    await waitFor(() => expect(screen.getByRole('region', { name: /Mud Hens/ })).toBeInTheDocument());
  });

  test('shows an error message with a retry action when the fetch fails with no cache to fall back on', async function () {
    var fetchImpl = vi.fn(() => jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'x', requestId: 'r', retryable: false } }, {}));
    render(<HomeScreen userId="user-1" getAccessToken={async () => 't'} fetchImpl={fetchImpl} cacheStorage={memoryStorage()} />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  test('shows a no-membership message when the caller has zero teams, with a Find your team CTA when provided', async function () {
    var fetchImpl = vi.fn(() => jsonResponse(200, { version: 1, generatedAt: 'x', requestId: 'r', defaultTeamId: null, teams: [] }, {}));
    var onFindTeam = vi.fn();
    render(<HomeScreen userId="user-1" getAccessToken={async () => 't'} fetchImpl={fetchImpl} cacheStorage={memoryStorage()} onFindTeam={onFindTeam} />);
    await waitFor(() => expect(screen.getByText(/not on any team yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /find your team/i }));
    expect(onFindTeam).toHaveBeenCalledTimes(1);
  });

  test('no userId (signed out) renders the no-membership state without crashing', function () {
    render(<HomeScreen userId={null} getAccessToken={async () => null} fetchImpl={vi.fn()} cacheStorage={memoryStorage()} />);
    expect(screen.getByText(/not on any team yet/i)).toBeInTheDocument();
  });
});

describe('HomeScreen — offline (#1031)', function () {
  test('offline with no cache shows a distinct "no saved data" message, not the generic error state', async function () {
    var fetchImpl = vi.fn();
    render(<HomeScreen userId="user-1" getAccessToken={async () => 't'} isOnline={false} fetchImpl={fetchImpl} cacheStorage={memoryStorage()} />);
    await waitFor(() => expect(screen.getByText(/don't have any saved team data/i)).toBeInTheDocument());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('offline with a cached snapshot renders the Team Hub with server-required actions gated off', async function () {
    var storage = memoryStorage();
    setHomeCache('user-1', HOME_ONE_TEAM, { storage: storage });
    render(<HomeScreen userId="user-1" getAccessToken={async () => 't'} isOnline={false} fetchImpl={vi.fn()} cacheStorage={storage} />);
    await waitFor(() => expect(screen.getByRole('region', { name: /Mud Hens/ })).toBeInTheDocument());
    var actionButton = screen.getByRole('button', { name: 'Start Mud Hens Game Mode' });
    expect(actionButton).toBeDisabled();
    expect(screen.getByText(/reconnect to continue/i)).toBeInTheDocument();
  });

  test('online renders the same action fully enabled — gating is offline-only', async function () {
    var storage = memoryStorage();
    setHomeCache('user-1', HOME_ONE_TEAM, { storage: storage });
    render(<HomeScreen userId="user-1" getAccessToken={async () => 't'} isOnline={true} fetchImpl={() => new Promise(function () {})} cacheStorage={storage} />);
    await waitFor(() => expect(screen.getByRole('region', { name: /Mud Hens/ })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Start Mud Hens Game Mode' })).toBeEnabled();
  });
});

describe('HomeScreen — access-loss notice (#1031)', function () {
  test('shows a dismissible notice when the previously expanded team disappears on a later fetch, and dismissing it clears the notice without touching the Hub', async function () {
    var call = 0;
    var fetchImpl = vi.fn(function () {
      call += 1;
      return jsonResponse(200, call === 1 ? HOME_TWO_TEAMS : HOME_ONE_TEAM, {});
    });
    var storage = memoryStorage();

    var { rerender } = render(
      <HomeScreen userId="user-1" getAccessToken={async () => 't'} isOnline={false} fetchImpl={fetchImpl} cacheStorage={storage} />
    );
    // First real load happens once online — defaultTeamId is t2 (HOME_TWO_TEAMS).
    rerender(<HomeScreen userId="user-1" getAccessToken={async () => 't'} isOnline={true} fetchImpl={fetchImpl} cacheStorage={storage} />);
    await waitFor(() => expect(screen.getByRole('region', { name: /Knights/ })).toBeInTheDocument());

    // Reconnect again (false -> true) to trigger the second fetch, whose
    // response (HOME_ONE_TEAM) no longer contains t2 — real access loss.
    rerender(<HomeScreen userId="user-1" getAccessToken={async () => 't'} isOnline={false} fetchImpl={fetchImpl} cacheStorage={storage} />);
    rerender(<HomeScreen userId="user-1" getAccessToken={async () => 't'} isOnline={true} fetchImpl={fetchImpl} cacheStorage={storage} />);

    await waitFor(() => expect(screen.getByRole('region', { name: /Mud Hens/ })).toBeInTheDocument());
    expect(screen.getByText(/no longer have access/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText(/no longer have access/i)).toBeNull();
    // The Hub itself is untouched by dismissal — still showing t1 correctly.
    expect(screen.getByRole('region', { name: /Mud Hens/ })).toBeInTheDocument();
  });
});
