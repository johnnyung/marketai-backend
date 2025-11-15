// backend/src/routes/intelligence.ts
// Phase 3: Comprehensive 8-Dimension Business Analysis

import { Router } from 'express';
import signalGeneratorService from '../services/signalGeneratorService.js';
import priceUpdaterService from '../services/priceUpdaterService.js';
import performanceAnalysisService from '../services/performanceAnalysisService.js';
import comprehensiveAnalysis from '../services/comprehensiveBusinessAnalysis.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Generate fresh AI signals WITH COMPREHENSIVE ANALYSIS (Phase 3)
router.post('/generate-signals', authenticateToken, async (req, res) => {
  try {
    console.log('🚀 Generating AI signals with Phase 3 comprehensive analysis...');
    const signals = await signalGeneratorService.generateDailySignals();
    
    res.json({ 
      success: true, 
      signals, 
      count: signals.length,
      message: `Generated ${signals.length} signals with 8-dimension analysis + REAL prices (Phase 3)`
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

// NEW: Comprehensive analysis for a specific ticker
router.get('/analyze/:ticker', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    console.log(`🔍 Comprehensive analysis for ${ticker}...`);
    
    const analysis = await comprehensiveAnalysis.analyzeCompany(ticker);
    
    res.json({
      success: true,
      ticker,
      analysis
    });
  } catch (error: any) {
    console.error(`Failed to analyze ${req.params.ticker}:`, error);
    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      message: error.message
    });
  }
});

// NEW: Batch analyze multiple tickers
router.post('/analyze-batch', authenticateToken, async (req, res) => {
  try {
    const { tickers } = req.body;
    
    if (!tickers || !Array.isArray(tickers)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'tickers array required'
      });
    }
    
    console.log(`🔍 Batch analyzing ${tickers.length} tickers...`);
    const results = await comprehensiveAnalysis.batchAnalyze(tickers);
    
    const analyses = Object.fromEntries(results);
    
    res.json({
      success: true,
      count: tickers.length,
      analyses
    });
  } catch (error: any) {
    console.error('Batch analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Batch analysis failed',
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
    phase: 3,
    features: [
      'performance-feedback', 
      'comprehensive-8d-analysis',
      'executive-quality',
      'business-moat',
      'financial-strength',
      'growth-potential',
      'valuation',
      'catalysts',
      'risk-assessment'
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;
