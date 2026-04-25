/**
 * formatters.js — display-formatting helpers for batting stats.
 * Extracted from App.jsx so they can be unit-tested directly.
 */

/**
 * Format a batting average.
 * - 0 at-bats → "---"
 * - Strips leading zero: .333 not 0.333
 * - Perfect 1.000 preserved as-is
 */
export function fmtAvg(h, ab) {
  var hits = parseInt(h, 10) || 0;
  var atBats = parseInt(ab, 10) || 0;
  if (atBats === 0) return '---';
  var avg = hits / atBats;
  if (!isFinite(avg)) return '---';
  var str = avg.toFixed(3);
  return str.startsWith('0.') ? str.slice(1) : str;
}

/**
 * Format a counting stat (AB, H, R, RBI, BB) as a plain integer string.
 * - NaN / null / undefined → "0"
 * - Floats are truncated (parseInt)
 */
export function fmtStat(val) {
  var n = parseInt(val, 10);
  return isNaN(n) ? '0' : String(n);
}

export function truncateTeamName(name, max) {
  var cap = max || 12;
  if (!name || typeof name !== 'string' || name.length === 0) return 'Team';
  if (name.length <= cap) return name;
  return name.substring(0, cap - 2) + '..';
}

/**
 * deriveGameHeader
 * Pure helper for the scoring-view game context header.
 * Returns null when data is insufficient (practice mode, missing team).
 * Returns { gameNumber, myTeamLabel, opponentLabel, connector, homeIndicator }.
 */
export function deriveGameHeader(input) {
  var activeTeam   = input && input.activeTeam;
  var selectedGame = input && input.selectedGame;
  if (!activeTeam || !selectedGame) return null;

  var schedule = (activeTeam.schedule || []).slice();
  schedule.sort(function(a, b) {
    return (a.date || '') < (b.date || '') ? -1 : 1;
  });

  var idx = -1;
  for (var i = 0; i < schedule.length; i++) {
    if (schedule[i].id === selectedGame.id) { idx = i; break; }
  }
  var gameNumber = idx >= 0 ? idx + 1 : null;

  var isHome = selectedGame.home === true;
  var isAway = selectedGame.home === false;

  return {
    gameNumber:    gameNumber,
    myTeamLabel:   truncateTeamName(activeTeam.name),
    opponentLabel: truncateTeamName(selectedGame.opponent),
    connector:     isAway ? '@' : 'vs',
    homeIndicator: isHome ? '🏠' : '',
  };
}
