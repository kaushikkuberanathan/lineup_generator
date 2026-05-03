/**
 * useFeatureFlag
 * Reads a feature flag from the Supabase `feature_flags` table.
 * Team-scoped row takes precedence over global (team_id IS NULL) row.
 * Fails closed — returns false if Supabase is unavailable or flag not found.
 *
 * Usage:
 *   var { enabled, loading } = useFeatureFlag('viewer_mode', activeTeamId);
 *
 * Table expected schema:
 *   feature_flags (flag_name text, team_id text nullable, enabled bool)
 */

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useFeatureFlag(flagName, teamId) {
  if (teamId === undefined) teamId = null;

  var _en = useState(false);
  var enabled = _en[0]; var setEnabled = _en[1];
  var _ld = useState(true);
  var loading = _ld[0]; var setLoading = _ld[1];

  useEffect(function() {
    if (!supabase) { setLoading(false); return; }

    var cancelled = false;

    supabase.from('feature_flags')
      .select('enabled, team_id')
      .eq('flag_name', flagName)
      .then(function(res) {
        if (cancelled) return;
        var data = res.data;
        var resolved = false;
        if (data && data.length > 0) {
          if (teamId) {
            // Prefer team-scoped row; fall back to global
            var teamRow   = data.find(function(r) { return String(r.team_id) === String(teamId); });
            var globalRow = data.find(function(r) { return r.team_id === null; });
            var best = teamRow || globalRow;
            resolved = best ? !!best.enabled : false;
          } else {
            var globalOnly = data.find(function(r) { return r.team_id === null; });
            resolved = globalOnly ? !!globalOnly.enabled : false;
          }
        }
        setEnabled(resolved);
        setLoading(false);
      })
      .catch(function() {
        if (!cancelled) setLoading(false);
      });

    return function() { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable-setter deps: setEnabled/setLoading are useState setters with guaranteed stable identity; flagName/teamId are the correct re-fetch triggers.
  }, [flagName, teamId]);

  return { enabled: enabled, loading: loading };
}
