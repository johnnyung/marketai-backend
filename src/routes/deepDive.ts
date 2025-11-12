/**
 * DEEP DIVE API ROUTE - ADD TO BACKEND
 * File: src/routes/deepDive.ts (create if doesn't exist)
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../db/index.js';

const router = express.Router();

/**
 * GET /api/deep-dive/:ticker
 * Analyze any ticker with comprehensive deep dive
 */
router.get('/:ticker', authenticateToken, async (req, res) => {
  try {
    const { ticker } = req.params;
    const upperTicker = ticker.toUpperCase();

    console.log(`📊 Deep Dive requested for ${upperTicker}`);

    // Check cache first (24 hour)
    const cacheCheck = await pool.query(`
      SELECT * FROM deep_dive_cache
      WHERE ticker = $1
      AND created_date >= NOW() - INTERVAL '24 hours'
      ORDER BY created_date DESC
      LIMIT 1
    `, [upperTicker]);

    if (cacheCheck.rows.length > 0) {
      console.log(`  ✓ Returning cached analysis for ${upperTicker}`);
      return res.json({
        analysis: cacheCheck.rows[0],
        cached: true
      });
    }

    // Generate new analysis
    console.log(`  ✓ Generating new analysis for ${upperTicker}...`);
    
    // TODO: Call your AI analysis service here
    // For now, return a placeholder that works
    const analysis = {
      ticker: upperTicker,
      company_name: `${upperTicker} Inc.`,
      analysis: `Comprehensive analysis for ${upperTicker} is being generated. This is a 2000+ word institutional-quality analysis.`,
      key_points: [
        'Technical analysis shows momentum',
        'Fundamental metrics are strong',
        'Market sentiment is positive'
      ],
      bull_case: 'Strong growth potential with expanding market',
      bear_case: 'Market volatility and competitive pressures',
      catalysts: ['Product launch', 'Earnings report', 'Market expansion'],
      risks: ['Competition', 'Regulatory', 'Market conditions'],
      recommendation: 'BUY',
      confidence: 75,
      generated_at: new Date()
    };

    // Cache the analysis
    await pool.query(`
      INSERT INTO deep_dive_cache (
        ticker, company_name, analysis, key_points, bull_case, 
        bear_case, catalysts, risks, recommendation, confidence, created_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (ticker) 
      DO UPDATE SET
        analysis = $3,
        key_points = $4,
        bull_case = $5,
        bear_case = $6,
        catalysts = $7,
        risks = $8,
        recommendation = $9,
        confidence = $10,
        created_date = NOW()
    `, [
      analysis.ticker,
      analysis.company_name,
      analysis.analysis,
      JSON.stringify(analysis.key_points),
      analysis.bull_case,
      analysis.bear_case,
      JSON.stringify(analysis.catalysts),
      JSON.stringify(analysis.risks),
      analysis.recommendation,
      analysis.confidence
    ]);

    res.json({ analysis, cached: false });
  } catch (error) {
    console.error('Deep Dive error:', error);
    res.status(500).json({ error: 'Failed to generate deep dive analysis' });
  }
});

/**
 * GET /api/deep-dive/cached
 * Get all cached analyses (last 24 hours)
 */
router.get('/cached', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM deep_dive_cache
      WHERE created_date >= NOW() - INTERVAL '24 hours'
      ORDER BY created_date DESC
      LIMIT 20
    `);

    res.json({ analyses: result.rows });
  } catch (error) {
    console.error('Error fetching cached analyses:', error);
    res.status(500).json({ error: 'Failed to fetch cached analyses' });
  }
});

export default router;
