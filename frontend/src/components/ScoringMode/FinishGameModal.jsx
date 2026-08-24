import { useState } from 'react';
import { track } from '../../utils/analytics';
import { tokens } from '../../theme/tokens';

var FF = "Georgia,'Times New Roman',serif";
var FGM = tokens.color.gameDay.finishGameModal;

export default function FinishGameModal(props) {
  var isOpen       = props.isOpen;
  var myScore      = props.myScore      || 0;
  var oppScore     = props.oppScore     || 0;
  var inning       = props.inning       || 1;
  var halfInning   = props.halfInning   || 'top';
  var opponentName = props.opponentName || 'Opponent';
  var teamShort    = props.teamShort    || 'Us';
  var endGame      = props.endGame      || function() { return Promise.resolve({ ok: true }); };
  var onSuccess    = props.onSuccess    || function() {};
  var onCancel     = props.onCancel     || function() {};

  var _loading = useState(false);
  var loading = _loading[0]; var setLoading = _loading[1];

  var _error = useState('');
  var errorMsg = _error[0]; var setErrorMsg = _error[1];

  if (!isOpen) return null;

  var halfArrow = halfInning === 'top' ? '▲' : '▼';

  function handleConfirm() {
    setLoading(true);
    setErrorMsg('');
    track('game_finish_confirmed', {
      final_us_score: myScore,
      final_opp_score: oppScore,
      inning: inning,
    });
    var startTs = Date.now();
    endGame().then(function(result) {
      setLoading(false);
      if (result && result.ok) {
        track('game_finish_confirmed', {
          duration_seconds: Math.round((Date.now() - startTs) / 1000),
          final_us_score:   myScore,
          final_opp_score:  oppScore,
          innings_played:   inning,
        });
        onSuccess();
      } else {
        var errCode = (result && result.error) || 'unknown';
        track('schedule_finalization_failed', { error_code: errCode });
        setErrorMsg(
          errCode === 'not_found'     ? 'Game not found in your schedule. Check your schedule tab.' :
          errCode === 'sync_failed'   ? 'Could not save to server. Check your connection and retry.' :
          errCode === 'missing_params' ? 'Missing game info — please exit and re-enter the scoring screen.' :
          'Something went wrong. Tap Retry or try again later.'
        );
      }
    });
  }

  function handleCancel() {
    track('game_finish_cancelled');
    onCancel();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: FGM.backdrop,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 400, fontFamily: FF, padding: '20px',
    }}>
      <div style={{
        background: tokens.color.brand.navy,
        border: '1px solid ' + tokens.color.overlay.whiteLight,
        borderRadius: '16px',
        padding: '24px',
        width: '100%', maxWidth: '340px',
      }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: tokens.color.brand.gold, marginBottom: '4px' }}>
          Finish Game
        </div>
        <div style={{ fontSize: '12px', color: tokens.color.gameDay.text.muted, marginBottom: '20px' }}>
          {halfArrow} Inning {inning} · vs {opponentName}
        </div>

        {/* Score preview */}
        <div style={{
          background: FGM.scorePreview.background,
          border: '1px solid ' + FGM.scorePreview.border,
          borderRadius: '10px',
          padding: '16px',
          display: 'flex', justifyContent: 'center', gap: '24px',
          marginBottom: '18px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: tokens.color.gameDay.text.secondary, fontWeight: 600 }}>{teamShort}</div>
            <div style={{ fontSize: '36px', fontWeight: '900', color: tokens.color.gameDay.text.primary, lineHeight: 1 }}>{myScore}</div>
          </div>
          <div style={{ fontSize: '28px', color: FGM.scorePreview.divider, fontWeight: 300, alignSelf: 'center' }}>–</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: tokens.color.gameDay.text.secondary, fontWeight: 600 }}>{opponentName}</div>
            <div style={{ fontSize: '36px', fontWeight: '900', color: tokens.color.gameDay.text.primary, lineHeight: 1 }}>{oppScore}</div>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: tokens.color.gameDay.text.secondary, marginBottom: '20px', lineHeight: '1.5' }}>
          This saves the final score to your schedule and releases scoring. It can&apos;t be undone.
        </div>

        {errorMsg ? (
          <div style={{
            background: tokens.color.status.errorBg, color: tokens.color.status.error,
            borderRadius: '8px', padding: '10px 14px',
            fontSize: '13px', marginBottom: '14px',
          }}>
            ⚠ {errorMsg}
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleCancel}
            disabled={loading}
            style={{
              flex: 1, padding: '13px',
              background: FGM.cancelButton.background,
              border: '1px solid ' + tokens.color.gameDay.border.hairline,
              borderRadius: '10px', color: tokens.color.gameDay.text.secondary,
              fontSize: '14px', fontWeight: 600,
              cursor: loading ? 'default' : 'pointer', fontFamily: FF,
            }}>
            Not yet
          </button>
          <button
            onClick={errorMsg ? handleConfirm : handleConfirm}
            disabled={loading}
            style={{
              flex: 2, padding: '13px',
              background: loading ? FGM.confirmButton.loadingBackground : tokens.color.status.error,
              border: 'none', borderRadius: '10px',
              color: tokens.color.gameDay.text.primary, fontSize: '14px', fontWeight: 700,
              cursor: loading ? 'default' : 'pointer', fontFamily: FF,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
            {loading ? (
              <>
                <span style={{
                  display: 'inline-block', width: 14, height: 14,
                  border: '2px solid ' + FGM.confirmButton.spinnerTrack,
                  borderTopColor: tokens.color.gameDay.text.primary,
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
                Saving…
              </>
            ) : (errorMsg ? 'Retry' : 'Yes, finish game')}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
