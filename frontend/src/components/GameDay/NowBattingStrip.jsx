/**
 * NowBattingStrip
 * Extracted from App.jsx v1.6.9
 * Props:
 *   battingOrder  {string[]}    ordered list of player names
 *   currentIndex  {number}      0-based index of the current batter
 *   onAdvance     {function}    advance to next batter
 *   onBack        {function}    go to previous batter
 *   activeInning  {number|null} 1-based inning number, or null when none selected
 *   roster        {Array}       optional — player objects used to look up battingHand
 */

import { PlayerHandBadge } from "../Shared/PlayerHandBadge";
import { isFlagEnabled } from "../../config/featureFlags";

function firstName(name) {
  if (!name) return name;
  return name.split(" ")[0];
}

export function NowBattingBar({ battingOrder, currentIndex, onAdvance, onBack, activeInning, roster }) {
  var a11y = isFlagEnabled('ACCESSIBILITY_V1');
  if (!battingOrder || battingOrder.length === 0) return null;
  var len = battingOrder.length;
  var nowName    = battingOrder[currentIndex % len] || "";
  var onDeckName = battingOrder[(currentIndex + 1) % len] || "";
  var inHoleName = battingOrder[(currentIndex + 2) % len] || "";

  function getHand(name) {
    if (!roster || !name) return "U";
    var p = roster.find(function(r) { return r.name === name; });
    return p ? (p.battingHand || "U") : "U";
  }

  var btnStyle = {
    background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
    color: '#ffffff', borderRadius: '6px', width: '32px', alignSelf: 'stretch',
    fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
  };
  var pills = [
    { label: 'Now Batting', name: nowName,    active: true,  tier: 1, hand: getHand(nowName)    },
    { label: 'On Deck',     name: onDeckName, active: false, tier: 2, hand: getHand(onDeckName) },
    { label: 'In Hole',     name: inHoleName, active: false, tier: 3, hand: getHand(inHoleName) },
  ];
  var inningLabel = (activeInning !== null && activeInning !== undefined) ? ("INNING " + activeInning) : "INNING —";
  return (
    <div style={{ display:'flex', flexDirection:'column', flexShrink:0, width:'100%', position: a11y ? 'relative' : undefined }}>
      <div style={{ textAlign:'center', fontSize:'11px', letterSpacing:'0.14em', textTransform:'uppercase',
        color:'rgba(255,255,255,0.4)', background:'#1e3a5f', paddingTop:'5px', paddingBottom:'1px',
        fontFamily:"Georgia,'Times New Roman',serif" }}>
        {inningLabel}
      </div>
    <div style={{
      background: '#1e3a5f', color: '#ffffff', fontFamily: "Georgia,'Times New Roman',serif",
      padding: '8px 10px', width: '100%', boxSizing: 'border-box',
      display: 'flex', alignItems: 'stretch', gap: '8px',
    }}>
      <button onClick={onBack} title="Previous batter" style={btnStyle}>‹</button>
      {pills.map(function(pill) {
        return (
          <div key={pill.label} style={{
            flex: 1, minWidth: 0, textAlign: 'center',
            background: (pill.tier === 1 && a11y) ? 'rgba(245,200,66,0.10)'
              : (pill.tier === 2 && a11y) ? 'rgba(255,255,255,0.07)'
              : (pill.tier === 3 && a11y) ? 'rgba(255,255,255,0.03)'
              : (pill.active ? 'rgba(245,200,66,0.12)' : 'rgba(255,255,255,0.06)'),
            border: (pill.tier === 1 && a11y) ? '2px solid rgba(245,200,66,0.6)'
              : (pill.tier === 2 && a11y) ? '1px solid rgba(255,255,255,0.15)'
              : (pill.tier === 3 && a11y) ? '1px solid rgba(255,255,255,0.08)'
              : '1px solid ' + (pill.active ? 'rgba(245,200,66,0.4)' : 'rgba(255,255,255,0.12)'),
            borderRadius: '8px',
            paddingTop:    (pill.tier === 1 && a11y) ? '18px' : (pill.tier === 2 && a11y) ? '12px' : (pill.tier === 3 && a11y) ? '10px' : '6px',
            paddingBottom: (pill.tier === 1 && a11y) ? '18px' : (pill.tier === 2 && a11y) ? '12px' : (pill.tier === 3 && a11y) ? '10px' : '6px',
            paddingLeft: '8px', paddingRight: '8px',
          }}>
            <div style={{
              fontSize: (pill.tier === 1 && a11y) ? '36px' : (pill.tier === 2 && a11y) ? '22px' : (pill.tier === 3 && a11y) ? '17px' : '20px',
              fontWeight: (pill.tier === 3 && a11y) ? '500' : 'bold',
              lineHeight: 1.1,
              letterSpacing: (pill.tier === 1 && a11y) ? '0.02em' : undefined,
              color: pill.active ? '#f5c842' : (pill.tier === 2 && a11y) ? '#e2e8f0' : (pill.tier === 3 && a11y) ? '#94a3b8' : 'rgba(255,255,255,0.85)',
              overflow: 'hidden',
              textOverflow: (pill.tier === 1 && a11y) ? 'clip' : 'ellipsis',
              whiteSpace: (pill.tier === 1 && a11y) ? 'normal' : 'nowrap',
              display: (pill.tier === 1 && a11y) ? 'flex' : undefined,
              flexDirection: (pill.tier === 1 && a11y) ? 'column' : undefined,
              alignItems: (pill.tier === 1 && a11y) ? 'center' : undefined,
            }}>
              {firstName(pill.name)}{' '}<PlayerHandBadge hand={pill.hand} />
            </div>
            <div style={{
              fontSize: (pill.tier === 1 && a11y) ? '13px' : ((pill.tier === 2 || pill.tier === 3) && a11y) ? '11px' : '10px',
              fontWeight: (pill.tier === 1 && a11y) ? 'bold' : undefined,
              marginTop: '3px',
              color: pill.active
                ? (a11y ? '#f5c842' : 'rgba(245,200,66,0.7)')
                : (pill.tier === 2 && a11y) ? '#94a3b8'
                : (pill.tier === 3 && a11y) ? '#64748b'
                : 'rgba(255,255,255,0.4)',
              letterSpacing: (pill.tier === 1 && a11y) ? '0.18em' : ((pill.tier === 2 || pill.tier === 3) && a11y) ? '0.15em' : '0.04em',
              textTransform: 'uppercase',
            }}>
              {pill.label}
            </div>
          </div>
        );
      })}
      <button onClick={onAdvance} title="Next batter" style={btnStyle}>›</button>
    </div>
      {a11y ? (
        <div
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          {battingOrder && battingOrder.length > 0
            ? "Now batting: " +
              battingOrder[currentIndex % battingOrder.length] +
              (battingOrder.length > 1
                ? ". On deck: " +
                  battingOrder[(currentIndex + 1) % battingOrder.length]
                : "") +
              (battingOrder.length > 2
                ? ". In the hole: " +
                  battingOrder[(currentIndex + 2) % battingOrder.length]
                : "")
            : ""}
        </div>
      ) : null}
    </div>
  );
}
