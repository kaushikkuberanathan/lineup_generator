/**
 * ops.js — Operational health routes
 *
 * Mounted at /api/v1/ops in index.js.
 * Legacy aliases /ping and /health remain in index.js for backward compatibility
 * (UptimeRobot, useBackendHealth.js, CI scripts).
 */

'use strict';

const express      = require('express');
const { supabaseAdmin } = require('../lib/supabase');

const router = express.Router();

const MUD_HENS_TEAM_ID = '1774297491626';

// GET /api/v1/ops/ping
router.get('/ping', function(req, res) {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /api/v1/ops/health
router.get('/health', async function(req, res) {
  const start = Date.now();
  try {
    const { error } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('id', MUD_HENS_TEAM_ID)
      .single();

    const latency = Date.now() - start;

    if (error) {
      return res.status(503).json({
        status: 'degraded',
        uptime: process.uptime(),
        version: process.env.npm_package_version || 'unknown',
        db: 'error',
        db_latency_ms: latency,
      });
    }

    return res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      version: process.env.npm_package_version || 'unknown',
      db: 'ok',
      db_latency_ms: latency,
    });
  } catch (err) {
    return res.status(503).json({
      status: 'error',
      uptime: process.uptime(),
      version: process.env.npm_package_version || 'unknown',
      db: 'unreachable',
      db_latency_ms: Date.now() - start,
    });
  }
});

module.exports = router;
