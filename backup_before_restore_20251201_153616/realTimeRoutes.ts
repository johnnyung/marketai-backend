import express from 'express';
import realTimeFeedService from '../services/realTimeFeedService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get Full Snapshot
router.get('/snapshot/:ticker', authenticateToken, async (req, res) => {
  try {
    const { ticker } = req.params;
    const snapshot = await realTimeFeedService.getSnapshot(ticker.toUpperCase());
    
    if (snapshot) {
        res.json({ success: true, data: snapshot });
    } else {
        res.status(404).json({ success: false, error: 'Ticker data unavailable' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
