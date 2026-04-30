/*
 * DugoutView — combined game-day view for coaches and read-only viewers.
 *
 * Gated by FEATURE_FLAGS.COMBINED_GAMEMODE_AND_SCORING.
 * Editor path: mounted as overlay from the DUGOUT VIEW pill in Game Day sub-tab bar.
 * Viewer path: replaces ViewerMode on share links when flag is on + isViewer=true.
 *
 * Commit 10: scaffold + entry wiring only. Placeholder body.
 * Commit 11+: offense tab (batting order, score strip), defense tab (diamond, bench).
 */

var FF = "Georgia,'Times New Roman',serif";

export function DugoutView({
  teamId,
  roster,
  battingOrder,
  innings,
  sport,
  absentTonight,
  payload,
  isViewer,
  onExit
}) {
  var teamName = (payload && payload.team)
    ? payload.team
    : (battingOrder && battingOrder.length > 0 ? 'Team' : 'Team');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#0b1524', color: '#fff',
      fontFamily: FF,
      display: 'flex', flexDirection: 'column',
      minHeight: '100vh',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px',
        background: '#0a1628',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        {!isViewer && (
          <button
            onClick={onExit}
            style={{
              background: 'none', border: 'none', color: '#64748b',
              fontSize: '18px', cursor: 'pointer', padding: 0, lineHeight: 1,
            }}
          >←</button>
        )}
        <span style={{
          fontSize: '14px', fontWeight: 700, color: '#e2e8f0',
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>{teamName}</span>
        {isViewer && (
          <span style={{
            marginLeft: 'auto', fontSize: '11px', color: '#64748b',
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>Viewer</span>
        )}
      </div>

      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '12px',
        color: '#475569',
      }}>
        <div style={{ fontSize: '32px' }}>⚾</div>
        <div style={{ fontSize: '14px', letterSpacing: '0.05em' }}>
          DugoutView — scaffold
        </div>
      </div>
    </div>
  );
}
