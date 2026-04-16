import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

function makeDefaultState() {
  return {
    myScore:       0,
    opponentScore: 0,
    inning:        1,
    halfInning:    'top',
    outs:          0,
    balls:         0,
    strikes:       0,
    runners:       [],
    currentBatter: null,
    isLive:        false,
    scorerName:    null,
    lastUpdated:   null,
  };
}

function isHeartbeatFresh(lastHeartbeat) {
  if (!lastHeartbeat) return false;
  return Date.now() - new Date(lastHeartbeat).getTime() < 60000;
}

function rowToGameState(row) {
  return {
    myScore:       row.my_score       || 0,
    opponentScore: row.opponent_score || 0,
    inning:        row.inning         || 1,
    halfInning:    row.half_inning    || 'top',
    outs:          row.outs           || 0,
    balls:         row.balls          || 0,
    strikes:       row.strikes        || 0,
    runners:       row.runners        || [],
    currentBatter: row.current_batter || null,
    lastUpdated:   row.updated_at     || null,
  };
}

export function useLiveScore(params) {
  var gameId    = params.gameId;
  var teamId    = params.teamId;
  var isEnabled = params.isEnabled;

  // ── State — unconditional (Rules of Hooks) ────────────────────────────────
  var _state = useState(makeDefaultState);
  var state = _state[0]; var setState = _state[1];

  // ── Ref for channel cleanup ───────────────────────────────────────────────
  var chanRef = useRef(null);

  // ── Mount: hydrate + subscribe ────────────────────────────────────────────
  useEffect(function() {
    if (!isEnabled || !supabase || !gameId || !teamId) return;

    // Hydrate live game state
    supabase
      .from('live_game_state')
      .select('*')
      .eq('game_id', gameId)
      .eq('team_id', String(teamId))
      .single()
      .then(function(r) {
        if (r.data) {
          setState(function(prev) {
            return Object.assign({}, prev, rowToGameState(r.data));
          });
        }
      });

    // Hydrate scorer session — sets scorerName and isLive
    supabase
      .from('game_scoring_sessions')
      .select('scorer_name, last_heartbeat')
      .eq('game_id', gameId)
      .eq('team_id', String(teamId))
      .single()
      .then(function(r) {
        if (r.data) {
          setState(function(prev) {
            return Object.assign({}, prev, {
              scorerName: r.data.scorer_name || null,
              isLive:     isHeartbeatFresh(r.data.last_heartbeat),
            });
          });
        }
      });

    // Realtime subscriptions — read-only, no writes
    var channel = supabase
      .channel('live_score:' + gameId + ':' + String(teamId))
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
          // Verify team — Realtime v2 filter supports only one column
          if (String(row.team_id) !== String(teamId)) return;
          setState(function(prev) {
            return Object.assign({}, prev, rowToGameState(row));
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
          // DELETE fires when releaseScorerLock removes the row — scorer left
          if (payload.eventType === 'DELETE') {
            setState(function(prev) {
              return Object.assign({}, prev, { scorerName: null, isLive: false });
            });
            return;
          }
          if (!payload.new) return;
          var row = payload.new;
          if (String(row.team_id) !== String(teamId)) return;
          setState(function(prev) {
            return Object.assign({}, prev, {
              scorerName: row.scorer_name || null,
              isLive:     isHeartbeatFresh(row.last_heartbeat),
            });
          });
        }
      )
      .subscribe();

    chanRef.current = channel;

    return function() {
      if (chanRef.current) {
        supabase.removeChannel(chanRef.current);
        chanRef.current = null;
      }
    };
  }, [isEnabled, gameId, teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Return default when disabled (hooks already called above) ─────────────
  if (!isEnabled) {
    return makeDefaultState();
  }

  return state;
}
