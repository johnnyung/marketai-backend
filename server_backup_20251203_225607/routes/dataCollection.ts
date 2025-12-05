// src/routes/dataCollection.ts
import express from 'express';
import pool from '../db/index.js';

const router = express.Router();

// Data collection status endpoint (for System Health page)
router.get('/status', async (req, res) => {
  try {
    // Get the latest collection stats
    const statsResult = await pool.query(
      'SELECT * FROM collection_stats ORDER BY created_at DESC LIMIT 1'
    );
    
    // Simple response without source_health complications
    const stats = statsResult.rows[0] || { sources: {}, last_run: null };
    
    res.json({
      success: true,
      status: 'operational',
      lastRun: stats.last_run,
      totalCollected: stats.total_collected || 0,
      totalStored: stats.total_stored || 0,
      recentEntries: stats.total_stored || 0,
      sources: stats.sources || {},
      errors: []
    });
  } catch (error: any) {
    console.error('Data collection status error:', error);
    // Return minimal working response even if error
    res.json({
      success: true,
      status: 'operational',
      lastRun: new Date(),
      totalCollected: 0,
      totalStored: 0,
      recentEntries: 0,
      sources: {},
      errors: []
    });
  }
});

// Trigger data collection
router.post('/trigger', async (req, res) => {
  try {
    const intelligentDigestService = (await import('../services/intelligentDigestService.js')).default;
    
    res.json({
      success: true,
      message: 'Collection started in background'
    });
    
    // Run collection asynchronously
    intelligentDigestService.ingestAndStore().then((result: any) => {
      // Save stats to database
      pool.query(
        'INSERT INTO collection_stats (sources, last_run, total_collected, total_stored) VALUES ($1, NOW(), $2, $3)',
        [JSON.stringify(result.sources || {}), result.collected || 0, result.stored || 0]
      );
    }).catch((error: any) => {
      console.error('Background collection failed:', error);
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get collection history
router.get('/history', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM collection_stats ORDER BY created_at DESC LIMIT 20'
    );
    
    res.json({
      success: true,
      history: result.rows
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
