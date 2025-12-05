import express from 'express';
import autonomousAlertService from '../services/autonomousAlertService.js';

const router = express.Router();

router.get('/alerts', async (req, res) => {
  try {
    const alerts = await autonomousAlertService.getRecentAlerts();
    res.json({ success: true, data: alerts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
