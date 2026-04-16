import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
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
  };
}

// Re-derive balls/strikes from pitch history (used by undoLastPitch).
function countFromPitches(pitches) {
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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLiveScoring(params) {
  var gameId       = params.gameId;
  var teamId       = params.teamId;
  var userId       = params.userId;
  var userName     = params.userName;
  var isEnabled    = params.isEnabled;
  var battingOrder = params.battingOrder || [];
  var team         = params.team || null;

  // AUTH TESTING SHIM — remove when auth goes live (Phase 4C)
  // When auth gate is commented out, userId/userName are null.
  // Use hardcoded admin identity so scorer lock writes succeed.
  var _effectiveUserId   = userId   || 'admin-coach-mud-hens';
  var _effectiveUserName = userName || 'Coach (Admin)';

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

  var _warn = useState([]);
  var ruleWarnings = _warn[0]; var setRuleWarnings = _warn[1];

  // ── Refs (safe in interval / async callbacks) ─────────────────────────────
  var gsRef       = useRef(makeDefaultGs());
  var atBatRef    = useRef(null);
  var isScorerRef = useRef(false);
  var hbRef       = useRef(null);   // heartbeat interval id
  var chanRef     = useRef(null);   // realtime channel

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
    if (!supabase || !gameId || !teamId) return;
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
          updated_at:          new Date().toISOString(),
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
  }

  function audit(action, payload) {
    if (!supabase || !gameId || !teamId) return;
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
    if (!isEnabled || !supabase || !gameId || !teamId) return;

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
          });
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
  }, [isEnabled, gameId, teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public functions ───────────────────────────────────────────────────────

  function claimScorerLock() {
    if (!isEnabled || !supabase || !gameId || !teamId) return;
    supabase
      .from('game_scoring_sessions')
      .upsert(
        {
          game_id:        gameId,
          team_id:        String(teamId),
          scorer_user_id: userId   || null,
          scorer_name:    userName || null,
          last_heartbeat: new Date().toISOString(),
        },
        { onConflict: 'game_id,team_id' }
      )
      .then(function(r) {
        if (r.error) {
          if (isRlsError(r.error)) { setScorerLockExpired(true); }
          return;
        }
        setScorer(true);
        setScorerName(_effectiveUserName);
        setScorerLockExpired(false);
        startHeartbeat();
        audit('lock_claimed');
      });
  }

  function releaseScorerLock() {
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
        runsScored = runners.length + 1; // all runners + batter
        newRunners = [];

      } else if (outcomeType === OUTCOME.TRIPLE) {
        var t = advanceAll(runners, 3);
        runsScored = t.runsScored;
        newRunners = t.remaining;
        if (batter) { newRunners.push({ runnerId: batter.id, base: 3 }); }

      } else if (outcomeType === OUTCOME.DOUBLE) {
        var d = advanceAll(runners, 2);
        runsScored = d.runsScored;
        newRunners = d.remaining;
        if (batter) { newRunners.push({ runnerId: batter.id, base: 2 }); }

      } else if (outcomeType === OUTCOME.SINGLE) {
        // Runner on 3rd: manual confirm. Runners on 1st/2nd: auto +1.
        var autoed  = [];
        var pending = [];
        for (var i = 0; i < runners.length; i++) {
          var r = runners[i];
          if (r.base === 3) {
            pending.push(r);
          } else {
            autoed.push({ runnerId: r.runnerId, base: r.base + 1 });
          }
        }
        if (batter) { autoed.push({ runnerId: batter.id, base: 1 }); }
        newRunners = autoed;
        if (pending.length > 0) {
          setPendingAdvancement({ runners: pending, baseReached: 1 });
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

    var nextIndex  = gs.battingOrderIndex + 1;
    var newMyScore = gs.myScore + runsScored;
    var newGs;

    if (newOuts >= 3) {
      // Half-inning over — flip half, advance inning if needed, clear field
      var nextHalf   = gs.halfInning === 'top' ? 'bottom' : 'top';
      var nextInning = gs.halfInning === 'bottom' ? gs.inning + 1 : gs.inning;
      newGs = Object.assign({}, gs, {
        inning:            nextInning,
        halfInning:        nextHalf,
        outs:              0,
        balls:             0,
        strikes:           0,
        runners:           [],
        myScore:           newMyScore,
        currentBatter:     null,
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
    } else if (toBase) {
      newRunners = newRunners.map(function(r) {
        return r.runnerId === runnerId
          ? { runnerId: r.runnerId, base: toBase }
          : r;
      });
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

  // ── Derived state ─────────────────────────────────────────────────────────
  var suggestedBatter = null;
  if (isEnabled && gameState.currentBatter === null && battingOrder.length > 0) {
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
      suggestedBatter:          null,
      pendingAdvancement:       null,
      claimScorerLock:          function() {},
      releaseScorerLock:        function() {},
      startAtBat:               function() {},
      recordPitch:              function() {},
      resolveAtBat:             function() {},
      undoLastPitch:            function() {},
      confirmRunnerAdvancement: function() {},
      incrementOpponentScore:   function() {},
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
    claimScorerLock:          claimScorerLock,
    releaseScorerLock:        releaseScorerLock,
    startAtBat:               startAtBat,
    recordPitch:              recordPitch,
    resolveAtBat:             resolveAtBat,
    undoLastPitch:            undoLastPitch,
    confirmRunnerAdvancement: confirmRunnerAdvancement,
    incrementOpponentScore:   incrementOpponentScore,
    rules:                    rules,
    pitchUIConfig:            pitchUIConfig,
    ruleWarnings:             ruleWarnings,
  };
}
