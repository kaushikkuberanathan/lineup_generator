/**
 * InningModal
 * Full-screen overlay confirming the transition from one inning to the next.
 * Shows a preview of the next inning's defensive positions before committing.
 * Props:
 *   currentInning  {number}    0-based current inning
 *   totalInnings   {number}    total innings in the game
 *   roster         {Array}     player objects with .name
 *   grid           {object}    player name → position[] per inning
 *   onConfirm      {function}  called when coach confirms the inning advance
 *   onCancel       {function}  called when coach cancels
 */

var POS_COLORS = {
  P:"#e05c2a", C:"#7f3f3f", "1B":"#2471a3", "2B":"#2980b9",
  "3B":"#6c3483", SS:"#8e44ad", LF:"#1e8449", LC:"#2980b9",
  RC:"#8e44ad", RF:"#239b56", Bench:"#475569"
};

function firstName(name) {
  if (!name) return name;
  return name.split(" ")[0];
}

export function InningModal({ currentInning, totalInnings, roster, grid, onConfirm, onCancel }) {
  var nextInning = currentInning + 1;  // 0-based
  var isLastInning = currentInning >= totalInnings - 1;

  // Build next inning's assignments
  var nextAssignments = roster.map(function(p) {
    var pos = (grid[p.name] || [])[nextInning] || "";
    return { name: p.name, pos: pos };
  }).filter(function(a) { return a.pos !== ""; });

  var fieldPlayers = nextAssignments.filter(function(a) { return a.pos !== "Bench"; });
  var benchPlayers = nextAssignments.filter(function(a) { return a.pos === "Bench"; });

  return (
    <div style={{ position:"fixed", inset:0, zIndex:3000, background:"rgba(5,10,25,0.96)",
      display:"flex", flexDirection:"column", fontFamily:"Georgia,'Times New Roman',serif" }}>

      {/* Header */}
      <div style={{ padding:"20px 20px 16px", textAlign:"center", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize:"11px", color:"#64748b", textTransform:"uppercase", letterSpacing:"0.15em", marginBottom:"6px" }}>
          {isLastInning ? "Final Inning" : "Inning Complete"}
        </div>
        <div style={{ fontSize:"28px", fontWeight:"bold", color:"#f5c842" }}>
          {isLastInning
            ? "End of Game"
            : "Inning " + (currentInning + 1) + " → " + (nextInning + 1)}
        </div>
        {!isLastInning ? (
          <div style={{ fontSize:"13px", color:"#64748b", marginTop:"6px" }}>
            Review next inning's lineup before advancing
          </div>
        ) : null}
      </div>

      {/* Next inning preview */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>
        {isLastInning ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:"#475569" }}>
            <div style={{ fontSize:"32px", marginBottom:"12px" }}>⚾</div>
            <div style={{ fontSize:"16px" }}>Game complete. Return to the lineup to unlock or share.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize:"10px", color:"#475569", textTransform:"uppercase",
              letterSpacing:"0.12em", marginBottom:"10px" }}>
              Inning {nextInning + 1} Positions
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
              {fieldPlayers.map(function(a) {
                var pc = POS_COLORS[a.pos] || "#555";
                return (
                  <div key={a.name} style={{ display:"flex", alignItems:"center", gap:"12px",
                    padding:"9px 12px", borderRadius:"8px", background:"rgba(255,255,255,0.05)",
                    borderLeft:"3px solid " + pc }}>
                    <div style={{ fontSize:"11px", fontWeight:"bold", color:pc,
                      minWidth:"28px", textAlign:"right" }}>{a.pos}</div>
                    <div style={{ fontSize:"17px", fontWeight:"bold", color:"#e2e8f0" }}>
                      {firstName(a.name)}
                    </div>
                  </div>
                );
              })}
            </div>
            {benchPlayers.length > 0 ? (
              <div style={{ marginTop:"14px" }}>
                <div style={{ fontSize:"10px", color:"#475569", textTransform:"uppercase",
                  letterSpacing:"0.12em", marginBottom:"8px" }}>Bench</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
                  {benchPlayers.map(function(a) {
                    return (
                      <div key={a.name} style={{ padding:"5px 12px", borderRadius:"16px",
                        background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
                        fontSize:"13px", color:"#64748b" }}>
                        {firstName(a.name)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display:"flex", gap:"12px", padding:"16px 20px",
        paddingBottom:"max(16px, env(safe-area-inset-bottom, 16px))",
        borderTop:"1px solid rgba(255,255,255,0.08)" }}>
        <button onClick={onCancel}
          style={{ flex:1, padding:"14px", borderRadius:"10px",
            background:"transparent", border:"1px solid rgba(255,255,255,0.15)",
            color:"#94a3b8", fontSize:"15px", cursor:"pointer",
            fontFamily:"Georgia,serif" }}>
          Cancel
        </button>
        <button onClick={onConfirm}
          style={{ flex:2, padding:"14px", borderRadius:"10px",
            background: isLastInning ? "#334155" : "#f5c842",
            border:"none", color: isLastInning ? "#94a3b8" : "#0f1f3d",
            fontSize:"15px", fontWeight:"bold", cursor:"pointer",
            fontFamily:"Georgia,serif" }}>
          {isLastInning ? "Exit Game Mode" : "Start Inning " + (nextInning + 1) + " →"}
        </button>
      </div>
    </div>
  );
}
