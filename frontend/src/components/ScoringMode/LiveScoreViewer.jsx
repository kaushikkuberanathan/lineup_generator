import ScoreboardRow from '../game-mode/ScoreboardRow';
import { tokens } from '../../theme/tokens';

var FF = "Georgia,'Times New Roman',serif";

export default function LiveScoreViewer(props) {
  var gs             = props.gameState || {};
  var scorerName     = props.scorerName;
  var myTeamLabel    = props.myTeamLabel || 'TEAM';
  var oppLabel       = props.oppLabel    || 'OPP';
  var onClaimScorer  = props.onClaimScorer || function() {};
  var onExit         = props.onExit        || function() {};

  return (
    <div style={{
      minHeight: '100vh', background: tokens.color.gameDay.surface.shell, color: tokens.color.gameDay.text.primary,
      fontFamily: FF, display: 'flex', flexDirection: 'column',
    }}>
      <ScoreboardRow
        myTeamLabel={myTeamLabel}
        oppLabel={oppLabel}
        myScore={gs.myScore}
        oppScore={gs.opponentScore}
        inning={(gs.inning || 1) - 1}
        halfInning={gs.halfInning}
        onExit={onExit}
      />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>👀</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '6px' }}>
          {scorerName ? scorerName + ' is scoring 🟢' : 'Watching — no active scorer'}
        </div>
        <div style={{ fontSize: '13px', color: tokens.color.gameDay.text.muted, marginBottom: '32px', maxWidth: '260px' }}>
          {gs.outs || 0} out{(gs.outs || 0) !== 1 ? 's' : ''}
        </div>
        <button
          onClick={onClaimScorer}
          style={{
            width: '100%', maxWidth: '320px', padding: '16px',
            background: tokens.color.gameDay.liveScoringPanel.noScorerState.claimButton.background, border: 'none', borderRadius: '10px',
            color: tokens.color.gameDay.text.primary, fontSize: '16px', fontWeight: 'bold',
            cursor: 'pointer', fontFamily: FF,
          }}>
          🎙 Claim Scorer Role
        </button>
      </div>
    </div>
  );
}
