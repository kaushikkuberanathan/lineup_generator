import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

var FF = "Georgia,'Times New Roman',serif";

export default function RestoreScoreModal(props) {
  var gameId   = props.gameId;
  var teamId   = props.teamId;
  var userId   = props.userId;
  var userName = props.userName;
  var isOpen   = props.isOpen;
  var onClose  = props.onClose || function() {};

  // ── Hooks — all unconditional ────────────────────────────────────────────
  var _count   = useState(null);   // null = loading, number = loaded
  var atBatCount = _count[0];  var setAtBatCount = _count[1];

  var _confirm = useState(false);
  var confirmTap = _confirm[0]; var setConfirmTap = _confirm[1];

  var _status  = useState(null);   // null | 'loading' | 'success' | { error: string }
  var status = _status[0]; var setStatus = _status[1];

  // Fetch at-bat count whenever modal opens
  useEffect(function() {
    if (!isOpen) return;
    setConfirmTap(false);
    setStatus(null);
    if (!supabase || !gameId || !teamId) {
      setAtBatCount(0);
      return;
    }
    setAtBatCount(null);
    supabase
      .from('scoring_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('game_id', gameId)
      .eq('team_id', String(teamId))
      .eq('action', 'at_bat_resolved')
      .then(function(r) {
        setAtBatCount(r.count !== null ? r.count : 0);
      });
  }, [isOpen, gameId, teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  var canRestore = atBatCount !== null && atBatCount > 0
    && status !== 'loading' && status !== 'success';

  function handleRestore() {
    if (!confirmTap) {
      setConfirmTap(true);
      return;
    }
    setStatus('loading');
    supabase
      .rpc('restore_game_state', {
        p_game_id:    gameId,
        p_team_id:    String(teamId),
        p_actor_id:   (userId && !userId.startsWith('local-')) ? userId : null,
        p_actor_name: userName || null,
      })
      .then(function(r) {
        if (r.error) {
          setStatus({ error: r.error.message || 'Restore failed — try again.' });
          setConfirmTap(false);
        } else {
          setStatus('success');
          setTimeout(function() { onClose(); }, 2000);
        }
      });
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.72)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 500, padding: '20px',
      fontFamily: FF,
    }}>
      <div style={{
        background: '#0f1f3d',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '16px',
        padding: '24px',
        width: '100%', maxWidth: '380px',
        color: '#fff',
      }}>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '17px', fontWeight: 'bold' }}>Restore Scorebook</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#64748b',
            fontSize: '18px', cursor: 'pointer', padding: '2px 4px', lineHeight: 1,
          }}>✕</button>
        </div>

        {/* Warning */}
        <div style={{
          background: 'rgba(245,200,66,0.08)',
          border: '1px solid rgba(245,200,66,0.2)',
          borderRadius: '8px', padding: '10px 12px',
          fontSize: '12px', color: '#94a3b8', lineHeight: '1.5',
          marginBottom: '16px',
        }}>
          This rebuilds the current score and inning from all recorded at-bats.
          Use if the live score was accidentally cleared.
        </div>

        {/* At-bat count */}
        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', minHeight: '22px' }}>
          {atBatCount === null ? (
            <span style={{ color: '#374151' }}>Checking scorebook…</span>
          ) : atBatCount === 0 ? (
            <span style={{ color: '#475569' }}>No scorebook data found</span>
          ) : (
            <span>
              <span style={{ fontWeight: 'bold', color: '#f5c842', fontSize: '15px' }}>
                {atBatCount}
              </span>
              {' '}at-bat{atBatCount !== 1 ? 's' : ''} recorded
            </span>
          )}
        </div>

        {/* Status feedback */}
        {status === 'success' ? (
          <div style={{
            background: 'rgba(22,163,74,0.15)',
            border: '1px solid rgba(22,163,74,0.35)',
            borderRadius: '8px', padding: '10px 12px',
            fontSize: '13px', fontWeight: 'bold', color: '#86efac',
            textAlign: 'center', marginBottom: '12px',
          }}>
            ✓ Score restored successfully
          </div>
        ) : status && status.error ? (
          <div style={{
            background: 'rgba(220,38,38,0.12)',
            border: '1px solid rgba(220,38,38,0.3)',
            borderRadius: '8px', padding: '10px 12px',
            fontSize: '12px', color: '#fca5a5',
            marginBottom: '12px',
          }}>
            {status.error}
          </div>
        ) : null}

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={handleRestore}
            disabled={!canRestore}
            style={{
              width: '100%', padding: '13px',
              background: !canRestore
                ? 'rgba(255,255,255,0.06)'
                : confirmTap ? '#7f1d1d' : '#dc2626',
              border: '1px solid ' + (!canRestore
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(220,38,38,0.6)'),
              borderRadius: '10px',
              color: canRestore ? '#fff' : '#374151',
              fontSize: '14px', fontWeight: 'bold',
              cursor: canRestore ? 'pointer' : 'default',
              fontFamily: FF,
              transition: 'background 200ms',
            }}>
            {status === 'loading'
              ? 'Restoring…'
              : confirmTap
                ? 'Tap again to confirm'
                : 'Restore from Scorebook'}
          </button>

          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '11px',
              background: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', color: '#64748b',
              fontSize: '14px', cursor: 'pointer',
              fontFamily: FF,
            }}>
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
