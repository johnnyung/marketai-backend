// backend/src/routes/socialIntelligenceRoutes.ts
// AI-Powered Social Intelligence Routes
// Matches existing route patterns exactly

import express from 'express';
import socialIntelligenceIntegration from '../services/socialIntelligenceIntegration.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/social-intelligence/ingest
 * Trigger AI-powered social intelligence collection
 */
router.post('/ingest', authenticateToken, async (req, res) => {
  try {
    console.log('\n🚀 API: Starting social intelligence ingestion...\n');
    
    const result = await socialIntelligenceIntegration.ingestSocialIntelligence();
    
    res.json({
      success: true,
      data: result,
      message: `AI ingested ${result.totalStored} intelligence entries (${result.redditIntelligence} Reddit, ${result.newsIntelligence} News)`
    });
    
  } catch (error: any) {
    console.error('❌ Social intelligence ingestion error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to ingest social intelligence'
    });
  }
});

/**
 * GET /api/social-intelligence/trending
 * Get trending tickers based on AI-validated social intelligence
 */
router.get('/trending', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    const trendingTickers = await socialIntelligenceIntegration.getTrendingTickers(limit);
    
    res.json({
      success: true,
      data: trendingTickers,
      count: trendingTickers.length,
      message: `Found ${trendingTickers.length} trending tickers from AI-validated intelligence`
    });
    
  } catch (error: any) {
    console.error('❌ Get trending error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/social-intelligence/ticker/:symbol
 * Get AI-validated social intelligence for specific ticker
 */
router.get('/ticker/:symbol', authenticateToken, async (req, res) => {
  try {
    const ticker = req.params.symbol.toUpperCase();
    const days = parseInt(req.query.days as string) || 7;
    
    const intelligence = await socialIntelligenceIntegration.getSocialIntelligenceForTicker(
      ticker,
      days
    );
    
    res.json({
      success: true,
      data: intelligence,
      ticker: ticker,
      count: intelligence.length,
      message: `Found ${intelligence.length} AI-validated intelligence entries for ${ticker}`
    });
    
  } catch (error: any) {
    console.error('❌ Get ticker intelligence error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/social-intelligence/summary
 * Get social intelligence summary for dashboard
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const summary = await socialIntelligenceIntegration.getSocialIntelligenceSummary();
    
    res.json({
      success: true,
      data: summary,
      message: 'Social intelligence summary retrieved'
    });
    
  } catch (error: any) {
    console.error('❌ Get summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
