import express from 'express';
import pool from '../db/index.js';

const router = express.Router();

// GET /api/dashboard/status
// Returns the live status of all system components
router.get('/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_status');
    
    // Convert array to object map: { 'news': { status: 'active', ... } }
    const statusMap: any = {};
    result.rows.forEach(row => {
        statusMap[row.source_id] = {
            status: row.status,
            message: row.message,
            count: row.count,
            last_updated: row.last_updated
        };
    });

    res.json({ success: true, data: statusMap });
  } catch (error: any) {
    console.error('Dashboard Status Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
