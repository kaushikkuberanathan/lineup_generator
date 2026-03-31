/**
 * GameModeScreen
 * Full-screen live game overlay. Zero scroll, one-handed operation.
 * Layout (top → bottom): header bar · half-inning pill · diamond field · bench strip · batting footer.
 * Inning advances via modal that previews the next inning's lineup.
 * Position circles are tappable for quick player swaps.
 * Diamond fades out/in (200ms each) on inning transition confirmation.
 * Half-inning pill toggles between DEFENSE and BATTING — visual only, resets on inning advance.
 *
 * Props:
 *   roster              {Array}     player objects with .name
 *   grid                {object}    player name → position[] per inning
 *   battingOrder        {string[]}  ordered player names
 *   innings             {number}    total innings configured (6 or 7)
 *   currentBatterIndex  {number}    current batter (0-based, shared with main app)
 *   initialInning       {number}    inning to restore to on open (0-based, persisted)
 *   onSwap              {function}  (inningIdx, playerAName, playerBName) → update grid
 *   onBatterAdvance     {function}  advance batter in main app state
 *   onBatterBack        {function}  retreat batter in main app state
 *   onInningChange      {function}  (newInning) → persist inning in main app state
 *   onBatterReset       {function}  reset batter index + inning to 0 in main app state
 *   onExit              {function}  close game mode and return to Game Day tab
 */

import { useState, useEffect, useRef } from "react";
import { NowBattingBar }  from "../../components/GameDay/NowBattingStrip";
import { DefenseDiamond } from "../../components/GameDay/DefenseDiamond";
import { InningModal }    from "./InningModal";
import { QuickSwap }      from "./QuickSwap";
import { isFlagEnabled }  from "../../config/featureFlags";
import { POSITION_LABELS } from "../../constants/positions";

function firstName(name) {
  if (!name) return name;
  return name.split(" ")[0];
}

export function GameModeScreen({
  roster, grid, battingOrder, innings,
  currentBatterIndex, initialInning,
  onSwap, onBatterAdvance, onBatterBack,
  onInningChange, onBatterReset,
  onExit
}) {
  var a11y = isFlagEnabled('ACCESSIBILITY_V1');

  var _inn = useState(initialInning || 0);
  var currentInning = _inn[0]; var setCurrentInning = _inn[1];

  var _modal = useState(false);
  var inningModalOpen = _modal[0]; var setInningModalOpen = _modal[1];

  var _swap = useState(null);
  var swapTarget = _swap[0]; var setSwapTarget = _swap[1];

  // Diamond fade state — toggled on inning transition
  var _fade = useState(true);
  var diamondVisible = _fade[0]; var setDiamondVisible = _fade[1];

  // Half-inning indicator — resets to 'defense' on inning advance
  var _half = useState("defense");
  var halfInning = _half[0]; var setHalfInning = _half[1];

  // Half completion tracking — both must be done before inning can advance
  var _defDone = useState(false);
  var defDone = _defDone[0]; var setDefDone = _defDone[1];
  var _batDone = useState(false);
  var batDone = _batDone[0]; var setBatDone = _batDone[1];
  var bothHalvesDone = defDone && batDone;

  var isLastInning = currentInning >= innings - 1;

  // Mark current half complete, switch to other half if not yet done
  function handleEndHalf() {
    if (halfInning === "defense") {
      setDefDone(true);
      if (!batDone) setHalfInning("batting");
    } else {
      setBatDone(true);
      if (!defDone) setHalfInning("defense");
    }
  }

  // ── Orientation hint toast ─────────────────────────────────────────────
  var _oh = useState({ visible: false, message: '' });
  var orientationHint = _oh[0]; var setOrientationHint = _oh[1];
  var hintCooldownRef = useRef({ batting: 0, defense: 0 });
  var hintDismissTimer = useRef(null);
  var HINT_COOLDOWN_MS = 10 * 60 * 1000;

  useEffect(function() {
    var COOLDOWN = HINT_COOLDOWN_MS;
    function isLandscape() { return window.innerWidth > window.innerHeight; }
    function now() { return Date.now(); }

    function triggerHint(message) {
      if (hintDismissTimer.current) clearTimeout(hintDismissTimer.current);
      setOrientationHint({ visible: true, message: message });
      hintDismissTimer.current = setTimeout(function() {
        setOrientationHint({ visible: false, message: '' });
      }, 3000);
    }

    function checkAndShowHint() {
      var onBatting = halfInning === 'batting';
      var onDefense = halfInning === 'defense';
      var landscape = isLandscape();
      var t = hintCooldownRef.current;
      if (onBatting && !landscape && now() - t.batting > COOLDOWN) {
        t.batting = now();
        triggerHint('↺ Rotate to landscape for batting order');
      } else if (onDefense && landscape && now() - t.defense > COOLDOWN) {
        t.defense = now();
        triggerHint('↺ Rotate to portrait for the diamond');
      }
    }

    checkAndShowHint();
    window.addEventListener('resize', checkAndShowHint);
    return function() {
      window.removeEventListener('resize', checkAndShowHint);
      if (hintDismissTimer.current) clearTimeout(hintDismissTimer.current);
    };
  }, [halfInning]); // eslint-disable-line react-hooks/exhaustive-deps

  function dismissOrientationHint() {
    if (hintDismissTimer.current) clearTimeout(hintDismissTimer.current);
    setOrientationHint({ visible: false, message: '' });
  }

  // ── Saved flash — shows 1.5s after every batter advance/back ──────────
  var _sf = useState(false);
  var savedFlash = _sf[0]; var setSavedFlash = _sf[1];
  function flashSaved() {
    setSavedFlash(true);
    setTimeout(function() { setSavedFlash(false); }, 1500);
  }

  // ── Resume banner — shows 3s on re-entry if not at top of order ───────
  var _atStart = currentBatterIndex === 0 && (initialInning || 0) === 0;
  var _rb = useState(!_atStart);
  var showResume = _rb[0]; var setShowResume = _rb[1];
  useEffect(function() {
    if (!showResume) return;
    var t = setTimeout(function() { setShowResume(false); }, 3000);
    return function() { clearTimeout(t); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  var lastBatterName = battingOrder.length > 0
    ? battingOrder[(currentBatterIndex - 1 + battingOrder.length) % battingOrder.length]
    : null;

  function handleTapPosition(pos) {
    setSwapTarget(pos);
  }

  function handleSwap(playerAName, playerBName) {
    if (playerAName !== playerBName) {
      onSwap(currentInning, playerAName, playerBName);
    }
    setSwapTarget(null);
  }

  function handleInningConfirm(nextHalf) {
    setInningModalOpen(false);
    if (isLastInning) { onExit(); return; }
    setHalfInning(nextHalf || "defense");
    setDefDone(false);
    setBatDone(false);
    // On deck becomes Now Batting for the next inning
    onBatterAdvance();
    // Fade out diamond → advance inning → fade in
    var nextInning = currentInning + 1;
    setDiamondVisible(false);
    setTimeout(function() {
      setCurrentInning(nextInning);
      if (onInningChange) { onInningChange(nextInning); }
      setDiamondVisible(true);
    }, 200);
  }

  // ── Advance button aria-label (dynamic) ──────────────────────────────
  var advanceAriaLabel = a11y
    ? (bothHalvesDone
        ? (isLastInning ? "End game" : "Advance to inning " + (currentInning + 2))
        : (halfInning === "defense"
            ? "Mark defense complete for inning " + (currentInning + 1)
            : "Mark batting complete for inning " + (currentInning + 1)))
    : undefined;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:2000,
      background:"#0b1524",
      display:"flex", flexDirection:"column",
      fontFamily:"Georgia,'Times New Roman',serif",
      overflow:"hidden",
    }}>

      {/* ── Orientation hint toast ──────────────────────────── */}
      {orientationHint.visible ? (
        <div
          onClick={dismissOrientationHint}
          style={{
            position: 'absolute',
            top: '56px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2100,
            backgroundColor: '#d97706',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 700,
            padding: '12px 24px',
            borderRadius: '999px',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(0,0,0,0.55)',
            userSelect: 'none',
            letterSpacing: '0.02em',
            border: '2px solid rgba(255,255,255,0.25)',
            opacity: 1,
            transition: 'opacity 0.25s ease',
          }}
        >
          {orientationHint.message}
        </div>
      ) : null}

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

        {/* Reset batting position */}
        <button
          onClick={function() {
            if (onBatterReset) {
              setCurrentInning(0);
              onBatterReset();
            }
          }}
          title="Reset batting position to top of order, inning 1"
          style={{ padding:"6px 10px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.1)",
            background:"transparent", color:"#475569", cursor:"pointer",
            fontSize:"11px", fontFamily:"Georgia,serif", flexShrink:0 }}>
          ↺
        </button>

        {/* Title */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", minWidth:0 }}>
          <div style={{ fontSize: a11y ? "13px" : "11px", color:"#475569", textTransform:"uppercase",
            letterSpacing:"0.15em", display:"flex", alignItems:"center", gap:"6px" }}>
            Game Mode
            {savedFlash ? (
              <span style={{ fontSize:"10px", color:"#22c55e", letterSpacing:"0", textTransform:"none" }}>
                ● Saved
              </span>
            ) : null}
          </div>
          <div style={{ fontSize:"18px", fontWeight:"bold", color:"#f5c842", lineHeight:1 }}>
            Inning {currentInning + 1}
            <span style={{ fontSize: a11y ? "13px" : "11px", color:"#475569", fontWeight:"normal",
              marginLeft:"4px" }}>
              of {innings}
            </span>
          </div>
        </div>

        {/* Inning advance — gated until both halves are marked done */}
        <button
          onClick={function() {
            if (bothHalvesDone) { setInningModalOpen(true); }
            else { handleEndHalf(); }
          }}
          aria-label={advanceAriaLabel}
          style={{
            padding: a11y ? "13px 16px" : "8px 14px",
            minHeight: a11y ? 44 : undefined,
            borderRadius:"8px",
            background: bothHalvesDone
              ? (isLastInning ? "rgba(255,255,255,0.06)" : "#f5c842")
              : "rgba(245,200,66,0.18)",
            border: bothHalvesDone ? "none" : "1px solid rgba(245,200,66,0.3)",
            color: bothHalvesDone
              ? (isLastInning ? "#475569" : "#0f1f3d")
              : "#f5c842",
            cursor:"pointer", fontSize: a11y ? "14px" : "12px", fontWeight:"bold",
            fontFamily:"Georgia,serif", flexShrink:0, textAlign:"center",
            lineHeight:1.2 }}>
          {bothHalvesDone
            ? (isLastInning ? "End ⏹" : "Next →")
            : (halfInning === "defense" ? "End Defense →" : "End Batting →")}
        </button>
      </div>

      {/* ── Resume banner ───────────────────────────────────── */}
      {showResume && lastBatterName ? (
        <div style={{
          display:"flex", alignItems:"center", gap:"8px",
          padding:"6px 16px", flexShrink:0,
          background:"rgba(245,200,66,0.10)",
          borderBottom:"1px solid rgba(245,200,66,0.25)",
        }}>
          <span style={{ fontSize:"16px" }}>↑</span>
          <div>
            <span style={{ fontSize:"11px", fontWeight:"bold", color:"#f5c842",
              textTransform:"uppercase", letterSpacing:"0.08em" }}>Resumed</span>
            <span style={{ fontSize:"11px", color:"#94a3b8", marginLeft:"6px" }}>
              Inning {(initialInning || 0) + 1} · {firstName(lastBatterName)} last at bat
            </span>
          </div>
        </div>
      ) : null}

      {/* ── Half-inning pill ────────────────────────────────── */}
      <div style={{
        display:"flex", justifyContent:"center",
        padding:"8px 16px 0",
        background:"linear-gradient(180deg,#0b1524,#0b1524)",
        flexShrink:0,
      }}>
        <div style={{
          display:"inline-flex",
          borderRadius:"20px",
          border:"1px solid rgba(255,255,255,0.12)",
          overflow:"hidden",
        }}>
          {/* Defense pill — wrapper gives touch target, pill stays visually compact */}
          <div style={ a11y ? { display:"flex", alignItems:"center", minHeight:44 } : {} }>
            <button
              onClick={function() { setHalfInning("defense"); }}
              aria-label={a11y ? (defDone ? "Defense complete" : "Switch to defense view") : undefined}
              aria-pressed={a11y ? halfInning === "defense" : undefined}
              style={{
                padding:"6px 18px",
                border:"none", cursor:"pointer",
                fontSize: a11y ? "13px" : "11px", fontWeight:"bold", letterSpacing:"0.1em",
                fontFamily:"Georgia,serif",
                background: halfInning === "defense" ? "#0f1f3d" : "transparent",
                color: defDone ? "#22c55e" : (halfInning === "defense" ? "#f5c842" : "#475569"),
                transition:"background 150ms, color 150ms",
              }}>
              {defDone ? "✓" : "⚔"} DEFENSE
            </button>
          </div>
          <div style={{ width:"1px", background:"rgba(255,255,255,0.12)", flexShrink:0 }} />
          {/* Batting pill */}
          <div style={ a11y ? { display:"flex", alignItems:"center", minHeight:44 } : {} }>
            <button
              onClick={function() { setHalfInning("batting"); }}
              aria-label={a11y ? (batDone ? "Batting complete" : "Switch to batting view") : undefined}
              aria-pressed={a11y ? halfInning === "batting" : undefined}
              style={{
                padding:"6px 18px",
                border:"none", cursor:"pointer",
                fontSize: a11y ? "13px" : "11px", fontWeight:"bold", letterSpacing:"0.1em",
                fontFamily:"Georgia,serif",
                background: halfInning === "batting" ? "#f5c842" : "transparent",
                color: batDone
                  ? (halfInning === "batting" ? "#0f1f3d" : "#22c55e")
                  : (halfInning === "batting" ? "#0f1f3d" : "#475569"),
                transition:"background 150ms, color 150ms",
              }}>
              {batDone ? "✓" : "⚾"} BATTING
            </button>
          </div>
        </div>
      </div>

      {/* ── Diamond (flex:1, fades on inning transition) ────── */}
      {/* gm-diamond-wrap: hides DefenseDiamond's inning selector (first child)   */}
      {/* and its bench table (last child) — inning is driven by Next → only.     */}
      <style>{[
        ".gm-diamond-wrap > div > div:first-child { display:none !important; }",
        ".gm-diamond-wrap > div > div:last-child  { display:none !important; }",
      ].join("")}</style>
      <div style={{ flex:1, overflow:"auto", position:"relative",
        opacity: diamondVisible ? 1 : 0,
        transition:"opacity 200ms ease-in-out" }}>
        <div className="gm-diamond-wrap" style={{
          opacity: halfInning === "defense" ? 1 : 0.4,
          transition:"opacity 200ms ease",
          padding:"12px 16px",
        }}>
          <DefenseDiamond
            roster={roster}
            grid={grid}
            innings={innings}
            selectedInning={currentInning}
            onSelectInning={function() {}}
            onPositionTap={handleTapPosition}
          />
        </div>
        {halfInning === "batting" ? (
          <div style={{
            position:"absolute", inset:0, display:"flex",
            alignItems:"center", justifyContent:"center",
            pointerEvents:"none",
          }}>
            <div style={{
              padding:"6px 16px", borderRadius:"12px",
              background:"rgba(11,21,36,0.75)",
              border:"1px solid rgba(255,255,255,0.12)",
              fontSize:"10px", fontWeight:"bold", color:"#64748b",
              letterSpacing:"0.15em", textTransform:"uppercase",
            }}>
              ON DEFENSE
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Batting footer ──────────────────────────────────── */}
      <div style={{
        opacity: halfInning === "batting" ? 1 : 0.4,
        transition:"opacity 200ms ease",
        borderTop: halfInning === "batting"
          ? "2px solid rgba(245,200,66,0.5)"
          : "2px solid transparent",
        flexShrink:0,
      }}>
        {halfInning === "defense" ? (
          <div style={{
            textAlign:"center", padding:"4px 0 0",
            fontSize: a11y ? "12px" : "9px", fontWeight:"bold", color:"#475569",
            letterSpacing:"0.15em", textTransform:"uppercase",
          }}>
            BATTING NEXT
          </div>
        ) : null}
        <NowBattingBar
          battingOrder={battingOrder}
          currentIndex={currentBatterIndex}
          activeInning={currentInning + 1}
          onAdvance={function() { onBatterAdvance(); flashSaved(); }}
          onBack={function() { onBatterBack(); flashSaved(); }}
          roster={roster}
        />
      </div>

      {/* ── Inning transition modal ──────────────────────────── */}
      {inningModalOpen ? (
        <InningModal
          currentInning={currentInning}
          totalInnings={innings}
          roster={roster}
          grid={grid}
          halfInning={halfInning}
          battingOrder={battingOrder}
          currentBatterIndex={currentBatterIndex}
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
