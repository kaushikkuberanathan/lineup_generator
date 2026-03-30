import { battingHandBadge } from "../../utils/playerUtils";

/**
 * PlayerHandBadge
 * Inline badge showing "L" or "R" for a player's batting hand.
 * Renders nothing when hand is "U", null, or undefined.
 *
 * Props:
 *   hand  {string}  canonical batting hand value ("L" | "R" | "U" | anything)
 *
 * Designed for dark backgrounds (game mode, now-batting strip).
 * Do not use on light/cream backgrounds without overriding styles.
 */
export function PlayerHandBadge({ hand }) {
  var label = battingHandBadge(hand);
  if (!label) return null;
  return (
    <span style={{
      display: "inline-block",
      fontSize: "10px",
      fontWeight: "700",
      lineHeight: 1,
      padding: "2px 5px",
      borderRadius: "4px",
      background: "rgba(255,255,255,0.15)",
      color: "#ffffff",
      letterSpacing: "0.04em",
      flexShrink: 0,
      verticalAlign: "middle",
    }}>
      {label}
    </span>
  );
}
