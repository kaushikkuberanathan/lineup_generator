// frontend/src/theme/index.js
//
// Barrel export for the design token system.
//
// Usage:
//   import { tokens } from '../theme';
//   tokens.color.brand.navy
//
//   import { color, space, font } from '../theme';
//   color.brand.navy   space.md   font.size.body
//
// Both forms resolve to the same underlying token object.

import { tokens } from './tokens.js';

export { tokens };
export const { color, opacity, space, radius, font, zIndex, shadow } = tokens;
