/**
 * ParentView
 * Extracted from App.jsx v1.6.9
 * Game Day parent/player view: horizontal player picker + per-player inning card.
 * Props:
 *   roster                 {Array}        player objects with .name property
 *   battingOrder           {string[]}     ordered list of player names
 *   grid                   {object}       player name → position[] per inning
 *   selectedParentPlayer   {string|null}  currently selected player name
 *   setSelectedParentPlayer {function}   setter for selectedParentPlayer
 *   S                      {object}       style helpers (S.btn, S.card)
 *   C                      {object}       color constants (C.navy, C.textMuted, etc.)
 *   POS_COLORS             {object}       position → hex color map
 */

function firstName(name) {
  if (!name) return name;
  return name.split(" ")[0];
}

var POS_FULL = {
  P:"Pitcher", C:"Catcher", "1B":"First Base", "2B":"Second Base",
  "3B":"Third Base", SS:"Shortstop", LF:"Left Field", LC:"Left Center",
  RC:"Right Center", RF:"Right Field", Bench:"Bench"
};

export function ParentView({ roster, battingOrder, grid, selectedParentPlayer, setSelectedParentPlayer, S, C, POS_COLORS }) {
  var batPos = selectedParentPlayer ? battingOrder.indexOf(selectedParentPlayer) : -1;
  var assignments = selectedParentPlayer ? (grid[selectedParentPlayer] || []) : [];

  return (
    <div style={{ padding:"12px 0" }}>
      {/* Player picker */}
      <div style={{ display:"flex", gap:"6px", overflowX:"auto", padding:"0 0 10px",
        WebkitOverflowScrolling:"touch", scrollbarWidth:"none", marginBottom:"8px" }}>
        {roster.map(function(p) {
          var fn = firstName(p.name);
          var sel = selectedParentPlayer === p.name;
          return (
            <button key={p.name}
              onClick={function(n, s) { return function() { setSelectedParentPlayer(s ? null : n); }; }(p.name, sel)}
              style={{ ...S.btn(sel ? "primary" : "ghost"), flexShrink:0, padding:"6px 14px", fontSize:"12px" }}>
              {fn}
            </button>
          );
        })}
      </div>
      {selectedParentPlayer ? (
        <div style={{ ...S.card, borderTop:"4px solid " + C.navy }}>
          {/* Player name */}
          <div style={{ fontSize:"22px", fontWeight:"bold", color:C.navy, marginBottom:"16px" }}>
            👤 {firstName(selectedParentPlayer)}
          </div>
          {/* Batting position */}
          <div style={{ marginBottom:"16px" }}>
            <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"4px" }}>Batting Order</div>
            <div style={{ fontSize:"20px", fontWeight:"bold", color: batPos >= 0 ? C.navy : C.textMuted }}>
              {batPos >= 0 ? "#" + (batPos + 1) + " of " + battingOrder.length : "Not in order"}
            </div>
          </div>
          {/* Positions per inning */}
          <div>
            <div style={{ fontSize:"10px", color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"8px" }}>Positions This Game</div>
            {assignments.length > 0 ? assignments.map(function(pos, i) {
              var pc = POS_COLORS[pos] || "#555";
              var isBench = pos === "Bench";
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:"12px",
                  padding:"8px 10px", marginBottom:"4px", borderRadius:"6px",
                  background: isBench ? "rgba(85,85,85,0.06)" : "rgba(15,31,61,0.04)",
                  borderLeft:"3px solid " + pc }}>
                  <div style={{ fontSize:"11px", color:C.textMuted, minWidth:"40px" }}>Inn {i+1}</div>
                  <div style={{ fontSize:"18px", fontWeight:"bold", color: isBench ? C.textMuted : C.navy }}>
                    {POS_FULL[pos] || pos}
                  </div>
                </div>
              );
            }) : (
              <div style={{ fontSize:"13px", color:C.textMuted }}>No assignments found</div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding:"40px 0", textAlign:"center", color:C.textMuted, fontSize:"13px" }}>
          Select a player above to view their game day info
        </div>
      )}
    </div>
  );
}
