/**
 * InningModal
 * Full-screen overlay confirming the transition from one inning to the next.
 * Shows both batting order and defensive positions so the coach can choose
 * which half to start next.
 *
 * Props:
 *   currentInning        {number}    0-based current inning
 *   totalInnings         {number}    total innings in the game
 *   roster               {Array}     player objects with .name, .battingHand
 *   grid                 {object}    player name → position[] per inning
 *   halfInning           {string}    "defense" | "batting" — what the team just finished
 *   battingOrder         {string[]}  ordered player names
 *   currentBatterIndex   {number}    0-based index of current lead-off batter
 *   onConfirm            {function}  called with nextHalf ("batting"|"defense") when coach confirms
 *   onCancel             {function}  called when coach cancels
 */

import { useEffect } from "react";
import { GiBaseballBat, GiBaseballGlove } from "react-icons/gi";
import { isFlagEnabled } from "../../config/featureFlags";
import { POSITION_LABELS } from "../../constants/positions";

var POS_COLORS = {
  P:"#e05c2a", C:"#7f3f3f", "1B":"#2471a3", "2B":"#2980b9",
  "3B":"#6c3483", SS:"#8e44ad", LF:"#1e8449", LC:"#27ae60",
  RC:"#8e44ad", RF:"#239b56", Bench:"#475569"
};

function firstName(name) {
  if (!name) return name;
  return name.split(" ")[0];
}

export function InningModal({
  currentInning, totalInnings, roster, grid,
  halfInning, battingOrder, currentBatterIndex,
  sport,
  onConfirm, onCancel
}) {
  var a11y = isFlagEnabled('ACCESSIBILITY_V1');
  var isSoftball = (sport || "baseball").toLowerCase() === "softball";
  var FieldIcon = isSoftball
    ? function() { return <span style={{ fontSize:"1em" }}>🥎</span>; }
    : GiBaseballGlove;

  var nextInning = currentInning + 1;  // 0-based
  var isLastInning = currentInning >= totalInnings - 1;

  // ── Batting order helpers ─────────────────────────────────────
  function getHand(name) {
    var p = (roster || []).find(function(r) { return r.name === name; });
    return p ? (p.battingHand || "U") : "U";
  }
  var bl = (battingOrder || []).length;
  var leadIdx  = bl > 0 ? ((currentBatterIndex || 0) % bl) : 0;
  var leadOff  = bl > 0 ? battingOrder[leadIdx]                  : null;
  var onDeck   = bl > 0 ? battingOrder[(leadIdx + 1) % bl]       : null;
  var inHole   = bl > 0 ? battingOrder[(leadIdx + 2) % bl]       : null;
  // Remaining order after the top 3
  var restBatters = bl > 3
    ? battingOrder.slice(leadIdx + 3).concat(
        leadIdx > 0 ? battingOrder.slice(0, leadIdx) : []
      )
    : [];

  // ── Field assignments for next inning ────────────────────────
  var nextAssignments = roster.map(function(p) {
    var pos = (grid[p.name] || [])[nextInning] || "";
    return { name: p.name, pos: pos };
  }).filter(function(a) { return a.pos !== ""; });
  var fieldPlayers = nextAssignments.filter(function(a) { return a.pos !== "Bench"; });
  var benchPlayers = nextAssignments.filter(function(a) { return a.pos === "Bench"; });

  // ── Focus first confirm button on mount when a11y is on ──────
  useEffect(function() {
    if (!a11y) return;
    var confirmBtn = document.querySelector('[data-inning-confirm]');
    if (confirmBtn) confirmBtn.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Modal aria-label (dynamic) ───────────────────────────────
  var modalAriaLabel = a11y
    ? (isLastInning ? "Game complete" : "Inning " + (currentInning + 1) + " complete")
    : undefined;

  return (
    <div
      role={a11y ? "dialog" : undefined}
      aria-modal={a11y ? "true" : undefined}
      aria-label={modalAriaLabel}
      style={{ position:"fixed", inset:0, zIndex:3000,
        background:"rgba(5,10,25,0.97)",
        display:"flex", flexDirection:"column",
        fontFamily:"Georgia,'Times New Roman',serif" }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ padding:"20px 20px 16px", textAlign:"center",
        background:"linear-gradient(180deg,#0f1a2e,#0b1524)",
        borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: a11y ? "12px" : "11px", color: a11y ? "#cbd5e1" : "#64748b",
          textTransform:"uppercase", letterSpacing:"0.15em", marginBottom:"6px" }}>
          {isLastInning ? "Final Inning" : "Inning " + (currentInning + 1) + " Complete"}
        </div>
        <div style={{ fontSize:"26px", fontWeight:"bold", color:"#f1f5f9", lineHeight:1.2 }}>
          {isLastInning ? "End of Game" : "What's Next?"}
        </div>
        {!isLastInning ? (
          <div style={{ fontSize: a11y ? "14px" : "12px", color: a11y ? "#94a3b8" : "#64748b", marginTop:"6px" }}>
            Choose which half to start
          </div>
        ) : null}
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>

        {/* ── Last inning / end of game ── */}
        {isLastInning ? (
          <div style={{ textAlign:"center", padding:"40px 0", color: a11y ? "#e2e8f0" : "#475569" }}>
            <div style={{ fontSize:"32px", marginBottom:"12px" }}><GiBaseballBat /></div>
            <div style={{ fontSize:"16px" }}>
              Game complete. Return to the lineup to unlock or share.
            </div>
          </div>

        /* ── Both halves preview ── */
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>

            {/* ── Batting preview card ── */}
            <div style={{ borderRadius:"12px", overflow:"hidden",
              border:"1px solid rgba(245,200,66,0.25)",
              background:"rgba(245,200,66,0.05)" }}>
              <div style={{ padding:"8px 14px",
                background:"rgba(245,200,66,0.12)",
                borderBottom:"1px solid rgba(245,200,66,0.15)",
                fontSize: a11y ? "12px" : "10px", fontWeight:"bold", color:"#f5c842",
                letterSpacing:"0.15em", textTransform:"uppercase" }}>
                <GiBaseballBat style={{ verticalAlign:"middle", marginRight:"5px" }} />Batting Order
              </div>
              <div style={{ padding:"10px 14px", display:"flex", flexDirection:"column", gap:"6px" }}>
                {leadOff ? (
                  <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                    <div style={{ fontSize: a11y ? "11px" : "9px", color:"#f5c842",
                      textTransform:"uppercase", letterSpacing:"0.1em", minWidth:"60px" }}>Now Batting</div>
                    <div style={{ fontSize: a11y ? "18px" : "16px", fontWeight:"bold", color:"#f1f5f9", flex:1 }}>
                      {firstName(leadOff)}
                    </div>
                    {getHand(leadOff) !== "U" ? (
                      <div style={{ fontSize:"10px", fontWeight:"bold", padding:"2px 7px",
                        borderRadius:"5px", background:"rgba(245,200,66,0.2)", color:"#f5c842" }}>
                        {getHand(leadOff)}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {onDeck ? (
                  <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                    <div style={{ fontSize: a11y ? "11px" : "9px", color:"#64748b",
                      textTransform:"uppercase", letterSpacing:"0.1em", minWidth:"60px" }}>On Deck</div>
                    <div style={{ fontSize: a11y ? "15px" : "13px", fontWeight:"bold", color:"#94a3b8", flex:1 }}>
                      {firstName(onDeck)}
                    </div>
                    {getHand(onDeck) !== "U" ? (
                      <div style={{ fontSize:"10px", fontWeight:"bold", padding:"2px 7px",
                        borderRadius:"5px", background:"rgba(255,255,255,0.08)", color:"#64748b" }}>
                        {getHand(onDeck)}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {inHole ? (
                  <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                    <div style={{ fontSize: a11y ? "11px" : "9px", color:"#475569",
                      textTransform:"uppercase", letterSpacing:"0.1em", minWidth:"60px" }}>In Hole</div>
                    <div style={{ fontSize: a11y ? "14px" : "12px", color:"#64748b", flex:1 }}>
                      {firstName(inHole)}
                    </div>
                  </div>
                ) : null}
                {restBatters.length > 0 ? (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", paddingTop:"4px",
                    borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                    {restBatters.map(function(name, i) {
                      return (
                        <div key={name} style={{ padding:"2px 8px", borderRadius:"10px",
                          background:"rgba(255,255,255,0.04)",
                          fontSize: a11y ? "12px" : "11px", color: a11y ? "#94a3b8" : "#475569" }}>
                          {leadIdx + 4 + i}. {firstName(name)}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            {/* ── Defense preview card ── */}
            <div style={{ borderRadius:"12px", overflow:"hidden",
              border:"1px solid rgba(74,222,128,0.25)",
              background:"rgba(74,222,128,0.04)" }}>
              <div style={{ padding:"8px 14px",
                background:"rgba(74,222,128,0.10)",
                borderBottom:"1px solid rgba(74,222,128,0.15)",
                fontSize: a11y ? "12px" : "10px", fontWeight:"bold", color:"#4ade80",
                letterSpacing:"0.15em", textTransform:"uppercase" }}>
                <FieldIcon style={{ verticalAlign:"middle", marginRight:"5px" }} />Inning {nextInning + 1} Positions
              </div>
              <div style={{ padding:"10px 14px" }}>
                <div style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
                  {fieldPlayers.map(function(a) {
                    var pc = POS_COLORS[a.pos] || "#555";
                    return (
                      <div key={a.name} style={{ display:"flex", alignItems:"center", gap:"10px",
                        padding:"6px 10px", borderRadius:"7px",
                        background:"rgba(255,255,255,0.04)",
                        borderLeft:"3px solid " + pc }}>
                        <div
                          aria-label={a11y ? (POSITION_LABELS[a.pos] || a.pos) : undefined}
                          style={{ fontSize:"10px", fontWeight:"bold", color:pc,
                            minWidth:"24px", textAlign:"right" }}>{a.pos}</div>
                        <div style={{ fontSize: a11y ? "15px" : "14px", fontWeight:"bold", color:"#e2e8f0" }}>
                          {firstName(a.name)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {benchPlayers.length > 0 ? (
                  <div style={{ marginTop:"10px", display:"flex", flexWrap:"wrap", gap:"6px",
                    paddingTop:"8px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: a11y ? "11px" : "9px", color: a11y ? "#94a3b8" : "#475569",
                      textTransform:"uppercase", letterSpacing:"0.1em", width:"100%",
                      marginBottom:"2px" }}>Bench</div>
                    {benchPlayers.map(function(a) {
                      return (
                        <div key={a.name} style={{ padding:"3px 10px", borderRadius:"12px",
                          background:"rgba(255,255,255,0.05)",
                          border:"1px solid rgba(255,255,255,0.08)",
                          fontSize:"12px", color: a11y ? "#94a3b8" : "#64748b" }}>
                          {firstName(a.name)}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── Action buttons ────────────────────────────────────── */}
      <div style={{ display:"flex", flexDirection:"column", gap:"8px", padding:"16px 20px",
        paddingBottom:"max(16px, env(safe-area-inset-bottom, 16px))",
        borderTop:"1px solid rgba(255,255,255,0.08)" }}>

        {isLastInning ? (
          <button
            onClick={function() { onConfirm(null); }}
            data-inning-confirm
            aria-label={a11y ? "Exit game mode" : undefined}
            style={{ padding:"14px", borderRadius:"10px", minHeight:44,
              background:"#334155", border:"none",
              color:"#94a3b8", fontSize:"15px", fontWeight:"bold", cursor:"pointer",
              fontFamily:"Georgia,serif" }}>
            Exit Game Mode
          </button>
        ) : (
          <>
            <button
              onClick={function() { onConfirm("batting"); }}
              data-inning-confirm
              aria-label={a11y ? "Start batting for inning " + (nextInning + 1) : undefined}
              style={{ padding:"14px", borderRadius:"10px", minHeight:44,
                background:"#f5c842", border:"none",
                color:"#0f1f3d", fontSize:"15px", fontWeight:"bold", cursor:"pointer",
                fontFamily:"Georgia,serif" }}>
              <GiBaseballBat style={{ verticalAlign:"middle", marginRight:"6px" }} />Start Batting — Inning {nextInning + 1}
            </button>
            <button
              onClick={function() { onConfirm("defense"); }}
              aria-label={a11y ? "Take the field for inning " + (nextInning + 1) : undefined}
              style={{ padding:"14px", borderRadius:"10px", minHeight:44,
                background:"#4ade80", border:"none",
                color:"#0f1f3d", fontSize:"15px", fontWeight:"bold", cursor:"pointer",
                fontFamily:"Georgia,serif" }}>
              <FieldIcon style={{ verticalAlign:"middle", marginRight:"6px" }} />Take the Field — Inning {nextInning + 1}
            </button>
          </>
        )}

        <button
          onClick={onCancel}
          aria-label={a11y ? "Cancel inning advance" : undefined}
          style={{ padding:"12px", borderRadius:"10px", minHeight:44,
            background:"transparent", border:"1px solid rgba(255,255,255,0.15)",
            color:"#94a3b8", fontSize:"14px", cursor:"pointer",
            fontFamily:"Georgia,serif" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
