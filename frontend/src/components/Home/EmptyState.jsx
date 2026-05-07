/**
 * EmptyState
 * Extracted from App.jsx v1.6.9
 * Shown inside the team list when search returns no results or no teams exist.
 * Props:
 *   hasQuery      {boolean}   true if a search string is active
 *   onCreateTeam  {function}  callback to open the create-team form
 */
import { tokens } from '../../theme/tokens';

export function EmptyState({ hasQuery, onCreateTeam }) {
  return (
    <div style={{ textAlign:"center", padding:"36px 16px", display:"flex", flexDirection:"column", alignItems:"center", gap:tokens.space.sm }}>
      <div style={{ fontSize:"32px", lineHeight:1 }}>{hasQuery ? "🔍" : "🏟️"}</div>
      <div style={{ fontSize:"15px", fontWeight:"bold", color:"#374151", fontFamily:"Georgia,serif", marginTop:"4px" }}>
        {hasQuery ? "No teams found" : "No teams yet"}
      </div>
      <div style={{ fontSize:tokens.font.size.sm, color:tokens.color.text.disabled }}>
        {hasQuery ? "Try a different search, or create a new team." : "Create your first team to get started."}
      </div>
      <button
        onClick={onCreateTeam}
        style={{ marginTop:tokens.space.sm, padding:"8px 20px", borderRadius:tokens.radius.md, background:tokens.color.brand.navy, color:"#fff", border:"none", fontSize:tokens.font.size.body, fontWeight:"bold", fontFamily:"Georgia,serif", cursor:"pointer" }}>
        + Create Team
      </button>
    </div>
  );
}
