/**
 * BattingHandSelector
 * Three-button toggle for selecting a player's batting hand.
 * No form elements — buttons and onClick only.
 *
 * Props:
 *   value     {string}   current value: "R", "L", or "U" (not set)
 *   onChange  {function} called with the new value string when a button is clicked
 *   teamId    {string}   active team ID — used for analytics only
 */

import { track } from "../utils/analytics";
import { tokens } from "../theme/tokens";

var OPTIONS = [
  { label: "Right",   value: "R" },
  { label: "Left",    value: "L" },
  { label: "Not set", value: "U" },
];

// NOTE: active background (#16a34a) has no exact token match.
// tokens.color.status.success = #27AE60 — a visual change; left as
// literal pending design decision. Track in token drift audit.
var ACTIVE_STYLE = {
  background: "#16a34a", color: "#ffffff",
  border: "1px solid #16a34a",
};
var INACTIVE_STYLE = {
  background: tokens.color.surface.card, color: "#4b5563",
  border: "1px solid #d1d5db",
};
var BASE_STYLE = {
  padding: "5px 12px", borderRadius: tokens.radius.sm,
  fontSize: tokens.font.size.sm, fontWeight: 600,
  fontFamily: "inherit", cursor: "pointer",
  lineHeight: "1.4",
};

export function BattingHandSelector({ value, onChange, teamId }) {
  return (
    <div style={{ display: "flex", gap: tokens.space.sm }}>
      {OPTIONS.map(function(opt) {
        var active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={function() {
              onChange(opt.value);
              track("batting_hand_set", { team_id: teamId, hand: opt.value });
            }}
            style={Object.assign({}, BASE_STYLE, active ? ACTIVE_STYLE : INACTIVE_STYLE)}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
