import { battingHandBadge } from '../utils/playerUtils';

/**
 * PlayerHandBadge
 * Inline badge showing a player's batting hand ("L" or "R").
 * Returns null when hand is unset or unrecognised.
 *
 * Props:
 *   hand       {string}                    "L", "R", or anything else (renders nothing)
 *   style      {React.CSSProperties|undefined}  extra inline style merged onto the span
 */
export function PlayerHandBadge({ hand, style }) {
  var label = battingHandBadge(hand);
  if (!label) return null;

  var base = {
    display: "inline-block",
    fontSize: "10px",
    fontWeight: 600,
    padding: "1px 5px",
    borderRadius: "4px",
    lineHeight: "16px",
    verticalAlign: "middle",
  };

  var color = label === "L"
    ? { background: "#dbeafe", color: "#1d4ed8" }   // blue-100 / blue-700
    : { background: "#f3f4f6", color: "#4b5563" };  // gray-100 / gray-600

  return (
    <span style={Object.assign({}, base, color, style)}>
      {label}
    </span>
  );
}
