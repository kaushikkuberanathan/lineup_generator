import { BrandMark } from '../BrandMark';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Stack } from '../ui/Stack';
import { Text } from '../ui/Text';
import { tokens } from '../../theme/tokens';

export function AuthWorkspace({ title, subtitle, icon, children, compact = false }) {
  return (
    <main data-auth-workspace="true" style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center',
      padding: compact ? tokens.space.md : tokens.space.lg,
      boxSizing: 'border-box', background: tokens.color.surface.cream,
    }}>
      <Card padding={compact ? '24px 20px' : '32px 28px'} radius="lg" border style={{
        width: '100%', maxWidth: '420px', boxShadow: tokens.shadow.subtleCard,
      }}>
        <Stack direction="col" gap="lg">
          <Stack direction="col" align="center" gap="sm" style={{ textAlign: 'center' }}>
            <BrandMark size={56} />
            {icon ? (
              <span style={{
                width: '44px', height: '44px', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                borderRadius: tokens.radius.lg, background: tokens.color.overlay.goldTint,
                color: tokens.color.brand.navy,
              }}><Icon name={icon} size="md" /></span>
            ) : null}
            <Text as="h1" variant="pageTitle" style={{ margin: 0 }}>{title}</Text>
            {subtitle ? <Text as="p" size="body" color="secondary" style={{ margin: 0 }}>{subtitle}</Text> : null}
          </Stack>
          {children}
        </Stack>
      </Card>
    </main>
  );
}
