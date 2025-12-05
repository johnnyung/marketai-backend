import dbCheck from './routes/dbCheck.js';
import dotenv from "dotenv";
dotenv.config();

import express from 'express';
import cors from 'cors';


const app = express();
const PORT = process.env.PORT || 8080;

// === AUTO-ROUTE-IMPORTS-START ===
import aiTipsRoutes from './routes/ai-tips.js';
import aiRoutes from './routes/ai.js';
import aiTipsLegacyRoutes from './routes/aiTips_legacy.js';
import allCollectionRoutesRoutes from './routes/allCollectionRoutes.js';
import analysisRoutesRoutes from './routes/analysisRoutes.js';
import analyticsRoutesRoutes from './routes/analyticsRoutes.js';
import anomalyRoutesRoutes from './routes/anomalyRoutes.js';
import authRoutes from './routes/auth.js';
import brainRoutes from './routes/brain.js';
import cacheRoutesRoutes from './routes/cacheRoutes.js';
import calendarRoutes from './routes/calendar.js';
import collectorRoutesRoutes from './routes/collectorRoutes.js';
import commandCenterRoutesRoutes from './routes/commandCenterRoutes.js';
import comprehensiveAnalysisRoutesRoutes from './routes/comprehensiveAnalysisRoutes.js';
import comprehensiveCollectorRoutesRoutes from './routes/comprehensiveCollectorRoutes.js';
import confidenceRoutesRoutes from './routes/confidenceRoutes.js';
import correlationRoutesRoutes from './routes/correlationRoutes.js';
import cryptoCorrelationRoutesRoutes from './routes/cryptoCorrelationRoutes.js';
import currencyRoutesRoutes from './routes/currencyRoutes.js';
import dailyIntelligenceRoutes from './routes/dailyIntelligence.js';
import dailyIntelligenceRoutesRoutes from './routes/dailyIntelligenceRoutes.js';
import dailySummaryRoutesRoutes from './routes/dailySummaryRoutes.js';
import dashboardRoutesRoutes from './routes/dashboardRoutes.js';
import dataRoutes from './routes/data.js';
import dataCollectionRoutes from './routes/dataCollection.js';
import dataCollectionRoutesRoutes from './routes/dataCollectionRoutes.js';
import debugRoutes from './routes/debug.js';
import debugEnvRoutes from './routes/debugEnv.js';
import debugFmpRoutes from './routes/debugFmp.js';
import deepDiveRoutesRoutes from './routes/deepDiveRoutes.js';
import diagnosticsRoutesRoutes from './routes/diagnosticsRoutes.js';
import digestRoutes from './routes/digest.js';
import digestCleanupRoutes from './routes/digestCleanup.js';
import digestRoutesRoutes from './routes/digestRoutes.js';
import divergenceRoutesRoutes from './routes/divergenceRoutes.js';
import enhancedDeepDiveRoutesRoutes from './routes/enhancedDeepDiveRoutes.js';
import eventIntelligenceRoutesRoutes from './routes/eventIntelligenceRoutes.js';
import eventsRoutes from './routes/events.js';
import executiveSummaryRoutesRoutes from './routes/executiveSummaryRoutes.js';
import fundamentalsRoutesRoutes from './routes/fundamentalsRoutes.js';
import futuresRoutes from './routes/futures.js';
import gameRoutes from './routes/game.js';
import gammaRoutesRoutes from './routes/gammaRoutes.js';
import healthRoutes from './routes/health.js';
import historyRoutesRoutes from './routes/historyRoutes.js';
import ingestionRoutesRoutes from './routes/ingestionRoutes.js';
import insiderRoutesRoutes from './routes/insiderRoutes.js';
import intelligenceRoutes from './routes/intelligence.js';
import intelligenceThreadsRoutesRoutes from './routes/intelligenceThreadsRoutes.js';
import journalRoutes from './routes/journal.js';
import learningRoutes from './routes/learning.js';
import liveStatusRoutesRoutes from './routes/liveStatusRoutes.js';
import marketRoutes from './routes/market.js';
import marketPriceRoutesRoutes from './routes/marketPriceRoutes.js';
import metaRoutesRoutes from './routes/metaRoutes.js';
import multiAgentRoutesRoutes from './routes/multiAgentRoutes.js';
import narrativeRoutesRoutes from './routes/narrativeRoutes.js';
import neuralChatRoutesRoutes from './routes/neuralChatRoutes.js';
import newsRoutes from './routes/news.js';
import opportunitiesRoutes from './routes/opportunities.js';
import optionsRoutes from './routes/options.js';
import pairsRoutesRoutes from './routes/pairsRoutes.js';
import paperTradingRoutesRoutes from './routes/paperTradingRoutes.js';
import portfolioRoutes from './routes/portfolio.js';
import processorRoutesRoutes from './routes/processorRoutes.js';
import realDeepDiveRoutesRoutes from './routes/realDeepDiveRoutes.js';
import realTimeRoutesRoutes from './routes/realTimeRoutes.js';
import regimeRoutesRoutes from './routes/regimeRoutes.js';
import researchRoutes from './routes/research.js';
import riskRoutesRoutes from './routes/riskRoutes.js';
import scheduledIngestionRoutesRoutes from './routes/scheduledIngestionRoutes.js';
import schedulerRoutesRoutes from './routes/schedulerRoutes.js';
import sentimentRoutesRoutes from './routes/sentimentRoutes.js';
import shadowLiquidityRoutesRoutes from './routes/shadowLiquidityRoutes.js';
import smartMoneyRoutesRoutes from './routes/smartMoneyRoutes.js';
import socialIntelligenceRoutesRoutes from './routes/socialIntelligenceRoutes.js';
import socialRoutesRoutes from './routes/socialRoutes.js';
import socialSentimentRoutesRoutes from './routes/socialSentimentRoutes.js';
import systemRoutes from './routes/system.js';
import systemAlertRoutesRoutes from './routes/systemAlertRoutes.js';
import systemStatusRoutesRoutes from './routes/systemStatusRoutes.js';
import technicalRoutes from './routes/technical.js';
import technicalRoutesRoutes from './routes/technicalRoutes.js';
import tickerVettingRoutesRoutes from './routes/tickerVettingRoutes.js';
import tradingOpportunitiesRoutes from './routes/tradingOpportunities.js';
import tradingOpportunitiesRoutesRoutes from './routes/tradingOpportunitiesRoutes.js';
import unifiedIntelligenceRoutesRoutes from './routes/unifiedIntelligenceRoutes.js';
import userPortfolioRoutesRoutes from './routes/userPortfolioRoutes.js';
import watchlistRoutes from './routes/watchlist.js';
// === AUTO-ROUTE-IMPORTS-END ===

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: 'MarketAI Backend Online',
    timestamp: new Date().toISOString(),
  });
});

// === AUTO-ROUTE-USE-START ===
app.use('/api/ai-tips', aiTipsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/aiTips_legacy', aiTipsLegacyRoutes);
app.use('/api/allCollectionRoutes', allCollectionRoutesRoutes);
app.use('/api/analysisRoutes', analysisRoutesRoutes);
app.use('/api/analyticsRoutes', analyticsRoutesRoutes);
app.use('/api/anomalyRoutes', anomalyRoutesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/brain', brainRoutes);
app.use('/api/cacheRoutes', cacheRoutesRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/collectorRoutes', collectorRoutesRoutes);
app.use('/api/commandCenterRoutes', commandCenterRoutesRoutes);
app.use('/api/comprehensiveAnalysisRoutes', comprehensiveAnalysisRoutesRoutes);
app.use('/api/comprehensiveCollectorRoutes', comprehensiveCollectorRoutesRoutes);
app.use('/api/confidenceRoutes', confidenceRoutesRoutes);
app.use('/api/correlationRoutes', correlationRoutesRoutes);
app.use('/api/cryptoCorrelationRoutes', cryptoCorrelationRoutesRoutes);
app.use('/api/currencyRoutes', currencyRoutesRoutes);
app.use('/api/dailyIntelligence', dailyIntelligenceRoutes);
app.use('/api/dailyIntelligenceRoutes', dailyIntelligenceRoutesRoutes);
app.use('/api/dailySummaryRoutes', dailySummaryRoutesRoutes);
app.use('/api/dashboardRoutes', dashboardRoutesRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/dataCollection', dataCollectionRoutes);
app.use('/api/dataCollectionRoutes', dataCollectionRoutesRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/debugEnv', debugEnvRoutes);
app.use('/api/debugFmp', debugFmpRoutes);
app.use('/api/deepDiveRoutes', deepDiveRoutesRoutes);
app.use('/api/diagnosticsRoutes', diagnosticsRoutesRoutes);
app.use('/api/digest', digestRoutes);
app.use('/api/digestCleanup', digestCleanupRoutes);
app.use('/api/digestRoutes', digestRoutesRoutes);
app.use('/api/divergenceRoutes', divergenceRoutesRoutes);
app.use('/api/enhancedDeepDiveRoutes', enhancedDeepDiveRoutesRoutes);
app.use('/api/eventIntelligenceRoutes', eventIntelligenceRoutesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/executiveSummaryRoutes', executiveSummaryRoutesRoutes);
app.use('/api/fundamentalsRoutes', fundamentalsRoutesRoutes);
app.use('/api/futures', futuresRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/gammaRoutes', gammaRoutesRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/historyRoutes', historyRoutesRoutes);
app.use('/api/ingestionRoutes', ingestionRoutesRoutes);
app.use('/api/insiderRoutes', insiderRoutesRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/intelligenceThreadsRoutes', intelligenceThreadsRoutesRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/liveStatusRoutes', liveStatusRoutesRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/marketPriceRoutes', marketPriceRoutesRoutes);
app.use('/api/metaRoutes', metaRoutesRoutes);
app.use('/api/multiAgentRoutes', multiAgentRoutesRoutes);
app.use('/api/narrativeRoutes', narrativeRoutesRoutes);
app.use('/api/neuralChatRoutes', neuralChatRoutesRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/opportunities', opportunitiesRoutes);
app.use('/api/options', optionsRoutes);
app.use('/api/pairsRoutes', pairsRoutesRoutes);
app.use('/api/paperTradingRoutes', paperTradingRoutesRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/processorRoutes', processorRoutesRoutes);
app.use('/api/realDeepDiveRoutes', realDeepDiveRoutesRoutes);
app.use('/api/realTimeRoutes', realTimeRoutesRoutes);
app.use('/api/regimeRoutes', regimeRoutesRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/riskRoutes', riskRoutesRoutes);
app.use('/api/scheduledIngestionRoutes', scheduledIngestionRoutesRoutes);
app.use('/api/schedulerRoutes', schedulerRoutesRoutes);
app.use('/api/sentimentRoutes', sentimentRoutesRoutes);
app.use('/api/shadowLiquidityRoutes', shadowLiquidityRoutesRoutes);
app.use('/api/smartMoneyRoutes', smartMoneyRoutesRoutes);
app.use('/api/socialIntelligenceRoutes', socialIntelligenceRoutesRoutes);
app.use('/api/socialRoutes', socialRoutesRoutes);
app.use('/api/socialSentimentRoutes', socialSentimentRoutesRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/systemAlertRoutes', systemAlertRoutesRoutes);
app.use('/api/systemStatusRoutes', systemStatusRoutesRoutes);
app.use('/api/technical', technicalRoutes);
app.use('/api/technicalRoutes', technicalRoutesRoutes);
app.use('/api/tickerVettingRoutes', tickerVettingRoutesRoutes);
app.use('/api/tradingOpportunities', tradingOpportunitiesRoutes);
app.use('/api/tradingOpportunitiesRoutes', tradingOpportunitiesRoutesRoutes);
app.use('/api/unifiedIntelligenceRoutes', unifiedIntelligenceRoutesRoutes);
app.use('/api/userPortfolioRoutes', userPortfolioRoutesRoutes);
app.use('/api/watchlist', watchlistRoutes);
// === AUTO-ROUTE-USE-END ===

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.use("/api/system", dbCheck);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`👉 http://localhost:${PORT}`);
});

export default app;
