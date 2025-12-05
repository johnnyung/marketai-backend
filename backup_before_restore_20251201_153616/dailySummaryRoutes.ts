import express from 'express';
import dailySummaryService from '../services/dailySummaryService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const summary = await dailySummaryService.generateBriefing();
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
