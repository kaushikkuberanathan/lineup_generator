import { tokens } from "../../theme/tokens";

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

export default function ScoreboardRow(props) {
  var myTeamLabel = props.myTeamLabel || 'TEAM';
  var oppLabel    = props.oppLabel    || 'OPP';
  var myScore     = props.myScore  || 0;
  var oppScore    = props.oppScore || 0;
  var isScorer    = props.isScorer;
  var onAddMyRun  = props.onAddMyRun  || function() {};
  var onAddOppRun = props.onAddOppRun || function() {};
  var inning      = props.inning;      // 0-indexed; undefined = omit indicator
  var halfInning  = props.halfInning;  // 'top' | 'bottom'
  var onExit      = props.onExit;      // optional — renders exit button when provided
  var isAtBat     = props.isAtBat;     // #118 — true: our half, false: opponent's, undefined: omit dot

  var inningLabel = (inning !== undefined && halfInning !== undefined)
    ? (halfInning === 'top' ? 'Top' : 'Bot') + ' ' + ordinal(inning + 1)
    : null;

  var labelStyle = {
    fontSize: 'clamp(11px, 3.2vw, 16px)', fontWeight: 700, color: tokens.color.gameDay.text.label,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    lineHeight: 1.05, textAlign: 'center', whiteSpace: 'normal',
    overflowWrap: 'anywhere', minWidth: 0,
  };
  var scoreStyle = {
    fontSize: '22px', fontWeight: '800', color: tokens.color.gameDay.text.primary,
  };
  var plusStyle = {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '5px', color: tokens.color.gameDay.text.secondary,
    fontSize: '10px', cursor: 'pointer',
    fontFamily: "Georgia,'Times New Roman',serif",
    padding: '2px 6px', lineHeight: '1.4',
    flexShrink: 0,
  };

  function activeDot(testId) {
    return (
      <span
        data-testid={testId}
        className="animate-scoreboard-pulse"
        style={{
          display: 'inline-block', width: '6px', height: '6px',
          borderRadius: '50%', background: tokens.color.brand.gold,
          marginLeft: '4px', flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div style={{
      position: 'relative',
      display: 'grid', alignItems: 'center',
      gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
      columnGap: '6px', padding: onExit ? '8px 44px' : '8px',
      background: tokens.color.gameDay.surface.scoreboard,
      borderTop: '2px solid rgba(245, 200, 66, 0.4)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      flexShrink: 0,
      minWidth: 0,
      overflow: 'hidden',
      fontFamily: "Georgia,'Times New Roman',serif",
    }}>
      {onExit ? (
        <button
          data-testid="scoreboard-exit"
          aria-label="Exit"
          onClick={onExit}
          style={{
            position: 'absolute', left: '4px',
            width: '44px', height: '44px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none',
            color: tokens.color.gameDay.text.secondary, fontSize: '18px', cursor: 'pointer',
            borderRadius: '8px',
            fontFamily: "Georgia,'Times New Roman',serif",
          }}
        >✕</button>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', minWidth: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
            <span style={labelStyle}>{myTeamLabel.toUpperCase()}</span>
            {isAtBat === true ? activeDot('scoreboard-mine-active-dot') : null}
          </span>
          <span style={scoreStyle}>{myScore}</span>
        </div>
        {isScorer ? (
          <button
            onClick={onAddMyRun}
            title={'Add run for ' + myTeamLabel}
            style={plusStyle}
          >+1</button>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '34px' }}>
        <span style={{ color: tokens.color.gameDay.text.separator, fontSize: '20px' }}>:</span>
        {inningLabel ? (
          <span style={{
            fontSize: '10px', fontWeight: 700, color: tokens.color.gameDay.text.secondary,
            letterSpacing: '0.04em', whiteSpace: 'nowrap',
          }}>{inningLabel}</span>
        ) : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', minWidth: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
            <span style={labelStyle}>{oppLabel.toUpperCase()}</span>
            {isAtBat === false ? activeDot('scoreboard-opp-active-dot') : null}
          </span>
          <span style={scoreStyle}>{oppScore}</span>
        </div>
        {isScorer ? (
          <button
            onClick={onAddOppRun}
            title={'Add run for ' + oppLabel}
            style={plusStyle}
          >+1</button>
        ) : null}
      </div>
    </div>
  );
}
