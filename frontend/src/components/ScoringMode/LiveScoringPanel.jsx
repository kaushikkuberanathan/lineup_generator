import { useState, useEffect } from 'react';
import { PITCH, OUTCOME } from '../../hooks/useLiveScoring';
import LiveScoreViewer from './LiveScoreViewer';
import GameModeGearMenu from './GameModeGearMenu';
import FinishGameModal from './FinishGameModal';
import RunnerConflictModal from './RunnerConflictModal';
import { track } from '../../utils/analytics';

var FF = "Georgia,'Times New Roman',serif";

var PITCH_CHIPS = {
  ball:            { label: 'B',  bg: '#1d4ed8' },
  strike_called:   { label: '✓', bg: '#dc2626' },
  strike_swinging: { label: 'K',  bg: '#dc2626' },
  foul:            { label: 'F',  bg: '#d97706' },
  contact:         { label: '✕', bg: '#16a34a' },
};

var LAST_PITCH_LABEL = {
  ball:            'Ball',
  strike_called:   'Called strike',
  strike_swinging: 'Swinging strike',
  foul:            'Foul ball',
  contact:         'Contact',
};

var PITCH_BUTTONS = [
  { type: PITCH.BALL,            label: 'Ball',       color: '#1d4ed8', flex: 1   },
  { type: PITCH.STRIKE_CALLED,   label: 'Strike ✓',  color: '#dc2626', flex: 1   },
  { type: PITCH.STRIKE_SWINGING, label: 'Strike K',  color: '#dc2626', flex: 1   },
  { type: PITCH.FOUL,            label: 'Foul',       color: '#d97706', flex: 1   },
  { type: PITCH.CONTACT,         label: '⚾ Contact', color: '#16a34a', flex: 1.5 },
];

var OUTCOME_ROWS = [
  [
    { type: OUTCOME.OUT_AT_FIRST,  label: 'Out @ 1st', color: '#dc2626' },
    { type: OUTCOME.FLYOUT,        label: 'Flyout',    color: '#dc2626' },
    { type: OUTCOME.STRIKEOUT,     label: 'Strikeout', color: '#dc2626' },
  ],
  [
    { type: OUTCOME.SINGLE, label: 'Single', color: '#16a34a' },
    { type: OUTCOME.DOUBLE, label: 'Double', color: '#16a34a' },
    { type: OUTCOME.TRIPLE, label: 'Triple', color: '#16a34a' },
  ],
  [
    { type: OUTCOME.HOME_RUN, label: 'Home Run', color: '#f5c842' },
  ],
  [
    { type: OUTCOME.WALK,          label: 'Walk',            color: '#7c3aed' },
    { type: OUTCOME.HBP,           label: 'HBP',             color: '#7c3aed' },
    { type: OUTCOME.ERROR_REACHED, label: 'Error (reached)', color: '#d97706' },
  ],
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function CountPips(props) {
  var n = props.n; var max = props.max; var color = props.color;
  var dots = [];
  for (var i = 0; i < max; i++) {
    dots.push(
      <span key={i} style={{
        display: 'inline-block', verticalAlign: 'middle',
        width: 8, height: 8, borderRadius: '50%',
        background: i < n ? color : 'rgba(255,255,255,0.18)',
        border: '1px solid rgba(255,255,255,0.2)',
        marginLeft: i > 0 ? 3 : 0,
      }} />
    );
  }
  return <span style={{ display: 'inline-flex', alignItems: 'center' }}>{dots}</span>;
}

function DiamondSVG(props) {
  var runners      = props.runners      || [];
  var battingOrder = props.battingOrder || [];
  var occupied = {};
  for (var i = 0; i < runners.length; i++) { occupied[runners[i].base] = true; }
  var bases = [
    { base: 2, cx: 50, cy: 12 },
    { base: 3, cx: 12, cy: 50 },
    { base: 1, cx: 88, cy: 50 },
  ];
  var runnerNames = [];
  for (var j = 0; j < runners.length; j++) {
    var r = runners[j];
    var player = null;
    for (var k = 0; k < battingOrder.length; k++) {
      if (battingOrder[k].id === r.runnerId) { player = battingOrder[k]; break; }
    }
    var firstName = player ? player.name.split(' ')[0] : '?';
    var label = r.base === 1 ? '1B' : r.base === 2 ? '2B' : '3B';
    runnerNames.push({ base: r.base, label: label, name: firstName });
  }
  runnerNames.sort(function(a, b) { return a.base - b.base; });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <svg width={110} height={110} viewBox="0 0 100 100">
        <polygon points="50,12 88,50 50,88 12,50"
          fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />
        {bases.map(function(b) {
          var on = !!occupied[b.base];
          return (
            <rect key={b.base}
              x={b.cx - 9} y={b.cy - 9} width={18} height={18}
              transform={'rotate(45,' + b.cx + ',' + b.cy + ')'}
              fill={on ? '#f5c842' : 'rgba(255,255,255,0.08)'}
              stroke={on ? '#f5c842' : 'rgba(255,255,255,0.25)'}
              strokeWidth={1.5}
            />
          );
        })}
        <rect x={41} y={79} width={18} height={18}
          transform="rotate(45,50,88)"
          fill="rgba(255,255,255,0.12)"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth={1}
        />
      </svg>
      {runnerNames.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {runnerNames.map(function(rn) {
            return (
              <span key={rn.base} style={{
                fontSize: '11px', fontWeight: 'bold',
                background: 'rgba(245,200,66,0.15)',
                border: '1px solid rgba(245,200,66,0.35)',
                borderRadius: '4px', padding: '2px 6px',
                color: '#f5c842',
              }}>
                {rn.label} {rn.name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LiveScoringPanel(props) {
  var gameState                = props.gameState;
  var currentAtBat             = props.currentAtBat;
  var isScorer                 = props.isScorer;
  var scorerName               = props.scorerName;
  var scorerLockExpired        = props.scorerLockExpired;
  var suggestedBatter          = props.suggestedBatter;
  var pendingAdvancement       = props.pendingAdvancement;
  var battingOrder             = props.battingOrder             || [];
  var claimScorerLock          = props.claimScorerLock          || function() {};
  var claimError               = props.claimError               || '';
  var releaseScorerLock        = props.releaseScorerLock        || function() {};
  var startAtBat               = props.startAtBat               || function() {};
  var recordPitch              = props.recordPitch              || function() {};
  var resolveAtBat             = props.resolveAtBat             || function() {};
  var undoLastPitch            = props.undoLastPitch            || function() {};
  var confirmRunnerAdvancement = props.confirmRunnerAdvancement || function() {};
  var resolveRunnerConflict    = props.resolveRunnerConflict    || function() {};
  var runnerConflict           = props.runnerConflict           || null;
  var incrementOpponentScore   = props.incrementOpponentScore   || function() {};
  var addManualRun             = props.addManualRun             || function() {};
  var endHalfInning            = props.endHalfInning            || function() {};
  var undoHalfInning           = props.undoHalfInning           || function() {};
  var endGame                  = props.endGame                  || function() { return Promise.resolve({ ok: true }); };
  var selectedGame    = props.selectedGame;
  var activeTeam      = props.activeTeam;
  var isPractice      = props.isPractice;
  var isAdminTestMode = props.isAdminTestMode || false;
  var onExit          = props.onExit    || function() {};
  var onPause         = props.onPause   || function() {};
  var onSettings      = props.onSettings;
  var rules           = props.rules;
  var pitchUIConfig   = props.pitchUIConfig;
  var ruleWarnings    = props.ruleWarnings   || [];
  var runsThisHalf    = props.runsThisHalf   || 0;
  var myTeamHalf      = props.myTeamHalf     || 'top';
  var scoring         = props.scoring        || {};

  // ── Hooks — all unconditional ──────────────────────────────────────────────
  var _rp = useState(false);
  var showRosterPicker = _rp[0]; var setShowRosterPicker = _rp[1];

  var _vo = useState(false);
  var viewerOnly = _vo[0]; var setViewerOnly = _vo[1];

  var _manualRun = useState(false);
  var showManualRunPrompt = _manualRun[0]; var setShowManualRunPrompt = _manualRun[1];

  var _gear = useState(false);
  var showGearMenu = _gear[0]; var setShowGearMenu = _gear[1];

  var _finish = useState(false);
  var showFinishModal = _finish[0]; var setShowFinishModal = _finish[1];

  var _handoff = useState(false);
  var showHandoffConfirm = _handoff[0]; var setShowHandoffConfirm = _handoff[1];

  var _undoToast = useState(false);
  var showUndoToast = _undoToast[0]; var setShowUndoToast = _undoToast[1];

  // Dismiss undo toast after 10s
  useEffect(function() {
    if (!showUndoToast) return;
    var t = setTimeout(function() { setShowUndoToast(false); }, 10000);
    return function() { clearTimeout(t); };
  }, [showUndoToast]);

  // ── Derived ────────────────────────────────────────────────────────────────
  var gs = gameState || {
    inning: 1, halfInning: 'top', outs: 0, balls: 0, strikes: 0,
    myScore: 0, opponentScore: 0, runners: [], currentBatter: null, battingOrderIndex: 0,
  };
  var halfArrow    = gs.halfInning === 'top' ? '▲' : '▼';
  var opponentName = selectedGame ? selectedGame.opponent : 'Opponent';
  var teamShort    = activeTeam   ? activeTeam.name.split(' ')[0] : 'Us';

  var currentBatter = currentAtBat ? currentAtBat.batter : null;
  var pitches       = currentAtBat ? currentAtBat.pitches : [];
  var lastPitch     = pitches.length > 0 ? pitches[pitches.length - 1] : null;
  var showOutcomes  = !!(lastPitch && lastPitch.type === PITCH.CONTACT);

  // When lock expires hook sets isScorer→false; keep user in scorer view so
  // they can see state and reclaim without losing context.
  var inScorerSession = isScorer || scorerLockExpired;

  // ── Viewer mode (after tapping "Join as Viewer" from STATE 1) ─────────────
  if (viewerOnly) {
    return (
      <LiveScoreViewer
        gameState={gs}
        scorerName={scorerName}
        onClaimScorer={function() { setViewerOnly(false); claimScorerLock(); }}
        onExit={onExit}
      />
    );
  }

  // ── STATE 1: No scorer ─────────────────────────────────────────────────────
  if (!scorerName && !inScorerSession) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0b1524', color: '#fff',
        fontFamily: FF, display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0,
        }}>
          <button onClick={onExit} style={{
            background: 'none', border: 'none', color: '#94a3b8',
            fontSize: '20px', cursor: 'pointer', padding: '4px 8px 4px 0', lineHeight: 1,
          }}>←</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {isPractice ? 'Practice Mode' : 'vs ' + opponentName}
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',lineHeight:1}}>
              <span style={{fontSize:'10px',color:'#aaa',fontWeight:600,letterSpacing:'0.5px'}}>
                {gs.halfInning === 'top' ? 'TOP' : 'BOT'}
              </span>
              <span style={{fontSize:'22px',fontWeight:'800',color:'#f5c842',letterSpacing:'1px'}}>
                {gs.inning}
              </span>
            </div>
          </div>
          <div style={{ width: '36px' }} />
        </div>

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '32px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎙</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '6px' }}>
            No active scorer
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '32px', maxWidth: '260px' }}>
            {isPractice
              ? 'Claim the scorer role to start recording pitches without saving to the scorebook.'
              : 'Claim the scorer role to start recording live pitches.'}
          </div>
          <button
            onClick={claimScorerLock}
            style={{
              width: '100%', maxWidth: '320px', padding: '16px',
              background: '#1d4ed8', border: 'none', borderRadius: '10px',
              color: '#fff', fontSize: '16px', fontWeight: 'bold',
              cursor: 'pointer', fontFamily: FF, marginBottom: claimError ? '10px' : '16px',
            }}>
            🎙 Claim Scorer Role
          </button>
          {claimError ? (
            <div style={{
              width: '100%', maxWidth: '320px',
              background: '#fee2e2', color: '#dc2626',
              borderRadius: '8px', padding: '10px 14px',
              fontSize: '13px', fontWeight: 600,
              marginBottom: '16px', textAlign: 'center',
            }}>
              ⚠ {claimError}
            </div>
          ) : null}
          {!isPractice ? (
            <button
              onClick={function() { setViewerOnly(true); }}
              style={{
                background: 'none', border: 'none', color: '#60a5fa',
                fontSize: '14px', cursor: 'pointer', fontFamily: FF, padding: '4px 8px',
              }}>
              Join as Viewer →
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  // ── STATE 3: Someone else is scoring ──────────────────────────────────────
  if (scorerName && !inScorerSession) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0b1524', color: '#fff',
        fontFamily: FF, display: 'flex', flexDirection: 'column',
      }}>
        {/* Header strip */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '10px 14px', gap: '10px',
          background: '#0a1628',
          borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
        }}>
          <button onClick={onExit} style={{
            background: 'none', border: 'none', color: '#64748b',
            fontSize: '18px', cursor: 'pointer', padding: 0, lineHeight: 1,
          }}>←</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',lineHeight:1}}>
              <span style={{fontSize:'10px',color:'#aaa',fontWeight:600,letterSpacing:'0.5px'}}>
                {gs.halfInning === 'top' ? 'TOP' : 'BOT'}
              </span>
              <span style={{fontSize:'22px',fontWeight:'800',color:'#f5c842',letterSpacing:'1px'}}>
                {gs.inning}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',lineHeight:1}}>
              <span style={{fontSize:'10px',color:'#aaa',fontWeight:600,letterSpacing:'0.5px'}}>B</span>
              <div><CountPips n={gs.balls}   max={4} color="#3b82f6" /></div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',lineHeight:1}}>
              <span style={{fontSize:'10px',color:'#aaa',fontWeight:600,letterSpacing:'0.5px'}}>S</span>
              <div><CountPips n={gs.strikes} max={3} color="#dc2626" /></div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',lineHeight:1}}>
              <span style={{fontSize:'10px',color:'#aaa',fontWeight:600,letterSpacing:'0.5px'}}>O</span>
              <div><CountPips n={gs.outs}    max={3} color="#f5c842" /></div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',lineHeight:1}}>
              <span style={{fontSize:'10px',color:'#aaa',fontWeight:600,letterSpacing:'0.5px'}}>US</span>
              <span style={{fontSize:'20px',fontWeight:'800',color:'#fff'}}>{gs.myScore}</span>
            </div>
            <span style={{ color: '#374151' }}>:</span>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',lineHeight:1}}>
              <span style={{fontSize:'10px',color:'#aaa',fontWeight:600,letterSpacing:'0.5px'}}>OPP</span>
              <span style={{fontSize:'20px',fontWeight:'800',color:'#fff'}}>{gs.opponentScore}</span>
            </div>
          </div>
        </div>

        {/* Scorer banner */}
        <div style={{
          background: 'rgba(22,163,74,0.12)',
          border: '1px solid rgba(22,163,74,0.3)',
          borderRadius: '8px', margin: '12px 16px 4px',
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#16a34a', display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
            {scorerName} is scoring 🟢
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <DiamondSVG runners={gs.runners} battingOrder={battingOrder} />
        </div>

        {currentBatter ? (
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{
              background: 'rgba(245,200,66,0.08)',
              border: '1px solid rgba(245,200,66,0.2)',
              borderRadius: '8px', padding: '10px 14px',
            }}>
              <div style={{ fontSize: '10px', color: '#f5c842', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>
                Now Batting
              </div>
              <div style={{ fontSize: '17px', fontWeight: 'bold' }}>{currentBatter.name}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {pitches.length} pitch{pitches.length !== 1 ? 'es' : ''}
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ padding: '8px 16px', marginTop: 'auto' }}>
          <div style={{ fontSize: '11px', color: '#374151', marginBottom: '8px', textAlign: 'center' }}>
            Only one scorer at a time
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {PITCH_BUTTONS.map(function(btn) {
              return (
                <button key={btn.type} disabled style={{
                  flex: btn.flex || 1, padding: '13px 4px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '10px', color: '#2d3748',
                  fontWeight: 'bold', fontSize: '12px',
                  cursor: 'not-allowed', fontFamily: FF,
                }}>{btn.label}</button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── STATE 2: I am scorer ───────────────────────────────────────────────────

  function handlePause() {
    track('scoring_paused');
    onPause();
  }

  function handleHandoff() {
    setShowHandoffConfirm(true);
  }

  function handleHandoffConfirm() {
    setShowHandoffConfirm(false);
    track('scoring_handed_off');
    releaseScorerLock();
    onExit();
  }

  function handleSelectRosterPlayer(player) {
    startAtBat(player, false);
    setShowRosterPicker(false);
  }

  var pitchDisabled = !currentBatter || !isScorer;

  // Roster picker sheet
  var rosterPickerSheet = showRosterPicker ? (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'flex-end', zIndex: 300,
    }}>
      <div style={{
        background: '#0f1f3d', borderRadius: '16px 16px 0 0',
        border: '1px solid rgba(255,255,255,0.15)',
        padding: '16px', width: '100%', maxHeight: '70vh',
        display: 'flex', flexDirection: 'column', fontFamily: FF,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Select Batter</div>
          <button onClick={function() { setShowRosterPicker(false); }} style={{
            background: 'none', border: 'none', color: '#64748b',
            fontSize: '18px', cursor: 'pointer', padding: '2px 6px',
          }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {battingOrder.map(function(player, idx) {
            var isCur = currentBatter && currentBatter.id === player.id;
            return (
              <button
                key={player.id}
                onClick={function() { handleSelectRosterPlayer(player); }}
                style={{
                  width: '100%', textAlign: 'left', display: 'block',
                  background: isCur ? 'rgba(245,200,66,0.12)' : 'rgba(255,255,255,0.04)',
                  border: isCur ? '1px solid rgba(245,200,66,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px', padding: '10px 14px', marginBottom: '6px',
                  cursor: 'pointer', color: '#fff', fontFamily: FF,
                }}>
                <span style={{ fontSize: '11px', color: '#64748b', marginRight: '8px' }}>{idx + 1}.</span>
                <span style={{ fontWeight: isCur ? 'bold' : 'normal' }}>{player.name}</span>
                {isCur ? <span style={{ fontSize: '10px', color: '#f5c842', marginLeft: '8px' }}>(current)</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  ) : null;

  // Outcome sheet (slides up after Contact pitch)
  var outcomeSheet = showOutcomes ? (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'flex-end', zIndex: 250,
    }}>
      <div style={{
        background: '#0f1f3d', borderRadius: '16px 16px 0 0',
        border: '1px solid rgba(255,255,255,0.15)',
        padding: '16px 16px 32px', width: '100%', fontFamily: FF,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f5c842' }}>At-bat outcome</div>
          <button onClick={undoLastPitch} style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '6px', color: '#64748b', fontSize: '12px',
            cursor: 'pointer', fontFamily: FF, padding: '4px 10px',
          }}>⟲ Undo Contact</button>
        </div>
        {OUTCOME_ROWS.map(function(row, ri) {
          return (
            <div key={ri} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
              {row.map(function(btn) {
                return (
                  <button
                    key={btn.type}
                    onClick={function() { resolveAtBat(btn.type); }}
                    style={{
                      flex: 1, padding: '12px 4px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid ' + btn.color + '55',
                      borderRadius: '8px', color: btn.color,
                      fontWeight: 'bold', fontSize: '13px',
                      cursor: 'pointer', fontFamily: FF,
                    }}>
                    {btn.label}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  ) : null;

  // Runner advancement sheet (runner on 3rd after a single) — hidden when conflict modal is up
  var runnerSheet = null;
  if (!runnerConflict && pendingAdvancement && pendingAdvancement.runners && pendingAdvancement.runners.length > 0) {
    var pr = pendingAdvancement.runners[0];
    runnerSheet = (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'flex-end', zIndex: 260,
      }}>
        <div style={{
          background: '#0f1f3d', borderRadius: '16px 16px 0 0',
          border: '1px solid rgba(255,255,255,0.15)',
          padding: '20px 20px 36px', width: '100%', fontFamily: FF,
        }}>
          <div style={{ fontSize: '11px', color: '#f5c842', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Runner on 3rd
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '18px' }}>
            Did the runner score?
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={function() { confirmRunnerAdvancement(pr.runnerId, 3, 'held'); }} style={{
              flex: 1, padding: '13px 6px', background: 'rgba(255,255,255,0.06)',
              border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: '10px',
              color: '#94a3b8', fontWeight: 'bold', fontSize: '13px',
              cursor: 'pointer', fontFamily: FF,
            }}>Stayed 3rd</button>
            <button onClick={function() { confirmRunnerAdvancement(pr.runnerId, 4, 'scored'); }} style={{
              flex: 1, padding: '13px 6px', background: '#16a34a22',
              border: '1.5px solid #16a34a', borderRadius: '10px',
              color: '#fff', fontWeight: 'bold', fontSize: '13px',
              cursor: 'pointer', fontFamily: FF,
            }}>Scored ✓</button>
            <button onClick={function() { confirmRunnerAdvancement(pr.runnerId, null, 'out'); }} style={{
              flex: 1, padding: '13px 6px', background: '#dc262622',
              border: '1.5px solid #dc2626', borderRadius: '10px',
              color: '#fff', fontWeight: 'bold', fontSize: '13px',
              cursor: 'pointer', fontFamily: FF,
            }}>Out ✗</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', overflow: 'visible', paddingBottom: '160px',
      background: '#0b1524', color: '#fff',
      fontFamily: FF, display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Header strip ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '10px 14px', gap: '8px',
        background: '#0a1628',
        borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
      }}>
        <button onClick={handlePause} style={{
          background: 'none', border: 'none', color: '#64748b',
          fontSize: '18px', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0,
        }}>←</button>

        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#f5c842', flexShrink: 0 }}>
          {halfArrow} {gs.inning}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',lineHeight:1}}>
            <span style={{fontSize:'10px',color:'#aaa',fontWeight:600,letterSpacing:'0.5px'}}>B</span>
            <div><CountPips n={gs.balls}   max={4} color="#3b82f6" /></div>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',lineHeight:1}}>
            <span style={{fontSize:'10px',color:'#aaa',fontWeight:600,letterSpacing:'0.5px'}}>S</span>
            <div><CountPips n={gs.strikes} max={3} color="#dc2626" /></div>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',lineHeight:1}}>
            <span style={{fontSize:'10px',color:'#aaa',fontWeight:600,letterSpacing:'0.5px'}}>O</span>
            <div><CountPips n={gs.outs}    max={3} color="#f5c842" /></div>
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',lineHeight:1}}>
            <span style={{fontSize:'10px',color:'#aaa',fontWeight:600,letterSpacing:'0.5px'}}>US</span>
            <span style={{fontSize:'20px',fontWeight:'800',color:'#fff'}}>{gs.myScore}</span>
          </div>
          <span style={{ color: '#374151', fontSize: '14px' }}>:</span>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',lineHeight:1}}>
            <span style={{fontSize:'10px',color:'#aaa',fontWeight:600,letterSpacing:'0.5px'}}>OPP</span>
            <span style={{fontSize:'20px',fontWeight:'800',color:'#fff'}}>{gs.opponentScore}</span>
          </div>
          <button
            title="Add run manually"
            onClick={function() { setShowManualRunPrompt(true); }}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '5px', color: '#94a3b8',
              fontSize: '10px', cursor: 'pointer',
              fontFamily: FF, padding: '2px 5px', lineHeight: '1.4',
            }}>+1</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {isAdminTestMode && (
            <span style={{
              background: '#fef3c7', color: '#92400e',
              fontSize: '10px', fontWeight: 600,
              padding: '2px 7px', borderRadius: '99px',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>⚠ Admin</span>
          )}
          <button
            onClick={function() { setShowGearMenu(function(v) { return !v; }); }}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px', padding: '5px 8px',
              color: '#94a3b8', cursor: 'pointer',
              fontSize: '14px', fontFamily: FF, lineHeight: 1,
            }}>⚙</button>
          <button
            onClick={handlePause}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px', padding: '5px 8px',
              color: '#94a3b8', cursor: 'pointer',
              fontSize: '16px', fontFamily: FF, lineHeight: 1,
              fontWeight: 300,
            }}>✕</button>
        </div>
      </div>

      {/* ── Mercy run banner ─────────────────────────────────────────────────── */}
      {runsThisHalf >= 5 && (
        <div style={{
          background: '#7c2d12', color: '#fca5a5',
          fontSize: '13px', fontWeight: 700,
          padding: '8px 16px',
          borderBottom: '1px solid #ef4444',
          flexShrink: 0,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '8px',
        }}>
          <span>⚠️ {runsThisHalf} runs this half</span>
          <button
            onClick={function() {
              endHalfInning();
              setShowUndoToast(true);
              track('inning_ended', { trigger: 'mercy', half: gs.halfInning, runs: runsThisHalf });
            }}
            style={{
              background:'#ef4444', border:'none', color:'#fff',
              fontSize:'12px', fontWeight:700, padding:'4px 10px',
              borderRadius:'6px', cursor:'pointer'
            }}
          >End Half</button>
        </div>
      )}

      {/* ── End inning undo toast ─────────────────────────────────────────────── */}
      {showUndoToast && (
        <div style={{
          position: 'fixed', bottom: '70px', left: '16px', right: '16px',
          background: '#1e3a5f', border: '1px solid rgba(96,165,250,0.4)',
          borderRadius: '10px', padding: '10px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 100, fontFamily: FF,
        }}>
          <span style={{ fontSize: '13px', color: '#e2e8f0' }}>Half inning ended</span>
          <button
            onClick={function() {
              undoHalfInning();
              setShowUndoToast(false);
              track('inning_undo_tapped');
            }}
            style={{
              background: '#1d4ed8', border: 'none', borderRadius: '6px',
              color: '#fff', fontSize: '12px', fontWeight: 700,
              padding: '5px 12px', cursor: 'pointer', fontFamily: FF,
            }}>Undo</button>
        </div>
      )}

      {/* ── Lock expired banner ───────────────────────────────────────────────── */}
      {scorerLockExpired ? (
        <button
          onClick={claimScorerLock}
          style={{
            width: '100%', background: 'rgba(220,38,38,0.15)',
            border: 'none', borderBottom: '1px solid rgba(220,38,38,0.35)',
            color: '#fca5a5', fontSize: '13px', fontWeight: 'bold',
            cursor: 'pointer', fontFamily: FF, padding: '9px 16px',
            textAlign: 'center', flexShrink: 0,
          }}>
          ⚠️ Session expired — tap to reclaim
        </button>
      ) : null}

      {/* ── Batter area ───────────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 16px', flexShrink: 0 }}>
        {gs.halfInning === myTeamHalf ? (currentBatter ? (
          <div style={{
            background: 'rgba(245,200,66,0.08)',
            border: '1px solid rgba(245,200,66,0.25)',
            borderRadius: '8px', padding: '10px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '10px', color: '#f5c842', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>
                Now Batting
              </div>
              <div style={{ fontSize: '17px', fontWeight: 'bold' }}>
                {currentBatter.number ? '#' + currentBatter.number + ' ' : ''}{currentBatter.name}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {pitches.length} pitch{pitches.length !== 1 ? 'es' : ''}
              </div>
            </div>
            <button
              onClick={function() { setShowRosterPicker(true); }}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '7px', padding: '7px 12px',
                color: '#94a3b8', fontSize: '12px', fontWeight: 'bold',
                cursor: 'pointer', fontFamily: FF,
              }}>
              SWAP
            </button>
          </div>
        ) : suggestedBatter ? (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px', padding: '12px 14px',
          }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
              Next Batter
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
              {suggestedBatter.number ? '#' + suggestedBatter.number + ' ' : ''}{suggestedBatter.name}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
              Batting {suggestedBatter.orderPosition !== undefined ? suggestedBatter.orderPosition + 1 : '?'} of {battingOrder.length} — Is this right?
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={function() { startAtBat(suggestedBatter, true); }}
                style={{
                  flex: 2, padding: '10px 12px',
                  background: '#1d4ed8', border: 'none', borderRadius: '8px',
                  color: '#fff', fontSize: '14px', fontWeight: 'bold',
                  cursor: 'pointer', fontFamily: FF,
                }}>
                ✓ Confirm
              </button>
              <button
                onClick={function() { setShowRosterPicker(true); }}
                style={{
                  flex: 1, padding: '10px 12px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px', color: '#94a3b8',
                  fontSize: '13px', fontWeight: 'bold',
                  cursor: 'pointer', fontFamily: FF,
                }}>
                ↓ Different
              </button>
            </div>
          </div>
        ) : (
          <div style={{padding:'10px 14px', background:'rgba(255,255,255,0.05)',
            borderRadius:'10px', textAlign:'center'}}>
            <div style={{color:'#aaa', fontSize:'14px', marginBottom:'4px'}}>
              No batting order set
            </div>
            <div style={{color:'#666', fontSize:'12px'}}>
              Set a batting order in Game Day → Lineups tab first
            </div>
          </div>
        )) : (
          <div style={{padding:'12px 16px'}}>
            <div style={{
              background:'rgba(255,255,255,0.05)', borderRadius:'10px',
              padding:'12px 14px', textAlign:'center'
            }}>
              <div style={{color:'#f5c842',fontSize:'14px',fontWeight:700,
                           marginBottom:'4px'}}>
                Opponent Batting
              </div>
              <div style={{color:'#888',fontSize:'12px'}}>
                Use +1 OPP to track their runs
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Diamond + pitch log ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '0 16px 8px', gap: '16px',
        flexShrink: 0,
      }}>
        <DiamondSVG runners={gs.runners} battingOrder={battingOrder} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {pitches.length > 0 ? (
            <div>
              <div style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Pitches
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {pitches.map(function(p, i) {
                  var chip = PITCH_CHIPS[p.type] || { label: '?', bg: '#475569' };
                  return (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 26, height: 26, borderRadius: '6px',
                      background: chip.bg, color: '#fff',
                      fontSize: '11px', fontWeight: 'bold',
                    }}>
                      {chip.label}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#374151' }}>No pitches yet</div>
          )}
          {lastPitch ? (
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
              Last: {LAST_PITCH_LABEL[lastPitch.type] || lastPitch.type}
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Pitch buttons / Opponent run counter ─────────────────────────────── */}
      {gs.halfInning === myTeamHalf ? (
        <div style={{
          position: 'fixed', bottom: '60px', left: 0, right: 0,
          background: '#0b1524', padding: '8px 16px 12px', zIndex: 50,
        }}>
          {!pitchUIConfig && (
            <div style={{ color: '#64748b', textAlign: 'center', padding: 16 }}>
              Loading rules...
            </div>
          )}

          {pitchUIConfig && (
            <>
              {pitchUIConfig.showCoachOverlay && gs.isCoachPitching && (
                <div style={{
                  background: 'rgba(245,158,11,0.15)',
                  border: '1px solid rgba(245,158,11,0.4)',
                  borderRadius: 8, padding: '6px 12px',
                  fontSize: 12, color: '#f59e0b', textAlign: 'center',
                  marginBottom: 6,
                }}>
                  Coach pitching — {gs.coachPitchesRemaining || 0} pitch
                  {(gs.coachPitchesRemaining || 0) !== 1 ? 'es' : ''} remaining
                </div>
              )}

              {ruleWarnings.length > 0 && ruleWarnings.map(function(w, i) {
                return (
                  <div key={i} style={{
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: 8, padding: '6px 12px',
                    fontSize: 12, color: '#f59e0b', marginBottom: 4,
                  }}>
                    ⚠ {w}
                  </div>
                );
              })}

              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                {pitchUIConfig.showAttemptButton && (
                  <button
                    onClick={function() { if (!pitchDisabled) { recordPitch(PITCH.CONTACT); } }}
                    disabled={pitchDisabled}
                    style={{
                      flex: 1, padding: '13px 4px',
                      background: pitchDisabled ? 'rgba(255,255,255,0.04)' : '#7c3aed1a',
                      border: '1.5px solid ' + (pitchDisabled ? 'rgba(255,255,255,0.08)' : '#7c3aed66'),
                      borderRadius: '10px',
                      color: pitchDisabled ? '#374151' : '#fff',
                      fontWeight: 'bold', fontSize: '13px',
                      cursor: pitchDisabled ? 'default' : 'pointer',
                      fontFamily: FF, transition: 'background 150ms',
                    }}>
                    <div>Att</div>
                    <div style={{ fontSize: '10px', fontWeight: 'normal', marginTop: '1px' }}>{pitchUIConfig.attemptLabel}</div>
                  </button>
                )}
                {pitchUIConfig.showBallButton && (
                  <button
                    onClick={function() { if (!pitchDisabled) { recordPitch(PITCH.BALL); } }}
                    disabled={pitchDisabled}
                    style={{
                      flex: 1, padding: '13px 4px',
                      background: pitchDisabled ? 'rgba(255,255,255,0.04)' : '#1d4ed81a',
                      border: '1.5px solid ' + (pitchDisabled ? 'rgba(255,255,255,0.08)' : '#1d4ed866'),
                      borderRadius: '10px',
                      color: pitchDisabled ? '#374151' : '#fff',
                      fontWeight: 'bold', fontSize: '13px',
                      cursor: pitchDisabled ? 'default' : 'pointer',
                      fontFamily: FF, transition: 'background 150ms',
                    }}>
                    <div>B</div>
                    <div style={{ fontSize: '10px', fontWeight: 'normal', marginTop: '1px' }}>Ball</div>
                  </button>
                )}
                {pitchUIConfig.showCalledStrike && (
                  <button
                    onClick={function() { if (!pitchDisabled) { recordPitch(PITCH.STRIKE_CALLED); } }}
                    disabled={pitchDisabled}
                    style={{
                      flex: 1, padding: '13px 4px',
                      background: pitchDisabled ? 'rgba(255,255,255,0.04)' : '#dc26261a',
                      border: '1.5px solid ' + (pitchDisabled ? 'rgba(255,255,255,0.08)' : '#dc262666'),
                      borderRadius: '10px',
                      color: pitchDisabled ? '#374151' : '#fff',
                      fontWeight: 'bold', fontSize: '13px',
                      cursor: pitchDisabled ? 'default' : 'pointer',
                      fontFamily: FF, transition: 'background 150ms',
                    }}>
                    <div>K̄</div>
                    <div style={{ fontSize: '10px', fontWeight: 'normal', marginTop: '1px' }}>Called K</div>
                  </button>
                )}
                {pitchUIConfig.showSwingMiss && (
                  <button
                    onClick={function() { if (!pitchDisabled) { recordPitch(PITCH.STRIKE_SWINGING); } }}
                    disabled={pitchDisabled}
                    style={{
                      flex: 1, padding: '13px 4px',
                      background: pitchDisabled ? 'rgba(255,255,255,0.04)' : '#dc26261a',
                      border: '1.5px solid ' + (pitchDisabled ? 'rgba(255,255,255,0.08)' : '#dc262666'),
                      borderRadius: '10px',
                      color: pitchDisabled ? '#374151' : '#fff',
                      fontWeight: 'bold', fontSize: '13px',
                      cursor: pitchDisabled ? 'default' : 'pointer',
                      fontFamily: FF, transition: 'background 150ms',
                    }}>
                    <div>K</div>
                    <div style={{ fontSize: '10px', fontWeight: 'normal', marginTop: '1px' }}>Swing K</div>
                  </button>
                )}
                {pitchUIConfig.showFoul && (
                  <button
                    onClick={function() { if (!pitchDisabled) { recordPitch(PITCH.FOUL); } }}
                    disabled={pitchDisabled}
                    style={{
                      flex: 1, padding: '13px 4px',
                      background: pitchDisabled ? 'rgba(255,255,255,0.04)' : '#d977061a',
                      border: '1.5px solid ' + (pitchDisabled ? 'rgba(255,255,255,0.08)' : '#d9770666'),
                      borderRadius: '10px',
                      color: pitchDisabled ? '#374151' : '#fff',
                      fontWeight: 'bold', fontSize: '13px',
                      cursor: pitchDisabled ? 'default' : 'pointer',
                      fontFamily: FF, transition: 'background 150ms',
                    }}>
                    <div>F</div>
                    <div style={{ fontSize: '10px', fontWeight: 'normal', marginTop: '1px' }}>Foul</div>
                  </button>
                )}
                {pitchUIConfig.showContact && (
                  <button
                    onClick={function() { if (!pitchDisabled) { recordPitch(PITCH.CONTACT); } }}
                    disabled={pitchDisabled}
                    style={{
                      flex: 1.5, padding: '13px 4px',
                      background: pitchDisabled ? 'rgba(255,255,255,0.04)' : '#16a34a1a',
                      border: '1.5px solid ' + (pitchDisabled ? 'rgba(255,255,255,0.08)' : '#16a34a66'),
                      borderRadius: '10px',
                      color: pitchDisabled ? '#374151' : '#fff',
                      fontWeight: 'bold', fontSize: '13px',
                      cursor: pitchDisabled ? 'default' : 'pointer',
                      fontFamily: FF, transition: 'background 150ms',
                    }}>
                    <div>⚾</div>
                    <div style={{ fontSize: '10px', fontWeight: 'normal', marginTop: '1px' }}>Contact</div>
                  </button>
                )}
              </div>
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
            <button
              onClick={undoLastPitch}
              disabled={pitches.length === 0}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '7px',
                color: pitches.length > 0 ? '#64748b' : '#2d3748',
                fontSize: '12px',
                cursor: pitches.length > 0 ? 'pointer' : 'default',
                fontFamily: FF, padding: '7px 12px',
              }}>
              ⟲ Undo
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          position:'fixed', bottom:'60px', left:0, right:0,
          background:'#0b1524', borderTop:'1px solid rgba(255,255,255,0.08)',
          padding:'8px 16px', zIndex:50,
        }}>
          {/* Opponent B/S/O count display */}
          <div style={{
            display:'flex', justifyContent:'center', gap:'24px',
            marginBottom:'8px'
          }}>
            {[
              {label:'B', val: gs.oppBalls || 0, max:4, color:'#60a5fa'},
              {label:'S', val: gs.oppStrikes || 0, max:3, color:'#f87171'},
              {label:'O', val: gs.outs, max:3, color:'#fbbf24'},
            ].map(function(item) {
              return (
                <div key={item.label} style={{
                  display:'flex', flexDirection:'column',
                  alignItems:'center', gap:'2px'
                }}>
                  <span style={{fontSize:'9px',color:'#888',fontWeight:600}}>
                    {item.label}
                  </span>
                  <div style={{display:'flex',gap:'3px'}}>
                    {Array.from({length:item.max}).map(function(_,i) {
                      return (
                        <div key={i} style={{
                          width:'8px', height:'8px', borderRadius:'50%',
                          background: i < item.val
                            ? item.color
                            : 'rgba(255,255,255,0.12)',
                        }} />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Opponent pitch buttons */}
          <div style={{display:'flex',gap:'6px',marginBottom:'8px'}}>
            {[
              {label:'B\nBall', type:'ball'},
              {label:'K\nStrike', type:'strike'},
              {label:'F\nFoul', type:'foul'},
              {label:'Out', type:'out'},
              {label:'⚾\nContact', type:'contact'},
            ].map(function(btn) {
              return (
                <button
                  key={btn.type}
                  onClick={function(){ scoring.recordOppPitch(btn.type); }}
                  style={{
                    flex:1, padding:'8px 4px', borderRadius:'8px',
                    border:'1px solid rgba(255,255,255,0.15)',
                    background:'rgba(255,255,255,0.05)',
                    color:'#fff', fontSize:'11px', fontWeight:600,
                    cursor:'pointer', whiteSpace:'pre-line',
                    textAlign:'center', lineHeight:1.2,
                  }}>
                  {btn.label}
                </button>
              );
            })}
          </div>
          {/* Run tracking */}
          <div style={{display:'flex',gap:'8px'}}>
            <button
              onClick={function(){ scoring.addManualRun('opp'); }}
              style={{
                flex:2, padding:'10px', borderRadius:'8px',
                border:'none', background:'#7f1d1d',
                color:'#fca5a5', fontSize:'14px', fontWeight:700,
                cursor:'pointer'
              }}>+1 OPP Run</button>
            <button
              onClick={function(){ scoring.addManualRun('us'); }}
              style={{
                flex:1, padding:'10px', borderRadius:'8px',
                border:'1px solid #374151', background:'transparent',
                color:'#555', fontSize:'12px', cursor:'pointer'
              }}>+1 US</button>
          </div>
          {/* Opponent mercy banner */}
          {(scoring.oppRunsThisHalf || 0) >= 5 && (
            <div style={{
              marginTop:'8px', background:'#7c2d12', color:'#fca5a5',
              fontSize:'12px', fontWeight:700, padding:'6px 10px',
              borderRadius:'6px', textAlign:'center',
              display:'flex', gap:'8px', justifyContent:'center',
              alignItems:'center',
            }}>
              <span>⚠️ {scoring.oppRunsThisHalf} opp runs this half</span>
              <button
                onClick={function(){
                  scoring.endHalfInning();
                  setShowUndoToast(true);
                  track('inning_ended', { trigger: 'opp_mercy', half: gs.halfInning, runs: scoring.oppRunsThisHalf });
                }}
                style={{
                  background:'#ef4444', border:'none', color:'#fff',
                  fontSize:'11px', fontWeight:700, padding:'3px 8px',
                  borderRadius:'5px', cursor:'pointer'
                }}>End Half</button>
            </div>
          )}
        </div>
      )}

      {rosterPickerSheet}
      {outcomeSheet}
      {runnerSheet}
      <RunnerConflictModal
        conflict={runnerConflict}
        onResolve={resolveRunnerConflict}
        battingOrder={battingOrder}
      />

      <GameModeGearMenu
        isOpen={showGearMenu}
        isScorer={isScorer}
        onClose={function() { setShowGearMenu(false); }}
        onExitScoring={onExit}
        onHandoff={handleHandoff}
        onFinishGame={function() { setShowFinishModal(true); }}
        confirmHandoff={showHandoffConfirm}
        onConfirmHandoff={handleHandoffConfirm}
        onCancelHandoff={function() { setShowHandoffConfirm(false); }}
      />

      <FinishGameModal
        isOpen={showFinishModal}
        myScore={gs.myScore}
        oppScore={gs.opponentScore}
        inning={gs.inning}
        halfInning={gs.halfInning}
        opponentName={opponentName}
        teamShort={teamShort}
        endGame={endGame}
        onSuccess={function() {
          setShowFinishModal(false);
          onExit();
        }}
        onCancel={function() { setShowFinishModal(false); }}
      />

      {showManualRunPrompt && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0,
          background:'rgba(0,0,0,0.7)', zIndex:200,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <div style={{
            background:'#1a2a3a', borderRadius:'12px',
            padding:'24px', width:'280px', textAlign:'center',
          }}>
            <div style={{color:'#fff',fontSize:'16px',fontWeight:700,marginBottom:'16px'}}>
              Add run for which team?
            </div>
            <div style={{display:'flex',gap:'12px',justifyContent:'center'}}>
              <button
                onClick={function() { addManualRun('us'); setShowManualRunPrompt(false); }}
                style={{
                  flex:1, padding:'12px', borderRadius:'8px',
                  background:'#1B2A4A', color:'#fff',
                  border:'none', fontSize:'15px', fontWeight:700,
                  cursor:'pointer', fontFamily:FF,
                }}
              >Us</button>
              <button
                onClick={function() { addManualRun('opp'); setShowManualRunPrompt(false); }}
                style={{
                  flex:1, padding:'12px', borderRadius:'8px',
                  background:'#4a1a1a', color:'#fff',
                  border:'none', fontSize:'15px', fontWeight:700,
                  cursor:'pointer', fontFamily:FF,
                }}
              >Opp</button>
            </div>
            <button
              onClick={function() { setShowManualRunPrompt(false); }}
              style={{
                marginTop:'12px', background:'none', border:'none',
                color:'#888', fontSize:'13px', cursor:'pointer', fontFamily:FF,
              }}
            >Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
