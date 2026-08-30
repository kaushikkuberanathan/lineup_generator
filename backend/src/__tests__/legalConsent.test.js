/**
 * legalConsent.test.js
 * Hermetic coverage for POST /api/v1/auth/consent (migration 028's
 * legal_consents table) — the additive-only route that records which
 * version of the Terms of Service / Privacy Policy a coach accepted,
 * without ever storing the document text itself. See that migration's
 * header and auth.js's route comment for the full rationale.
 *
 * Same stub pattern as auth.happy.test.js: supabaseAdmin.from is patched
 * per test with a table-keyed result queue; restored in afterEach.
 */
const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const request = require('supertest');
const { supabaseAdmin } = require('../lib/supabase');
const app = require('../../app');

const originalAdminFrom = supabaseAdmin.from;
let calls;

function installStubs({ insertResult = { error: null } } = {}) {
  calls = { fromTables: [], insertedRows: null };

  supabaseAdmin.from = (table) => {
    calls.fromTables.push(table);
    return {
      insert: async (rows) => {
        if (table === 'legal_consents') calls.insertedRows = rows;
        return insertResult;
      },
    };
  };
}

afterEach(() => {
  supabaseAdmin.from = originalAdminFrom;
  calls = undefined;
});

const VALID_BODY = {
  email: 'jane@example.com',
  consents: [
    { docId: 'terms', version: '2.0' },
    { docId: 'privacy', version: '1.0' },
  ],
  context: 'request_access',
};

describe('POST /api/v1/auth/consent', () => {

  test('CONSENT-1: valid multi-doc consent → 201, one row per doc, version only (no text field exists to store)', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/auth/consent')
      .send(VALID_BODY);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 2);
    assert.ok(calls.fromTables.includes('legal_consents'));
    assert.equal(calls.insertedRows.length, 2);
    assert.deepEqual(calls.insertedRows[0], {
      email: 'jane@example.com',
      doc_id: 'terms',
      version: '2.0',
      context: 'request_access',
    });
    assert.deepEqual(calls.insertedRows[1], {
      email: 'jane@example.com',
      doc_id: 'privacy',
      version: '1.0',
      context: 'request_access',
    });
  });

  test('CONSENT-2: email is normalized (Gmail dot-variant) the same way /request-access is (#374)', async () => {
    installStubs();

    await request(app)
      .post('/api/v1/auth/consent')
      .send({ ...VALID_BODY, email: 'Jane.Doe@gmail.com', consents: [{ docId: 'terms', version: '2.0' }] });

    assert.equal(calls.insertedRows[0].email, 'janedoe@gmail.com');
  });

  test('CONSENT-3: context defaults to "request_access" when omitted', async () => {
    installStubs();
    const { context, ...withoutContext } = VALID_BODY;
    void context;

    await request(app)
      .post('/api/v1/auth/consent')
      .send(withoutContext);

    assert.equal(calls.insertedRows[0].context, 'request_access');
  });

  test('CONSENT-4: missing email → 400, no insert attempted', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/auth/consent')
      .send({ consents: VALID_BODY.consents });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.fromTables.length, 0);
  });

  test('CONSENT-5: empty consents array → 400, no insert attempted', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/auth/consent')
      .send({ email: VALID_BODY.email, consents: [] });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.fromTables.length, 0);
  });

  test('CONSENT-6: a consent item missing version → 400, no insert attempted', async () => {
    installStubs();

    const res = await request(app)
      .post('/api/v1/auth/consent')
      .send({ email: VALID_BODY.email, consents: [{ docId: 'terms' }] });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.equal(calls.fromTables.length, 0);
  });

  test('CONSENT-7: DB error on insert → 500', async () => {
    installStubs({ insertResult: { error: { message: 'db down' } } });

    const res = await request(app)
      .post('/api/v1/auth/consent')
      .send(VALID_BODY);

    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'INTERNAL_ERROR');
  });

});
