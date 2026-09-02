import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HomeScreen } from './HomeScreen.jsx';

function jsonResponse(status, body, headers) {
  var h = new Headers(headers || {});
  return Promise.resolve({ status: status, ok: status >= 200 && status < 300, headers: h, json: () => Promise.resolve(body) });
}

var HOME_ONE_TEAM = {
  version: 1, generatedAt: '2026-09-02T18:00:00Z', requestId: 'r1', defaultTeamId: 't1',
  teams: [{ id: 't1', name: 'Mud Hens', displayName: 'Mud Hens', season: 'Fall', year: 2026, ageGroup: '8U', role: { code: 'admin', label: 'Team Admin / Head Coach' }, nextEvent: null, readiness: { rosterCount: 0, confirmedCount: 0, lineupStatus: 'none', lineupId: null }, actions: [] }],
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

describe('HomeScreen — thin shell', function () {
  test('shows a loading state, then the Team Hub once data arrives', async function () {
    var fetchImpl = vi.fn(() => jsonResponse(200, HOME_ONE_TEAM, {}));
    render(<HomeScreen userId="user-1" getAccessToken={async () => 't'} fetchImpl={fetchImpl} cacheStorage={memoryStorage()} />);
    await waitFor(() => expect(screen.getByRole('region', { name: /Mud Hens/ })).toBeInTheDocument());
  });

  test('shows an error message when the fetch fails with no cache to fall back on', async function () {
    var fetchImpl = vi.fn(() => jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'x', requestId: 'r', retryable: false } }, {}));
    render(<HomeScreen userId="user-1" getAccessToken={async () => 't'} fetchImpl={fetchImpl} cacheStorage={memoryStorage()} />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  test('shows an empty-teams message when the caller has zero memberships', async function () {
    var fetchImpl = vi.fn(() => jsonResponse(200, { version: 1, generatedAt: 'x', requestId: 'r', defaultTeamId: null, teams: [] }, {}));
    render(<HomeScreen userId="user-1" getAccessToken={async () => 't'} fetchImpl={fetchImpl} cacheStorage={memoryStorage()} />);
    await waitFor(() => expect(screen.getByText(/no teams yet/i)).toBeInTheDocument());
  });

  test('no userId (signed out) renders without crashing', function () {
    render(<HomeScreen userId={null} getAccessToken={async () => null} fetchImpl={vi.fn()} cacheStorage={memoryStorage()} />);
    expect(screen.getByText(/no teams yet/i)).toBeInTheDocument();
  });
});
