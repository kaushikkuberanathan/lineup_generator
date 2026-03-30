/**
 * GameModeScreen
 * Full-screen live game overlay. Zero scroll, one-handed operation.
 * Layout (top → bottom): header bar · diamond field · bench strip · batting footer.
 * Inning advances via modal that previews the next inning's lineup.
 * Position circles are tappable for quick player swaps.
 * Diamond fades out/in (200ms each) on inning transition confirmation.
 *
 * Props:
 *   roster              {Array}     player objects with .name
 *   grid                {object}    player name → position[] per inning
 *   battingOrder        {string[]}  ordered player names
 *   innings             {number}    total innings configured (6 or 7)
 *   currentBatterIndex  {number}    current batter (0-based, shared with main app)
 *   onSwap              {function}  (inningIdx, playerAName, playerBName) → update grid
 *   onBatterAdvance     {function}  advance batter in main app state
 *   onBatterBack        {function}  retreat batter in main app state
 *   onExit              {function}  close game mode and return to Game Day tab
 */

import { useState } from "react";
import { NowBattingBar }  from "../../components/GameDay/NowBattingStrip";
import { DefenseDiamond } from "../../components/GameDay/DefenseDiamond";
import { BenchStrip }     from "./BenchStrip";
import { InningModal }    from "./InningModal";
import { QuickSwap }      from "./QuickSwap";

function firstName(name) {
  if (!name) return name;
  return name.split(" ")[0];
}

export function GameModeScreen({
  roster, grid, battingOrder, innings,
  currentBatterIndex,
  onSwap, onBatterAdvance, onBatterBack, onExit
}) {
  var _inn = useState(0);
  var currentInning = _inn[0]; var setCurrentInning = _inn[1];

  var _modal = useState(false);
  var inningModalOpen = _modal[0]; var setInningModalOpen = _modal[1];

  var _swap = useState(null);
  var swapTarget = _swap[0]; var setSwapTarget = _swap[1];

  // Diamond fade state — toggled on inning transition
  var _fade = useState(true);
  var diamondVisible = _fade[0]; var setDiamondVisible = _fade[1];

  var isLastInning = currentInning >= innings - 1;

  // Bench players for current inning
  var benchPlayers = roster.filter(function(p) {
    return (grid[p.name] || [])[currentInning] === "Bench";
  }).map(function(p) { return firstName(p.name); });

  function handleTapPosition(pos) {
    setSwapTarget(pos);
  }

  function handleSwap(playerAName, playerBName) {
    if (playerAName !== playerBName) {
      onSwap(currentInning, playerAName, playerBName);
    }
    setSwapTarget(null);
  }

  function handleInningConfirm() {
    setInningModalOpen(false);
    if (isLastInning) { onExit(); return; }
    // Fade out diamond → advance inning → fade in
    setDiamondVisible(false);
    setTimeout(function() {
      setCurrentInning(currentInning + 1);
      setDiamondVisible(true);
    }, 200);
  }

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:2000,
      background:"#0b1524",
      display:"flex", flexDirection:"column",
      fontFamily:"Georgia,'Times New Roman',serif",
      overflow:"hidden",
    }}>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div style={{
        display:"flex", alignItems:"center", gap:"10px",
        padding:"10px 16px",
        paddingTop:"max(10px, env(safe-area-inset-top, 10px))",
        background:"linear-gradient(180deg,#0f1f3d,#0b1524)",
        borderBottom:"1px solid rgba(255,255,255,0.08)",
        flexShrink:0,
      }}>
        {/* Exit */}
        <button onClick={onExit}
          style={{ padding:"8px 12px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.15)",
            background:"transparent", color:"#64748b", cursor:"pointer",
            fontSize:"13px", fontFamily:"Georgia,serif", flexShrink:0 }}>
          ✕ Exit
        </button>

        {/* Title */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", minWidth:0 }}>
          <div style={{ fontSize:"11px", color:"#475569", textTransform:"uppercase",
            letterSpacing:"0.15em" }}>
            Game Mode
          </div>
          <div style={{ fontSize:"18px", fontWeight:"bold", color:"#f5c842", lineHeight:1 }}>
            Inning {currentInning + 1}
            <span style={{ fontSize:"11px", color:"#475569", fontWeight:"normal",
              marginLeft:"4px" }}>
              of {innings}
            </span>
          </div>
        </div>

        {/* Inning advance */}
        <button
          onClick={function() { setInningModalOpen(true); }}
          style={{ padding:"8px 14px", borderRadius:"8px",
            background: isLastInning ? "rgba(255,255,255,0.06)" : "#f5c842",
            border:"none",
            color: isLastInning ? "#475569" : "#0f1f3d",
            cursor:"pointer", fontSize:"13px", fontWeight:"bold",
            fontFamily:"Georgia,serif", flexShrink:0 }}>
          {isLastInning ? "End ⏹" : "Next →"}
        </button>
      </div>

      {/* ── Diamond (flex:1, fades on inning transition) ────── */}
      {/* gm-diamond-wrap: hides DefenseDiamond's inning selector (first child)   */}
      {/* and its bench table (last child) — inning is driven by Next → only.     */}
      <style>{[
        ".gm-diamond-wrap > div > div:first-child { display:none !important; }",
        ".gm-diamond-wrap > div > div:last-child  { display:none !important; }",
      ].join("")}</style>
      <div className="gm-diamond-wrap" style={{
        flex:1, overflow:"auto",
        opacity: diamondVisible ? 1 : 0,
        transition:"opacity 200ms ease-in-out",
        padding:"12px 16px",
      }}>
        <DefenseDiamond
          roster={roster}
          grid={grid}
          innings={innings}
          selectedInning={currentInning}
          onSelectInning={function() {}}
        />
      </div>

      {/* ── Bench strip ─────────────────────────────────────── */}
      <BenchStrip benchPlayers={benchPlayers} />

      {/* ── Batting footer ──────────────────────────────────── */}
      <NowBattingBar
        battingOrder={battingOrder}
        currentIndex={currentBatterIndex}
        activeInning={currentInning + 1}
        onAdvance={onBatterAdvance}
        onBack={onBatterBack}
      />

      {/* ── Inning transition modal ──────────────────────────── */}
      {inningModalOpen ? (
        <InningModal
          currentInning={currentInning}
          totalInnings={innings}
          roster={roster}
          grid={grid}
          onConfirm={handleInningConfirm}
          onCancel={function() { setInningModalOpen(false); }}
        />
      ) : null}

      {/* ── Quick swap bottom sheet ──────────────────────────── */}
      {swapTarget ? (
        <QuickSwap
          position={swapTarget}
          inning={currentInning}
          roster={roster}
          grid={grid}
          onSwap={handleSwap}
          onClose={function() { setSwapTarget(null); }}
        />
      ) : null}
    </div>
  );
}
