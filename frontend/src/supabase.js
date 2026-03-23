// frontend/src/supabase.js
// Supabase client — single instance used throughout the app

import { createClient } from '@supabase/supabase-js';

var supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  || '';
var supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export var supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export var isSupabaseEnabled = !!(supabaseUrl && supabaseKey);

// ── Team operations ────────────────────────────────────────────────────────

export function dbSaveTeams(teams) {
  if (!supabase) { return Promise.resolve(); }
  // Upsert all teams — no-op if already exists with same data
  return supabase.from('teams').upsert(
    teams.map(function(t) {
      return {
        id:         t.id,
        name:       t.name,
        age_group:  t.ageGroup || '',
        year:       t.year || new Date().getFullYear(),
        sport:      t.sport || 'baseball'
      };
    }),
    { onConflict: 'id' }
  ).then(function(r) {
    if (r.error) { console.warn('[DB] saveTeams error:', r.error.message); }
  });
}

export function dbDeleteTeam(teamId) {
  if (!supabase) { return Promise.resolve(); }
  return supabase.from('teams').delete().eq('id', teamId)
    .then(function(r) {
      if (r.error) { console.warn('[DB] deleteTeam error:', r.error.message); }
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
  return supabase.from('team_data').upsert({
    team_id:       teamId,
    roster:        data.roster        || [],
    schedule:      data.schedule      || [],
    practices:     data.practices     || [],
    batting_order: data.battingOrder  || [],
    grid:          data.grid          || {},
    innings:       data.innings       || 6,
    locked:        data.locked        || false
  }, { onConflict: 'team_id' })
  .then(function(r) {
    if (r.error) { console.warn('[DB] saveTeamData error:', r.error.message); }
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
        locked:       row.locked        || false
      };
    });
}
