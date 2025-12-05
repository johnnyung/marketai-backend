import express from 'express';
import fmpService from '../services/fmpService.js';
import tickerUniverseService from '../services/tickerUniverseService.js';

const router = express.Router();

// Simple ping
router.get('/', (_req, res) => {
  res.json({ route: 'debug', status: 'ok' });
});

// Environment snapshot (safe subset)
router.get('/env', (_req, res) => {
  res.json({
    nodeEnv: process.env.NODE_ENV || null,
    runtime: 'node',
    hasFmpKey: !!process.env.FMP_API_KEY,
    hasRailwayEnv: !!process.env.RAILWAY_ENVIRONMENT_NAME,
  });
});

// Direct FMP quote test: /api/debug/fmp/quote/AAPL
router.get('/fmp/quote/:ticker', async (req, res) => {
  try {
    const ticker = (req.params.ticker || '').toUpperCase();
    const quote = await fmpService.getPrice(ticker);
    res.json({ ok: !!quote, ticker, quote });
  } catch (err: any) {
    console.error('[DEBUG] FMP quote error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// SP500 / universe test
router.get('/sp500', async (_req, res) => {
  try {
    const universe = await tickerUniverseService.getUniverse();
    res.json({ ok: true, count: universe.length, universe: universe.slice(0, 50) });
  } catch (err: any) {
    console.error('[DEBUG] Universe error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Health bundle: runs a few checks in parallel
router.get('/health', async (_req, res) => {
  try {
    const [fmpStatus, universe] = await Promise.all([
      fmpService.checkConnection(),
      tickerUniverseService.getUniverse().catch(() => [] as string[]),
    ]);

    const health = {
      fmp: fmpStatus,
      universe: {
        size: universe.length,
        sample: universe.slice(0, 10),
      },
    };

    res.json({ ok: !!fmpStatus.success, health });
  } catch (err: any) {
    console.error('[DEBUG] Health error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
