import express from 'express';
import anomalyDetectionService from '../services/anomalyDetectionService.js';

const router = express.Router();

router.get('/top', async (req, res) => {
  try {
    const anomalies = await anomalyDetectionService.getTopAnomalies();
    res.json({ success: true, data: anomalies });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/heatmap', async (req, res) => {
  try {
    const heatmap = await anomalyDetectionService.getHeatmapData();
    res.json({ success: true, data: heatmap });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
