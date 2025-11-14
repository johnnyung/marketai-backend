// backend/src/routes/intelligence.ts
// Phase 2: Added Executive Vetting Endpoints

import { Router } from 'express';
import signalGeneratorService from '../services/signalGeneratorService.js';
import priceUpdaterService from '../services/priceUpdaterService.js';
import performanceAnalysisService from '../services/performanceAnalysisService.js';
import executiveVettingService from '../services/executiveVettingService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Generate fresh AI signals WITH EXECUTIVE VETTING (Phase 2)
router.post('/generate-signals', authenticateToken, async (req, res) => {
  try {
    console.log('🚀 Generating AI signals with Phase 2 executive vetting...');
    const signals = await signalGeneratorService.generateDailySignals();
    
    res.json({ 
      success: true, 
      signals, 
      count: signals.length,
      message: `Generated ${signals.length} signals with executive vetting + REAL prices (Phase 2)`
    });
  } catch (error: any) {
    console.error('Signal generation failed:', error);
    res.status(500).json({ 
      success: false,
      error: 'Signal generation failed', 
      message: error.message 
    });
  }
});

// Get latest signals from database
router.get('/signals', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const signals = await signalGeneratorService.getLatestSignals(limit);
    
    res.json({ 
      success: true, 
      signals, 
      count: signals.length 
    });
  } catch (error: any) {
    console.error('Failed to get signals:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get signals', 
      message: error.message 
    });
  }
});

// NEW: Vet executives for a specific ticker
router.get('/vet-executives/:ticker', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    console.log(`👔 Vetting executives for ${ticker}...`);
    
    const vetting = await executiveVettingService.vetExecutives(ticker);
    
    res.json({
      success: true,
      ticker,
      vetting
    });
  } catch (error: any) {
    console.error(`Failed to vet ${req.params.ticker}:`, error);
    res.status(500).json({
      success: false,
      error: 'Executive vetting failed',
      message: error.message
    });
  }
});

// NEW: Batch vet multiple tickers
router.post('/vet-executives-batch', authenticateToken, async (req, res) => {
  try {
    const { tickers } = req.body;
    
    if (!tickers || !Array.isArray(tickers)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'tickers array required'
      });
    }
    
    console.log(`👔 Batch vetting ${tickers.length} tickers...`);
    const results = await executiveVettingService.batchVet(tickers);
    
    const vettings = Object.fromEntries(results);
    
    res.json({
      success: true,
      count: tickers.length,
      vettings
    });
  } catch (error: any) {
    console.error('Batch vetting failed:', error);
    res.status(500).json({
      success: false,
      error: 'Batch vetting failed',
      message: error.message
    });
  }
});

// Get performance analysis
router.get('/performance-analysis', async (req, res) => {
  try {
    console.log('📊 Analyzing performance...');
    const analysis = await performanceAnalysisService.analyzeAllSignals();
    
    res.json({
      success: true,
      analysis
    });
  } catch (error: any) {
    console.error('Performance analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Performance analysis failed',
      message: error.message
    });
  }
});

// Update prices for all open positions
router.post('/update-prices', authenticateToken, async (req, res) => {
  try {
    console.log('💰 Manual price update triggered');
    const result = await priceUpdaterService.updateAllOpenPositions();
    
    res.json({
      success: true,
      updated: result.updated,
      failed: result.failed,
      stats: result.stats,
      message: `Updated ${result.updated} positions, ${result.failed} failed`
    });
  } catch (error: any) {
    console.error('Price update failed:', error);
    res.status(500).json({
      success: false,
      error: 'Price update failed',
      message: error.message
    });
  }
});

// Update price for single ticker
router.post('/update-ticker/:ticker', authenticateToken, async (req, res) => {
  try {
    const ticker = req.params.ticker;
    const success = await priceUpdaterService.updateSingleTicker(ticker);
    
    if (success) {
      res.json({
        success: true,
        message: `Updated ${ticker} successfully`
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Failed to update ${ticker}`
      });
    }
  } catch (error: any) {
    console.error(`Failed to update ticker:`, error);
    res.status(500).json({
      success: false,
      error: 'Update failed',
      message: error.message
    });
  }
});

// Get update status
router.get('/update-status', async (req, res) => {
  try {
    const status = await priceUpdaterService.getUpdateStatus();
    res.json({
      success: true,
      status
    });
  } catch (error: any) {
    console.error('Failed to get update status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get status',
      message: error.message
    });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'intelligence',
    phase: 2,
    features: ['performance-feedback', 'executive-vetting'],
    timestamp: new Date().toISOString()
  });
});

export default router;
