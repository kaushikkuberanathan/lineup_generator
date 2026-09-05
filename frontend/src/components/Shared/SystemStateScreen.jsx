import { BrandMark } from '../BrandMark';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Stack } from '../ui/Stack';
import { Text } from '../ui/Text';
import { tokens } from '../../theme/tokens';

export function SystemStateScreen({ state = 'loading', title, message, version, children }) {
  var dark = state === 'maintenance';
  var icon = state === 'loading' ? 'baseball' : state === 'maintenance' ? 'settings' : 'attention';
  return (
    <main data-system-state={state} style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center', padding: tokens.space.lg,
      boxSizing: 'border-box', background: dark ? tokens.color.brand.navy : tokens.color.surface.cream,
    }}>
      <Card padding="28px 24px" radius="lg" border={!dark} style={{
        width: '100%', maxWidth: '400px', textAlign: 'center',
        background: dark ? 'transparent' : tokens.color.surface.card,
        boxShadow: dark ? 'none' : tokens.shadow.subtleCard,
      }}>
        <Stack direction="col" align="center" gap="md">
          <BrandMark size={52} />
          <span style={{
            width: '44px', height: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: tokens.radius.lg, background: dark ? tokens.color.overlay.whiteFaint : tokens.color.overlay.goldTint,
            color: dark ? tokens.color.brand.gold : tokens.color.brand.navy,
          }}><Icon name={icon} size="md" /></span>
          <Text as="h1" variant="pageTitle" style={{ margin: 0, color: dark ? tokens.color.brand.gold : tokens.color.text.primary }}>{title}</Text>
          <Text as="p" variant="body" style={{ margin: 0, color: dark ? tokens.color.overlay.whiteHeavy : tokens.color.text.secondary, lineHeight: tokens.font.lineHeight.relaxed }}>{message}</Text>
          {children}
          {version ? <Text size="xs" style={{ color: dark ? tokens.color.overlay.whiteMedium : tokens.color.text.tertiary }}>v{version}</Text> : null}
        </Stack>
      </Card>
    </main>
  );
}
