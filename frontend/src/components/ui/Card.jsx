// Surface primitive. Not interactive — no onClick, disabled, hover, or focus.
// Children render as-is; no inner wrapper, no Text primitive, no typography defaults.
// Deferred: as prop, Card.Header/Footer, hoverable variant, shadow gradations, border control.

// Variants: default | subtle
// Note: original plan also called for a "dark" variant (navy on light bg).
// Deferred — no current non-locked call site demands it; "subtle" already
// covers nested-on-dark contexts. Promote in 2.5+ if a real use case emerges.

import { tokens } from '../../theme/tokens';

var VARIANT_STYLES = {
  default: { background: tokens.color.surface.card },
  // rgba(255,255,255,0.06) has no token yet — closest existing is
  // color.overlay.whiteFaint (0.08, different value). Promote to
  // color.surface.subtle in Phase 2.5+ when a second call site appears.
  subtle: { background: 'rgba(255,255,255,0.06)' },
};

var PADDING_MAP = {
  sm: tokens.space.sm,  // '8px'
  md: tokens.space.md,  // '12px'
  lg: tokens.space.lg,  // '16px'
};

var RADIUS_MAP = {
  sm: tokens.radius.sm,  // '6px'
  md: tokens.radius.md,  // '8px'
  lg: tokens.radius.lg,  // '12px'
};

export function Card({
  variant = 'default',
  padding = 'md',
  radius  = 'md',
  shadow  = false,
  children,
  style,
  ...rest
}) {
  var computed = Object.assign(
    {
      borderRadius: RADIUS_MAP[radius]   || RADIUS_MAP.md,
      padding:      PADDING_MAP[padding] || PADDING_MAP.md,
      boxSizing:    'border-box',
    },
    VARIANT_STYLES[variant] || VARIANT_STYLES.default,
    shadow ? { boxShadow: tokens.shadow.card } : {},
    style,
  );

  return <div style={computed} {...rest}>{children}</div>;
}
