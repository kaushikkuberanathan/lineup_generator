import { BrandMark } from '../../components/BrandMark';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { Stack } from '../../components/ui/Stack';
import { Text } from '../../components/ui/Text';
import { tokens } from '../../theme/tokens';

export function ShareStatusScreen({ state = 'loading', message }) {
  var loading = state === 'loading';
  return (
    <main style={{ minHeight: '100vh', background: tokens.color.surface.cream, display: 'grid', placeItems: 'center', padding: tokens.space.lg }}>
      <Card padding="24px" radius="lg" border style={{ width: '100%', maxWidth: '380px', textAlign: 'center', boxShadow: tokens.shadow.subtleCard }}>
        <Stack align="center" gap="md">
          <BrandMark size={48} />
          <span style={{
            width: '44px', height: '44px', borderRadius: tokens.radius.lg,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: loading ? tokens.color.overlay.goldTint : tokens.color.surface.page,
            color: tokens.color.brand.navy,
          }}>
            <Icon name={loading ? 'baseball' : 'attention'} size="md" />
          </span>
          <Text as="h1" variant="pageTitle" style={{ margin: 0 }}>{loading ? 'Opening lineup' : 'Lineup unavailable'}</Text>
          <Text as="p" variant="body" color="secondary" style={{ margin: 0, lineHeight: tokens.font.lineHeight.relaxed }}>{message}</Text>
          <Text size="xs" color="tertiary">View-only · No sign-in required</Text>
        </Stack>
      </Card>
    </main>
  );
}
