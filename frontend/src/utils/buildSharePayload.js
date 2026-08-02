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
 * NOT unified behavior: shareCurrentLineup() and shareViewerLink() were
 * near-duplicates with one real divergence — shareViewerLink() hardcoded
 * songs to {} instead of computing the walk-up-song map. That is existing,
 * shipped behavior, not a bug introduced by this extraction; `includeSongs`
 * preserves it exactly rather than silently changing what viewer links
 * contain.
 */

function buildSongsMap(roster) {
  var songs = {};
  (roster || []).forEach(function(p) {
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
 * @param {string[]} absentTonight - names filtered out of the shared roster
 * @param {object} [opts]
 * @param {boolean} [opts.includeSongs=true] - shareViewerLink() passes false
 *   to preserve its existing (songs-omitted) behavior exactly.
 */
export function buildSharePayload(team, grid, battingOrder, roster, absentTonight, opts) {
  var includeSongs = !opts || opts.includeSongs !== false;
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
    songs: includeSongs ? buildSongsMap(rosterList) : {},
  };
}
