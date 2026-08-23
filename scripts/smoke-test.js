#!/usr/bin/env node
// smoke-test.js — environment health check for Dugout Lineup
// Usage: node scripts/smoke-test.js --env=dev
//        node scripts/smoke-test.js --env=prod
//
// Reads config from .env.smoke at repo root (never commit .env.smoke).
// Expected keys in .env.smoke:
//
//   DEV_BACKEND_URL=http://localhost:5000
//   PROD_BACKEND_URL=https://lineup-generator-backend.onrender.com
//   DEV_FRONTEND_URL=http://localhost:5173
//   PROD_FRONTEND_URL=https://dugoutlineup.com
//   DEV_SUPABASE_URL=
//   PROD_SUPABASE_URL=
//   DEV_SUPABASE_ANON_KEY=
//   PROD_SUPABASE_ANON_KEY=
//   DEV_TEAM_ID=1774297491626
//   PROD_TEAM_ID=
//
// Requires Node 18+ (native fetch). Node 24 confirmed.

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Parse CLI args ────────────────────────────────────────────────────────────
const envArg = process.argv.find(a => a.startsWith('--env='));
if (!envArg) {
  console.error('Usage: node scripts/smoke-test.js --env=dev|prod');
  process.exit(1);
}
const ENV = envArg.split('=')[1].toLowerCase();
if (ENV !== 'dev' && ENV !== 'prod') {
  console.error('--env must be "dev" or "prod"');
  process.exit(1);
}
const PREFIX = ENV.toUpperCase();

// ── Load .env.smoke ───────────────────────────────────────────────────────────
const envSmokePath = path.join(__dirname, '..', '.env.smoke');
if (!fs.existsSync(envSmokePath)) {
  console.error('[FATAL] .env.smoke not found at repo root. Copy .env.smoke.example and fill in values.');
  process.exit(1);
}
const envVars = {};
fs.readFileSync(envSmokePath, 'utf8')
  .split('\n')
  .forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    envVars[key] = val;
  });

function env(key) { return envVars[key] || ''; }

// ── Result tracking ───────────────────────────────────────────────────────────
let failed = false;

function pass(label, detail) {
  console.log(`[PASS] ${label}${detail ? ' — ' + detail : ''}`);
}
function fail(label, detail) {
  failed = true;
  console.log(`[FAIL] ${label}${detail ? ' — ' + detail : ''}`);
}
function warn(label, detail) {
  console.log(`[WARN] ${label}${detail ? ' — ' + detail : ''}`);
}
function skip(label, reason) {
  console.log(`[SKIP] ${label} — ${reason}`);
}
function section(title) {
  console.log(`\n── ${title} ──`);
}

// ── Timed fetch ───────────────────────────────────────────────────────────────
async function timedFetch(url, opts) {
  const t0 = Date.now();
  const res = await fetch(url, opts);
  const ms  = Date.now() - t0;
  return { res, ms };
}

// ── CATEGORY 1 — Environment config ──────────────────────────────────────────
function checkConfig() {
  section('CATEGORY 1 — Environment config');

  // APP_VERSION from frontend/package.json
  let appVersion = '';
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'frontend', 'package.json'), 'utf8'));
    appVersion = pkg.version || '';
  } catch (_) {}
  if (appVersion && /^\d+\.\d+\.\d+/.test(appVersion)) {
    pass('APP_VERSION from frontend/package.json', appVersion);
  } else {
    fail('APP_VERSION from frontend/package.json', `got: "${appVersion}"`);
  }

  // Backend URL
  const backendUrl = env(`${PREFIX}_BACKEND_URL`);
  if (backendUrl) {
    pass(`${PREFIX}_BACKEND_URL present`, backendUrl);
  } else {
    fail(`${PREFIX}_BACKEND_URL present`, 'missing from .env.smoke');
  }

  // Frontend URL
  const frontendUrl = env(`${PREFIX}_FRONTEND_URL`);
  if (frontendUrl) {
    pass(`${PREFIX}_FRONTEND_URL present`, frontendUrl);
  } else {
    fail(`${PREFIX}_FRONTEND_URL present`, 'missing from .env.smoke');
  }

  // Supabase URL + anon key
  const supabaseUrl = env(`${PREFIX}_SUPABASE_URL`);
  const supabaseKey = env(`${PREFIX}_SUPABASE_ANON_KEY`);
  if (supabaseUrl && supabaseKey) {
    pass(`${PREFIX}_SUPABASE_URL + ANON_KEY present`);
  } else {
    fail(`${PREFIX}_SUPABASE_URL + ANON_KEY present`,
      !supabaseUrl ? 'SUPABASE_URL missing' : 'SUPABASE_ANON_KEY missing');
  }

  // ANTHROPIC_API_KEY — presence only (value never logged)
  const anthropicKey = env('ANTHROPIC_API_KEY');
  if (anthropicKey) {
    pass('ANTHROPIC_API_KEY present');
  } else {
    fail('ANTHROPIC_API_KEY', 'missing from .env.smoke — AI photo import will return 503 in prod');
  }

  return { backendUrl, frontendUrl, supabaseUrl, supabaseKey };
}

// ── CATEGORY 2 — Backend health ───────────────────────────────────────────────
async function checkBackend(backendUrl) {
  section('CATEGORY 2 — Backend health');

  if (!backendUrl) { fail('/ping reachable', 'no backend URL — skipping'); return; }

  try {
    const { res, ms } = await timedFetch(`${backendUrl}/ping`, {
      signal: AbortSignal.timeout(2000),
    });
    if (ms > 1000) warn('/ping response time', `${ms}ms — cold start risk`);

    if (res.status === 200) {
      let body = {};
      try { body = await res.json(); } catch (_) {}
      pass('GET /ping responds 200', `${ms}ms`);
      if (body.status === 'ok') {
        pass('GET /ping body contains status: "ok"');
      } else {
        fail('GET /ping body contains status: "ok"', `got: ${JSON.stringify(body.status)}`);
      }
    } else {
      fail('GET /ping responds 200', `got ${res.status} in ${ms}ms`);
    }
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      fail('GET /ping responds 200 within 2000ms', 'timed out after 2000ms');
    } else {
      fail('GET /ping reachable', err.message);
    }
  }
}

// ── CATEGORY 3 — Supabase connectivity ───────────────────────────────────────
//
// These are security-regression guards, not connectivity checks. Since the
// v2.6.0 auth gate (membership-scoped RLS) and the v2.5.31 grant revocations,
// the anon key is INTENTIONALLY restricted on most of these tables. A PASS
// here means "anon still can't see what it shouldn't" — a FAIL means either
// a genuine outage, or a real security regression (anon can suddenly read
// data it used to be correctly blocked from). See issue #449 for the
// investigation that replaced the old pre-auth-gate assumptions.
async function checkSupabase(supabaseUrl, supabaseKey) {
  section('CATEGORY 3 — Supabase connectivity + access-control regression guards');

  if (!supabaseUrl || !supabaseKey) {
    fail('Supabase checks', 'missing URL or anon key — skipping all');
    return;
  }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
  };

  const tables = [
    // Public by design — anon must see real rows, or a real feature breaks.
    { name: 'feature_flags', mode: 'public-read',
      note: 'flags must be readable pre-auth (useFeatureFlags bootstrap)' },
    { name: 'share_links',   mode: 'public-read',
      note: 'backs Strategic North Star #1 — share links never require login' },
    // Membership-scoped RLS (v2.6.0, WS-3, #342) — anon has no membership,
    // so it must see zero rows. Any row returned is a live data leak.
    { name: 'teams',            mode: 'membership-scoped' },
    { name: 'roster_snapshots', mode: 'membership-scoped' },
    // Grants revoked outright (v2.5.31) — anon must get a permission error,
    // not a 200. A 200 here means the grant was accidentally restored.
    { name: 'team_data_history', mode: 'grant-revoked' },
  ];

  for (const { name, mode, note } of tables) {
    try {
      const { res, ms } = await timedFetch(
        `${supabaseUrl}/rest/v1/${name}?select=*&limit=1`,
        { headers }
      );
      let body = {};
      try { body = await res.json(); } catch (_) {}
      const rows = Array.isArray(body) ? body : [];

      if (mode === 'public-read') {
        if (res.status === 200 && rows.length > 0) {
          pass(`${name}: public read returns data`, `${ms}ms`);
        } else if (res.status === 200) {
          fail(`${name}: public read returns data`, `0 rows returned${note ? ' — ' + note : ''}`);
        } else {
          fail(`${name}: public read returns data`,
            `HTTP ${res.status} — ${body.message || body.error || ''} — REGRESSION: was publicly readable`);
        }
      } else if (mode === 'membership-scoped') {
        if (res.status === 200 && rows.length === 0) {
          pass(`${name}: anon correctly sees zero rows`, `${ms}ms`);
        } else if (res.status === 200) {
          fail(`${name}: anon correctly sees zero rows`,
            `SECURITY REGRESSION — anon read ${rows.length} row(s) it should not see`);
        } else if (res.status === 401 || res.status === 403) {
          pass(`${name}: anon blocked (grant or RLS)`, `HTTP ${res.status}, ${ms}ms`);
        } else {
          fail(`${name}: anon access check`, `unexpected HTTP ${res.status}`);
        }
      } else if (mode === 'grant-revoked') {
        if (res.status === 401 || res.status === 403) {
          pass(`${name}: anon correctly denied`, `HTTP ${res.status}, ${ms}ms`);
        } else if (res.status === 200) {
          fail(`${name}: anon correctly denied`,
            'SECURITY REGRESSION — anon can now read this table (grant was revoked by design)');
        } else {
          fail(`${name}: anon access check`, `unexpected HTTP ${res.status}`);
        }
      }
    } catch (err) {
      fail(`${name}: anon access check`, err.message);
    }
  }
}

// ── CATEGORY 4 — team_data access-control guard + opportunistic field check ──
//
// team_data is membership-scoped RLS (v2.6.0, WS-3, #342) — the anon key has
// no membership on any team, so the primary assertion is that anon CANNOT
// read this row. That's a security-regression guard, same as Category 3.
// If a row does come back (regression), the schedule field-integrity check
// still runs as a bonus diagnostic — but the category fails either way,
// because the real finding is the data exposure, not the field shape.
async function checkScheduleIntegrity(supabaseUrl, supabaseKey) {
  section('CATEGORY 4 — team_data access-control guard (DEV only)');

  if (ENV !== 'dev') {
    skip('team_data access-control guard', 'DEV only — skipped in prod');
    return;
  }

  const teamId = env('DEV_TEAM_ID');
  if (!teamId) { fail('team_data access-control guard', 'DEV_TEAM_ID missing from .env.smoke'); return; }
  if (!supabaseUrl || !supabaseKey) { fail('team_data access-control guard', 'missing Supabase config'); return; }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
  };

  try {
    const { res, ms } = await timedFetch(
      `${supabaseUrl}/rest/v1/team_data?team_id=eq.${teamId}&select=schedule&limit=1`,
      { headers }
    );

    if (res.status === 401 || res.status === 403) {
      pass('Anon correctly blocked from reading team_data', `HTTP ${res.status}, ${ms}ms`);
      return;
    }

    if (res.status !== 200) {
      fail('Anon access to team_data', `unexpected HTTP ${res.status}`);
      return;
    }

    const rows = await res.json().catch(() => []);
    if (!rows || rows.length === 0) {
      pass('Anon correctly sees zero rows for team_data', `${ms}ms`);
      return;
    }

    // Regression: anon CAN read this team's data. Fail loudly, then still
    // run the field-integrity check so a real leak is fully diagnosed in
    // one run rather than requiring a second pass.
    fail('Anon correctly sees zero rows for team_data',
      `SECURITY REGRESSION — anon read team_data for DEV_TEAM_ID (${ms}ms)`);

    const schedule = rows[0].schedule;
    if (!Array.isArray(schedule)) {
      warn('Schedule field integrity', 'schedule is not an array — skipping field checks');
      return;
    }

    const requiredFields = ['snackDuty', 'gameBall', 'scoreReported', 'battingPerf'];
    schedule.forEach((game, i) => {
      const missing = requiredFields.filter(f => !(f in game));
      if (missing.length > 0) {
        warn(`Game ${i} (${game.date || 'no date'}) missing fields`, missing.join(', '));
      }
    });
  } catch (err) {
    fail('team_data access-control guard', err.message);
  }
}

// ── CATEGORY 5 — Share link reachability ─────────────────────────────────────
async function checkFrontend(frontendUrl) {
  section('CATEGORY 5 — Share link reachability');

  if (process.env.CI === 'true') {
    warn('Category 5 skipped in CI — frontend not reachable from GitHub Actions runners');
    return;
  }

  if (!frontendUrl) { fail('Frontend reachable', 'no frontend URL — skipping'); return; }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const t0 = Date.now();
    const res = await fetch(
      frontendUrl + '/?s=smoke-invalid-token',
      { redirect: 'follow', signal: controller.signal }
    );
    clearTimeout(timeoutId);
    const ms = Date.now() - t0;

    if (ms > 3000) warn('Frontend response time', `${ms}ms`);

    if (res.status === 200) {
      const finalUrl = res.url || '';
      if (finalUrl.includes('/login') || finalUrl.includes('/auth')) {
        fail('Share link: no redirect to /login or /auth', `redirected to ${finalUrl}`);
      } else {
        pass('GET /?s=smoke-invalid-token returns 200, no auth redirect', `${ms}ms`);
      }
    } else {
      fail('GET /?s=smoke-invalid-token returns 200', `got ${res.status} in ${ms}ms`);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      warn('Frontend reachability timed out after 8s');
      return;
    }
    fail('Frontend reachable — fetch failed: ' + err.message);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nDugout Lineup — Smoke Test [${ENV.toUpperCase()}]`);
  console.log('='.repeat(44));

  const { backendUrl, frontendUrl, supabaseUrl, supabaseKey } = checkConfig();

  await checkBackend(backendUrl);
  await checkSupabase(supabaseUrl, supabaseKey);
  await checkScheduleIntegrity(supabaseUrl, supabaseKey);
  await checkFrontend(frontendUrl);

  console.log('');
  if (failed) {
    console.log('❌ Smoke test FAILED — see [FAIL] lines above');
    process.exit(1);
  } else {
    console.log(`✅ Smoke test passed — ${ENV} environment healthy`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
