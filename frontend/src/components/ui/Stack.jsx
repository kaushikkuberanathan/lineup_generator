// Flex layout primitive. Replaces raw display:flex boilerplate.
// Direction default: "col" (vertical) — dominant call-site pattern in App.jsx.
// All props use a CLOSED vocabulary — no CSS values pass through verbatim.
// align and justify have NO default: omitting them produces no inline style,
// letting the browser apply its own defaults (stretch / flex-start). Tests
// S4.5 and S5.4 guard this — any future addition of defaults fails immediately.
// Deferred: as prop, Stack.Spacer/Divider, responsive direction, wrap-reverse,
//   padding/margin props (use Card for surface padding).

import { tokens } from '../../theme/tokens';

// Closed-vocabulary maps — none of these values pass through verbatim.
// "col"/"row" and "start"/"end"/"between" are NOT valid CSS flex values.

var DIRECTION_MAP = {
  col: 'column',
  row: 'row',
};

var ALIGN_MAP = {
  start:   'flex-start',
  center:  'center',
  end:     'flex-end',
  stretch: 'stretch',
};

var JUSTIFY_MAP = {
  start:   'flex-start',
  center:  'center',
  end:     'flex-end',
  between: 'space-between',
  around:  'space-around',
};

var GAP_MAP = {
  xs: tokens.space.xs,  // '4px'
  sm: tokens.space.sm,  // '8px'
  md: tokens.space.md,  // '12px'
  lg: tokens.space.lg,  // '16px'
};

export function Stack({
  direction = 'col',
  gap       = 'md',
  align,
  justify,
  wrap      = false,
  children,
  style,
  ...rest
}) {
  var computed = Object.assign(
    {
      display:       'flex',
      flexDirection: DIRECTION_MAP[direction] || 'column',
      gap:           GAP_MAP[gap]             || GAP_MAP.md,
      flexWrap:      wrap ? 'wrap' : 'nowrap',
    },
    align   ? { alignItems:     ALIGN_MAP[align]     } : {},
    justify ? { justifyContent: JUSTIFY_MAP[justify] } : {},
    style,
  );

  return <div style={computed} {...rest}>{children}</div>;
}
