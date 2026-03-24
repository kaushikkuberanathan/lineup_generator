// NEVER use JWT claims for role authorization. Always query the database.
// JWT can be forged or stale.

const { supabaseAdmin } = require('../lib/supabase');

/**
 * Verifies the authenticated user holds an active admin membership.
 * Must run after requireAuth (depends on req.user being set).
 * Sets req.adminMembership on success; returns 403 on failure.
 */
async function requireAdmin(req, res, next) {
  const { data, error } = await supabaseAdmin
    .from('team_memberships')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('role', 'admin')
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('[requireAdmin] DB error checking admin membership:', error.message);
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  if (!data) {
    console.warn(`[requireAdmin] rejected: user ${req.user.id} has no active admin membership`);
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  req.adminMembership = data;
  next();
}

module.exports = requireAdmin;
