import { PageHeader } from '../../components/compositions/Headers';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { Stack } from '../../components/ui/Stack';
import { StatusPill } from '../../components/ui/StatusPill';
import { Text } from '../../components/ui/Text';
import { tokens } from '../../theme/tokens';

function gameDetail(game) {
  if (!game) return '';
  const date = game.date ? new Date(`${game.date}T12:00:00`).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) : 'Date TBD';
  return [date, game.time, game.location].filter(Boolean).join(' · ');
}

export function GameDayEntryScreen({ nextGame, rosterCount = 0, availableCount = 0, lineupStatus = 'draft', onStartGameMode }) {
  const lineupReady = lineupStatus === 'ready' || lineupStatus === 'locked';
  const canStart = Boolean(nextGame && availableCount >= 9 && lineupReady);
  const actionLabel = !nextGame ? 'Add a game to continue' : !lineupReady || availableCount < 9 ? 'Finish lineup setup' : lineupStatus === 'locked' ? 'Open Game Mode' : 'Start Game Mode';
  const lineupLabel = lineupStatus === 'locked' ? 'Lineup locked' : lineupReady ? 'Lineup ready' : 'Lineup draft';

  return (
    <Stack gap="md" style={{ marginBottom:tokens.space.lg }}>
      <PageHeader title="Game Day" subtitle="Get the team ready, then head to the dugout" />
      <Card border shadow radius="lg" padding="lg" aria-label="Game Day readiness">
        <Stack gap="md">
          <Stack direction="row" justify="between" align="center" gap="sm" wrap>
            <Text variant="label" uppercase>{nextGame ? 'Next game' : 'Game setup'}</Text>
            {nextGame && typeof nextGame.home === 'boolean' ? <StatusPill status={nextGame.home ? 'home' : 'away'}>{nextGame.home ? 'Home' : 'Away'}</StatusPill> : null}
          </Stack>
          <div>
            <Text as="h2" variant="cardTitle" style={{ margin:0 }}>{nextGame ? `vs. ${nextGame.opponent || 'Opponent'}` : 'No upcoming game'}</Text>
            <Text as="p" variant="body" color="secondary" style={{ margin:0 }}>{nextGame ? gameDetail(nextGame) : 'Add a game in Schedule before entering Game Mode.'}</Text>
          </div>
          <div role="status" style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:tokens.space.sm, padding:tokens.space.sm, borderRadius:tokens.radius.lg, background:canStart ? tokens.color.status.successBg : tokens.color.status.warningBg }}>
            <Icon name={canStart ? 'success' : 'attention'} size="sm" />
            <Text variant="caption">{availableCount}/{rosterCount} available</Text>
            <StatusPill status={lineupReady ? 'ready' : 'attention'}>{lineupLabel}</StatusPill>
          </div>
          <Button typography="contemporary" leadingIcon="gameDay" fullWidth disabled={!canStart} onClick={onStartGameMode}>{actionLabel}</Button>
        </Stack>
      </Card>
    </Stack>
  );
}
