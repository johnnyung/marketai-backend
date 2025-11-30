import express from 'express';
import enhancedDeepDiveService from '../services/enhancedDeepDiveService.js';
import deepDiveService from '../services/deepDiveService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// FIX: Specific ticker route (This was 404ing)
router.get('/:ticker', authenticateToken, async (req, res) => {
  try {
    const { ticker } = req.params;
    // Use Enhanced Service by default for quality
    const analysis = await enhancedDeepDiveService.generateDeepDive(ticker);
    res.json({ success: true, data: analysis });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Keep existing routes
router.get('/ticker-of-day', authenticateToken, async (req, res) => {
  try {
    const analysis = await deepDiveService.generateTickerDeepDive();
    res.json({ success: true, data: analysis });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/all', authenticateToken, async (req, res) => {
  try {
    const analysis = await enhancedDeepDiveService.generateDeepDive('SPY');
    res.json({ success: true, data: { ticker_of_day: analysis } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
