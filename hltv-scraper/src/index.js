const express = require('express');
const { scrapeMatch } = require('./scraper');

const app = express();
app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string' || !url.startsWith('https://www.hltv.org/matches/')) {
    return res.status(400).json({ error: 'Invalid HLTV match URL' });
  }

  try {
    const result = await scrapeMatch(url);
    res.json(result);
  } catch (error) {
    if (error.message === 'cloudflare_blocked') {
      res.status(503).json({ status: 'cloudflare_blocked' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`HLTV Scraper running on port ${PORT}`);
});
