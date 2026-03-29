/**
 * EmptyState
 * Extracted from App.jsx v1.6.9
 * Shown inside the team list when search returns no results or no teams exist.
 * Props:
 *   hasQuery      {boolean}   true if a search string is active
 *   onCreateTeam  {function}  callback to open the create-team form
 */

export function EmptyState({ hasQuery, onCreateTeam }) {
  return (
    <div style={{ textAlign:"center", padding:"36px 16px", display:"flex", flexDirection:"column", alignItems:"center", gap:"8px" }}>
      <div style={{ fontSize:"32px", lineHeight:1 }}>{hasQuery ? "🔍" : "🏟️"}</div>
      <div style={{ fontSize:"15px", fontWeight:"bold", color:"#374151", fontFamily:"Georgia,serif", marginTop:"4px" }}>
        {hasQuery ? "No teams found" : "No teams yet"}
      </div>
      <div style={{ fontSize:"12px", color:"#9ca3af" }}>
        {hasQuery ? "Try a different search, or create a new team." : "Create your first team to get started."}
      </div>
      <button
        onClick={onCreateTeam}
        style={{ marginTop:"8px", padding:"8px 20px", borderRadius:"8px", background:"#0f1f3d", color:"#fff", border:"none", fontSize:"13px", fontWeight:"bold", fontFamily:"Georgia,serif", cursor:"pointer" }}>
        + Create Team
      </button>
    </div>
  );
}
