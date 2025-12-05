import express from 'express';

const router = express.Router();

// Ping
router.get('/', (_req, res) => {
  res.json({ route: 'portfolio', status: 'ok' });
});

// Basic summary stub to satisfy health scanner / FE calls
router.get('/summary', (_req, res) => {
  res.json({
    positions: [],
    metrics: {
      totalValue: 0,
      cash: 0,
      pnl: 0,
    },
  });
});

// Positions stub
router.get('/positions', (_req, res) => {
  res.json({ positions: [] });
});

export default router;
