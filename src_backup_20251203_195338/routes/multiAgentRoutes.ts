import express from 'express';
import multiAgentValidationService from '../services/multiAgentValidationService.js';
const router = express.Router();
router.get('/validate/:ticker', async (req, res) => {
  try {
    const result = await multiAgentValidationService.validate(req.params.ticker);
    res.json({ success: true, data: result });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
export default router;
