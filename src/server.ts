import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import pool from './db/index.js';
import { authenticateToken } from './middleware/auth.js';

// Services
import scheduledIngestionService from './services/scheduledIngestionService.js';
import marketDataService from './services/marketDataService.js';

// Routes
import authRoutes from './routes/auth.js';
import marketRoutes from './routes/market.js';
import newsRoutes from './routes/news.js';
import eventsRoutes from './routes/events.js';
import aiRoutes from './routes/ai.js';
import gameRoutes from './routes/game.js';
import futuresRoutes from './routes/futures.js';
import portfolioRoutes from './routes/portfolio.js';
import watchlistRoutes from './routes/watchlist.js';
import journalRoutes from './routes/journal.js';
import learningRoutes from './routes/learning.js';
import calendarRoutes from './routes/calendar.js';
import intelligenceRoutes from './routes/intelligence.js';
import dataRoutes from './routes/data.js';
import digestRoutes from './routes/digest.js';
import digestCleanupRoutes from './routes/digestCleanup.js';
import scheduledIngestionRoutes from './routes/scheduledIngestionRoutes.js';
import dailyIntelligenceRoutes from './routes/dailyIntelligence.js';
import tradingOpportunitiesRoutes from './routes/tradingOpportunities.js';
import aiTipTrackerRoutes from './routes/aiTipTrackerRoutes.js';
import deepDiveRoutes from './routes/deepDiveRoutes.js';
import executiveSummaryRoutes from './routes/executiveSummaryRoutes.js';
import tickerVettingRoutes from './routes/tickerVettingRoutes.js';
import cacheRoutes from './routes/cacheRoutes.js';
import enhancedDeepDiveRoutes from './routes/enhancedDeepDiveRoutes.js';
import aiTipTrackerAnalyticsRoutes from './routes/aiTipTrackerAnalyticsRoutes.js';
import intelligenceThreadsRoutes from './routes/intelligenceThreadsRoutes.js';
import autoTipTrackerRoutes from './routes/autoTipTrackerRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Reduce logging in production
const isDev = process.env.NODE_ENV === 'development';
const log = isDev ? console.log.bind(console) : () => {};

// Trust proxy for Railway
app.set('trust proxy', true);

// Middleware
app.use(helmet());
app.use(compression());

// Enhanced CORS - supports multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://stocks.jeeniemedia.com'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========================================
// DASHBOARD SUMMARY ENDPOINTS (ADDED)
// ========================================

// Tip Tracker Summary for Dashboard
app.get('/api/tip-tracker/summary', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'OPEN') as "openPositions",
        COUNT(*) FILTER (WHERE status = 'CLOSED') as "closedPositions",
        COALESCE(
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'CLOSED' AND current_pnl > 0)::numeric / 
             NULLIF(COUNT(*) FILTER (WHERE status = 'CLOSED'), 0)) * 100, 
            1
          ),
          0
        )::numeric as "winRate"
      FROM ai_tip_tracker
    `);
    
    const data = result.rows[0] || { openPositions: 0, closedPositions: 0, winRate: 0 };
    
    // Ensure all values are numbers
    res.json({
      openPositions: parseInt(data.openPositions) || 0,
      closedPositions: parseInt(data.closedPositions) || 0,
      winRate: parseFloat(data.winRate) || 0
    });
  } catch (error) {
    console.error('Tip tracker summary error:', error);
    res.status(500).json({ error: 'Failed to fetch tip tracker summary' });
  }
});

// Update all tip tracker prices
app.post('/api/tip-tracker/update-prices', authenticateToken, async (req, res) => {
  try {
    // Import and call the update service
    const { default: aiTipTrackerService } = await import('./services/aiTipTrackerService.js');
    await aiTipTrackerService.updateAllPositions();
    res.json({ success: true, message: 'Prices updated' });
  } catch (error) {
    console.error('Update prices error:', error);
    res.status(500).json({ error: 'Failed to update prices' });
  }
});

// ========================================
// API Routes
// ========================================
app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/futures', futuresRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/intelligence', dailyIntelligenceRoutes);
app.use('/api/opportunities', tradingOpportunitiesRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/digest', digestRoutes);
app.use('/api/digest', digestCleanupRoutes);
app.use('/api/digest', scheduledIngestionRoutes);
app.use('/api/ai-tip-tracker', aiTipTrackerRoutes);
app.use('/api/deep-dive', deepDiveRoutes);
app.use('/api/threads', intelligenceThreadsRoutes);
app.use('/api/intelligence', executiveSummaryRoutes);
app.use('/api/vetting', tickerVettingRoutes);
app.use('/api/cache', cacheRoutes);
app.use('/api/ai-tip-tracker/analytics', aiTipTrackerAnalyticsRoutes);
app.use('/api/auto-tip-tracker', autoTipTrackerRoutes);

// ========================================
// MARKET DATA TEST ENDPOINTS
// ========================================

/**
 * TEST: Get single stock price
 * GET /api/test/price/:ticker
 */
app.get('/api/test/price/:ticker', authenticateToken, async (req, res) => {
  try {
    const { ticker } = req.params;
    const priceData = await marketDataService.getStockPrice(ticker);
    
    if (priceData) {
      res.json({
        success: true,
        data: priceData,
        message: `Successfully fetched ${ticker} from ${priceData.source}`
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Could not fetch price for ${ticker} from any API`
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * TEST: Get multiple stock prices
 * POST /api/test/prices
 */
app.post('/api/test/prices', authenticateToken, async (req, res) => {
  try {
    const { tickers } = req.body;
    
    if (!Array.isArray(tickers)) {
      return res.status(400).json({
        success: false,
        error: 'tickers must be an array'
      });
    }
    
    console.log(`📊 Testing prices for ${tickers.length} stocks...`);
    const startTime = Date.now();
    
    const prices = await marketDataService.getMultiplePrices(tickers);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const results = Array.from(prices.values());
    
    res.json({
      success: true,
      data: results,
      stats: {
        requested: tickers.length,
        fetched: results.length,
        failed: tickers.length - results.length,
        duration: `${duration}ms`,
        avgPerStock: `${(duration / tickers.length).toFixed(0)}ms`
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
 * TEST: Get cache stats
 * GET /api/test/cache-stats
 */
app.get('/api/test/cache-stats', authenticateToken, async (req, res) => {
  try {
    const stats = marketDataService.getCacheStats();
    res.json({
      success: true,
      data: stats,
      message: `Cache contains ${stats.size} prices`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║     MarketAI Backend Server           ║
║     🚀 Running on port ${PORT}         ║
╚═══════════════════════════════════════╝

Environment: ${process.env.NODE_ENV || 'development'}
Frontend:    ${process.env.FRONTEND_URL || 'http://localhost:3000'}
Database:    ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}
Logging:     ${isDev ? 'VERBOSE (dev)' : 'REDUCED (prod)'}

API Endpoints:
  Authentication:
  POST /api/auth/register
  POST /api/auth/login
  GET  /api/auth/me
  
  Futures Trading:
  GET  /api/futures/contracts
  POST /api/futures/open
  POST /api/futures/close
  GET  /api/futures/positions/:portfolioId
  
  Portfolio:
  GET  /api/portfolio
  POST /api/portfolio
  GET  /api/portfolio/:id/performance
  GET  /api/portfolio/:id/trades
  
  Market Data:
  GET  /api/market/price/:ticker
  GET  /api/news/latest
  POST /api/ai/chat

  📊 Data Intelligence:
  GET  /api/data/all                     - All data sources
  GET  /api/digest/summary               - Digest statistics
  POST /api/digest/ingest                - Trigger data collection
  GET  /api/digest/entries               - Get digest entries
  GET  /api/digest/quality-report        - Data quality report
  POST /api/digest/cleanup               - Clean bad data
  GET  /api/digest/scheduler/status      - Scheduler status
  POST /api/digest/scheduler/trigger     - Manual trigger
  
  📊 Daily Intelligence Reports:
  POST /api/intelligence/daily/generate  - Generate today's report
  GET  /api/intelligence/daily/latest    - Get latest report
  GET  /api/intelligence/daily/:date     - Get report by date
  GET  /api/intelligence/daily/recent    - Get recent reports
  GET  /api/intelligence/signals         - Get trading signals
  
  🎯 AI Trading Signals:
  GET  /api/opportunities/signals        - Get trading opportunities
  
  💰 AI Tip Tracker:
  GET  /api/tip-tracker/summary          - NEW! Dashboard summary
  POST /api/tip-tracker/update-prices    - NEW! Update all prices
  GET  /api/ai-tip-tracker/summary       - Performance summary
  GET  /api/ai-tip-tracker/positions/open - Open positions
  GET  /api/ai-tip-tracker/positions/closed - Closed positions
  POST /api/ai-tip-tracker/position      - Create tracked position
  POST /api/ai-tip-tracker/update-all    - Update all positions
  
  📬 Deep Dive Analysis:
  GET  /api/deep-dive/:ticker            - Analyze any ticker
  GET  /api/deep-dive/cached             - Get cached analyses
  GET  /api/deep-dive/ticker-of-day      - Comprehensive ticker analysis
  GET  /api/deep-dive/pattern-watch      - Historical pattern matching
  GET  /api/deep-dive/risk-monitor       - Market risk assessment
  GET  /api/deep-dive/political-intel    - Political intelligence briefing
  GET  /api/deep-dive/all                - All analyses at once
  
  🧵 Intelligence Threads:
  POST /api/threads/detect               - Run AI thread detection
  GET  /api/threads                      - Get all threads
  GET  /api/threads/:id                  - Get thread by ID
  PUT  /api/threads/:id/status           - Update thread status
  `);
  
  // Start scheduled ingestion service
  console.log('🔄 Starting scheduled ingestion service...');
  scheduledIngestionService.start();

  // Start auto tip tracker
  console.log('🎯 Starting auto tip tracker...');
  import('./schedulers/autoTipTrackerScheduler.js').then(module => {
    module.initializeAutoTipTracker();
  }).catch(err => {
    console.error('Failed to start auto tip tracker:', err);
  });
});

export default app;
