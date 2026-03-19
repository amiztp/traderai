import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log('Starting server initialization...');
  const app = express();
  const PORT = 3000;

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    console.log('Health check requested.');
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API proxy for Binance to avoid CORS and browser-side fetch errors
  app.get('/api/klines', async (req, res) => {
    console.log(`Received request for /api/klines: ${JSON.stringify(req.query)}`);
    const { symbol, interval, limit } = req.query;
    // Try different Binance endpoints if one fails
    const endpoints = [
      'https://api.binance.com',
      'https://api1.binance.com',
      'https://api2.binance.com',
      'https://api3.binance.com'
    ];
    
    let lastError = null;
    for (const base of endpoints) {
      const url = `${base}/api/v3/klines?symbol=${symbol || 'BTCUSDT'}&interval=${interval || '1m'}&limit=${limit || '100'}`;
      try {
        console.log(`Attempting to fetch from: ${url}`);
        const response = await axios.get(url, { timeout: 5000 });
        console.log(`Successfully fetched from: ${base}`);
        return res.json(response.data);
      } catch (error: any) {
        console.error(`Failed to fetch from ${base}:`, error.message);
        lastError = error;
      }
    }

    res.status(500).json({ 
      error: 'Failed to fetch data from all Binance endpoints', 
      details: lastError?.message || 'Unknown error' 
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    console.log('Initializing Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware initialized.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
