/**
 * flagBootstrap.js — URL-param-driven feature flag + maintenance-bypass activation.
 *
 * Key format: "flag:<flagName>" with value "1" (enable) or removed (disable).
 *
 * NOTE: This scheme uses "flag:" + lowercase name + value "1".
 * It is intentionally separate from isFlagEnabled()'s "flag_" + UPPERCASE + "true"/"false"
 * scheme. The URL bootstrap activates the per-user localStorage override used directly
 * in App.jsx (e.g. localStorage.getItem("flag:viewer_mode") === "1"), NOT the
 * isFlagEnabled() function which reads "flag_VIEWER_MODE".
 *
 * Also handles the maintenance bypass: ?coach_access=mudhen2026 sets
 * "bypass:maintenance", ?clear_bypass removes it. Folded in here (2026-08-26,
 * #406/#410 Pass 4) rather than left as a separate mechanism, since App.jsx's
 * real useEffect always processed all four params as one atomic reload
 * decision — splitting them across two modules is exactly what let this one
 * drift out of sync with the real code in the first place (see the git
 * history on this file: it handled only enable_flag/disable_flag while the
 * real App.jsx code had already grown coach_access/clear_bypass alongside
 * them, undetected because nothing here or in App.jsx ever called this
 * module — the "tested" coverage was for logic the app didn't actually run).
 *
 * Extracted from the useEffect in App.jsx so it can be unit-tested without React.
 */

/**
 * Reads ?enable_flag=, ?disable_flag=, ?coach_access=, and ?clear_bypass
 * from a search string and writes the appropriate localStorage keys.
 *
 * @param {string} searchString - e.g. "?enable_flag=viewer_mode&s=abc"
 * @returns {boolean} true if any recognized param was processed, false if none present
 */
export function applyFlagParams(searchString) {
  var p = new URLSearchParams(searchString);
  var ef = p.get("enable_flag");
  var df = p.get("disable_flag");
  var ca = p.get("coach_access");
  var cb = p.has("clear_bypass");
  if (!ef && !df && !ca && !cb) return false;
  if (ef) localStorage.setItem("flag:" + ef, "1");
  if (df) localStorage.removeItem("flag:" + df);
  if (ca === "mudhen2026") localStorage.setItem("bypass:maintenance", "1");
  if (cb) localStorage.removeItem("bypass:maintenance");
  return true;
}

/**
 * Strips enable_flag, disable_flag, coach_access, and clear_bypass from a
 * search string, preserving all other query params. Used to build the clean
 * URL before location.replace().
 *
 * @param {string} searchString
 * @returns {string} "?remaining=params" or "" if nothing left
 */
export function buildCleanSearch(searchString) {
  var p = new URLSearchParams(searchString);
  var kept = [];
  var strip = ["enable_flag", "disable_flag", "coach_access", "clear_bypass"];
  p.forEach(function(v, k) {
    if (strip.indexOf(k) === -1) kept.push(k + "=" + encodeURIComponent(v));
  });
  return kept.length ? "?" + kept.join("&") : "";
}
