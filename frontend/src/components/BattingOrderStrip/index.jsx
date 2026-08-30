import { useEffect, useRef } from "react";
import { tokens } from "../../theme/tokens";
import { Text } from "../ui/Text";
import { PlayerHandBadge } from "../PlayerHandBadge";

function firstName(name) {
  if (!name) return '';
  return name.split(' ')[0];
}

function ordinal(n) {
  var s = n % 100;
  if (s >= 11 && s <= 13) return n + 'th';
  switch (n % 10) {
    case 1: return n + 'st';
    case 2: return n + 'nd';
    case 3: return n + 'rd';
    default: return n + 'th';
  }
}

export function BattingOrderStrip({ battingOrder, currentBatterIndex, roster }) {
  var stripRef = useRef(null);
  var len = battingOrder ? battingOrder.length : 0;
  var idx = len > 0 ? (currentBatterIndex || 0) % len : 0;

  useEffect(function() {
    if (stripRef.current) {
      stripRef.current.scrollLeft = 0;
    }
  }, [idx]);

  // #128: NowBattingBar (App.jsx's own strip + GameModeScreen) has always
  // shown batting-hand badges via this same roster.find(r => r.name ===
  // name) pattern; BattingOrderStrip (DugoutView's strip, the GA-default
  // live game-day surface) never got the feature when it was built. roster
  // is optional so existing callers that don't pass it are unaffected.
  function getHand(name) {
    if (!roster || !name) return null;
    var p = roster.find(function(r) { return r.name === name; });
    return p ? (p.battingHand || null) : null;
  }
  if (!battingOrder || battingOrder.length === 0) {
    return (
      <Text
        as="div"
        data-testid="bos-empty"
        uppercase
        style={{
          background: tokens.color.surface.chrome, color: 'rgba(255,255,255,0.4)',
          fontFamily: "Georgia,'Times New Roman',serif",
          padding: '10px 14px', textAlign: 'center',
          fontSize: '12px', letterSpacing: '0.06em',
        }}
      >
        No batters in lineup
      </Text>
    );
  }

  var orderedBatters = battingOrder.map(function(_, offset) {
    return battingOrder[(idx + offset) % len];
  });

  var pillBase = {
    flex: '0 0 clamp(112px, 31vw, 148px)', minWidth: 0, textAlign: 'center',
    borderRadius: '8px', padding: '6px 8px',
    scrollSnapAlign: 'start', boxSizing: 'border-box',
  };

  function pillStyle(active) {
    return Object.assign({}, pillBase, {
      background: active ? 'rgba(245,200,66,0.12)' : 'rgba(255,255,255,0.06)',
      border: '1px solid ' + (active ? 'rgba(245,200,66,0.4)' : 'rgba(255,255,255,0.12)'),
    });
  }

  function nameStyle(active) {
    return {
      fontSize: '18px', fontWeight: 'bold', lineHeight: 1.1,
      color: active ? '#f5c842' : 'rgba(255,255,255,0.85)',
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    };
  }

  function labelStyle(active) {
    return {
      fontSize: '10px', marginTop: '3px',
      color: active ? 'rgba(245,200,66,0.7)' : 'rgba(255,255,255,0.4)',
      letterSpacing: '0.04em',
    };
  }

  function roleForOffset(offset) {
    if (offset === 0) return 'Now Batting';
    if (offset === 1) return 'On Deck';
    if (offset === 2) return 'In Hole';
    return 'Up ' + ordinal(offset + 1);
  }

  function testIdForOffset(offset) {
    if (offset === 0) return 'bos-now';
    if (offset === 1) return 'bos-on-deck';
    if (offset === 2) return 'bos-in-hole';
    return 'bos-up-' + (offset + 1);
  }

  return (
    <div
      ref={stripRef}
      className="batting-order-carousel"
      data-testid="batting-order-carousel"
      role="region"
      aria-label="Batting order"
      tabIndex={0}
      style={{
      background: tokens.color.surface.chrome, color: '#ffffff',
      fontFamily: "Georgia,'Times New Roman',serif",
      padding: '8px 10px', width: '100%', boxSizing: 'border-box',
      display: 'flex', alignItems: 'stretch', gap: '8px',
      overflowX: 'auto', overscrollBehaviorX: 'contain',
      scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
    }}>
      {orderedBatters.map(function(name, offset) {
        var active = offset === 0;
        return (
          <div key={name + '-' + offset} data-testid={testIdForOffset(offset)} style={pillStyle(active)}>
            <Text as="div" style={nameStyle(active)}>
              {firstName(name)}{' '}<PlayerHandBadge hand={getHand(name)} context="dark" />
            </Text>
            <Text as="div" uppercase style={labelStyle(active)}>{roleForOffset(offset)}</Text>
          </div>
        );
      })}
    </div>
  );
}
