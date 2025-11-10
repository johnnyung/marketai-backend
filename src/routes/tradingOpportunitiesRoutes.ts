// backend/src/routes/tradingOpportunities.ts
// Routes for AI-generated trading signals

import express from 'express';
import tradingOpportunitiesService from '../services/tradingOpportunitiesService.js';

const router = express.Router();

/**
 * Get current trading signals
 * GET /api/opportunities/signals?limit=5
 */
router.get('/signals', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    
    if (limit < 1 || limit > 10) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 10'
      });
    }
    
    console.log(`📊 Generating ${limit} trading signals...`);
    
    const signals = await tradingOpportunitiesService.generateTradingSignals(limit);
    
    res.json({
      success: true,
      count: signals.length,
      signals,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Failed to generate signals:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate signals'
    });
  }
});

/**
 * Get trading signal for specific ticker
 * GET /api/opportunities/signal/:ticker
 */
router.get('/signal/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    
    if (!ticker || ticker.length > 5) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ticker symbol'
      });
    }
    
    console.log(`🎯 Generating signal for ${ticker}...`);
    
    const signal = await tradingOpportunitiesService.generateTickerSignal(ticker);
    
    if (!signal) {
      return res.status(404).json({
        success: false,
        error: `No recent intelligence found for ${ticker.toUpperCase()}`
      });
    }
    
    res.json({
      success: true,
      signal,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Failed to generate signal for ${req.params.ticker}:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate signal'
    });
  }
});

export default router;
