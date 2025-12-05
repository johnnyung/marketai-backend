import express from 'express';
import paperTradingService from '../services/paperTradingService.js';

const router = express.Router();

router.get('/status', async (req, res) => {
  try {
    const state = await paperTradingService.getPortfolioState();
    res.json({ success: true, data: state });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/run-cycle', async (req, res) => {
  try {
    const result = await paperTradingService.runCycle();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
