/**
 * boot-merge.test.js — regression tests for the additive boot merge logic
 * introduced in v2.2.28.
 *
 * Pure function extracted from App.jsx boot block (~line 2608):
 *   localTeams kept as source of truth;
 *   Supabase teams whose ID is NOT in localIds are appended;
 *   String() cast handles bigint vs string ID comparison.
 *
 * Group 8 — Boot merge additive logic
 *
 * Run: npm test  (from frontend/)
 */

// ---------------------------------------------------------------------------
// Local replica of the boot merge function (App.jsx ~2608-2633).
// Must stay in sync with the implementation in App.jsx.
// ---------------------------------------------------------------------------

function bootMerge(localTeams, dbTeams) {
  if (!dbTeams) return localTeams;

  var localIds = {};
  for (var li = 0; li < localTeams.length; li++) {
    localIds[String(localTeams[li].id)] = true;
  }

  var newFromDb = [];
  for (var di = 0; di < dbTeams.length; di++) {
    if (!localIds[String(dbTeams[di].id)]) {
      newFromDb.push(dbTeams[di]);
    }
  }

  if (newFromDb.length > 0) {
    return localTeams.concat(newFromDb);
  }
  return localTeams;
}

// ============================================================================
// Group 8 — Boot merge additive logic
// ============================================================================

describe('Group 8 — Boot merge additive logic', function () {

  test('8.1: new team from Supabase (unknown ID) is appended to local list', function () {
    var localTeams = [{ id: 'aaa', name: 'Local Team' }];
    var dbTeams    = [{ id: 'bbb', name: 'Supabase Team' }];
    var result = bootMerge(localTeams, dbTeams);
    expect(result).toHaveLength(2);
    expect(result.map(function(t) { return t.name; })).toContain('Supabase Team');
  });

  test('8.2: existing local team with matching ID is NOT overwritten by Supabase version', function () {
    var localTeam  = { id: 'aaa', name: 'Local Name', foo: 'local-data' };
    var localTeams = [localTeam];
    var dbTeams    = [{ id: 'aaa', name: 'DB Name', foo: 'db-data' }];
    var result = bootMerge(localTeams, dbTeams);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Local Name');
    expect(result[0].foo).toBe('local-data');
  });

  test('8.3: String() cast handles numeric team ID matching a string key', function () {
    // Supabase returns bigint IDs; localStorage stores them as numbers.
    // Both sides should be treated as equal via String() cast.
    var localTeams = [{ id: 1774297491626, name: 'Mud Hens' }];
    var dbTeams    = [{ id: '1774297491626', name: 'Mud Hens (DB)' }];
    var result = bootMerge(localTeams, dbTeams);
    // String('1774297491626') === String(1774297491626) → no duplicate added
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Mud Hens');
  });

  test('8.4: null dbTeams causes no change to local list', function () {
    var localTeams = [{ id: 'aaa', name: 'Local Team' }];
    var result = bootMerge(localTeams, null);
    expect(result).toBe(localTeams); // same reference — no copy created
    expect(result).toHaveLength(1);
  });

});
