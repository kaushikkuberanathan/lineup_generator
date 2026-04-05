#!/usr/bin/env node
// smoke-test.js — environment health check for Dugout Lineup
// Usage: node scripts/smoke-test.js --env=dev
//        node scripts/smoke-test.js --env=prod
//
// Reads config from .env.smoke at repo root (never commit .env.smoke).
// Expected keys in .env.smoke:
//
//   DEV_BACKEND_URL=http://localhost:3001
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
async function checkSupabase(supabaseUrl, supabaseKey) {
  section('CATEGORY 3 — Supabase connectivity');

  if (!supabaseUrl || !supabaseKey) {
    fail('Supabase checks', 'missing URL or anon key — skipping all');
    return;
  }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
  };

  const tables = [
    { name: 'teams',              check: 'at least one row' },
    { name: 'feature_flags',      check: 'table exists'     },
    { name: 'team_data_history',  check: 'table exists'     },
    { name: 'roster_snapshots',   check: 'table exists'     },
  ];

  for (const { name, check } of tables) {
    try {
      const { res, ms } = await timedFetch(
        `${supabaseUrl}/rest/v1/${name}?select=*&limit=1`,
        { headers }
      );

      if (res.status === 200) {
        const rows = await res.json().catch(() => []);
        if (name === 'teams' && (!Array.isArray(rows) || rows.length === 0)) {
          fail(`${name}: ${check}`, `0 rows returned`);
        } else {
          pass(`${name}: ${check}`, `${ms}ms`);
        }
      } else {
        let body = {};
        try { body = await res.json(); } catch (_) {}
        fail(`${name}: ${check}`, `HTTP ${res.status} — ${body.message || body.error || ''}`);
      }
    } catch (err) {
      fail(`${name}: ${check}`, err.message);
    }
  }
}

// ── CATEGORY 4 — Schedule field integrity (DEV only) ─────────────────────────
async function checkScheduleIntegrity(supabaseUrl, supabaseKey) {
  section('CATEGORY 4 — Schedule field integrity');

  if (ENV !== 'dev') {
    skip('Schedule field integrity', 'DEV only — skipped in prod');
    return;
  }

  const teamId = env('DEV_TEAM_ID');
  if (!teamId) { fail('Schedule integrity', 'DEV_TEAM_ID missing from .env.smoke'); return; }
  if (!supabaseUrl || !supabaseKey) { fail('Schedule integrity', 'missing Supabase config'); return; }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
  };

  try {
    const { res, ms } = await timedFetch(
      `${supabaseUrl}/rest/v1/team_data?team_id=eq.${teamId}&select=schedule&limit=1`,
      { headers }
    );

    if (res.status !== 200) {
      fail('Read schedule for DEV_TEAM_ID', `HTTP ${res.status}`);
      return;
    }

    const rows = await res.json().catch(() => []);
    if (!rows || rows.length === 0) {
      fail('Read schedule for DEV_TEAM_ID', 'no row found');
      return;
    }

    pass(`Read schedule for DEV_TEAM_ID`, `${ms}ms`);

    const schedule = rows[0].schedule;
    if (!Array.isArray(schedule)) {
      warn('Schedule field integrity', 'schedule is not an array — skipping field checks');
      return;
    }

    const requiredFields = ['snackDuty', 'gameBall', 'scoreReported', 'battingPerf'];
    let allClean = true;
    schedule.forEach((game, i) => {
      const missing = requiredFields.filter(f => !(f in game));
      if (missing.length > 0) {
        warn(`Game ${i} (${game.date || 'no date'}) missing fields`, missing.join(', '));
        allClean = false;
      }
    });

    if (allClean) {
      pass('All games have required fields (snackDuty, gameBall, scoreReported, battingPerf)');
    }
  } catch (err) {
    fail('Schedule integrity check', err.message);
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
