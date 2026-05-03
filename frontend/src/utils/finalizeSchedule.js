import { supabase } from '../supabase';

function loadJSON(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch(e) { return fallback; }
}

function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch(_) { /* quota or blocked storage; primary persistence is Supabase */ }
}

// Writes usScore/oppScore/gameStatus/finalizedAt to the game object in
// team_data.schedule. Idempotent — re-calling on an already-final game is a no-op.
// Returns { ok: true } on success or { ok: false, error: string } on failure.
// Does NOT release the scorer lock — caller is responsible for that.
export async function finalizeSchedule({ gameId, teamId, usScore, oppScore, userId }) {
  if (!gameId || !teamId) return { ok: false, error: 'missing_params' };

  var schedKey = 'team:' + teamId + ':schedule';
  var schedule = loadJSON(schedKey, []);

  var gameIndex = -1;
  for (var i = 0; i < schedule.length; i++) {
    if (schedule[i].id === gameId) { gameIndex = i; break; }
  }
  if (gameIndex === -1) return { ok: false, error: 'not_found' };

  if (schedule[gameIndex].gameStatus === 'final') return { ok: true };

  var updatedSchedule = schedule.slice();
  updatedSchedule[gameIndex] = Object.assign({}, schedule[gameIndex], {
    usScore:     usScore,
    oppScore:    oppScore,
    gameStatus:  'final',
    finalizedAt: new Date().toISOString(),
    finalizedBy: userId || null,
  });

  saveJSON(schedKey, updatedSchedule);

  if (supabase) {
    try {
      var r = await supabase
        .from('team_data')
        .update({ schedule: updatedSchedule })
        .eq('team_id', String(teamId));
      if (r.error) {
        saveJSON('pending_sync:' + teamId + ':finalize', { gameId: gameId, ts: new Date().toISOString() });
        return { ok: false, error: 'sync_failed' };
      }
    } catch(e) {
      saveJSON('pending_sync:' + teamId + ':finalize', { gameId: gameId, ts: new Date().toISOString() });
      return { ok: false, error: 'sync_failed' };
    }
  }

  return { ok: true };
}
