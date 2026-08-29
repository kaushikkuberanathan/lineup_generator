export const FEATURE_FLAGS = {
  USE_NEW_LINEUP_ENGINE: true,

  // Maintenance Mode — when true, all users see a "We'll be right back" screen.
  // Enable before deploying breaking changes; disable after verifying prod.
  // Override locally (either form works — see Story 49/#120):
  //   localStorage.setItem("flag:MAINTENANCE_MODE", "1")     ← legacy form, App.jsx's direct check
  //   localStorage.setItem("flag_MAINTENANCE_MODE", "true")  ← canonical form, isFlagEnabled()
  MAINTENANCE_MODE: false,

  // Viewer Mode — read-only swipeable inning cards for parents/players
  // Set to true to enable globally, or leave false and enable per-user via
  // either form (see Story 49/#120):
  //   localStorage.setItem("flag:viewer_mode", "1")        ← legacy form
  //   localStorage.setItem("flag_VIEWER_MODE", "true")     ← canonical form
  //   localStorage.removeItem("flag:viewer_mode")          ← disable / revert (legacy)
  VIEWER_MODE: false,

  // Game Mode — full-screen live game overlay (diamond + bench + batting footer).
  // NOTE: not currently read anywhere in the render tree (verified 2026-08-27,
  // #120) — GAME_MODE is superseded by COMBINED_GAMEMODE_AND_SCORING (DugoutView)
  // below. Kept as-is, not removed, since this pass is scoped to the flag-key
  // scheme, not a dead-flag cleanup.
  GAME_MODE: true,

  // Accessibility Phase 1 — font floor 12–14px, touch targets ≥44px,
  // contrast uplift in Game Mode overlays, aria labels, position abbreviation labels.
  // GA default-on as of Phase 1a. Roll back per-user if needed:
  // localStorage.setItem("flag_ACCESSIBILITY_V1", "false")
  ACCESSIBILITY_V1: true,

  // Scoring Sheet V2 — outcome sheet semantic cleanup: Foul moved to PITCH OUTCOME
  // section, Strikeout removed from contact sheet, opp-half +1 buttons hidden.
  // Roll back: localStorage.setItem("flag_SCORING_SHEET_V2", "false")
  SCORING_SHEET_V2: true,

  // Combined Game Mode + Scoring view (DugoutView) — single full-screen surface
  // combining live scoring controls with field positions and batting order.
  // GA default-on as of Slice 3 (v2.5.9). Legacy ScoringMode removed.
  // Roll back per-user: localStorage.setItem("flag_COMBINED_GAMEMODE_AND_SCORING", "false")
  COMBINED_GAMEMODE_AND_SCORING: true,
};

// Story 30 / #112 — DB-driven runtime flag cache. Populated once per app
// session by hooks/useFeatureFlags.js's fetchRuntimeFlags() result (Supabase
// feature_flags table, global rows, merged onto FEATURE_FLAGS defaults) via
// setRuntimeFlagCache(), called from App.jsx after that fetch resolves.
// Before the fetch resolves (or if Supabase is unavailable), this stays null
// and isFlagEnabled() falls back to the static default below — same
// behavior as before this existed. This closes the gap where a DB flag flip
// had no runtime effect without a redeploy: once the cache is populated, a
// changed DB value takes effect on the next isFlagEnabled() call, no
// redeploy needed, matching the DB-driven behavior VIEWER_MODE/
// MAINTENANCE_MODE already had via App.jsx's separate runtimeFlags checks —
// this makes every flag that goes through isFlagEnabled() work the same way.
var _runtimeFlagCache = null;

export function setRuntimeFlagCache(flags) {
  _runtimeFlagCache = flags;
}

/**
 * Evaluate a feature flag with localStorage override support.
 * Override keys use "flag_" prefix (e.g. flag_ACCESSIBILITY_V1).
 *   localStorage.setItem("flag_ACCESSIBILITY_V1", "true")  → force on
 *   localStorage.setItem("flag_ACCESSIBILITY_V1", "false") → force off
 *   localStorage.removeItem("flag_ACCESSIBILITY_V1")       → use default
 *
 * Precedence: per-user localStorage override > DB-driven runtime cache
 * (Story 30/#112) > static FEATURE_FLAGS default.
 */
export function isFlagEnabled(flagName) {
  var lsKey = 'flag_' + flagName;
  var override = localStorage.getItem(lsKey);
  if (override === 'true') return true;
  if (override === 'false') return false;
  if (_runtimeFlagCache && Object.prototype.hasOwnProperty.call(_runtimeFlagCache, flagName)) {
    return _runtimeFlagCache[flagName] === true;
  }
  return FEATURE_FLAGS[flagName] === true;
}
