/**
 * PlayerFilterToggle
 * Extracted from App.jsx v2.8.4 (Story 104 slice 4.1, #279)
 * Row of pill buttons ("All Players" + one per roster name) used to filter
 * the diamond/table view down to a single player. Only real caller is
 * SharedView() (the public share-link view) — verbatim move, zero logic
 * change; local `firstName` copy follows the same precedent as
 * BattingOrderStrip/DefenseDiamond/NowBattingStrip (each keeps its own
 * 3-line copy rather than importing it from App.jsx, avoiding a circular
 * import back into the file this was extracted from).
 *
 * Props:
 *   players  {string[]}          roster names to render as pills
 *   selected {string|null}       currently selected player name, or null for "All Players"
 *   onSelect {(name: string|null) => void}  called with the clicked name, or null for "All Players"
 */

import { tokens } from '../../theme/tokens';

function firstName(name) {
  if (!name) return name;
  return name.split(" ")[0];
}

export function PlayerFilterToggle({ players, selected, onSelect, contemporary = false }) {
  var pills = ['All Players'].concat(players);
  return (
    <div style={{
      display: 'flex', gap: '6px', overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      paddingBottom: '4px', scrollbarWidth: 'none', msOverflowStyle: 'none',
    }}>
      {pills.map(function(name) {
        var isSelected = name === 'All Players' ? !selected : selected === name;
        return (
          <button
            key={name}
            onClick={function() { onSelect(name === 'All Players' ? null : name); }}
            style={{
              flex: 'none', padding: contemporary ? '0 14px' : '5px 12px', minHeight: contemporary ? '44px' : undefined, borderRadius: contemporary ? tokens.radius.pill : '14px', cursor: 'pointer',
              fontFamily: contemporary ? tokens.font.family.sans : "Georgia,'Times New Roman',serif", fontSize: contemporary ? tokens.font.size.sm : '12px', whiteSpace: 'nowrap',
              border: contemporary
                ? (isSelected ? '2px solid ' + tokens.color.brand.gold : '1px solid ' + tokens.color.border.default)
                : (isSelected ? '2px solid #f5a623' : '1px solid rgba(15,31,61,0.15)'),
              background: contemporary
                ? (isSelected ? tokens.color.brand.gold : tokens.color.surface.card)
                : (isSelected ? '#f5a623' : '#ffffff'),
              color: contemporary
                ? (isSelected ? tokens.color.brand.navy : tokens.color.text.secondary)
                : (isSelected ? '#0f1f3d' : '#555'),
              fontWeight: isSelected ? 'bold' : 'normal',
              boxShadow: contemporary ? 'none' : (isSelected ? '0 2px 6px rgba(245,166,35,0.3)' : 'none'),
            }}
          >
            {name === 'All Players' ? name : firstName(name)}
          </button>
        );
      })}
    </div>
  );
}
