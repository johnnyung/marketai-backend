import express from 'express';
import shadowLiquidityService from '../services/shadowLiquidityService.js';
const router = express.Router();
router.get('/scan/:ticker', async (req, res) => {
  try {
    const result = await shadowLiquidityService.scanShadows(req.params.ticker);
    res.json({ success: true, data: result });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
export default router;
