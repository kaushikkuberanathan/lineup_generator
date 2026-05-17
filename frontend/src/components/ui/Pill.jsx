// Compact toggle chip. Used for category pickers and horizontal-scroll
// selector rows. Always renders <button>; always wraps children in Text.
//
// Pill DOES NOT enforce 44px touch-target floor — chips are compact
// affordances; the row-of-Pills is the semantic hit target. For a
// standalone interactive control, use Button.
//
// Deferred: icon slot, count badge, multi-select group primitive.

import { tokens } from '../../theme/tokens';
import { Text } from './Text';

var BASE_STYLE = {
  borderRadius:   tokens.radius.pill,
  padding:        '6px 12px',
  borderWidth:    '1px',
  borderStyle:    'solid',
  cursor:         'pointer',
  whiteSpace:     'nowrap',
  flexShrink:     0,
  boxSizing:      'border-box',
  display:        'inline-flex',
  alignItems:     'center',
  justifyContent: 'center',
};

var ACTIVE_STYLE = {
  background:  tokens.color.brand.navy,
  color:       '#ffffff',
  borderColor: tokens.color.brand.navy,
};

var INACTIVE_STYLE = {
  background:  tokens.color.surface.card,
  color:       tokens.color.text.secondary,
  borderColor: tokens.color.border.default,
};

var DISABLED_STYLE = {
  opacity:       0.5,
  cursor:        'not-allowed',
  pointerEvents: 'none',
};

export function Pill({
  active   = false,
  disabled = false,
  onClick,
  type     = 'button',
  children,
  style,
  ...rest
}) {
  var computed = Object.assign(
    {},
    BASE_STYLE,
    active   ? ACTIVE_STYLE   : INACTIVE_STYLE,
    disabled ? DISABLED_STYLE : {},
    style,
  );

  function handleClick(e) {
    if (disabled) return;
    if (onClick) onClick(e);
  }

  return (
    <button type={type} disabled={disabled} onClick={handleClick} style={computed} {...rest}>
      <Text size="sm" weight={active ? 'semibold' : 'medium'} family="serif">
        {children}
      </Text>
    </button>
  );
}
