import express from 'express';
import gammaExposureService from '../services/gammaExposureService.js';
const router = express.Router();
router.get('/analyze/:ticker', async (req, res) => {
  try {
    const result = await gammaExposureService.analyze(req.params.ticker);
    res.json({ success: true, data: result || { status: 'no_data' } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
export default router;
