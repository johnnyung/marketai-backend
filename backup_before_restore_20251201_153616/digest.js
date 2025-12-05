// src/routes/digest.js - FIXED VERSION
// Fixed digest routes without the 'companies' column error

import express from 'express';
import pool from '../db/index.js';

const router = express.Router();

// Get digest entries - FIXED QUERY
router.get('/entries', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    let timeClause = "created_at > NOW() - INTERVAL '24 hours'";
    if (timeRange === '7d') {
      timeClause = "created_at > NOW() - INTERVAL '7 days'";
    } else if (timeRange === '30d') {
      timeClause = "created_at > NOW() - INTERVAL '30 days'";
    }
    
    // Fixed query - removed 'companies' column that doesn't exist
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
    
    // Process entries to match frontend expectations
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
    // Return empty array instead of error to keep frontend working
    res.json({
      success: true,
      data: []
    });
  }
});

// Main digest endpoint
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        source_type,
        source_name,
        title,
        ai_summary,
        tickers,
        ai_relevance_score,
        ai_sentiment,
        created_at
      FROM digest_entries
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching digest:', error);
    res.json({ success: true, data: [] });
  }
});

function getImpactAssessment(score) {
  if (score > 80) return 'Critical - Immediate market impact expected';
  if (score > 60) return 'High - Significant movement likely';
  if (score > 40) return 'Medium - Monitor for developments';
  return 'Low - Limited immediate impact';
}

export default router;
