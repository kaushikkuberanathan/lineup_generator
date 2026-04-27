export const FEATURE_FLAGS = {
  USE_NEW_LINEUP_ENGINE: true,

  // Maintenance Mode — when true, all users see a "We'll be right back" screen.
  // Enable before deploying breaking changes; disable after verifying prod.
  // Override locally: localStorage.setItem("flag:MAINTENANCE_MODE", "1")
  MAINTENANCE_MODE: false,

  // Viewer Mode — read-only swipeable inning cards for parents/players
  // Set to true to enable globally, or leave false and enable per-user via:
  //   localStorage.setItem("flag:viewer_mode", "1")   ← enable for this user
  //   localStorage.removeItem("flag:viewer_mode")     ← disable / revert
  VIEWER_MODE: false,

  // Game Mode — full-screen live game overlay (diamond + bench + batting footer).
  // Feature-flagged off by default. Enable per-team via Supabase feature_flags table
  // or locally via: localStorage.setItem("flag:game_mode", "1")
  GAME_MODE: true,

  // Accessibility Phase 1 — font floor 12–14px, touch targets ≥44px,
  // contrast uplift in Game Mode overlays, aria labels, position abbreviation labels.
  // Enable locally: localStorage.setItem("flag_ACCESSIBILITY_V1", "true")
  // Disable locally: localStorage.setItem("flag_ACCESSIBILITY_V1", "false")
  ACCESSIBILITY_V1: false,

  // Scoring Sheet V2 — outcome sheet semantic cleanup: Foul moved to PITCH OUTCOME
  // section, Strikeout removed from contact sheet, opp-half +1 buttons hidden.
  // Roll back: localStorage.setItem("flag_SCORING_SHEET_V2", "false")
  SCORING_SHEET_V2: true,
};

/**
 * Evaluate a feature flag with localStorage override support.
 * Override keys use "flag_" prefix (e.g. flag_ACCESSIBILITY_V1).
 *   localStorage.setItem("flag_ACCESSIBILITY_V1", "true")  → force on
 *   localStorage.setItem("flag_ACCESSIBILITY_V1", "false") → force off
 *   localStorage.removeItem("flag_ACCESSIBILITY_V1")       → use default
 */
export function isFlagEnabled(flagName) {
  var lsKey = 'flag_' + flagName;
  var override = localStorage.getItem(lsKey);
  if (override === 'true') return true;
  if (override === 'false') return false;
  return FEATURE_FLAGS[flagName] === true;
}
