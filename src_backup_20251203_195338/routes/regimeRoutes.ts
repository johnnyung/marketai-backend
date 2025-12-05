import express from 'express';
import regimeTransitionService from '../services/regimeTransitionService.js';
const router = express.Router();
router.get('/current', async (req, res) => {
  try {
    const result = await regimeTransitionService.detectRegime();
    res.json({ success: true, data: result });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
export default router;
