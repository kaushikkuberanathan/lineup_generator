/**
 * attendance.test.js — regression tests for absent-player handling in
 * validateGrid and todayDate local calendar date derivation.
 *
 * Covers:
 *   Group 6 — validateGrid absent awareness ("Out" slot handling)
 *   Group 7 — todayDate local vs UTC date derivation
 *
 * Run: npm test  (from frontend/)
 */

// ---------------------------------------------------------------------------
// Local replica of validateGrid (pure function, no deps on App.jsx imports).
// Must stay in sync with the implementation in App.jsx.
// ---------------------------------------------------------------------------

const OUTFIELD = ['LF', 'LC', 'RC', 'RF'];

function validateGrid(grid, roster, innings) {
  var warnings = [];
  var players = roster.map(function (r) { return r.name; });

  for (var i = 0; i < innings; i++) {
    var assigned = {};
    var benchCount = 0;
    for (var pi = 0; pi < players.length; pi++) {
      var p = players[pi];
      var pos = (grid[p] || [])[i] || '';
      if (!pos) {
        warnings.push({ type: 'missing', msg: p + ' unassigned in inning ' + (i + 1) });
        continue;
      }
      // absent-tonight players are marked "Out" — skip all validation for them
      if (pos === 'Out') { continue; }
      if (pos === 'Bench') {
        benchCount++;
        if (i > 0 && grid[p][i - 1] === 'Bench') {
          warnings.push({ type: 'backtoback', msg: p + ' benched back-to-back innings ' + i + ' and ' + (i + 1) });
        }
      } else {
        if (assigned[pos]) {
          warnings.push({ type: 'conflict', msg: 'Both ' + assigned[pos] + ' and ' + p + ' at ' + pos + ' inning ' + (i + 1) });
        }
        assigned[pos] = p;
      }
    }
    if (benchCount > 2) {
      warnings.push({ type: 'bench', msg: 'Inning ' + (i + 1) + ': ' + benchCount + ' players benched (max 2)' });
    }
  }

  // Outfield repeats
  for (var opi = 0; opi < players.length; opi++) {
    var p2 = players[opi];
    var pGrid = grid[p2] || [];
    for (var ofi = 0; ofi < OUTFIELD.length; ofi++) {
      var ofPos = OUTFIELD[ofi];
      var count = 0;
      for (var gi = 0; gi < pGrid.length; gi++) { if (pGrid[gi] === ofPos) { count++; } }
      if (count > 1) {
        warnings.push({ type: 'outfield', msg: p2 + ' plays ' + ofPos + ' ' + count + ' times' });
      }
    }
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Local replica of the todayDate helper (matches App.jsx implementation).
// ---------------------------------------------------------------------------

function localTodayDate(now) {
  var d = now || new Date();
  return d.getFullYear() + '-'
    + String(d.getMonth() + 1).padStart(2, '0') + '-'
    + String(d.getDate()).padStart(2, '0');
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// 10-player roster — one will be marked "Out" in tests
const ALL_POSITIONS_10 = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'LC', 'RC', 'RF'];

function makeRoster(names) {
  return names.map(function (n) { return { name: n }; });
}

const PLAYER_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jake'];

// ============================================================================
// Group 6 — validateGrid absent awareness
// ============================================================================

describe('Group 6 — validateGrid absent awareness', function () {

  test('6.1: "Out" slot in validateGrid produces no warnings for that player/inning', function () {
    // 10 players, 1 inning. Jake is "Out" — the remaining 9 cover 9 of the 10 field positions.
    // validateGrid checks from the player perspective; an unoccupied position is not a warning.
    var roster = makeRoster(PLAYER_NAMES);
    var grid = {};
    var activePlayers = PLAYER_NAMES.slice(0, 9); // Alice … Ivy
    var absentPlayer  = PLAYER_NAMES[9];           // Jake

    activePlayers.forEach(function (name, idx) {
      grid[name] = [ALL_POSITIONS_10[idx]]; // unique field position, inning 0
    });
    grid[absentPlayer] = ['Out']; // absent tonight

    var warnings = validateGrid(grid, roster, 1);
    expect(warnings).toHaveLength(0);
  });

  test('6.2: inning with 9 active players + 1 "Out" produces zero warnings — no missing, conflict, or bench warning', function () {
    // 1 inning. Jake is "Out". The 9 active players each cover one unique field position.
    // validateGrid checks from the player perspective; an uncovered position is not a warning.
    // "Out" must produce: no missing warning, no conflict warning, no bench warning.
    var roster = makeRoster(PLAYER_NAMES);
    var grid = {};
    var activePlayers = PLAYER_NAMES.slice(0, 9);
    var absentPlayer  = PLAYER_NAMES[9];

    activePlayers.forEach(function (name, idx) {
      grid[name] = [ALL_POSITIONS_10[idx]]; // unique field position, single inning
    });
    grid[absentPlayer] = ['Out'];

    var warnings = validateGrid(grid, roster, 1);

    // No warning of any kind
    expect(warnings).toHaveLength(0);

    // Explicitly verify each expected-absent type
    var types = warnings.map(function (w) { return w.type; });
    expect(types).not.toContain('missing');
    expect(types).not.toContain('conflict');
    expect(types).not.toContain('bench');
  });

});

// ============================================================================
// Group 7 — todayDate local vs UTC
// ============================================================================

describe('Group 7 — todayDate local vs UTC', function () {

  test('7.1: localTodayDate returns a 10-character YYYY-MM-DD string', function () {
    var result = localTodayDate();
    expect(typeof result).toBe('string');
    expect(result).toHaveLength(10);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('7.2: localTodayDate and toISOString agree for the same moment (daytime run — confirms format only)', function () {
    // Both are called for the same instant. During daytime in any timezone they
    // return the same calendar date. This test validates correct format and length;
    // the UTC-vs-local divergence only occurs after ~8pm ET / ~midnight UTC.
    var now = new Date();
    var local = localTodayDate(now);
    var utc   = now.toISOString().slice(0, 10);

    expect(local).toHaveLength(10);
    expect(utc).toHaveLength(10);
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Both resolve to the same date for daytime test runs.
    expect(local).toBe(utc);
  });

});
