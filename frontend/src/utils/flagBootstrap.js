/**
 * flagBootstrap.js — URL-param-driven feature flag + maintenance-bypass activation.
 *
 * Key format: writes BOTH localStorage key schemes for every ?enable_flag=/
 * ?disable_flag= call (Story 49/#120):
 *   - "flag:<lowercase-name>" = "1" (legacy — App.jsx's direct checks for
 *     VIEWER_MODE/MAINTENANCE_MODE read this form)
 *   - "flag_<UPPERCASE-NAME>" = "true" (canonical — isFlagEnabled() reads
 *     this form; every other flag in featureFlags.js uses only this one)
 *
 * Before #120, ?enable_flag= wrote only the legacy form, so it silently did
 * nothing for any flag gated through isFlagEnabled() (ACCESSIBILITY_V1,
 * SCORING_SHEET_V2, COMBINED_GAMEMODE_AND_SCORING) — a coach following the
 * documented "enable via URL" instructions for one of those flags would see
 * no effect, with no error. Dual-writing both forms is additive and
 * backward-compatible: every existing reader of either key keeps working
 * unchanged. Full consolidation onto a single scheme (removing the legacy
 * form entirely) was Story 49's original recommended option but was judged
 * too high-blast-radius for this pass — MAINTENANCE_MODE and VIEWER_MODE are
 * both high-stakes gates (whole-app kill switch; public share-link viewer)
 * — so this ships the low-risk, fully-additive migration-window step
 * instead (Story 49's own Option 3), not a full removal.
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
  if (ef) {
    localStorage.setItem("flag:" + ef, "1");
    localStorage.setItem("flag_" + ef.toUpperCase(), "true");
  }
  if (df) {
    localStorage.removeItem("flag:" + df);
    localStorage.removeItem("flag_" + df.toUpperCase());
  }
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
