import { supabase } from '../supabase';
import { loadJSON, removeJSON, saveJSON } from './storage';

var PENDING_PREFIX = 'pending_sync:';
var PENDING_SUFFIX = ':finalize';
var pendingTeams = {};
var retriesInFlight = {};
var recoveryInstalled = false;

function pendingKey(teamId) {
  return PENDING_PREFIX + teamId + PENDING_SUFFIX;
}

export function rememberPendingFinalization({ teamId, gameId, finalizedAt }) {
  var normalizedTeamId = String(teamId);
  var marker = {
    version: 1,
    teamId: normalizedTeamId,
    gameId: gameId,
    finalizedAt: finalizedAt,
    queuedAt: new Date().toISOString(),
  };
  pendingTeams[normalizedTeamId] = true;
  saveJSON(pendingKey(normalizedTeamId), marker);
  return marker;
}

function discoverPendingTeamIds() {
  var ids = Object.keys(pendingTeams);
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (!key || key.indexOf(PENDING_PREFIX) !== 0 || !key.endsWith(PENDING_SUFFIX)) continue;
      var teamId = key.slice(PENDING_PREFIX.length, -PENDING_SUFFIX.length);
      if (teamId && ids.indexOf(teamId) === -1) ids.push(teamId);
    }
  } catch (e) {
    // Same-session markers remain discoverable through pendingTeams when
    // localStorage is blocked (storage.js keeps their payload in memory).
  }
  return ids;
}

async function runRetry(teamId) {
  var key = pendingKey(teamId);
  var marker = loadJSON(key, null);
  if (!marker) {
    delete pendingTeams[teamId];
    return { ok: true, skipped: true };
  }

  var schedule = loadJSON('team:' + teamId + ':schedule', []);
  var game = schedule.find(function(candidate) { return candidate.id === marker.gameId; });

  // Markers written before #921 contained only gameId + ts. They can still be
  // recovered safely when the current local game is final; bind the marker to
  // that exact snapshot before attempting the first retry.
  if (game && game.gameStatus === 'final' && !marker.finalizedAt) {
    marker = Object.assign({}, marker, {
      version: 1,
      teamId: teamId,
      finalizedAt: game.finalizedAt,
      queuedAt: marker.ts || new Date().toISOString(),
    });
    saveJSON(key, marker);
  }

  // Never upload an ambiguous or superseded local snapshot. Retain the marker
  // so the mismatch is observable and can be resolved without data loss.
  if (!game || game.gameStatus !== 'final' || game.finalizedAt !== marker.finalizedAt) {
    return { ok: false, error: 'stale_pending_sync' };
  }

  if (!supabase) return { ok: false, error: 'sync_unavailable' };

  try {
    var result = await supabase
      .from('team_data')
      .update({ schedule: schedule })
      .eq('team_id', String(teamId));

    if (result.error) return { ok: false, error: 'sync_failed' };

    removeJSON(key);
    delete pendingTeams[teamId];
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'sync_failed' };
  }
}

export function retryPendingFinalization(teamId) {
  var normalizedTeamId = String(teamId);
  if (retriesInFlight[normalizedTeamId]) return retriesInFlight[normalizedTeamId];

  retriesInFlight[normalizedTeamId] = runRetry(normalizedTeamId).finally(function() {
    delete retriesInFlight[normalizedTeamId];
  });
  return retriesInFlight[normalizedTeamId];
}

export async function retryAllPendingFinalizations() {
  var teamIds = discoverPendingTeamIds();
  var results = await Promise.all(teamIds.map(function(teamId) {
    return retryPendingFinalization(teamId);
  }));
  results.forEach(function(result, index) {
    if (!result.ok) {
      console.warn('[pending-finalization] retry deferred:', teamIds[index], result.error);
    }
  });
  return results;
}

export function installPendingFinalizationRecovery() {
  if (recoveryInstalled || typeof window === 'undefined') return;
  recoveryInstalled = true;

  retryAllPendingFinalizations();
  window.addEventListener('online', retryAllPendingFinalizations);
}
