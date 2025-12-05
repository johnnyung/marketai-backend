import express from 'express';
import socialSentimentService from '../services/socialSentimentService.js';
import socialIntelligenceIntegration from '../services/socialIntelligenceIntegration.js'; // Correct service
import expandedSocialService from '../services/expandedSocialService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/social/trending
router.get('/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const data = await socialSentimentService.getTrendingTickers(limit);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/social/summary
router.get('/summary', async (req, res) => {
  try {
    // Fixed: Use socialIntelligenceIntegration for summary data
    const data = await socialIntelligenceIntegration.getSocialIntelligenceSummary();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/social/analyze (Manual Trigger)
router.post('/analyze', authenticateToken, async (req, res) => {
  try {
    // Trigger ingestion logic
    const result = await expandedSocialService.getRedditInvestingSentiment();
    res.json({ success: true, message: "Analysis triggered", count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
