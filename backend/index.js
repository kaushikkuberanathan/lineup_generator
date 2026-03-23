const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
