/**
 * utils/season.js
 * Shared season utilities for team season tracking (Spring/Fall + year).
 *
 * Extracted from App.jsx (which previously had 3 separate inline copies of
 * the sort comparator and the format helper, plus its own currentSeasonGuess)
 * so this logic has real test coverage — the exact kind of thing that went
 * wrong in #718 (a wrong default silently shipped in one untested inline
 * copy while the others were fine).
 *
 * frontend/public/admin.html cannot import this module directly (files
 * under public/ are served as-is, outside Vite's module graph — a raw
 * import would resolve in dev but 404 in the production build). It keeps
 * its own inline copy instead; season.behavior-parity.test.js extracts that
 * copy's source and runs the same assertions against it, so drift between
 * the two is still caught by a test even without a shared runtime import.
 */

// Sensible default — Jan-Jun -> Spring, Jul-Dec -> Fall. A guess, not a
// rule: the caller can always override it. Exists so every path that
// creates a team object supplies a DB-valid 'Spring'/'Fall' value —
// teams.season is meant to end up NOT NULL with a CHECK constraint
// (migration 022 adds it nullable, 023 tightens it once the season-aware
// release verifies no NULLs remain).
export function currentSeasonGuess(now) {
  var month = (now || new Date()).getMonth() + 1;
  return (month >= 1 && month <= 6) ? "Spring" : "Fall";
}

// "Spring" + 2026 -> "Spring 26".
export function formatSeason(season, year) {
  if (!season) { return ""; }
  return season + (year ? " " + String(year).slice(-2) : "");
}

// Newest season/year first: same year, Fall (later in the calendar year)
// sorts before Spring. Accepts anything with { season, year } fields —
// team objects directly, or a membership-lookup result.
function seasonRank(season) { return season === "Fall" ? 1 : 0; }
export function compareTeamsNewestFirst(a, b) {
  var ay = (a && a.year) || 0, by = (b && b.year) || 0;
  if (ay !== by) { return by - ay; }
  return seasonRank(b && b.season) - seasonRank(a && a.season);
}
