// backend/src/routes/deepDiveRoutes.ts
import express from 'express';
import deepDiveService from '../services/deepDiveService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/deep-dive/ticker-of-day
 * Get comprehensive analysis of ticker of the day
 */
router.get('/ticker-of-day', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Generating Ticker of the Day...');
    
    const ticker = req.query.ticker as string | undefined;
    const analysis = await deepDiveService.generateTickerDeepDive(ticker);
    
    res.json({
      success: true,
      data: analysis
    });
    
  } catch (error: any) {
    console.error('Error generating ticker deep dive:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate deep dive analysis',
      message: error.message
    });
  }
});

/**
 * GET /api/deep-dive/pattern-watch/:ticker
 * Get pattern analysis for specific ticker
 */
router.get('/pattern-watch/:ticker', authenticateToken, async (req, res) => {
  try {
    const { ticker } = req.params;
    
    if (!ticker || ticker.length > 5) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ticker'
      });
    }
    
    const patterns = await deepDiveService.generateTickerPatterns(ticker);
    
    res.json({
      success: true,
      data: patterns,
      ticker: ticker.toUpperCase()
    });
    
  } catch (error: any) {
    console.error('Error generating ticker patterns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate patterns',
      message: error.message
    });
  }
});

/**
 * GET /api/deep-dive/pattern-watch
 * Get historical pattern matches
 */
router.get('/pattern-watch', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Generating Pattern Watch...');
    
    const patterns = await deepDiveService.generatePatternWatch();
    
    res.json({
      success: true,
      data: patterns
    });
    
  } catch (error: any) {
    console.error('Error generating pattern watch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate pattern watch',
      message: error.message
    });
  }
});

/**
 * GET /api/deep-dive/risk-monitor/:ticker
 * Get risk assessment for specific ticker
 */
router.get('/risk-monitor/:ticker', authenticateToken, async (req, res) => {
  try {
    const { ticker } = req.params;
    
    if (!ticker || ticker.length > 5) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ticker'
      });
    }
    
    const risks = await deepDiveService.generateTickerRisks(ticker);
    
    if (!risks) {
      return res.status(404).json({
        success: false,
        error: `No recent intelligence found for ${ticker}`
      });
    }
    
    res.json({
      success: true,
      data: risks
    });
    
  } catch (error: any) {
    console.error('Error generating ticker risks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate risk assessment',
      message: error.message
    });
  }
});

/**
 * GET /api/deep-dive/risk-monitor
 * Get current risk assessment
 */
router.get('/risk-monitor', authenticateToken, async (req, res) => {
  try {
    console.log('⚠️ Generating Risk Monitor...');
    
    const riskAssessment = await deepDiveService.generateRiskMonitor();
    
    res.json({
      success: true,
      data: riskAssessment
    });
    
  } catch (error: any) {
    console.error('Error generating risk monitor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate risk monitor',
      message: error.message
    });
  }
});

/**
 * GET /api/deep-dive/political-intel
 * Get political intelligence briefing
 */
router.get('/political-intel', authenticateToken, async (req, res) => {
  try {
    console.log('🏛️ Generating Political Intelligence...');
    
    const intel = await deepDiveService.generatePoliticalIntelligence();
    
    res.json({
      success: true,
      data: intel
    });
    
  } catch (error: any) {
    console.error('Error generating political intelligence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate political intelligence',
      message: error.message
    });
  }
});

/**
 * GET /api/deep-dive/today
 * Get all cached analyses from today
 */
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const analyses = await deepDiveService.getTodaysCachedAnalyses();
    
    res.json({
      success: true,
      data: analyses
    });
    
  } catch (error: any) {
    console.error('Error fetching today\'s analyses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analyses',
      message: error.message
    });
  }
});

/**
 * GET /api/deep-dive/all
 * Get all deep dive components at once
 */
router.get('/all', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Generating complete deep dive package...');
    
    const [tickerAnalysis, patterns, risks, political] = await Promise.all([
      deepDiveService.generateTickerDeepDive(),
      deepDiveService.generatePatternWatch(),
      deepDiveService.generateRiskMonitor(),
      deepDiveService.generatePoliticalIntelligence()
    ]);
    
    res.json({
      success: true,
      data: {
        ticker_of_day: tickerAnalysis,
        pattern_watch: patterns,
        risk_monitor: risks,
        political_intelligence: political
      }
    });
    
  } catch (error: any) {
    console.error('Error generating deep dive package:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate deep dive package',
      message: error.message
    });
  }
});

export default router;
