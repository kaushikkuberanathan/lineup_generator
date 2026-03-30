/**
 * playerUtils.js
 * Shared utility functions for player data normalization and display.
 * Imported by App.jsx, playerMapper.js, and any future player-related modules.
 */

/**
 * Normalizes a raw batting hand value to a canonical single-char code.
 * Returns "L" for left-handed inputs, "R" for right-handed inputs,
 * "U" (unknown/unset) for anything else — including null, undefined, or "".
 *
 * @param {*} value
 * @returns {"L"|"R"|"U"}
 */
export function normalizeBattingHand(value) {
  if (value === "L" || value === "l" || value === "Left" || value === "left") return "L";
  if (value === "R" || value === "r" || value === "Right" || value === "right") return "R";
  return "U";
}

/**
 * Returns a human-readable label for a canonical batting hand code.
 * "L" → "Left", "R" → "Right", anything else → "".
 *
 * @param {"L"|"R"|"U"|*} v
 * @returns {string}
 */
export function battingHandLabel(v) {
  if (v === "L") return "Left";
  if (v === "R") return "Right";
  return "";
}

/**
 * Returns the short badge character for a canonical batting hand code.
 * "L" → "L", "R" → "R", anything else → "".
 * Intended for compact display (player card badges, batting order column).
 *
 * @param {"L"|"R"|"U"|*} v
 * @returns {string}
 */
export function battingHandBadge(v) {
  if (v === "L") return "L";
  if (v === "R") return "R";
  return "";
}
