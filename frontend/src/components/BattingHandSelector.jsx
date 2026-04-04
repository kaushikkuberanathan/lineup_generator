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

var OPTIONS = [
  { label: "Right",   value: "R" },
  { label: "Left",    value: "L" },
  { label: "Not set", value: "U" },
];

var ACTIVE_STYLE = {
  background: "#16a34a", color: "#ffffff",
  border: "1px solid #16a34a",
};
var INACTIVE_STYLE = {
  background: "#ffffff", color: "#4b5563",
  border: "1px solid #d1d5db",
};
var BASE_STYLE = {
  padding: "5px 12px", borderRadius: "6px",
  fontSize: "12px", fontWeight: 600,
  fontFamily: "inherit", cursor: "pointer",
  lineHeight: "1.4",
};

export function BattingHandSelector({ value, onChange, teamId }) {
  return (
    <div style={{ display: "flex", gap: "8px" }}>
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
