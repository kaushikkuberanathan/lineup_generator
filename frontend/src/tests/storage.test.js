/**
 * storage.test.js — direct coverage for utils/storage.js's own implementation.
 *
 * Found during the #406/#410 test-health survey (Pass 4): every localStorage
 * read/write in the app funnels through loadJSON/saveJSON, but no test
 * exercised the module's own behavior directly — other test files either
 * mock it entirely or borrow the real loadJSON only to set up their own
 * fixtures. Malformed-JSON handling, the in-memory fallback for a blocked
 * localStorage, and the basic round trip were all unverified.
 *
 * Run: npm test  (from frontend/)
 */

import { loadJSON, saveJSON } from '../utils/storage.js';

describe('storage — round trip', function () {

  test('saveJSON then loadJSON returns the same value back', function () {
    saveJSON('rt_key', { roster: ['Aiden', 'Benji'] });
    expect(loadJSON('rt_key', null)).toEqual({ roster: ['Aiden', 'Benji'] });
  });

  test('round trip preserves arrays, numbers, and nested objects', function () {
    var value = { count: 3, players: ['A', 'B'], meta: { active: true } };
    saveJSON('rt_nested', value);
    expect(loadJSON('rt_nested', null)).toEqual(value);
  });
});

describe('storage — loadJSON defaults', function () {

  test('returns the default when the key was never set', function () {
    expect(loadJSON('never_set_key', 'fallback')).toBe('fallback');
  });

  test('returns the default when the stored value is malformed JSON', function () {
    localStorage.setItem('bad_json_key', '{not valid json');
    expect(loadJSON('bad_json_key', 'fallback')).toBe('fallback');
  });

  test('default can itself be an object, returned as-is (not cloned/parsed)', function () {
    var def = { empty: true };
    expect(loadJSON('missing_key_obj', def)).toBe(def);
  });
});

describe('storage — localStorage-unavailable fallback', function () {

  var realSetItem = localStorage.setItem;
  var realGetItem = localStorage.getItem;

  afterEach(function () {
    localStorage.setItem = realSetItem;
    localStorage.getItem = realGetItem;
  });

  test('saveJSON does not throw when localStorage.setItem throws (quota/private-browsing)', function () {
    localStorage.setItem = function () { throw new Error('QuotaExceededError'); };
    expect(function () { saveJSON('quota_key', { a: 1 }); }).not.toThrow();
  });

  test('a value saved while setItem throws is still readable via the in-memory fallback once getItem also throws', function () {
    localStorage.setItem = function () { throw new Error('QuotaExceededError'); };
    saveJSON('mem_fallback_key', { rescued: true });

    localStorage.getItem = function () { throw new Error('SecurityError'); };
    expect(loadJSON('mem_fallback_key', null)).toEqual({ rescued: true });
  });

  test('loadJSON returns the default (not a throw) when both localStorage and the in-memory cache miss', function () {
    localStorage.getItem = function () { throw new Error('SecurityError'); };
    expect(loadJSON('totally_unknown_key', 'fallback')).toBe('fallback');
  });
});
