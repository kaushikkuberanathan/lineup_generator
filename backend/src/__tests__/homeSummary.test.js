/**
 * homeSummary.test.js
 * Pure unit coverage for Home read-model display-name disambiguation,
 * next-event selection, and readiness computation (Story #1023). No
 * Supabase, no server, no network.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { computeDisplayNames, computeNextEvent, computeReadiness } = require('../lib/homeSummary');

describe('computeDisplayNames', () => {
  test('a single team with a unique name keeps its raw name', () => {
    const map = computeDisplayNames([
      { id: 't1', name: 'Mud Hens', season: 'Fall', year: 2026, ageGroup: '8U' },
    ]);
    assert.equal(map.get('t1'), 'Mud Hens');
  });

  test('two teams sharing a name are disambiguated by season/year', () => {
    const map = computeDisplayNames([
      { id: 't1', name: 'Mud Hens', season: 'Fall', year: 2026, ageGroup: '8U' },
      { id: 't2', name: 'Mud Hens', season: 'Spring', year: 2026, ageGroup: '8U' },
    ]);
    assert.equal(map.get('t1'), 'Mud Hens (Fall 2026)');
    assert.equal(map.get('t2'), 'Mud Hens (Spring 2026)');
  });

  test('two teams sharing name AND season/year fall back to age group', () => {
    const map = computeDisplayNames([
      { id: 't1', name: 'Mud Hens', season: 'Fall', year: 2026, ageGroup: '8U' },
      { id: 't2', name: 'Mud Hens', season: 'Fall', year: 2026, ageGroup: '10U' },
    ]);
    assert.equal(map.get('t1'), 'Mud Hens (Fall 2026, 8U)');
    assert.equal(map.get('t2'), 'Mud Hens (Fall 2026, 10U)');
  });

  test('a distinct name in the same response is never touched by another name colliding', () => {
    const map = computeDisplayNames([
      { id: 't1', name: 'Mud Hens', season: 'Fall', year: 2026, ageGroup: '8U' },
      { id: 't2', name: 'Mud Hens', season: 'Spring', year: 2026, ageGroup: '8U' },
      { id: 't3', name: 'Knights', season: 'Fall', year: 2026, ageGroup: '10U' },
    ]);
    assert.equal(map.get('t3'), 'Knights');
  });
});

describe('computeNextEvent', () => {
  const now = new Date('2026-09-02T18:00:00Z');

  test('returns null for an empty schedule', () => {
    assert.equal(computeNextEvent([], now), null);
    assert.equal(computeNextEvent(null, now), null);
  });

  test('picks the earliest upcoming entry, ignoring past entries', () => {
    const schedule = [
      { id: 'g1', date: '2026-09-01', time: '18:00', type: 'game', opponent: 'Past Team' },
      { id: 'g2', date: '2026-09-05', time: '19:00', type: 'game', opponent: 'Braves', location: 'Field 1', home: true },
      { id: 'g3', date: '2026-09-03', time: '20:00', type: 'game', opponent: 'Eagles' },
    ];
    const event = computeNextEvent(schedule, now);
    assert.equal(event.id, 'g3');
    assert.equal(event.opponent, 'Eagles');
  });

  test('skips cancelled entries', () => {
    const schedule = [
      { id: 'g1', date: '2026-09-03', time: '20:00', type: 'game', opponent: 'Eagles', cancelled: true },
      { id: 'g2', date: '2026-09-05', time: '19:00', type: 'game', opponent: 'Braves' },
    ];
    const event = computeNextEvent(schedule, now);
    assert.equal(event.id, 'g2');
  });

  test('maps home boolean to homeAway string, and missing to null', () => {
    const home = computeNextEvent([{ id: 'g1', date: '2026-09-05', home: true }], now);
    const away = computeNextEvent([{ id: 'g1', date: '2026-09-05', home: false }], now);
    const neither = computeNextEvent([{ id: 'g1', date: '2026-09-05' }], now);
    assert.equal(home.homeAway, 'home');
    assert.equal(away.homeAway, 'away');
    assert.equal(neither.homeAway, null);
  });

  test('a malformed date entry is skipped, not thrown', () => {
    const schedule = [
      { id: 'bad', date: 'not-a-date' },
      { id: 'g2', date: '2026-09-05', time: '19:00' },
    ];
    const event = computeNextEvent(schedule, now);
    assert.equal(event.id, 'g2');
  });
});

describe('computeReadiness', () => {
  test('locked=true always yields lineupStatus ready, and lineupId is always null', () => {
    const r = computeReadiness({ roster: [1, 2], grid: {}, battingOrder: [], locked: true, attendanceForNextEvent: null });
    assert.equal(r.lineupStatus, 'ready');
    assert.equal(r.lineupId, null);
  });

  test('unlocked with a non-empty grid or batting order yields draft', () => {
    const withGrid = computeReadiness({ roster: [], grid: { 1: { P: 'x' } }, battingOrder: [], locked: false, attendanceForNextEvent: null });
    const withBatting = computeReadiness({ roster: [], grid: {}, battingOrder: ['x'], locked: false, attendanceForNextEvent: null });
    assert.equal(withGrid.lineupStatus, 'draft');
    assert.equal(withBatting.lineupStatus, 'draft');
  });

  test('unlocked with empty grid and batting order yields none', () => {
    const r = computeReadiness({ roster: [], grid: {}, battingOrder: [], locked: false, attendanceForNextEvent: null });
    assert.equal(r.lineupStatus, 'none');
  });

  test('rosterCount reflects roster length; confirmedCount defaults to rosterCount with no attendance data', () => {
    const r = computeReadiness({ roster: [1, 2, 3], grid: {}, battingOrder: [], locked: false, attendanceForNextEvent: null });
    assert.equal(r.rosterCount, 3);
    assert.equal(r.confirmedCount, 3);
  });

  test('confirmedCount subtracts players marked absent for the next event date', () => {
    const r = computeReadiness({
      roster: [1, 2, 3, 4],
      grid: {},
      battingOrder: [],
      locked: false,
      attendanceForNextEvent: { 'Player A': 'absent', 'Player B': 'present' },
    });
    assert.equal(r.rosterCount, 4);
    assert.equal(r.confirmedCount, 3);
  });

  test('confirmedCount never goes negative', () => {
    const r = computeReadiness({
      roster: [1],
      grid: {},
      battingOrder: [],
      locked: false,
      attendanceForNextEvent: { a: 'absent', b: 'absent', c: 'absent' },
    });
    assert.equal(r.confirmedCount, 0);
  });
});
