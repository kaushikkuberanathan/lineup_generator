/**
 * TeamSearch
 * Home tab -> "Don't see your team? Search for one" discovery flow (Story 124, #655).
 * Searches GET /api/v1/teams/search (public, unauthenticated) by name/age
 * group/sport. Result tap hands the selected team to the caller, which is
 * expected to route into RequestAccessScreen with that team pre-selected.
 *
 * Debounced client-side (400ms) — no server-side rate-limit awareness here;
 * the backend's own limiter (see Contracts in CLAUDE_HANDOFF_2026-08-08.md)
 * is the enforcement point.
 *
 * Props:
 *   isOnline     {boolean}   parent-provided navigator.onLine state (App.jsx
 *                            already tracks this for OfflineIndicator — reuse
 *                            rather than re-deriving here)
 *   onSelectTeam {function}  (team) => void — called on result tap
 *   onBack       {function}  optional — renders a "Back" action if provided
 */
import { useState, useEffect, useRef } from 'react';
import { Stack } from '../ui/Stack';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { ListRow } from '../ui/ListRow';
import { tokens } from '../../theme/tokens';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://lineup-generator-backend.onrender.com';
const AGE_GROUPS = ['5U', '6U', '7U', '8U', '9U', '10U', '11U', '12U'];
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 400;

function hasActiveFilter(query, ageGroup, sport) {
  return query.trim().length >= MIN_QUERY_LENGTH || !!ageGroup || !!sport;
}

export function TeamSearch({ isOnline, onSelectTeam, onBack }) {
  const [query, setQuery]       = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [sport, setSport]       = useState('');
  const [status, setStatus]     = useState('idle'); // idle | loading | error | success
  const [results, setResults]   = useState([]);
  const [retryTick, setRetryTick] = useState(0);

  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); }

    if (!hasActiveFilter(query, ageGroup, sport)) {
      setStatus('idle');
      setResults([]);
      return;
    }

    if (!isOnline) {
      setStatus('error');
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      var thisRequestId = ++requestIdRef.current;
      setStatus('loading');

      var params = new URLSearchParams();
      if (query.trim().length >= MIN_QUERY_LENGTH) { params.set('q', query.trim()); }
      if (ageGroup) { params.set('ageGroup', ageGroup); }
      if (sport) { params.set('sport', sport); }

      fetch(`${BACKEND_URL}/api/v1/teams/search?${params.toString()}`)
        .then(function (res) {
          if (!res.ok) { throw new Error('search_failed'); }
          return res.json();
        })
        .then(function (data) {
          if (thisRequestId !== requestIdRef.current) { return; } // stale response
          setResults(Array.isArray(data) ? data : []);
          setStatus('success');
        })
        .catch(function () {
          if (thisRequestId !== requestIdRef.current) { return; }
          setStatus('error');
          setResults([]);
        });
    }, DEBOUNCE_MS);

    return function () {
      if (debounceRef.current) { clearTimeout(debounceRef.current); }
    };
  }, [query, ageGroup, sport, isOnline, retryTick]);

  return (
    <Stack direction="col" gap="md">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: tokens.color.brand.navy, fontSize: '14px', cursor: 'pointer', padding: '4px 0', textAlign: 'left', alignSelf: 'flex-start' }}
        >
          ← Back
        </button>
      )}

      <Text as="h2" size="mdLg" weight="bold" family="serif" color="body">Find a team</Text>
      <Text size="sm" color="secondary">
        Search by name, age group, or sport to find a team and request access.
      </Text>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Team name…"
        aria-label="Team name"
        style={{ width: '100%', boxSizing: 'border-box', background: '#f8fafc', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '11px 13px', fontFamily: 'inherit', fontSize: '15px', outline: 'none' }}
      />

      <Stack direction="row" gap="sm">
        <select
          value={ageGroup}
          onChange={(e) => setAgeGroup(e.target.value)}
          aria-label="Age group"
          style={{ flex: 1, background: '#fff', border: '1.5px solid #d1d5db', borderRadius: '8px', padding: '9px 10px', fontFamily: 'inherit', fontSize: '14px', color: ageGroup ? '#111827' : '#6b7280', outline: 'none', cursor: 'pointer' }}
        >
          <option value="">Any age</option>
          {AGE_GROUPS.map((ag) => <option key={ag} value={ag}>{ag}</option>)}
        </select>
        <select
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          aria-label="Sport"
          style={{ flex: 1, background: '#fff', border: '1.5px solid #d1d5db', borderRadius: '8px', padding: '9px 10px', fontFamily: 'inherit', fontSize: '14px', color: sport ? '#111827' : '#6b7280', outline: 'none', cursor: 'pointer' }}
        >
          <option value="">Any sport</option>
          <option value="baseball">Baseball</option>
          <option value="softball">Softball</option>
        </select>
      </Stack>

      {status === 'idle' && (
        <Text size="sm" color="disabled" style={{ textAlign: 'center', padding: '12px 0' }}>
          Enter a team name, or pick an age group / sport, to search.
        </Text>
      )}

      {status === 'loading' && (
        <Text size="sm" color="disabled" style={{ textAlign: 'center', padding: '20px 0' }}>
          Searching…
        </Text>
      )}

      {status === 'error' && !isOnline && (
        <Stack direction="col" align="center" gap="sm" style={{ textAlign: 'center', padding: '24px 16px' }}>
          <Text size="sm" color="secondary">You're offline — team search needs a connection.</Text>
          <Text size="xs" color="disabled">Reconnect and try again.</Text>
        </Stack>
      )}

      {status === 'error' && isOnline && (
        <Stack direction="col" align="center" gap="sm" style={{ textAlign: 'center', padding: '24px 16px' }}>
          <Text size="sm" color="secondary">Something went wrong searching for teams.</Text>
          <Button variant="secondary" size="sm" onClick={() => setRetryTick((t) => t + 1)}>
            Try again
          </Button>
        </Stack>
      )}

      {status === 'success' && results.length === 0 && (
        <Stack direction="col" align="center" gap="sm" style={{ textAlign: 'center', padding: '24px 16px' }}>
          <Text weight="bold" family="serif" size="mdLg" color="body">No teams found</Text>
          <Text size="sm" color="disabled">
            Double-check the spelling, or ask your head coach for the exact team name.
          </Text>
        </Stack>
      )}

      {status === 'success' && results.length > 0 && (
        <Stack direction="col" gap="xs">
          {results.map((team, i) => (
            <ListRow
              key={team.id}
              showDivider={i < results.length - 1}
              onClick={() => onSelectTeam(team)}
            >
              <Stack direction="col" gap="xs" style={{ width: '100%' }}>
                <Text weight="bold" family="serif" size="body" color="body">{team.name}</Text>
                <Text size="xs" color="disabled">
                  {[team.age_group, team.sport, team.year].filter(Boolean).join(' · ')}
                </Text>
              </Stack>
            </ListRow>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
