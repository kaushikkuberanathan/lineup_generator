import { PageHeader } from '../../components/compositions/Headers';
import { Button } from '../../components/ui/Button';
import { Stack } from '../../components/ui/Stack';
import { StatusPill } from '../../components/ui/StatusPill';

function displayFirstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'Player';
}

export function PlayerProfileScreen({
  enabled = true,
  playerName,
  allPlayers = false,
  playerCount = 0,
  incomplete = false,
  locked = false,
  onBack,
  children,
}) {
  if (!enabled) return children;

  return (
    <main style={{ maxWidth: allPlayers ? '980px' : '720px', margin: '0 auto' }}>
      <Stack gap="lg">
        <PageHeader
          title={allPlayers ? 'All player profiles' : displayFirstName(playerName)}
          subtitle={allPlayers ? 'Review and update every player in one place.' : 'Player profile and lineup preferences'}
          action={<Button variant="secondaryOutline" size="sm" typography="contemporary" leadingIcon="back" aria-label="Back to roster" onClick={onBack}>Roster</Button>}
        />
        <Stack direction="row" gap="sm" wrap>
          {allPlayers ? <StatusPill status="neutral">{playerCount} player{playerCount === 1 ? '' : 's'}</StatusPill> : null}
          {!allPlayers && incomplete ? <StatusPill status="attention">Needs preferences</StatusPill> : null}
          {!allPlayers && !incomplete ? <StatusPill status="success">Profile complete</StatusPill> : null}
          {locked ? <StatusPill status="neutral">View only · lineup finalized</StatusPill> : null}
        </Stack>
        {children}
      </Stack>
    </main>
  );
}
