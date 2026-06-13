/**
 * aiProxy.test.js
 * Coverage for POST /api/ai — the Claude API proxy (Story 99 / #252).
 * Closes the P2 "AI Photo Import End-to-End" debt (DOC_TEST_DEBT.md).
 *
 * Why this exists: the v2.2.4 prod incident — large phone photos exceeding the
 * body limit after base64 — shipped its fix with NO regression test. AI-2 is
 * that guard. The other five tests lock the proxy's status-code contract so a
 * future refactor of the upstream call can't silently change client-facing
 * behaviour.
 *
 * Hermetic / CI-safe: no DB, no network. global.fetch is stubbed per test and
 * restored in afterEach. ANTHROPIC_API_KEY is overridden to a dummy in
 * beforeEach (and deleted in AI-1) so the 503 branch is reachable WITHOUT
 * disturbing the SUPABASE_* vars that src/lib/env.js requires at import.
 * require('../../app') pulls dotenv transitively (same as admin.auth.test.js).
 * Uses request(app); no port is bound.
 *
 * Handler under test: app.js:90-138. Branch order in the handler is
 * (1) API key → (2) content-length → (3) type → (4) upstream fetch, so each
 * test sets up only the state needed to reach its branch.
 */
const request = require('supertest');
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../../app');

const REAL_FETCH = global.fetch;
const REAL_KEY = process.env.ANTHROPIC_API_KEY;
const FIVE_MB = 5 * 1024 * 1024;

describe('POST /api/ai — Claude proxy', () => {

  beforeEach(() => {
    // Every test except AI-1 needs the key present to clear the 503 gate.
    process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
  });

  afterEach(() => {
    global.fetch = REAL_FETCH;
    if (REAL_KEY === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = REAL_KEY;
  });

  // ── AI-1: unconfigured → 503, upstream never touched ────────────────────────
  test('AI-1: no ANTHROPIC_API_KEY → 503 AI_NOT_CONFIGURED, fetch not called', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    let fetchCalled = false;
    global.fetch = async () => { fetchCalled = true; throw new Error('should not run'); };

    const res = await request(app)
      .post('/api/ai')
      .send({ type: 'schedule', userContent: 'x' });

    assert.equal(res.status, 503);
    assert.equal(res.body.error, 'AI_NOT_CONFIGURED');
    assert.equal(fetchCalled, false);
  });

  // ── AI-2: oversize body → 413 (the v2.2.4 regression guard) ─────────────────
  test('AI-2: body over 5MB → 413, fetch not called', async () => {
    let fetchCalled = false;
    global.fetch = async () => { fetchCalled = true; throw new Error('should not run'); };

    // 6MB of userContent: passes express.json (10mb limit) but trips the
    // handler's >5MB content-length guard before the upstream call.
    const res = await request(app)
      .post('/api/ai')
      .send({ type: 'schedule', userContent: 'x'.repeat(FIVE_MB + 1024 * 1024) });

    assert.equal(res.status, 413);
    assert.match(res.body.error, /too large/i);
    assert.equal(fetchCalled, false);
  });

  // ── AI-3: bad type → 400, upstream never touched ────────────────────────────
  test('AI-3: type not in [schedule,result] → 400 Invalid type, fetch not called', async () => {
    let fetchCalled = false;
    global.fetch = async () => { fetchCalled = true; throw new Error('should not run'); };

    const res = await request(app)
      .post('/api/ai')
      .send({ type: 'lineup', userContent: 'x' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Invalid type');
    assert.equal(fetchCalled, false);
  });

  // ── AI-4: happy path → passes upstream status + body through verbatim ────────
  test('AI-4: valid request → upstream status/body relayed; correct call shape', async () => {
    let capturedUrl, capturedInit;
    const upstreamBody = { content: [{ type: 'text', text: '{"games":[]}' }] };
    global.fetch = async (url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return { status: 200, json: async () => upstreamBody };
    };

    const res = await request(app)
      .post('/api/ai')
      .send({ type: 'schedule', systemPrompt: 'be terse', userContent: 'parse this' });

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, upstreamBody);

    // Contract: correct endpoint, model, and that user content is forwarded.
    assert.equal(capturedUrl, 'https://api.anthropic.com/v1/messages');
    const sent = JSON.parse(capturedInit.body);
    assert.equal(sent.model, 'claude-sonnet-4-6');
    assert.equal(sent.max_tokens, 1000);
    assert.equal(sent.system, 'be terse');
    assert.equal(sent.messages[0].content, 'parse this');
  });

  // ── AI-5: upstream timeout (AbortError) → 504 ───────────────────────────────
  test('AI-5: fetch throws AbortError → 504 timeout', async () => {
    global.fetch = async () => {
      const e = new Error('aborted');
      e.name = 'AbortError';
      throw e;
    };

    const res = await request(app)
      .post('/api/ai')
      .send({ type: 'result', userContent: 'x' });

    assert.equal(res.status, 504);
    assert.match(res.body.error, /timed out/i);
  });

  // ── AI-6: upstream unreachable (generic error) → 502 ────────────────────────
  test('AI-6: fetch throws generic error → 502', async () => {
    global.fetch = async () => { throw new Error('ECONNREFUSED'); };

    const res = await request(app)
      .post('/api/ai')
      .send({ type: 'result', userContent: 'x' });

    assert.equal(res.status, 502);
    assert.match(res.body.error, /reach AI service/i);
  });

});
