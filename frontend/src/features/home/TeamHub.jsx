/**
 * TeamHub — the Team Hub model (Story #1028, section 12.1): exactly one
 * team is expanded at a time; every other team renders compact. "All
 * teams" is a view filter (shows every team compact, none expanded) —
 * it never changes which team is considered expanded, so returning to
 * the focused view restores the same team.
 *
 * Purely presentational/controlled: expandedTeamId and viewFilter are
 * owned by the caller (useHomeScreen). This component only computes the
 * deterministic fallback when expandedTeamId doesn't match any team in
 * the current list (e.g. a stale id after a refetch) — falling back to
 * the first team rather than rendering nothing.
 */
import { Stack } from '../../components/ui/Stack';
import { Pill } from '../../components/ui/Pill';
import { CompactTeamCard } from './CompactTeamCard';
import { ExpandedTeamCard } from './ExpandedTeamCard';

export function TeamHub({ teams, expandedTeamId, viewFilter = 'single', onExpand, onViewFilterChange, onSelectAction }) {
  if (!teams || teams.length === 0) return null;

  var resolvedExpandedId = expandedTeamId && teams.some(function (t) { return t.id === expandedTeamId; })
    ? expandedTeamId
    : teams[0].id;

  var showExpanded = viewFilter !== 'all';

  return (
    <Stack direction="col" gap="md">
      {teams.length > 1 && (
        <Stack direction="row" gap="xs">
          <Pill
            active={viewFilter !== 'all'}
            aria-pressed={viewFilter !== 'all'}
            onClick={function () { if (onViewFilterChange) onViewFilterChange('single'); }}
          >
            Focused
          </Pill>
          <Pill
            active={viewFilter === 'all'}
            aria-pressed={viewFilter === 'all'}
            onClick={function () { if (onViewFilterChange) onViewFilterChange('all'); }}
          >
            All teams
          </Pill>
        </Stack>
      )}

      <Stack direction="col" gap="sm">
        {teams.map(function (team) {
          var isExpanded = showExpanded && team.id === resolvedExpandedId;
          return isExpanded
            ? <ExpandedTeamCard key={team.id} team={team} onSelectAction={onSelectAction} />
            : <CompactTeamCard key={team.id} team={team} onExpand={onExpand} />;
        })}
      </Stack>
    </Stack>
  );
}
