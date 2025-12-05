import express from 'express';
import insiderIntentService from '../services/insiderIntentService.js';
const router = express.Router();
router.get('/intent/:ticker', async (req, res) => {
  try {
    const result = await insiderIntentService.analyzeIntent(req.params.ticker);
    res.json({ success: true, data: result });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
export default router;
