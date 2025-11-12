// src/routes/intelligence.ts
// UPDATED: Added real data test endpoint + toggle for real vs mock data

import express from 'express';
import dataIngestionService from '../services/dataIngestionService.js';
import aiAnalysisEngine from '../services/aiAnalysisEngine.js';
import realDataIntegrationService from '../services/realDataIntegrationService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Cache for daily intelligence
let cachedIntelligence: any = null;
let cacheExpiry: Date | null = null;

// ✅ NEW: Toggle between real and mock data
const USE_REAL_DATA = process.env.USE_REAL_DATA === 'true';

/**
 * ✅ NEW: GET /api/intelligence/test-real-data
 * Test endpoint to verify real data sources are working
 */
router.get('/test-real-data', async (req, res) => {
  try {
    console.log('\n🧪 === TESTING REAL DATA SOURCES ===\n');
    
    const realData = await realDataIntegrationService.getAllRealData();
    
    res.json({
      success: true,
      message: 'Real data sources are working!',
      data: realData,
      stats: {
        insiderTrades: realData.insiderTrades.length,
        socialMentions: realData.socialSentiment.length,
        technicalSignals: realData.technicalSignals.length,
        topTrendingTickers: realData.summary.topTrendingTickers
      }
    });
    
  } catch (error: any) {
    console.error('❌ Real data test failed:', error);
    res.status(500).json({ 
      success: false,
      error: 'Real data test failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/intelligence/daily
 * Get AI-analyzed daily market intelligence
 */
router.get('/daily', async (req, res) => {
  try {
    console.log('🧠 [/intelligence/daily] Request received (forceRefresh: ' + req.query.forceRefresh + ')');
    
    const forceRefresh = req.query.forceRefresh === 'true';
    
    // Check cache (expires at midnight)
    if (!forceRefresh && cachedIntelligence && cacheExpiry && new Date() < cacheExpiry) {
      console.log('📦 Returning cached intelligence');
      return res.json(cachedIntelligence);
    }
    
    console.log('🔄 Cache expired or refresh requested - will generate new intelligence');
    console.log(`🎯 Using ${USE_REAL_DATA ? 'REAL' : 'MOCK'} data`);
    
    let allData: any[];
    
    if (USE_REAL_DATA) {
      // ✅ USE REAL DATA
      console.log('📡 Step 1: Fetching REAL market data...');
      const realData = await realDataIntegrationService.getAllRealData();
      
      // Convert real data to standard format
      allData = [
        ...realData.insiderTrades.map((trade: any) => ({
          ...trade,
          type: 'insider_trade',
          timestamp: new Date(trade.filingDate)
        })),
        ...realData.socialSentiment.map((mention: any) => ({
          ...mention,
          type: 'social',
          source: 'Reddit',
          timestamp: new Date()
        })),
        ...realData.technicalSignals.map((signal: any) => ({
          ...signal,
          type: 'technical_signal',
          timestamp: new Date()
        }))
      ];
      
      console.log(`✅ Real data collected: ${allData.length} data points`);
      
    } else {
      // ✅ USE MOCK DATA (current behavior)
      console.log('📊 Step 1: Ingesting mock market data...');
      allData = await dataIngestionService.ingestAll();
      console.log(`✅ Mock data collected: ${allData.length} data points`);
    }
    
    // CRITICAL: Group data by type for AI
    console.log('🔄 Step 2: Grouping data by type...');
    const groupedData = {
      politicalTrades: allData.filter((item: any) => 
        item.type === 'political_trade'
      ),
      insiderActivity: allData.filter((item: any) => 
        item.type === 'insider_trade'
      ),
      news: allData.filter((item: any) => 
        item.type === 'news'
      ),
      socialSentiment: allData.filter((item: any) => 
        item.type === 'social'
      ),
      economicEvents: allData.filter((item: any) => 
        item.type === 'economic'
      ),
      // PHASE 7
      institutional: allData.filter((item: any) => 
        item.type === '13f_filing' || 
        item.type === 'whale_trade' || 
        item.type === 'short_interest' ||
        item.type === 'institutional_trade'
      ),
      enhancedPolitical: allData.filter((item: any) => 
        item.type === 'committee_assignment' || 
        item.type === 'lobbying_activity' || 
        item.type === 'campaign_contribution' || 
        item.type === 'voting_record'
      ),
      technical: allData.filter((item: any) => 
        item.type === 'technical_signal'
      ),
      // PHASE 8
      crypto: allData.filter((item: any) => 
        item.type === 'crypto_whale' || 
        item.type === 'exchange_flow' || 
        item.type === 'crypto_sentiment' || 
        item.type === 'crypto_correlation'
      ),
      earnings: allData.filter((item: any) => 
        item.type === 'earnings_calendar' || 
        item.type === 'earnings_estimate' || 
        item.type === 'earnings_surprise' || 
        item.type === 'earnings_pattern'
      ),
      macro: allData.filter((item: any) => 
        item.type === 'fed_speech' || 
        item.type === 'yield_signal' || 
        item.type === 'dollar_strength' || 
        item.type === 'commodity_signal' || 
        item.type === 'global_market'
      ),
      enhancedSocial: allData.filter((item: any) => 
        item.type === 'social' && 
        (item.source === 'Twitter/X' || 
         item.source === 'StockTwits' || 
         item.source === 'Discord Communities' ||
         item.source === 'Reddit')
      )
    };
    
    console.log('✅ Data grouped:', {
      political: groupedData.politicalTrades.length,
      insider: groupedData.insiderActivity.length,
      news: groupedData.news.length,
      social: groupedData.socialSentiment.length,
      economic: groupedData.economicEvents.length,
      institutional: groupedData.institutional.length,
      enhancedPolitical: groupedData.enhancedPolitical.length,
      technical: groupedData.technical.length,
      crypto: groupedData.crypto.length,
      earnings: groupedData.earnings.length,
      macro: groupedData.macro.length,
      enhancedSocial: groupedData.enhancedSocial.length
    });
    
    // Step 3: Analyze with Claude AI
    console.log('🤖 Step 3: Analyzing with Claude AI...');
    const analysis = await aiAnalysisEngine.analyzeMarketData(groupedData);
    
    console.log(`✅ AI Analysis complete: ${analysis.opportunities.length} opportunities`);
    
    // Build response
    const intelligence = {
      summary: {
        totalDataPoints: allData.length,
        dataBreakdown: {
          political: groupedData.politicalTrades.length,
          insider: groupedData.insiderActivity.length,
          institutional: groupedData.institutional.length,
          enhancedPolitical: groupedData.enhancedPolitical.length,
          technical: groupedData.technical.length,
          crypto: groupedData.crypto.length,
          earnings: groupedData.earnings.length,
          macro: groupedData.macro.length,
          news: groupedData.news.length,
          social: groupedData.socialSentiment.length,
          enhancedSocial: groupedData.enhancedSocial.length,
          economic: groupedData.economicEvents.length
        },
        marketSentiment: analysis.marketSentiment,
        generatedAt: new Date().toISOString(),
        dataSource: USE_REAL_DATA ? 'REAL' : 'MOCK' // ✅ Show which data source was used
      },
      opportunities: analysis.opportunities,
      risks: analysis.risks,
      keyInsights: analysis.keyInsights,
      rawData: allData // Include all raw data for Market Intelligence tab
    };
    
    // Cache until midnight
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    cacheExpiry = tomorrow;
    cachedIntelligence = intelligence;
    
    console.log('✅ Intelligence cached until:', cacheExpiry.toLocaleString());
    
    res.json(intelligence);
    
  } catch (error: any) {
    console.error('❌ Error generating intelligence:', error);
    res.status(500).json({ 
      error: 'Failed to generate intelligence',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/intelligence/refresh
 * Force refresh intelligence cache
 */
router.post('/refresh', async (req, res) => {
  try {
    console.log('🔄 Manual refresh requested');
    cachedIntelligence = null;
    cacheExpiry = null;
    res.json({ message: 'Cache cleared - next request will generate fresh intelligence' });
  } catch (error: any) {
    console.error('❌ Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

/**
 * GET /api/intelligence/signals
 * Get AI trading signals for Dashboard
 */
router.get('/signals', authenticateToken, async (req, res) => {
  try {
    const count = parseInt(req.query.count as string) || 5;
    
    // Return empty signals for now (table might not exist yet)
    res.json({ 
      signals: [],
      count: 0,
      generatedAt: new Date()
    });
    
  } catch (error) {
    console.error('Error fetching signals:', error);
    res.json({ signals: [], count: 0 });
  }
});

/**
 * POST /api/intelligence/signals/regenerate
 * Regenerate trading signals (placeholder for future AI integration)
 */
router.post('/signals/regenerate', authenticateToken, async (req, res) => {
  try {
    // Placeholder - will integrate with AI signal generation later
    console.log('📊 Signal regeneration requested');
    
    res.json({
      success: true,
      message: 'Signal regeneration triggered',
      signals: [],
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error regenerating signals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate signals'
    });
  }
});

export default router;
