/**
 * QuickSwap
 * Bottom-sheet modal triggered by tapping a position on the diamond.
 * Lists all roster players with their current inning assignments.
 * Tapping a player swaps them into the tapped position; the displaced
 * player moves to wherever the incoming player was (true two-way swap).
 * Props:
 *   position    {string}    position abbreviation being swapped into (e.g. "SS")
 *   inning      {number}    0-based inning index
 *   roster      {Array}     player objects with .name
 *   grid        {object}    player name → position[] per inning
 *   onSwap      {function}  (playerAName, playerBName) → called to perform swap
 *   onClose     {function}  close the sheet without swapping
 */

var POS_COLORS = {
  P:"#e05c2a", C:"#7f3f3f", "1B":"#2471a3", "2B":"#2980b9",
  "3B":"#6c3483", SS:"#8e44ad", LF:"#1e8449", LC:"#2980b9",
  RC:"#8e44ad", RF:"#239b56", Bench:"#475569",
  "":"#334155"
};

var POS_FULL = {
  P:"Pitcher", C:"Catcher", "1B":"First Base", "2B":"Second Base",
  "3B":"Third Base", SS:"Shortstop", LF:"Left Field", LC:"Left Center",
  RC:"Right Center", RF:"Right Field", Bench:"Bench"
};

function firstName(name) {
  if (!name) return name;
  return name.split(" ")[0];
}

export function QuickSwap({ position, inning, roster, grid, onSwap, onClose }) {
  // Find who currently occupies this position in this inning
  var currentPlayer = null;
  for (var ri = 0; ri < roster.length; ri++) {
    var p = roster[ri];
    if ((grid[p.name] || [])[inning] === position) { currentPlayer = p.name; break; }
  }

  var posColor = POS_COLORS[position] || "#555";
  var posLabel = POS_FULL[position] || position;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose}
        style={{ position:"fixed", inset:0, zIndex:3100, background:"rgba(0,0,0,0.6)" }} />

      {/* Sheet */}
      <div style={{ position:"fixed", left:0, right:0, bottom:0, zIndex:3101,
        background:"#0f1f3d", borderRadius:"16px 16px 0 0",
        borderTop:"3px solid " + posColor,
        paddingBottom:"max(16px, env(safe-area-inset-bottom, 16px))",
        maxHeight:"72vh", display:"flex", flexDirection:"column",
        fontFamily:"Georgia,'Times New Roman',serif" }}>

        {/* Handle bar */}
        <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 4px" }}>
          <div style={{ width:"36px", height:"4px", borderRadius:"2px", background:"rgba(255,255,255,0.15)" }} />
        </div>

        {/* Header */}
        <div style={{ padding:"8px 20px 14px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <span style={{ fontSize:"11px", color:posColor, fontWeight:"bold",
                textTransform:"uppercase", letterSpacing:"0.1em" }}>
                {position}
              </span>
              <span style={{ fontSize:"11px", color:"#475569", marginLeft:"6px" }}>{posLabel}</span>
            </div>
            <button onClick={onClose}
              style={{ background:"transparent", border:"none", color:"#475569",
                fontSize:"22px", cursor:"pointer", padding:"0 0 0 16px", lineHeight:1 }}>
              ×
            </button>
          </div>
          <div style={{ fontSize:"14px", color:"#64748b", marginTop:"4px" }}>
            {currentPlayer
              ? "Currently: " + firstName(currentPlayer) + " — tap to swap in"
              : "Unassigned — tap a player to assign"}
          </div>
        </div>

        {/* Player list */}
        <div style={{ overflowY:"auto", flex:1, padding:"10px 0" }}>
          {roster.map(function(p) {
            var playerPos = (grid[p.name] || [])[inning] || "";
            var isCurrent = p.name === currentPlayer;
            var pc = POS_COLORS[playerPos] || POS_COLORS[""];

            return (
              <button key={p.name}
                onClick={function(n) { return function() {
                  if (!isCurrent) onSwap(currentPlayer, n);
                }; }(p.name)}
                disabled={isCurrent}
                style={{
                  width:"100%", display:"flex", alignItems:"center", gap:"14px",
                  padding:"12px 20px", border:"none", textAlign:"left",
                  background: isCurrent ? "rgba(245,200,66,0.10)" : "transparent",
                  cursor: isCurrent ? "default" : "pointer",
                  borderBottom:"1px solid rgba(255,255,255,0.05)",
                  fontFamily:"Georgia,serif",
                }}>
                {/* Position badge */}
                <div style={{ minWidth:"32px", padding:"3px 6px", borderRadius:"4px",
                  background: playerPos ? "rgba(255,255,255,0.06)" : "transparent",
                  border: playerPos ? "1px solid " + pc : "1px solid transparent",
                  fontSize:"10px", fontWeight:"bold", color:pc, textAlign:"center" }}>
                  {playerPos || "—"}
                </div>
                {/* Name */}
                <div style={{ flex:1, fontSize:"18px", fontWeight:"bold",
                  color: isCurrent ? "#f5c842" : "#e2e8f0" }}>
                  {firstName(p.name)}
                </div>
                {isCurrent ? (
                  <div style={{ fontSize:"10px", color:"#f5c842", letterSpacing:"0.08em" }}>HERE</div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
