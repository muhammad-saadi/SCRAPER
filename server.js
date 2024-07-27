// server.js
const express = require('express');
const { scrape } = require('./scripts/toastTab');

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Puppeteer Debugger</h1>
        <button onclick="startScraping()">Start Scraping</button>
        <script>
          async function startScraping() {
            try {
              const response = await fetch('/scrape');
              const data = await response.json();
              console.log('Scraping started:', data);
            } catch (error) {
              console.error('Error starting scrape:', error);
            }
          }
        </script>
      </body>
    </html>
  `);
});

app.get('/scrape', async (req, res) => {
  try {
    await scrape();
    res.json({ message: 'Scraping started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});




