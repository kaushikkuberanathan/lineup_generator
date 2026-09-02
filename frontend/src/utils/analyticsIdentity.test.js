import { beforeEach, describe, expect, test, vi } from 'vitest';

var mixpanelMock = vi.hoisted(function() {
  return {
    init: vi.fn(),
    identify: vi.fn(),
    alias: vi.fn(),
    register: vi.fn(),
    people: { set: vi.fn() },
  };
});

vi.mock('mixpanel-browser', function() {
  return { default: mixpanelMock };
});

describe('identifyTeam', function() {
  beforeEach(function() {
    vi.resetModules();
    vi.stubEnv('VITE_MIXPANEL_TOKEN', 'test-token');
    mixpanelMock.init.mockReset();
    mixpanelMock.identify.mockReset();
    mixpanelMock.alias.mockReset();
    mixpanelMock.register.mockReset();
    mixpanelMock.people.set.mockReset();
  });

  test('queues identity work until Mixpanel reports that it is loaded', async function() {
    var analytics = await import('./analytics');
    var config = mixpanelMock.init.mock.calls[0][1];

    analytics.identifyTeam('team-1', 'Coach_team-1', { team_name: 'Mud Hens' });
    expect(mixpanelMock.identify).not.toHaveBeenCalled();

    config.loaded();
    expect(mixpanelMock.identify).toHaveBeenCalledWith('team-1');
    expect(mixpanelMock.alias).toHaveBeenCalledWith('Coach_team-1');
    expect(mixpanelMock.people.set).toHaveBeenCalledWith({ team_name: 'Mud Hens' });
  });

  test('keeps only the latest team selection while initialization is pending', async function() {
    var analytics = await import('./analytics');
    var config = mixpanelMock.init.mock.calls[0][1];

    analytics.identifyTeam('team-1', null, { team_name: 'First' });
    analytics.identifyTeam('team-2', null, { team_name: 'Second' });
    config.loaded();

    expect(mixpanelMock.identify).toHaveBeenCalledTimes(1);
    expect(mixpanelMock.identify).toHaveBeenCalledWith('team-2');
    expect(mixpanelMock.alias).not.toHaveBeenCalled();
    expect(mixpanelMock.people.set).toHaveBeenCalledWith({ team_name: 'Second' });
  });

  test('swallows identity errors after initialization', async function() {
    var analytics = await import('./analytics');
    var config = mixpanelMock.init.mock.calls[0][1];
    config.loaded();
    mixpanelMock.identify.mockImplementation(function() { throw new Error('before_identify'); });

    expect(function() {
      analytics.identifyTeam('team-1', null, { team_name: 'Mud Hens' });
    }).not.toThrow();
  });
});
