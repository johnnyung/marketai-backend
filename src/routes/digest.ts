// src/routes/digest.ts
import express from 'express';
import intelligentDigestService from '../services/intelligentDigestService.js';

const router = express.Router();

// POST /api/digest/ingest
router.post('/ingest', async (req, res) => {
  try {
    console.log('📡 Digest ingestion requested...');
    const result = await intelligentDigestService.ingestAndStore();
    
    res.json({
      success: true,
      message: `Ingested ${result.stored} entries`,
      collected: result.collected,
      stored: result.stored,
      duplicates: result.duplicates,
      stats: result.stats
    });
  } catch (error: any) {
    console.error('❌ Ingestion failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/digest/summary
router.get('/summary', async (req, res) => {
  try {
    const summary = await intelligentDigestService.getDigestSummary();
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/digest/entries - FIXED: removed companies column
router.get('/entries', async (req, res) => {
  try {
    const { source_type, min_relevance = 0, limit = 100 } = req.query;
    
    let query = `
      SELECT 
        id, source_type, source_name, ai_summary, ai_relevance_score, 
        ai_sentiment, ai_importance, tickers, people, event_date, created_at
      FROM digest_entries
      WHERE expires_at > NOW()
    `;
    
    const params: any[] = [];
    let paramCount = 0;
    
    if (source_type) {
      paramCount++;
      query += ` AND source_type = $${paramCount}`;
      params.push(source_type);
    }
    
    if (min_relevance) {
      paramCount++;
      query += ` AND ai_relevance_score >= $${paramCount}`;
      params.push(parseInt(min_relevance as string));
    }
    
    paramCount++;
    query += ` ORDER BY event_date DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit as string));
    
    const result = await intelligentDigestService.pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error getting digest entries:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/digest/sources
router.get('/sources', async (req, res) => {
  try {
    const result = await intelligentDigestService.pool.query('SELECT * FROM source_health');
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/digest/stats
router.get('/stats', async (req, res) => {
  try {
    const result = await intelligentDigestService.pool.query(`
      SELECT * FROM digest_stats ORDER BY date DESC LIMIT 30
    `);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
