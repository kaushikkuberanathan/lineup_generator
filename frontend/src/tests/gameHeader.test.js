import { describe, it, expect } from 'vitest';
import { deriveGameHeader } from '../utils/formatters';

describe('deriveGameHeader', function() {
  var team = {
    name: 'Mud Hens',
    schedule: [
      { id: 'g1', date: '2026-04-10', opponent: 'Bananas',         home: true },
      { id: 'g2', date: '2026-04-15', opponent: 'Firefighters',    home: false },
      { id: 'g3', date: '2026-04-18', opponent: 'Timber Rattlers', home: true },
    ],
  };

  it('1: returns null when selectedGame is missing (practice mode)', function() {
    expect(deriveGameHeader({ activeTeam: team, selectedGame: null })).toBe(null);
  });

  it('2: returns null when activeTeam is missing', function() {
    expect(deriveGameHeader({ activeTeam: null, selectedGame: team.schedule[0] })).toBe(null);
  });

  it('3: computes stable game number from schedule sorted ascending by date', function() {
    var h = deriveGameHeader({ activeTeam: team, selectedGame: team.schedule[1] });
    expect(h.gameNumber).toBe(2);
  });

  it('4: home game uses "vs" connector and 🏠 indicator', function() {
    var h = deriveGameHeader({ activeTeam: team, selectedGame: team.schedule[0] });
    expect(h.connector).toBe('vs');
    expect(h.homeIndicator).toBe('🏠');
  });

  it('5: away game uses "@" connector and no indicator', function() {
    var h = deriveGameHeader({ activeTeam: team, selectedGame: team.schedule[1] });
    expect(h.connector).toBe('@');
    expect(h.homeIndicator).toBe('');
  });

  it('6: truncates long opponent names to 12 chars with ".."', function() {
    var h = deriveGameHeader({ activeTeam: team, selectedGame: team.schedule[2] });
    expect(h.opponentLabel).toBe('Timber Rat..');
  });

  it('7: undefined home defaults to "vs" connector without indicator', function() {
    var legacy = { id: 'g4', date: '2026-04-20', opponent: 'Bananas' };
    var teamWithLegacy = Object.assign({}, team, {
      schedule: team.schedule.concat([legacy]),
    });
    var h = deriveGameHeader({ activeTeam: teamWithLegacy, selectedGame: legacy });
    expect(h.connector).toBe('vs');
    expect(h.homeIndicator).toBe('');
  });

  it('8: orphan game (not in schedule) returns null gameNumber but valid labels', function() {
    var orphan = { id: 'orphan', date: '2099-01-01', opponent: 'Ghost', home: true };
    var h = deriveGameHeader({ activeTeam: team, selectedGame: orphan });
    expect(h.gameNumber).toBe(null);
    expect(h.myTeamLabel).toBe('Mud Hens');
    expect(h.opponentLabel).toBe('Ghost');
  });

  it('9: truncates long my-team name to 12 chars with ".."', function() {
    var longTeam = Object.assign({}, team, { name: 'Timber Rattlers' });
    var h = deriveGameHeader({ activeTeam: longTeam, selectedGame: longTeam.schedule[0] });
    expect(h.myTeamLabel).toBe('Timber Rat..');
  });

  it('10: schedule with unsorted dates still produces stable game number', function() {
    var unsorted = Object.assign({}, team, {
      schedule: [
        { id: 'c', date: '2026-04-18', opponent: 'Late',  home: true },
        { id: 'a', date: '2026-04-10', opponent: 'First', home: true },
        { id: 'b', date: '2026-04-15', opponent: 'Mid',   home: false },
      ],
    });
    expect(deriveGameHeader({ activeTeam: unsorted, selectedGame: unsorted.schedule[0] }).gameNumber).toBe(3);
    expect(deriveGameHeader({ activeTeam: unsorted, selectedGame: unsorted.schedule[1] }).gameNumber).toBe(1);
    expect(deriveGameHeader({ activeTeam: unsorted, selectedGame: unsorted.schedule[2] }).gameNumber).toBe(2);
  });
});
