// backend/src/routes/tickerVettingRoutes.ts
// API routes for 20-Point Ticker Vetting

import express from 'express';
import tickerVettingService from '../services/tickerVettingService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/vetting/:ticker
 * Get comprehensive 20-point vetting for a ticker
 */
router.get('/:ticker', authenticateToken, async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    console.log(`🔍 Vetting request for ${ticker}`);
    
    const result = await tickerVettingService.vetTicker(ticker);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Vetting error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to vet ticker'
    });
  }
});

/**
 * GET /api/vetting/:ticker/quick
 * Quick vetting (top 5 checks only)
 */
router.get('/:ticker/quick', authenticateToken, async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    console.log(`⚡ Quick vetting request for ${ticker}`);
    
    const result = await tickerVettingService.quickVet(ticker);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Quick vetting error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to quick vet ticker'
    });
  }
});

/**
 * POST /api/vetting/batch
 * Batch vet multiple tickers
 */
router.post('/batch', authenticateToken, async (req, res) => {
  try {
    const { tickers } = req.body;
    
    if (!tickers || !Array.isArray(tickers)) {
      return res.status(400).json({
        success: false,
        error: 'Tickers array required'
      });
    }
    
    console.log(`🔍 Batch vetting request for ${tickers.length} tickers`);
    
    const results = await tickerVettingService.batchVet(tickers);
    
    // Convert Map to object
    const resultsObj = Object.fromEntries(results);
    
    res.json({
      success: true,
      data: resultsObj,
      count: results.size
    });
  } catch (error: any) {
    console.error('Batch vetting error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch vet tickers'
    });
  }
});

export default router;
