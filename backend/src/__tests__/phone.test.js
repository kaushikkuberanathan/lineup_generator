'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { normalizePhone, maskPhone } = require('../lib/phone');

// ============================================================================
// lib/phone.js — no test file despite being live: maskPhone() is called from
// requireAuth.js's rejection-logging path to keep a raw phone number out of
// server logs. Not dead code, per a direct grep before writing this file.
// ============================================================================

describe('normalizePhone', function () {
  test('normalizes a (XXX) XXX-XXXX formatted US number to E.164', function () {
    assert.equal(normalizePhone('(404) 555-0123'), '+14045550123');
  });

  test('normalizes a bare 10-digit US number to E.164', function () {
    assert.equal(normalizePhone('4045550123'), '+14045550123');
  });

  test('passes through an already-E.164 number unchanged', function () {
    assert.equal(normalizePhone('+14045550123'), '+14045550123');
  });

  test('throws INVALID_PHONE for an unparseable string', function () {
    assert.throws(function () { normalizePhone('555-INVALID'); }, function (err) {
      return err.code === 'INVALID_PHONE';
    });
  });

  test('throws INVALID_PHONE for a non-string input', function () {
    assert.throws(function () { normalizePhone(4045550123); }, function (err) {
      return err.code === 'INVALID_PHONE';
    });
  });

  test('throws INVALID_PHONE for an empty string', function () {
    assert.throws(function () { normalizePhone(''); }, function (err) {
      return err.code === 'INVALID_PHONE';
    });
  });
});

describe('maskPhone', function () {
  test('masks an E.164 number to only the last 4 digits', function () {
    assert.equal(maskPhone('+14045550123'), '***-***-0123');
  });

  test('masks correctly regardless of separators already in the input', function () {
    assert.equal(maskPhone('+1 (404) 555-0123'), '***-***-0123');
  });
});
