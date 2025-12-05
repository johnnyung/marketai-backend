import express from 'express';
import diagnosticsService from '../services/diagnosticsService.js';
import dataVerificationService from '../services/dataVerificationService.js';
import systemStabilityService from '../services/systemStabilityService.js';

const router = express.Router();

router.get('/run', async (req, res) => {
  try {
    const report = await diagnosticsService.runFullDiagnostics();
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/verify-data', async (req, res) => {
  try {
    const report = await dataVerificationService.verifyAllSources();
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// NEW: PSSL Endpoint
router.get('/integrity-check', async (req, res) => {
  try {
    const report = await systemStabilityService.runIntegrityCheck();
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
