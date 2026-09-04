import { tokens } from '../../theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';

export function ActionRow({ icon, label, subtitle, trailing = true, disabled = false, onClick, style, ...rest }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={Object.assign({
        display: 'flex', alignItems: 'center', gap: tokens.space.md, width: '100%', minHeight: '44px',
        padding: `${tokens.space.sm} ${tokens.space.md}`, background: tokens.color.surface.card,
        color: tokens.color.text.primary, border: `1px solid ${tokens.color.border.default}`,
        borderRadius: tokens.radius.lg, textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, boxSizing: 'border-box',
      }, style)}
      {...rest}
    >
      {icon ? <Icon name={icon} size="md" /> : null}
      <span style={{ display: 'flex', flexDirection: 'column', gap: tokens.space.xs, flex: 1, minWidth: 0 }}>
        <Text variant="button">{label}</Text>
        {subtitle ? <Text variant="caption" color="secondary">{subtitle}</Text> : null}
      </span>
      {trailing ? <Icon name="chevronRight" size="sm" /> : null}
    </button>
  );
}
