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
import { tokens } from "../../theme/tokens";
import { BottomSheet } from "../ui/BottomSheet";
import { Text } from "../ui/Text";

export function LockFlow({ activeWarnings, nextGame, hasPin, onConfirmLock, onRequestPin, onClose }) {
  var _step = useState(1);
  var step = _step[0]; var setStep = _step[1];

  var stepLabels = hasPin ? ["Review", "Confirm", "Lock"] : ["Review", "Confirm"];

  var textMuted = tokens.color.overlay.navyStrong;

  function StepIndicator() {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", marginBottom:"22px" }}>
        {stepLabels.map(function(label, i) {
          var num = i + 1;
          var isActive = step === num;
          var isDone   = step > num;
          var circleColor = isDone ? tokens.color.status.success : isActive ? tokens.color.brand.navy : "rgba(15,31,61,0.12)";
          var circleTextColor = isDone ? tokens.color.text.onDark : isActive ? tokens.color.text.onDark : textMuted;
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"3px" }}>
                <div style={{ width:"26px", height:"26px", borderRadius:tokens.radius.circle, background:circleColor,
                  color:circleTextColor, display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:tokens.font.size.sm, fontWeight:tokens.font.weight.bold }}>
                  {isDone ? "✓" : num}
                </div>
                <Text uppercase style={{ fontSize:"10px", letterSpacing:"0.05em",
                  color: isActive ? tokens.color.brand.navy : textMuted, fontWeight: isActive ? tokens.font.weight.bold : tokens.font.weight.regular }}>
                  {label}
                </Text>
              </div>
              {i < stepLabels.length - 1 ? (
                <div style={{ width:"28px", height:"1px", background:tokens.color.overlay.navyMedium, marginBottom:"14px" }} />
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
        <Text as="div" weight="bold" family="serif" style={{ fontSize:tokens.font.size.lg, color:tokens.color.brand.navy, marginBottom:"14px" }}>
          Review Lineup
        </Text>
        {!hasIssues ? (
          <div style={{ display:"flex", alignItems:"center", gap:"10px", background:"rgba(39,174,96,0.08)",
            border:"1px solid rgba(39,174,96,0.25)", borderRadius:"10px", padding:"14px", marginBottom:"18px" }}>
            <span style={{ fontSize:"20px" }}>✅</span>
            <div>
              <Text as="div" weight="bold" style={{ fontSize:tokens.font.size.md, color:tokens.color.status.success }}>Lineup looks good</Text>
              <Text as="div" style={{ fontSize:tokens.font.size.sm, color:"rgba(39,174,96,0.8)", marginTop:"2px" }}>No issues detected</Text>
            </div>
          </div>
        ) : (
          <div style={{ background:"rgba(200,16,46,0.04)", border:"1px solid rgba(200,16,46,0.15)", borderRadius:"10px", padding:"14px", marginBottom:"18px" }}>
            <Text as="div" weight="bold" style={{ fontSize:tokens.font.size.body, color:"#92400e", marginBottom:tokens.space.sm }}>
              {activeWarnings.length + " issue" + (activeWarnings.length === 1 ? "" : "s") + " must be resolved"}
            </Text>
            <ul style={{ margin:0, paddingLeft:"18px", marginBottom:"10px" }}>
              {activeWarnings.map(function(w, i) {
                return <Text as="li" key={i} style={{ fontSize:tokens.font.size.sm, color:"#78350f", lineHeight:tokens.font.lineHeight.comfortable }}>{w.msg || w}</Text>;
              })}
            </ul>
            <Text as="div" style={{ fontSize:tokens.font.size.xs, color:"#92400e", opacity:0.7 }}>
              Dismissed warnings are shown here — all issues must be fixed before locking.
            </Text>
          </div>
        )}
        <div style={{ display:"flex", gap:tokens.space.sm, justifyContent:"flex-end", flexWrap:"wrap" }}>
          <button onClick={onClose}
            style={{ padding:"9px 18px", borderRadius:tokens.radius.md, border:"1px solid rgba(15,31,61,0.2)",
              background:"transparent", color:tokens.color.brand.navy, fontSize:tokens.font.size.body, fontWeight:tokens.font.weight.bold, cursor:"pointer", fontFamily:tokens.font.family.serif }}>
            Cancel
          </button>
          {hasIssues ? (
            <button onClick={function() { setStep(2); }}
              style={{ padding:"9px 18px", borderRadius:tokens.radius.md, border:"1px solid rgba(200,16,46,0.3)",
                background:"transparent", color:"#b91c1c", fontSize:tokens.font.size.body, fontWeight:tokens.font.weight.bold, cursor:"pointer", fontFamily:tokens.font.family.serif }}>
              Lock Anyway →
            </button>
          ) : null}
          <button onClick={function() { setStep(2); }} disabled={hasIssues}
            style={{ padding:"9px 18px", borderRadius:tokens.radius.md, border:"none",
              background: hasIssues ? "rgba(15,31,61,0.1)" : tokens.color.brand.navy,
              color: hasIssues ? textMuted : tokens.color.text.onDark, fontSize:tokens.font.size.body, fontWeight:tokens.font.weight.bold,
              cursor: hasIssues ? "not-allowed" : "pointer", fontFamily:tokens.font.family.serif }}>
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
        <Text as="div" weight="bold" family="serif" style={{ fontSize:tokens.font.size.lg, color:tokens.color.brand.navy, marginBottom:"14px" }}>
          Confirm Lock
        </Text>
        <div style={{ background:tokens.color.overlay.navyWash, border:"1px solid rgba(15,31,61,0.1)", borderRadius:"10px", padding:"14px", marginBottom:"18px" }}>
          <Text as="div" uppercase style={{ fontSize:"10px", color:textMuted, marginBottom:"6px", letterSpacing:"0.05em" }}>
            You are about to lock the lineup for
          </Text>
          {gameLabel ? (
            <Text as="div" weight="bold" family="serif" style={{ fontSize:"15px", color:tokens.color.brand.navy }}>{gameLabel}</Text>
          ) : (
            <Text as="div" style={{ fontSize:tokens.font.size.md, color:tokens.color.brand.navy, fontStyle:"italic" }}>Next game</Text>
          )}
          <Text as="div" style={{ fontSize:tokens.font.size.sm, color:textMuted, marginTop:tokens.space.sm }}>
            Once locked, the lineup is read-only. Use your PIN to unlock and make changes.
          </Text>
        </div>
        <div style={{ display:"flex", gap:tokens.space.sm, justifyContent:"flex-end" }}>
          <button onClick={function() { setStep(1); }}
            style={{ padding:"9px 18px", borderRadius:tokens.radius.md, border:"1px solid rgba(15,31,61,0.2)",
              background:"transparent", color:tokens.color.brand.navy, fontSize:tokens.font.size.body, fontWeight:tokens.font.weight.bold, cursor:"pointer", fontFamily:tokens.font.family.serif }}>
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
            style={{ padding:"9px 18px", borderRadius:tokens.radius.md, border:"none",
              background:tokens.color.status.success, color:tokens.color.text.onDark, fontSize:tokens.font.size.body, fontWeight:tokens.font.weight.bold, cursor:"pointer", fontFamily:tokens.font.family.serif }}>
            Lock Lineup →
          </button>
        </div>
      </div>
    );
  }

  return (
    <BottomSheet
      open={true}
      onClose={onClose}
      ariaLabel="Lock Lineup"
      maxWidth="520px"
      maxHeight="80vh"
    >
      <StepIndicator />
      {step === 1 ? renderStep1() : renderStep2()}
    </BottomSheet>
  );
}
