const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve compare.html
app.get('/compare', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'compare.html'));
});

// Serve index.html also at /visualize
app.get('/visualize', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fetch user info
app.get('/api/user/:handle', async (req, res) => {
  const { handle } = req.params;
  try {
    const response = await axios.get(`https://codeforces.com/api/user.info?handles=${handle}`);
    res.json(response.data.result[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Codeforces user info.' });
  }
});

// Fetch user rating history
app.get('/api/user-rating/:handle', async (req, res) => {
  const { handle } = req.params;
  try {
    const response = await axios.get(`https://codeforces.com/api/user.rating?handle=${handle}`);
    res.json(response.data.result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Codeforces rating history.' });
  }
});

// Fetch user submissions
app.get('/api/user-submissions/:handle', async (req, res) => {
  const { handle } = req.params;
  try {
    const response = await axios.get(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=1000`);
    res.json(response.data.result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Codeforces submissions.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
