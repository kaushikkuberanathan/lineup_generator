/**
 * lib/approveLinkToken.js
 * HMAC-signed, time-limited tokens for the public 1-tap approve/deny email links
 * (GET /admin/approve-link, GET /admin/deny-link — #337).
 *
 * Problem this replaces: those routes previously trusted raw requestId/teamId
 * query params with no signature and no expiry — forwardable/guessable
 * indefinitely. A token now carries requestId/teamId/action itself, signed
 * with APPROVE_LINK_HMAC_SECRET, so the route derives its inputs from a
 * verified payload rather than the query string.
 *
 * Token shape: `${base64url(JSON payload)}.${base64url(HMAC-SHA256 digest)}`.
 * The action ('approve' | 'deny') is signed into the payload so an approve
 * token can't be replayed against the deny route or vice versa.
 */

const crypto = require('crypto');

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h, per #337 acceptance criteria

class TokenError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function getSecret() {
  const secret = process.env.APPROVE_LINK_HMAC_SECRET;
  if (!secret) {
    // Should be unreachable in any booted process — env.js requires this var
    // at startup. Guarded here too so a unit test importing this module
    // directly still fails loudly instead of signing with `undefined`.
    throw new Error('APPROVE_LINK_HMAC_SECRET is not set');
  }
  return secret;
}

function signPayload(payloadB64) {
  return crypto.createHmac('sha256', getSecret()).update(payloadB64).digest('base64url');
}

/**
 * @param {object} opts
 * @param {string} opts.requestId — access_requests.id
 * @param {string} [opts.teamId]  — approve needs it, deny doesn't
 * @param {'approve'|'deny'} opts.action
 * @returns {string} opaque token for the email link's `?token=` param
 */
function sign({ requestId, teamId, action }) {
  if (!requestId || !action) {
    throw new Error('sign() requires requestId and action');
  }

  const now = Date.now();
  const payload = {
    requestId,
    teamId: teamId != null ? String(teamId) : null,
    action,
    iat: now,
    exp: now + TOKEN_TTL_MS,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = signPayload(payloadB64);
  return `${payloadB64}.${sig}`;
}

/**
 * Verifies a token's signature, action binding, and expiry.
 * Throws TokenError with .code one of TOKEN_MALFORMED / TOKEN_TAMPERED / TOKEN_EXPIRED.
 *
 * @param {string} token
 * @param {'approve'|'deny'} expectedAction
 * @returns {{ requestId: string, teamId: string|null, action: string, iat: number, exp: number }}
 */
function verify(token, expectedAction) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    throw new TokenError('TOKEN_MALFORMED', 'Malformed token.');
  }

  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) {
    throw new TokenError('TOKEN_MALFORMED', 'Malformed token.');
  }

  const expectedSig = signPayload(payloadB64);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new TokenError('TOKEN_TAMPERED', 'This link is invalid or has been tampered with.');
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    throw new TokenError('TOKEN_MALFORMED', 'Malformed token.');
  }

  // Signature already verified above, so a mismatched action means the
  // caller pointed a validly-signed token at the wrong route (e.g. an
  // approve token hitting /deny-link), not tampering of the payload itself -
  // still treated as tampered from the caller's perspective, since either
  // way this token must not be honored for this route.
  if (expectedAction && payload.action !== expectedAction) {
    throw new TokenError('TOKEN_TAMPERED', 'This link is invalid or has been tampered with.');
  }

  if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
    throw new TokenError('TOKEN_EXPIRED', 'This link has expired. Please request a new one.');
  }

  return payload;
}

module.exports = { sign, verify, TokenError, TOKEN_TTL_MS };
