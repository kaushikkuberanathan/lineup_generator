const { supabaseAdmin } = require('../lib/supabase');
const { maskPhone } = require('../lib/phone');

/**
 * Validates the incoming request has a live Supabase session.
 * Sets req.user on success; returns 401 on failure.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    console.warn('[requireAuth] rejected: no Bearer token in Authorization header');
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    const phone = data?.user?.phone;
    const hint = phone ? ` phone=${maskPhone(phone)}` : '';
    console.warn(`[requireAuth] rejected: invalid or expired token${hint}`);
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  req.user = data.user;
  next();
}

module.exports = requireAuth;
