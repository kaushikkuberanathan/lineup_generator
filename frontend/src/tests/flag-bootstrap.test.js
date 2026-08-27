/**
 * flag-bootstrap.test.js — regression tests for the URL-param feature flag
 * bootstrap (applyFlagParams / buildCleanSearch).
 *
 * Covers:
 *   - ?enable_flag=<name> sets localStorage key "flag:<name>" = "1"
 *   - ?disable_flag=<name> removes localStorage key "flag:<name>"
 *   - Other query params are preserved in the cleaned search string
 *   - Return value: true when params processed, false when none present
 *
 * NOTE on key format:
 *   The URL bootstrap writes "flag:<name>" (colon, lowercase) with value "1".
 *   This is intentionally separate from isFlagEnabled()'s "flag_<NAME>" (underscore,
 *   uppercase) with value "true"/"false". These are two different activation
 *   mechanisms — the URL bootstrap enables per-user localStorage flags that are
 *   checked directly in App.jsx (not via isFlagEnabled).
 *
 * Run: npm test  (from frontend/)
 */

import { applyFlagParams, buildCleanSearch } from '../utils/flagBootstrap.js';

// NOTE (#406/#410 Pass 4): App.jsx's real URL-bootstrap useEffect handled
// ?coach_access=mudhen2026 (sets bypass:maintenance) and ?clear_bypass
// (removes it) inline, alongside enable_flag/disable_flag — but this
// extracted module, and this test file, never learned about them. That was
// a replica-divergence bug: the "tested" module was behaviorally behind the
// real running code. Group 3 below closes that gap.

// ── localStorage mock (node environment has no window.localStorage) ──────────
var _store = {};
var localStorageMock = {
  getItem:    function(k)    { return Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null; },
  setItem:    function(k, v) { _store[k] = String(v); },
  removeItem: function(k)    { delete _store[k]; },
  clear:      function()     { _store = {}; },
};
global.localStorage = localStorageMock;

beforeEach(function () { localStorageMock.clear(); });

// ============================================================================
// Group 1 — applyFlagParams: localStorage side-effects
// ============================================================================

describe('Group 1 — applyFlagParams', function () {

  test('1.1: ?enable_flag=viewer_mode sets "flag:viewer_mode" = "1"', function () {
    applyFlagParams('?enable_flag=viewer_mode');
    expect(localStorage.getItem('flag:viewer_mode')).toBe('1');
  });

  test('1.2: ?disable_flag=viewer_mode removes "flag:viewer_mode"', function () {
    localStorage.setItem('flag:viewer_mode', '1');
    applyFlagParams('?disable_flag=viewer_mode');
    expect(localStorage.getItem('flag:viewer_mode')).toBeNull();
  });

  test('1.3: ?enable_flag= and ?disable_flag= for different flags both execute', function () {
    localStorage.setItem('flag:old_flag', '1');
    applyFlagParams('?enable_flag=new_flag&disable_flag=old_flag');
    expect(localStorage.getItem('flag:new_flag')).toBe('1');
    expect(localStorage.getItem('flag:old_flag')).toBeNull();
  });

  test('1.4: no flag params → returns false and does not write localStorage', function () {
    var result = applyFlagParams('?s=abc&view=true');
    expect(result).toBe(false);
    expect(localStorage.getItem('flag:s')).toBeNull();
  });

  test('1.5: empty search string → returns false', function () {
    expect(applyFlagParams('')).toBe(false);
  });

  test('1.6: ?enable_flag= returns true', function () {
    expect(applyFlagParams('?enable_flag=game_mode')).toBe(true);
  });

  test('1.7: ?disable_flag= returns true', function () {
    expect(applyFlagParams('?disable_flag=game_mode')).toBe(true);
  });

  test('1.8: enable then disable in separate calls — disable wins', function () {
    applyFlagParams('?enable_flag=viewer_mode');
    expect(localStorage.getItem('flag:viewer_mode')).toBe('1');
    applyFlagParams('?disable_flag=viewer_mode');
    expect(localStorage.getItem('flag:viewer_mode')).toBeNull();
  });

  test('1.9: flag name is written verbatim — case preserved', function () {
    applyFlagParams('?enable_flag=GAME_MODE');
    expect(localStorage.getItem('flag:GAME_MODE')).toBe('1');
  });
});

// ============================================================================
// Group 2 — buildCleanSearch: URL cleaning after bootstrap
// ============================================================================

describe('Group 2 — buildCleanSearch', function () {

  test('2.1: ?enable_flag=x alone → "" (fully stripped)', function () {
    expect(buildCleanSearch('?enable_flag=viewer_mode')).toBe('');
  });

  test('2.2: ?disable_flag=x alone → ""', function () {
    expect(buildCleanSearch('?disable_flag=viewer_mode')).toBe('');
  });

  test('2.3: ?enable_flag with other params → other params preserved', function () {
    var result = buildCleanSearch('?enable_flag=viewer_mode&s=abc123');
    expect(result).toContain('s=abc123');
    expect(result).not.toContain('enable_flag');
  });

  test('2.4: ?s= and ?view= preserved unchanged (no flag params present)', function () {
    var result = buildCleanSearch('?s=abc&view=true');
    expect(result).toContain('s=abc');
    expect(result).toContain('view=true');
  });

  test('2.5: empty search → ""', function () {
    expect(buildCleanSearch('')).toBe('');
  });

  test('2.6: result starts with "?" when params remain', function () {
    var result = buildCleanSearch('?enable_flag=x&game=1');
    expect(result.startsWith('?')).toBe(true);
  });

  test('2.7: both enable_flag and disable_flag stripped, other params kept', function () {
    var result = buildCleanSearch('?enable_flag=x&disable_flag=y&s=abc');
    expect(result).not.toContain('enable_flag');
    expect(result).not.toContain('disable_flag');
    expect(result).toContain('s=abc');
  });
});

// ============================================================================
// Group 3 — maintenance bypass (?coach_access= / ?clear_bypass)
// ============================================================================

describe('Group 3 — applyFlagParams: maintenance bypass', function () {

  test('3.1: ?coach_access=mudhen2026 sets "bypass:maintenance" = "1"', function () {
    applyFlagParams('?coach_access=mudhen2026');
    expect(localStorage.getItem('bypass:maintenance')).toBe('1');
  });

  test('3.2: ?coach_access= with the wrong value does NOT set the bypass', function () {
    applyFlagParams('?coach_access=wrong_code');
    expect(localStorage.getItem('bypass:maintenance')).toBeNull();
  });

  test('3.3: ?clear_bypass removes "bypass:maintenance"', function () {
    localStorage.setItem('bypass:maintenance', '1');
    applyFlagParams('?clear_bypass');
    expect(localStorage.getItem('bypass:maintenance')).toBeNull();
  });

  test('3.4: ?clear_bypass= (present with empty value) still clears the bypass — presence, not truthiness, gates this param', function () {
    localStorage.setItem('bypass:maintenance', '1');
    applyFlagParams('?clear_bypass=');
    expect(localStorage.getItem('bypass:maintenance')).toBeNull();
  });

  test('3.5: ?coach_access=mudhen2026 alone returns true', function () {
    expect(applyFlagParams('?coach_access=mudhen2026')).toBe(true);
  });

  test('3.6: ?clear_bypass alone returns true', function () {
    expect(applyFlagParams('?clear_bypass')).toBe(true);
  });

  test('3.7: coach_access and a flag param together both apply', function () {
    applyFlagParams('?enable_flag=viewer_mode&coach_access=mudhen2026');
    expect(localStorage.getItem('flag:viewer_mode')).toBe('1');
    expect(localStorage.getItem('bypass:maintenance')).toBe('1');
  });
});

describe('Group 4 — buildCleanSearch: bypass params also stripped', function () {

  test('4.1: ?coach_access=x alone → "" (fully stripped)', function () {
    expect(buildCleanSearch('?coach_access=mudhen2026')).toBe('');
  });

  test('4.2: ?clear_bypass alone → ""', function () {
    expect(buildCleanSearch('?clear_bypass')).toBe('');
  });

  test('4.3: all four params stripped together, other params kept', function () {
    var result = buildCleanSearch('?enable_flag=x&disable_flag=y&coach_access=mudhen2026&clear_bypass&s=abc');
    expect(result).not.toContain('enable_flag');
    expect(result).not.toContain('disable_flag');
    expect(result).not.toContain('coach_access');
    expect(result).not.toContain('clear_bypass');
    expect(result).toContain('s=abc');
  });
});
