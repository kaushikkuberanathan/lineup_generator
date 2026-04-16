/**
 * attendance.test.js — regression tests for absent-player handling across
 * the full attendance pipeline: filtering, toggling, pruning, and grid validation.
 *
 * Covers:
 *   Group 1 — activeBattingOrder filtering (absent players excluded from order)
 *   Group 2 — toggleAbsentTonight state transition (pure toggle logic)
 *   Group 3 — attendanceOverrides prune (stale date cutoff at 3 days)
 *   Group 4 — active roster filtering (absent players excluded from roster)
 *   Group 5 — insufficient active players guard (< 9 active blocks auto-assign)
 *   Group 6 — validateGrid absent awareness ("Out" slot handling)
 *   Group 7 — todayDate local vs UTC date derivation
 *
 * Run: npm test  (from frontend/)
 */

// ---------------------------------------------------------------------------
// Pure helpers — local replicas of App.jsx inline logic.
// Each must stay in sync with the matching implementation in App.jsx.
// ---------------------------------------------------------------------------

/** activeBattingOrder: battingOrder filtered by absentTonight (App.jsx ~3198). */
function filterBattingOrder(battingOrder, absentTonight) {
  return battingOrder.filter(function(name) { return absentTonight.indexOf(name) < 0; });
}

/** toggleAbsentTonight pure transition (App.jsx ~3414). */
function toggleAbsent(absentTonight, playerName) {
  return absentTonight.indexOf(playerName) >= 0
    ? absentTonight.filter(function(n) { return n !== playerName; })
    : absentTonight.concat([playerName]);
}

/** pruneAttendance: drop entries older than 3 days (App.jsx ~3395). */
function pruneAttendance(overrides, now) {
  var cutoff = new Date((now || Date.now()) - 3 * 86400000).toISOString().slice(0, 10);
  var pruned = {};
  var keys = Object.keys(overrides);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i] >= cutoff) { pruned[keys[i]] = overrides[keys[i]]; }
  }
  return pruned;
}

/** activeRoster: roster filtered to exclude absent players (App.jsx ~3595). */
function filterRoster(roster, absentTonight) {
  return roster.filter(function(r) { return absentTonight.indexOf(r.name) < 0; });
}

/** canAutoAssign guard: need at least 9 active players (App.jsx ~3346). */
function canAutoAssign(rosterLength, absentCount) {
  return (rosterLength - absentCount) >= 9;
}

// ============================================================================
// Group 1 — activeBattingOrder filtering
// ============================================================================

describe('Group 1 — activeBattingOrder filtering', function () {

  test('1.1: no absent players — full batting order returned unchanged', function () {
    var order = ['Alice', 'Bob', 'Carol', 'Dave'];
    expect(filterBattingOrder(order, [])).toEqual(['Alice', 'Bob', 'Carol', 'Dave']);
  });

  test('1.2: one absent player — that player removed, others keep relative order', function () {
    var order = ['Alice', 'Bob', 'Carol', 'Dave'];
    expect(filterBattingOrder(order, ['Bob'])).toEqual(['Alice', 'Carol', 'Dave']);
  });

  test('1.3: all players absent — empty array returned', function () {
    var order = ['Alice', 'Bob'];
    expect(filterBattingOrder(order, ['Alice', 'Bob'])).toHaveLength(0);
  });

  test('1.4: absent name not in batting order — no change', function () {
    var order = ['Alice', 'Bob', 'Carol'];
    expect(filterBattingOrder(order, ['Dave'])).toEqual(['Alice', 'Bob', 'Carol']);
  });

  test('1.5: multiple absent players in non-contiguous positions', function () {
    var order = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'];
    // Alice (1st) and Carol (3rd) absent
    expect(filterBattingOrder(order, ['Alice', 'Carol'])).toEqual(['Bob', 'Dave', 'Eve']);
  });

});

// ============================================================================
// Group 2 — toggleAbsentTonight state transition
// ============================================================================

describe('Group 2 — toggleAbsentTonight state transition', function () {

  test('2.1: toggling a present player marks them absent', function () {
    var result = toggleAbsent([], 'Alice');
    expect(result).toContain('Alice');
    expect(result).toHaveLength(1);
  });

  test('2.2: toggling an absent player removes them (marks present)', function () {
    var result = toggleAbsent(['Alice', 'Bob'], 'Alice');
    expect(result).not.toContain('Alice');
    expect(result).toContain('Bob');
  });

  test('2.3: double-toggle returns original contents', function () {
    var after1 = toggleAbsent(['Alice'], 'Bob');
    var after2 = toggleAbsent(after1, 'Bob');
    expect(after2).toEqual(['Alice']);
  });

  test('2.4: toggle does not mutate the original array', function () {
    var original = ['Alice'];
    var result = toggleAbsent(original, 'Bob');
    expect(original).toHaveLength(1);
    expect(result).toHaveLength(2);
  });

});

// ============================================================================
// Group 3 — attendanceOverrides prune (stale date cutoff)
// ============================================================================

describe('Group 3 — attendanceOverrides prune (stale date cutoff)', function () {

  test('3.1: today\'s entry is retained', function () {
    var today = new Date().toISOString().slice(0, 10);
    var overrides = {}; overrides[today] = ['Alice'];
    expect(pruneAttendance(overrides)[today]).toEqual(['Alice']);
  });

  test('3.2: entry from 4 days ago is pruned', function () {
    var fourAgo = new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10);
    var overrides = {}; overrides[fourAgo] = ['Bob'];
    expect(pruneAttendance(overrides)[fourAgo]).toBeUndefined();
  });

  test('3.3: entry exactly at cutoff (3 days ago) is retained (>= comparison)', function () {
    var threeAgo = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    var overrides = {}; overrides[threeAgo] = ['Carol'];
    expect(pruneAttendance(overrides)[threeAgo]).toEqual(['Carol']);
  });

  test('3.4: empty overrides returns empty object', function () {
    expect(Object.keys(pruneAttendance({}))).toHaveLength(0);
  });

  test('3.5: mix of old and current entries — only current survives', function () {
    var today   = new Date().toISOString().slice(0, 10);
    var weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    var overrides = {}; overrides[today] = ['Alice']; overrides[weekAgo] = ['Bob'];
    var result = pruneAttendance(overrides);
    expect(result[today]).toEqual(['Alice']);
    expect(result[weekAgo]).toBeUndefined();
  });

});

// ============================================================================
// Group 4 — active roster filtering
// ============================================================================

describe('Group 4 — active roster filtering', function () {

  test('4.1: no absent players — full roster returned', function () {
    var roster = [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Carol' }];
    expect(filterRoster(roster, [])).toHaveLength(3);
  });

  test('4.2: one absent player — roster size decreases by 1', function () {
    var roster = [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Carol' }];
    var result = filterRoster(roster, ['Bob']);
    expect(result).toHaveLength(2);
    expect(result.map(function(r) { return r.name; })).not.toContain('Bob');
  });

  test('4.3: roster objects are reference-identical — no cloning', function () {
    var alice = { name: 'Alice', tags: ['reliable'] };
    var result = filterRoster([alice, { name: 'Bob' }], []);
    expect(result[0]).toBe(alice);
  });

  test('4.4: absent name not in roster — no change', function () {
    var roster = [{ name: 'Alice' }, { name: 'Bob' }];
    expect(filterRoster(roster, ['Dave'])).toHaveLength(2);
  });

});

// ============================================================================
// Group 5 — insufficient active players guard
// ============================================================================

describe('Group 5 — insufficient active players guard', function () {

  test('5.1: 10 players, 0 absent — can auto-assign', function () {
    expect(canAutoAssign(10, 0)).toBe(true);
  });

  test('5.2: 10 players, 1 absent — can auto-assign (9 active)', function () {
    expect(canAutoAssign(10, 1)).toBe(true);
  });

  test('5.3: 10 players, 2 absent — cannot auto-assign (8 active < 9)', function () {
    expect(canAutoAssign(10, 2)).toBe(false);
  });

  test('5.4: 11 players, 2 absent — can auto-assign (9 active exactly)', function () {
    expect(canAutoAssign(11, 2)).toBe(true);
  });

  test('5.5: 9 players, 0 absent — can auto-assign (exactly 9)', function () {
    expect(canAutoAssign(9, 0)).toBe(true);
  });

  test('5.6: 9 players, 1 absent — cannot auto-assign (8 active)', function () {
    expect(canAutoAssign(9, 1)).toBe(false);
  });

});

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

// ---------------------------------------------------------------------------
// Group 9 helper
// ---------------------------------------------------------------------------

/** buildSharePayload: mirrors shareCurrentLineup payload
 *  construction from App.jsx lines 3590–3606.
 *  activeBattingOrder is already pre-filtered (absent removed).
 *  roster is filtered inline at call time.
 *  absentNames is undefined when no one is absent.
 */
function buildSharePayload(roster, activeBattingOrder, absentTonight) {
  return {
    batting: activeBattingOrder,
    roster: roster
      .filter(function(r) { return absentTonight.indexOf(r.name) < 0; })
      .map(function(r) { return r.name; }),
    absentNames: absentTonight.length > 0
      ? absentTonight.slice()
      : undefined
  };
}

// ============================================================================
// Group 9 — share payload construction
// ============================================================================

describe('Group 9 — share payload construction', function () {

  var fullRoster = [
    { name: 'Alice' }, { name: 'Bob' },
    { name: 'Carol' }, { name: 'Dave' }
  ];

  test('9.1: no absent — batting equals activeBattingOrder exactly', function () {
    var p = buildSharePayload(fullRoster, ['Alice', 'Bob', 'Carol', 'Dave'], []);
    expect(p.batting).toEqual(['Alice', 'Bob', 'Carol', 'Dave']);
  });

  test('9.2: no absent — roster contains all player names', function () {
    var p = buildSharePayload(fullRoster, ['Alice', 'Bob', 'Carol', 'Dave'], []);
    expect(p.roster).toEqual(['Alice', 'Bob', 'Carol', 'Dave']);
  });

  test('9.3: no absent — absentNames is undefined', function () {
    var p = buildSharePayload(fullRoster, ['Alice', 'Bob', 'Carol', 'Dave'], []);
    expect(p.absentNames).toBeUndefined();
  });

  test('9.4: 1 absent — absent player not in payload roster', function () {
    var p = buildSharePayload(fullRoster, ['Alice', 'Carol', 'Dave'], ['Bob']);
    expect(p.roster).not.toContain('Bob');
  });

  test('9.5: 1 absent — payload batting matches pre-filtered activeBattingOrder', function () {
    var p = buildSharePayload(fullRoster, ['Alice', 'Carol', 'Dave'], ['Bob']);
    expect(p.batting).toEqual(['Alice', 'Carol', 'Dave']);
  });

  test('9.6: 1 absent — absentNames contains the absent player name', function () {
    var p = buildSharePayload(fullRoster, ['Alice', 'Carol', 'Dave'], ['Bob']);
    expect(p.absentNames).toContain('Bob');
  });

  test('9.7: all players absent — roster is empty array', function () {
    var p = buildSharePayload(fullRoster, [], ['Alice', 'Bob', 'Carol', 'Dave']);
    expect(p.roster).toHaveLength(0);
  });

  test('9.8: all players absent — batting is empty array', function () {
    var p = buildSharePayload(fullRoster, [], ['Alice', 'Bob', 'Carol', 'Dave']);
    expect(p.batting).toHaveLength(0);
  });

  test('9.9: absent player not in roster — payload unchanged', function () {
    var p = buildSharePayload(fullRoster, ['Alice', 'Bob'], ['ZZZ']);
    expect(p.roster).toHaveLength(4);
  });

  test('9.10: absentNames is a copy — mutating it does not affect source', function () {
    var absent = ['Bob'];
    var p = buildSharePayload(fullRoster, ['Alice'], absent);
    p.absentNames.push('MUTATED');
    expect(absent).toHaveLength(1);
  });

});

// ---------------------------------------------------------------------------
// Group 10 helper
// ---------------------------------------------------------------------------

/** outByInning: mirrors SharedView line 2271 pattern —
 *  for each inning, find all players whose grid slot === "Out".
 */
function computeOutByInning(rosterNames, grid, innings) {
  var innArr = [];
  for (var i = 0; i < innings; i++) { innArr.push(i); }
  return innArr.map(function(ii) {
    return rosterNames.filter(function(n) {
      return (grid[n] || [])[ii] === 'Out';
    });
  });
}

// ============================================================================
// Group 10 — Out-per-inning grid detection
// ============================================================================

describe('Group 10 — Out-per-inning grid detection', function () {

  test('10.1: no Out slots — all inning arrays are empty', function () {
    var grid = { Alice: ['P', 'SS'], Bob: ['C', '1B'] };
    var result = computeOutByInning(['Alice', 'Bob'], grid, 2);
    expect(result[0]).toHaveLength(0);
    expect(result[1]).toHaveLength(0);
  });

  test('10.2: one player Out in inning 0 — appears in index 0 only', function () {
    var grid = { Alice: ['Out', 'P'], Bob: ['C', '1B'] };
    var result = computeOutByInning(['Alice', 'Bob'], grid, 2);
    expect(result[0]).toContain('Alice');
    expect(result[1]).not.toContain('Alice');
  });

  test('10.3: player Out every inning — appears in all inning arrays', function () {
    var grid = { Alice: ['Out', 'Out', 'Out'], Bob: ['P', 'C', 'SS'] };
    var result = computeOutByInning(['Alice', 'Bob'], grid, 3);
    result.forEach(function(inn) { expect(inn).toContain('Alice'); });
  });

  test('10.4: multiple Out players same inning — both appear', function () {
    var grid = { Alice: ['Out', 'P'], Bob: ['Out', 'C'] };
    var result = computeOutByInning(['Alice', 'Bob'], grid, 2);
    expect(result[0]).toContain('Alice');
    expect(result[0]).toContain('Bob');
  });

  test('10.5: Bench slot is not treated as Out', function () {
    var grid = { Alice: ['Bench', 'P'], Bob: ['C', '1B'] };
    var result = computeOutByInning(['Alice', 'Bob'], grid, 2);
    expect(result[0]).not.toContain('Alice');
  });

  test('10.6: player missing from grid entirely — not counted as Out', function () {
    var grid = { Alice: ['P', 'SS'] };
    var result = computeOutByInning(['Alice', 'Ghost'], grid, 2);
    expect(result[0]).not.toContain('Ghost');
  });

  test('10.7: innings count respected — result length equals innings param', function () {
    var grid = { Alice: ['P', 'C', 'SS', '1B', '2B', '3B'] };
    var result = computeOutByInning(['Alice'], grid, 6);
    expect(result).toHaveLength(6);
  });

});
