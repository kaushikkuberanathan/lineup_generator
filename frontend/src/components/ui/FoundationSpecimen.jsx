import { tokens } from '../../theme/tokens';
import { Icon, ICON_NAMES } from './Icon';
import { Stack } from './Stack';
import { Text } from './Text';

const TYPOGRAPHY_ROLES = Object.freeze(Object.keys(tokens.font.role));

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
    </Stack>
  );
}
