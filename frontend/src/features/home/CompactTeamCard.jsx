/**
 * CompactTeamCard — the collapsed row for every team except the one
 * expanded team in the Team Hub (Story #1028, section 12.1). Tapping it
 * expands that team, per the exactly-one-expanded model owned by TeamHub.
 */
import { ActionRow } from '../../components/ui/ActionRow';
import { truncateTeamName } from '../../utils/formatters';
import { UI_CONTENT } from '../../content/uiContent';

function formatNextEventSummary(nextEvent) {
  if (!nextEvent) return UI_CONTENT.home.noUpcomingEvent;
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
    <ActionRow
      icon="team"
      onClick={function () { if (onExpand) onExpand(team.id); }}
      aria-label={`Expand ${team.displayName}`}
      label={truncateTeamName(team.displayName, 20)}
      subtitle={`${team.season} ${team.year} · ${team.ageGroup} · ${team.role.label} · ${formatNextEventSummary(team.nextEvent)}`}
    />
  );
}
