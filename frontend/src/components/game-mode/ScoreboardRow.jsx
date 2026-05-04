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

  var inningLabel = (inning !== undefined && halfInning !== undefined)
    ? (halfInning === 'top' ? 'Top' : 'Bot') + ' ' + ordinal(inning + 1)
    : null;

  var labelStyle = {
    fontSize: '16px', fontWeight: 700, color: '#e2e8f0',
    letterSpacing: '0.08em', textTransform: 'uppercase',
  };
  var scoreStyle = {
    fontSize: '22px', fontWeight: '800', color: '#fff',
  };
  var plusStyle = {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '5px', color: '#94a3b8',
    fontSize: '10px', cursor: 'pointer',
    fontFamily: "Georgia,'Times New Roman',serif",
    padding: '2px 6px', lineHeight: '1.4',
    marginLeft: '6px',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '24px', padding: '8px 16px',
      background: '#0a1628',
      borderTop: '2px solid rgba(245, 200, 66, 0.4)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      flexShrink: 0,
      minWidth: 0,
      overflow: 'hidden',
      fontFamily: "Georgia,'Times New Roman',serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
          <span style={labelStyle}>{myTeamLabel.toUpperCase()}</span>
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

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <span style={{ color: '#374151', fontSize: '20px' }}>:</span>
        {inningLabel ? (
          <span style={{
            fontSize: '10px', fontWeight: 700, color: '#94a3b8',
            letterSpacing: '0.04em', whiteSpace: 'nowrap',
          }}>{inningLabel}</span>
        ) : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
          <span style={labelStyle}>{oppLabel.toUpperCase()}</span>
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
