import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import AIProcessorService from '../services/ai/AIProcessorService.js';

const router = express.Router();

router.post('/reddit', authenticateToken, async (req, res) => {
  try {
    const result = await AIProcessorService.processReddit(100);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/news', authenticateToken, async (req, res) => {
  try {
    const result = await AIProcessorService.processNews(100);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/all', authenticateToken, async (req, res) => {
  try {
    const [reddit, news] = await Promise.all([
      AIProcessorService.processReddit(100),
      AIProcessorService.processNews(100)
    ]);
    res.json({ success: true, data: { reddit, news } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
