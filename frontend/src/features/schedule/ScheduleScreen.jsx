import { PageHeader, SectionHeader } from '../../components/compositions/Headers';
import { EventCard } from '../../components/compositions/WorkflowRows';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Stack } from '../../components/ui/Stack';
import { StatusPill } from '../../components/ui/StatusPill';
import { Text } from '../../components/ui/Text';
import { tokens } from '../../theme/tokens';

function eventDetail(event) {
  if (!event) return '';
  const date = event.date ? new Date(`${event.date}T12:00:00`).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : 'Date TBD';
  return [date, event.time, event.location].filter(Boolean).join(' · ');
}

export function ScheduleScreen({ nextGame, onOpenGameDay, scheduleContent, practices = [], snackContent }) {
  return (
    <main style={{ padding:`${tokens.space.lg} ${tokens.space.md} 80px`, maxWidth:'760px', margin:'0 auto' }}>
      <Stack gap="lg">
        <PageHeader title="Schedule" subtitle="Games, practices, and team assignments" />
        {nextGame ? (
          <Card border shadow radius="lg" padding="lg" aria-label="Next game summary">
            <Stack gap="md">
              <Stack direction="row" justify="between" align="center" gap="sm" wrap>
                <Text variant="label" uppercase>Next game</Text>
                <StatusPill status={nextGame.home ? 'home' : 'away'}>{nextGame.home ? 'Home' : 'Away'}</StatusPill>
              </Stack>
              <div><Text as="h2" variant="cardTitle" style={{ margin:0 }}>{nextGame.opponent ? `vs. ${nextGame.opponent}` : 'Upcoming game'}</Text><Text as="p" variant="body" color="secondary" style={{ margin:0 }}>{eventDetail(nextGame)}</Text></div>
              <Button typography="contemporary" leadingIcon="gameDay" fullWidth onClick={onOpenGameDay}>Open Game Day</Button>
            </Stack>
          </Card>
        ) : <Card border padding="lg"><Text as="h2" variant="cardTitle" style={{ margin:0 }}>No upcoming game</Text><Text as="p" variant="body" color="secondary" style={{ margin:0 }}>Add a game when the schedule is ready.</Text></Card>}
        {scheduleContent}
        <Stack gap="md">
          <SectionHeader title="Practices" action={<StatusPill status="neutral">{practices.length} scheduled</StatusPill>} />
          {practices.length ? practices.map(function(practice, index) { return <EventCard key={practice.id || practice.date || index} title={practice.title || practice.name || 'Team Practice'} detail={eventDetail(practice)} />; }) : <Text as="p" variant="body" color="secondary" style={{ margin:0 }}>No practices scheduled.</Text>}
        </Stack>
        {snackContent}
      </Stack>
    </main>
  );
}
