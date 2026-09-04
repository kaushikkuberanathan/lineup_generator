import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Stack } from '../../components/ui/Stack';
import { StatusPill } from '../../components/ui/StatusPill';
import { Text } from '../../components/ui/Text';
import { tokens } from '../../theme/tokens';
import { firstName } from '../../utils/playerName';

const INPUT_STYLE = {
  width:'100%', minHeight:'44px', padding:`${tokens.space.sm} ${tokens.space.md}`,
  borderRadius:tokens.radius.md, border:`1px solid ${tokens.color.border.default}`,
  background:tokens.color.surface.card, color:tokens.color.text.body,
  fontFamily:tokens.font.family.sans, fontSize:tokens.font.size.body, boxSizing:'border-box',
};

function SongField({ player, field, label, type = 'text', placeholder, disabled, onUpdate }) {
  const shortName = firstName(player.name);
  return (
    <label style={{ display:'flex', flexDirection:'column', gap:tokens.space.xs }}>
      <Text variant="label" color="secondary">{label}</Text>
      <input
        aria-label={`${shortName} ${label.toLowerCase()}`}
        type={type}
        value={player[field] || ''}
        placeholder={placeholder}
        disabled={disabled}
        style={Object.assign({}, INPUT_STYLE, disabled ? { opacity:0.55, cursor:'not-allowed' } : {})}
        onChange={function (event) { onUpdate(player.name, { [field]:event.target.value || null }); }}
      />
    </label>
  );
}

function SongDisplayCard({ player }) {
  const configured = Boolean(player.song || player.artist || player.start || player.notes || player.link);
  const showTime = player.start && player.end && !(player.start === '0:00' && player.end === '0:00');
  return (
    <Card border radius="lg" padding="md" style={{ opacity:configured ? 1 : 0.72 }}>
      <Stack direction="row" gap="md" align="start">
        <div style={{ color:tokens.color.brand.navy, paddingTop:tokens.space.xs }}><Icon name="music" label={`${firstName(player.name)} walk-up song`} /></div>
        <Stack gap="xs" style={{ flex:1, minWidth:0 }}>
          <Text variant="label" color="secondary">#{player.order} · {firstName(player.name)}</Text>
          {configured ? (
            <>
              {player.song ? <Text variant="cardTitle">{player.song}</Text> : null}
              {player.artist ? <Text variant="body" color="secondary">{player.artist}</Text> : null}
              {showTime ? <Text variant="caption" color="secondary">Play {player.start}–{player.end}</Text> : null}
              {player.notes ? <Text variant="caption" color="tertiary">{player.notes}</Text> : null}
              {player.link ? <a href={player.link} target="_blank" rel="noopener noreferrer" aria-label={`Open ${firstName(player.name)} song`} style={{ display:'inline-flex', alignItems:'center', gap:tokens.space.xs, color:tokens.color.brand.navy, fontWeight:tokens.font.weight.semibold, textDecoration:'none', minHeight:'44px' }}><Icon name="externalLink" />Open song</a> : null}
            </>
          ) : <Text variant="body" color="tertiary">No song set</Text>}
        </Stack>
      </Stack>
    </Card>
  );
}

function SongEditCard({ player, onUpdate }) {
  const disabled = Boolean(player.absent);
  return (
    <Card border radius="lg" padding="md" style={{ opacity:disabled ? 0.7 : 1 }}>
      <Stack gap="md">
        <Stack direction="row" justify="between" align="center" gap="sm" wrap>
          <Text variant="cardTitle">#{player.order} · {firstName(player.name)}</Text>
          {disabled ? <StatusPill status="attention">Out tonight</StatusPill> : <StatusPill status={player.song ? 'success' : 'neutral'}>{player.song ? 'Configured' : 'Not set'}</StatusPill>}
        </Stack>
        <SongField player={player} field="walkUpSong" label="Song title" placeholder="Song title" disabled={disabled} onUpdate={onUpdate} />
        <SongField player={player} field="walkUpArtist" label="Artist" placeholder="Artist name" disabled={disabled} onUpdate={onUpdate} />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:tokens.space.sm }}>
          <SongField player={player} field="walkUpStart" label="Start time" placeholder="0:45" disabled={disabled} onUpdate={onUpdate} />
          <SongField player={player} field="walkUpEnd" label="End time" placeholder="1:10" disabled={disabled} onUpdate={onUpdate} />
        </div>
        <SongField player={player} field="walkUpNotes" label="Coordinator notes" placeholder="Optional cue" disabled={disabled} onUpdate={onUpdate} />
        <SongField player={player} field="walkUpLink" label="Song link" type="url" placeholder="YouTube, Spotify, or other URL" disabled={disabled} onUpdate={onUpdate} />
      </Stack>
    </Card>
  );
}

export function WalkUpSongsWorkspace({
  players = [], mode = 'display', locked = false, offline = false,
  onModeChange, onUpdate = function () {}, onShare, onPrint,
}) {
  const configuredCount = players.filter(function (player) { return Boolean(player.song || player.artist || player.start || player.notes || player.link); }).length;
  const options = locked ? [{ value:'display', label:'Game Day view' }] : [{ value:'display', label:'Game Day view' }, { value:'edit', label:'Edit' }];
  const effectiveMode = locked ? 'display' : mode;

  return (
    <Stack gap="md">
      <Card border shadow radius="lg" padding="md" aria-label="Walk-up song controls">
        <Stack gap="md">
          <Stack direction="row" justify="between" align="center" gap="sm" wrap>
            <div>
              <Text as="h2" variant="cardTitle" style={{ margin:0 }}>Walk-up songs</Text>
              <Text as="p" variant="caption" color="secondary" style={{ margin:0 }}>{configuredCount} of {players.length} configured</Text>
            </div>
            <StatusPill status={locked ? 'success' : configuredCount === players.length && players.length > 0 ? 'success' : 'attention'}>{locked ? 'Lineup finalized' : configuredCount === players.length && players.length > 0 ? 'Ready' : 'Setup in progress'}</StatusPill>
          </Stack>
          <SegmentedControl label="Song view" value={effectiveMode} options={options} onChange={onModeChange} />
          <Stack direction="row" gap="sm" wrap>
            <Button typography="contemporary" leadingIcon="share" disabled={players.length === 0} onClick={onShare}>Share list</Button>
            <Button typography="contemporary" variant="secondaryOutline" leadingIcon="download" disabled={players.length === 0} onClick={onPrint}>Print list</Button>
          </Stack>
        </Stack>
      </Card>

      {offline ? <StatusPill status="attention">Song details remain available offline; sharing and external links need a connection.</StatusPill> : null}
      {players.length === 0 ? (
        <Card border radius="lg" padding="lg"><Stack direction="row" gap="sm" align="center"><Icon name="info" /><Text variant="body" color="secondary">Add players to the batting order first.</Text></Stack></Card>
      ) : effectiveMode === 'edit' ? (
        <Stack gap="sm">
          <Text variant="caption" color="secondary">Players follow the batting order. Change that order from the Batting tab.</Text>
          {players.map(function (player) { return <SongEditCard key={player.name} player={player} onUpdate={onUpdate} />; })}
        </Stack>
      ) : (
        <Stack gap="sm">
          <Text variant="caption" color="secondary">Order matches the current available batting lineup.</Text>
          {players.filter(function (player) { return !player.absent; }).map(function (player) { return <SongDisplayCard key={player.name} player={player} />; })}
        </Stack>
      )}
    </Stack>
  );
}
