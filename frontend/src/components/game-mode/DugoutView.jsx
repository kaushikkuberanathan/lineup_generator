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
import { tokens } from '../../theme/tokens';
import ScoringModeEntry from '../ScoringMode/ScoringModeEntry';
import LiveScoringPanel from '../ScoringMode/LiveScoringPanel';
import RestoreScoreModal from '../ScoringMode/RestoreScoreModal';
import ScoreboardRow from './ScoreboardRow';
import { DefenseDiamond } from '../GameDay/DefenseDiamond';
import { useLiveScoring } from '../../hooks/useLiveScoring';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { BattingOrderStrip } from '../BattingOrderStrip';
import { FEATURE_FLAGS } from '../../config/featureFlags';

var FF = "Georgia,'Times New Roman',serif";

export function DugoutView({
  teamId, roster, battingOrder, innings,
  payload, isViewer, onExit,
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

  // Story 48 (#119) — defense-view inning soft-sync. followLive=true means
  // the diamond tracks the live scoring inning automatically; scrubbing to a
  // specific inning (or "All") turns that off until "Jump to current" is tapped.
  var _followLive = useState(true);
  var followLive = _followLive[0]; var setFollowLive = _followLive[1];

  var _manualInn = useState(null);
  var manualInning = _manualInn[0]; var setManualInning = _manualInn[1];

  // ── Feature flags ─────────────────────────────────────────────────────────
  var _lsFlag = useFeatureFlag('live_scoring', activeTeamId || teamId);
  var liveScoringEnabled = _lsFlag.enabled;
  var isEnabled = liveScoringEnabled;

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

  // ── Scorer identity — real authenticated user only (Phase 4C shim removed,
  //    #355 step 2). No localStorage device-id fallback, no zero-UUID
  //    fallback: an unauthenticated caller resolves to null, matching the
  //    real auth.uid()-scoped RLS policies (migration 019 Section A) — the
  //    still-active permissive policies let a null-identity write through
  //    for now, until Section B ships (see PHASE4C_SCORING_RLS_PROPOSAL.md).
  var scoringUserId = (user && user.id)
    ? user.id
    : (session && session.user && session.user.id)
    ? session.user.id
    : null;
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
  var dugoutFocusMode = (scoring.currentAtBat !== null || scorerClaimed) ? 'scoring' : 'lineup';

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

  function handleSelectInning(inn) {
    setFollowLive(false);
    setManualInning(inn);
  }

  function handleJumpToCurrentInning() {
    setFollowLive(true);
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
  var myTeamLabelSB = activeTeam ? activeTeam.name : '';
  var teamLabelSB   = opponentName;

  // Story 48 (#119) — 0-indexed inning currently shown on the diamond
  // vs. the live game's current inning; "drifted" gates the sync banner.
  var currentInningIdx = (gs.inning || 1) - 1;
  var viewedInning      = followLive ? currentInningIdx : manualInning;
  var inningViewDrifted = !followLive && manualInning !== currentInningIdx;

  // ── Viewer path (share links — payload-based, no scoring context) ─────────
  if (isViewer) {
    var teamName = (payload && payload.team)
      ? payload.team
      : (battingOrder && battingOrder.length > 0 ? 'Team' : 'Team');

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: tokens.color.gameDay.surface.shell, color: tokens.color.gameDay.text.primary,
        fontFamily: FF,
        display: 'flex', flexDirection: 'column',
        minHeight: '100vh',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 14px',
          background: tokens.color.gameDay.surface.scoreboard,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: '14px', fontWeight: 700, color: tokens.color.gameDay.text.label,
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>{teamName}</span>
          <span style={{
            marginLeft: 'auto', fontSize: '11px', color: tokens.color.gameDay.text.muted,
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>Viewer</span>
        </div>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: '12px',
          color: tokens.color.gameDay.text.caption,
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
        background: tokens.color.gameDay.surface.shell, color: tokens.color.gameDay.text.primary,
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
          roster={roster || []}
        />
      </div>
    );
  }

  // ── Coach path — post-entry: Slice 2 flex-column shell ───────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: tokens.color.gameDay.surface.shell, color: tokens.color.gameDay.text.primary,
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
          isAtBat={gs.halfInning === myTeamHalf}
          onExit={onExit}
        />

        {/* Fixed-height header row: batting order strip */}
        <BattingOrderStrip
          battingOrder={battingOrder || []}
          currentBatterIndex={battingIdxForStrip}
          roster={roster || []}
        />

        {/* Scrollable body — both panels always mounted; CSS display toggles */}
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative', minHeight: 0 }}>
          <div
            data-testid="defense-diamond-mount"
            style={{ display: dugoutFocusMode === 'lineup' ? 'block' : 'none' }}
          >
            {inningViewDrifted ? (
              <div
                data-testid="inning-sync-banner"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '8px 14px', fontSize: '12px',
                  color: tokens.color.gameDay.text.secondary,
                  background: tokens.color.gameDay.surface.scoreboard,
                  borderBottom: '1px solid ' + tokens.color.gameDay.border.hairline,
                }}
              >
                <span>
                  Viewing: {manualInning === null ? 'All' : 'Inning ' + (manualInning + 1)}
                  {' · Game: Inning ' + (gs.inning || 1)}
                </span>
                <button
                  onClick={handleJumpToCurrentInning}
                  style={{
                    background: 'none', border: '1px solid ' + tokens.color.gameDay.border.hairline,
                    borderRadius: '9999px', color: tokens.color.brand.gold,
                    fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                    padding: '3px 10px', fontFamily: FF,
                  }}
                >
                  Jump to current
                </button>
              </div>
            ) : null}
            <DefenseDiamond
              roster={roster || []}
              grid={grid || {}}
              innings={innings || 6}
              onPositionTap={onPositionTap || null}
              selectedInning={viewedInning}
              onSelectInning={handleSelectInning}
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
