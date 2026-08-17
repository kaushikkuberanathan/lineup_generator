/**
 * BenchStrip
 * Horizontal scrolling strip of players sitting the bench for a given inning.
 * Props:
 *   benchPlayers  {string[]}  first names (or full names) of benched players
 */

import { tokens } from "../../theme/tokens";

export function BenchStrip({ benchPlayers }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"0",
      background:"rgba(0,0,0,0.35)", borderTop:"1px solid rgba(255,255,255,0.08)",
      padding:"0 14px", minHeight:"48px", flexShrink:0 }}>

      <div style={{ fontSize:"9px", color:tokens.color.gameDay.text.caption, textTransform:"uppercase",
        letterSpacing:"0.12em", flexShrink:0, marginRight:"10px", whiteSpace:"nowrap" }}>
        Bench
      </div>

      {benchPlayers.length === 0 ? (
        <div style={{ fontSize:"12px", color:tokens.color.gameDay.text.faint, fontStyle:"italic" }}>—</div>
      ) : (
        <div style={{ display:"flex", gap:"8px", overflowX:"auto", scrollbarWidth:"none",
          WebkitOverflowScrolling:"touch", padding:"8px 0" }}>
          {benchPlayers.map(function(name) {
            return (
              <div key={name} style={{
                flexShrink:0, padding:"5px 12px", borderRadius:"20px",
                background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
                fontSize:"13px", fontWeight:"600", color:tokens.color.gameDay.text.secondary, whiteSpace:"nowrap"
              }}>
                {name}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
