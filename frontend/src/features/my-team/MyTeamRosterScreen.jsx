import { useState } from 'react';
import { PageHeader, SectionHeader } from '../../components/compositions/Headers';
import { PlayerRow } from '../../components/compositions/WorkflowRows';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SearchField } from '../../components/ui/SearchField';
import { Stack } from '../../components/ui/Stack';
import { StatusPill } from '../../components/ui/StatusPill';
import { Text } from '../../components/ui/Text';
import { tokens } from '../../theme/tokens';

function playerDisplayName(player) {
  return player.firstName || String(player.name || '').split(' ')[0] || 'Player';
}

function profileIsIncomplete(player) {
  return !player.prefs || player.prefs.length === 0;
}

function playerStatus(player) {
  if (player.outThisGame) return { tone: 'attention', label: 'Out tonight' };
  if (profileIsIncomplete(player)) return { tone: 'attention', label: 'Needs preferences' };
  return { tone: 'success', label: 'Profile complete' };
}

export function MyTeamRosterScreen({
  team,
  players = [],
  canEdit = true,
  locked = false,
  loading = false,
  offline = false,
  addPlayerForm,
  onAddPlayer,
  onOpenPlayer,
  onViewAll,
}) {
  const [query, setQuery] = useState('');
  const missingCount = players.filter(profileIsIncomplete).length;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredPlayers = normalizedQuery ? players.filter(function (player) {
    return String(player.name || '').toLowerCase().includes(normalizedQuery);
  }) : players;
  const editingAvailable = canEdit && !locked;
  const meta = team
    ? [team.ageGroup, team.sport ? team.sport.charAt(0).toUpperCase() + team.sport.slice(1) : '', team.seasonLabel].filter(Boolean).join(' · ')
    : '';

  return (
    <main style={{ padding: `${tokens.space.lg} ${tokens.space.md} 80px`, maxWidth: '760px', margin: '0 auto' }}>
      <Stack gap="lg">
        <PageHeader
          title="My Team"
          subtitle={team ? `${team.name}${meta ? ` · ${meta}` : ''}` : 'Roster and player profiles'}
          action={editingAvailable && !addPlayerForm ? <Button size="sm" typography="contemporary" leadingIcon="add" onClick={onAddPlayer}>Add player</Button> : null}
        />

        <Stack direction="row" gap="sm" wrap>
          <StatusPill status="neutral">{players.length} player{players.length === 1 ? '' : 's'}</StatusPill>
          {missingCount > 0 ? <StatusPill status="attention">{missingCount} needs attention</StatusPill> : <StatusPill status="success">Profiles ready</StatusPill>}
          {!canEdit ? <StatusPill status="neutral">View only</StatusPill> : null}
          {locked ? <StatusPill status="neutral">Lineup finalized</StatusPill> : null}
          {offline ? <StatusPill status="attention">Offline</StatusPill> : null}
        </Stack>

        {addPlayerForm || null}

        {loading && players.length === 0 ? (
          <Card border padding="lg"><Text as="p" variant="body" color="secondary" style={{ margin: 0 }}>Loading roster…</Text></Card>
        ) : null}

        {!loading && players.length === 0 ? (
          <Card border padding="lg">
            <Stack gap="sm" align="start">
              <Text as="h2" variant="sectionTitle" style={{ margin: 0 }}>Your roster is ready for its first player.</Text>
              <Text as="p" variant="body" color="secondary" style={{ margin: 0 }}>Add players now, then complete preferences when you are ready to build a lineup.</Text>
              {editingAvailable ? <Button typography="contemporary" leadingIcon="add" onClick={onAddPlayer}>Add first player</Button> : null}
            </Stack>
          </Card>
        ) : null}

        {players.length > 0 ? (
          <Stack gap="md">
            <SearchField label="Search players" value={query} onChange={function (event) { setQuery(event.target.value); }} placeholder="Search roster" />
            <SectionHeader title="Players" action={<Text variant="caption" color="secondary">{filteredPlayers.length} shown</Text>} />
            <Stack gap="sm" role="list" aria-label="Team roster">
              {filteredPlayers.map(function (player) {
                const status = playerStatus(player);
                const displayName = playerDisplayName(player);
                return (
                  <div role="listitem" key={player.name}>
                    <PlayerRow
                      name={displayName}
                      detail={player.outThisGame ? 'Unavailable for the current game' : (profileIsIncomplete(player) ? 'Add position preferences' : 'Player profile ready')}
                      status={<StatusPill status={status.tone}>{status.label}</StatusPill>}
                      ariaLabel={`Open ${displayName} player profile: ${status.label}`}
                      onOpen={function () { if (onOpenPlayer) onOpenPlayer(player.name); }}
                    />
                  </div>
                );
              })}
            </Stack>
            {filteredPlayers.length === 0 ? <Text as="p" variant="body" color="secondary" style={{ textAlign: 'center', margin: 0 }}>No players match “{query}”.</Text> : null}
            {onViewAll ? <Button variant="secondaryOutline" typography="contemporary" fullWidth leadingIcon="roster" onClick={onViewAll}>Manage all player profiles</Button> : null}
          </Stack>
        ) : null}
      </Stack>
    </main>
  );
}
