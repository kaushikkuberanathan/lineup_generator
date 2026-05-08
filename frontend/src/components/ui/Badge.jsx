import { tokens } from '../../theme/tokens';
import { Text } from './Text';

var VARIANT_STYLES = {
  'hand-L': { background: '#dbeafe', color: '#1d4ed8' },
  'hand-R': { background: '#f3f4f6', color: '#4b5563' },
};

export function Badge({ variant, children, style, ...rest }) {
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
        VARIANT_STYLES[variant] || {},
        style
      )}
      {...rest}
    >
      <Text size="xs" weight="semibold">{children}</Text>
    </span>
  );
}
