import express from 'express';
import masterIngestionService from '../services/masterIngestionService.js';
import pool from '../db/index.js';

const router = express.Router();

// Trigger Ingestion
router.post('/ingest-all', async (req, res) => {
  try {
    // 1. Run the ingestion process
    await masterIngestionService.runFullIngestion();
    
    // 2. Calculate stats from DB (counts items added in last 2 mins)
    // This ensures the log is accurate regardless of the service return type
    const statsQuery = await pool.query(`
        SELECT
            COALESCE(SUM(CASE WHEN category = 'news' THEN 1 ELSE 0 END), 0) as news,
            COALESCE(SUM(CASE WHEN category = 'political' THEN 1 ELSE 0 END), 0) as political,
            COALESCE(SUM(CASE WHEN category = 'insider' THEN 1 ELSE 0 END), 0) as insider,
            COALESCE(SUM(CASE WHEN category = 'crypto' THEN 1 ELSE 0 END), 0) as crypto,
            COUNT(*) as total
        FROM raw_intelligence
        WHERE created_at > NOW() - INTERVAL '2 minutes'
    `);
    
    const counts = statsQuery.rows[0];
    const total = parseInt(counts.total);

    // 3. Persist these stats to history
    await pool.query(`
      INSERT INTO collection_stats (sources, last_run, total_collected, total_stored)
      VALUES ($1, NOW(), $2, $3)
    `, [JSON.stringify(counts), total, total]);

    res.json({ success: true, data: counts });
  } catch (error: any) {
    console.error("Ingestion Route Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Data for Analysis (Persisted Data)
router.get('/analysis-feed', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM raw_intelligence
      ORDER BY published_at DESC
      LIMIT 500
    `);
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, data: [] });
  }
});

export default router;
