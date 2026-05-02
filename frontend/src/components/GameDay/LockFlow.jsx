/**
 * LockFlow
 * Extracted from App.jsx v1.6.9
 * 3-step bottom-sheet modal for finalizing a lineup.
 * Props:
 *   activeWarnings  {Array}     list of active warning objects (with .msg or string)
 *   nextGame        {object|null}  next scheduled game {date, opponent, time}
 *   hasPin          {boolean}   whether a coach PIN is set
 *   onConfirmLock   {function}  called when user confirms lock (no PIN)
 *   onRequestPin    {function}  called when user confirms lock (PIN needed)
 *   onClose         {function}  called to close the modal
 */

import { useState } from "react";

export function LockFlow({ activeWarnings, nextGame, hasPin, onConfirmLock, onRequestPin, onClose }) {
  var _step = useState(1);
  var step = _step[0]; var setStep = _step[1];

  var totalSteps = hasPin ? 3 : 2;
  var stepLabels = hasPin ? ["Review", "Confirm", "Lock"] : ["Review", "Confirm"];

  var navy = "#0f1f3d";
  var win  = "#27ae60";
  var gold = "#b8860b";
  var textMuted = "rgba(15,31,61,0.45)";

  function StepIndicator() {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", marginBottom:"22px" }}>
        {stepLabels.map(function(label, i) {
          var num = i + 1;
          var isActive = step === num;
          var isDone   = step > num;
          var circleColor = isDone ? win : isActive ? navy : "rgba(15,31,61,0.12)";
          var circleTextColor = isDone ? "#fff" : isActive ? "#fff" : textMuted;
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"3px" }}>
                <div style={{ width:"26px", height:"26px", borderRadius:"50%", background:circleColor,
                  color:circleTextColor, display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:"12px", fontWeight:"bold" }}>
                  {isDone ? "✓" : num}
                </div>
                <span style={{ fontSize:"10px", letterSpacing:"0.05em", textTransform:"uppercase",
                  color: isActive ? navy : textMuted, fontWeight: isActive ? "bold" : "normal" }}>
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 ? (
                <div style={{ width:"28px", height:"1px", background:"rgba(15,31,61,0.15)", marginBottom:"14px" }} />
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  var hasIssues = activeWarnings && activeWarnings.length > 0;

  function renderStep1() {
    return (
      <div>
        <div style={{ fontSize:"16px", fontWeight:"bold", color:navy, fontFamily:"Georgia,serif", marginBottom:"14px" }}>
          Review Lineup
        </div>
        {!hasIssues ? (
          <div style={{ display:"flex", alignItems:"center", gap:"10px", background:"rgba(39,174,96,0.08)",
            border:"1px solid rgba(39,174,96,0.25)", borderRadius:"10px", padding:"14px", marginBottom:"18px" }}>
            <span style={{ fontSize:"20px" }}>✅</span>
            <div>
              <div style={{ fontSize:"14px", fontWeight:"bold", color:win }}>Lineup looks good</div>
              <div style={{ fontSize:"12px", color:"rgba(39,174,96,0.8)", marginTop:"2px" }}>No issues detected</div>
            </div>
          </div>
        ) : (
          <div style={{ background:"rgba(200,16,46,0.04)", border:"1px solid rgba(200,16,46,0.15)", borderRadius:"10px", padding:"14px", marginBottom:"18px" }}>
            <div style={{ fontSize:"13px", fontWeight:"bold", color:"#92400e", marginBottom:"8px" }}>
              {activeWarnings.length + " issue" + (activeWarnings.length === 1 ? "" : "s") + " must be resolved"}
            </div>
            <ul style={{ margin:0, paddingLeft:"18px", marginBottom:"10px" }}>
              {activeWarnings.map(function(w, i) {
                return <li key={i} style={{ fontSize:"12px", color:"#78350f", lineHeight:1.6 }}>{w.msg || w}</li>;
              })}
            </ul>
            <div style={{ fontSize:"11px", color:"#92400e", opacity:0.7 }}>
              Dismissed warnings are shown here — all issues must be fixed before locking.
            </div>
          </div>
        )}
        <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end", flexWrap:"wrap" }}>
          <button onClick={onClose}
            style={{ padding:"9px 18px", borderRadius:"8px", border:"1px solid rgba(15,31,61,0.2)",
              background:"transparent", color:navy, fontSize:"13px", fontWeight:"bold", cursor:"pointer", fontFamily:"Georgia,serif" }}>
            Cancel
          </button>
          {hasIssues ? (
            <button onClick={function() { setStep(2); }}
              style={{ padding:"9px 18px", borderRadius:"8px", border:"1px solid rgba(200,16,46,0.3)",
                background:"transparent", color:"#b91c1c", fontSize:"13px", fontWeight:"bold", cursor:"pointer", fontFamily:"Georgia,serif" }}>
              Lock Anyway →
            </button>
          ) : null}
          <button onClick={function() { setStep(2); }} disabled={hasIssues}
            style={{ padding:"9px 18px", borderRadius:"8px", border:"none",
              background: hasIssues ? "rgba(15,31,61,0.1)" : navy,
              color: hasIssues ? textMuted : "#fff", fontSize:"13px", fontWeight:"bold",
              cursor: hasIssues ? "not-allowed" : "pointer", fontFamily:"Georgia,serif" }}>
            Continue to Lock →
          </button>
        </div>
      </div>
    );
  }

  function renderStep2() {
    var gameLabel = null;
    if (nextGame) {
      var d = new Date(nextGame.date + "T12:00:00");
      var dateStr = d.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
      gameLabel = dateStr + (nextGame.opponent ? " · vs " + nextGame.opponent : "");
    }
    return (
      <div>
        <div style={{ fontSize:"16px", fontWeight:"bold", color:navy, fontFamily:"Georgia,serif", marginBottom:"14px" }}>
          Confirm Lock
        </div>
        <div style={{ background:"rgba(15,31,61,0.04)", border:"1px solid rgba(15,31,61,0.1)", borderRadius:"10px", padding:"14px", marginBottom:"18px" }}>
          <div style={{ fontSize:"13px", color:textMuted, marginBottom:"6px", letterSpacing:"0.05em", textTransform:"uppercase", fontSize:"10px" }}>
            You are about to lock the lineup for
          </div>
          {gameLabel ? (
            <div style={{ fontSize:"15px", fontWeight:"bold", color:navy, fontFamily:"Georgia,serif" }}>{gameLabel}</div>
          ) : (
            <div style={{ fontSize:"14px", color:navy, fontStyle:"italic" }}>Next game</div>
          )}
          <div style={{ fontSize:"12px", color:textMuted, marginTop:"8px" }}>
            Once locked, the lineup is read-only. Use your PIN to unlock and make changes.
          </div>
        </div>
        <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end" }}>
          <button onClick={function() { setStep(1); }}
            style={{ padding:"9px 18px", borderRadius:"8px", border:"1px solid rgba(15,31,61,0.2)",
              background:"transparent", color:navy, fontSize:"13px", fontWeight:"bold", cursor:"pointer", fontFamily:"Georgia,serif" }}>
            ← Go Back
          </button>
          <button onClick={function() {
              if (hasPin) {
                onRequestPin();
                onClose();
              } else {
                onConfirmLock();
                onClose();
              }
            }}
            style={{ padding:"9px 18px", borderRadius:"8px", border:"none",
              background:win, color:"#fff", fontSize:"13px", fontWeight:"bold", cursor:"pointer", fontFamily:"Georgia,serif" }}>
            Lock Lineup →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.55)", zIndex:9000,
      display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={function(e) { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Lock Lineup"
        style={{ background:"#fff", borderRadius:"16px 16px 0 0", padding:"24px 20px 32px",
        width:"100%", maxWidth:"520px", maxHeight:"80vh", overflowY:"auto",
        boxShadow:"0 -4px 24px rgba(0,0,0,0.18)" }}>
        {/* Close handle */}
        <div style={{ width:"36px", height:"4px", borderRadius:"2px", background:"rgba(15,31,61,0.15)", margin:"-8px auto 20px" }} />
        <StepIndicator />
        {step === 1 ? renderStep1() : renderStep2()}
      </div>
    </div>
  );
}
