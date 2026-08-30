import { useState } from "react";
import { BrandMark } from '../../components/BrandMark';
import { PlayerFilterToggle } from '../../components/Shared/PlayerFilterToggle';
import { Card } from '../../components/ui/Card';
import { tokens } from '../../theme/tokens';
import { firstName } from '../../utils/playerName';

export function SharedView({ payload, renderFieldSVG, sectionTitleStyle }) {
  // Derive inning count from grid
  var innCount = 0;
  for (var k in payload.grid) {
    if ((payload.grid[k] || []).length > innCount) { innCount = payload.grid[k].length; }
  }
  var innArr = [];
  for (var i = 0; i < innCount; i++) { innArr.push(i); }
  var rosterNames = payload.roster || [];

  // Local state for inning filter, view mode, and player filter
  var _svInn = useState(null);
  var svInn = _svInn[0]; var setSvInn = _svInn[1];
  var _svView = useState("diamond");
  var svView = _svView[0]; var setSvView = _svView[1];
  var _svPlayer = useState(null);
  var svPlayer = _svPlayer[0]; var setSvPlayer = _svPlayer[1];

  // Bench for selected inning(s)
  var benchByInning = innArr.map(function(ii) {
    return rosterNames.filter(function(n) { return (payload.grid[n] || [])[ii] === "Bench"; });
  });
  var outByInning = innArr.map(function(ii) {
    return rosterNames.filter(function(n) { return (payload.grid[n] || [])[ii] === "Out"; });
  });
  var benchDisplay   = svInn !== null ? [benchByInning[svInn] || []] : benchByInning;
  var outDisplay     = svInn !== null ? [outByInning[svInn] || []]   : outByInning;
  var benchLabels    = svInn !== null ? [svInn] : innArr;
  function getSharedPlayerFn(pos, inn) {
    for (var pi = 0; pi < rosterNames.length; pi++) {
      if ((payload.grid[rosterNames[pi]] || [])[inn] === pos) { return rosterNames[pi]; }
    }
    return "";
  }

  var teamInitial = payload.team ? payload.team.charAt(0).toUpperCase() : "L";

  return (
    <div style={{ minHeight:"100vh", background:tokens.color.surface.cream, fontFamily:"Georgia,'Times New Roman',serif", color:tokens.color.text.ink }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ background:"linear-gradient(135deg,"+tokens.color.brand.navy+","+tokens.color.brand.navyLight+")", borderBottom:"4px solid " + tokens.color.brand.red, padding:"14px 20px" }}>
        <div style={{ maxWidth:"800px", margin:"0 auto", display:"flex", alignItems:"center", gap:"12px" }}>
          <BrandMark size={42} />
          <div style={{ width:"30px", height:"30px", borderRadius:"50%", background:tokens.color.brand.navy, border:"2px solid "+tokens.color.brand.gold,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:"bold", color:tokens.color.brand.gold, flexShrink:0 }}>
            {teamInitial}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:"17px", fontWeight:"bold", color:tokens.color.brand.gold, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {payload.team}
            </div>
            {payload.game ? (
              <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.6)", marginTop:"1px" }}>
                vs {payload.game.opponent}
                {payload.game.date ? " · " + new Date(payload.game.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}) : ""}
                {payload.game.time ? " · " + payload.game.time : ""}
              </div>
            ) : (
              <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.45)", marginTop:"1px" }}>Game Day Lineup</div>
            )}
          </div>
          <button onClick={function() { window.print(); }}
            style={{ padding:"6px 14px", borderRadius:"6px", border:"1px solid rgba(255,255,255,0.25)", background:"rgba(255,255,255,0.1)",
              color:"rgba(255,255,255,0.75)", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit", cursor:"pointer", flexShrink:0 }}>
            Print
          </button>
        </div>
      </div>

      <div style={{ maxWidth:"800px", margin:"0 auto", padding:"16px 20px" }}>

        {/* ── Player filter pills ──────────────────────────────── */}
        {rosterNames.length > 0 ? (
          <div style={{ marginBottom:"12px" }}>
            <PlayerFilterToggle
              players={payload.absentNames && payload.absentNames.length > 0 ? rosterNames.filter(function(n) { return payload.absentNames.indexOf(n) < 0; }) : rosterNames}
              selected={svPlayer}
              onSelect={setSvPlayer}
            />
          </div>
        ) : null}

        {/* ── Controls row: inning filter + view toggle ───────── */}
        <div style={{ display:"flex", gap:"8px", alignItems:"center", marginBottom:"16px", flexWrap:"wrap" }}>
          {/* Inning pills */}
          <div style={{ display:"flex", flexWrap:"nowrap", gap:"4px", alignItems:"center", overflowX:"auto", WebkitOverflowScrolling:"touch", flex:1, minWidth:0 }}>
            <span style={{ fontSize:"9px", color:tokens.color.text.muted, fontWeight:"bold", textTransform:"uppercase", letterSpacing:"0.08em", flexShrink:0 }}>Inn</span>
            <button onClick={function() { setSvInn(null); }}
              style={{ padding:"3px 8px", borderRadius:"10px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit", flexShrink:0,
                background: svInn === null ? tokens.color.brand.navy : "rgba(15,31,61,0.08)", color: svInn === null ? "#fff" : tokens.color.text.muted }}>All</button>
            {innArr.map(function(i) {
              var active = svInn === i;
              return (
                <button key={i} onClick={function(idx) { return function() { setSvInn(idx); }; }(i)}
                  style={{ padding:"3px 8px", borderRadius:"10px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"bold", fontFamily:"inherit", flexShrink:0,
                    background: active ? tokens.color.brand.red : "rgba(15,31,61,0.08)", color: active ? "#fff" : tokens.color.text.muted }}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          {/* View toggle */}
          <div style={{ display:"flex", gap:"3px", background:"rgba(15,31,61,0.06)", borderRadius:"8px", padding:"3px", flexShrink:0 }}>
            {[["◆","diamond"],["≡","table"]].map(function(opt) {
              var active = svView === opt[1];
              return (
                <button key={opt[1]} onClick={function(v) { return function() { setSvView(v); }; }(opt[1])}
                  title={opt[1] === "diamond" ? "Diamond view" : "Table view"}
                  style={{ padding:"4px 10px", borderRadius:"5px", border:"none", cursor:"pointer", fontSize:"12px", fontFamily:"inherit", fontWeight:"bold",
                    background: active ? tokens.color.surface.card : "transparent", color: active ? tokens.color.brand.navy : tokens.color.text.muted,
                    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                  {opt[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Diamond view ─────────────────────────────────────── */}
        {svView === "diamond" ? (
          <div style={{ marginBottom:"16px" }}>
            {renderFieldSVG(getSharedPlayerFn, svInn, innArr)}
                          {/* Bench strip */}
            <div style={{ borderTop:"2px solid rgba(15,31,61,0.12)", paddingTop:"8px" }}>
              <div style={{ fontSize:"10px", fontWeight:"bold", color:"#555", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>Bench</div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ borderCollapse:"collapse", fontSize:"11px", width:"100%" }}>
                  <thead>
                    <tr style={{ background:"#f5efe4" }}>
                      {benchLabels.map(function(ii) {
                        return <th key={ii} style={{ padding:"4px 10px", textAlign:"center", fontSize:"10px", color:"#555", fontWeight:"bold", borderBottom:"2px solid rgba(15,31,61,0.12)", minWidth:"52px" }}>Inn {ii+1}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {(function() {
                      var maxB = 0;
                      for (var di = 0; di < benchDisplay.length; di++) { if (benchDisplay[di].length > maxB) maxB = benchDisplay[di].length; }
                      var maxOut = 0;
                      for (var doi = 0; doi < outDisplay.length; doi++) { if (outDisplay[doi].length > maxOut) maxOut = outDisplay[doi].length; }
                      var rows = [];
                      for (var r = 0; r < maxB; r++) {
                        rows.push(
                          <tr key={r}>
                            {benchLabels.map(function(lbl, ci) {
                              var pn = benchDisplay[ci][r] || "";
                              return <td key={lbl} style={{ padding:"4px 10px", textAlign:"center", borderBottom:"1px solid rgba(15,31,61,0.06)", fontWeight:"bold", color: pn ? tokens.color.brand.navy : "#ccc" }}>{pn ? firstName(pn) : "-"}</td>;
                            })}
                          </tr>
                        );
                      }
                      if (maxOut > 0) {
                        rows.push(
                          <tr key="out-hdr">
                            {benchLabels.map(function(lbl) {
                              return (
                                <td key={lbl} style={{ padding:"3px 10px", textAlign:"center",
                                  borderTop:"2px solid " + tokens.color.overlay.errorMedium,
                                  background:tokens.color.overlay.errorFaint,
                                  fontSize:"9px", fontWeight:"bold", color:"#dc2626",
                                  letterSpacing:"0.08em", textTransform:"uppercase" }}>
                                  Out
                                </td>
                              );
                            })}
                          </tr>
                        );
                        for (var or = 0; or < maxOut; or++) {
                          rows.push(
                            <tr key={"out-" + or}>
                              {benchLabels.map(function(lbl, ci) {
                                var pn = outDisplay[ci][or] || "";
                                return <td key={lbl} style={{ padding:"4px 10px", textAlign:"center", borderBottom:"1px solid " + tokens.color.overlay.errorSubtle, fontWeight:"bold", color: pn ? "#dc2626" : "#ccc", background:tokens.color.overlay.errorFaintest }}>{pn ? firstName(pn) : "-"}</td>;
                              })}
                            </tr>
                          );
                        }
                      }
                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* ── Table view ──────────────────────────────────────── */
          <div style={{ marginBottom:"16px" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
                <thead>
                  <tr style={{ background:"#f5efe4" }}>
                    <th style={{ padding:"7px 12px", textAlign:"left", fontSize:"10px", color:tokens.color.text.muted, borderBottom:"2px solid rgba(15,31,61,0.1)", position:"sticky", left:0, background:"#f5efe4" }}>Player</th>
                    {(svInn !== null ? [svInn] : innArr).map(function(i) {
                      return <th key={i} style={{ padding:"7px 10px", textAlign:"center", fontSize:"10px", color:tokens.color.text.muted, borderBottom:"2px solid rgba(15,31,61,0.1)", minWidth:"60px" }}>Inn {i+1}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rosterNames.map(function(name, ri) {
                    var isSelectedRow = svPlayer && name === svPlayer;
                    var rowBg = isSelectedRow ? "rgba(245,166,35,0.12)" : (ri%2===0 ? "#fff" : "#faf8f5");
                    return (
                      <tr key={name} style={{ background: rowBg }}>
                        <td style={{ padding:"6px 12px", fontWeight:"bold", position:"sticky", left:0, background: rowBg, borderBottom:"1px solid rgba(15,31,61,0.04)", color: isSelectedRow ? "#b45309" : tokens.color.brand.navy }}>{firstName(name)}</td>
                        {(svInn !== null ? [svInn] : innArr).map(function(i) {
                          var pos = (payload.grid[name] || [])[i] || "";
                          return (
                            <td key={i} style={{ padding:"4px 6px", textAlign:"center", borderBottom:"1px solid rgba(15,31,61,0.04)" }}>
                              {pos === "Out" ? (
                                <span style={{ display:"inline-block", padding:"2px 5px", borderRadius:"4px", fontWeight:"bold", fontSize:"11px", background:"#fee2e2", color:"#dc2626" }}>OUT</span>
                              ) : pos ? (
                                <span style={{ display:"inline-block", padding:"2px 5px", borderRadius:"4px", fontWeight:"bold", fontSize:"11px", background:(tokens.color.position[pos]||tokens.color.position.Bench)+"cc", color:"#fff" }}>{pos}</span>
                              ) : (
                                <span style={{ color:"#ccc" }}>-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Batting order ─────────────────────────────────────── */}
        {payload.batting && payload.batting.length > 0 ? (
          <Card padding="16px 18px" radius="md" style={{ border:"1px solid " + tokens.color.border.neutral, boxShadow: tokens.shadow.subtleCard, marginBottom:"14px", marginTop:"4px" }}>
            <div style={sectionTitleStyle}>Batting Order</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:"6px" }}>
              {payload.batting.map(function(name, idx) {
                var isSelectedBatter = svPlayer && name === svPlayer;
                var fieldPos = [];
                for (var ii = 0; ii < innCount; ii++) {
                  var pos = (payload.grid[name] || [])[ii];
                  if (!pos || pos === "") {
                    fieldPos.push("-");
                  } else if (pos === "Bench") {
                    fieldPos.push("–");
                  } else if (pos === "Out") {
                    fieldPos.push("OUT");
                  } else {
                    fieldPos.push(pos);
                  }
                }
                return (
                  <div key={name} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"7px 10px",
                    border:"1px solid " + (isSelectedBatter ? "#f5a623" : "rgba(15,31,61,0.08)"),
                    background: isSelectedBatter ? "rgba(245,166,35,0.08)" : undefined,
                    borderRadius:"6px" }}>
                    <div style={{ width:"20px", height:"20px", borderRadius:"50%",
                      background: isSelectedBatter ? "#f5a623" : tokens.color.brand.navy,
                      color: isSelectedBatter ? tokens.color.brand.navy : "#fff",
                      fontSize:"10px", fontWeight:"bold", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{idx+1}</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:"bold", fontSize:"12px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                        color: isSelectedBatter ? "#b45309" : undefined }}>{firstName(name)}</div>
                      {fieldPos.length > 0 ? (
                        <div style={{ fontSize:"9px", color:tokens.color.text.muted }}>
                          {fieldPos.map(function(fp, fpi) {
                            return (
                              <span key={fpi} style={{ color: fp === "OUT" ? "#dc2626" : "inherit", fontWeight: fp === "OUT" ? "bold" : "inherit" }}>
                                {fpi > 0 ? ", " : ""}{fp}
                              </span>
                            );
                          })}
                        </div>
                      ) : null}
                      {(function() {
                        var songData = payload.songs && payload.songs[name];
                        if (!songData || (!songData.song && !songData.artist)) return null;
                        return (
                          <div style={{ marginTop:"4px", paddingTop:"4px", borderTop:"1px solid rgba(15,31,61,0.08)" }}>
                            {songData.song && <div style={{ fontSize:"10px", fontWeight:"600", color:"#1e293b" }}>🎵 {songData.song}</div>}
                            {songData.artist && <div style={{ fontSize:"9px", color:"#64748b" }}>🎤 {songData.artist}</div>}
                            {songData.start && songData.end && <div style={{ fontSize:"9px", color:"#94a3b8" }}>⏱ {songData.start} → {songData.end}</div>}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
            {payload.absentNames && payload.absentNames.length > 0 ? (
              <div style={{ marginTop:"10px", paddingTop:"10px", borderTop:"1px solid rgba(15,31,61,0.08)", fontSize:"11px", color:"#94a3b8", fontStyle:"italic" }}>
                Not playing tonight: {payload.absentNames.map(function(n) { return n.split(" ")[0]; }).join(", ")}
              </div>
            ) : null}
          </Card>
        ) : null}

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div style={{ textAlign:"center", marginTop:"24px", fontSize:"11px", color:tokens.color.text.muted, borderTop:"1px solid rgba(15,31,61,0.08)", paddingTop:"16px" }}>
          <div style={{ marginBottom:"4px" }}>View-only lineup · Dugout Lineup</div>
          <div style={{ fontSize:"10px", color:"rgba(15,31,61,0.25)" }}>Tap Print to save as PDF or screenshot this page</div>
        </div>
      </div>
    </div>
  );
}
