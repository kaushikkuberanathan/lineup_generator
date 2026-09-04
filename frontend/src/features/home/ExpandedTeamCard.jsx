/**
 * ExpandedTeamCard — the one expanded team's full detail card in the
 * Team Hub (Story #1028, section 12.1). Everything about this team,
 * including its actions, is visually contained inside this one Card —
 * a `role="region"` boundary so assistive tech announces exactly which
 * team's content follows.
 */
import { Card } from '../../components/ui/Card';
import { Stack } from '../../components/ui/Stack';
import { Text } from '../../components/ui/Text';
import { StatusPill } from '../../components/ui/StatusPill';
import { ReadinessStrip } from '../../components/compositions/ReadinessStrip';
import { truncateTeamName } from '../../utils/formatters';
import { TeamAction } from './TeamAction';
import { describeRole } from './roleDescriptions';

function formatNextEventLine(nextEvent) {
  if (!nextEvent) return 'No upcoming event';
  var when = new Date(nextEvent.startsAt);
  var hasValidDate = !Number.isNaN(when.getTime());
  var dateStr = hasValidDate ? when.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : '';
  var timeStr = hasValidDate ? when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';
  var kind = nextEvent.type === 'practice' ? 'Practice' : (nextEvent.opponent ? `vs ${nextEvent.opponent}` : 'Game');
  var homeAway = nextEvent.homeAway ? ` (${nextEvent.homeAway})` : '';
  var when2 = [dateStr, timeStr].filter(Boolean).join(' ');
  return when2 ? `${kind}${homeAway} — ${when2}` : `${kind}${homeAway}`;
}

export function ExpandedTeamCard({ team, onSelectAction }) {
  var roleExplanation = describeRole(team.role && team.role.code);
  var primaryAction = team.actions && team.actions.find(function (action) { return action.enabled; });

  return (
    <Card padding="md" shadow role="region" aria-label={`${team.displayName} details`}>
      <Stack direction="col" gap="sm">
        <Stack direction="row" justify="between" align="center">
          <Text as="h3" variant="cardTitle" style={{ margin: 0 }}>
            {truncateTeamName(team.displayName, 24)}
          </Text>
          <StatusPill status="neutral">{team.role.label}</StatusPill>
        </Stack>

        <Text size="sm" color="secondary">
          {team.season} {team.year} · {team.ageGroup}
        </Text>

        <Text size="sm" color="body">{formatNextEventLine(team.nextEvent)}</Text>

        {roleExplanation && (
          <Text size="xs" color="tertiary">{roleExplanation}</Text>
        )}

        {team.readiness ? <ReadinessStrip confirmedCount={team.readiness.confirmedCount} rosterCount={team.readiness.rosterCount} lineupStatus={team.readiness.lineupStatus} /> : null}

        {team.actions && team.actions.length > 0 && (
          <Stack direction="col" gap="xs">
            {team.actions.map(function (action) {
              return <TeamAction key={action.id} action={action} primary={primaryAction && action.id === primaryAction.id} onSelect={onSelectAction} />;
            })}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
