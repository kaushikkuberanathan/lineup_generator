import { describe, test, expect, vi } from 'vitest';

vi.mock('../../utils/analytics.js', function () {
  return { track: vi.fn() };
});

import { track } from '../../utils/analytics.js';
import {
  trackHomeApiLoaded, trackHomeApiCacheRendered, trackHomeApiFailed,
  trackHomeTeamExpanded, trackHomeTeamFilterChanged, trackHomeActionSelected,
  trackHomeDeepLinkResolved, trackHomeDeepLinkDenied, trackHomeOfflineRendered,
} from './homeAnalytics.js';

describe('homeAnalytics', function () {
  test('trackHomeApiLoaded sends non-PII team/cache/network context', function () {
    trackHomeApiLoaded({ teamCount: 3, cacheState: 'miss', networkState: 'online' });
    expect(track).toHaveBeenCalledWith('home_api_loaded', { team_count: 3, cache_state: 'miss', network_state: 'online' });
  });

  test('trackHomeApiCacheRendered', function () {
    trackHomeApiCacheRendered({ teamCount: 2, cacheState: 'stale' });
    expect(track).toHaveBeenCalledWith('home_api_cache_rendered', { team_count: 2, cache_state: 'stale' });
  });

  test('trackHomeApiFailed', function () {
    trackHomeApiFailed({ errorCode: 'SERVICE_UNAVAILABLE', retryable: true, cacheState: 'hit' });
    expect(track).toHaveBeenCalledWith('home_api_failed', { error_code: 'SERVICE_UNAVAILABLE', retryable: true, cache_state: 'hit' });
  });

  test('trackHomeTeamExpanded sends team_id and role, never a team name', function () {
    trackHomeTeamExpanded({ teamId: 't1', role: 'coach' });
    var call = track.mock.calls[track.mock.calls.length - 1];
    expect(call[0]).toBe('home_team_expanded');
    expect(call[1]).toEqual({ team_id: 't1', role: 'coach' });
    expect(JSON.stringify(call[1])).not.toMatch(/mud hens/i);
  });

  test('trackHomeTeamFilterChanged', function () {
    trackHomeTeamFilterChanged({ viewFilter: 'all' });
    expect(track).toHaveBeenCalledWith('home_team_filter_changed', { view_filter: 'all' });
  });

  test('trackHomeActionSelected', function () {
    trackHomeActionSelected({ teamId: 't1', actionId: 'start_game_mode', role: 'admin' });
    expect(track).toHaveBeenCalledWith('home_action_selected', { team_id: 't1', action_id: 'start_game_mode', role: 'admin' });
  });

  test('trackHomeDeepLinkResolved and trackHomeDeepLinkDenied — schema ready for #1030', function () {
    trackHomeDeepLinkResolved({ destinationType: 'roster', teamId: 't1' });
    expect(track).toHaveBeenCalledWith('home_deep_link_resolved', { destination_type: 'roster', team_id: 't1' });
    trackHomeDeepLinkDenied({ destinationType: 'game', reason: 'cross_team_denied' });
    expect(track).toHaveBeenCalledWith('home_deep_link_denied', { destination_type: 'game', reason: 'cross_team_denied' });
  });

  test('trackHomeOfflineRendered', function () {
    trackHomeOfflineRendered({ cacheState: 'stale' });
    expect(track).toHaveBeenCalledWith('home_offline_rendered', { cache_state: 'stale' });
  });
});
