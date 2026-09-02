require('./src/lib/env');
const express = require('express');
const cors = require('cors');

const authRouter = require('./src/routes/auth');
const adminRouter = require('./src/routes/admin');
const feedbackRouter = require('./src/routes/feedback');
const teamDataRouter = require('./src/routes/teamData');
const opsRouter = require('./src/routes/ops');
const homeRouter = require('./src/routes/home');
const { supabaseAdmin } = require('./src/lib/supabase');

const app = express();

// Render terminates TLS and proxies every request, so X-Forwarded-For is
// always set. Without this, Express reports req.ip as Render's proxy
// address rather than the real client — express-rate-limit then can't
// distinguish callers and either throttles everyone collectively or no one
// meaningfully. `1` (not `true`) trusts only the single hop Render adds, so
// a client can't spoof X-Forwarded-For to evade the limiter. (#390)
app.set('trust proxy', 1);

const ALLOWED_ORIGINS = [
  'https://dugoutlineup.com',
  // Stable custom domain for the DEV frontend/backend pairing (Story
  // team-season-tracking DEV rollout, 2026-08-18) — distinct from the
  // Vercel branch-alias URLs below, which point at the same `develop`
  // build but under the *.vercel.app hostname rather than this domain.
  'https://dev.dugoutlineup.com',
  // Stable Vercel branch-alias URLs for `develop` — always point at the
  // latest push to that branch, unlike the per-deployment random-ID URLs
  // below (which the regex covers instead of hardcoding each one).
  'https://lineup-generator-git-develop-kaushikkuberanathans-projects.vercel.app',
  'https://line-up-generator-git-develop-kaushikkuberanathans-projects.vercel.app',
];
// Per-deployment Vercel preview URLs (e.g. https://lineup-generator-i9ffbofs9-
// kaushikkuberanathans-projects.vercel.app) — one random alphanumeric ID per
// deployment, both current Vercel projects (line-up-generator / lineup-generator).
// Scoped to this team's project-name pattern, not a bare *.vercel.app suffix
// match, so it doesn't accept preview domains from other Vercel accounts/teams.
const VERCEL_PREVIEW_ORIGIN_RE = /^https:\/\/(line-up-generator|lineup-generator)-[a-z0-9]+-kaushikkuberanathans-projects\.vercel\.app$/;
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow any localhost port for local dev
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    if (VERCEL_PREVIEW_ORIGIN_RE.test(origin)) return callback(null, true);
    // #389: a rejected origin is a client-side condition, not a server
    // fault — 500 gave callers and monitoring no usable signal, and the
    // origin itself was never logged, making a rejection undiagnosable.
    console.warn('[CORS] rejected origin:', origin);
    const err = new Error('Not allowed by CORS');
    err.status = 403;
    callback(err);
  }
}));
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.send('Lineup Generator API is running');
});

app.get('/health', async (req, res) => {
  const { version } = require('./package.json');

  // DB connectivity check — lightweight read of the Mud Hens team row
  const DB_TEAM_ID = '1774297491626';
  let db = 'error';
  let db_latency_ms = null;
  let db_error = null;

  try {
    const t0 = Date.now();
    const { data, error } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('id', DB_TEAM_ID)
      .single();
    db_latency_ms = Date.now() - t0;

    if (error || !data) {
      db = 'error';
      db_error = error?.message ?? 'row not found';
    } else {
      db = 'ok';
    }
  } catch (err) {
    db = 'error';
    db_error = err.message;
  }

  const httpStatus = db === 'ok' ? 200 : 503;

  res.status(httpStatus).json({
    status:        db === 'ok' ? 'ok' : 'degraded',
    uptime:        process.uptime(),
    timestamp:     new Date().toISOString(),
    version,
    db,
    db_latency_ms,
    ...(db_error ? { db_error } : {}),
  });
});

app.post('/generate-lineup', (req, res) => {
  const { players } = req.body;

  if (!players || !Array.isArray(players) || players.length === 0) {
    return res.status(400).json({ error: 'Players array is required' });
  }

  const shuffled = [...players].sort(() => Math.random() - 0.5);
  res.json({ lineup: shuffled });
});

// Anthropic API proxy — keeps API key server-side
const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5MB
const TIMEOUT_MS = 30000;

app.post('/api/ai', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI_NOT_CONFIGURED' });
  }

  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Request too large (max 5MB)' });
  }

  const { type, systemPrompt, userContent } = req.body;
  const allowed = ['schedule', 'result'];
  if (!allowed.includes(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let anthropicRes;
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: (systemPrompt || '').slice(0, 2000),
        messages: [{ role: 'user', content: userContent }]
      }),
      signal: controller.signal
    });
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') {
      return res.status(504).json({ error: 'AI service timed out. Please try again.' });
    }
    return res.status(502).json({ error: 'Failed to reach AI service' });
  }
  clearTimeout(timer);

  const data = await anthropicRes.json();
  res.status(anthropicRes.status).json(data);
});

app.get('/ping', function(req, res) {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/ops', opsRouter);
app.use('/api/v1/teams', teamDataRouter);
// homeRouter MUST mount before adminRouter, same reasoning as feedbackRouter
// directly below: adminRouter's router.use(requireAuth, requireAdmin) gate
// (admin.js:172) is unconditional for ANY path under its bare /api/v1
// mount, matched or not. Mounting homeRouter first lets its one specific
// path (/api/v1/home) claim that exact route before adminRouter's catch-all
// ever sees it; every other path still falls through to adminRouter
// exactly as before (#1023).
app.use('/api/v1/home', homeRouter);
// feedbackRouter MUST mount before adminRouter (Story 99 closure, 2026-07-31).
// Both share the /api/v1 base. adminRouter has an unconditional, path-agnostic
// router.use(requireAuth, requireAdmin) gate (admin.js:172) that runs for ANY
// request reaching that mount point, whether or not a route inside adminRouter
// itself matches the path (documented in backend/CLAUDE.md's admin routes
// section as "it 401s any unmatched path under the router too"). With
// adminRouter mounted first, every POST /api/v1/feedback request hit that gate
// before ever reaching feedback.js's own route, and requireAdmin 403'd any
// non-admin coach — the feedback feature was only reachable by the one admin
// account. feedbackRouter has no such catch-all, so mounting it first lets its
// one specific route (/feedback) claim that exact path; every other path still
// falls through to adminRouter exactly as before. See feedback.test.js FB-7.
app.use('/api/v1', feedbackRouter);
app.use('/api/v1', adminRouter);
// Ops/data-protection routes — localhost or X-Admin-Key restricted
// legacy mount — deprecate after /api/v1/teams cutover is confirmed
app.use('/api/teams', teamDataRouter);

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const code = err.code || (status === 500 ? 'INTERNAL_ERROR' : 'ERROR');
  console.error('[ERROR]', status, err.message);
  res.status(status).json({
    error: code,
    message: status === 500 ? undefined : err.message
  });
});

module.exports = app;
