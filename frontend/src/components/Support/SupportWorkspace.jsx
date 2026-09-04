import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Stack } from '../ui/Stack';
import { Text } from '../ui/Text';
import { tokens } from '../../theme/tokens';

var TONE_STYLES = {
  support: { background: '#EEF5F3', color: tokens.color.brand.navy },
  account: { background: '#F5F1E8', color: tokens.color.brand.navy },
};

/** Shared contemporary frame for every Support and Account destination. */
export function SupportWorkspace({ title, subtitle, icon = 'support', tone = 'support', children }) {
  var toneStyle = TONE_STYLES[tone] || TONE_STYLES.support;
  return (
    <div style={{
      padding: '12px 12px 84px',
      background: tokens.color.surface.cream,
      borderRadius: tokens.radius.lg + ' ' + tokens.radius.lg + ' 0 0',
      minHeight: 'calc(100svh - 150px)',
    }}>
      <Card
        padding="16px"
        radius="lg"
        style={{
          background: toneStyle.background,
          border: '1px solid ' + tokens.color.border.default,
          marginBottom: tokens.space.md,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <span aria-hidden="true" style={{
          position: 'absolute', right: '-18px', top: '-28px', width: '88px', height: '88px',
          borderRadius: '50%', border: '14px solid rgba(245,200,66,0.22)',
        }} />
        <Stack direction="row" align="center" gap="md" style={{ position: 'relative' }}>
          <span style={{
            width: '44px', height: '44px', borderRadius: tokens.radius.lg,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: tokens.color.surface.card, color: toneStyle.color,
            boxShadow: tokens.shadow.subtleCard, flexShrink: 0,
          }}>
            <Icon name={icon} size="md" />
          </span>
          <Stack direction="col" gap="xs" style={{ minWidth: 0 }}>
            <Text as="h1" variant="pageTitle" style={{ margin: 0 }}>{title}</Text>
            <Text as="p" size="sm" color="secondary" style={{ margin: 0 }}>{subtitle}</Text>
          </Stack>
        </Stack>
      </Card>
      {children}
    </div>
  );
}
