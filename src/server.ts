import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db/index.js';
import cron from 'node-cron';
import { startEventLoopMonitor } from './utils/eventLoopMonitor.js';

// --- CORE ROUTES (v1-v112) ---
import authRoutes from './routes/auth.js';
import digestRoutes from './routes/digest.js';
import aiTipsRoutes from './routes/aiTips.js';
import correlationRoutes from './routes/correlationRoutes.js';
import systemStatusRoutes from "./routes/systemStatusRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import liveStatusRoutes from "./routes/liveStatusRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import analyticsRoutes from './routes/analyticsRoutes.js';
import aiRoutes from './routes/ai.js';
import dataCollectionRoutes from './routes/dataCollection.js';
import commandCenterRoutes from "./routes/commandCenterRoutes.js";
import eventIntelligenceRoutes from "./routes/eventIntelligenceRoutes.js";
import anomalyRoutes from './routes/anomalyRoutes.js';
import diagnosticsRoutes from "./routes/diagnosticsRoutes.js";
import paperTradingRoutes from './routes/paperTradingRoutes.js';
import userPortfolioRoutes from './routes/userPortfolioRoutes.js';
import socialRoutes from './routes/socialRoutes.js';
import technicalRoutes from './routes/technicalRoutes.js';
import deepDiveRoutes from './routes/deepDiveRoutes.js';
import enhancedDeepDiveRoutes from './routes/enhancedDeepDiveRoutes.js';
import neuralChatRoutes from './routes/neuralChatRoutes.js';
import fundamentalsRoutes from './routes/fundamentalsRoutes.js';
import watchlistRoutes from './routes/watchlist.js';
import calendarRoutes from './routes/calendar.js';
import newsRoutes from './routes/news.js';
import marketRoutes from './routes/market.js';
import dailySummaryRoutes from './routes/dailySummaryRoutes.js';
import opportunitiesRoutes from './routes/opportunities.js';
import futuresRoutes from './routes/futures.js';

// --- ADVANCED ENGINE ROUTES ---
import gammaRoutes from './routes/gammaRoutes.js';
import insiderRoutes from './routes/insiderRoutes.js';
import narrativeRoutes from './routes/narrativeRoutes.js';
import currencyRoutes from './routes/currencyRoutes.js';
import divergenceRoutes from './routes/divergenceRoutes.js';
import multiAgentRoutes from './routes/multiAgentRoutes.js';
import sentimentRoutes from './routes/sentimentRoutes.js';
import shadowLiquidityRoutes from './routes/shadowLiquidityRoutes.js';
import regimeRoutes from './routes/regimeRoutes.js';
import pairsRoutes from './routes/pairsRoutes.js';
import riskRoutes from './routes/riskRoutes.js';

// --- RESTORED ORPHANED ROUTES (PHASE 1) ---
import allCollectionRoutes from './routes/allCollectionRoutes.js';
import cacheRoutes from './routes/cacheRoutes.js';
import collectorRoutes from './routes/collectorRoutes.js';
import comprehensiveAnalysisRoutes from './routes/comprehensiveAnalysisRoutes.js';
import comprehensiveCollectorRoutes from './routes/comprehensiveCollectorRoutes.js';
import cryptoCorrelationRoutes from './routes/cryptoCorrelationRoutes.js';
import dailyIntelligenceRoutes from './routes/dailyIntelligenceRoutes.js';
import digestCleanupRoutes from './routes/digestCleanup.js';
import executiveSummaryRoutes from './routes/executiveSummaryRoutes.js';
import intelligenceThreadsRoutes from './routes/intelligenceThreadsRoutes.js';
import journalRoutes from './routes/journal.js';
import learningRoutes from './routes/learning.js';
import processorRoutes from './routes/processorRoutes.js';
import realDeepDiveRoutes from './routes/realDeepDiveRoutes.js';
import researchRoutes from './routes/research.js';
import scheduledIngestionRoutes from './routes/scheduledIngestionRoutes.js';
import schedulerRoutes from './routes/schedulerRoutes.js';
import socialIntelligenceRoutes from './routes/socialIntelligenceRoutes.js';
import socialSentimentRoutes from './routes/socialSentimentRoutes.js';
import tickerVettingRoutes from './routes/tickerVettingRoutes.js';
import tradingOpportunitiesRoutes from './routes/tradingOpportunitiesRoutes.js';
import unifiedIntelligenceRoutes from './routes/unifiedIntelligenceRoutes.js';

// --- FINAL WIRING (PHASE 2 - The Last 11) ---
import eventsRoutes from './routes/events.js';
import gameRoutes from './routes/game.js';
import intelligenceRoutes from './routes/intelligence.js';
import marketPriceRoutes from './routes/marketPriceRoutes.js';
import portfolioRoutes from './routes/portfolio.js';
import tradingOppRoutes from './routes/tradingOpportunities.js'; // Renamed import to avoid conflict
import dataRoutes from './routes/data.js';
import dailyIntelRoutes from './routes/dailyIntelligence.js';
import realTimeRoutes from './routes/realTimeRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Start Watchdog
try { startEventLoopMonitor(); } catch(e) { console.log("Watchdog init failed"); }

// CORS Configuration
app.use(cors({
  origin: function(origin, callback) {
    return callback(null, true); // Allow all for maximum compatibility
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- HEALTH CHECK ---
app.get('/api/system/health', async (req, res) => {
  const health: any = {
    database: { status: 'checking' },
    priceAPI: { status: 'checking' },
    server: { status: 'online', uptime: process.uptime() }
  };
  try {
    await pool.query('SELECT 1');
    health.database = { status: 'healthy', message: 'Connected' };
  } catch (e: any) {
    health.database = { status: 'down', message: e.message };
  }
  health.priceAPI = { status: process.env.FMP_API_KEY ? 'healthy' : 'missing', message: 'Configured' };
  res.json(health);
});

// --- MOUNTING ALL ROUTES ---
console.log("🔌 Mounting API Routes...");
try {
  // Core
  app.use('/api/auth', authRoutes);
  app.use('/api/digest', digestRoutes);
  app.use('/api/ai-tips', aiTipsRoutes);
  app.use('/api/correlation', correlationRoutes);
  app.use("/api/status", systemStatusRoutes);
  app.use("/api/history", historyRoutes);
  app.use("/api/live-status", liveStatusRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/data-collection', dataCollectionRoutes);
  app.use("/api/command-center", commandCenterRoutes);
  app.use("/api/event-intelligence", eventIntelligenceRoutes);
  app.use('/api/anomalies', anomalyRoutes);
  app.use("/api/diagnostics", diagnosticsRoutes);
  app.use("/api/paper-trading", paperTradingRoutes);
  app.use("/api/my-portfolio", userPortfolioRoutes);
  app.use("/api/social", socialRoutes);
  app.use("/api/technical", technicalRoutes);
  app.use("/api/deep-dive", deepDiveRoutes);
  app.use("/api/deep-dive", enhancedDeepDiveRoutes); // Namespace merge
  app.use("/api/chat", neuralChatRoutes);
  app.use("/api/fundamentals", fundamentalsRoutes);
  app.use("/api/watchlist", watchlistRoutes);
  app.use("/api/calendar", calendarRoutes);
  app.use("/api/news", newsRoutes);
  app.use("/api/market", marketRoutes);
  app.use("/api/daily-summary", dailySummaryRoutes);
  app.use("/api/opportunities", opportunitiesRoutes);
  app.use("/api/futures", futuresRoutes);

  // Advanced Engines
  app.use("/api/gamma", gammaRoutes);
  app.use("/api/insider", insiderRoutes);
  app.use("/api/narrative", narrativeRoutes);
  app.use("/api/currency", currencyRoutes);
  app.use("/api/divergence", divergenceRoutes);
  app.use("/api/multi-agent", multiAgentRoutes);
  app.use("/api/sentiment", sentimentRoutes);
  app.use("/api/shadow", shadowLiquidityRoutes);
  app.use("/api/regime", regimeRoutes);
  app.use("/api/pairs", pairsRoutes);
  app.use("/api/risk", riskRoutes);

  // Restored Orphaned Routes (Phase 1)
  app.use('/api/collect', allCollectionRoutes);
  app.use('/api/cache', cacheRoutes);
  app.use('/api/collect/v2', collectorRoutes);
  app.use('/api/analysis/comprehensive', comprehensiveAnalysisRoutes);
  app.use('/api/collect/comprehensive', comprehensiveCollectorRoutes);
  app.use('/api/crypto/correlation', cryptoCorrelationRoutes);
  app.use('/api/intelligence/daily', dailyIntelligenceRoutes);
  app.use('/api/digest/cleanup', digestCleanupRoutes);
  app.use('/api/intelligence/executive', executiveSummaryRoutes);
  app.use('/api/intelligence/threads', intelligenceThreadsRoutes);
  app.use('/api/journal', journalRoutes);
  app.use('/api/learning', learningRoutes);
  app.use('/api/process', processorRoutes);
  app.use('/api/deep-dive/real', realDeepDiveRoutes);
  app.use('/api/research', researchRoutes);
  app.use('/api/ingest/scheduled', scheduledIngestionRoutes);
  app.use('/api/scheduler', schedulerRoutes);
  app.use('/api/social-intelligence', socialIntelligenceRoutes);
  app.use('/api/social/sentiment-v2', socialSentimentRoutes);
  app.use('/api/vetting', tickerVettingRoutes);
  app.use('/api/opportunities/trading', tradingOpportunitiesRoutes);
  app.use('/api/intelligence/unified', unifiedIntelligenceRoutes);

  // FINAL WIRING (Phase 2 - The Missing 11)
  app.use('/api/events', eventsRoutes);
  app.use('/api/game', gameRoutes);
  app.use('/api/intelligence', intelligenceRoutes);
  app.use('/api/market-data', marketPriceRoutes);
  app.use('/api/portfolio', portfolioRoutes);
  app.use('/api/trading-ops', tradingOppRoutes);
  app.use('/api/data', dataRoutes);
  app.use('/api/daily-intel', dailyIntelRoutes);
  app.use('/api/realtime', realTimeRoutes);
  
  console.log("✅ All Routes Mounted Successfully.");
} catch (e: any) {
  console.error("❌ ROUTE MOUNTING ERROR:", e.message);
  process.exit(1);
}

// Schedule
import correlationAnalysisService from './services/correlationAnalysisService.js';
cron.schedule('0 8 * * *', async () => {
    try { await correlationAnalysisService.analyzeCorrelations(); } catch(e) { console.error("Cron Job Failed", e); }
});

// Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);
  res.status(500).json({ success: false, error: err.message });
});

// Bind to 0.0.0.0 for Railway
app.listen(Number(PORT), '0.0.0.0', () => console.log(`✅ Server running on port ${PORT}`));
