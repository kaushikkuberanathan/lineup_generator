/**
 * cors.test.js
 * Regression coverage for the CORS allowlist (app.js) — added when
 * ALLOWED_ORIGINS was widened to accept this Vercel team's preview
 * domains (stable branch-alias URLs + a project-scoped regex for
 * per-deployment random-ID URLs), on top of the pre-existing
 * dugoutlineup.com + localhost allowances.
 *
 * CI-safe: hits GET /ping (no DB, no auth) with varying Origin headers,
 * asserts on the Access-Control-Allow-Origin response header rather than
 * inspecting app.js internals directly.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

require('../lib/env');

const request = require('supertest');
const app = require('../../app');

describe('CORS allowlist', () => {
  test('C1: no Origin header (curl, mobile apps) — allowed, no CORS header expected', async () => {
    const res = await request(app).get('/ping');
    assert.equal(res.status, 200);
  });

  test('C2: production origin (dugoutlineup.com) — allowed', async () => {
    const res = await request(app).get('/ping').set('Origin', 'https://dugoutlineup.com');
    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], 'https://dugoutlineup.com');
  });

  test('C3: localhost, any port — allowed', async () => {
    const res = await request(app).get('/ping').set('Origin', 'http://localhost:5173');
    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
  });

  test('C3b: DEV custom domain (dev.dugoutlineup.com) — allowed', async () => {
    const res = await request(app).get('/ping').set('Origin', 'https://dev.dugoutlineup.com');
    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], 'https://dev.dugoutlineup.com');
  });

  test('C4: stable develop branch-alias URL (lineup-generator project) — allowed', async () => {
    const origin = 'https://lineup-generator-git-develop-kaushikkuberanathans-projects.vercel.app';
    const res = await request(app).get('/ping').set('Origin', origin);
    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], origin);
  });

  test('C5: stable develop branch-alias URL (line-up-generator project) — allowed', async () => {
    const origin = 'https://line-up-generator-git-develop-kaushikkuberanathans-projects.vercel.app';
    const res = await request(app).get('/ping').set('Origin', origin);
    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], origin);
  });

  test('C6: per-deployment preview URL matching the project-scoped regex — allowed', async () => {
    const origin = 'https://lineup-generator-i9ffbofs9-kaushikkuberanathans-projects.vercel.app';
    const res = await request(app).get('/ping').set('Origin', origin);
    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], origin);
  });

  test('C7: unrelated *.vercel.app origin (different team/project) — rejected', async () => {
    const res = await request(app).get('/ping').set('Origin', 'https://some-other-app-abc123-someone-elses-team.vercel.app');
    assert.equal(res.status, 500);
    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });

  test('C8: arbitrary attacker origin — rejected', async () => {
    const res = await request(app).get('/ping').set('Origin', 'https://evil.example.com');
    assert.equal(res.status, 500);
    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });
});
