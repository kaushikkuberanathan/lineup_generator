// Tappable, full-width list row. Used for menu lists, doc indexes,
// and accordion toggles. Always renders <button>; children are NOT
// wrapped — caller composes internal layout (emoji + title/summary +
// chevron) via Stack/Text directly.
//
// WCAG: 44px min-height floor enforced (mirrors Button).
//
// Deferred: leadingSlot/trailingSlot/title/subtitle prop API,
//   non-interactive static-row variant (introduce a separate primitive
//   if a real call site emerges).

import { tokens } from '../../theme/tokens';

var BASE_STYLE = {
  display:      'flex',
  alignItems:   'center',
  width:        '100%',
  background:   tokens.color.surface.card,
  border:       'none',
  padding:      '14px 16px',
  minHeight:    '44px',
  textAlign:    'left',
  cursor:       'pointer',
  boxSizing:    'border-box',
  fontFamily:   tokens.font.family.serif,
};

var DISABLED_STYLE = {
  opacity:       0.5,
  cursor:        'not-allowed',
  pointerEvents: 'none',
};

export function ListRow({
  onClick,
  disabled    = false,
  showDivider = true,
  type        = 'button',
  children,
  style,
  ...rest
}) {
  var dividerStyle = showDivider
    ? { borderBottom: '1px solid ' + tokens.color.border.default }
    : { borderBottom: 'none' };

  var computed = Object.assign(
    {},
    BASE_STYLE,
    dividerStyle,
    disabled ? DISABLED_STYLE : {},
    style,
  );

  function handleClick(e) {
    if (disabled) return;
    if (onClick) onClick(e);
  }

  return (
    <button type={type} disabled={disabled} onClick={handleClick} style={computed} {...rest}>
      {children}
    </button>
  );
}
