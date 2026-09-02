/**
 * CompactTeamCard — the collapsed row for every team except the one
 * expanded team in the Team Hub (Story #1028, section 12.1). Tapping it
 * expands that team, per the exactly-one-expanded model owned by TeamHub.
 */
import { ListRow } from '../../components/ui/ListRow';
import { Stack } from '../../components/ui/Stack';
import { Text } from '../../components/ui/Text';
import { truncateTeamName } from '../../utils/formatters';
import { tokens } from '../../theme/tokens';

function formatNextEventSummary(nextEvent) {
  if (!nextEvent) return 'No upcoming event';
  var when = new Date(nextEvent.startsAt);
  var dateStr = Number.isNaN(when.getTime())
    ? ''
    : when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (nextEvent.type === 'practice') {
    return dateStr ? `Practice · ${dateStr}` : 'Practice';
  }
  var opponent = nextEvent.opponent ? `vs ${nextEvent.opponent}` : 'Game';
  return dateStr ? `${opponent} · ${dateStr}` : opponent;
}

export function CompactTeamCard({ team, onExpand }) {
  return (
    <ListRow
      showDivider={false}
      onClick={function () { if (onExpand) onExpand(team.id); }}
      aria-label={`Expand ${team.displayName}`}
      style={{ borderRadius: tokens.radius.md, border: `1px solid ${tokens.color.border.default}` }}
    >
      <Stack direction="row" justify="between" align="center" gap="sm" style={{ width: '100%' }}>
        <Stack direction="col" gap="xs">
          <Text size="body" weight="semibold" family="serif">
            {truncateTeamName(team.displayName, 20)}
          </Text>
          <Text size="xs" color="secondary">
            {team.season} {team.year} · {team.ageGroup} · {team.role.label}
          </Text>
        </Stack>
        <Text size="xs" color="tertiary">{formatNextEventSummary(team.nextEvent)}</Text>
      </Stack>
    </ListRow>
  );
}
