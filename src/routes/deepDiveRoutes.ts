// backend/src/routes/deepDiveRoutes.ts
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../db/index.js';

const router = express.Router();

router.get('/cached', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ticker, created_date as "createdAt", generated_at as "generatedAt"
       FROM deep_dive_cache
       WHERE created_date = CURRENT_DATE
       ORDER BY generated_at DESC
       LIMIT 50`
    );
    res.json({ success: true, reports: result.rows });
  } catch (error) {
    console.error('Error fetching cached:', error);
    res.json({ success: true, reports: [] });
  }
});

import enhancedDeepDiveService from '../services/enhancedDeepDiveService.js';

router.get('/:ticker', authenticateToken, async (req, res) => {
  try {
    const { ticker } = req.params;
    const upperTicker = ticker.toUpperCase();

    console.log(`📊 Deep Dive requested for ${upperTicker}`);
    
    // Use enhanced service with caching
    const analysis = await enhancedDeepDiveService.generateDeepDive(upperTicker);
    
    res.json({
      success: true,
      analysis,
      cached: analysis.generatedAt < new Date(Date.now() - 60000) // More than 1 min old = cached
    });
  } catch (error) {
    console.error('Deep Dive error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate deep dive analysis'
    });
  }
});

async function generateDeepDive(ticker: string) {
  return {
    ticker: ticker.toUpperCase(),
    companyName: ticker.toUpperCase(),
    analysis: `Deep dive analysis for ${ticker}. Full 20-point vetting pending implementation.`,
    recommendation: 'NEUTRAL',
    confidence: 65,
    priceTarget: null,
    keyPoints: [
      'Comprehensive analysis in development',
      'AI-powered vetting system',
      '20-point evaluation framework'
    ],
    bullCase: 'Positive factors analysis pending',
    bearCase: 'Risk factors analysis pending',
    technicalOutlook: 'Technical analysis pending',
    fundamentalOutlook: 'Fundamental analysis pending',
    catalysts: ['Pending catalyst identification'],
    risks: ['Pending risk assessment']
  };
}

export default router;
