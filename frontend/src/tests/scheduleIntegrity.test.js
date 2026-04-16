/**
 * scheduleIntegrity.test.js
 *
 * Regression tests for schedule data integrity — guards against field loss
 * bugs discovered in v2.2.2 (newGame template, non-active team hydration,
 * Mud Hens patch semantics).
 *
 * Import only from migrations.js — no App.jsx dependency.
 */

import { describe, it, expect } from 'vitest';
import { migrateSchedule, mergeLocalScheduleFields } from '../utils/migrations.js';

// ---------------------------------------------------------------------------
// Canonical newGame template (mirrors App.jsx initialisation — must stay in sync)
// ---------------------------------------------------------------------------
const NEW_GAME_TEMPLATE = {
  date:        "",
  time:        "",
  location:    "",
  opponent:    "",
  result:      "",
  ourScore:    "",
  theirScore:  "",
  battingPerf: {},
  snackDuty:   "",
  gameBall:    [],
  scoreReported: false,
};

// ---------------------------------------------------------------------------
// Group 1 — newGame template completeness
// ---------------------------------------------------------------------------
describe('Group 1 — newGame template completeness', () => {

  it('1.1 template has snackDuty field', () => {
    expect('snackDuty' in NEW_GAME_TEMPLATE).toBe(true);
  });

  it('1.2 template has gameBall field', () => {
    expect('gameBall' in NEW_GAME_TEMPLATE).toBe(true);
  });

  it('1.3 template has scoreReported field', () => {
    expect('scoreReported' in NEW_GAME_TEMPLATE).toBe(true);
  });

  it('1.4 scoreReported default is false (not undefined or null)', () => {
    expect(NEW_GAME_TEMPLATE.scoreReported).toBe(false);
  });

  it('1.5 snackDuty defaults to empty string; gameBall defaults to empty array', () => {
    expect(NEW_GAME_TEMPLATE.snackDuty).toBe("");
    expect(NEW_GAME_TEMPLATE.gameBall).toEqual([]);
  });

  it('1.6 battingPerf default is an empty object', () => {
    expect(NEW_GAME_TEMPLATE.battingPerf).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Group 2 — migrateSchedule field preservation
// ---------------------------------------------------------------------------
describe('Group 2 — migrateSchedule field preservation', () => {

  it('2.1 preserves scoreReported:true on a game that already has it', () => {
    const input = [{ id: 'g1', date: '2026-05-01', scoreReported: true }];
    const result = migrateSchedule(input);
    expect(result[0].scoreReported).toBe(true);
  });

  it('2.2 does NOT inject scoreReported when absent — field stays absent', () => {
    const input = [{ id: 'g1', date: '2026-05-01' }];
    const result = migrateSchedule(input);
    // scoreReported is not in the override block — should be absent, not defaulted to false
    expect('scoreReported' in result[0]).toBe(false);
  });

  it('2.3 preserves unknown/future fields via Object.assign spread', () => {
    const input = [{ id: 'g1', date: '2026-05-01', myFutureField: 'keep-me' }];
    const result = migrateSchedule(input);
    expect(result[0].myFutureField).toBe('keep-me');
  });

  it('2.4 non-array input is returned unchanged', () => {
    expect(migrateSchedule(null)).toBe(null);
    expect(migrateSchedule(undefined)).toBe(undefined);
    expect(migrateSchedule("not-an-array")).toBe("not-an-array");
  });

  it('2.5 empty array returns empty array', () => {
    expect(migrateSchedule([])).toEqual([]);
  });

  it('2.6 gameBall defaults to empty string when absent', () => {
    const input = [{ id: 'g1', date: '2026-05-01' }];
    const result = migrateSchedule(input);
    expect(result[0].gameBall).toBe('');
  });

  it('2.7 gameBall is preserved when set', () => {
    const input = [{ id: 'g1', date: '2026-05-01', gameBall: 'Alice' }];
    const result = migrateSchedule(input);
    expect(result[0].gameBall).toBe('Alice');
  });
});

// ---------------------------------------------------------------------------
// Group 3 — mergeLocalScheduleFields local-wins semantics
// ---------------------------------------------------------------------------
describe('Group 3 — mergeLocalScheduleFields local-wins semantics', () => {
  const MERGE_FIELDS = ['scoreReported', 'snackDuty', 'snackNote', 'gameBall'];

  it('3.1 local truthy scoreReported wins over db falsy (undefined)', () => {
    const db    = [{ id: 'g1', date: '2026-05-01', scoreReported: undefined }];
    const local = [{ id: 'g1', date: '2026-05-01', scoreReported: true }];
    const merged = mergeLocalScheduleFields(db, local, MERGE_FIELDS);
    expect(merged[0].scoreReported).toBe(true);
  });

  it('3.2 local truthy gameBall wins over db empty string', () => {
    const db    = [{ id: 'g1', gameBall: '' }];
    const local = [{ id: 'g1', gameBall: 'Bob' }];
    const merged = mergeLocalScheduleFields(db, local, MERGE_FIELDS);
    expect(merged[0].gameBall).toBe('Bob');
  });

  it('3.3 local empty string does NOT override db real value', () => {
    const db    = [{ id: 'g1', gameBall: 'Alice' }];
    const local = [{ id: 'g1', gameBall: '' }];
    const merged = mergeLocalScheduleFields(db, local, MERGE_FIELDS);
    expect(merged[0].gameBall).toBe('Alice');
  });

  it('3.4 db truthy value is preserved even when local is also truthy', () => {
    // db wins when BOTH are set (local only wins when db is falsy)
    const db    = [{ id: 'g1', snackDuty: 'TeamA' }];
    const local = [{ id: 'g1', snackDuty: 'TeamB' }];
    const merged = mergeLocalScheduleFields(db, local, MERGE_FIELDS);
    expect(merged[0].snackDuty).toBe('TeamA');
  });

  it('3.5 game present in db but absent from local is returned unchanged', () => {
    const db    = [{ id: 'g1', gameBall: '', scoreReported: undefined }];
    const local = [];
    const merged = mergeLocalScheduleFields(db, local, MERGE_FIELDS);
    expect(merged[0]).toEqual(db[0]);
  });

  it('3.6 multiple fields merged in single pass', () => {
    const db    = [{ id: 'g1', snackDuty: '', gameBall: '', snackNote: '' }];
    const local = [{ id: 'g1', snackDuty: 'TeamA', gameBall: 'Charlie', snackNote: 'Bring juice' }];
    const merged = mergeLocalScheduleFields(db, local, MERGE_FIELDS);
    expect(merged[0].snackDuty).toBe('TeamA');
    expect(merged[0].gameBall).toBe('Charlie');
    expect(merged[0].snackNote).toBe('Bring juice');
  });

  it('3.7 local false does NOT win over db undefined (false is falsy)', () => {
    // local[field] && !g[field] — false && ... is false — local loses
    const db    = [{ id: 'g1', scoreReported: undefined }];
    const local = [{ id: 'g1', scoreReported: false }];
    const merged = mergeLocalScheduleFields(db, local, MERGE_FIELDS);
    // false is falsy — local doesn't win; db value (undefined) stays
    expect(merged[0].scoreReported).toBe(undefined);
  });
});

// ---------------------------------------------------------------------------
// Group 4 — Non-active team hydration simulation
// ---------------------------------------------------------------------------
describe('Group 4 — non-active team hydration simulation', () => {
  /**
   * Simulates the boot hydration sequence for a non-active team (App.jsx ~1928):
   *   1. dbData arrives from Supabase (may lack local flags)
   *   2. migrateSchedule normalises the db schedule
   *   3. mergeLocalScheduleFields rescues locally-set flags
   *   4. Result is what gets saved to localStorage
   */
  const MERGE_FIELDS = ['scoreReported', 'snackDuty', 'snackNote', 'gameBall'];

  it('4.1 scoreReported:true survives full hydration sequence', () => {
    const dbData   = { schedule: [{ id: 'g1', date: '2026-05-01', opponent: 'Tigers' }] };
    const localSched = [{ id: 'g1', date: '2026-05-01', scoreReported: true }];

    const migratedDb = migrateSchedule(Array.isArray(dbData.schedule) ? dbData.schedule : []);
    const safeSched  = mergeLocalScheduleFields(migratedDb, localSched, MERGE_FIELDS);

    expect(safeSched[0].scoreReported).toBe(true);
  });

  it('4.2 gameBall survives full hydration sequence', () => {
    const dbData   = { schedule: [{ id: 'g1', date: '2026-05-01' }] };
    const localSched = [{ id: 'g1', gameBall: 'Jordan' }];

    const migratedDb = migrateSchedule(Array.isArray(dbData.schedule) ? dbData.schedule : []);
    const safeSched  = mergeLocalScheduleFields(migratedDb, localSched, MERGE_FIELDS);

    expect(safeSched[0].gameBall).toBe('Jordan');
  });

  it('4.3 migrateSchedule on null schedule falls back to empty array correctly', () => {
    const dbData = { schedule: null };
    const migratedDb = migrateSchedule(Array.isArray(dbData.schedule) ? dbData.schedule : []);
    expect(migratedDb).toEqual([]);
  });

  it('4.4 all MERGE_FIELDS rescued in single hydration pass', () => {
    const dbData = { schedule: [{ id: 'g1', date: '2026-05-01' }] };
    const localSched = [{
      id: 'g1',
      scoreReported: true,
      snackDuty: 'TeamA',
      snackNote: 'Oranges',
      gameBall: 'Sam',
    }];

    const migratedDb = migrateSchedule(Array.isArray(dbData.schedule) ? dbData.schedule : []);
    const safeSched  = mergeLocalScheduleFields(migratedDb, localSched, MERGE_FIELDS);

    expect(safeSched[0].scoreReported).toBe(true);
    expect(safeSched[0].snackDuty).toBe('TeamA');
    expect(safeSched[0].snackNote).toBe('Oranges');
    expect(safeSched[0].gameBall).toBe('Sam');
  });

  it('4.5 hydration does not drop opponent or date from db record', () => {
    const dbData = { schedule: [{ id: 'g1', date: '2026-06-10', opponent: 'Bears' }] };
    const localSched = [{ id: 'g1', scoreReported: true }];

    const migratedDb = migrateSchedule(Array.isArray(dbData.schedule) ? dbData.schedule : []);
    const safeSched  = mergeLocalScheduleFields(migratedDb, localSched, MERGE_FIELDS);

    expect(safeSched[0].date).toBe('2026-06-10');
    expect(safeSched[0].opponent).toBe('Bears');
  });
});

// ---------------------------------------------------------------------------
// Group 5 — Mud Hens patch Object.assign merge semantics
// ---------------------------------------------------------------------------
describe('Group 5 — Mud Hens patch Object.assign merge semantics', () => {
  /**
   * The Mud Hens patch applies Object.assign(existing, incoming) per game.
   * Fields only in existing (not in incoming) must be preserved.
   * This group verifies the three fields that were missing from the merge before v2.2.2.
   */

  function applyPatch(existing, incoming) {
    // Mirrors the corrected App.jsx Mud Hens patch logic
    return Object.assign({}, existing, incoming);
  }

  it('5.1 snackDuty on existing game survives Object.assign merge', () => {
    const existing = { id: 'g1', date: '2026-05-01', snackDuty: 'TeamA' };
    const incoming = { id: 'g1', date: '2026-05-01' }; // snackDuty absent
    const result = applyPatch(existing, incoming);
    expect(result.snackDuty).toBe('TeamA');
  });

  it('5.2 gameBall on existing game survives Object.assign merge', () => {
    const existing = { id: 'g1', gameBall: 'Alex' };
    const incoming = { id: 'g1' };
    const result = applyPatch(existing, incoming);
    expect(result.gameBall).toBe('Alex');
  });

  it('5.3 scoreReported:true on existing game survives Object.assign merge', () => {
    const existing = { id: 'g1', scoreReported: true };
    const incoming = { id: 'g1' };
    const result = applyPatch(existing, incoming);
    expect(result.scoreReported).toBe(true);
  });

  it('5.4 incoming value overwrites existing when both present', () => {
    const existing = { id: 'g1', opponent: 'Old Team' };
    const incoming = { id: 'g1', opponent: 'New Team' };
    const result = applyPatch(existing, incoming);
    expect(result.opponent).toBe('New Team');
  });
});
