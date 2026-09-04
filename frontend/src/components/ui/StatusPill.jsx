import { tokens } from '../../theme/tokens';
import { Text } from './Text';

const STATUS_STYLES = {
  ready: { background: tokens.color.status.successBg, color: tokens.color.status.successText },
  success: { background: tokens.color.status.successBg, color: tokens.color.status.successText },
  attention: { background: tokens.color.status.warningBg, color: tokens.color.status.warningText },
  info: { background: tokens.color.overlay.goldTint, color: tokens.color.text.primary },
  away: { background: tokens.color.overlay.goldTint, color: tokens.color.status.warningText },
  home: { background: tokens.color.surface.page, color: tokens.color.text.secondary },
  neutral: { background: tokens.color.surface.page, color: tokens.color.text.secondary },
};

export function StatusPill({ status = 'neutral', children, style, ...rest }) {
  return (
    <span data-status={status} style={Object.assign({
      display: 'inline-flex', alignItems: 'center', minHeight: '24px', padding: `0 ${tokens.space.sm}`,
      borderRadius: tokens.radius.pill,
    }, STATUS_STYLES[status] || STATUS_STYLES.neutral, style)} {...rest}>
      <Text variant="caption" weight="semibold" color="inherit">{children}</Text>
    </span>
  );
}
