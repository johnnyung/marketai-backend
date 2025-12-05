import express from 'express';
import pool from '../db/index.js';
import NewsCollectorService from '../services/collectors/NewsCollectorService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Instantiate the service
const newsCollector = new NewsCollectorService(pool);

router.post('/news', authenticateToken, async (req, res) => {
  try {
    await newsCollector.collect();
    res.json({ message: 'News collection triggered' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/all', authenticateToken, async (req, res) => {
    try {
        await newsCollector.collect();
        // Trigger other collectors here if they existed
        res.json({ message: 'All collections triggered' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/stats', authenticateToken, async (req, res) => {
    // Placeholder stats for now until service implements getStats
    res.json({ status: 'Active', news_collected: 0 });
});

export default router;
