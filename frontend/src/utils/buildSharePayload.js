/**
 * Extracted from App.jsx's shareCurrentLineup()/shareViewerLink() (P0 test
 * coverage gap, DOC_TEST_DEBT.md "Share Link Payload Integrity") — both
 * functions built this exact payload shape inline, closure-scoped over
 * component state, with no way to unit-test the construction logic
 * independently of rendering the whole App. Pure data transformation, no
 * side effects — same extraction pattern already used elsewhere in this
 * codebase (formatters.js, migrations.js, utils/storage.js) for exactly
 * this "App.jsx logic isn't independently testable" problem.
 *
 * #502 (KK decision, 2026-08-28): the extraction originally preserved two
 * pre-existing shipped behaviors verbatim rather than fixing them
 * unilaterally — shareViewerLink() hardcoded songs to {}, and the songs map
 * was built from the full, unfiltered roster (leaking an absent player's
 * walk-up song even though their name was excluded from `roster`). Both are
 * now fixed: songs are always included, and always filtered by the same
 * absentTonight list that filters the roster field.
 */

function buildSongsMap(roster, absent) {
  var songs = {};
  (roster || []).forEach(function(p) {
    if (absent.indexOf(p.name) >= 0) { return; }
    if (p.walkUpSong || p.walkUpArtist) {
      songs[p.name] = {
        song: p.walkUpSong || null,
        artist: p.walkUpArtist || null,
        start: p.walkUpStart || null,
        end: p.walkUpEnd || null,
      };
    }
  });
  return songs;
}

/**
 * @param {object|null} team - activeTeam (uses .name + optional .ageGroup)
 * @param {object} grid - player name -> position[] per inning
 * @param {string[]} battingOrder - activeBattingOrder
 * @param {Array} roster - player objects with .name and optional walkUp* fields
 * @param {string[]} absentTonight - names filtered out of both the roster
 *   field and the songs map
 */
export function buildSharePayload(team, grid, battingOrder, roster, absentTonight) {
  var absent = absentTonight || [];
  var rosterList = roster || [];

  return {
    team: team ? team.name + (team.ageGroup ? ' ' + team.ageGroup : '') : 'Lineup',
    game: null,
    grid: grid,
    batting: battingOrder,
    roster: rosterList
      .filter(function(r) { return absent.indexOf(r.name) < 0; })
      .map(function(r) { return r.name; }),
    absentNames: absent.length > 0 ? absent.slice() : undefined,
    songs: buildSongsMap(rosterList, absent),
  };
}
