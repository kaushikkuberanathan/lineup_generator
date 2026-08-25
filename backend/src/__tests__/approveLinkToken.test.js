/**
 * approveLinkToken.test.js
 * Unit coverage for lib/approveLinkToken.js — the HMAC sign/verify pair
 * backing the 1-tap approve/deny email links (#337).
 *
 * Hermetic: pure crypto, no network, no Supabase.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const ORIGINAL_SECRET = process.env.APPROVE_LINK_HMAC_SECRET;

before(() => {
  process.env.APPROVE_LINK_HMAC_SECRET = 'test-secret-do-not-use-in-prod';
});

after(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.APPROVE_LINK_HMAC_SECRET;
  } else {
    process.env.APPROVE_LINK_HMAC_SECRET = ORIGINAL_SECRET;
  }
});

// Re-required after the env var is set — module itself has no top-level
// secret read (getSecret() reads process.env lazily per call), but require
// fresh anyway to keep this file's intent obvious.
const { sign, verify, TokenError } = require('../lib/approveLinkToken');

describe('approveLinkToken - sign/verify round trip', () => {

  test('AT-1: a freshly signed approve token verifies and returns its payload', () => {
    const token = sign({ requestId: 'req-1', teamId: 'team-1', action: 'approve' });
    const payload = verify(token, 'approve');

    assert.equal(payload.requestId, 'req-1');
    assert.equal(payload.teamId, 'team-1');
    assert.equal(payload.action, 'approve');
    assert.equal(typeof payload.exp, 'number');
  });

  test('AT-2: a freshly signed deny token verifies with a null teamId', () => {
    const token = sign({ requestId: 'req-2', action: 'deny' });
    const payload = verify(token, 'deny');

    assert.equal(payload.requestId, 'req-2');
    assert.equal(payload.teamId, null);
    assert.equal(payload.action, 'deny');
  });

  test('AT-3: tampering with the payload segment is rejected as TOKEN_TAMPERED', () => {
    const token = sign({ requestId: 'req-3', teamId: 'team-3', action: 'approve' });
    const [payloadB64, sig] = token.split('.');

    const forgedPayload = Buffer.from(
      JSON.stringify({ requestId: 'req-3', teamId: 'someone-elses-team', action: 'approve', iat: Date.now(), exp: Date.now() + 1000 })
    ).toString('base64url');
    const forgedToken = `${forgedPayload}.${sig}`;

    assert.throws(() => verify(forgedToken, 'approve'), (err) => {
      assert.ok(err instanceof TokenError);
      assert.equal(err.code, 'TOKEN_TAMPERED');
      return true;
    });
    assert.notEqual(payloadB64, forgedPayload); // sanity: the forgery actually changed something
  });

  test('AT-4: tampering with the signature segment is rejected as TOKEN_TAMPERED', () => {
    const token = sign({ requestId: 'req-4', teamId: 'team-4', action: 'approve' });
    const [payloadB64] = token.split('.');
    const forgedToken = `${payloadB64}.not-the-real-signature`;

    assert.throws(() => verify(forgedToken, 'approve'), { code: 'TOKEN_TAMPERED' });
  });

  test('AT-5: a signature produced with a different secret is rejected as TOKEN_TAMPERED', () => {
    const token = sign({ requestId: 'req-5', teamId: 'team-5', action: 'approve' });

    const savedSecret = process.env.APPROVE_LINK_HMAC_SECRET;
    process.env.APPROVE_LINK_HMAC_SECRET = 'a-completely-different-secret';
    try {
      assert.throws(() => verify(token, 'approve'), { code: 'TOKEN_TAMPERED' });
    } finally {
      process.env.APPROVE_LINK_HMAC_SECRET = savedSecret;
    }
  });

  test('AT-6: an expired token is rejected as TOKEN_EXPIRED, not TOKEN_TAMPERED', () => {
    const token = sign({ requestId: 'req-6', teamId: 'team-6', action: 'approve' });
    const [payloadB64] = token.split('.');
    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

    // Re-sign a payload that is identical except already-expired, so the
    // signature itself is genuinely valid — isolates the expiry check from
    // the tamper check.
    const expiredPayload = { ...decoded, exp: Date.now() - 1 };
    const expiredPayloadB64 = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
    const crypto = require('crypto');
    const expiredSig = crypto.createHmac('sha256', process.env.APPROVE_LINK_HMAC_SECRET)
      .update(expiredPayloadB64).digest('base64url');
    const expiredToken = `${expiredPayloadB64}.${expiredSig}`;

    assert.throws(() => verify(expiredToken, 'approve'), { code: 'TOKEN_EXPIRED' });
  });

  test('AT-7: an approve token cannot be replayed against the deny action', () => {
    const token = sign({ requestId: 'req-7', teamId: 'team-7', action: 'approve' });
    assert.throws(() => verify(token, 'deny'), { code: 'TOKEN_TAMPERED' });
  });

  test('AT-8: malformed tokens (missing separator, empty, garbage) are rejected as TOKEN_MALFORMED', () => {
    assert.throws(() => verify('', 'approve'), { code: 'TOKEN_MALFORMED' });
    assert.throws(() => verify('no-dot-here', 'approve'), { code: 'TOKEN_MALFORMED' });
    assert.throws(() => verify(null, 'approve'), { code: 'TOKEN_MALFORMED' });
    assert.throws(() => verify('.', 'approve'), { code: 'TOKEN_MALFORMED' });
  });

  test('AT-9: sign() requires requestId and action', () => {
    assert.throws(() => sign({ teamId: 'team-9', action: 'approve' }));
    assert.throws(() => sign({ requestId: 'req-9' }));
  });

});
