import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { finalizeSchedule } from '../utils/finalizeSchedule';
import { track } from '../utils/analytics';
import {
  getRulesForTeam,
  processPitch,
  getPitchUIConfig,
  validateSteal,
  isRunLimitReached,
  PITCH_TYPE,
  AT_BAT_RESULT,
} from '../utils/leagueRules';

// ─── Pitch type constants ──────────────────────────────────────────────────────
export var PITCH = {
  BALL:            'ball',
  STRIKE_CALLED:   'strike_called',
  STRIKE_SWINGING: 'strike_swinging',
  FOUL:            'foul',
  CONTACT:         'contact',
};

// ─── At-bat outcome constants ─────────────────────────────────────────────────
export var OUTCOME = {
  SINGLE:        'single',
  DOUBLE:        'double',
  TRIPLE:        'triple',
  HOME_RUN:      'home_run',
  WALK:          'walk',
  HBP:           'hbp',
  STRIKEOUT:     'strikeout',
  OUT_AT_FIRST:  'out_at_first',
  FORCE_OUT:     'force_out',
  FLYOUT:        'flyout',
  ERROR_REACHED: 'error_reached',
};

var HEARTBEAT_MS = 20000;

var OUT_OUTCOMES = [
  OUTCOME.STRIKEOUT,
  OUTCOME.OUT_AT_FIRST,
  OUTCOME.FORCE_OUT,
  OUTCOME.FLYOUT,
];

// ─── Pure helpers (no React) ──────────────────────────────────────────────────

function isRlsError(err) {
  if (!err) return false;
  var code = String(err.code || '');
  var msg  = (err.message || '').toLowerCase();
  return (
    code === '42501' ||
    code === '403'   ||
    msg.indexOf('permission denied') !== -1 ||
    msg.indexOf('row-level security') !== -1
  );
}

function makeDefaultGs() {
  return {
    inning:            1,
    halfInning:        'top',
    outs:              0,
    balls:             0,
    strikes:           0,
    myScore:           0,
    opponentScore:     0,
    runners:           [],  // [{ runnerId, base }]  base: 1|2|3
    currentBatter:     null,
    battingOrderIndex: 0,
    runsThisHalf:      0,
    oppRunsThisHalf:   0,
    oppBalls:                0,
    oppStrikes:              0,
    oppCurrentBatterNumber:  1,
    oppCurrentBatterPitches: 0,
    oppInningPitches:        0,
    oppGamePitches:          0,
    myTeamHalf:              'top',
  };
}

// Re-derive balls/strikes from pitch history (used by undoLastPitch).
export function countFromPitches(pitches) {
  var balls   = 0;
  var strikes = 0;
  for (var i = 0; i < pitches.length; i++) {
    var p = pitches[i];
    if (p.type === PITCH.BALL) {
      balls++;
    } else if (p.type === PITCH.STRIKE_CALLED || p.type === PITCH.STRIKE_SWINGING) {
      strikes++;
    } else if (p.type === PITCH.FOUL && strikes < 2) {
      strikes++;
    }
    // CONTACT: no count change
  }
  return { balls: balls, strikes: strikes };
}

// Advance every runner forward by `bases`. Returns { remaining, runsScored }.
function advanceAll(runners, bases) {
  var remaining  = [];
  var runsScored = 0;
  for (var i = 0; i < runners.length; i++) {
    var next = runners[i].base + bases;
    if (next >= 4) {
      runsScored++;
    } else {
      remaining.push({ runnerId: runners[i].runnerId, base: next });
    }
  }
  return { remaining: remaining, runsScored: runsScored };
}

// Advance runners for a hit. Back-to-front (3B→2B→1B) prevents any base collision.
// Returns { runners, runsScored, pendingRunners }.
// pendingRunners: runner on 3rd for a single — needs manual scored/held confirmation.
export function advanceRunners(runners, hitBases, batterId) {
  if (hitBases >= 4) {
    return {
      runners:        [],
      runsScored:     runners.length + (batterId ? 1 : 0),
      pendingRunners: [],
    };
  }
  // Normalise to base-map — eliminates any pre-existing duplicates
  var baseMap = { 1: null, 2: null, 3: null };
  for (var i = 0; i < runners.length; i++) {
    var rb = runners[i].base;
    if (rb >= 1 && rb <= 3) { baseMap[rb] = runners[i].runnerId; }
  }
  var destMap        = { 1: null, 2: null, 3: null };
  var runsScored     = 0;
  var pendingRunners = [];
  // Back-to-front: 3B first so higher bases don't overwrite lower ones
  for (var src = 3; src >= 1; src--) {
    var rid = baseMap[src];
    if (!rid) continue;
    if (hitBases === 1 && src === 3) {
      // Single: 3B runner needs manual confirmation (scored vs. held)
      pendingRunners.push({ runnerId: rid, base: 3 });
      continue;
    }
    var dest = src + hitBases;
    if (dest >= 4) {
      runsScored++;
    } else {
      destMap[dest] = rid;
    }
  }
  if (batterId) { destMap[hitBases] = batterId; }
  var result = [];
  for (var b = 1; b <= 3; b++) {
    if (destMap[b]) { result.push({ runnerId: destMap[b], base: b }); }
  }
  return { runners: result, runsScored: runsScored, pendingRunners: pendingRunners };
}

// Detect base collision when a pending runner tries to advance to an occupied base.
// Returns a conflict descriptor or null (no collision).
export function detectRunnerConflict(currentRunners, runnerId, toBase, incomingFromBase, baseReached) {
  var blocker = null;
  for (var i = 0; i < currentRunners.length; i++) {
    if (currentRunners[i].base === toBase) { blocker = currentRunners[i]; break; }
  }
  if (!blocker) return null;
  return {
    incomingRunnerId: runnerId,
    incomingFromBase: incomingFromBase,
    targetBase:       toBase,
    blockingRunnerId: blocker.runnerId,
    blockingFromBase: (typeof baseReached === 'number') ? toBase - baseReached : null,
  };
}

// Apply a coach's conflict resolution decision. Pure — no side effects.
// trackFn: optional fn(event, props) — pass vi.fn() in tests, track() in the hook.
export function applyConflictResolution(gs, conflict, decision, preResolveSnapshot, trackFn) {
  if (typeof trackFn === 'function') {
    trackFn('scoring_runner_conflict_prompted', {
      targetBase:      conflict.targetBase,
      incomingFromBase: conflict.incomingFromBase,
      decision:        decision,
    });
  }
  if (decision === 'SCORE_BLOCKING') {
    var scoredRunners = gs.runners
      .filter(function(r) { return r.runnerId !== conflict.blockingRunnerId; })
      .concat([{ runnerId: conflict.incomingRunnerId, base: conflict.targetBase }]);
    return Object.assign({}, gs, {
      runners:      scoredRunners,
      myScore:      gs.myScore + 1,
      runsThisHalf: (gs.runsThisHalf || 0) + 1,
    });
  }
  if (decision === 'HOLD_INCOMING') {
    var heldRunners = gs.runners.map(function(r) {
      if (r.runnerId !== conflict.blockingRunnerId) return r;
      return { runnerId: r.runnerId, base: conflict.blockingFromBase };
    });
    heldRunners = heldRunners.concat([{
      runnerId: conflict.incomingRunnerId,
      base:     conflict.incomingFromBase,
    }]);
    return Object.assign({}, gs, { runners: heldRunners });
  }
  if (decision === 'CANCEL_PLAY') {
    if (!preResolveSnapshot) return gs;
    return Object.assign({}, gs, preResolveSnapshot);
  }
  return gs;
}

// Walk/HBP: batter to 1st, cascade runners only along consecutive occupied bases.
function forceAdvance(runners, batterId) {
  var occupied = {};
  for (var i = 0; i < runners.length; i++) {
    occupied[runners[i].base] = runners[i].runnerId;
  }

  // Find the end of the consecutive chain starting at 1st
  var chainEnd = 0;
  while (occupied[chainEnd + 1]) { chainEnd++; }

  var newRunners = [];
  var runsScored = 0;

  for (var j = 0; j < runners.length; j++) {
    var r = runners[j];
    if (r.base >= 1 && r.base <= chainEnd) {
      // Pushed one base forward
      if (r.base + 1 >= 4) {
        runsScored++;
      } else {
        newRunners.push({ runnerId: r.runnerId, base: r.base + 1 });
      }
    } else {
      // Not in forced chain — stays
      newRunners.push({ runnerId: r.runnerId, base: r.base });
    }
  }
  newRunners.push({ runnerId: batterId, base: 1 });

  return { remaining: newRunners, runsScored: runsScored };
}

/**
 * Pure function. Toggles half-inning, advances inning if needed,
 * and resets all per-half-inning state. No side effects.
 *
 * Used by 5 internal call sites inside the useLiveScoring hook:
 *   - resolveAtBat (3-out path)
 *   - endHalfInning (manual)
 *   - recordOppPitch (strikeout 3-out path)
 *   - recordOppPitch (direct out 3-out path)
 *   - confirmRunnerAdvancement (3-out path)
 *
 * Each call site is responsible for its own pre/post side effects:
 *   - undoSnapRef capture (endHalfInning only)
 *   - setAb(null) (resolveAtBat only)
 *   - setPendingAdvancement(null) (confirmRunnerAdvancement only)
 *   - oppGamePitches increment (recordOppPitch paths only)
 *   - battingOrderIndex / myScore (resolveAtBat only)
 *   - audit event emission (all sites — call-site-specific signatures)
 *
 * Returns a new gs object (immutable update via Object.assign).
 */
export function flipHalfInning(gs) {
  var nextHalf   = gs.halfInning === 'top' ? 'bottom' : 'top';
  var nextInning = gs.halfInning === 'bottom' ? gs.inning + 1 : gs.inning;

  return Object.assign({}, gs, {
    inning:                  nextInning,
    halfInning:              nextHalf,
    outs:                    0,
    balls:                   0,
    strikes:                 0,
    oppBalls:                0,
    oppStrikes:              0,
    oppCurrentBatterPitches: 0,
    oppInningPitches:        0,
    runners:                 [],
    currentBatter:           null,
    runsThisHalf:            0,
    oppRunsThisHalf:         0,
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLiveScoring(params) {
  var gameId       = params.gameId;
  var teamId       = params.teamId;
  var userId       = params.userId;
  var userName     = params.userName;
  var isEnabled    = params.isEnabled;
  var battingOrder = params.battingOrder || [];
  var team         = params.team || null;
  var myTeamHalf   = params.myTeamHalf  || 'top';
  var isPractice   = params.isPractice  || false;

  // AUTH TESTING SHIM — remove when auth goes live (Phase 4C)
  // When auth gate is commented out, userId/userName are null.
  // Use hardcoded admin identity so scorer lock writes succeed.
  var _effectiveUserId   = userId   || null;
  var _effectiveUserName = userName || 'Coach';

  // ── State — all unconditional (Rules of Hooks) ────────────────────────────
  var _gs = useState(makeDefaultGs);
  var gameState = _gs[0]; var setGameState = _gs[1];

  var _ab = useState(null);
  var currentAtBat = _ab[0]; var setCurrentAtBat = _ab[1];

  var _scorer = useState(false);
  var isScorer = _scorer[0]; var setIsScorer = _scorer[1];

  var _sname = useState(null);
  var scorerName = _sname[0]; var setScorerName = _sname[1];

  var _lkexp = useState(false);
  var scorerLockExpired = _lkexp[0]; var setScorerLockExpired = _lkexp[1];

  var _pend = useState(null);
  var pendingAdvancement = _pend[0]; var setPendingAdvancement = _pend[1];

  var _rc = useState(null);
  var runnerConflict = _rc[0]; var setRunnerConflict = _rc[1];

  var _warn = useState([]);
  var ruleWarnings = _warn[0]; var setRuleWarnings = _warn[1];

  var _claimError = useState('');
  var claimError = _claimError[0]; var setClaimError = _claimError[1];

  // ── Refs (safe in interval / async callbacks) ─────────────────────────────
  var gsRef       = useRef(makeDefaultGs());
  var atBatRef    = useRef(null);
  var isScorerRef = useRef(false);
  var hbRef       = useRef(null);   // heartbeat interval id
  var chanRef     = useRef(null);   // realtime channel
  var undoSnapRef      = useRef(null);   // snapshot for endHalfInning undo
  var preResolveSnapRef = useRef(null);  // snapshot for CANCEL_PLAY path
  var pendingAdvRef    = useRef(null);   // ref-copy of pendingAdvancement (stale-closure safe)
  var lastAppliedAtRef = useRef('');     // updated_at of the last Realtime event we applied

  var rules         = team ? getRulesForTeam(team) : null;
  var pitchUIConfig = rules ? getPitchUIConfig(rules) : null;

  // ── State + ref co-setters ────────────────────────────────────────────────

  function setGs(next) {
    gsRef.current = next;
    setGameState(next);
  }

  function setAb(next) {
    atBatRef.current = next;
    setCurrentAtBat(next);
  }

  function setScorer(val) {
    isScorerRef.current = val;
    setIsScorer(val);
  }

  // ── Internal utilities ────────────────────────────────────────────────────

  function persist(gs) {
    if (isPractice || !supabase || !gameId || !teamId) return;
    var persistedAt = new Date().toISOString();
    supabase
      .from('live_game_state')
      .upsert(
        {
          game_id:             gameId,
          team_id:             String(teamId),
          inning:              gs.inning,
          half_inning:         gs.halfInning,
          outs:                gs.outs,
          balls:               gs.balls,
          strikes:             gs.strikes,
          my_score:            gs.myScore,
          opponent_score:      gs.opponentScore,
          runners:             gs.runners,
          current_batter:      gs.currentBatter,
          batting_order_index: gs.battingOrderIndex,
          runs_this_half:             gs.runsThisHalf             || 0,
          opp_runs_this_half:         gs.oppRunsThisHalf          || 0,
          opp_balls:                  gs.oppBalls                 || 0,
          opp_strikes:                gs.oppStrikes               || 0,
          opp_current_batter_number:  gs.oppCurrentBatterNumber   || 1,
          opp_current_batter_pitches: gs.oppCurrentBatterPitches  || 0,
          opp_inning_pitches:         gs.oppInningPitches         || 0,
          opp_game_pitches:           gs.oppGamePitches           || 0,
          updated_at:                 persistedAt,
        },
        { onConflict: 'game_id,team_id' }
      )
      .then(function(r) {
        if (r.error && isRlsError(r.error)) {
          setScorer(false);
          setScorerLockExpired(true);
          stopHeartbeat();
        } else if (!r.error) {
          lastAppliedAtRef.current = persistedAt;
        }
      });
  }

  function audit(action, payload) {
    if (isPractice || !supabase || !gameId || !teamId) return;
    supabase
      .from('scoring_audit_log')
      .insert({
        game_id:       gameId,
        team_id:       String(teamId),
        actor_user_id: _effectiveUserId,
        actor_name:    _effectiveUserName,
        action:        action,
        payload:       payload  || null,
        recorded_at:   new Date().toISOString(),
      })
      .then(function() {}); // fire-and-forget
  }

  function stopHeartbeat() {
    if (hbRef.current) {
      clearInterval(hbRef.current);
      hbRef.current = null;
    }
  }

  function startHeartbeat() {
    if (isPractice) return;
    stopHeartbeat();
    hbRef.current = setInterval(function() {
      if (!isScorerRef.current || !supabase) return;
      supabase
        .from('game_scoring_sessions')
        .upsert(
          {
            game_id:        gameId,
            team_id:        String(teamId),
            scorer_user_id: _effectiveUserId,
            scorer_name:    _effectiveUserName,
            last_heartbeat: new Date().toISOString(),
          },
          { onConflict: 'game_id,team_id' }
        )
        .then(function(r) {
          if (r.error && isRlsError(r.error)) {
            setScorer(false);
            setScorerLockExpired(true);
            stopHeartbeat();
          }
        });
    }, HEARTBEAT_MS);
  }

  // ── Mount: hydrate + subscribe to realtime ────────────────────────────────
  useEffect(function() {
    if (!isEnabled || isPractice || !supabase || !gameId || !teamId) return;

    // Hydrate existing game state
    supabase
      .from('live_game_state')
      .select('*')
      .eq('game_id', gameId)
      .eq('team_id', String(teamId))
      .single()
      .then(function(r) {
        if (r.data) {
          var row = r.data;
          setGs({
            inning:            row.inning             || 1,
            halfInning:        row.half_inning         || 'top',
            outs:              row.outs                || 0,
            balls:             row.balls               || 0,
            strikes:           row.strikes             || 0,
            myScore:           row.my_score            || 0,
            opponentScore:     row.opponent_score      || 0,
            runners:           row.runners             || [],
            currentBatter:     row.current_batter      || null,
            battingOrderIndex: row.batting_order_index || 0,
            runsThisHalf:            row.runs_this_half             || 0,
            oppRunsThisHalf:         row.opp_runs_this_half         || 0,
            oppBalls:                row.opp_balls                  || 0,
            oppStrikes:              row.opp_strikes                || 0,
            oppCurrentBatterNumber:  row.opp_current_batter_number  || 1,
            oppCurrentBatterPitches: row.opp_current_batter_pitches || 0,
            oppInningPitches:        row.opp_inning_pitches         || 0,
            oppGamePitches:          row.opp_game_pitches           || 0,
          });
        }
      });

    // Hydrate active scorer name
    supabase
      .from('game_scoring_sessions')
      .select('scorer_user_id, scorer_name')
      .eq('game_id', gameId)
      .eq('team_id', String(teamId))
      .single()
      .then(function(r) {
        if (r.data) {
          setScorerName(r.data.scorer_name || null);
        }
      });

    // Realtime — game state changes
    var channel = supabase
      .channel('live_scoring:' + gameId + ':' + String(teamId))
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'live_game_state',
          filter: 'game_id=eq.' + gameId,
        },
        function(payload) {
          if (!payload.new) return;
          var row = payload.new;
          // Verify team (filter supports only one column in v2)
          if (String(row.team_id) !== String(teamId)) return;
          // Reject stale and echo events: skip if this row is not newer than
          // the last timestamp we persisted (guards against out-of-order Realtime delivery)
          if (row.updated_at && lastAppliedAtRef.current &&
              row.updated_at <= lastAppliedAtRef.current) {
            return;
          }
          setGs({
            inning:            row.inning             || 1,
            halfInning:        row.half_inning         || 'top',
            outs:              row.outs                || 0,
            balls:             row.balls               || 0,
            strikes:           row.strikes             || 0,
            myScore:           row.my_score            || 0,
            opponentScore:     row.opponent_score      || 0,
            runners:           row.runners             || [],
            currentBatter:     row.current_batter      || null,
            battingOrderIndex: row.batting_order_index || 0,
            runsThisHalf:            row.runs_this_half             || 0,
            oppRunsThisHalf:         row.opp_runs_this_half         || 0,
            oppBalls:                row.opp_balls                  || 0,
            oppStrikes:              row.opp_strikes                || 0,
            oppCurrentBatterNumber:  row.opp_current_batter_number  || 1,
            oppCurrentBatterPitches: row.opp_current_batter_pitches || 0,
            oppInningPitches:        row.opp_inning_pitches         || 0,
            oppGamePitches:          row.opp_game_pitches           || 0,
          });
          if (row.updated_at) {
            lastAppliedAtRef.current = row.updated_at;
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'game_scoring_sessions',
          filter: 'game_id=eq.' + gameId,
        },
        function(payload) {
          if (!payload.new) return;
          var row = payload.new;
          if (String(row.team_id) !== String(teamId)) return;
          setScorerName(row.scorer_name || null);
        }
      )
      .subscribe();

    chanRef.current = channel;

    return function() {
      if (chanRef.current) {
        supabase.removeChannel(chanRef.current);
        chanRef.current = null;
      }
      stopHeartbeat();
    };
  }, [isEnabled, isPractice, gameId, teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public functions ───────────────────────────────────────────────────────

  function claimScorerLock() {
    // Practice mode — local-only claim, no network effects.
    if (isPractice) {
      setScorer(true);
      setScorerName(_effectiveUserName);
      setScorerLockExpired(false);
      setClaimError('');
      return;
    }
    if (!isEnabled || !supabase || !gameId || !teamId) return;
    setClaimError('');
    supabase
      .from('game_scoring_sessions')
      .upsert(
        {
          game_id:        gameId,
          team_id:        String(teamId),
          scorer_user_id: _effectiveUserId,
          scorer_name:    _effectiveUserName,
          last_heartbeat: new Date().toISOString(),
        },
        { onConflict: 'game_id,team_id' }
      )
      .then(function(r) {
        if (r.error) {
          if (isRlsError(r.error)) {
            setScorerLockExpired(true);
          } else {
            // Non-RLS error (constraint, network, 500) — surface to UI
            console.error('[Scoring] claimScorerLock failed:', r.error);
            setClaimError(r.error.message || 'Failed to claim scorer role');
          }
          return;
        }
        setScorer(true);
        setScorerName(_effectiveUserName);
        setScorerLockExpired(false);
        setClaimError('');
        startHeartbeat();
        audit('lock_claimed');
        // Seed live_game_state if no row exists yet.
        var seedAt = new Date().toISOString();
        supabase
          .from('live_game_state')
          .upsert({
            game_id:             gameId,
            team_id:             String(teamId),
            inning:              gameState.inning             || 1,
            half_inning:         gameState.halfInning         || 'top',
            outs:                gameState.outs               || 0,
            balls:               gameState.balls              || 0,
            strikes:             gameState.strikes            || 0,
            my_score:            gameState.myScore            || 0,
            opponent_score:      gameState.opponentScore      || 0,
            batting_order_index: gameState.battingOrderIndex  || 0,
            runners:             gameState.runners             || [],
            runs_this_half:             gameState.runsThisHalf        || 0,
            opp_runs_this_half:         gameState.oppRunsThisHalf     || 0,
            opp_balls:                  0,
            opp_strikes:                0,
            opp_current_batter_number:  1,
            opp_current_batter_pitches: 0,
            opp_inning_pitches:         0,
            opp_game_pitches:           0,
            updated_at:                 seedAt,
          }, { onConflict: 'game_id,team_id' })
          .then(function(r) {
            if (r.error) {
              console.warn('[scoring] seed live_game_state failed:', r.error);
            } else {
              lastAppliedAtRef.current = seedAt;
            }
          });
      });
  }

  function releaseScorerLock() {
    // Practice mode — local-only release.
    if (isPractice) {
      setScorer(false);
      return;
    }
    if (!isEnabled || !supabase || !gameId || !teamId) return;
    stopHeartbeat();
    setScorer(false);
    supabase
      .from('game_scoring_sessions')
      .delete()
      .eq('game_id', gameId)
      .eq('team_id', String(teamId))
      .eq('scorer_user_id', _effectiveUserId)
      .then(function() {});
    audit('lock_released');
  }

  function startAtBat(batter, wasAutoSuggested) {
    if (!isEnabled || !isScorerRef.current || !batter) return;
    var newAb = {
      id:               batter.id + ':' + Date.now(),
      batter:           batter,
      pitches:          [],
      startedAt:        new Date().toISOString(),
      wasAutoSuggested: !!wasAutoSuggested,
    };
    var newGs = Object.assign({}, gsRef.current, {
      currentBatter: batter,
      balls:         0,
      strikes:       0,
    });
    setAb(newAb);
    setGs(newGs);
    persist(newGs);
    audit('at_bat_opened', {
      batterId:         batter.id,
      batterName:       batter.name,
      wasAutoSuggested: !!wasAutoSuggested,
    });
  }

  function resolveAtBat(outcomeType) {
    if (!isEnabled || !isScorerRef.current) return;

    var gs      = gsRef.current;

    // Capture pre-play snapshot for CANCEL_PLAY path
    preResolveSnapRef.current = {
      runners:           gs.runners.slice(),
      myScore:           gs.myScore,
      outs:              gs.outs,
      balls:             gs.balls,
      strikes:           gs.strikes,
      currentBatter:     gs.currentBatter,
      battingOrderIndex: gs.battingOrderIndex,
      runsThisHalf:      gs.runsThisHalf || 0,
    };

    var batter  = gs.currentBatter;
    var runners = gs.runners.slice();

    var newRunners = runners;
    var runsScored = 0;
    var newOuts    = gs.outs;
    var isOut      = OUT_OUTCOMES.indexOf(outcomeType) !== -1;

    if (isOut) {
      newOuts++;
    } else {
      // Balls-in-play, walks, and base-reaching outcomes

      if (outcomeType === OUTCOME.HOME_RUN) {
        var hr = advanceRunners(runners, 4, batter ? batter.id : null);
        runsScored = hr.runsScored;
        newRunners = hr.runners;

      } else if (outcomeType === OUTCOME.TRIPLE) {
        var tri = advanceRunners(runners, 3, batter ? batter.id : null);
        runsScored = tri.runsScored;
        newRunners = tri.runners;

      } else if (outcomeType === OUTCOME.DOUBLE) {
        var dbl = advanceRunners(runners, 2, batter ? batter.id : null);
        runsScored = dbl.runsScored;
        newRunners = dbl.runners;

      } else if (outcomeType === OUTCOME.SINGLE) {
        var sgl = advanceRunners(runners, 1, batter ? batter.id : null);
        runsScored = sgl.runsScored;
        newRunners = sgl.runners;
        if (sgl.pendingRunners.length > 0) {
          var pendInfo = { runners: sgl.pendingRunners, baseReached: 1 };
          pendingAdvRef.current = pendInfo;
          setPendingAdvancement(pendInfo);
        }

      } else if (outcomeType === OUTCOME.WALK || outcomeType === OUTCOME.HBP) {
        if (batter) {
          var fa = forceAdvance(runners, batter.id);
          runsScored = fa.runsScored;
          newRunners = fa.remaining;
        }

      } else if (outcomeType === OUTCOME.ERROR_REACHED) {
        newRunners = runners.slice();
        if (batter) { newRunners.push({ runnerId: batter.id, base: 1 }); }
      }
    }

    var nextIndex       = gs.battingOrderIndex + 1;
    var newMyScore      = gs.myScore + runsScored;
    var newRunsThisHalf = (gs.runsThisHalf || 0) + runsScored;
    var newGs;

    if (newOuts >= 3) {
      newGs = Object.assign({}, flipHalfInning(gs), {
        myScore:           newMyScore,
        battingOrderIndex: nextIndex,
      });
    } else {
      newGs = Object.assign({}, gs, {
        outs:              newOuts,
        balls:             0,
        strikes:           0,
        runners:           newRunners,
        myScore:           newMyScore,
        currentBatter:     null,
        battingOrderIndex: nextIndex,
        runsThisHalf:      newRunsThisHalf,
      });
    }

    setAb(null);
    setGs(newGs);
    persist(newGs);
    audit('at_bat_resolved', {
      outcome:    outcomeType,
      runsScored: runsScored,
      batterId:   batter ? batter.id : null,
    });
  }

  function recordPitch(type) {
    if (!isEnabled || !isScorerRef.current || !atBatRef.current) return;
    if (!rules) {
      console.warn('[useLiveScoring] recordPitch called but rules not loaded. Pass team prop.');
      return;
    }

    var gs = gsRef.current;
    var ab = atBatRef.current;
    var countBefore = { balls: gs.balls, strikes: gs.strikes };

    var result = processPitch(rules, {
      balls:                  gs.balls,
      strikes:                gs.strikes,
      attempts:               gs.attempts || 0,
      coachPitchesRemaining:  gs.coachPitchesRemaining || 0,
      isCoachPitching:        gs.isCoachPitching || false,
    }, type);

    if (result.warnings && result.warnings.length > 0) {
      setRuleWarnings(result.warnings);
    } else {
      setRuleWarnings([]);
    }

    var newPitch = { type: type, timestamp: new Date().toISOString() };
    var newAb = Object.assign({}, ab, { pitches: ab.pitches.concat([newPitch]) });
    var newGs = Object.assign({}, gs, {
      balls:                 result.balls,
      strikes:               result.strikes,
      attempts:              result.attempts,
      coachPitchesRemaining: result.coachPitchesRemaining,
      isCoachPitching:       result.isCoachPitching,
    });

    setAb(newAb);
    setGs(newGs);
    persist(newGs);
    audit('pitch_recorded', {
      type:        type,
      countBefore: countBefore,
      countAfter:  { balls: result.balls, strikes: result.strikes },
      warnings:    result.warnings,
    });

    if (result.isResolved) {
      if (result.atBatResult === AT_BAT_RESULT.WALK) {
        resolveAtBat(OUTCOME.WALK);
      } else if (result.atBatResult === AT_BAT_RESULT.STRIKEOUT) {
        resolveAtBat(OUTCOME.STRIKEOUT);
      } else if (result.atBatResult === AT_BAT_RESULT.OUT_ATTEMPTS) {
        resolveAtBat(OUTCOME.OUT_AT_FIRST);
      }
    }
  }

  function undoLastPitch() {
    if (!isEnabled || !isScorerRef.current || !atBatRef.current) return;
    var ab = atBatRef.current;
    if (ab.pitches.length === 0) return;

    var newPitches = ab.pitches.slice(0, -1);
    var count      = countFromPitches(newPitches);
    var newAb      = Object.assign({}, ab, { pitches: newPitches });
    var newGs      = Object.assign({}, gsRef.current, { balls: count.balls, strikes: count.strikes });

    setAb(newAb);
    setGs(newGs);
    persist(newGs);
    audit('pitch_undone', { remainingPitches: newPitches.length });
  }

  function confirmRunnerAdvancement(runnerId, toBase, result) {
    if (!isEnabled || !isScorerRef.current) return;
    var gs         = gsRef.current;
    var newRunners = gs.runners.slice();
    var newScore   = gs.myScore;

    if (result === 'scored' || toBase >= 4) {
      newRunners = newRunners.filter(function(r) { return r.runnerId !== runnerId; });
      newScore++;
    } else if (result === 'out') {
      newRunners = newRunners.filter(function(r) { return r.runnerId !== runnerId; });
      var newOuts = gs.outs + 1;

      if (newOuts >= 3) {
        var flipGs = flipHalfInning(gs);
        setPendingAdvancement(null);
        setGs(flipGs);
        persist(flipGs);
        audit('runner_out', { runnerId: runnerId });
        audit('half_inning_ended', {
          inning:     gs.inning,
          halfInning: gs.halfInning,
          cause:      'runner_out',
        });
        return;
      }

      var outGs = Object.assign({}, gs, {
        runners: newRunners,
        myScore: newScore,
        outs:    newOuts,
      });
      setPendingAdvancement(null);
      setGs(outGs);
      persist(outGs);
      audit('runner_advanced', { runnerId: runnerId, toBase: null, result: 'out' });
      return;
    } else if (toBase) {
      var foundInList = false;
      newRunners = newRunners.map(function(r) {
        if (r.runnerId === runnerId) { foundInList = true; return { runnerId: runnerId, base: toBase }; }
        return r;
      });
      if (!foundInList) {
        // Runner was pending (not in active list) — add back only if base is free.
        // If occupied, surface a conflict prompt instead of silently scoring the held runner.
        var pInfo        = pendingAdvRef.current;
        var pEntry       = pInfo ? pInfo.runners.find(function(r) { return r.runnerId === runnerId; }) : null;
        var fromBase     = pEntry ? pEntry.base : null;
        var hitBases_    = pInfo ? pInfo.baseReached : null;
        var conflict     = detectRunnerConflict(newRunners, runnerId, toBase, fromBase, hitBases_);
        if (conflict) {
          setRunnerConflict(conflict);
          return; // state unchanged until resolveRunnerConflict() is called
        }
        newRunners = newRunners.concat([{ runnerId: runnerId, base: toBase }]);
      }
    }

    var newGs = Object.assign({}, gs, { runners: newRunners, myScore: newScore });
    setPendingAdvancement(null);
    setGs(newGs);
    persist(newGs);
    audit('runner_advanced', { runnerId: runnerId, toBase: toBase, result: result });
  }

  function incrementOpponentScore() {
    if (!isEnabled || !isScorerRef.current) return;
    var newGs = Object.assign({}, gsRef.current, {
      opponentScore: gsRef.current.opponentScore + 1,
    });
    setGs(newGs);
    persist(newGs);
    audit('score_corrected', { opponentScore: newGs.opponentScore });
  }

  function addManualRun(team) {
    if (!isEnabled || !isScorerRef.current) return;
    var newGs = team === 'us'
      ? Object.assign({}, gsRef.current, {
          myScore: gsRef.current.myScore + 1,
          runsThisHalf: (gsRef.current.runsThisHalf || 0) + 1
        })
      : Object.assign({}, gsRef.current, {
          opponentScore: gsRef.current.opponentScore + 1,
          oppRunsThisHalf: (gsRef.current.oppRunsThisHalf || 0) + 1
        });
    setGs(newGs);
    persist(newGs);
    audit('score_corrected', { team: team, myScore: newGs.myScore, opponentScore: newGs.opponentScore });
  }

  function endHalfInning() {
    if (!isEnabled || !isScorerRef.current) return;
    var gs = gsRef.current;
    undoSnapRef.current = Object.assign({}, gs); // save for undo
    var newGs = flipHalfInning(gs);
    setGs(newGs);
    persist(newGs);
    audit('half_inning_ended', { inning: gs.inning, halfInning: gs.halfInning, runsScored: gs.runsThisHalf });
  }

  function undoHalfInning() {
    if (!isEnabled || !isScorerRef.current || !undoSnapRef.current) return;
    var snap = undoSnapRef.current;
    undoSnapRef.current = null;
    setGs(snap);
    persist(snap);
    audit('half_inning_undone', { inning: snap.inning, halfInning: snap.halfInning });
  }

  function resolveRunnerConflict(decision) {
    if (!isEnabled || !isScorerRef.current || !runnerConflict) return;
    var conflict = runnerConflict;
    var snap     = preResolveSnapRef.current ? preResolveSnapRef.current : null;
    var newGs    = applyConflictResolution(gsRef.current, conflict, decision, snap, track);

    setRunnerConflict(null);
    pendingAdvRef.current = null;
    setPendingAdvancement(null);
    if (decision === 'CANCEL_PLAY' && snap) {
      setAb(null); // batter goes back to suggested; currentBatter restored via snapshot
    }
    setGs(newGs);
    persist(newGs);
    audit('runner_conflict_resolved', { decision: decision, targetBase: conflict.targetBase });
  }

  async function endGame() {
    if (!isEnabled || !isScorerRef.current) return { ok: false, error: 'not_scorer' };
    var gs = gsRef.current;
    var result = await finalizeSchedule({
      gameId:    gameId,
      teamId:    teamId,
      usScore:   gs.myScore,
      oppScore:  gs.opponentScore,
      userId:    _effectiveUserId,
    });
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    audit('game_ended', { finalMyScore: gs.myScore, finalOpponentScore: gs.opponentScore });
    releaseScorerLock();
    return { ok: true };
  }

  function recordOppPitch(type) {
    if (!isEnabled || !isScorerRef.current) return;
    var gs = gsRef.current;
    var newOppBalls = gs.oppBalls || 0;
    var newOppStrikes = gs.oppStrikes || 0;
    var newOuts = gs.outs;
    var newGs;

    if (type === 'ball') {
      newOppBalls = newOppBalls + 1;
      if (newOppBalls >= 4) {
        newOppBalls = 0; newOppStrikes = 0;
      }
      newGs = Object.assign({}, gs, {
        oppBalls: newOppBalls, oppStrikes: newOppStrikes,
        oppCurrentBatterPitches: (gs.oppCurrentBatterPitches || 0) + 1,
        oppInningPitches:        (gs.oppInningPitches || 0) + 1,
        oppGamePitches:          (gs.oppGamePitches || 0) + 1,
      });
    } else if (type === 'strike') {
      newOppStrikes = newOppStrikes + 1;
      if (newOppStrikes >= 3) {
        newOuts = newOuts + 1;
        newOppBalls = 0; newOppStrikes = 0;
        if (newOuts >= 3) {
          newGs = Object.assign({}, flipHalfInning(gs), {
            oppGamePitches: (gs.oppGamePitches || 0) + 1,
          });
          setGs(newGs); persist(newGs);
          audit('half_inning_ended_opp', { inning: gs.inning });
          return;
        }
        newGs = Object.assign({}, gs, {
          outs: newOuts, oppBalls: 0, oppStrikes: 0,
          oppCurrentBatterPitches: (gs.oppCurrentBatterPitches || 0) + 1,
          oppInningPitches:        (gs.oppInningPitches || 0) + 1,
          oppGamePitches:          (gs.oppGamePitches || 0) + 1,
        });
      } else {
        newGs = Object.assign({}, gs, {
          oppBalls: newOppBalls, oppStrikes: newOppStrikes,
          oppCurrentBatterPitches: (gs.oppCurrentBatterPitches || 0) + 1,
          oppInningPitches:        (gs.oppInningPitches || 0) + 1,
          oppGamePitches:          (gs.oppGamePitches || 0) + 1,
        });
      }
    } else if (type === 'foul') {
      if (newOppStrikes < 2) { newOppStrikes = newOppStrikes + 1; }
      newGs = Object.assign({}, gs, {
        oppBalls: newOppBalls, oppStrikes: newOppStrikes,
        oppCurrentBatterPitches: (gs.oppCurrentBatterPitches || 0) + 1,
        oppInningPitches:        (gs.oppInningPitches || 0) + 1,
        oppGamePitches:          (gs.oppGamePitches || 0) + 1,
      });
    } else if (type === 'out') {
      newOuts = newOuts + 1;
      newOppBalls = 0; newOppStrikes = 0;
      if (newOuts >= 3) {
        newGs = Object.assign({}, flipHalfInning(gs), {
          oppGamePitches: (gs.oppGamePitches || 0) + 1,
        });
        setGs(newGs); persist(newGs);
        audit('half_inning_ended_opp', { inning: gs.inning });
        return;
      }
      newGs = Object.assign({}, gs, {
        outs: newOuts, oppBalls: 0, oppStrikes: 0,
        oppCurrentBatterPitches: 0,
        oppCurrentBatterNumber:  ((gs.oppCurrentBatterNumber || 1) % 11) + 1,
        oppInningPitches:        (gs.oppInningPitches || 0) + 1,
        oppGamePitches:          (gs.oppGamePitches || 0) + 1,
      });
    } else {
      // contact/hit — batter advances
      newGs = Object.assign({}, gs, {
        oppBalls: 0, oppStrikes: 0,
        oppCurrentBatterPitches: 0,
        oppCurrentBatterNumber:  ((gs.oppCurrentBatterNumber || 1) % 11) + 1,
        oppInningPitches:        (gs.oppInningPitches || 0) + 1,
        oppGamePitches:          (gs.oppGamePitches || 0) + 1,
      });
    }
    setGs(newGs); persist(newGs);
    audit('opp_pitch', { type: type });
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  // Computed regardless of isEnabled so practice mode (no gameId) still shows
  // the batting order — isEnabled gates Supabase writes, not the batter display.
  var suggestedBatter = null;
  if (gameState.currentBatter === null && battingOrder.length > 0) {
    suggestedBatter = battingOrder[gameState.battingOrderIndex % battingOrder.length] || null;
  }
  // ── Return empty shell when disabled (hooks already called above) ─────────
  if (!isEnabled) {
    return {
      gameState:                makeDefaultGs(),
      currentAtBat:             null,
      isScorer:                 false,
      scorerName:               null,
      scorerLockExpired:        false,
      suggestedBatter:          suggestedBatter,
      pendingAdvancement:       null,
      claimScorerLock:          function() {},
      releaseScorerLock:        function() {},
      startAtBat:               function() {},
      recordPitch:              function() {},
      resolveAtBat:             function() {},
      undoLastPitch:            function() {},
      confirmRunnerAdvancement: function() {},
      resolveRunnerConflict:    function() {},
      incrementOpponentScore:   function() {},
      addManualRun:             function() {},
      endHalfInning:            function() {},
      undoHalfInning:           function() {},
      endGame:                  function() {},
      recordOppPitch:           function() {},
      runnerConflict:           null,
      myTeamHalf:               myTeamHalf,
      oppRunsThisHalf:          0,
      oppBalls:                 0,
      oppStrikes:               0,
      oppCurrentBatterNumber:   1,
      oppCurrentBatterPitches:  0,
      oppInningPitches:         0,
      oppGamePitches:           0,
      claimError:               '',
    };
  }

  return {
    gameState:                gameState,
    currentAtBat:             currentAtBat,
    isScorer:                 isScorer,
    scorerName:               scorerName,
    scorerLockExpired:        scorerLockExpired,
    suggestedBatter:          suggestedBatter,
    pendingAdvancement:       pendingAdvancement,
    runsThisHalf:             gsRef.current.runsThisHalf || 0,
    claimScorerLock:          claimScorerLock,
    releaseScorerLock:        releaseScorerLock,
    startAtBat:               startAtBat,
    recordPitch:              recordPitch,
    resolveAtBat:             resolveAtBat,
    undoLastPitch:            undoLastPitch,
    confirmRunnerAdvancement: confirmRunnerAdvancement,
    resolveRunnerConflict:    resolveRunnerConflict,
    runnerConflict:           runnerConflict,
    incrementOpponentScore:   incrementOpponentScore,
    addManualRun:             addManualRun,
    endHalfInning:            endHalfInning,
    undoHalfInning:           undoHalfInning,
    endGame:                  endGame,
    recordOppPitch:           recordOppPitch,
    oppRunsThisHalf:          gameState.oppRunsThisHalf          || 0,
    oppBalls:                 gameState.oppBalls                 || 0,
    oppStrikes:               gameState.oppStrikes               || 0,
    oppCurrentBatterNumber:   gameState.oppCurrentBatterNumber   || 1,
    oppCurrentBatterPitches:  gameState.oppCurrentBatterPitches  || 0,
    oppInningPitches:         gameState.oppInningPitches         || 0,
    oppGamePitches:           gameState.oppGamePitches           || 0,
    myTeamHalf:               myTeamHalf,
    rules:                    rules,
    pitchUIConfig:            pitchUIConfig,
    ruleWarnings:             ruleWarnings,
    claimError:               claimError,
  };
}
