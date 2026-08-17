if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

// Optional local dev/prod Supabase toggle. Untouched (falls through to the
// plain SUPABASE_* vars exactly as before) unless SUPABASE_TARGET is
// explicitly set — Render never sets this, so production is unaffected.
const target = process.env.SUPABASE_TARGET;
if (target) {
    const suffix = target.toUpperCase();
    const suffixed = ['URL', 'ANON_KEY', 'SERVICE_ROLE_KEY']
        .map(k => `SUPABASE_${k}_${suffix}`);
    const allPresent = suffixed.every(k => process.env[k]);
    if (!allPresent) {
        throw new Error(
            `SUPABASE_TARGET=${target} set, but one of ${suffixed.join(', ')} is missing.`
        );
    }
    process.env.SUPABASE_URL = process.env[`SUPABASE_URL_${suffix}`];
    process.env.SUPABASE_ANON_KEY = process.env[`SUPABASE_ANON_KEY_${suffix}`];
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env[`SUPABASE_SERVICE_ROLE_KEY_${suffix}`];
    console.log(target === 'prod'
        ? '\n🚨🚨🚨  SUPABASE_TARGET=prod — this local process can write to PRODUCTION  🚨🚨🚨\n'
        : `\n🔧  SUPABASE_TARGET=${target} — using SUPABASE_URL_${suffix}\n`);
}

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY'];
for (const key of required) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}

const optional = ['RESEND_API_KEY', 'APP_URL'];
for (const key of optional) {
    if (!process.env[key]) {
        console.warn(`[env] Optional variable not set: ${key}`);
    }
}

module.exports = {};