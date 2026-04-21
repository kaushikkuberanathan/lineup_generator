var FF = "Georgia,'Times New Roman',serif";

function baseName(base) {
  return base === 1 ? '1B' : base === 2 ? '2B' : '3B';
}

export default function RunnerConflictModal(props) {
  var conflict  = props.conflict;        // null or conflict descriptor
  var onResolve = props.onResolve;       // function(decision)
  var battingOrder = props.battingOrder || [];

  if (!conflict) return null;

  function firstName(runnerId) {
    var p = battingOrder.find(function(x) { return x.id === runnerId; });
    if (!p) return '?';
    return p.name.split(' ')[0];
  }

  var targetLabel   = baseName(conflict.targetBase);
  var incomingName  = firstName(conflict.incomingRunnerId);
  var blockingName  = firstName(conflict.blockingRunnerId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-live="assertive"
      aria-label={'Runner conflict at ' + targetLabel}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 400, fontFamily: FF,
      }}
    >
      <div style={{
        background: '#0f1f3d',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: '14px',
        padding: '24px 20px',
        width: '100%', maxWidth: '340px',
        margin: '0 16px',
      }}>
        <div style={{
          fontSize: '11px', color: '#f5c842', fontWeight: 'bold',
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px',
        }}>
          Runner conflict at {targetLabel}
        </div>
        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', marginBottom: '6px' }}>
          {blockingName} is on {targetLabel}.
        </div>
        <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px', lineHeight: '1.4' }}>
          {incomingName} is also advancing to {targetLabel}. What happened?
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={function() { onResolve('SCORE_BLOCKING'); }}
            style={{
              width: '100%', minHeight: '44px', padding: '11px 14px',
              background: 'rgba(22,163,74,0.12)',
              border: '1.5px solid #16a34a',
              borderRadius: '10px', color: '#fff',
              fontWeight: 'bold', fontSize: '14px',
              cursor: 'pointer', fontFamily: FF, textAlign: 'left',
            }}>
            Score {blockingName}
            <span style={{
              fontSize: '11px', color: '#86efac', display: 'block',
              fontWeight: 'normal', marginTop: '2px',
            }}>
              {blockingName} scores — {incomingName} takes {targetLabel}
            </span>
          </button>

          <button
            onClick={function() { onResolve('HOLD_INCOMING'); }}
            style={{
              width: '100%', minHeight: '44px', padding: '11px 14px',
              background: 'rgba(29,78,216,0.12)',
              border: '1.5px solid #1d4ed8',
              borderRadius: '10px', color: '#fff',
              fontWeight: 'bold', fontSize: '14px',
              cursor: 'pointer', fontFamily: FF, textAlign: 'left',
            }}>
            Hold {incomingName}
            <span style={{
              fontSize: '11px', color: '#93c5fd', display: 'block',
              fontWeight: 'normal', marginTop: '2px',
            }}>
              {incomingName} stays back — {blockingName} holds at {targetLabel}
            </span>
          </button>

          <button
            onClick={function() { onResolve('CANCEL_PLAY'); }}
            style={{
              width: '100%', minHeight: '44px', padding: '11px 14px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: '10px', color: '#94a3b8',
              fontWeight: 'bold', fontSize: '14px',
              cursor: 'pointer', fontFamily: FF, textAlign: 'left',
            }}>
            Cancel play
            <span style={{
              fontSize: '11px', color: '#64748b', display: 'block',
              fontWeight: 'normal', marginTop: '2px',
            }}>
              Undo this at-bat and restore the previous state
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
