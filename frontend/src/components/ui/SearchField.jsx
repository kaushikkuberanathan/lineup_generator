import { tokens } from '../../theme/tokens';
import { Icon } from './Icon';

export function SearchField({ label, value, onChange, placeholder = 'Search', style, ...rest }) {
  return (
    <label style={Object.assign({ display: 'flex', alignItems: 'center', gap: tokens.space.sm, minHeight: '44px', padding: `0 ${tokens.space.md}`, background: tokens.color.surface.card, border: `1px solid ${tokens.color.border.default}`, borderRadius: tokens.radius.lg }, style)}>
      <Icon name="search" size="sm" />
      <span style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>{label}</span>
      <input type="search" aria-label={label} value={value} onChange={onChange} placeholder={placeholder} style={{ flex: 1, minWidth: 0, minHeight: '44px', border: 'none', outline: 'none', background: 'transparent', color: tokens.color.text.primary, fontFamily: tokens.font.family.sans, fontSize: tokens.font.size.md }} {...rest} />
    </label>
  );
}
