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

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'APPROVE_LINK_HMAC_SECRET'];
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

// Legacy Supabase JWT keys (`eyJ...`) were disabled on the prod project after
// the 2026-07-20 cutover incident (#387) — a stale legacy anon key in Render
// broke every login for ~15min with no startup-time signal, only a runtime
// "Legacy API keys are disabled" error on the first auth call. New-style
// keys are `sb_secret_...` / `sb_publishable_...`. This is a warning, not a
// throw: DEV still uses legacy keys deliberately (its project hasn't
// disabled them), so a hard failure here would break local/DEV boot.
const legacyKeyPattern = /^eyJ/;
for (const key of ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY']) {
    if (legacyKeyPattern.test(process.env[key] || '')) {
        console.warn(
            `\n⚠️⚠️⚠️  [env] ${key} looks like a legacy Supabase JWT ("eyJ..."). ` +
            `If this project has legacy keys disabled, every auth call using it will fail. ` +
            `Expected a new-style key (sb_secret_... / sb_publishable_...). See #387.  ⚠️⚠️⚠️\n`
        );
    }
}

module.exports = {};