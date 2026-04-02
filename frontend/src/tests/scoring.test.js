/**
 * scoring.test.js — regression tests for scoringEngine.js and playerMapper.js.
 *
 * Covers:
 *   - Level-to-number mapping functions (reliability, reaction, arm, contact, etc.)
 *   - getBallTypeFit: position groupings — infield, outfield (LC/RC not CF), catcher
 *   - getPositionScore: all 10 valid positions score > 0; LC/RC work correctly
 *   - getPreferredModifier / getAvoidPenalty
 *   - Composite scores: getFieldScore, getBattingScore, getBattingOrderScore
 *   - V1→V2 silent fallback guard (usedFallback always false)
 *   - mapPlayerToV2: V1 field mapping, prefs→preferredPositions, dislikes→avoidPositions,
 *     absent tag → outThisGame, safe defaults for missing fields
 *
 * Run: npm test  (from frontend/)
 */

import {
  getReliabilityValue,
  getReactionValue,
  getArmStrengthValue,
  getContactValue,
  getPowerValue,
  getDisciplineValue,
  getSpeedValue,
  getBallTypeFit,
  getPreferredModifier,
  getAvoidPenalty,
  getPositionScore,
  getFieldScore,
  getBattingScore,
  getRunningScore,
  getBattingOrderScore,
  getBenchCandidateScore,
  getFieldAwarenessScore,
} from '../utils/scoringEngine.js';
import { mapPlayerToV2 } from '../utils/playerMapper.js';
import { generateLineupV2 } from '../utils/lineupEngineV2.js';
import { mockRoster } from './fixtures/mockRoster.js';

// Minimal player with all attributes at their default/average
function defaultPlayer(overrides) {
  return Object.assign({
    name: 'Test Player',
    reliability: 'average',
    reaction: 'average',
    armStrength: 'average',
    ballType: 'developing',
    knowsWhereToThrow: false,
    callsForBall: false,
    backsUpPlays: false,
    anticipatesPlays: false,
    contact: 'medium',
    power: 'low',
    swingDiscipline: 'free_swinger',
    tracksBallWell: false,
    patientAtPlate: false,
    confidentHitter: false,
    speed: 'average',
    runsThroughFirst: false,
    listensToCoaches: false,
    awareOnBases: false,
    preferredPositions: [],
    avoidPositions: [],
    skills: [],
    tags: [],
    batSkills: [],
    skipBench: false,
    outThisGame: false,
    developmentFocus: 'balanced',
  }, overrides);
}

// ============================================================================
// Group 1 — Level-to-number mappers
// ============================================================================

describe('Group 1 — Level-to-number mappers', function () {

  test('1.1: getReliabilityValue — high=1.0, average=0.7, needs_support=0.4, unknown=0.7', function () {
    expect(getReliabilityValue({ reliability: 'high' })).toBe(1.0);
    expect(getReliabilityValue({ reliability: 'average' })).toBe(0.7);
    expect(getReliabilityValue({ reliability: 'needs_support' })).toBe(0.4);
    expect(getReliabilityValue({ reliability: 'unknown_value' })).toBe(0.7);
    expect(getReliabilityValue({})).toBe(0.7);
  });

  test('1.2: getReactionValue — quick=1.0, average=0.7, slow=0.4', function () {
    expect(getReactionValue({ reaction: 'quick' })).toBe(1.0);
    expect(getReactionValue({ reaction: 'average' })).toBe(0.7);
    expect(getReactionValue({ reaction: 'slow' })).toBe(0.4);
    expect(getReactionValue({})).toBe(0.7);
  });

  test('1.3: getArmStrengthValue — strong=1.0, average=0.7, developing=0.4', function () {
    expect(getArmStrengthValue({ armStrength: 'strong' })).toBe(1.0);
    expect(getArmStrengthValue({ armStrength: 'average' })).toBe(0.7);
    expect(getArmStrengthValue({ armStrength: 'developing' })).toBe(0.4);
    expect(getArmStrengthValue({})).toBe(0.7);
  });

  test('1.4: getContactValue — high=1.0, medium=0.7, developing=0.4', function () {
    expect(getContactValue({ contact: 'high' })).toBe(1.0);
    expect(getContactValue({ contact: 'medium' })).toBe(0.7);
    expect(getContactValue({ contact: 'developing' })).toBe(0.4);
    expect(getContactValue({})).toBe(0.7);
  });

  test('1.5: getPowerValue — high=1.0, medium=0.7, low=0.4', function () {
    expect(getPowerValue({ power: 'high' })).toBe(1.0);
    expect(getPowerValue({ power: 'medium' })).toBe(0.7);
    expect(getPowerValue({ power: 'low' })).toBe(0.4);
    expect(getPowerValue({})).toBe(0.4); // default is 0.4 (low)
  });

  test('1.6: getDisciplineValue — disciplined=1.0, anything else=0.5', function () {
    expect(getDisciplineValue({ swingDiscipline: 'disciplined' })).toBe(1.0);
    expect(getDisciplineValue({ swingDiscipline: 'free_swinger' })).toBe(0.5);
    expect(getDisciplineValue({})).toBe(0.5);
  });

  test('1.7: getSpeedValue — fast=1.0, average=0.7, developing=0.4', function () {
    expect(getSpeedValue({ speed: 'fast' })).toBe(1.0);
    expect(getSpeedValue({ speed: 'average' })).toBe(0.7);
    expect(getSpeedValue({ speed: 'developing' })).toBe(0.4);
    expect(getSpeedValue({})).toBe(0.7);
  });
});

// ============================================================================
// Group 2 — getBallTypeFit: position family groupings
// ============================================================================

describe('Group 2 — getBallTypeFit position families', function () {

  test('2.1: ground_ball fits infield positions at 1.0', function () {
    var gb = { ballType: 'ground_ball' };
    ['SS', '2B', '3B', '1B', 'P'].forEach(function (pos) {
      expect(getBallTypeFit(gb, pos)).toBe(1.0);
    });
  });

  test('2.2: fly_ball fits infield positions at 0.6 (not ideal)', function () {
    var fb = { ballType: 'fly_ball' };
    ['SS', '2B', '3B', '1B', 'P'].forEach(function (pos) {
      expect(getBallTypeFit(fb, pos)).toBe(0.6);
    });
  });

  test('2.3: fly_ball fits outfield positions at 1.0', function () {
    var fb = { ballType: 'fly_ball' };
    ['LF', 'LC', 'RC', 'RF'].forEach(function (pos) {
      expect(getBallTypeFit(fb, pos)).toBe(1.0);
    });
  });

  test('2.4: LC and RC are valid outfield positions — not CF', function () {
    // LC and RC should produce defined fit values > 0
    var both = { ballType: 'both' };
    expect(getBallTypeFit(both, 'LC')).toBe(1.0);
    expect(getBallTypeFit(both, 'RC')).toBe(1.0);
    // CF is not a valid engine position — falls through to default 0.5
    expect(getBallTypeFit(both, 'CF')).toBe(0.5);
  });

  test('2.5: ground_ball fits outfield at 0.6', function () {
    var gb = { ballType: 'ground_ball' };
    ['LF', 'LC', 'RC', 'RF'].forEach(function (pos) {
      expect(getBallTypeFit(gb, pos)).toBe(0.6);
    });
  });

  test('2.6: catcher fit — both=1.0, ground_ball=0.8, fly_ball=0.5', function () {
    expect(getBallTypeFit({ ballType: 'both' },        'C')).toBe(1.0);
    expect(getBallTypeFit({ ballType: 'ground_ball' }, 'C')).toBe(0.8);
    expect(getBallTypeFit({ ballType: 'fly_ball' },    'C')).toBe(0.5);
  });

  test('2.7: developing ballType is handled by both infield and outfield (returns 0.5)', function () {
    var dev = { ballType: 'developing' };
    expect(getBallTypeFit(dev, 'SS')).toBe(0.5);
    expect(getBallTypeFit(dev, 'LF')).toBe(0.5);
  });
});

// ============================================================================
// Group 3 — getPositionScore: all 10 valid positions, modifiers
// ============================================================================

const ALL_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'LC', 'RC', 'RF'];

describe('Group 3 — getPositionScore', function () {

  test('3.1: all 10 valid field positions produce a score > 0 for a default player', function () {
    var p = defaultPlayer();
    ALL_POSITIONS.forEach(function (pos) {
      var score = getPositionScore(p, pos);
      expect(score).toBeGreaterThan(0);
    });
  });

  test('3.2: LC and RC produce identical scores for an identical player', function () {
    var p = defaultPlayer();
    expect(getPositionScore(p, 'LC')).toBe(getPositionScore(p, 'RC'));
  });

  test('3.3: CF is not a recognized position — falls to default getFieldScore path', function () {
    var p = defaultPlayer();
    // CF score should equal getFieldScore(p) since it hits the default case
    expect(getPositionScore(p, 'CF')).toBe(getFieldScore(p));
  });

  test('3.4: preferred position[0] adds 0.20 to score', function () {
    var base  = defaultPlayer({ preferredPositions: [] });
    var pref0 = defaultPlayer({ preferredPositions: ['SS'] });
    expect(getPositionScore(pref0, 'SS')).toBeCloseTo(getPositionScore(base, 'SS') + 0.20, 10);
  });

  test('3.5: preferred position[1] adds 0.12', function () {
    var base  = defaultPlayer({ preferredPositions: [] });
    var pref1 = defaultPlayer({ preferredPositions: ['P', 'SS'] });
    expect(getPositionScore(pref1, 'SS')).toBeCloseTo(getPositionScore(base, 'SS') + 0.12, 10);
  });

  test('3.6: preferred position[2] adds 0.06', function () {
    var base  = defaultPlayer({ preferredPositions: [] });
    var pref2 = defaultPlayer({ preferredPositions: ['P', 'C', 'SS'] });
    expect(getPositionScore(pref2, 'SS')).toBeCloseTo(getPositionScore(base, 'SS') + 0.06, 10);
  });

  test('3.7: avoid position subtracts 0.35 from score', function () {
    var base  = defaultPlayer({ avoidPositions: [] });
    var avoid = defaultPlayer({ avoidPositions: ['C'] });
    expect(getPositionScore(avoid, 'C')).toBeCloseTo(getPositionScore(base, 'C') - 0.35, 10);
  });

  test('3.8: high-skill player scores higher than low-skill player at all positions', function () {
    var strong = defaultPlayer({ reliability: 'high', reaction: 'quick', armStrength: 'strong', speed: 'fast' });
    var weak   = defaultPlayer({ reliability: 'needs_support', reaction: 'slow', armStrength: 'developing', speed: 'developing' });
    ALL_POSITIONS.forEach(function (pos) {
      expect(getPositionScore(strong, pos)).toBeGreaterThan(getPositionScore(weak, pos));
    });
  });
});

// ============================================================================
// Group 4 — Composite scores
// ============================================================================

describe('Group 4 — Composite scores', function () {

  test('4.1: getFieldScore returns a value between 0 and 1 for any player', function () {
    var p = defaultPlayer();
    var score = getFieldScore(p);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  test('4.2: all-high player has higher getFieldScore than all-low player', function () {
    var high = defaultPlayer({
      reliability: 'high', reaction: 'quick', armStrength: 'strong', ballType: 'both',
      knowsWhereToThrow: true, callsForBall: true, backsUpPlays: true, anticipatesPlays: true,
    });
    var low = defaultPlayer({
      reliability: 'needs_support', reaction: 'slow', armStrength: 'developing', ballType: 'developing',
    });
    expect(getFieldScore(high)).toBeGreaterThan(getFieldScore(low));
  });

  test('4.3: getBattingScore returns a value between 0 and 1', function () {
    var score = getBattingScore(defaultPlayer());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  test('4.4: getBattingOrderScore is higher for a better batter', function () {
    var strongBatter = defaultPlayer({ contact: 'high', swingDiscipline: 'disciplined', speed: 'fast' });
    var weakBatter   = defaultPlayer({ contact: 'developing', swingDiscipline: 'free_swinger', speed: 'developing' });
    expect(getBattingOrderScore(strongBatter)).toBeGreaterThan(getBattingOrderScore(weakBatter));
  });

  test('4.5: getFieldAwarenessScore — 4 true flags = 1.0', function () {
    var p = defaultPlayer({ knowsWhereToThrow: true, callsForBall: true, backsUpPlays: true, anticipatesPlays: true });
    expect(getFieldAwarenessScore(p)).toBe(1.0);
  });

  test('4.6: getFieldAwarenessScore — all false = 0.0', function () {
    expect(getFieldAwarenessScore(defaultPlayer())).toBe(0.0);
  });
});

// ============================================================================
// Group 5 — mapPlayerToV2: V1→V2 field mapping
// ============================================================================

describe('Group 5 — mapPlayerToV2', function () {

  test('5.1: V1 "prefs" array maps to "preferredPositions"', function () {
    var v1 = { name: 'Player', prefs: ['SS', '2B'] };
    var result = mapPlayerToV2(v1);
    expect(result.preferredPositions).toEqual(['SS', '2B']);
  });

  test('5.2: V1 "dislikes" array maps to "avoidPositions"', function () {
    var v1 = { name: 'Player', dislikes: ['C', 'P'] };
    var result = mapPlayerToV2(v1);
    expect(result.avoidPositions).toEqual(['C', 'P']);
  });

  test('5.3: absent tag in V1 tags → outThisGame=true', function () {
    var v1 = { name: 'Player', tags: ['absent'] };
    var result = mapPlayerToV2(v1);
    expect(result.outThisGame).toBe(true);
  });

  test('5.4: no absent tag → outThisGame=false (default)', function () {
    var result = mapPlayerToV2({ name: 'Player', tags: ['coachable'] });
    expect(result.outThisGame).toBe(false);
  });

  test('5.5: missing fields get safe defaults', function () {
    var result = mapPlayerToV2({ name: 'Player' });
    expect(result.reliability).toBe('average');
    expect(result.reaction).toBe('average');
    expect(result.contact).toBe('medium');
    expect(result.power).toBe('low');
    expect(result.swingDiscipline).toBe('free_swinger');
    expect(result.speed).toBe('average');
    expect(Array.isArray(result.skills)).toBe(true);
    expect(Array.isArray(result.tags)).toBe(true);
    expect(Array.isArray(result.preferredPositions)).toBe(true);
    expect(Array.isArray(result.avoidPositions)).toBe(true);
  });

  test('5.6: V1 "prefs" takes priority over "preferredPositions" when both present (prefs checked first)', function () {
    // mapPlayerToV2: Array.isArray(player.prefs) ? player.prefs : player.preferredPositions
    // prefs is checked first — this is intentional V1→V2 mapping behavior
    var player = { name: 'Player', prefs: ['P'], preferredPositions: ['SS', '2B'] };
    var result = mapPlayerToV2(player);
    expect(result.preferredPositions).toEqual(['P']);
  });

  test('5.7: player.name falls back to player.playerName if name missing', function () {
    var result = mapPlayerToV2({ playerName: 'Jane Doe' });
    expect(result.name).toBe('Jane Doe');
  });

  test('5.8: all existing fields are spread through (future-field preservation)', function () {
    var player = { name: 'Player', customData: 'preserved', walkUpLink: 'https://example.com' };
    var result = mapPlayerToV2(player);
    expect(result.customData).toBe('preserved');
    expect(result.walkUpLink).toBe('https://example.com');
  });

  test('5.9: V1 silent fallback guard — generateLineupV2 always returns usedFallback=false', function () {
    // Regression guard: any V1 fallback path in App.jsx is silent.
    // The V2 engine itself must never engage it.
    var result = generateLineupV2(mockRoster, 4);
    expect(result.usedFallback).toBe(false);
  });
});
