import express from 'express';
import { pool } from '../db/index.js';

const router = express.Router();

// This endpoint now reads directly from the persistent 'system_status' table
router.get('/', async (req, res) => {
  try {
    // Get all statuses
    const result = await pool.query("SELECT * FROM system_status");
    
    // Convert to object map { 'news': { status: 'active', ... } }
    const state: any = {};
    result.rows.forEach(row => {
        // Check freshness
        const lastUpdate = new Date(row.last_updated);
        const minsAgo = (Date.now() - lastUpdate.getTime()) / 60000;
        
        // Auto-expire 'scanning' status if it gets stuck (> 2 mins)
        let status = row.status;
        if (status === 'scanning' && minsAgo > 2) {
            status = row.count > 0 ? 'cached' : 'error';
        }

        state[row.source_id] = {
            status: status,
            message: row.message,
            count: row.count,
            timestamp: row.last_updated
        };
    });

    res.json({ success: true, data: state });
  } catch (error: any) {
    console.error("Status Read Error:", error);
    res.json({ success: false, error: error.message });
  }
});

export default router;
