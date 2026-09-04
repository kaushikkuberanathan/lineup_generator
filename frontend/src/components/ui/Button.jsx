// Variants: primary | secondary | ghost | danger
// Sizes:    sm | md (default) | lg  —  all enforce 44px touch-target floor
// Icon slots and loading state are additive contemporary-foundation contracts.

import { tokens } from '../../theme/tokens';
import { Text } from './Text';
import { Icon } from './Icon';

var VARIANT_STYLES = {
  primary: {
    background: tokens.color.brand.gold,
    color:      tokens.color.brand.navy,
    border:     'none',
  },
  secondary: {
    background: tokens.color.brand.navy,
    color:      tokens.color.text.onDark,
    border:     'none',
  },
  secondaryOutline: {
    background: tokens.color.surface.card,
    color: tokens.color.brand.navy,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.color.border.default,
  },
  ghost: {
    background:  'transparent',
    color:       tokens.color.brand.navy,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.color.border.default,
  },
  danger: {
    background: tokens.color.status.error,
    color:      tokens.color.text.onDark,
    border:     'none',
  },
};

// Button size → Text size token key  (sm=13px, md=14px, lg=16px)
var SIZE_TEXT_MAP = { sm: 'body', md: 'md', lg: 'lg' };

var SIZE_STYLES = {
  sm: { padding: '8px 16px',  minHeight: '44px' },
  md: { padding: '10px 20px', minHeight: '44px' },
  lg: { padding: '12px 24px', minHeight: '44px' },
};

var BASE_STYLE = {
  display:        'inline-flex',
  alignItems:     'center',
  justifyContent: 'center',
  borderRadius:   tokens.radius.md,
  cursor:         'pointer',
  boxSizing:      'border-box',
};

var DISABLED_STYLE = {
  opacity:       0.5,
  cursor:        'not-allowed',
  pointerEvents: 'none',
};

export function Button({
  variant   = 'primary',
  size      = 'md',
  disabled  = false,
  loading   = false,
  leadingIcon,
  trailingIcon,
  typography = 'legacy',
  fullWidth = false,
  onClick,
  type      = 'button',
  children,
  style,
  ...rest
}) {
  var computed = Object.assign(
    {},
    BASE_STYLE,
    VARIANT_STYLES[variant] || VARIANT_STYLES.primary,
    SIZE_STYLES[size]       || SIZE_STYLES.md,
    disabled || loading ? DISABLED_STYLE : {},
    fullWidth ? { width: '100%' } : {},
    style,
  );

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={disabled || loading ? undefined : onClick}
      style={computed}
      {...rest}
    >
      {leadingIcon ? <Icon name={leadingIcon} size="sm" style={{ marginRight: tokens.space.sm }} /> : null}
      <Text
        variant={typography === 'contemporary' ? 'button' : undefined}
        size={SIZE_TEXT_MAP[size] || 'md'}
        weight="semibold"
        family={typography === 'contemporary' ? undefined : 'serif'}
      >
        {loading ? 'Loading…' : children}
      </Text>
      {trailingIcon ? <Icon name={trailingIcon} size="sm" style={{ marginLeft: tokens.space.sm }} /> : null}
    </button>
  );
}
