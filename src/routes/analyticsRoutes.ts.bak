import express from 'express';
import { pool } from '../db/index.js';
import comprehensiveDataEngine from '../services/comprehensiveDataEngine.js';
import catalystHunterService from '../services/catalystHunterService.js';
import jobManager from '../services/jobManagerService.js';

const router = express.Router();

// JOB STATUS
router.get('/job-status/:type', (req, res) => {
    const status = jobManager.getJob(req.params.type.toUpperCase());
    res.json(status || { state: 'idle' });
});

// RUN ANALYSIS
router.post('/comprehensive', async (req, res) => {
  try {
      jobManager.startJob('ANALYSIS', 'Initializing Deep Brain...');
      res.json({ success: true, message: 'Analysis Started' });

      (async () => {
          try {
              await comprehensiveDataEngine.runComprehensiveCollection();
              jobManager.completeJob('ANALYSIS', 'Analysis Complete');
          } catch (e: any) {
              jobManager.failJob('ANALYSIS', e.message);
          }
      })();
  } catch (e: any) {
      res.status(409).json({ success: false, error: e.message });
  }
});

// RUN HUNTER
router.post('/hunt-catalysts', async (req, res) => {
  try {
      jobManager.startJob('HUNTER', 'Scanning Legislative Data...');
      res.json({ success: true, message: 'Hunter Started' });

      (async () => {
          try {
              await catalystHunterService.huntInsiderPlays();
              jobManager.completeJob('HUNTER', 'Hunter Scan Complete');
          } catch (e: any) {
              jobManager.failJob('HUNTER', e.message);
          }
      })();
  } catch (e: any) {
      res.status(409).json({ success: false, error: e.message });
  }
});

// HISTORY
router.get('/hunter-history', async (req, res) => {
    try {
        const history = await catalystHunterService.getHunterHistory();
        res.json({ success: true, data: history });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PATTERN MATCHES (Fixes 404)
router.get('/pattern-matches', async (req, res) => {
  try {
    // Currently we don't store patterns in this table, so return empty valid response
    res.json({ success: true, data: [] });
  } catch (error) {
    res.json({ success: false, data: [] });
  }
});

export default router;
