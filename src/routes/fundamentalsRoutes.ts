// backend/src/routes/fundamentalsRoutes.ts
// API Routes for Fundamentals, Vetting, and Enhanced Market Data

import express from 'express';
import fundamentalAnalysisService from '../services/fundamentalAnalysisService.js';
import fmpService from '../services/fmpService.js';
import finnhubService from '../services/finnhubService.js';
import priceService from '../services/priceService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/fundamentals/vetting/:ticker
 * Comprehensive 20-point vetting analysis
 */
router.get('/vetting/:ticker', authenticateToken, async (req, res) => {
  try {
    const { ticker } = req.params;
    
    console.log(`📊 API: Vetting request for ${ticker}`);
    
    const vetting = await fundamentalAnalysisService.performComprehensiveVetting(ticker);
    
    res.json({
      success: true,
      data: vetting
    });
    
  } catch (error: any) {
    console.error('Vetting error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to perform vetting analysis'
    });
  }
});

/**
 * GET /api/fundamentals/profile/:ticker
 * Get company profile from FMP
 */
router.get('/profile/:ticker', authenticateToken, async (req, res) => {
  try {
    const { ticker } = req.params;
    
    const profile = await fmpService.getCompanyProfile(ticker);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Company profile not found'
      });
    }
    
    res.json({
      success: true,
      data: profile
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/fundamentals/financials/:ticker
 * Get complete financial statements package
 */
router.get('/financials/:ticker', authenticateToken, async (req, res) => {
  try {
    const { ticker } = req.params;
    const { period } = req.query; // 'annual' or 'quarter'
    
    const [incomeStatement, balanceSheet, cashFlow, ratios] = await Promise.all([
      fmpService.getIncomeStatement(ticker, period as any || 'annual', 3),
      fmpService.getBalanceSheet(ticker, period as any || 'annual', 3),
      fmpService.getCashFlowStatement(ticker, period as any || 'annual', 3),
      fmpService.getFinancialRatios(ticker, period as any || 'annual', 3)
    ]);
    
    res.json({
      success: true,
      data: {
        incomeStatement,
        balanceSheet,
        cashFlow,
        ratios
      }
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/fundamentals/metrics/:ticker
 * Get calculated key metrics
 */
router.get('/metrics/:ticker', authenticateToken, async (req, res) => {
  try {
    const { ticker } = req.params;
    
    const fundamentals = await fmpService.getCompleteFundamentals(ticker);
    const metrics = fmpService.calculateKeyMetrics(fundamentals);
    
    res.json({
      success: true,
      data: {
        profile: fundamentals.profile,
        metrics
      }
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/fundamentals/price/:ticker
 * Get real-time price from Finnhub
 */
router.get('/price/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    
    const priceData = await priceService.getCurrentPrice(ticker);
    
    if (!priceData) {
      return res.status(404).json({
        success: false,
        error: 'Price data not found'
      });
    }
    
    res.json({
      success: true,
      data: priceData
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/fundamentals/prices/batch
 * Get prices for multiple tickers
 */
router.post('/prices/batch', authenticateToken, async (req, res) => {
  try {
    const { tickers } = req.body;
    
    if (!Array.isArray(tickers)) {
      return res.status(400).json({
        success: false,
        error: 'tickers must be an array'
      });
    }
    
    if (tickers.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 tickers per request'
      });
    }
    
    const prices = await priceService.getBatchPrices(tickers);
    
    res.json({
      success: true,
      data: Object.fromEntries(prices)
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/fundamentals/news/:ticker
 * Get company news from Finnhub
 */
router.get('/news/:ticker', authenticateToken, async (req, res) => {
  try {
    const { ticker } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const news = await finnhubService.getCompanyNews(ticker, limit);
    
    res.json({
      success: true,
      data: news,
      count: news.length
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/fundamentals/recommendations/:ticker
 * Get analyst recommendations from Finnhub
 */
router.get('/recommendations/:ticker', authenticateToken, async (req, res) => {
  try {
    const { ticker } = req.params;
    
    const recommendations = await finnhubService.getRecommendations(ticker);
    
    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/fundamentals/earnings-calendar
 * Get upcoming earnings calendar
 */
router.get('/earnings-calendar', authenticateToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    
    const calendar = await finnhubService.getEarningsCalendar(days);
    
    res.json({
      success: true,
      data: calendar,
      count: calendar.length
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/fundamentals/update-tracker-prices
 * Update all AI Tip Tracker positions with current prices
 */
router.post('/update-tracker-prices', authenticateToken, async (req, res) => {
  try {
    const result = await priceService.updateAllTrackerPrices();
    
    res.json({
      success: true,
      data: result,
      message: `Updated ${result.updated} positions, ${result.failed} failed`
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/fundamentals/health
 * Check API health status
 */
router.get('/health', async (req, res) => {
  try {
    const [finnhubHealth, fmpHealth, priceHealth] = await Promise.all([
      finnhubService.checkApiHealth(),
      fmpService.checkApiHealth(),
      priceService.checkHealth()
    ]);
    
    res.json({
      success: true,
      data: {
        finnhub: finnhubHealth ? 'healthy' : 'unhealthy',
        fmp: fmpHealth ? 'healthy' : 'unhealthy',
        priceService: priceHealth ? 'healthy' : 'unhealthy',
        overall: (finnhubHealth && fmpHealth && priceHealth) ? 'healthy' : 'degraded'
      }
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/fundamentals/info
 * Get service information
 */
router.get('/info', async (req, res) => {
  res.json({
    success: true,
    data: {
      finnhub: finnhubService.getUsageInfo(),
      fmp: fmpService.getUsageInfo(),
      priceService: priceService.getServiceInfo()
    }
  });
});

export default router;
