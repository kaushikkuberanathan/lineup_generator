/**
 * InningModal
 * Full-screen overlay confirming the transition from one inning to the next.
 * Dynamically shows either the batting order (if team just finished fielding)
 * or the defensive positions (if team just finished batting), based on halfInning.
 *
 * Props:
 *   currentInning        {number}    0-based current inning
 *   totalInnings         {number}    total innings in the game
 *   roster               {Array}     player objects with .name, .battingHand
 *   grid                 {object}    player name → position[] per inning
 *   halfInning           {string}    "defense" | "batting" — what the team just finished
 *   battingOrder         {string[]}  ordered player names
 *   currentBatterIndex   {number}    0-based index of current lead-off batter
 *   onConfirm            {function}  called when coach confirms the inning advance
 *   onCancel             {function}  called when coach cancels
 */

import { useEffect } from "react";
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
  onConfirm, onCancel
}) {
  var a11y = isFlagEnabled('ACCESSIBILITY_V1');

  var nextInning = currentInning + 1;  // 0-based
  var isLastInning = currentInning >= totalInnings - 1;

  // What comes NEXT:
  //   just finished "defense" → team now BATS → show batting order
  //   just finished "batting" → team now FIELDS → show defensive positions
  var nextIsBatting = (halfInning === "defense");

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

  // ── Theme colors ──────────────────────────────────────────────
  var accentColor  = nextIsBatting ? "#f5c842" : "#4ade80";
  var headerBg     = nextIsBatting
    ? "linear-gradient(180deg,#1a1100,#0b0d00)"
    : "linear-gradient(180deg,#001a0d,#0b1524)";
  var confirmBg    = nextIsBatting ? "#f5c842" : "#4ade80";
  var confirmColor = "#0f1f3d";

  // ── Focus confirm button on mount when a11y is on ────────────
  useEffect(function() {
    if (!a11y) return;
    var confirmBtn = document.querySelector('[data-inning-confirm]');
    if (confirmBtn) confirmBtn.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Confirm button aria-label (dynamic) ──────────────────────
  var confirmAriaLabel = a11y
    ? (isLastInning
        ? "Exit game mode"
        : nextIsBatting
          ? "Start batting for inning " + (nextInning + 1)
          : "Take the field for inning " + (nextInning + 1))
    : undefined;

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
        background: headerBg,
        borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: a11y ? "12px" : "11px", color: a11y ? "#cbd5e1" : "#64748b",
          textTransform:"uppercase", letterSpacing:"0.15em", marginBottom:"6px" }}>
          {isLastInning ? "Final Inning" : "Inning " + (currentInning + 1) + " Complete"}
        </div>
        <div style={{ fontSize:"26px", fontWeight:"bold", color: accentColor, lineHeight:1.2 }}>
          {isLastInning
            ? "End of Game"
            : nextIsBatting
              ? "⚾ Your Half — Batting"
              : "⚔ Take the Field"}
        </div>
        {!isLastInning ? (
          <div style={{ fontSize:"12px", color: a11y ? "#cbd5e1" : "#64748b", marginTop:"6px" }}>
            {nextIsBatting
              ? "Dugout — get " + firstName(leadOff) + " in the box"
              : "Inning " + (nextInning + 1) + " positions are set"}
          </div>
        ) : null}
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>

        {/* ── Last inning / end of game ── */}
        {isLastInning ? (
          <div style={{ textAlign:"center", padding:"40px 0", color: a11y ? "#e2e8f0" : "#475569" }}>
            <div style={{ fontSize:"32px", marginBottom:"12px" }}>⚾</div>
            <div style={{ fontSize:"16px" }}>
              Game complete. Return to the lineup to unlock or share.
            </div>
          </div>

        /* ── Batting order view ── */
        ) : nextIsBatting ? (
          <>
            {/* Top 3 batters */}
            <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"16px" }}>

              {/* Lead-off — large */}
              {leadOff ? (
                <div style={{ padding:"14px 16px", borderRadius:"12px",
                  background:"rgba(245,200,66,0.12)",
                  border:"2px solid rgba(245,200,66,0.5)" }}>
                  <div style={{ fontSize: a11y ? "12px" : "10px", fontWeight:"bold", color:"#f5c842",
                    letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:"4px" }}>
                    Now Batting
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                    <div style={{ fontSize:"26px", fontWeight:"bold", color:"#f1f5f9",
                      flex:1 }}>
                      {firstName(leadOff)}
                    </div>
                    {getHand(leadOff) !== "U" ? (
                      <div style={{ fontSize:"11px", fontWeight:"bold", padding:"3px 8px",
                        borderRadius:"6px", background:"rgba(245,200,66,0.25)",
                        color:"#f5c842", letterSpacing:"0.05em" }}>
                        {getHand(leadOff)}
                      </div>
                    ) : null}
                    <div style={{ fontSize:"13px", color:"#f5c842", fontWeight:"bold" }}>→ Box</div>
                  </div>
                </div>
              ) : null}

              {/* On deck */}
              {onDeck ? (
                <div style={{ padding:"10px 14px", borderRadius:"10px",
                  background:"rgba(255,255,255,0.05)",
                  border:"1px solid rgba(255,255,255,0.12)" }}>
                  <div style={{ fontSize: a11y ? "12px" : "9px", fontWeight:"bold", color:"#94a3b8",
                    letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:"2px" }}>
                    On Deck
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                    <div style={{ fontSize:"18px", fontWeight:"bold", color:"#e2e8f0",
                      flex:1 }}>
                      {firstName(onDeck)}
                    </div>
                    {getHand(onDeck) !== "U" ? (
                      <div style={{ fontSize:"10px", fontWeight:"bold", padding:"2px 7px",
                        borderRadius:"5px", background:"rgba(255,255,255,0.1)",
                        color:"#94a3b8" }}>
                        {getHand(onDeck)}
                      </div>
                    ) : null}
                    <div style={{ fontSize:"11px", color: a11y ? "#cbd5e1" : "#64748b" }}>→ On-deck circle</div>
                  </div>
                </div>
              ) : null}

              {/* In the hole */}
              {inHole ? (
                <div style={{ padding:"9px 14px", borderRadius:"10px",
                  background:"rgba(255,255,255,0.03)",
                  border:"1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ fontSize: a11y ? "12px" : "9px", fontWeight:"bold",
                    color: a11y ? "#e2e8f0" : "#475569",
                    letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:"2px" }}>
                    In the Hole
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                    <div style={{ fontSize:"16px", fontWeight:"bold", color:"#94a3b8",
                      flex:1 }}>
                      {firstName(inHole)}
                    </div>
                    {getHand(inHole) !== "U" ? (
                      <div style={{ fontSize:"10px", fontWeight:"bold", padding:"2px 7px",
                        borderRadius:"5px", background:"rgba(255,255,255,0.06)",
                        color: a11y ? "#e2e8f0" : "#475569" }}>
                        {getHand(inHole)}
                      </div>
                    ) : null}
                    <div style={{ fontSize:"11px", color: a11y ? "#94a3b8" : "#334155" }}>→ Gear up</div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Rest of the order */}
            {restBatters.length > 0 ? (
              <>
                <div style={{ fontSize: a11y ? "12px" : "9px",
                  color: a11y ? "#e2e8f0" : "#475569", textTransform:"uppercase",
                  letterSpacing:"0.12em", marginBottom:"6px" }}>
                  Batting order continues
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                  {restBatters.map(function(name, i) {
                    return (
                      <div key={name} style={{ padding:"4px 10px", borderRadius:"14px",
                        background:"rgba(255,255,255,0.04)",
                        border:"1px solid rgba(255,255,255,0.07)",
                        fontSize:"12px", color: a11y ? "#e2e8f0" : "#475569" }}>
                        {leadIdx + 4 + i}. {firstName(name)}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </>

        /* ── Defensive positions view ── */
        ) : (
          <>
            <div style={{ fontSize: a11y ? "12px" : "10px", color:"#4ade80",
              textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"10px" }}>
              Inning {nextInning + 1} Positions
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
              {fieldPlayers.map(function(a) {
                var pc = POS_COLORS[a.pos] || "#555";
                return (
                  <div key={a.name} style={{ display:"flex", alignItems:"center", gap:"12px",
                    padding:"9px 12px", borderRadius:"8px",
                    background:"rgba(255,255,255,0.05)",
                    borderLeft:"3px solid " + pc }}>
                    <div
                      aria-label={a11y ? (POSITION_LABELS[a.pos] || a.pos) : undefined}
                      style={{ fontSize:"11px", fontWeight:"bold", color:pc,
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
                <div style={{ fontSize: a11y ? "12px" : "10px",
                  color: a11y ? "#e2e8f0" : "#475569", textTransform:"uppercase",
                  letterSpacing:"0.12em", marginBottom:"8px" }}>Bench</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
                  {benchPlayers.map(function(a) {
                    return (
                      <div key={a.name} style={{ padding:"5px 12px", borderRadius:"16px",
                        background:"rgba(255,255,255,0.06)",
                        border:"1px solid rgba(255,255,255,0.1)",
                        fontSize:"13px", color: a11y ? "#cbd5e1" : "#64748b" }}>
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

      {/* ── Action buttons ────────────────────────────────────── */}
      <div style={{ display:"flex", gap:"12px", padding:"16px 20px",
        paddingBottom:"max(16px, env(safe-area-inset-bottom, 16px))",
        borderTop:"1px solid rgba(255,255,255,0.08)" }}>
        <button
          onClick={onCancel}
          aria-label={a11y ? "Cancel inning advance" : undefined}
          style={{ flex:1, padding:"14px", borderRadius:"10px",
            minHeight: 44,
            background:"transparent", border:"1px solid rgba(255,255,255,0.15)",
            color:"#94a3b8", fontSize:"15px", cursor:"pointer",
            fontFamily:"Georgia,serif" }}>
          Cancel
        </button>
        <button
          onClick={onConfirm}
          data-inning-confirm
          aria-label={confirmAriaLabel}
          style={{ flex:2, padding:"14px", borderRadius:"10px",
            minHeight: 44,
            background: isLastInning ? "#334155" : confirmBg,
            border:"none",
            color: isLastInning ? "#94a3b8" : confirmColor,
            fontSize:"15px", fontWeight:"bold", cursor:"pointer",
            fontFamily:"Georgia,serif" }}>
          {isLastInning
            ? "Exit Game Mode"
            : nextIsBatting
              ? "⚾ Start Batting — Inning " + (nextInning + 1)
              : "⚔ Take the Field — Inning " + (nextInning + 1)}
        </button>
      </div>
    </div>
  );
}
