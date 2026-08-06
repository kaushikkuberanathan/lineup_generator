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

function firstName(name) {
  if (!name) return name;
  return name.split(" ")[0];
}

export function PlayerFilterToggle({ players, selected, onSelect }) {
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
              flex: 'none', padding: '5px 12px', borderRadius: '14px', cursor: 'pointer',
              fontFamily: "Georgia,'Times New Roman',serif", fontSize: '12px', whiteSpace: 'nowrap',
              border: isSelected ? '2px solid #f5a623' : '1px solid rgba(15,31,61,0.15)',
              background: isSelected ? '#f5a623' : '#ffffff',
              color: isSelected ? '#0f1f3d' : '#555',
              fontWeight: isSelected ? 'bold' : 'normal',
              boxShadow: isSelected ? '0 2px 6px rgba(245,166,35,0.3)' : 'none',
            }}
          >
            {name === 'All Players' ? name : firstName(name)}
          </button>
        );
      })}
    </div>
  );
}
