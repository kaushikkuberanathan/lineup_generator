/*
 * DugoutView — combined game-day view for coaches and read-only viewers.
 *
 * Gated by FEATURE_FLAGS.COMBINED_GAMEMODE_AND_SCORING.
 * Editor path: mounted as overlay from the DUGOUT VIEW pill in Game Day sub-tab bar.
 * Viewer path: replaces ViewerMode on share links when flag is on + isViewer=true.
 *
 * Slice 0: ScoringMode logic lifted in — full game entry + live scoring flow.
 * Slice 2: DefenseDiamond lifted into body; dugoutFocusMode state machine drives
 *   which surface is visible. Both surfaces stay mounted (display:none toggle).
 *   ScoreboardRow gains inning + halfInning props. Layout is flex column to fix
 *   375px viewport clipping (Bugs 8/9/10).
 * ScoringMode/index.jsx remains in repo behind the flag for one soak cycle.
 */

import { useState, useEffect } from 'react';
import ScoringModeEntry from '../ScoringMode/ScoringModeEntry';
import LiveScoringPanel from '../ScoringMode/LiveScoringPanel';
import RestoreScoreModal from '../ScoringMode/RestoreScoreModal';
import ScoreboardRow from './ScoreboardRow';
import { DefenseDiamond } from '../GameDay/DefenseDiamond';
import { useLiveScoring } from '../../hooks/useLiveScoring';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { BattingOrderStrip } from '../BattingOrderStrip';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { truncateTeamName } from '../../utils/formatters';

var FF = "Georgia,'Times New Roman',serif";

export function DugoutView({
  teamId, roster, battingOrder, innings, sport,
  absentTonight, payload, isViewer, onExit,
  activeTeam, activeTeamId, user, session, schedule,
  currentBatterIndex,
  grid,
  onPositionTap,
}) {
  // ── State (lifted from ScoringMode/index.jsx) ─────────────────────────────
  var _selGame = useState(null);
  var selectedGame = _selGame[0]; var setSelectedGame = _selGame[1];

  var _claimed = useState(false);
  var scorerClaimed = _claimed[0]; var setScorerClaimed = _claimed[1];

  var _practice = useState(false);
  var isPractice = _practice[0]; var setIsPractice = _practice[1];

  var _viewer = useState(false);
  var viewerMode = _viewer[0]; var setViewerMode = _viewer[1];

  var _restore = useState(false);
  var showRestore = _restore[0]; var setShowRestore = _restore[1];

  var _mth = useState('top');
  var myTeamHalf = _mth[0]; var setMyTeamHalf = _mth[1];

  // ── Feature flags ─────────────────────────────────────────────────────────
  var _lsFlag = useFeatureFlag('live_scoring', activeTeamId || teamId);
  var liveScoringEnabled = _lsFlag.enabled;
  // AUTH TESTING SHIM — remove "|| true" when flag is confirmed working in prod
  var isEnabled = liveScoringEnabled || true;

  // Combined Game Mode + Scoring flag — matches App.jsx:1530 pattern
  var combinedFlag = FEATURE_FLAGS.COMBINED_GAMEMODE_AND_SCORING ||
    localStorage.getItem('flag:combined_gamemode_and_scoring') === '1';

  // ── Batting order mapping ─────────────────────────────────────────────────
  var roster_ = roster || [];
  var mappedBattingOrder = (battingOrder || []).map(function(name, idx) {
    var player = null;
    for (var i = 0; i < roster_.length; i++) {
      if (roster_[i].name === name) { player = roster_[i]; break; }
    }
    return {
      id:            player ? (player.id || name) : name,
      name:          name,
      number:        '',
      orderPosition: idx,
    };
  });

  // ── Scorer identity (AUTH TESTING SHIM — remove at Phase 4C) ─────────────
  var _storedLocalId = (function() {
    try {
      var k = 'scorer_local_id';
      var existing = localStorage.getItem(k);
      if (existing) return existing;
      var generated = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0;
        var v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      localStorage.setItem(k, generated);
      return generated;
    } catch(e) {
      return '00000000-0000-4000-8000-000000000000';
    }
  })();
  var scoringUserId = (user && user.id)
    ? user.id
    : (session && session.user && session.user.id)
    ? session.user.id
    : _storedLocalId;
  var scoringUserName = user && user.profile && user.profile.first_name
    ? user.profile.first_name
    : 'Coach';
  var isAdminTestMode = false;

  // ── Game state ────────────────────────────────────────────────────────────
  var gameId = selectedGame ? selectedGame.id : null;

  // ── Live scoring hook ─────────────────────────────────────────────────────
  var scoring = useLiveScoring({
    gameId:       gameId,
    teamId:       activeTeamId || teamId,
    userId:       scoringUserId,
    userName:     scoringUserName,
    isEnabled:    isEnabled && (isPractice || !!gameId),
    battingOrder: mappedBattingOrder,
    team:         activeTeam,
    isPractice:   isPractice,
  });

  // ── Slice 2: derived state machine ───────────────────────────────────────
  // 'lineup' when no active at-bat; 'scoring' during an at-bat
  var dugoutFocusMode = (scoring.currentAtBat !== null) ? 'scoring' : 'lineup';

  // Bug 8 fix: when COMBINED flag ON, strip reads scoring engine's batter index
  var battingIdxForStrip = combinedFlag
    ? (scoring.gameState ? scoring.gameState.battingOrderIndex || 0 : 0)
    : (currentBatterIndex || 0);

  // ── Claim scorer lock on scorerClaimed → true ─────────────────────────────
  useEffect(function() {
    if (scorerClaimed && scoring.claimScorerLock) {
      scoring.claimScorerLock();
    }
  }, [scorerClaimed]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleSelectGame(game) {
    setSelectedGame(game);
  }

  function handleClaimScorer(game, half) {
    setSelectedGame(game);
    setMyTeamHalf(half || 'top');
    setScorerClaimed(true);
    setViewerMode(false);
  }

  function handleJoinViewer(game) {
    setSelectedGame(game);
    setViewerMode(true);
    setScorerClaimed(false);
  }

  function handlePractice() {
    setIsPractice(true);
    setScorerClaimed(true);
  }

  function handleExitSession() {
    if (scoring.isScorer) { scoring.releaseScorerLock(); }
    setScorerClaimed(false);
    setViewerMode(false);
    setIsPractice(false);
    setSelectedGame(null);
  }

  function handlePauseSession() {
    setScorerClaimed(false);
    setViewerMode(false);
  }

  // ── Scoreboard label helpers ──────────────────────────────────────────────
  var gs = scoring.gameState || {
    inning: 1, halfInning: 'top', outs: 0, balls: 0, strikes: 0,
    myScore: 0, opponentScore: 0, runners: [], battingOrderIndex: 0,
  };
  var opponentName  = selectedGame ? selectedGame.opponent : 'Opponent';
  var myTeamLabelSB = truncateTeamName(activeTeam ? activeTeam.name : '', 10);
  var teamLabelSB   = truncateTeamName(opponentName, 10);

  // ── Viewer path (share links — payload-based, no scoring context) ─────────
  if (isViewer) {
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
          <span style={{
            fontSize: '14px', fontWeight: 700, color: '#e2e8f0',
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>{teamName}</span>
          <span style={{
            marginLeft: 'auto', fontSize: '11px', color: '#64748b',
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>Viewer</span>
        </div>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: '12px',
          color: '#475569',
        }}>
          <div style={{ fontSize: '32px' }}>⚾</div>
          <div style={{ fontSize: '14px', letterSpacing: '0.05em' }}>
            Live view coming soon
          </div>
        </div>
      </div>
    );
  }

  // ── Coach path — game entry ───────────────────────────────────────────────
  var showEntry = !scorerClaimed && !viewerMode;

  if (showEntry) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: '#0b1524', color: '#fff',
        fontFamily: FF,
        minHeight: '100vh',
      }}>
        <ScoringModeEntry
          activeTeam={activeTeam}
          schedule={schedule || []}
          selectedGame={selectedGame}
          onSelectGame={handleSelectGame}
          onClaimScorer={handleClaimScorer}
          onJoinViewer={handleJoinViewer}
          onPractice={handlePractice}
          onClose={onExit}
        />
        <BattingOrderStrip
          battingOrder={battingOrder || []}
          currentBatterIndex={currentBatterIndex || 0}
        />
      </div>
    );
  }

  // ── Coach path — post-entry: Slice 2 flex-column shell ───────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#0b1524', color: '#fff',
      fontFamily: FF,
    }}>
      <div
        data-testid="dugout-shell"
        style={{
          display: 'flex', flexDirection: 'column',
          height: '100vh', overflow: 'hidden',
        }}
      >
        {/* Fixed-height header row: scoreboard */}
        <ScoreboardRow
          myTeamLabel={myTeamLabelSB}
          oppLabel={teamLabelSB}
          myScore={gs.myScore || 0}
          oppScore={gs.opponentScore || 0}
          isScorer={scoring.isScorer}
          onAddMyRun={function() { scoring.addManualRun && scoring.addManualRun('us'); }}
          onAddOppRun={function() { scoring.addManualRun && scoring.addManualRun('opp'); }}
          inning={gs.inning - 1}
          halfInning={gs.halfInning}
          onExit={onExit}
        />

        {/* Fixed-height header row: batting order strip */}
        <BattingOrderStrip
          battingOrder={battingOrder || []}
          currentBatterIndex={battingIdxForStrip}
        />

        {/* Scrollable body — both panels always mounted; CSS display toggles */}
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative', minHeight: 0 }}>
          <div
            data-testid="defense-diamond-mount"
            style={{ display: dugoutFocusMode === 'lineup' ? 'block' : 'none' }}
          >
            <DefenseDiamond
              roster={roster || []}
              grid={grid || {}}
              innings={innings || 6}
              onPositionTap={onPositionTap || null}
            />
          </div>

          <div
            data-testid="scoring-panel-mount"
            style={{ display: dugoutFocusMode === 'scoring' ? 'block' : 'none' }}
          >
            <LiveScoringPanel
              gameState={scoring.gameState}
              currentAtBat={scoring.currentAtBat}
              isScorer={scoring.isScorer}
              scorerName={scoring.scorerName}
              scorerLockExpired={scoring.scorerLockExpired}
              suggestedBatter={scoring.suggestedBatter}
              pendingAdvancement={scoring.pendingAdvancement}
              battingOrder={mappedBattingOrder}
              claimScorerLock={scoring.claimScorerLock}
              claimError={scoring.claimError}
              releaseScorerLock={scoring.releaseScorerLock}
              startAtBat={scoring.startAtBat}
              recordPitch={scoring.recordPitch}
              resolveAtBat={scoring.resolveAtBat}
              undoLastPitch={scoring.undoLastPitch}
              confirmRunnerAdvancement={scoring.confirmRunnerAdvancement}
              resolveRunnerConflict={scoring.resolveRunnerConflict}
              runnerConflict={scoring.runnerConflict}
              incrementOpponentScore={scoring.incrementOpponentScore}
              addManualRun={scoring.addManualRun}
              endHalfInning={scoring.endHalfInning}
              undoHalfInning={scoring.undoHalfInning}
              endGame={scoring.endGame}
              runsThisHalf={scoring.runsThisHalf}
              rules={scoring.rules}
              pitchUIConfig={scoring.pitchUIConfig}
              ruleWarnings={scoring.ruleWarnings}
              selectedGame={selectedGame}
              activeTeam={activeTeam}
              isPractice={isPractice}
              myTeamHalf={myTeamHalf}
              isAdminTestMode={isAdminTestMode}
              scoring={scoring}
              onExit={handleExitSession}
              onPause={handlePauseSession}
              onSettings={function() { setShowRestore(true); }}
            />
          </div>
        </div>

        <RestoreScoreModal
          gameId={gameId}
          teamId={activeTeamId || teamId}
          userId={scoringUserId}
          userName={scoringUserName}
          isOpen={showRestore}
          onClose={function() { setShowRestore(false); }}
        />
      </div>
    </div>
  );
}
