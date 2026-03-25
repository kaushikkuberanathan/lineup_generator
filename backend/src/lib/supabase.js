const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL) {
  throw new Error('Missing required environment variable: SUPABASE_URL');
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * Supabase admin client authenticated with the service role key.
 *
 * IMPORTANT: This client bypasses Row Level Security (RLS) entirely.
 * Use only for trusted server-side operations.
 * Never expose this client, its key, or any response containing auth tokens to the frontend or client responses.
 */
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log('[supabase] admin key prefix:', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 30));

/**
 * Supabase anon client for operations that should respect RLS.
 * Safe to use with user-scoped requests once a session is attached.
 */
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = { supabaseAdmin, supabaseAnon };
