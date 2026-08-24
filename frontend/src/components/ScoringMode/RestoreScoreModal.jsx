import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { tokens } from '../../theme/tokens';

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

  var RSM = tokens.color.gameDay.restoreScoreModal;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: RSM.backdrop,
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 500, padding: '20px',
      fontFamily: FF,
    }}>
      <div style={{
        background: tokens.color.brand.navy,
        border: '1px solid ' + tokens.color.overlay.whiteLight,
        borderRadius: '16px',
        padding: '24px',
        width: '100%', maxWidth: '380px',
        color: tokens.color.gameDay.text.primary,
      }}>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '17px', fontWeight: 'bold' }}>Restore Scorebook</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: tokens.color.gameDay.text.muted,
            fontSize: '18px', cursor: 'pointer', padding: '2px 4px', lineHeight: 1,
          }}>✕</button>
        </div>

        {/* Warning */}
        <div style={{
          background: RSM.warningBox.background,
          border: '1px solid ' + RSM.warningBox.border,
          borderRadius: '8px', padding: '10px 12px',
          fontSize: '12px', color: tokens.color.gameDay.text.secondary, lineHeight: '1.5',
          marginBottom: '16px',
        }}>
          This rebuilds the current score and inning from all recorded at-bats.
          Use if the live score was accidentally cleared.
        </div>

        {/* At-bat count */}
        <div style={{ fontSize: '13px', color: tokens.color.gameDay.text.muted, marginBottom: '20px', minHeight: '22px' }}>
          {atBatCount === null ? (
            <span style={{ color: RSM.disabledText }}>Checking scorebook…</span>
          ) : atBatCount === 0 ? (
            <span style={{ color: tokens.color.gameDay.text.caption }}>No scorebook data found</span>
          ) : (
            <span>
              <span style={{ fontWeight: 'bold', color: tokens.color.brand.gold, fontSize: '15px' }}>
                {atBatCount}
              </span>
              {' '}at-bat{atBatCount !== 1 ? 's' : ''} recorded
            </span>
          )}
        </div>

        {/* Status feedback */}
        {status === 'success' ? (
          <div style={{
            background: RSM.successBox.background,
            border: '1px solid ' + RSM.successBox.border,
            borderRadius: '8px', padding: '10px 12px',
            fontSize: '13px', fontWeight: 'bold', color: RSM.successBox.text,
            textAlign: 'center', marginBottom: '12px',
          }}>
            ✓ Score restored successfully
          </div>
        ) : status && status.error ? (
          <div style={{
            background: tokens.color.overlay.errorMid,
            border: '1px solid ' + tokens.color.overlay.errorMedium,
            borderRadius: '8px', padding: '10px 12px',
            fontSize: '12px', color: RSM.errorBox.text,
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
                ? RSM.restoreButton.disabledBackground
                : confirmTap ? RSM.restoreButton.confirmBackground : tokens.color.status.error,
              border: '1px solid ' + (!canRestore
                ? tokens.color.overlay.whiteFaint
                : RSM.restoreButton.border),
              borderRadius: '10px',
              color: canRestore ? tokens.color.gameDay.text.primary : RSM.disabledText,
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
              border: '1px solid ' + RSM.cancelButton.border,
              borderRadius: '10px', color: tokens.color.gameDay.text.muted,
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
