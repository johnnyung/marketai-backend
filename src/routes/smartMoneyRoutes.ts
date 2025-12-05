import express from 'express';
import smartMoneyHeatmapService from '../services/smartMoneyHeatmapService.js';

const router = express.Router();

router.get('/heatmap', async (req, res) => {
  try {
    const dashboard = await smartMoneyHeatmapService.getDashboard();
    res.json({ success: true, data: dashboard });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
