import express from 'express';
import historyArchiverService from '../services/historyArchiverService.js';
import { pool } from '../db/index.js';

const router = express.Router();

// Manually trigger the "Evolve History" process
router.post('/evolve', async (req, res) => {
  try {
    const result = await historyArchiverService.archiveRecentHistory();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all history (Static + Evolved)
router.get('/all', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM historical_events ORDER BY event_date DESC');
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
