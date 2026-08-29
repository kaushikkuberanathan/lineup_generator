/**
 * lib/normalizeEmail.js
 *
 * Single source of truth for email normalization, used on both the read
 * side (POST /magic-link's membership match) and the write side (POST
 * /request-access, POST /coaches) so they can never drift apart again (#374).
 *
 * Before this fix, /magic-link's login check normalized the incoming email
 * via express-validator's normalizeEmail() (lowercase + Gmail dot/subaddress
 * stripping), but team_memberships.email was written with only
 * .toLowerCase() (POST /request-access) or no normalization at all (POST
 * /coaches) - so a coach whose membership was created as
 * "sam.jones@gmail.com" could be locked out typing "samjones@gmail.com",
 * not because login was naive, but because the two sides disagreed on what
 * "the same email" means.
 *
 * Deliberately hand-rolled instead of pulling in the `validator` package
 * directly (only a transitive dependency of express-validator here, not a
 * direct one - see backend/package.json) - implements exactly the Gmail
 * dot/+subaddress rule #374 asked for (Option 1), nothing broader for
 * other providers.
 */

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * @param {string} email
 * @returns {string} lowercased email; for gmail.com/googlemail.com
 *   addresses, also strips dots from the local part and any +subaddress
 *   suffix, and canonicalizes googlemail.com -> gmail.com.
 */
function normalizeEmail(email) {
  const trimmed = String(email).trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex === -1) return trimmed;

  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);

  if (!GMAIL_DOMAINS.has(domain)) return trimmed;

  const withoutSubaddress = local.split('+')[0];
  const withoutDots = withoutSubaddress.replace(/\./g, '');
  return `${withoutDots}@gmail.com`;
}

module.exports = { normalizeEmail };
