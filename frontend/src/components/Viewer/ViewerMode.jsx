/**
 * ViewerMode
 * Extracted from App.jsx v1.6.9
 * Full-screen read-only inning viewer for parents/players.
 * Activated via ?view=true or ?role=viewer combined with a share link.
 * Feature-flagged OFF by default (VIEWER_MODE flag).
 * Props:
 *   payload  {object}  share payload: { roster: string[], grid: object, batting: string[], team: string }
 */

import { useState } from "react";
import { tokens } from "../../theme/tokens";

var POS_COLORS = {
  P:"#e05c2a", C:"#7f3f3f", "1B":"#2471a3", "2B":"#2980b9",
  "3B":"#6c3483", SS:"#8e44ad", LF:"#1e8449", LC:"#2980b9",
  RC:"#8e44ad", RF:"#239b56", Bench:"#555555"
};

var FIELD_POSITIONS = ["P","C","1B","2B","3B","SS","LF","LC","RC","RF"];

var POS_LABELS = {
  P:"Pitcher", C:"Catcher", "1B":"First Base", "2B":"Second Base",
  "3B":"Third Base", SS:"Shortstop", LF:"Left Field", LC:"Left Center",
  RC:"Right Center", RF:"Right Field"
};

function firstName(name) {
  if (!name) return name;
  return name.split(" ")[0];
}

export function ViewerMode({ payload }) {
  var rosterNames = payload.roster || [];

  // Derive inning count from grid
  var innCount = 0;
  for (var ri = 0; ri < rosterNames.length; ri++) {
    var rlen = (payload.grid[rosterNames[ri]] || []).length;
    if (rlen > innCount) innCount = rlen;
  }
  if (!innCount) innCount = 6;
  var innArr = [];
  for (var ii = 0; ii < innCount; ii++) innArr.push(ii);

  var _vIdx = useState(0);
  var vIdx = _vIdx[0]; var setVIdx = _vIdx[1];

  function playerAt(pos, inn) {
    for (var pi = 0; pi < rosterNames.length; pi++) {
      if ((payload.grid[rosterNames[pi]] || [])[inn] === pos) return rosterNames[pi];
    }
    return "";
  }
  function benchFor(inn) {
    return rosterNames.filter(function(n) {
      return (payload.grid[n] || [])[inn] === "Bench";
    });
  }

  var batting = payload.batting || [];
  var bench = benchFor(vIdx);
  var teamLabel = payload.team || "Lineup";

  return (
    <div style={{ minHeight:"100vh", background:tokens.color.brand.navy, fontFamily:"Georgia,'Times New Roman',serif", color:"#fff", display:"flex", flexDirection:"column", maxWidth:"100vw", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ padding:"12px 20px", background:"linear-gradient(135deg," + tokens.color.brand.navy + ",#1a3260)", borderBottom:"3px solid " + tokens.color.brand.gold, display:"flex", alignItems:"center", gap:tokens.space.md, flexShrink:0 }}>
        <div style={{ fontSize:"24px" }}>⚾</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:"17px", fontWeight:"bold", color:tokens.color.brand.gold, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{teamLabel}</div>
          <div style={{ fontSize:tokens.font.size.xs, color:tokens.color.text.tertiary, textTransform:"uppercase", letterSpacing:"0.1em" }}>Game Day · Read-Only</div>
        </div>
      </div>

      {/* Inning tab strip */}
      <div style={{ display:"flex", overflowX:"auto", background:"rgba(0,0,0,0.3)", borderBottom:"1px solid " + tokens.color.overlay.whiteFaint, flexShrink:0, scrollbarWidth:"none" }}>
        {innArr.map(function(i) {
          var active = vIdx === i;
          return (
            <button key={i}
              onClick={function(ii) { return function() { setVIdx(ii); }; }(i)}
              style={{ flex:"0 0 auto", padding:"9px 20px", border:"none", cursor:"pointer",
                fontFamily:"Georgia,serif", fontSize:tokens.font.size.body, fontWeight:"bold",
                background: active ? tokens.color.brand.gold : "transparent",
                color: active ? tokens.color.brand.navy : tokens.color.text.secondary,
                borderBottom: active ? "3px solid " + tokens.color.brand.gold : "3px solid transparent",
                transition:"background 0.15s" }}>
              INN {i+1}
            </button>
          );
        })}
      </div>

      {/* Card body */}
      <div style={{ flex:1, overflowY:"auto", padding:tokens.space.lg, display:"flex", flexDirection:"column", gap:"10px", maxWidth:"600px", margin:"0 auto", width:"100%", boxSizing:"border-box" }}>

        {/* Inning header */}
        <div style={{ textAlign:"center", padding:"10px 0 4px" }}>
          <div style={{ fontSize:"22px", fontWeight:"bold", color:tokens.color.brand.gold, textTransform:"uppercase", letterSpacing:"0.12em" }}>
            INNING {vIdx+1}
          </div>
        </div>

        {/* Field positions */}
        {FIELD_POSITIONS.map(function(pos) {
          var name = playerAt(pos, vIdx);
          var pc = POS_COLORS[pos] || "#555";
          return (
            <div key={pos} style={{ display:"flex", alignItems:"center", gap:tokens.space.md, padding:"10px 14px",
              background:"rgba(255,255,255,0.06)", borderRadius:tokens.radius.md, borderLeft:"4px solid " + pc }}>
              <div style={{ fontSize:tokens.font.size.xs, fontWeight:"bold", color:pc, minWidth:"34px", textAlign:"right", flexShrink:0 }}>{pos}</div>
              <div style={{ fontSize:"19px", fontWeight:"bold", color: name ? "#fff" : "#3a4a6a", flex:1 }}>
                {name ? firstName(name) : "—"}
              </div>
              <div style={{ fontSize:tokens.font.size.xs, color:tokens.color.text.secondary, flexShrink:0 }}>{POS_LABELS[pos] || ""}</div>
            </div>
          );
        })}

        {/* Bench */}
        <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:tokens.radius.md, padding:"10px 14px", borderLeft:"4px solid #555" }}>
          <div style={{ fontSize:tokens.font.size.xs, color:tokens.color.text.secondary, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>Bench</div>
          {bench.length > 0 ? (
            <div style={{ display:"flex", flexWrap:"wrap", gap:tokens.space.sm }}>
              {bench.map(function(n) {
                return <div key={n} style={{ fontSize:"19px", fontWeight:"bold", color:tokens.color.text.tertiary }}>{firstName(n)}</div>;
              })}
            </div>
          ) : (
            <div style={{ fontSize:"14px", color:"#3a4a6a" }}>—</div>
          )}
        </div>

        {/* Batting order */}
        {batting.length > 0 ? (
          <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:tokens.radius.md, padding:"10px 14px" }}>
            <div style={{ fontSize:tokens.font.size.xs, color:tokens.color.text.secondary, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:tokens.space.sm }}>Batting Order</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"3px" }}>
              {batting.map(function(n, idx) {
                return (
                  <div key={n+idx} style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                    <div style={{ fontSize:tokens.font.size.sm, color:tokens.color.text.secondary, minWidth:"22px", textAlign:"right", flexShrink:0 }}>{idx+1}.</div>
                    <div style={{ fontSize:"18px", fontWeight:"bold", color:"#e2e8f0" }}>{firstName(n)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* Prev / Next footer */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px",
        borderTop:"1px solid " + tokens.color.overlay.whiteFaint, background:"rgba(0,0,0,0.3)", flexShrink:0 }}>
        <button onClick={function() { setVIdx(Math.max(0, vIdx-1)); }}
          disabled={vIdx === 0}
          style={{ padding:"10px 22px", borderRadius:tokens.radius.md, border:"1px solid rgba(255,255,255,0.18)",
            background:"transparent", color: vIdx === 0 ? "#2d3f5a" : "#cbd5e1",
            cursor: vIdx === 0 ? "default" : "pointer", fontSize:"14px", fontFamily:"Georgia,serif" }}>
          ← Prev
        </button>
        <div style={{ fontSize:tokens.font.size.sm, color:tokens.color.text.secondary }}>Inning {vIdx+1} of {innCount}</div>
        <button onClick={function() { setVIdx(Math.min(innCount-1, vIdx+1)); }}
          disabled={vIdx === innCount-1}
          style={{ padding:"10px 22px", borderRadius:tokens.radius.md, border:"1px solid rgba(255,255,255,0.18)",
            background:"transparent", color: vIdx === innCount-1 ? "#2d3f5a" : "#cbd5e1",
            cursor: vIdx === innCount-1 ? "default" : "pointer", fontSize:"14px", fontFamily:"Georgia,serif" }}>
          Next →
        </button>
      </div>
    </div>
  );
}
