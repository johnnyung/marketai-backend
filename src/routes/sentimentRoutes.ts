import express from 'express';
import marketSentimentService from '../services/marketSentimentService.js';
const router = express.Router();
router.get('/thermometer', async (req, res) => {
  try {
    const result = await marketSentimentService.getThermometer();
    res.json({ success: true, data: result });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
export default router;
