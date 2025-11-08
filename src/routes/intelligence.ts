// src/routes/intelligence.ts
// FIXED: Properly group and pass all data types to AI

import express from 'express';
import dataIngestionService from '../services/dataIngestionService.js';
import aiAnalysisEngine from '../services/aiAnalysisEngine.js';

const router = express.Router();

// Cache for daily intelligence
let cachedIntelligence: any = null;
let cacheExpiry: Date | null = null;

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
    console.log('🔄 Generating new intelligence with AI...');
    
    // Step 1: Ingest all market data
    console.log('📊 Step 1: Ingesting all market data...');
    const allData = await dataIngestionService.ingestAll();
    
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
         item.source === 'Discord Communities')
      )
    };
    
    console.log('✅ Data ingested:', {
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
    
    // Step 2: Analyze with Claude AI
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
        generatedAt: new Date().toISOString()
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

export default router;
