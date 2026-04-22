import { useState, useEffect } from 'react';
import ScoringModeEntry from './ScoringModeEntry';
import LiveScoringPanel from './LiveScoringPanel';
import RestoreScoreModal from './RestoreScoreModal';
import { useLiveScoring } from '../../hooks/useLiveScoring';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';

export default function ScoringMode({
  activeTeam, activeTeamId, user, session,
  schedule, roster, battingOrder,
  onClose,
}) {
  var _selGame  = useState(null);
  var selectedGame = _selGame[0]; var setSelectedGame = _selGame[1];

  var _claimed  = useState(false);
  var scorerClaimed = _claimed[0]; var setScorerClaimed = _claimed[1];

  var _practice = useState(false);
  var isPractice = _practice[0]; var setIsPractice = _practice[1];

  var _viewer   = useState(false);
  var viewerMode = _viewer[0]; var setViewerMode = _viewer[1];

  var _restore  = useState(false);
  var showRestore = _restore[0]; var setShowRestore = _restore[1];

  var _mth = useState('top');
  var myTeamHalf = _mth[0]; var setMyTeamHalf = _mth[1];

  // Change 3 — feature flag (fails closed; "|| true" is testing override)
  var _lsFlag = useFeatureFlag('live_scoring', activeTeamId);
  var liveScoringEnabled = _lsFlag.enabled;
  // AUTH TESTING SHIM — remove "|| true" when flag is confirmed working in prod
  var isEnabled = liveScoringEnabled || true;

  // Map battingOrder (name strings) + roster → useLiveScoring shape
  var roster_ = roster || [];
  var mappedBattingOrder = (battingOrder || []).map(function(name, idx) {
    var player = null;
    for (var i = 0; i < roster_.length; i++) {
      if (roster_[i].name === name) { player = roster_[i]; break; }
    }
    return {
      id:            player ? player.id : name,
      name:          name,
      number:        '',
      orderPosition: idx,
    };
  });
  // AUTH TESTING SHIM — remove at Phase 4C
  // Get or generate a stable local scorer ID as final fallback
  var _storedLocalId = (function() {
    try {
      var k = 'scorer_local_id';
      var existing = localStorage.getItem(k);
      if (existing) return existing;
      // Generate a valid UUID v4 format
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
  var gameId   = selectedGame ? selectedGame.id : null;

  var scoring = useLiveScoring({
    gameId:       gameId,
    teamId:       activeTeamId,
    userId:       scoringUserId,
    userName:     scoringUserName,
    isEnabled:    isEnabled && (isPractice || !!gameId),
    battingOrder: mappedBattingOrder,
    team:         activeTeam,
    isPractice:   isPractice,
  });

  // Claim scorer lock once the hook is live after scorerClaimed → true.
  // Practice mode uses the local-only path inside claimScorerLock.
  useEffect(function() {
    if (scorerClaimed && scoring.claimScorerLock) {
      scoring.claimScorerLock();
    }
  }, [scorerClaimed]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Pause — hides the panel but keeps the scorer lock + heartbeat alive.
  // Lock survives because ScoringMode stays mounted and releaseScorerLock is NOT called.
  function handlePauseSession() {
    setScorerClaimed(false);
    setViewerMode(false);
  }

  function handleClose() {
    if (scoring.isScorer) { scoring.releaseScorerLock(); }
    if (onClose) { onClose(); }
  }

  var showEntry = !scorerClaimed && !viewerMode;

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      background: '#0b1524',
      color: '#fff',
      fontFamily: "Georgia,'Times New Roman',serif",
    }}>

      {showEntry ? (
        <ScoringModeEntry
          activeTeam={activeTeam}
          schedule={schedule || []}
          selectedGame={selectedGame}
          onSelectGame={handleSelectGame}
          onClaimScorer={handleClaimScorer}
          onJoinViewer={handleJoinViewer}
          onPractice={handlePractice}
          onClose={handleClose}
        />
      ) : (
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
      )}

      <RestoreScoreModal
        gameId={gameId}
        teamId={activeTeamId}
        userId={scoringUserId}
        userName={scoringUserName}
        isOpen={showRestore}
        onClose={function() { setShowRestore(false); }}
      />
    </div>
  );
}
