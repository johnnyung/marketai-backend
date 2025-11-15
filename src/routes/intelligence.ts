// backend/src/routes/intelligence.ts
// Phase 4: Pattern Recognition & Continuous Learning

import { Router } from 'express';
import signalGeneratorService from '../services/signalGeneratorService.js';
import priceUpdaterService from '../services/priceUpdaterService.js';
import performanceAnalysisService from '../services/performanceAnalysisService.js';
import comprehensiveAnalysis from '../services/comprehensiveBusinessAnalysis.js';
import patternRecognitionService from '../services/patternRecognitionService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Generate fresh AI signals WITH PATTERN LEARNING (Phase 4)
router.post('/generate-signals', authenticateToken, async (req, res) => {
  try {
    console.log('🚀 Generating AI signals with Phase 4 pattern learning...');
    const signals = await signalGeneratorService.generateDailySignals();
    
    res.json({ 
      success: true, 
      signals, 
      count: signals.length,
      message: `Generated ${signals.length} signals with pattern learning + 8D analysis + REAL prices (Phase 4)`
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

// Get all AI tips for current user (Frontend UI Route)
router.get('/ai-tips', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const limit = parseInt(req.query.limit as string) || 50;
    
    console.log(`📊 Fetching AI tips for user ${userId}...`);
    const signals = await signalGeneratorService.getLatestSignals(limit);
    
    res.json({ 
      success: true, 
      tips: signals,
      count: signals.length 
    });
  } catch (error: any) {
    console.error('Failed to get AI tips:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get AI tips', 
      message: error.message 
    });
  }
});

// NEW: Analyze patterns from closed trades (Phase 4)
router.post('/analyze-patterns', authenticateToken, async (req, res) => {
  try {
    console.log('🧠 Analyzing patterns from closed trades...');
    const insights = await patternRecognitionService.analyzePatterns();
    
    res.json({
      success: true,
      insights,
      message: 'Pattern analysis complete'
    });
  } catch (error: any) {
    console.error('Pattern analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Pattern analysis failed',
      message: error.message
    });
  }
});

// NEW: Get pattern insights (Phase 4)
router.get('/pattern-insights', async (req, res) => {
  try {
    const insights = await patternRecognitionService.getLatestInsights();
    
    if (!insights) {
      return res.json({
        success: true,
        insights: null,
        message: 'No pattern insights yet - need at least 10 closed trades'
      });
    }
    
    res.json({
      success: true,
      insights
    });
  } catch (error: any) {
    console.error('Failed to get pattern insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pattern insights',
      message: error.message
    });
  }
});

// NEW: Calculate success probability for a ticker (Phase 4)
router.get('/success-probability/:ticker', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    
    // Get comprehensive analysis
    const analysis = await comprehensiveAnalysis.analyzeCompany(ticker);
    
    // Calculate success probability
    const probability = await patternRecognitionService.calculateSuccessProbability({
      analysisScore: analysis.overallScore,
      analysis: analysis
    });
    
    res.json({
      success: true,
      ticker,
      analysisScore: analysis.overallScore,
      successProbability: (probability * 100).toFixed(1),
      recommendation: analysis.recommendation
    });
  } catch (error: any) {
    console.error(`Failed to calculate probability for ${req.params.ticker}:`, error);
    res.status(500).json({
      success: false,
      error: 'Probability calculation failed',
      message: error.message
    });
  }
});

// Comprehensive analysis for a specific ticker
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

// Batch analyze multiple tickers
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
    phase: 4,
    features: [
      'performance-feedback', 
      'comprehensive-8d-analysis',
      'executive-quality',
      'business-moat',
      'financial-strength',
      'growth-potential',
      'valuation',
      'catalysts',
      'risk-assessment',
      'pattern-recognition',
      'adaptive-learning',
      'success-probability'
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;
