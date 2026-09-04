import { tokens } from '../../theme/tokens';
import { Icon } from './Icon';

export function IconAction({ icon, label, disabled = false, onClick, style, ...rest }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={disabled ? undefined : onClick} style={Object.assign({
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px',
      padding: 0, borderRadius: tokens.radius.pill, border: `1px solid ${tokens.color.border.default}`,
      background: tokens.color.surface.card, color: tokens.color.text.primary,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
    }, style)} {...rest}>
      <Icon name={icon} size="md" />
    </button>
  );
}
