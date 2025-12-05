import aiTipsRoutes from './routes/ai-tips.ts';
import aiRoutes from './routes/ai.ts';
import aiTipsRoutes from './routes/aiTips.ts';
import aiTips_legacyRoutes from './routes/aiTips_legacy.ts';
import allCollectionRoutesRoutes from './routes/allCollectionRoutes.ts';
import analysisRoutesRoutes from './routes/analysisRoutes.ts';
import analyticsRoutesRoutes from './routes/analyticsRoutes.ts';
import anomalyRoutesRoutes from './routes/anomalyRoutes.ts';
import authRoutes from './routes/auth.ts';
import brainRoutes from './routes/brain.ts';
import cacheRoutesRoutes from './routes/cacheRoutes.ts';
import calendarRoutes from './routes/calendar.ts';
import collectorRoutesRoutes from './routes/collectorRoutes.ts';
import commandCenterRoutesRoutes from './routes/commandCenterRoutes.ts';
import comprehensiveAnalysisRoutesRoutes from './routes/comprehensiveAnalysisRoutes.ts';
import comprehensiveCollectorRoutesRoutes from './routes/comprehensiveCollectorRoutes.ts';
import confidenceRoutesRoutes from './routes/confidenceRoutes.ts';
import correlationRoutesRoutes from './routes/correlationRoutes.ts';
import cryptoCorrelationRoutesRoutes from './routes/cryptoCorrelationRoutes.ts';
import currencyRoutesRoutes from './routes/currencyRoutes.ts';
import dailyIntelligenceRoutes from './routes/dailyIntelligence.ts';
import dailyIntelligenceRoutesRoutes from './routes/dailyIntelligenceRoutes.ts';
import dailySummaryRoutesRoutes from './routes/dailySummaryRoutes.ts';
import dashboardRoutesRoutes from './routes/dashboardRoutes.ts';
import dataRoutes from './routes/data.ts';
import dataCollectionRoutes from './routes/dataCollection.ts';
import dataCollectionRoutesRoutes from './routes/dataCollectionRoutes.ts';
import debugRoutes from './routes/debug.ts';
import debugEnvRoutes from './routes/debugEnv.ts';
import debugFmpRoutes from './routes/debugFmp.ts';
import deepDiveRoutesRoutes from './routes/deepDiveRoutes.ts';
import diagnosticsRoutesRoutes from './routes/diagnosticsRoutes.ts';
import digestRoutes from './routes/digest.ts';
import digestCleanupRoutes from './routes/digestCleanup.ts';
import digestRoutesRoutes from './routes/digestRoutes.ts';
import divergenceRoutesRoutes from './routes/divergenceRoutes.ts';
import enhancedDeepDiveRoutesRoutes from './routes/enhancedDeepDiveRoutes.ts';
import eventIntelligenceRoutesRoutes from './routes/eventIntelligenceRoutes.ts';
import eventsRoutes from './routes/events.ts';
import executiveSummaryRoutesRoutes from './routes/executiveSummaryRoutes.ts';
import fundamentalsRoutesRoutes from './routes/fundamentalsRoutes.ts';
import futuresRoutes from './routes/futures.ts';
import gameRoutes from './routes/game.ts';
import gammaRoutesRoutes from './routes/gammaRoutes.ts';
import healthRoutes from './routes/health.ts';
import historyRoutesRoutes from './routes/historyRoutes.ts';
import ingestionRoutesRoutes from './routes/ingestionRoutes.ts';
import insiderRoutesRoutes from './routes/insiderRoutes.ts';
import intelligenceRoutes from './routes/intelligence.ts';
import intelligenceThreadsRoutesRoutes from './routes/intelligenceThreadsRoutes.ts';
import journalRoutes from './routes/journal.ts';
import learningRoutes from './routes/learning.ts';
import liveStatusRoutesRoutes from './routes/liveStatusRoutes.ts';
import marketRoutes from './routes/market.ts';
import marketPriceRoutesRoutes from './routes/marketPriceRoutes.ts';
import metaRoutesRoutes from './routes/metaRoutes.ts';
import multiAgentRoutesRoutes from './routes/multiAgentRoutes.ts';
import narrativeRoutesRoutes from './routes/narrativeRoutes.ts';
import neuralChatRoutesRoutes from './routes/neuralChatRoutes.ts';
import newsRoutes from './routes/news.ts';
import opportunitiesRoutes from './routes/opportunities.ts';
import optionsRoutes from './routes/options.ts';
import pairsRoutesRoutes from './routes/pairsRoutes.ts';
import paperTradingRoutesRoutes from './routes/paperTradingRoutes.ts';
import portfolioRoutes from './routes/portfolio.ts';
import processorRoutesRoutes from './routes/processorRoutes.ts';
import realDeepDiveRoutesRoutes from './routes/realDeepDiveRoutes.ts';
import realTimeRoutesRoutes from './routes/realTimeRoutes.ts';
import regimeRoutesRoutes from './routes/regimeRoutes.ts';
import researchRoutes from './routes/research.ts';
import riskRoutesRoutes from './routes/riskRoutes.ts';
import scheduledIngestionRoutesRoutes from './routes/scheduledIngestionRoutes.ts';
import schedulerRoutesRoutes from './routes/schedulerRoutes.ts';
import sentimentRoutesRoutes from './routes/sentimentRoutes.ts';
import shadowLiquidityRoutesRoutes from './routes/shadowLiquidityRoutes.ts';
import smartMoneyRoutesRoutes from './routes/smartMoneyRoutes.ts';
import socialIntelligenceRoutesRoutes from './routes/socialIntelligenceRoutes.ts';
import socialRoutesRoutes from './routes/socialRoutes.ts';
import socialSentimentRoutesRoutes from './routes/socialSentimentRoutes.ts';
import systemRoutes from './routes/system.ts';
import systemAlertRoutesRoutes from './routes/systemAlertRoutes.ts';
import systemStatusRoutesRoutes from './routes/systemStatusRoutes.ts';
import technicalRoutes from './routes/technical.ts';
import technicalRoutesRoutes from './routes/technicalRoutes.ts';
import tickerVettingRoutesRoutes from './routes/tickerVettingRoutes.ts';
import tradingOpportunitiesRoutes from './routes/tradingOpportunities.ts';
import tradingOpportunitiesRoutesRoutes from './routes/tradingOpportunitiesRoutes.ts';
import unifiedIntelligenceRoutesRoutes from './routes/unifiedIntelligenceRoutes.ts';
import userPortfolioRoutesRoutes from './routes/userPortfolioRoutes.ts';
import watchlistRoutes from './routes/watchlist.ts';



import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// --- ENVIRONMENT LOADING STRATEGY (PHASE E) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../'); // Points to project root

console.log('================================================');
console.log('🚀 [BOOT] MARKETAI SERVER v113.0');
console.log(`📂 [BOOT] Root Context: ${root}`);

// Load .env (Base)
dotenv.config({ path: path.join(root, '.env') });
// Load .env.local (Override)
dotenv.config({ path: path.join(root, '.env.local') });

if (process.env.FMP_API_KEY) {
    console.log(`✅ [BOOT] FMP_API_KEY detected (${process.env.FMP_API_KEY.substring(0,4)}...)`);
} else {
    console.error('❌ [BOOT] FMP_API_KEY IS MISSING.');
}
console.log('================================================');

// Import Routes

// App Setup
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use('/api/aiTips', aiTipsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/aiTips', aiTipsRoutes);
app.use('/api/aiTips_legacy', aiTips_legacyRoutes);
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


// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai-tips', aiTipsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/brain', brainRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/ingest', ingestionRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/options', optionsRoutes);
app.use('/api/technical', technicalRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/my-portfolio', portfolioRoutes);
app.use('/api/debug', debugEnvRoutes);
app.use('/api/debug', debugFmpRoutes);
app.use('/health', healthRoutes);

// Base Route
app.get('/', (req, res) => {
    res.json({
        status: 'MarketAI Backend Online',
        env: process.env.NODE_ENV,
        auth_ready: !!process.env.JWT_SECRET,
        data_ready: !!process.env.FMP_API_KEY
    });
});

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});

export default app;
