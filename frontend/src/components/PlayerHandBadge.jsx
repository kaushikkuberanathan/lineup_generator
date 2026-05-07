import { battingHandBadge } from '../utils/playerUtils';
import { tokens } from '../theme/tokens';

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
    fontSize: tokens.font.size.xs,   // was 10px — upgraded to 11px WCAG floor
    fontWeight: 600,
    padding: "1px 5px",
    borderRadius: tokens.radius.xs,
    lineHeight: "16px",
    verticalAlign: "middle",
  };

  // Semantic colors: blue = left-hand identity, gray = right-hand identity.
  // These express batting hand meaning, not brand palette — no token equivalent.
  var color = label === "L"
    ? { background: "#dbeafe", color: "#1d4ed8" }   // blue-100 / blue-700
    : { background: "#f3f4f6", color: "#4b5563" };  // gray-100 / gray-600

  return (
    <span style={Object.assign({}, base, color, style)}>
      {label}
    </span>
  );
}
