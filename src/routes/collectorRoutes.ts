import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import RedditCollectorService from '../services/collectors/RedditCollectorService.js';
import NewsCollectorService from '../services/collectors/NewsCollectorService.js';

const router = express.Router();

router.post('/reddit', authenticateToken, async (req, res) => {
  try {
    const result = await RedditCollectorService.collect();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/news', authenticateToken, async (req, res) => {
  try {
    const result = await NewsCollectorService.collect();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/all', authenticateToken, async (req, res) => {
  try {
    const [reddit, news] = await Promise.all([
      RedditCollectorService.collect(),
      NewsCollectorService.collect()
    ]);
    res.json({ success: true, data: { reddit, news } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [reddit, news] = await Promise.all([
      RedditCollectorService.getStats(),
      NewsCollectorService.getStats()
    ]);
    res.json({ success: true, data: { reddit, news } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
