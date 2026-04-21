import { track } from '../../utils/analytics';

var FF = "Georgia,'Times New Roman',serif";

// Styled confirm modal to replace window.confirm for "Hand off scoring"
function HandoffConfirmModal(props) {
  var isOpen    = props.isOpen;
  var onConfirm = props.onConfirm || function() {};
  var onCancel  = props.onCancel  || function() {};

  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 500, fontFamily: FF, padding: '20px',
    }}>
      <div style={{
        background: '#0f1f3d', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '14px', padding: '22px',
        width: '100%', maxWidth: '300px',
      }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
          Hand off scoring?
        </div>
        <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px', lineHeight: '1.5' }}>
          This releases the scorer role. Someone else can claim it. Your score progress is saved.
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '9px', color: '#94a3b8',
              fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', fontFamily: FF,
            }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '12px',
              background: '#1d4ed8', border: 'none',
              borderRadius: '9px', color: '#fff',
              fontSize: '14px', fontWeight: 700,
              cursor: 'pointer', fontFamily: FF,
            }}>
            Hand off
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GameModeGearMenu(props) {
  var isOpen           = props.isOpen;
  var onClose          = props.onClose          || function() {};
  var onHandoff        = props.onHandoff        || function() {};
  var onFinishGame     = props.onFinishGame     || function() {};
  var onExitScoring    = props.onExitScoring    || function() {};
  var showHandoff      = props.isScorer;
  var confirmHandoff   = props.confirmHandoff;
  var onConfirmHandoff = props.onConfirmHandoff || function() {};
  var onCancelHandoff  = props.onCancelHandoff  || function() {};

  if (!isOpen) return (
    <HandoffConfirmModal
      isOpen={!!confirmHandoff}
      onConfirm={onConfirmHandoff}
      onCancel={onCancelHandoff}
    />
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 200,
        }}
      />
      {/* Menu panel */}
      <div style={{
        position: 'fixed', top: '52px', right: '12px',
        background: '#1a2a3a',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '12px',
        width: '220px', zIndex: 210,
        overflow: 'hidden', fontFamily: FF,
      }}>
        <button
          onClick={function() { onClose(); onExitScoring(); }}
          style={{
            width: '100%', padding: '14px 16px',
            background: 'none', border: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            color: '#94a3b8', fontSize: '14px', fontWeight: 500,
            textAlign: 'left', cursor: 'pointer', fontFamily: FF,
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
          <span>✕</span>
          <span>Exit Scoring</span>
        </button>
        {showHandoff ? (
          <button
            onClick={function() { onClose(); onHandoff(); }}
            style={{
              width: '100%', padding: '14px 16px',
              background: 'none', border: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              color: '#e2e8f0', fontSize: '14px', fontWeight: 600,
              textAlign: 'left', cursor: 'pointer', fontFamily: FF,
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
            <span>🔄</span>
            <span>Hand off scoring</span>
          </button>
        ) : null}
        <button
          onClick={function() {
            onClose();
            track('game_finish_modal_opened');
            onFinishGame();
          }}
          style={{
            width: '100%', padding: '14px 16px',
            background: 'none', border: 'none',
            color: '#fca5a5', fontSize: '14px', fontWeight: 600,
            textAlign: 'left', cursor: 'pointer', fontFamily: FF,
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
          <span>🏁</span>
          <span>Finish Game…</span>
        </button>
      </div>
      <HandoffConfirmModal
        isOpen={!!confirmHandoff}
        onConfirm={onConfirmHandoff}
        onCancel={onCancelHandoff}
      />
    </>
  );
}
