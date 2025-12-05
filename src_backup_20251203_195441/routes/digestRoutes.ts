// src/routes/digestRoutes.ts
// Backend routes for Intelligence Digest

import express from 'express';
import pool from '../db/index.js';

const router = express.Router();

// Get digest entries
router.get('/entries', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    let timeClause = "created_at > NOW() - INTERVAL '24 hours'";
    if (timeRange === '7d') {
      timeClause = "created_at > NOW() - INTERVAL '7 days'";
    } else if (timeRange === '30d') {
      timeClause = "created_at > NOW() - INTERVAL '30 days'";
    }
    
    const query = `
      SELECT 
        id,
        source_type,
        source_name,
        title as headline,
        ai_summary as summary,
        tickers,
        COALESCE(ai_relevance_score, 50) as ai_relevance_score,
        COALESCE(ai_sentiment, 'neutral') as ai_sentiment,
        ai_summary,
        raw_data,
        created_at,
        link as url
      FROM digest_entries
      WHERE ${timeClause}
      ORDER BY created_at DESC
      LIMIT 100
    `;
    
    const result = await pool.query(query);
    
    // Process entries to add mock connected events
    const processedEntries = result.rows.map(entry => ({
      ...entry,
      impact_assessment: getImpactAssessment(entry.ai_relevance_score),
      connected_events: []
    }));
    
    res.json({
      success: true,
      data: processedEntries
    });
  } catch (error) {
    console.error('Error getting digest entries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch digest entries'
    });
  }
});

function getImpactAssessment(score: number): string {
  if (score > 80) return 'Critical - Immediate market impact expected';
  if (score > 60) return 'High - Significant movement likely';
  if (score > 40) return 'Medium - Monitor for developments';
  return 'Low - Limited immediate impact';
}

export default router;
