import { describe, expect, it, vi } from 'vitest';
import { persistTeamBeforeLoad } from '../utils/teamCreationPersistence.js';

describe('persistTeamBeforeLoad — issue #716', function() {
  it('waits for the teams insert before loading the team', async function() {
    var resolveSave;
    var saveTeam = vi.fn(function() {
      return new Promise(function(resolve) { resolveSave = resolve; });
    });
    var loadTeam = vi.fn();
    var team = { id: 'new-team' };

    var result = persistTeamBeforeLoad(team, saveTeam, loadTeam);

    expect(saveTeam).toHaveBeenCalledWith(team);
    expect(loadTeam).not.toHaveBeenCalled();

    resolveSave({ error: null });
    await result;

    expect(loadTeam).toHaveBeenCalledTimes(1);
    expect(loadTeam).toHaveBeenCalledWith(team);
  });

  it('preserves local-first navigation when the teams insert rejects', async function() {
    var failure = new Error('team insert failed');
    var saveTeam = vi.fn(function() { return Promise.reject(failure); });
    var loadTeam = vi.fn();
    var team = { id: 'offline-team' };

    await expect(persistTeamBeforeLoad(team, saveTeam, loadTeam)).rejects.toBe(failure);

    expect(loadTeam).toHaveBeenCalledTimes(1);
    expect(loadTeam).toHaveBeenCalledWith(team);
  });
});
