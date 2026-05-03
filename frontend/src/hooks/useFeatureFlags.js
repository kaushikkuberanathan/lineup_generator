import { useState, useEffect } from 'react';
import { supabase, isSupabaseEnabled } from '../supabase.js';
import { FEATURE_FLAGS as staticFlags } from '@/config/featureFlags';

export async function fetchRuntimeFlags() {
  if (!isSupabaseEnabled) { return staticFlags; }
  try {
    var result = await supabase
      .from('feature_flags')
      .select('flag_name, enabled')
      .is('team_id', null);
    if (result.error) { return staticFlags; }
    var dbFlags = {};
    (result.data || []).forEach(function(row) {
      dbFlags[row.flag_name.toUpperCase()] = row.enabled;
    });
    return Object.assign({}, staticFlags, dbFlags);
  } catch (e) {
    return staticFlags;
  }
}

// Fetch team-scoped flag overrides for a specific team.
// Returns object keyed by uppercase flag name.
// Not yet called anywhere — stub for future per-team flag support.
export async function fetchTeamFlags(teamId) {
  if (!isSupabaseEnabled) { return {}; }
  try {
    var result = await supabase
      .from('feature_flags')
      .select('flag_name, enabled')
      .eq('team_id', teamId);
    if (result.error) { return {}; }
    var teamFlags = {};
    (result.data || []).forEach(function(row) {
      teamFlags[row.flag_name.toUpperCase()] = row.enabled;
    });
    return teamFlags;
  } catch (e) {
    return {};
  }
}

export function useFeatureFlags() {
  var _flags = useState(staticFlags);
  var flags = _flags[0]; var setFlags = _flags[1];
  var _loading = useState(true);
  var loading = _loading[0]; var setLoading = _loading[1];

  useEffect(function() {
    fetchRuntimeFlags().then(function(merged) {
      setFlags(merged);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only no-varying-deps: useFeatureFlags takes no args; setFlags/setLoading are stable setters, not re-fetch triggers.
  }, []);

  return { flags: flags, loading: loading };
}
