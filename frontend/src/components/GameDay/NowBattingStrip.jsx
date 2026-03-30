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

function firstName(name) {
  if (!name) return name;
  return name.split(" ")[0];
}

export function NowBattingBar({ battingOrder, currentIndex, onAdvance, onBack, activeInning, roster }) {
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
    { label: 'Now Batting', name: nowName,    active: true,  hand: getHand(nowName)    },
    { label: 'On Deck',     name: onDeckName, active: false, hand: getHand(onDeckName) },
    { label: 'In Hole',     name: inHoleName, active: false, hand: getHand(inHoleName) },
  ];
  var inningLabel = (activeInning !== null && activeInning !== undefined) ? ("INNING " + activeInning) : "INNING —";
  return (
    <div style={{ display:'flex', flexDirection:'column', flexShrink:0, width:'100%' }}>
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
            background: pill.active ? 'rgba(245,200,66,0.12)' : 'rgba(255,255,255,0.06)',
            border: '1px solid ' + (pill.active ? 'rgba(245,200,66,0.4)' : 'rgba(255,255,255,0.12)'),
            borderRadius: '8px', padding: '6px 8px',
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', lineHeight: 1.1,
              color: pill.active ? '#f5c842' : 'rgba(255,255,255,0.85)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {firstName(pill.name)}{' '}<PlayerHandBadge hand={pill.hand} />
            </div>
            <div style={{ fontSize: '10px', marginTop: '3px',
              color: pill.active ? 'rgba(245,200,66,0.7)' : 'rgba(255,255,255,0.4)',
              letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {pill.label}
            </div>
          </div>
        );
      })}
      <button onClick={onAdvance} title="Next batter" style={btnStyle}>›</button>
    </div>
    </div>
  );
}
