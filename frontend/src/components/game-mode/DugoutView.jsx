/*
 * DugoutView — combined game-day view for coaches and read-only viewers.
 *
 * Gated by FEATURE_FLAGS.COMBINED_GAMEMODE_AND_SCORING.
 * Editor path: mounted as overlay from the DUGOUT VIEW pill in Game Day sub-tab bar.
 * Viewer path: replaces ViewerMode on share links when flag is on + isViewer=true.
 *
 * Slice 0: ScoringMode logic lifted in — full game entry + live scoring flow.
 * ScoringMode/index.jsx remains in repo behind the flag for one soak cycle.
 */

import { useState, useEffect } from 'react';
import ScoringModeEntry from '../ScoringMode/ScoringModeEntry';
import LiveScoringPanel from '../ScoringMode/LiveScoringPanel';
import RestoreScoreModal from '../ScoringMode/RestoreScoreModal';
import { useLiveScoring } from '../../hooks/useLiveScoring';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';

var FF = "Georgia,'Times New Roman',serif";

export function DugoutView({
  teamId, roster, battingOrder, innings, sport,
  absentTonight, payload, isViewer, onExit,
  activeTeam, activeTeamId, user, session, schedule,
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

  // ── Feature flag ──────────────────────────────────────────────────────────
  var _lsFlag = useFeatureFlag('live_scoring', activeTeamId || teamId);
  var liveScoringEnabled = _lsFlag.enabled;
  // AUTH TESTING SHIM — remove "|| true" when flag is confirmed working in prod
  var isEnabled = liveScoringEnabled || true;

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

  // ── Coach path — game entry or live scoring ───────────────────────────────
  var showEntry = !scorerClaimed && !viewerMode;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#0b1524', color: '#fff',
      fontFamily: FF,
      minHeight: '100vh',
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
          onClose={onExit}
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
        teamId={activeTeamId || teamId}
        userId={scoringUserId}
        userName={scoringUserName}
        isOpen={showRestore}
        onClose={function() { setShowRestore(false); }}
      />
    </div>
  );
}
