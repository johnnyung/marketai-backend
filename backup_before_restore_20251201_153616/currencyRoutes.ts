import express from 'express';
import currencyShockService from '../services/currencyShockService.js';
const router = express.Router();
router.get('/shock', async (req, res) => {
  try {
    const result = await currencyShockService.analyzeShock();
    res.json({ success: true, data: result });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
export default router;
