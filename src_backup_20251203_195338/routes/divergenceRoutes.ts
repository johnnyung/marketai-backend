import express from 'express';
import divergenceDetectorService from '../services/divergenceDetectorService.js';
const router = express.Router();
router.get('/analyze/:ticker', async (req, res) => {
  try {
    const result = await divergenceDetectorService.analyze(req.params.ticker);
    res.json({ success: true, data: result });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
export default router;
