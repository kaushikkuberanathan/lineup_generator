import { tokens } from "../../theme/tokens";
import { Text } from "../ui/Text";

function firstName(name) {
  if (!name) return '';
  return name.split(' ')[0];
}

export function BattingOrderStrip({ battingOrder, currentBatterIndex }) {
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

  var len = battingOrder.length;
  var idx = (currentBatterIndex || 0) % len;
  var nowName    = battingOrder[idx];
  var onDeckName = len > 1 ? battingOrder[(idx + 1) % len] : null;
  var inHoleName = len > 2 ? battingOrder[(idx + 2) % len] : null;
  var remaining  = Math.max(0, len - 3);

  var pillBase = {
    flex: 1, minWidth: 0, textAlign: 'center',
    borderRadius: '8px', padding: '6px 8px',
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

  return (
    <div style={{
      background: tokens.color.surface.chrome, color: '#ffffff',
      fontFamily: "Georgia,'Times New Roman',serif",
      padding: '8px 10px', width: '100%', boxSizing: 'border-box',
      display: 'flex', alignItems: 'stretch', gap: '8px',
    }}>
      <div data-testid="bos-now" style={pillStyle(true)}>
        <Text as="div" style={nameStyle(true)}>{firstName(nowName)}</Text>
        <Text as="div" uppercase style={labelStyle(true)}>Now Batting</Text>
      </div>

      {onDeckName ? (
        <div data-testid="bos-on-deck" style={pillStyle(false)}>
          <Text as="div" style={nameStyle(false)}>{firstName(onDeckName)}</Text>
          <Text as="div" uppercase style={labelStyle(false)}>On Deck</Text>
        </div>
      ) : null}

      {inHoleName ? (
        <div data-testid="bos-in-hole" style={pillStyle(false)}>
          <Text as="div" style={nameStyle(false)}>{firstName(inHoleName)}</Text>
          <Text as="div" uppercase style={labelStyle(false)}>In Hole</Text>
        </div>
      ) : null}

      {remaining > 0 ? (
        <Text
          as="div"
          data-testid="bos-more"
          style={{
            flexShrink: 0, alignSelf: 'center',
            fontSize: '11px', color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.04em', whiteSpace: 'nowrap',
          }}
        >
          +{remaining} more
        </Text>
      ) : null}
    </div>
  );
}
