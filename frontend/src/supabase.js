// frontend/src/supabase.js
// Supabase client — single instance used throughout the app

import { createClient } from '@supabase/supabase-js';

var supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  || '';
var supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
var BACKEND_URL  = import.meta.env.VITE_BACKEND_URL || 'https://lineup-generator-backend.onrender.com';

export var supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export var isSupabaseEnabled = !!(supabaseUrl && supabaseKey);

// ── Team operations ────────────────────────────────────────────────────────

export function dbSaveTeams(teams) {
  if (!supabase) { return Promise.resolve(); }
  // Insert first, fall back to UPDATE only on a real conflict (23505).
  // NOT upsert(onConflict) — Postgres enforces the UPDATE policy's WITH
  // CHECK for INSERT ... ON CONFLICT DO UPDATE even when no conflict
  // occurs (documented Postgres RLS behavior, confirmed empirically
  // against a real project while investigating #561). teams_auth_update
  // requires an existing active admin/coach team_memberships row — a
  // brand-new team never has one yet, so that upsert was unconditionally
  // RLS-denied for every new team, not just the "second team" case #561
  // was filed against. A plain INSERT for the new-team case never invokes
  // the UPDATE policy at all; only a genuine pre-existing row falls back
  // to an explicit UPDATE, which still correctly requires real membership.
  return Promise.all(teams.map(function(t) {
    var row = {
      id:         t.id,
      name:       t.name,
      age_group:  t.ageGroup || '',
      year:       t.year || new Date().getFullYear(),
      sport:      t.sport || 'baseball'
    };
    return supabase.from('teams').insert(row).then(function(r) {
      if (r.error && r.error.code === '23505') {
        return supabase.from('teams').update(row).eq('id', t.id);
      }
      return r;
    });
  })).then(function(results) {
    var failed = results.find(function(r) { return r.error; });
    if (failed) {
      console.warn('[DB] saveTeams error:', failed.error);
      var err = new Error(failed.error.message || 'write failed');
      err.code = failed.error.code;
      err.operation = 'dbSaveTeams';
      throw err;
    }
    return results;
  });
}

export function dbDeleteTeam(teamId) {
  if (!supabase) { return Promise.resolve(); }
  // Routed through the backend's service_role DELETE route (#380) — not a
  // direct Supabase write. Session is read internally via supabase.auth
  // .getSession() so this function's signature/call sites stay unchanged.
  return supabase.auth.getSession().then(function(sessionResult) {
    var session = sessionResult.data && sessionResult.data.session;
    if (!session) {
      var authErr = new Error('Not signed in');
      authErr.code = 'NO_SESSION';
      authErr.operation = 'dbDeleteTeam';
      throw authErr;
    }
    return fetch(BACKEND_URL + '/api/v1/teams/' + teamId, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + session.access_token }
    }).then(function(res) {
      return res.json().catch(function() { return {}; }).then(function(body) {
        if (!res.ok) {
          console.warn('[DB] deleteTeam error:', body);
          var err = new Error(body.message || body.error || 'write failed');
          err.code = body.error || String(res.status);
          err.operation = 'dbDeleteTeam';
          throw err;
        }
        return body;
      });
    });
  });
}

export function dbLoadTeams() {
  if (!supabase) { return Promise.resolve(null); }
  return supabase.from('teams').select('*').order('created_at', { ascending: true })
    .then(function(r) {
      if (r.error) { console.warn('[DB] loadTeams error:', r.error.message); return null; }
      return (r.data || []).map(function(row) {
        return { id: row.id, name: row.name, ageGroup: row.age_group, year: row.year, sport: row.sport };
      });
    });
}

// ── Team data operations ───────────────────────────────────────────────────

export function dbSaveTeamData(teamId, data) {
  if (!supabase || !teamId) { return Promise.resolve(); }
  var upsertObj = {
    team_id:       teamId,
    roster:        data.roster        || [],
    schedule:      data.schedule      || [],
    practices:     data.practices     || [],
    batting_order: data.battingOrder  || [],
    grid:          data.grid          || {},
    innings:       data.innings       || 6,
    locked:        data.locked        || false
  };
  if (data.coachPin !== undefined) { upsertObj.coach_pin = data.coachPin; }
  if (data.attendanceOverrides !== undefined) { upsertObj.attendance_overrides = data.attendanceOverrides; }
  return supabase.from('team_data').upsert(upsertObj, { onConflict: 'team_id' })
  .then(function(r) {
    if (r.error) {
      console.warn('[DB] saveTeamData error:', r.error);
      var err = new Error(r.error.message || 'write failed');
      err.code = r.error.code;
      err.operation = 'dbSaveTeamData';
      throw err;
    }
    return r;
  });
}

export function dbLoadTeamData(teamId) {
  if (!supabase || !teamId) { return Promise.resolve(null); }
  return supabase.from('team_data').select('*').eq('team_id', teamId).single()
    .then(function(r) {
      if (r.error) {
        // PGRST116 = no rows found — not an error, just no data yet
        if (r.error.code !== 'PGRST116') {
          console.warn('[DB] loadTeamData error:', r.error.message);
        }
        return null;
      }
      var row = r.data;
      return {
        roster:       row.roster        || [],
        schedule:     row.schedule      || [],
        practices:    row.practices     || [],
        battingOrder: row.batting_order || [],
        grid:         row.grid          || {},
        innings:      row.innings       || 6,
        locked:       row.locked        || false,
        coachPin:             row.coach_pin             || '',
        attendanceOverrides:  row.attendance_overrides  || {}
      };
    });
}

// ── Roster snapshot operations ─────────────────────────────────────────────

export async function dbSnapshotRoster(teamId, teamName, roster, triggerEvent) {
  if (!supabase) return;
  try {
    if (!roster || roster.length === 0) return;
    await supabase
      .from('roster_snapshots')
      .insert({
        team_id: teamId,
        team_name: teamName || '',
        roster: roster,
        trigger_event: triggerEvent || 'auto_save'
      });
  } catch (e) {
    // silent fail — snapshot is safety net, not critical path
  }
}

export async function dbGetRosterSnapshots(teamId) {
  if (!supabase) return [];
  try {
    var res = await supabase
      .from('roster_snapshots')
      .select('*')
      .eq('team_id', teamId)
      .order('snapshot_at', { ascending: false })
      .limit(5);
    return res.data || [];
  } catch(e) { return []; }
}

// ── Share link operations ──────────────────────────────────────────────────

export function dbSaveShareLink(id, payload) {
  if (!supabase) { return Promise.resolve(); }
  return supabase.from('share_links').insert({ id: id, payload: payload })
    .then(function(r) {
      if (r.error) {
        console.warn('[DB] saveShareLink error:', r.error);
        var err = new Error(r.error.message || 'write failed');
        err.code = r.error.code;
        err.operation = 'dbSaveShareLink';
        throw err;
      }
      return r;
    });
}

export var SHARE_LINK_FETCH_TIMEOUT_MS = 10000;

export function dbLoadShareLink(id) {
  if (!supabase) { return Promise.resolve(null); }
  var query = supabase.from('share_links').select('payload').eq('id', id).single()
    .then(function(r) {
      if (r.error) { return null; }
      return r.data ? r.data.payload : null;
    });
  var timeout = new Promise(function(resolve) {
    setTimeout(function() { resolve(null); }, SHARE_LINK_FETCH_TIMEOUT_MS);
  });
  return Promise.race([query, timeout]);
}
