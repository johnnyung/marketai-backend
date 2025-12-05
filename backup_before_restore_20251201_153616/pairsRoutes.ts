import express from 'express';
import pairsTradingService from '../services/pairsTradingService.js';
const router = express.Router();
router.get('/generate', async (req, res) => {
  try {
    const result = await pairsTradingService.generatePairs();
    res.json({ success: true, data: result });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
export default router;
