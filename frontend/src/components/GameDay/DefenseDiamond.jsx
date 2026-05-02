/**
 * DefenseDiamond
 * Extracted from App.jsx renderGrid() IIFE.
 * Green SVG field view with position boxes, inning selector, and bench strip.
 * Used by the Defense sub-tab (App.jsx) and Game Mode (GameModeScreen.jsx).
 *
 * Props:
 *   roster          {Array}        player objects with .name
 *   grid            {object}       player name → position[] per inning
 *   innings         {number}       total innings
 *   selectedInning  {number|null}  optional — when passed, component is controlled
 *   onSelectInning  {function}     optional — called when user picks an inning
 *
 * Controlled mode (App.jsx Defense tab):
 *   Pass selectedInning + onSelectInning to keep App-level diamondInning state in sync.
 * Uncontrolled mode (Game Mode):
 *   Omit both — component manages its own inning selection internally.
 */

import { useState } from "react";
import { tokens } from "../../theme/tokens";

var POS_COLORS = {
  P:"#e05c2a", C:"#7f3f3f", "1B":"#2471a3", "2B":"#2980b9",
  "3B":"#6c3483", SS:"#8e44ad", LF:"#1e8449", LC:"#2980b9",
  RC:"#8e44ad", RF:"#239b56", Bench:"#555555"
};

var navy      = "#0f1f3d";
var textMuted = "#6b7280";
var red       = "#c8102e";

function firstName(name) {
  if (!name) return name;
  return name.split(" ")[0];
}

export function DefenseDiamond({ roster, grid, innings, selectedInning, onSelectInning, onPositionTap = null }) {
  var _localInn = useState(null);
  var localInn = _localInn[0]; var setLocalInn = _localInn[1];

  // Controlled if selectedInning prop is provided; uncontrolled otherwise
  var diamondInning    = (selectedInning  !== undefined) ? selectedInning  : localInn;
  var setDiamondInning = (onSelectInning  !== undefined) ? onSelectInning  : setLocalInn;

  var innArr = [];
  for (var i = 0; i < innings; i++) innArr.push(i);

  function getGridPlayerFn(pos, inn) {
    for (var pi = 0; pi < roster.length; pi++) {
      if ((grid[roster[pi].name] || [])[inn] === pos) { return roster[pi].name; }
    }
    return "";
  }

  function getGridPlayersFn(pos, inn) {
    var players = [];
    for (var pi = 0; pi < roster.length; pi++) {
      if ((grid[roster[pi].name] || [])[inn] === pos) { players.push(roster[pi].name); }
    }
    return players;
  }

  function renderFieldSVG(getPlayerFn, innFilter, localInnArr) {
    var isSingle = innFilter !== null && innFilter !== undefined;
    var HDR_COLORS = {
      "LF":"#1a6e3a", "RF":"#1a6e3a",
      "LC":"#1a5580",
      "RC":"#5c2878",
      "SS":"#8a4a0a", "2B":"#8a4a0a",
      "3B":"#7a1a10", "P":"#7a1a10", "1B":"#7a1a10",
      "C":"#14406e",
      "Bench":"#2a2a2a"
    };
    var BOX_H = isSingle ? 54 : (30 + (localInnArr.length * 11) + 4);
    // For Bench box in single-inning mode, grow height to fit all bench players
    var benchNames = (isSingle && innFilter !== null && innFilter !== undefined)
      ? getGridPlayersFn("Bench", innFilter) : [];
    var outNames = (isSingle && innFilter !== null && innFilter !== undefined)
      ? getGridPlayersFn("Out", innFilter) : [];
    var BENCH_BOX_H = isSingle
      ? Math.max(BOX_H, 24 + Math.max(1, benchNames.length + outNames.length) * 16)
      : BOX_H;
    var VB_H = isSingle
      ? Math.max(640, 490 + BENCH_BOX_H + 12)
      : (555 + BOX_H + 30);
    var SVG_POSITIONS = isSingle ? [
      { pos:"LF", x:42,  y:175, w:112, h:BOX_H },
      { pos:"LC", x:170, y:138, w:112, h:BOX_H },
      { pos:"RC", x:398, y:138, w:112, h:BOX_H },
      { pos:"RF", x:526, y:175, w:112, h:BOX_H },
      { pos:"SS", x:190, y:300, w:112, h:BOX_H },
      { pos:"2B", x:378, y:300, w:112, h:BOX_H },
      { pos:"3B", x:148, y:415, w:112, h:BOX_H },
      { pos:"P",  x:284, y:405, w:112, h:BOX_H },
      { pos:"1B", x:420, y:415, w:112, h:BOX_H },
      { pos:"C",  x:284, y:555, w:112, h:BOX_H },
      { pos:"Bench", x:535, y:490, w:112, h:BENCH_BOX_H }
    ] : [
      { pos:"LF", x:42,  y:165, w:112, h:BOX_H },
      { pos:"LC", x:170, y:128, w:112, h:BOX_H },
      { pos:"RC", x:398, y:128, w:112, h:BOX_H },
      { pos:"RF", x:526, y:165, w:112, h:BOX_H },
      { pos:"SS", x:190, y:300, w:112, h:BOX_H },
      { pos:"2B", x:378, y:300, w:112, h:BOX_H },
      { pos:"3B", x:148, y:415, w:112, h:BOX_H },
      { pos:"P",  x:284, y:405, w:112, h:BOX_H },
      { pos:"1B", x:420, y:415, w:112, h:BOX_H },
      { pos:"C",  x:284, y:555, w:112, h:BOX_H }
    ];
    return (
      <div style={{ position:"relative", width:"100%", maxWidth:"680px", margin:"0 auto", marginBottom:"10px" }}>
        <svg viewBox={"0 0 680 " + VB_H} width="100%" style={{ display:"block" }}>
          <rect x="0" y="0" width="680" height={VB_H} rx="8" fill="#2d7a3a"/>
          <path d="M 60 580 Q 340 30 620 580 Z" fill="#3a9147" fillOpacity="0.5" stroke="#3a9147" strokeOpacity="0.18" strokeWidth="1"/>
          <line x1="340" y1="565" x2="60" y2="580" stroke="white" strokeOpacity="0.3" strokeDasharray="6,4" strokeWidth="1.5"/>
          <line x1="340" y1="565" x2="620" y2="580" stroke="white" strokeOpacity="0.3" strokeDasharray="6,4" strokeWidth="1.5"/>
          <ellipse cx="340" cy="430" rx="170" ry="140" fill="#b5845a" fillOpacity="0.85"/>
          <polygon points="340,555 490,415 340,275 190,415" fill="#c49a6c" fillOpacity="0.6" stroke="#e8d5b0" strokeOpacity="0.8" strokeWidth="2"/>
          <circle cx="340" cy="435" r="18" fill="#c9a070" fillOpacity="0.9"/>
          {isSingle && (
            <g>
              <rect x="300" y="8" width="80" height="22" rx="11" fill="rgba(0,0,0,0.35)"/>
              <text x="340" y="23" textAnchor="middle" fontSize="10" fontWeight="600" fill="white" fontFamily="system-ui,sans-serif">
                {"Inning " + (innFilter + 1)}
              </text>
            </g>
          )}
          {SVG_POSITIONS.map(function(slot) {
            var pc = POS_COLORS[slot.pos] || "#555555";
            var hc = HDR_COLORS[slot.pos] || "#2a2a2a";
            var cx = slot.x + slot.w / 2;
            var hdrFs = isSingle ? "10" : "8.5";
            return (
              <g key={slot.pos}
                onClick={onPositionTap ? function() { onPositionTap(slot.pos); } : null}
                style={{ cursor: onPositionTap ? "pointer" : "default" }}>
                <rect x={slot.x} y={slot.y} width={slot.w} height={slot.h} rx="6"
                  fill={pc} fillOpacity="0.22"
                  stroke={pc} strokeOpacity="0.55" strokeWidth="0.5"/>
                <rect x={slot.x} y={slot.y} width={slot.w} height="20" rx="6"
                  fill={hc} fillOpacity="0.88"/>
                <rect x={slot.x} y={slot.y + 10} width={slot.w} height="10" rx="0"
                  fill={hc} fillOpacity="0.88"/>
                <text x={cx} y={slot.y + 13} textAnchor="middle"
                  fontSize={hdrFs} fontWeight="700" fill="white" fillOpacity="0.92"
                  fontFamily="system-ui,sans-serif">
                  {slot.pos}
                </text>
                {isSingle ? (
                  slot.pos === "Bench" ? (
                    <g>
                      {benchNames.length === 0 && outNames.length === 0 ? (
                        <text x={cx} y={slot.y + 38} textAnchor="middle"
                          fontSize="13" fontWeight="700" fill="white"
                          fontFamily="system-ui,sans-serif">-</text>
                      ) : null}
                      {benchNames.map(function(n, idx) {
                        return (
                          <text key={n} x={cx} y={slot.y + 34 + (idx * 16)} textAnchor="middle"
                            fontSize="12" fontWeight="700" fill="white"
                            fontFamily="system-ui,sans-serif">
                            {firstName(n)}
                          </text>
                        );
                      })}
                      {outNames.map(function(n, idx) {
                        return (
                          <text key={"out-" + n} x={cx} y={slot.y + 34 + ((benchNames.length + idx) * 16)} textAnchor="middle"
                            fontSize="11" fontWeight="700" fill="#dc2626"
                            fontFamily="system-ui,sans-serif">
                            {"OUT " + firstName(n)}
                          </text>
                        );
                      })}
                    </g>
                  ) : (
                    <text x={cx} y={slot.y + 40} textAnchor="middle"
                      fontSize="14" fontWeight="700" fill="white"
                      fontFamily="system-ui,sans-serif">
                      {(function() { var n = getPlayerFn(slot.pos, innFilter); return n ? firstName(n) : "-"; })()}
                    </text>
                  )
                ) : (
                  localInnArr.map(function(ii, idx) {
                    var n = getPlayerFn(slot.pos, ii);
                    return (
                      <text key={ii} x={cx} y={slot.y + 30 + (idx * 11)} textAnchor="middle"
                        fontSize="7.5" fill="white" fillOpacity={n ? "1" : "0.4"}
                        fontFamily="system-ui,sans-serif">
                        {n ? firstName(n) : "-"}
                      </text>
                    );
                  })
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // Bench by inning
  var benchByInning = innArr.map(function(b) {
    return roster
      .filter(function(r) { return (grid[r.name] || [])[b] === "Bench"; })
      .map(function(r) { return r.name; });
  });
  var outByInning = innArr.map(function(b) {
    return roster
      .filter(function(r) { return (grid[r.name] || [])[b] === "Out"; })
      .map(function(r) { return r.name; });
  });

  var benchDisplay   = diamondInning !== null ? [benchByInning[diamondInning] || []] : benchByInning;
  var outDisplay     = diamondInning !== null ? [outByInning[diamondInning] || []]   : outByInning;
  var benchInnLabels = diamondInning !== null ? [diamondInning] : innArr;

  // TODO(v2.5.x): align to design tokens
  //   - Replace raw '1.5px' border-width with a token when tokens.borderWidth.thin is added
  //   - Add tokens.color.semantic.interactiveBorder for navy interactive borders
  return (
    <div>

      {/* ── Inning selector — single scrollable row ────── */}
      <div style={{ display:"flex", flexWrap:"nowrap", gap:"4px", alignItems:"center",
        marginBottom:"12px", overflowX:"auto", WebkitOverflowScrolling:"touch", paddingBottom:"2px" }}>
        <span style={{ fontSize:"11px", color:textMuted, fontWeight:"bold",
          textTransform:"uppercase", letterSpacing:"0.08em", flexShrink:0 }}>Inn</span>
        <button
          onClick={function() { setDiamondInning(null); }}
          style={{ padding:"3px 8px", borderRadius:"10px",
            border: "1.5px solid " + tokens.color.brand.navy,
            cursor:"pointer",
            fontSize:"11px", fontWeight:"bold", fontFamily:"inherit", flexShrink:0,
            background: diamondInning === null ? tokens.color.brand.navy : "transparent",
            color: diamondInning === null ? "#fff" : tokens.color.brand.navy }}>
          All
        </button>
        {innArr.map(function(i) {
          var active = diamondInning === i;
          return (
            <button key={i}
              onClick={function(idx) { return function() { setDiamondInning(idx); }; }(i)}
              style={{ padding:"3px 8px", borderRadius:"10px",
                border: active ? "1.5px solid " + red : "1.5px solid " + tokens.color.brand.navy,
                cursor:"pointer",
                fontSize:"11px", fontWeight:"bold", fontFamily:"inherit", flexShrink:0,
                background: active ? red : "transparent",
                color: active ? "#fff" : tokens.color.brand.navy }}>
              {i + 1}
            </button>
          );
        })}
      </div>

      {renderFieldSVG(getGridPlayerFn, diamondInning, innArr)}

      {/* ── Bench strip ─────────────────────────────── */}
      <div style={{ borderTop:"2px solid rgba(15,31,61,0.15)", paddingTop:"10px" }}>
        <div style={{ fontSize:"10px", fontWeight:"bold", color:"#555",
          textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"6px" }}>Bench</div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ borderCollapse:"collapse", fontSize:"11px", width:"100%" }}>
            <thead>
              <tr style={{ background:"#f5efe4" }}>
                {benchInnLabels.map(function(i) {
                  return (
                    <th key={i} style={{ padding:"4px 10px", textAlign:"center", fontSize:"10px",
                      color:"#555", fontWeight:"bold", letterSpacing:"0.08em",
                      borderBottom:"2px solid rgba(15,31,61,0.15)", minWidth:"52px" }}>
                      Inn {i + 1}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {(function() {
                var maxBench = 0;
                for (var j = 0; j < benchDisplay.length; j++) {
                  if (benchDisplay[j].length > maxBench) maxBench = benchDisplay[j].length;
                }
                var maxOut = 0;
                for (var oj = 0; oj < outDisplay.length; oj++) {
                  if (outDisplay[oj].length > maxOut) maxOut = outDisplay[oj].length;
                }
                var rows = [];
                for (var r = 0; r < maxBench; r++) {
                  rows.push(
                    <tr key={r}>
                      {benchInnLabels.map(function(i, ci) {
                        var pname = benchDisplay[ci][r] || "";
                        return (
                          <td key={i} style={{ padding:"4px 10px", textAlign:"center",
                            borderBottom:"1px solid rgba(15,31,61,0.06)",
                            fontWeight:"bold", color: pname ? "#0f1f3d" : "#ccc" }}>
                            {pname ? firstName(pname) : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                }
                if (maxOut > 0) {
                  rows.push(
                    <tr key="out-hdr">
                      {benchInnLabels.map(function(i) {
                        return (
                          <td key={i} style={{ padding:"3px 10px", textAlign:"center",
                            borderTop:"2px solid rgba(220,38,38,0.3)",
                            background:"rgba(220,38,38,0.05)",
                            fontSize:"11px", fontWeight:"bold", color:"#dc2626",
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
                        {benchInnLabels.map(function(i, ci) {
                          var pname = outDisplay[ci][or] || "";
                          return (
                            <td key={i} style={{ padding:"4px 10px", textAlign:"center",
                              borderBottom:"1px solid rgba(220,38,38,0.08)",
                              fontWeight:"bold",
                              color: pname ? "#dc2626" : "#ccc",
                              background:"rgba(220,38,38,0.04)" }}>
                              {pname ? firstName(pname) : "-"}
                            </td>
                          );
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
  );
}
