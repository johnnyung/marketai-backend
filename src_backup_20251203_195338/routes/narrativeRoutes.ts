import express from 'express';
import narrativePressureService from '../services/narrativePressureService.js';
const router = express.Router();
router.get('/pressure/:ticker', async (req, res) => {
  try {
    const result = await narrativePressureService.calculatePressure(req.params.ticker);
    res.json({ success: true, data: result });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
export default router;
