/**
 * theme.tokens.test.js — shape tests for the design token system.
 *
 * These tests verify STRUCTURE and FORMAT only — not literal values.
 * Token values are documented in docs/product/DESIGN_AUDIT.md.
 * A passing shape test means the token tree is complete and correctly
 * typed; a failing value is a DESIGN_AUDIT.md update, not a code bug.
 *
 * RED → GREEN sequence: this file is written before tokens.js and
 * theme/index.js exist. All tests fail with a module resolution error
 * until Step B creates those files.
 *
 * Run: cd frontend && npm test -- theme.tokens
 */

import { tokens, color, opacity, space, radius, font, zIndex, shadow } from '../theme';

const HEX_RE  = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;
const RGBA_RE = /^rgba\(\d+,\d+,\d+,[\d.]+\)$/;

// ─── Group 1 — Top-level structure ───────────────────────────────────────────

describe('Group 1 — top-level structure', function () {

  test('1.1: tokens is a defined, non-null object', function () {
    expect(tokens).toBeDefined();
    expect(tokens).not.toBeNull();
    expect(typeof tokens).toBe('object');
  });

  test('1.2: has required top-level groups', function () {
    expect(tokens).toHaveProperty('color');
    expect(tokens).toHaveProperty('opacity');
    expect(tokens).toHaveProperty('space');
    expect(tokens).toHaveProperty('radius');
    expect(tokens).toHaveProperty('font');
    expect(tokens).toHaveProperty('zIndex');
    expect(tokens).toHaveProperty('shadow');
  });

});

// ─── Group 2 — color sub-groups ──────────────────────────────────────────────

describe('Group 2 — color sub-groups', function () {

  test('2.1: color has all required sub-groups', function () {
    ['brand', 'surface', 'text', 'status', 'border', 'overlay'].forEach(k => {
      expect(tokens.color).toHaveProperty(k);
    });
  });

  test('2.2: color.brand has navy, gold, red as hex strings', function () {
    ['navy', 'gold', 'red'].forEach(k => {
      expect(tokens.color.brand[k]).toMatch(HEX_RE);
    });
  });

  test('2.3: color.surface has correct keys as non-empty strings; cream is absent', function () {
    ['page', 'card', 'dark', 'tableHeader'].forEach(k => {
      expect(typeof tokens.color.surface[k]).toBe('string');
      expect(tokens.color.surface[k].length).toBeGreaterThan(0);
    });
    expect(tokens.color.surface).not.toHaveProperty('cream');
  });

  test('2.4: color.text has all keys as non-empty strings', function () {
    ['primary', 'secondary', 'tertiary', 'onDark', 'disabled'].forEach(k => {
      expect(typeof tokens.color.text[k]).toBe('string');
      expect(tokens.color.text[k].length).toBeGreaterThan(0);
    });
  });

  test('2.5: color.status has correct keys; successBg is absent', function () {
    ['success', 'warning', 'error', 'errorBg', 'info'].forEach(k => {
      expect(typeof tokens.color.status[k]).toBe('string');
      expect(tokens.color.status[k].length).toBeGreaterThan(0);
    });
    expect(tokens.color.status).not.toHaveProperty('successBg');
  });

  test('2.6: color.border has subtle, default, strong as non-empty strings', function () {
    ['subtle', 'default', 'strong'].forEach(k => {
      expect(typeof tokens.color.border[k]).toBe('string');
      expect(tokens.color.border[k].length).toBeGreaterThan(0);
    });
  });

  test('2.7: color.overlay has correct keys (navyWash, not navySubtle); all rgba format', function () {
    const expected = ['navyWash', 'navyFaint', 'navyMedium', 'whiteFaint', 'whiteLight', 'goldTint', 'goldStrong', 'backdrop'];
    expected.forEach(k => {
      expect(tokens.color.overlay[k]).toMatch(RGBA_RE);
    });
    expect(tokens.color.overlay).not.toHaveProperty('navySubtle');
  });

});

// ─── Group 3 — value format checks ───────────────────────────────────────────

describe('Group 3 — value format checks', function () {

  test('3.1: all color.brand values match hex format', function () {
    Object.values(tokens.color.brand).forEach(v => expect(v).toMatch(HEX_RE));
  });

  test('3.2: all color.surface values match hex format', function () {
    Object.values(tokens.color.surface).forEach(v => expect(v).toMatch(HEX_RE));
  });

  test('3.3: all color.text values match hex format', function () {
    Object.values(tokens.color.text).forEach(v => expect(v).toMatch(HEX_RE));
  });

  test('3.4: color.status.errorBg matches hex format', function () {
    expect(tokens.color.status.errorBg).toMatch(HEX_RE);
  });

  test('3.5: all color.overlay values match rgba format', function () {
    Object.values(tokens.color.overlay).forEach(v => expect(v).toMatch(RGBA_RE));
  });

});

// ─── Group 4 — opacity, space, radius ────────────────────────────────────────

describe('Group 4 — opacity, space, radius', function () {

  test('4.1: opacity has correct keys; all numbers strictly between 0 and 1', function () {
    ['subtle', 'faint', 'light', 'medium', 'strong', 'overlay'].forEach(k => {
      const v = tokens.opacity[k];
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    });
  });

  test('4.2: space has correct named keys; all non-empty strings', function () {
    ['zero', 'xs', 'sm', 'md', 'lg', 'xl', 'xl2', 'xl3', 'xl4', 'xl5'].forEach(k => {
      expect(typeof tokens.space[k]).toBe('string');
      expect(tokens.space[k].length).toBeGreaterThan(0);
    });
  });

  test('4.3: radius has correct keys as non-empty strings; sheet is absent', function () {
    ['xs', 'sm', 'md', 'lg', 'pill', 'circle'].forEach(k => {
      expect(typeof tokens.radius[k]).toBe('string');
      expect(tokens.radius[k].length).toBeGreaterThan(0);
    });
    expect(tokens.radius).not.toHaveProperty('sheet');
  });

});

// ─── Group 5 — font ───────────────────────────────────────────────────────────

describe('Group 5 — font', function () {

  test('5.1: font.family has serif, sans, mono as non-empty strings', function () {
    ['serif', 'sans', 'mono'].forEach(k => {
      expect(typeof tokens.font.family[k]).toBe('string');
      expect(tokens.font.family[k].length).toBeGreaterThan(0);
    });
  });

  test('5.2: font.size has correct keys; all values end in px', function () {
    ['xs', 'sm', 'body', 'md', 'lg', 'xl', 'xl2', 'xl3', 'display'].forEach(k => {
      expect(tokens.font.size[k]).toMatch(/px$/);
    });
  });

  test('5.3: font.weight has regular, medium, semibold, bold as numbers', function () {
    ['regular', 'medium', 'semibold', 'bold'].forEach(k => {
      expect(typeof tokens.font.weight[k]).toBe('number');
    });
  });

  test('5.4: font.letterSpacing has tight, normal, wide as non-empty strings', function () {
    ['tight', 'normal', 'wide'].forEach(k => {
      expect(typeof tokens.font.letterSpacing[k]).toBe('string');
    });
  });

});

// ─── Group 6 — zIndex ─────────────────────────────────────────────────────────

describe('Group 6 — zIndex', function () {

  test('6.1: zIndex has all required keys as numbers', function () {
    ['header', 'navBar', 'subTab', 'dropdown', 'modalBackdrop', 'modal', 'toast'].forEach(k => {
      expect(typeof tokens.zIndex[k]).toBe('number');
    });
  });

  test('6.2: zIndex layering order is correct (toast > modal > backdrop > navBar)', function () {
    expect(tokens.zIndex.toast).toBeGreaterThan(tokens.zIndex.modal);
    expect(tokens.zIndex.modal).toBeGreaterThan(tokens.zIndex.modalBackdrop);
    expect(tokens.zIndex.modalBackdrop).toBeGreaterThan(tokens.zIndex.navBar);
  });

});

// ─── Group 7 — barrel exports ─────────────────────────────────────────────────

describe('Group 7 — barrel exports (theme/index.js)', function () {

  test('7.1: named import "color" resolves; color.brand.navy is a non-empty string', function () {
    expect(typeof color.brand.navy).toBe('string');
    expect(color.brand.navy.length).toBeGreaterThan(0);
  });

  test('7.2: tokens.color.brand.navy and color.brand.navy are the same value', function () {
    expect(tokens.color.brand.navy).toBe(color.brand.navy);
  });

  test('7.3: other named exports resolve (opacity, space, radius, font, zIndex)', function () {
    expect(opacity).toBeDefined();
    expect(space).toBeDefined();
    expect(radius).toBeDefined();
    expect(font).toBeDefined();
    expect(zIndex).toBeDefined();
  });

});

// ─── Group 8 — shadow tokens ──────────────────────────────────────────────────

describe('Group 8 — shadow tokens', function () {

  test('8.1: tokens.shadow is a defined, non-null object', function () {
    expect(tokens.shadow).toBeDefined();
    expect(tokens.shadow).not.toBeNull();
    expect(typeof tokens.shadow).toBe('object');
  });

  test('8.2: shadow has exactly the four expected keys', function () {
    ['subtle', 'card', 'elevated', 'overlay'].forEach(function (k) {
      expect(tokens.shadow).toHaveProperty(k);
    });
    expect(Object.keys(tokens.shadow).length).toBe(4);
  });

  test('8.3: all shadow values are non-empty strings', function () {
    Object.entries(tokens.shadow).forEach(function ([k, v]) {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    });
  });

  test('8.4: tokens.shadow.subtle has the expected value', function () {
    expect(tokens.shadow.subtle).toBe('0 1px 4px rgba(15,31,61,0.06)');
  });

  test('8.5: tokens.shadow.card has the expected value (compound two-layer)', function () {
    expect(tokens.shadow.card).toBe('0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)');
  });

  // shadow.elevated is reserved for App.jsx call sites (locked, deferred to v2.5.x — see DESIGN_AUDIT.md §6)
  test('8.6: tokens.shadow.elevated has the expected value', function () {
    expect(tokens.shadow.elevated).toBe('0 4px 12px rgba(0,0,0,0.12)');
  });

  test('8.7: tokens.shadow.overlay has the expected value', function () {
    expect(tokens.shadow.overlay).toBe('0 4px 12px rgba(0,0,0,0.35)');
  });

  test('8.8: named export shadow from index.js resolves and matches tokens.shadow', function () {
    expect(shadow).toBeDefined();
    expect(shadow.card).toBe(tokens.shadow.card);
  });

});
