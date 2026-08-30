/**
 * playerMapper.test.js — dedicated coverage for mapPlayerToV2 (frontend/src/utils/playerMapper.js).
 *
 * Filed as issue #945 (QA & Reliability Audit, #941): playerMapper.js is one of only
 * three files root CLAUDE.md names as required to pass `npm test` on any change
 * (lineupEngineV2.js, scoringEngine.js, playerMapper.js), but previously had no
 * dedicated test file — only transitive coverage via scoring.test.js's Group 5
 * (8 tests: prefs/dislikes mapping, absent-tag outThisGame, safe defaults, name
 * fallback, spread passthrough) and the lineup-engine test suites.
 *
 * This file covers what Group 5 does not: each individual inference branch
 * (V1 skills[]/batSkills[] → V2 field bridge), explicit-value-wins-over-inference
 * priority, every remaining default in the return object, and the deliberately
 * NOT-yet-wired V1→V2 tag bridges (speed/contact/power/swingDiscipline) — locking
 * in the documented-deferred behavior from the file's own TODO(v2.5.x) comments
 * so a future "helpful" wiring doesn't silently become a scoring behavior change.
 *
 * Run: npm test  (from frontend/)
 */

import { describe, test, expect } from 'vitest';
import { mapPlayerToV2 } from '../utils/playerMapper.js';

describe('mapPlayerToV2 — fielding inference (skills[] bridge)', function () {
  test('goodGlove skill infers reliability=high', function () {
    var result = mapPlayerToV2({ name: 'Player', skills: ['goodGlove'] });
    expect(result.reliability).toBe('high');
  });

  test('needsWork skill infers reliability=needs_support', function () {
    var result = mapPlayerToV2({ name: 'Player', skills: ['needsWork'] });
    expect(result.reliability).toBe('needs_support');
  });

  test('no reliability-related skill falls through to average default', function () {
    var result = mapPlayerToV2({ name: 'Player', skills: ['strongArm'] });
    expect(result.reliability).toBe('average');
  });

  test('explicit player.reliability wins over an inferring skill tag', function () {
    var result = mapPlayerToV2({ name: 'Player', reliability: 'needs_support', skills: ['goodGlove'] });
    expect(result.reliability).toBe('needs_support');
  });

  test('strongArm skill infers armStrength=strong', function () {
    var result = mapPlayerToV2({ name: 'Player', skills: ['strongArm'] });
    expect(result.armStrength).toBe('strong');
  });

  test('weakArm skill infers armStrength=developing', function () {
    var result = mapPlayerToV2({ name: 'Player', skills: ['weakArm'] });
    expect(result.armStrength).toBe('developing');
  });

  test('explicit player.armStrength wins over an inferring skill tag', function () {
    var result = mapPlayerToV2({ name: 'Player', armStrength: 'strong', skills: ['weakArm'] });
    expect(result.armStrength).toBe('strong');
  });

  test('gameAware skill infers reaction=quick', function () {
    var result = mapPlayerToV2({ name: 'Player', skills: ['gameAware'] });
    expect(result.reaction).toBe('quick');
  });

  test('explicit player.reaction wins over an inferring skill tag', function () {
    var result = mapPlayerToV2({ name: 'Player', reaction: 'average', skills: ['gameAware'] });
    expect(result.reaction).toBe('average');
  });

  test('ballType has no inference path — always defaults to developing unless explicitly set', function () {
    var defaulted = mapPlayerToV2({ name: 'Player', skills: ['goodGlove'] });
    expect(defaulted.ballType).toBe('developing');

    var explicit = mapPlayerToV2({ name: 'Player', ballType: 'reliable' });
    expect(explicit.ballType).toBe('reliable');
  });
});

describe('mapPlayerToV2 — deliberately unwired V1 tag bridges (documented-deferred behavior)', function () {
  // playerMapper.js computes inferredSpeed/inferredContact/inferredPower/inferredDiscipline
  // but its own TODO(v2.5.x) comments say wiring them is an out-of-scope behavior change
  // deferred from Phase 1b lint cleanup. These tests lock in that current behavior so a
  // future edit doesn't silently start propagating V1 tags into V2 scoring.

  test('fast skill does NOT influence speed (still defaults to average)', function () {
    var result = mapPlayerToV2({ name: 'Player', skills: ['fast'] });
    expect(result.speed).toBe('average');
  });

  test('slow skill does NOT influence speed (still defaults to average)', function () {
    var result = mapPlayerToV2({ name: 'Player', skills: ['slow'] });
    expect(result.speed).toBe('average');
  });

  test('goodContact batSkill does NOT influence contact (still defaults to medium)', function () {
    var result = mapPlayerToV2({ name: 'Player', batSkills: ['goodContact'] });
    expect(result.contact).toBe('medium');
  });

  test('power batSkill does NOT influence power (still defaults to low)', function () {
    var result = mapPlayerToV2({ name: 'Player', batSkills: ['power'] });
    expect(result.power).toBe('low');
  });

  test('patientHitter batSkill does NOT influence swingDiscipline (still defaults to free_swinger)', function () {
    var result = mapPlayerToV2({ name: 'Player', batSkills: ['patientHitter'] });
    expect(result.swingDiscipline).toBe('free_swinger');
  });
});

describe('mapPlayerToV2 — field/batting/running awareness booleans', function () {
  test('all awareness booleans default to false when unset', function () {
    var result = mapPlayerToV2({ name: 'Player' });
    expect(result.knowsWhereToThrow).toBe(false);
    expect(result.callsForBall).toBe(false);
    expect(result.backsUpPlays).toBe(false);
    expect(result.anticipatesPlays).toBe(false);
    expect(result.tracksBallWell).toBe(false);
    expect(result.patientAtPlate).toBe(false);
    expect(result.confidentHitter).toBe(false);
    expect(result.runsThroughFirst).toBe(false);
    expect(result.listensToCoaches).toBe(false);
    expect(result.awareOnBases).toBe(false);
    expect(result.skipBench).toBe(false);
  });

  test('explicit true values are preserved for every awareness boolean', function () {
    var player = {
      name: 'Player',
      knowsWhereToThrow: true,
      callsForBall: true,
      backsUpPlays: true,
      anticipatesPlays: true,
      tracksBallWell: true,
      patientAtPlate: true,
      confidentHitter: true,
      runsThroughFirst: true,
      listensToCoaches: true,
      awareOnBases: true,
      skipBench: true,
    };
    var result = mapPlayerToV2(player);
    expect(result.knowsWhereToThrow).toBe(true);
    expect(result.callsForBall).toBe(true);
    expect(result.backsUpPlays).toBe(true);
    expect(result.anticipatesPlays).toBe(true);
    expect(result.tracksBallWell).toBe(true);
    expect(result.patientAtPlate).toBe(true);
    expect(result.confidentHitter).toBe(true);
    expect(result.runsThroughFirst).toBe(true);
    expect(result.listensToCoaches).toBe(true);
    expect(result.awareOnBases).toBe(true);
    expect(result.skipBench).toBe(true);
  });
});

describe('mapPlayerToV2 — outThisGame precedence (explicit vs. tag-inferred)', function () {
  test('explicit outThisGame=false is preserved even with an absent tag present', function () {
    // ?? only falls through on null/undefined, not on an explicit false —
    // this locks in that an explicit false is never overridden by the tag inference.
    var result = mapPlayerToV2({ name: 'Player', outThisGame: false, tags: ['absent'] });
    expect(result.outThisGame).toBe(false);
  });

  test('explicit outThisGame=true is preserved even without an absent tag', function () {
    var result = mapPlayerToV2({ name: 'Player', outThisGame: true, tags: [] });
    expect(result.outThisGame).toBe(true);
  });
});

describe('mapPlayerToV2 — preferredPositions / avoidPositions source priority', function () {
  test('dislikes takes priority over avoidPositions when both are present arrays', function () {
    var player = { name: 'Player', dislikes: ['C'], avoidPositions: ['SS', '2B'] };
    var result = mapPlayerToV2(player);
    expect(result.avoidPositions).toEqual(['C']);
  });

  test('non-array prefs falls through to preferredPositions', function () {
    var player = { name: 'Player', prefs: 'not-an-array', preferredPositions: ['SS'] };
    var result = mapPlayerToV2(player);
    expect(result.preferredPositions).toEqual(['SS']);
  });

  test('non-array dislikes falls through to avoidPositions', function () {
    var player = { name: 'Player', dislikes: 'not-an-array', avoidPositions: ['C'] };
    var result = mapPlayerToV2(player);
    expect(result.avoidPositions).toEqual(['C']);
  });

  test('neither prefs/preferredPositions nor dislikes/avoidPositions present → empty arrays', function () {
    var result = mapPlayerToV2({ name: 'Player' });
    expect(result.preferredPositions).toEqual([]);
    expect(result.avoidPositions).toEqual([]);
  });
});

describe('mapPlayerToV2 — name fallback chain and firstName/lastName inference', function () {
  test('empty-string name falls through to playerName (empty string is falsy in the || chain)', function () {
    var result = mapPlayerToV2({ name: '', playerName: 'Jane Doe' });
    expect(result.name).toBe('Jane Doe');
  });

  test('neither name nor playerName present → "Unknown Player"', function () {
    var result = mapPlayerToV2({});
    expect(result.name).toBe('Unknown Player');
  });

  test('firstName/lastName inferred by splitting a two-part name', function () {
    var result = mapPlayerToV2({ name: 'Jane Doe' });
    expect(result.firstName).toBe('Jane');
    expect(result.lastName).toBe('Doe');
  });

  test('a single-word name yields an empty-string lastName', function () {
    var result = mapPlayerToV2({ name: 'Cher' });
    expect(result.firstName).toBe('Cher');
    expect(result.lastName).toBe('');
  });

  test('a multi-word name joins everything after the first word into lastName', function () {
    var result = mapPlayerToV2({ name: 'Mary Jane Watson' });
    expect(result.firstName).toBe('Mary');
    expect(result.lastName).toBe('Jane Watson');
  });

  test('explicit firstName/lastName win over name-derived inference', function () {
    var result = mapPlayerToV2({ name: 'Jane Doe', firstName: 'J', lastName: 'D' });
    expect(result.firstName).toBe('J');
    expect(result.lastName).toBe('D');
  });

  test('no name at all (falls to "Unknown Player") still yields empty firstName/lastName, not a crash', function () {
    var result = mapPlayerToV2({});
    expect(result.firstName).toBe('');
    expect(result.lastName).toBe('');
  });
});

describe('mapPlayerToV2 — remaining scalar defaults', function () {
  test('developmentFocus defaults to balanced, explicit value is preserved', function () {
    var defaulted = mapPlayerToV2({ name: 'Player' });
    expect(defaulted.developmentFocus).toBe('balanced');

    var explicit = mapPlayerToV2({ name: 'Player', developmentFocus: 'power_hitting' });
    expect(explicit.developmentFocus).toBe('power_hitting');
  });

  test('V1 arrays (skills, tags, batSkills) default to empty arrays when unset', function () {
    var result = mapPlayerToV2({ name: 'Player' });
    expect(result.skills).toEqual([]);
    expect(result.tags).toEqual([]);
    expect(result.batSkills).toEqual([]);
  });
});

describe('mapPlayerToV2 — walk-up song fields', function () {
  test('all walk-up song fields default to null when unset', function () {
    var result = mapPlayerToV2({ name: 'Player' });
    expect(result.walkUpSong).toBeNull();
    expect(result.walkUpArtist).toBeNull();
    expect(result.walkUpStart).toBeNull();
    expect(result.walkUpEnd).toBeNull();
    expect(result.walkUpNotes).toBeNull();
    expect(result.walkUpLink).toBeNull();
  });

  test('explicit walk-up song fields are passed through unchanged', function () {
    var player = {
      name: 'Player',
      walkUpSong: 'Thunderstruck',
      walkUpArtist: 'AC/DC',
      walkUpStart: 0,
      walkUpEnd: 15,
      walkUpNotes: 'fade in',
      walkUpLink: 'https://example.com/song',
    };
    var result = mapPlayerToV2(player);
    expect(result.walkUpSong).toBe('Thunderstruck');
    expect(result.walkUpArtist).toBe('AC/DC');
    expect(result.walkUpStart).toBe(0);
    expect(result.walkUpEnd).toBe(15);
    expect(result.walkUpNotes).toBe('fade in');
    expect(result.walkUpLink).toBe('https://example.com/song');
  });
});
