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
