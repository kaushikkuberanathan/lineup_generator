import { tokens } from '../../theme/tokens';

var SIZE_MAP = {
  xs: tokens.font.size.xs,
  sm: tokens.font.size.sm,
  body: tokens.font.size.body,
  md: tokens.font.size.md,
  lg: tokens.font.size.lg,
  xl: tokens.font.size.xl,
  xl2: tokens.font.size.xl2,
};

var COLOR_MAP = {
  secondary: tokens.color.text.secondary,
  tertiary: tokens.color.text.tertiary,
  disabled: tokens.color.text.disabled,
  gold: tokens.color.brand.gold,
  navy: tokens.color.brand.navy,
  white: '#ffffff',
  inherit: 'inherit',
};

var WEIGHT_MAP = {
  regular: tokens.font.weight.regular,
  medium: tokens.font.weight.medium,
  semibold: tokens.font.weight.semibold,
  bold: tokens.font.weight.bold,
};

var FAMILY_MAP = {
  serif: tokens.font.family.serif,
  sans: tokens.font.family.sans,
  mono: tokens.font.family.mono,
  inherit: 'inherit',
};

export function Text({ as: Tag = 'span', size, weight, color, family, uppercase = false, children, style, ...rest }) {
  var computed = {};
  if (size) computed.fontSize = SIZE_MAP[size] || size;
  if (weight) computed.fontWeight = WEIGHT_MAP[weight] || weight;
  if (color) computed.color = COLOR_MAP[color] || color;
  if (family) computed.fontFamily = FAMILY_MAP[family] || family;
  if (uppercase) computed.textTransform = 'uppercase';
  return <Tag style={Object.assign({}, computed, style)} {...rest}>{children}</Tag>;
}
