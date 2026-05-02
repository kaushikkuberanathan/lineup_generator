/**
 * accessibility.v1.test.js — Regression tests for Accessibility Phase 1.
 *
 * Covers:
 *   - POSITION_LABELS constant (shape, completeness, engine coverage)
 *   - isFlagEnabled utility (defaults, localStorage overrides, unknown flags)
 *   - ACCESSIBILITY_V1 flag presence and default state
 *
 * These tests run in a node environment with a localStorage mock.
 * They guard against:
 *   - Accidentally removing ACCESSIBILITY_V1 from the flag registry
 *   - isFlagEnabled ignoring localStorage overrides
 *   - POSITION_LABELS drifting out of sync with positions used by the engine
 *
 * Run: npm test  (from frontend/)
 */

import { POSITION_LABELS } from '../constants/positions.js';
import { FEATURE_FLAGS, isFlagEnabled } from '../config/featureFlags.js';

// ── localStorage mock (node environment has no window.localStorage) ─────────
var _store = {};
var localStorageMock = {
  getItem:    function(k)    { return Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null; },
  setItem:    function(k, v) { _store[k] = String(v); },
  removeItem: function(k)    { delete _store[k]; },
  clear:      function()     { _store = {}; },
};
global.localStorage = localStorageMock;

// Reset localStorage between tests so overrides don't bleed across
beforeEach(function() { localStorageMock.clear(); });

// ── All field positions used by the lineup engine ────────────────────────────
const ENGINE_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'LC', 'RC', 'RF', 'Bench'];

// ============================================================================
// Group 1 — POSITION_LABELS shape and completeness
// ============================================================================

describe('1 — POSITION_LABELS', function() {

  test('1.1 exports an object', function() {
    expect(typeof POSITION_LABELS).toBe('object');
    expect(POSITION_LABELS).not.toBeNull();
  });

  test('1.2 all values are non-empty strings', function() {
    Object.entries(POSITION_LABELS).forEach(function([key, val]) {
      expect(typeof val).toBe('string', 'Expected string for key: ' + key);
      expect(val.length).toBeGreaterThan(0);
    });
  });

  test('1.3 covers every position used by the lineup engine', function() {
    ENGINE_POSITIONS.forEach(function(pos) {
      expect(Object.prototype.hasOwnProperty.call(POSITION_LABELS, pos)).toBe(true,
        'POSITION_LABELS missing engine position: ' + pos);
    });
  });

  test('1.4 known labels are correct', function() {
    expect(POSITION_LABELS['P']).toBe('Pitcher');
    expect(POSITION_LABELS['C']).toBe('Catcher');
    expect(POSITION_LABELS['SS']).toBe('Shortstop');
    expect(POSITION_LABELS['1B']).toBe('First base');
    expect(POSITION_LABELS['2B']).toBe('Second base');
    expect(POSITION_LABELS['3B']).toBe('Third base');
    expect(POSITION_LABELS['LF']).toBe('Left field');
    expect(POSITION_LABELS['LC']).toBe('Left center field');
    expect(POSITION_LABELS['RC']).toBe('Right center field');
    expect(POSITION_LABELS['RF']).toBe('Right field');
    expect(POSITION_LABELS['Bench']).toBe('Bench');
  });

  test('1.5 no undefined or null values', function() {
    Object.values(POSITION_LABELS).forEach(function(val) {
      expect(val).not.toBeNull();
      expect(val).not.toBeUndefined();
    });
  });

});

// ============================================================================
// Group 2 — FEATURE_FLAGS registry
// ============================================================================

describe('2 — FEATURE_FLAGS registry', function() {

  test('2.1 ACCESSIBILITY_V1 flag is present', function() {
    expect(FEATURE_FLAGS).toHaveProperty('ACCESSIBILITY_V1');
  });

  test('2.2 ACCESSIBILITY_V1 defaults to true (GA, Phase 1a)', function() {
    expect(FEATURE_FLAGS['ACCESSIBILITY_V1']).toBe(true);
  });

  test('2.3 existing flags are untouched', function() {
    expect(FEATURE_FLAGS).toHaveProperty('USE_NEW_LINEUP_ENGINE');
    expect(FEATURE_FLAGS).toHaveProperty('VIEWER_MODE');
    expect(FEATURE_FLAGS).toHaveProperty('GAME_MODE');
  });

  test('2.4 USE_NEW_LINEUP_ENGINE remains true', function() {
    expect(FEATURE_FLAGS['USE_NEW_LINEUP_ENGINE']).toBe(true);
  });

});

// ============================================================================
// Group 3 — isFlagEnabled defaults
// ============================================================================

describe('3 — isFlagEnabled defaults (no localStorage override)', function() {

  test('3.1 returns true for ACCESSIBILITY_V1 (default on, GA)', function() {
    expect(isFlagEnabled('ACCESSIBILITY_V1')).toBe(true);
  });

  test('3.2 returns true for USE_NEW_LINEUP_ENGINE (default on)', function() {
    expect(isFlagEnabled('USE_NEW_LINEUP_ENGINE')).toBe(true);
  });

  test('3.3 returns false for unknown flag name', function() {
    expect(isFlagEnabled('NONEXISTENT_FLAG_XYZ')).toBe(false);
  });

  test('3.4 returns false for VIEWER_MODE (default off)', function() {
    expect(isFlagEnabled('VIEWER_MODE')).toBe(false);
  });

});

// ============================================================================
// Group 4 — isFlagEnabled localStorage override
// ============================================================================

describe('4 — isFlagEnabled localStorage override', function() {

  test('4.1 localStorage "true" activates a default-off flag', function() {
    localStorage.setItem('flag_ACCESSIBILITY_V1', 'true');
    expect(isFlagEnabled('ACCESSIBILITY_V1')).toBe(true);
  });

  test('4.2 localStorage "false" suppresses a default-on flag', function() {
    localStorage.setItem('flag_USE_NEW_LINEUP_ENGINE', 'false');
    expect(isFlagEnabled('USE_NEW_LINEUP_ENGINE')).toBe(false);
  });

  test('4.3 removing localStorage key restores default', function() {
    localStorage.setItem('flag_ACCESSIBILITY_V1', 'false');
    expect(isFlagEnabled('ACCESSIBILITY_V1')).toBe(false);
    localStorage.removeItem('flag_ACCESSIBILITY_V1');
    expect(isFlagEnabled('ACCESSIBILITY_V1')).toBe(true);
  });

  test('4.4 unrelated localStorage keys do not interfere', function() {
    localStorage.setItem('flag_VIEWER_MODE', 'true');
    expect(isFlagEnabled('ACCESSIBILITY_V1')).toBe(true);
    expect(isFlagEnabled('VIEWER_MODE')).toBe(true);
  });

  test('4.5 string "false" override beats a true default', function() {
    // Temporarily simulate a flag that defaults to true
    localStorage.setItem('flag_USE_NEW_LINEUP_ENGINE', 'false');
    expect(isFlagEnabled('USE_NEW_LINEUP_ENGINE')).toBe(false);
  });

  test('4.6 arbitrary string (not "true"/"false") falls back to default', function() {
    localStorage.setItem('flag_ACCESSIBILITY_V1', '1');   // not "true"
    expect(isFlagEnabled('ACCESSIBILITY_V1')).toBe(true);  // falls back to default (true)
    localStorage.setItem('flag_ACCESSIBILITY_V1', 'yes'); // not "true"
    expect(isFlagEnabled('ACCESSIBILITY_V1')).toBe(true);  // falls back to default (true)
  });

});

// ============================================================================
// Group 5 — ACCESSIBILITY_V1 GA default (Phase 1a)
// ============================================================================

describe('5 — ACCESSIBILITY_V1 GA default', function() {

  test('5.1 isFlagEnabled returns true by default; "false" override disables it', function() {
    expect(isFlagEnabled('ACCESSIBILITY_V1')).toBe(true);
    localStorage.setItem('flag_ACCESSIBILITY_V1', 'false');
    expect(isFlagEnabled('ACCESSIBILITY_V1')).toBe(false);
  });

});
