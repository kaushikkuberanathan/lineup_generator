import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AccountScreen } from './AccountScreen.jsx';

const ACCOUNT = {
  version: 1,
  generatedAt: '2026-09-05T12:00:00.000Z',
  requestId: 'account-shell-test',
  identity: { id: 'u1', email: 'coach@example.com', displayName: 'Coach Example', firstName: 'Coach', lastName: 'Example' },
  memberships: [{
    team: { id: 't1', name: 'Mud Hens', displayName: 'Mud Hens', ageGroup: '8U', season: 'Fall', year: 2026, sport: 'baseball' },
    role: { code: 'admin', label: 'Team Admin / Head Coach' },
    capabilities: ['team.view'],
  }],
  pendingDestination: null,
};

beforeEach(function () {
  localStorage.clear();
});

afterEach(function () {
  delete global.fetch;
  localStorage.clear();
});

describe('API-driven Account feature shell (#1136)', function () {
  it('renders identity and team cards from GET /api/v1/account and selects the contract team', async function () {
    const onSelectTeam = vi.fn();
    global.fetch = vi.fn(function () {
      return Promise.resolve({ ok: true, status: 200, headers: new Headers(), json: function () { return Promise.resolve(ACCOUNT); } });
    });

    render(<AccountScreen userId="u1" getAccessToken={function () { return Promise.resolve('token'); }} isOnline={true} onSelectTeam={onSelectTeam} />);

    await waitFor(function () { expect(screen.getByText('coach@example.com')).toBeInTheDocument(); });
    expect(screen.getByText('Mud Hens')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/account'), expect.objectContaining({ method: 'GET' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Mud Hens' }));
    expect(onSelectTeam).toHaveBeenCalledWith(ACCOUNT.memberships[0].team);
  });

  it('uses an identity-private cached response while offline', async function () {
    localStorage.setItem('api:account:u1', JSON.stringify({
      userId: 'u1', response: ACCOUNT, generatedAt: ACCOUNT.generatedAt,
      fetchedAt: new Date().toISOString(), version: 1, etag: null,
    }));
    global.fetch = vi.fn();

    render(<AccountScreen userId="u1" getAccessToken={function () { return Promise.resolve('token'); }} isOnline={false} onSelectTeam={vi.fn()} />);
    await waitFor(function () { expect(screen.getByText('Mud Hens')).toBeInTheDocument(); });
    expect(screen.getByText('Showing saved account details')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not read another identity\'s cached Account response', async function () {
    localStorage.setItem('api:account:other-user', JSON.stringify({
      userId: 'other-user', response: ACCOUNT, generatedAt: ACCOUNT.generatedAt,
      fetchedAt: new Date().toISOString(), version: 1, etag: null,
    }));
    global.fetch = vi.fn();

    render(<AccountScreen userId="u1" getAccessToken={function () { return Promise.resolve('token'); }} isOnline={false} onSelectTeam={vi.fn()} />);
    await waitFor(function () { expect(screen.getByRole('status')).toHaveTextContent('unavailable offline'); });
    expect(screen.queryByText('Mud Hens')).not.toBeInTheDocument();
  });
});
