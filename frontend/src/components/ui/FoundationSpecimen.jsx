import { tokens } from '../../theme/tokens';
import { Icon, ICON_NAMES } from './Icon';
import { Stack } from './Stack';
import { Text } from './Text';
import { Button } from './Button';
import { ActionRow } from './ActionRow';
import { IconAction } from './IconAction';
import { SearchField } from './SearchField';
import { SegmentedControl } from './SegmentedControl';
import { StatusPill } from './StatusPill';
import { PageHeader, SectionHeader } from '../compositions/Headers';
import { ReadinessStrip } from '../compositions/ReadinessStrip';
import { TeamHub } from '../../features/home/TeamHub';

const TYPOGRAPHY_ROLES = Object.freeze(Object.keys(tokens.font.role));
const TEAM_FIXTURES = Object.freeze([
  {
    id: 'mud-hens', displayName: 'Mud Hens', season: 'Fall', year: 2026, ageGroup: '8U',
    role: { code: 'admin', label: 'Head Coach' },
    nextEvent: { id: 'game-1', type: 'game', opponent: 'Braves', startsAt: '2026-09-05T18:00:00', homeAway: 'home' },
    readiness: { confirmedCount: 9, rosterCount: 11, lineupStatus: 'ready' },
    actions: [
      { id: 'start_game_mode', label: 'Start Mud Hens Game Mode', enabled: true, href: '#' },
      { id: 'manage_roster', label: 'Manage Mud Hens roster', enabled: true, href: '#' },
    ],
  },
  {
    id: 'eagles', displayName: 'Eagles', season: 'Fall', year: 2026, ageGroup: '10U',
    role: { code: 'viewer', label: 'Parent' }, nextEvent: null,
    readiness: { confirmedCount: 8, rosterCount: 12, lineupStatus: 'draft' }, actions: [],
  },
]);

export function FoundationSpecimen() {
  return (
    <Stack direction="col" gap="lg">
      <section aria-labelledby="typography-specimen-title">
        <Text as="h2" id="typography-specimen-title" variant="pageTitle">Typography</Text>
        <Stack direction="col" gap="sm">
          {TYPOGRAPHY_ROLES.map(function (role) {
            return <Text key={role} variant={role}>{role}: Mud Hens lineup ready</Text>;
          })}
        </Stack>
        <div style={{ marginTop: tokens.space.lg, padding: tokens.space.lg, background: tokens.color.surface.dark, borderRadius: tokens.radius.md }}>
          <Text variant="cardTitle" color="white">Mud Hens</Text>
          <Text variant="body" color="white">Lineup ready for a 6:00 PM first pitch.</Text>
          <Text variant="caption" color="white">Dark-surface legibility specimen</Text>
        </div>
      </section>

      <section aria-labelledby="icon-specimen-title">
        <Text as="h2" id="icon-specimen-title" variant="pageTitle">Icons</Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.space.md }}>
          {ICON_NAMES.map(function (name) {
            return (
              <div key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: tokens.space.xs }}>
                <Icon name={name} />
                <Text variant="caption">{name}</Text>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <PageHeader title="Shared actions" subtitle="One clear primary action, calm supporting choices." />
        <Stack direction="col" gap="sm">
          <Button leadingIcon="gameDay" typography="contemporary">Start Game Mode</Button>
          <ActionRow icon="roster" label="Manage roster" subtitle="11 players" />
          <Stack direction="row" gap="sm" align="center">
            <StatusPill status="ready">Ready</StatusPill>
            <StatusPill status="attention">Needs attention</StatusPill>
            <IconAction icon="overflow" label="More actions" />
          </Stack>
          <SegmentedControl value="focused" options={[{ value: 'focused', label: 'Focused' }, { value: 'all', label: 'All teams' }]} />
          <SearchField label="Search teams" value="" onChange={function () {}} />
          <ReadinessStrip confirmedCount={9} rosterCount={11} lineupStatus="ready" />
        </Stack>
      </section>

      <section>
        <SectionHeader title="API-driven Home pilot" />
        <TeamHub teams={TEAM_FIXTURES} expandedTeamId="mud-hens" viewFilter="single" />
      </section>
    </Stack>
  );
}
