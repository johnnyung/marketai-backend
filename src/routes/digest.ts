import express from 'express';
import intelligentDigestService from '../services/intelligentDigestService.js';

const router = express.Router();

// POST /api/digest/ingest - Trigger data collection
router.post('/ingest', async (req, res) => {
  try {
    console.log('🔄 Starting digest ingestion...');
    const result = await intelligentDigestService.ingestAndStore();
    res.json({
      success: true,
      message: `Successfully ingested ${result.stored} entries`,
      ...result
    });
  } catch (error: any) {
    console.error('❌ Digest ingestion failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/digest/summary - Get database stats
router.get('/summary', async (req, res) => {
  try {
    const summary = await intelligentDigestService.getDigestSummary();
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/digest/entries - Get entries
router.get('/entries', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const result = await intelligentDigestService.pool.query(`
      SELECT * FROM digest_entries 
      ORDER BY event_date DESC 
      LIMIT $1
    `, [limit]);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
