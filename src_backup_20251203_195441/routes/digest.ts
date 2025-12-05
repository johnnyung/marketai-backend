// src/routes/digest.ts
import express from 'express';
import intelligentDigestService from '../services/intelligentDigestService.js';
import pool from '../db/index.js';

const router = express.Router();

router.post('/ingest', async (req, res) => {
  try {
    console.log('📡 Digest ingestion requested...');
    const result = await intelligentDigestService.ingestAndStore();
    
    // Save collection stats to database
    await pool.query(
      'INSERT INTO collection_stats (sources, last_run, total_collected, total_stored) VALUES ($1, NOW(), $2, $3)',
      [JSON.stringify(result.sources || {}), result.collected || 0, result.stored || 0]
    );
    
    res.json({
      success: true,
      message: `Ingested ${result.stored} entries`,
      collected: result.collected,
      stored: result.stored,
      duplicates: result.duplicates,
      stats: result.stats,
      sources: result.sources || {}
    });
  } catch (error: any) {
    console.error('❌ Ingestion failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const summary = await intelligentDigestService.getDigestSummary();
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/entries', async (req, res) => {
  try {
    const { source_type, min_relevance = 0, limit = 100 } = req.query;
    let query = `
      SELECT id, source_type, source_name, ai_summary, ai_relevance_score, 
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

router.get('/sources', async (req, res) => {
  try {
    const result = await intelligentDigestService.pool.query('SELECT * FROM source_health');
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fixed stats endpoint to query from collection_stats table
router.get('/stats', async (req, res) => {
  try {
    // Get the most recent collection stats from database
    const statsResult = await pool.query(
      'SELECT * FROM collection_stats ORDER BY created_at DESC LIMIT 1'
    );
    
    if (statsResult.rows.length > 0) {
      const stats = statsResult.rows[0];
      res.json({ 
        sources: stats.sources || {},
        lastRun: stats.last_run,
        totalCollected: stats.total_collected,
        totalStored: stats.total_stored
      });
    } else {
      // If no stats exist yet, return default
      res.json({ 
        sources: {}, 
        lastRun: null,
        totalCollected: 0,
        totalStored: 0
      });
    }
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.json({ sources: {}, lastRun: null });
  }
});

// Additional endpoint for detailed stats
router.get('/stats/detailed', async (req, res) => {
  try {
    // Get stats for last 24 hours grouped by source
    const detailedStats = await pool.query(`
      SELECT 
        source_name,
        source_type,
        COUNT(*) as count,
        MAX(created_at) as last_entry,
        AVG(ai_relevance_score) as avg_relevance,
        AVG(ai_importance) as avg_importance
      FROM digest_entries
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY source_name, source_type
      ORDER BY count DESC
    `);
    
    // Get overall collection history
    const history = await pool.query(
      'SELECT * FROM collection_stats ORDER BY created_at DESC LIMIT 10'
    );
    
    res.json({
      sources: detailedStats.rows,
      history: history.rows,
      success: true
    });
  } catch (error: any) {
    console.error('Error fetching detailed stats:', error);
    res.status(500).json({ error: error.message, success: false });
  }
});

// Endpoint to manually trigger collection
router.post('/collect', async (req, res) => {
  try {
    console.log('📡 Manual collection triggered...');
    const result = await intelligentDigestService.ingestAndStore();
    
    // Save to database
    await pool.query(
      'INSERT INTO collection_stats (sources, last_run, total_collected, total_stored) VALUES ($1, NOW(), $2, $3)',
      [JSON.stringify(result.sources || {}), result.collected || 0, result.stored || 0]
    );
    
    res.json({
      success: true,
      message: `Collected ${result.stored} entries from ${result.collected} sources`,
      sources: result.sources,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Manual collection failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
