/**
 * migration.test.js — regression tests for migrateRoster, migrateSchedule,
 * migrateBattingPerf, and mergeLocalScheduleFields.
 *
 * These functions are the primary defense against silent data loss during
 * Supabase hydration. The most critical cases are Group 4 (mergeLocalScheduleFields)
 * which guard against the snackDuty/gameBall/scoreReported reset bug.
 *
 * Run: npm test  (from frontend/)
 */

import {
  migrateRoster,
  migrateSchedule,
  migrateBattingPerf,
  mergeLocalScheduleFields,
} from '../utils/migrations.js';

// ============================================================================
// Group 1 — migrateRoster: V2 field defaults and legacy skill rename
// ============================================================================

describe('Group 1 — migrateRoster', function () {

  test('1.1: V1 player with no V2 fields gets all fielding defaults', function () {
    var result = migrateRoster([{ name: 'John Smith' }]);
    var p = result[0];
    expect(p.reliability).toBe('average');
    expect(p.reaction).toBe('average');
    expect(p.armStrength).toBe('average');
    expect(p.ballType).toBe('developing');
    expect(p.contact).toBe('medium');
    expect(p.power).toBe('low');
    expect(p.swingDiscipline).toBe('free_swinger');
    expect(p.speed).toBe('average');
    expect(p.developmentFocus).toBe('balanced');
  });

  test('1.2: explicit V2 field values are preserved — not overwritten by defaults', function () {
    var player = {
      name: 'Jane Doe',
      reliability: 'high',
      reaction: 'quick',
      armStrength: 'strong',
      contact: 'high',
      speed: 'fast',
    };
    var result = migrateRoster([player]);
    expect(result[0].reliability).toBe('high');
    expect(result[0].reaction).toBe('quick');
    expect(result[0].armStrength).toBe('strong');
    expect(result[0].contact).toBe('high');
    expect(result[0].speed).toBe('fast');
  });

  test('1.3: legacy needsRoutine skill is renamed to developing', function () {
    var result = migrateRoster([{ name: 'Player', skills: ['needsRoutine', 'coachable'] }]);
    expect(result[0].skills).not.toContain('needsRoutine');
    expect(result[0].skills).toContain('developing');
    expect(result[0].skills).toContain('coachable');
  });

  test('1.4: needsRoutine removed (not duplicated) when developing already present', function () {
    var result = migrateRoster([{ name: 'Player', skills: ['needsRoutine', 'developing', 'coachable'] }]);
    var devCount = result[0].skills.filter(function (s) { return s === 'developing'; }).length;
    expect(devCount).toBe(1);
    expect(result[0].skills).not.toContain('needsRoutine');
  });

  test('1.5: firstName and lastName derived from name when not present', function () {
    var result = migrateRoster([{ name: 'John Smith' }]);
    expect(result[0].firstName).toBe('John');
    expect(result[0].lastName).toBe('Smith');
  });

  test('1.6: multi-word last name split correctly', function () {
    var result = migrateRoster([{ name: 'Carlos De La Cruz' }]);
    expect(result[0].firstName).toBe('Carlos');
    expect(result[0].lastName).toBe('De La Cruz');
  });

  test('1.7: existing firstName/lastName preserved — not overwritten by name split', function () {
    var result = migrateRoster([{ name: 'J Smith', firstName: 'Jonathan', lastName: 'Smith' }]);
    expect(result[0].firstName).toBe('Jonathan');
    expect(result[0].lastName).toBe('Smith');
  });

  test('1.8: unknown/future fields on player are preserved (spread-first rule)', function () {
    var result = migrateRoster([{ name: 'Player', customFieldXYZ: 'special', walkUpLink: 'https://example.com' }]);
    expect(result[0].customFieldXYZ).toBe('special');
    expect(result[0].walkUpLink).toBe('https://example.com');
  });

  test('1.9: boolean V2 fields default to false when missing', function () {
    var result = migrateRoster([{ name: 'Player' }]);
    var p = result[0];
    expect(p.skipBench).toBe(false);
    expect(p.outThisGame).toBe(false);
    expect(p.knowsWhereToThrow).toBe(false);
    expect(p.callsForBall).toBe(false);
    expect(p.backsUpPlays).toBe(false);
    expect(p.anticipatesPlays).toBe(false);
    expect(p.tracksBallWell).toBe(false);
    expect(p.patientAtPlate).toBe(false);
    expect(p.confidentHitter).toBe(false);
    expect(p.runsThroughFirst).toBe(false);
    expect(p.listensToCoaches).toBe(false);
    expect(p.awareOnBases).toBe(false);
  });

  test('1.10: non-array input returned unchanged', function () {
    expect(migrateRoster(null)).toBeNull();
    expect(migrateRoster(undefined)).toBeUndefined();
    expect(migrateRoster({})).toEqual({});
  });

  test('1.11: empty array returns empty array', function () {
    expect(migrateRoster([])).toEqual([]);
  });

  test('1.12: tags, dislikes, prefs, batSkills default to empty arrays', function () {
    var result = migrateRoster([{ name: 'Player' }]);
    expect(Array.isArray(result[0].tags)).toBe(true);
    expect(Array.isArray(result[0].dislikes)).toBe(true);
    expect(Array.isArray(result[0].prefs)).toBe(true);
    expect(Array.isArray(result[0].batSkills)).toBe(true);
  });

  test('1.13: existing true boolean values not overwritten by false defaults', function () {
    var player = { name: 'Player', skipBench: true, callsForBall: true, patientAtPlate: true };
    var result = migrateRoster([player]);
    expect(result[0].skipBench).toBe(true);
    expect(result[0].callsForBall).toBe(true);
    expect(result[0].patientAtPlate).toBe(true);
  });
});

// ============================================================================
// Group 2 — migrateSchedule: game object normalization
// ============================================================================

describe('Group 2 — migrateSchedule', function () {

  test('2.1: bare game object gets all required fields with correct defaults', function () {
    var result = migrateSchedule([{ id: 'g1' }]);
    var g = result[0];
    expect(g.date).toBe('');
    expect(g.time).toBe('');
    expect(g.location).toBe('');
    expect(g.opponent).toBe('');
    expect(g.result).toBe('');
    expect(g.ourScore).toBe('');
    expect(g.theirScore).toBe('');
    expect(g.home).toBe(false);
    expect(g.snackDuty).toBe('');
    expect(g.snackNote).toBe('');
    expect(g.gameBall).toBe('');
    expect(typeof g.battingPerf).toBe('object');
  });

  test('2.2: existing snackDuty and gameBall values preserved', function () {
    var game = { id: 'g1', snackDuty: 'Smith family', gameBall: 'Jake Martinez' };
    var result = migrateSchedule([game]);
    expect(result[0].snackDuty).toBe('Smith family');
    expect(result[0].gameBall).toBe('Jake Martinez');
  });

  test('2.3: null snackDuty replaced with empty string (|| "" coercion)', function () {
    var result = migrateSchedule([{ id: 'g1', snackDuty: null }]);
    expect(result[0].snackDuty).toBe('');
  });

  test('2.4: null gameBall replaced with empty string', function () {
    var result = migrateSchedule([{ id: 'g1', gameBall: null }]);
    expect(result[0].gameBall).toBe('');
  });

  test('2.5: scoreReported preserved via Object.assign spread (not in override list)', function () {
    var game = { id: 'g1', scoreReported: true };
    var result = migrateSchedule([game]);
    expect(result[0].scoreReported).toBe(true);
  });

  test('2.6: game without id gets a generated string id', function () {
    var result = migrateSchedule([{ opponent: 'Tigers' }]);
    expect(typeof result[0].id).toBe('string');
    expect(result[0].id.length).toBeGreaterThan(0);
  });

  test('2.7: battingPerf defaults to {} when missing', function () {
    var result = migrateSchedule([{ id: 'g1' }]);
    expect(result[0].battingPerf).toEqual({});
  });

  test('2.8: existing battingPerf object preserved', function () {
    var perf = { 'John Smith': { ab: 3, h: 1 } };
    var result = migrateSchedule([{ id: 'g1', battingPerf: perf }]);
    expect(result[0].battingPerf).toEqual(perf);
  });

  test('2.9: non-array input returned unchanged', function () {
    expect(migrateSchedule(null)).toBeNull();
    expect(migrateSchedule(undefined)).toBeUndefined();
  });

  test('2.10: empty array returns empty array', function () {
    expect(migrateSchedule([])).toEqual([]);
  });
});

// ============================================================================
// Group 3 — migrateBattingPerf: initial+lastName key remapping
// ============================================================================

describe('Group 3 — migrateBattingPerf', function () {

  var roster = [
    { name: 'John Smith' },
    { name: 'Maria Garcia' },
  ];

  test('3.1: initial+lastName key ("J Smith") remapped to full name ("John Smith")', function () {
    var schedule = [{ id: 'g1', battingPerf: { 'J Smith': { ab: 3, h: 1 } } }];
    var result = migrateBattingPerf(schedule, roster);
    expect(result[0].battingPerf['John Smith']).toEqual({ ab: 3, h: 1 });
    expect(result[0].battingPerf['J Smith']).toBeUndefined();
  });

  test('3.2: already-correct full name keys pass through unchanged (needsMigration=false)', function () {
    var schedule = [{ id: 'g1', battingPerf: { 'John Smith': { ab: 4, h: 2 }, 'Maria Garcia': { ab: 3, h: 0 } } }];
    var result = migrateBattingPerf(schedule, roster);
    // Returned same object reference when no migration needed
    expect(result[0].battingPerf['John Smith']).toEqual({ ab: 4, h: 2 });
    expect(result[0].battingPerf['Maria Garcia']).toEqual({ ab: 3, h: 0 });
  });

  test('3.3: unrecognized key (no matching player) preserved as-is', function () {
    var schedule = [{ id: 'g1', battingPerf: { 'Unknown Player': { ab: 1, h: 0 } } }];
    var result = migrateBattingPerf(schedule, roster);
    expect(result[0].battingPerf['Unknown Player']).toEqual({ ab: 1, h: 0 });
  });

  test('3.4: empty battingPerf game passes through unchanged', function () {
    var game = { id: 'g1', battingPerf: {} };
    var result = migrateBattingPerf([game], roster);
    expect(result[0]).toBe(game); // same reference — not reprocessed
  });

  test('3.5: empty roster returns schedule unchanged', function () {
    var schedule = [{ id: 'g1', battingPerf: { 'J Smith': { ab: 1, h: 0 } } }];
    var result = migrateBattingPerf(schedule, []);
    expect(result).toBe(schedule);
  });

  test('3.6: null/undefined schedule returns input', function () {
    expect(migrateBattingPerf(null, roster)).toBeNull();
    expect(migrateBattingPerf(undefined, roster)).toBeUndefined();
  });
});

// ============================================================================
// Group 4 — mergeLocalScheduleFields: hydration rescue logic
// This is the primary guard against the snackDuty/gameBall/scoreReported
// reset bug. Changes here can silently destroy coach-entered data.
// ============================================================================

const MERGE_FIELDS = ['scoreReported', 'snackDuty', 'snackNote', 'gameBall', 'usScore', 'oppScore', 'gameStatus', 'finalizedAt'];

describe('Group 4 — mergeLocalScheduleFields (hydration rescue)', function () {

  test('4.1: local scoreReported=true wins over db scoreReported=false', function () {
    var db    = [{ id: 'g1', scoreReported: false, snackDuty: '', gameBall: '' }];
    var local = [{ id: 'g1', scoreReported: true,  snackDuty: '', gameBall: '' }];
    var result = mergeLocalScheduleFields(db, local, MERGE_FIELDS);
    expect(result[0].scoreReported).toBe(true);
  });

  test('4.2: local snackDuty wins over empty db snackDuty', function () {
    var db    = [{ id: 'g1', snackDuty: '',            scoreReported: false }];
    var local = [{ id: 'g1', snackDuty: 'Smith family', scoreReported: false }];
    var result = mergeLocalScheduleFields(db, local, MERGE_FIELDS);
    expect(result[0].snackDuty).toBe('Smith family');
  });

  test('4.3: local gameBall wins over empty db gameBall', function () {
    var db    = [{ id: 'g1', gameBall: '',    scoreReported: false }];
    var local = [{ id: 'g1', gameBall: 'Jake', scoreReported: false }];
    var result = mergeLocalScheduleFields(db, local, MERGE_FIELDS);
    expect(result[0].gameBall).toBe('Jake');
  });

  test('4.4: db wins when both have truthy values (db is authoritative once written)', function () {
    var db    = [{ id: 'g1', snackDuty: 'Johnson family', gameBall: 'Tom' }];
    var local = [{ id: 'g1', snackDuty: 'Smith family',   gameBall: 'Jake' }];
    var result = mergeLocalScheduleFields(db, local, MERGE_FIELDS);
    expect(result[0].snackDuty).toBe('Johnson family');
    expect(result[0].gameBall).toBe('Tom');
  });

  test('4.5: db game with no local counterpart returned unchanged', function () {
    var db    = [{ id: 'g1', snackDuty: '', gameBall: '' }, { id: 'g2', snackDuty: 'X', gameBall: 'Y' }];
    var local = [{ id: 'g1', snackDuty: 'Rescued', gameBall: '' }];
    var result = mergeLocalScheduleFields(db, local, MERGE_FIELDS);
    // g2 has no local — returned as-is
    expect(result[1].snackDuty).toBe('X');
    expect(result[1].gameBall).toBe('Y');
  });

  test('4.6: local false scoreReported does not overwrite db false (both falsy — no rescue)', function () {
    var db    = [{ id: 'g1', scoreReported: false }];
    var local = [{ id: 'g1', scoreReported: false }];
    var result = mergeLocalScheduleFields(db, local, MERGE_FIELDS);
    expect(result[0].scoreReported).toBe(false);
  });

  test('4.7: local snackNote rescued alongside other fields', function () {
    var db    = [{ id: 'g1', snackNote: '',         snackDuty: '' }];
    var local = [{ id: 'g1', snackNote: 'Nut-free', snackDuty: 'Chen family' }];
    var result = mergeLocalScheduleFields(db, local, MERGE_FIELDS);
    expect(result[0].snackNote).toBe('Nut-free');
    expect(result[0].snackDuty).toBe('Chen family');
  });

  test('4.8: returns a new object per game (does not mutate db input)', function () {
    var db    = [{ id: 'g1', snackDuty: '' }];
    var local = [{ id: 'g1', snackDuty: 'Smith family' }];
    var result = mergeLocalScheduleFields(db, local, MERGE_FIELDS);
    expect(result[0]).not.toBe(db[0]); // different reference
    expect(db[0].snackDuty).toBe('');  // original not mutated
  });

  test('4.9: empty db schedule returns empty array', function () {
    expect(mergeLocalScheduleFields([], [{ id: 'g1', snackDuty: 'X' }], MERGE_FIELDS)).toEqual([]);
  });

  test('4.10: custom field list — only specified fields are rescued', function () {
    var db    = [{ id: 'g1', snackDuty: '', gameBall: '' }];
    var local = [{ id: 'g1', snackDuty: 'Smith', gameBall: 'Jake' }];
    // Only rescue gameBall, not snackDuty
    var result = mergeLocalScheduleFields(db, local, ['gameBall']);
    expect(result[0].gameBall).toBe('Jake');
    expect(result[0].snackDuty).toBe('');
  });
});
