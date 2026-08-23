import { tokens } from '../../theme/tokens';
import { Text } from './Text';

var VARIANT_STYLES = {
  'hand-L': {
    light: { background: tokens.color.badge.handL.background, color: tokens.color.badge.handL.text },
    dark: { background: tokens.color.overlay.whiteLight, color: tokens.color.text.onDark },
  },
  'hand-R': {
    light: { background: tokens.color.badge.handR.background, color: tokens.color.badge.handR.text },
    dark: { background: tokens.color.overlay.whiteLight, color: tokens.color.text.onDark },
  },
};

export function Badge({ variant, context = 'light', children, style, ...rest }) {
  if (children == null) return null;

  return (
    <span
      style={Object.assign(
        {},
        {
          display: 'inline-block',
          padding: '1px 5px',
          borderRadius: tokens.radius.xs,
          lineHeight: '16px',
        },
        (VARIANT_STYLES[variant] || {})[context] || {},
        style
      )}
      {...rest}
    >
      <Text size="xs" weight="semibold">{children}</Text>
    </span>
  );
}
