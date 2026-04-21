/**
 * Regression guard: all three newGame template sites in App.jsx must include
 * the four finalization fields. Prevents the v2.2.2 class of regression
 * where adding a field to one site but not the others causes data inconsistency.
 */

import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

var APP_PATH = path.resolve(__dirname, '../App.jsx');
var source   = fs.readFileSync(APP_PATH, 'utf8');

var NEW_GAME_RE = /\{ date:"", time:"", location:"", opponent:"", result:"", ourScore:"", theirScore:"", battingPerf:\{\}, snackDuty:"", gameBall:\[\], gameBallSearch:"", scoreReported:false[^}]+\}/g;

describe('newGame template — field completeness guard', function() {

  test('all three newGame sites are present in App.jsx', function() {
    var matches = source.match(NEW_GAME_RE) || [];
    expect(matches.length).toBe(3);
  });

  test('all three newGame sites include usScore:null', function() {
    var matches = source.match(NEW_GAME_RE) || [];
    var count = matches.filter(function(m) { return m.includes('usScore:null'); }).length;
    expect(count).toBe(3);
  });

  test('all three newGame sites include oppScore:null', function() {
    var matches = source.match(NEW_GAME_RE) || [];
    var count = matches.filter(function(m) { return m.includes('oppScore:null'); }).length;
    expect(count).toBe(3);
  });

  test('all three newGame sites include gameStatus:\'scheduled\'', function() {
    var matches = source.match(NEW_GAME_RE) || [];
    var count = matches.filter(function(m) { return m.includes("gameStatus:'scheduled'"); }).length;
    expect(count).toBe(3);
  });

  test('all three newGame sites include finalizedAt:null', function() {
    var matches = source.match(NEW_GAME_RE) || [];
    var count = matches.filter(function(m) { return m.includes('finalizedAt:null'); }).length;
    expect(count).toBe(3);
  });

});
