require('./src/lib/env');
const express = require('express');
const cors = require('cors');

const authRouter = require('./src/routes/auth');
const adminRouter = require('./src/routes/admin');
const feedbackRouter = require('./src/routes/feedback');

const app = express();
const PORT = 5000;

app.use(cors({ origin: 'https://line-up-generator.vercel.app' }));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Lineup Generator API is running');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
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
const TIMEOUT_MS = 25000;

app.post('/api/ai', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Service not configured' });
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
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1', adminRouter);
app.use('/api/v1', feedbackRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
});
