/**
 * buildSharePayload.test.js — P0 test-coverage gap (DOC_TEST_DEBT.md,
 * "Share Link Payload Integrity"). Zero prior coverage existed for the
 * payload-construction logic before this file — shareLink.test.js only
 * covers dbLoadShareLink (the read side). This covers the write/build
 * side: extracted from App.jsx's shareCurrentLineup()/shareViewerLink(),
 * which had this exact logic inline and untestable in isolation.
 */
import { describe, it, expect } from 'vitest';
import { buildSharePayload } from './buildSharePayload';

function fixtureRoster() {
  return [
    { name: 'Aiden', walkUpSong: 'Thunderstruck', walkUpArtist: 'AC/DC', walkUpStart: 5, walkUpEnd: 20 },
    { name: 'Benji' }, // no walk-up song configured
    { name: 'Cassius', walkUpArtist: 'Queen' }, // artist only, still counts as configured
  ];
}

var fixtureTeam = { name: 'Mud Hens', ageGroup: '8U' };
var fixtureGrid = { Aiden: ['SS'], Benji: ['2B'] };
var fixtureBattingOrder = ['Aiden', 'Benji', 'Cassius'];

describe('buildSharePayload — field presence and shape', function() {
  it('includes team name with age group appended', function() {
    var p = buildSharePayload(fixtureTeam, fixtureGrid, fixtureBattingOrder, fixtureRoster(), []);
    expect(p.team).toBe('Mud Hens 8U');
  });

  it('omits the age group when the team has none', function() {
    var p = buildSharePayload({ name: 'Mud Hens' }, fixtureGrid, fixtureBattingOrder, fixtureRoster(), []);
    expect(p.team).toBe('Mud Hens');
  });

  it('falls back to "Lineup" when there is no team', function() {
    var p = buildSharePayload(null, fixtureGrid, fixtureBattingOrder, fixtureRoster(), []);
    expect(p.team).toBe('Lineup');
  });

  it('game is always null (share links carry no game context)', function() {
    var p = buildSharePayload(fixtureTeam, fixtureGrid, fixtureBattingOrder, fixtureRoster(), []);
    expect(p.game).toBeNull();
  });

  it('passes grid and battingOrder through unchanged', function() {
    var p = buildSharePayload(fixtureTeam, fixtureGrid, fixtureBattingOrder, fixtureRoster(), []);
    expect(p.grid).toBe(fixtureGrid);
    expect(p.batting).toBe(fixtureBattingOrder);
  });
});

describe('buildSharePayload — absent-player filtering', function() {
  it('includes every roster name when nobody is absent', function() {
    var p = buildSharePayload(fixtureTeam, fixtureGrid, fixtureBattingOrder, fixtureRoster(), []);
    expect(p.roster).toEqual(['Aiden', 'Benji', 'Cassius']);
  });

  it('excludes an absent player from the roster list', function() {
    var p = buildSharePayload(fixtureTeam, fixtureGrid, fixtureBattingOrder, fixtureRoster(), ['Benji']);
    expect(p.roster).toEqual(['Aiden', 'Cassius']);
  });

  it('excludes multiple absent players simultaneously', function() {
    var p = buildSharePayload(fixtureTeam, fixtureGrid, fixtureBattingOrder, fixtureRoster(), ['Benji', 'Cassius']);
    expect(p.roster).toEqual(['Aiden']);
  });

  it('roster is names only (strings), not full player objects', function() {
    var p = buildSharePayload(fixtureTeam, fixtureGrid, fixtureBattingOrder, fixtureRoster(), []);
    p.roster.forEach(function(entry) { expect(typeof entry).toBe('string'); });
  });
});

describe('buildSharePayload — absentNames field', function() {
  it('is undefined when nobody is absent (not an empty array)', function() {
    var p = buildSharePayload(fixtureTeam, fixtureGrid, fixtureBattingOrder, fixtureRoster(), []);
    expect(p.absentNames).toBeUndefined();
  });

  it('is undefined when absentTonight is omitted entirely', function() {
    var p = buildSharePayload(fixtureTeam, fixtureGrid, fixtureBattingOrder, fixtureRoster(), undefined);
    expect(p.absentNames).toBeUndefined();
  });

  it('lists the absent names when present', function() {
    var p = buildSharePayload(fixtureTeam, fixtureGrid, fixtureBattingOrder, fixtureRoster(), ['Benji']);
    expect(p.absentNames).toEqual(['Benji']);
  });

  it('is a copy, not the same array reference passed in (mutation-safe)', function() {
    var absent = ['Benji'];
    var p = buildSharePayload(fixtureTeam, fixtureGrid, fixtureBattingOrder, fixtureRoster(), absent);
    p.absentNames.push('Cassius');
    expect(absent).toEqual(['Benji']); // original untouched
  });
});

describe('buildSharePayload — walk-up song preservation', function() {
  it('includes a full song entry for a player with both song and artist', function() {
    var p = buildSharePayload(fixtureTeam, fixtureGrid, fixtureBattingOrder, fixtureRoster(), []);
    expect(p.songs.Aiden).toEqual({ song: 'Thunderstruck', artist: 'AC/DC', start: 5, end: 20 });
  });

  it('includes an entry for a player with only an artist configured', function() {
    var p = buildSharePayload(fixtureTeam, fixtureGrid, fixtureBattingOrder, fixtureRoster(), []);
    expect(p.songs.Cassius).toEqual({ song: null, artist: 'Queen', start: null, end: null });
  });

  it('omits a player with no walk-up song or artist configured at all', function() {
    var p = buildSharePayload(fixtureTeam, fixtureGrid, fixtureBattingOrder, fixtureRoster(), []);
    expect(p.songs.Benji).toBeUndefined();
  });

  // #502 (KK decision, 2026-08-28): an absent player is now fully absent
  // from the payload — their walk-up song is excluded from `songs` the same
  // way their name is excluded from `roster`, instead of leaking through.
  it('excludes an absent player\'s song from the songs map, matching the roster filter', function() {
    var p = buildSharePayload(fixtureTeam, fixtureGrid, fixtureBattingOrder, fixtureRoster(), ['Aiden']);
    expect(p.songs.Aiden).toBeUndefined();
  });

  it('still includes a present player\'s song when a different player is absent', function() {
    var p = buildSharePayload(fixtureTeam, fixtureGrid, fixtureBattingOrder, fixtureRoster(), ['Benji']);
    expect(p.songs.Aiden).toEqual({ song: 'Thunderstruck', artist: 'AC/DC', start: 5, end: 20 });
  });

  // #502: shareViewerLink() previously hardcoded songs to {} via an
  // includeSongs:false opt. That divergence is gone — both share paths now
  // build the same songs map, so buildSharePayload no longer takes an opts
  // param at all.
  it('always includes songs — there is no way to suppress the songs map', function() {
    var p = buildSharePayload(fixtureTeam, fixtureGrid, fixtureBattingOrder, fixtureRoster(), []);
    expect(Object.keys(p.songs).length).toBeGreaterThan(0);
  });
});
