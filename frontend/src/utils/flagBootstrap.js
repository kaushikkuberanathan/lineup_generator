/**
 * flagBootstrap.js — URL-param-driven feature flag activation.
 *
 * Key format: "flag:<flagName>" with value "1" (enable) or removed (disable).
 *
 * NOTE: This scheme uses "flag:" + lowercase name + value "1".
 * It is intentionally separate from isFlagEnabled()'s "flag_" + UPPERCASE + "true"/"false"
 * scheme. The URL bootstrap activates the per-user localStorage override used directly
 * in App.jsx (e.g. localStorage.getItem("flag:viewer_mode") === "1"), NOT the
 * isFlagEnabled() function which reads "flag_VIEWER_MODE".
 *
 * Extracted from the useEffect in App.jsx so it can be unit-tested without React.
 */

/**
 * Reads ?enable_flag= and ?disable_flag= from a search string and writes
 * the appropriate localStorage keys.
 *
 * @param {string} searchString - e.g. "?enable_flag=viewer_mode&s=abc"
 * @returns {boolean} true if any flag param was processed, false if none present
 */
export function applyFlagParams(searchString) {
  var p = new URLSearchParams(searchString);
  var ef = p.get("enable_flag");
  var df = p.get("disable_flag");
  if (!ef && !df) return false;
  if (ef) localStorage.setItem("flag:" + ef, "1");
  if (df) localStorage.removeItem("flag:" + df);
  return true;
}

/**
 * Strips enable_flag and disable_flag from a search string, preserving all
 * other query params. Used to build the clean URL before location.replace().
 *
 * @param {string} searchString
 * @returns {string} "?remaining=params" or "" if nothing left
 */
export function buildCleanSearch(searchString) {
  var p = new URLSearchParams(searchString);
  var kept = [];
  p.forEach(function(v, k) {
    if (k !== "enable_flag" && k !== "disable_flag") kept.push(k + "=" + encodeURIComponent(v));
  });
  return kept.length ? "?" + kept.join("&") : "";
}
