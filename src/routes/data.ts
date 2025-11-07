// src/routes/data.ts
// API routes for comprehensive data ingestion

import express from 'express';
import dataIngestionService from '../services/dataIngestionService.js';

const router = express.Router();

/**
 * GET /api/data/all
 * Get all ingested data from all sources
 */
router.get('/all', async (req, res) => {
  try {
    console.log('📊 [/data/all] Fetching all data sources...');
    
    const allData = await dataIngestionService.ingestAll();
    
    // Group by type
    const grouped = {
      political: allData.filter(d => d.type === 'political_trade'),
      insider: allData.filter(d => d.type === 'insider_trade'),
      news: allData.filter(d => d.type === 'news'),
      social: allData.filter(d => d.type === 'social'),
      economic: allData.filter(d => d.type === 'economic'),
      total: allData.length,
      timestamp: new Date().toISOString()
    };
    
    console.log(`✅ [/data/all] Success:`, {
      political: grouped.political.length,
      insider: grouped.insider.length,
      news: grouped.news.length,
      social: grouped.social.length,
      economic: grouped.economic.length
    });
    
    res.json(grouped);
    
  } catch (error: any) {
    console.error('❌ [/data/all] Error:', error);
    res.status(500).json({ error: 'Failed to fetch data', message: error.message });
  }
});

/**
 * GET /api/data/political
 * Get only political trades (Nancy Pelosi, etc.)
 */
router.get('/political', async (req, res) => {
  try {
    console.log('🏛️ [/data/political] Fetching political trades...');
    
    const trades = await dataIngestionService.fetchPoliticalTrades();
    
    // Sort by date
    trades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    res.json({
      trades,
      count: trades.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ [/data/political] Error:', error);
    res.status(500).json({ error: 'Failed to fetch political data' });
  }
});

/**
 * GET /api/data/insider
 * Get insider trading activity (SEC Form 4)
 */
router.get('/insider', async (req, res) => {
  try {
    console.log('👔 [/data/insider] Fetching insider activity...');
    
    const activity = await dataIngestionService.fetchInsiderActivity();
    
    res.json({
      activity,
      count: activity.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ [/data/insider] Error:', error);
    res.status(500).json({ error: 'Failed to fetch insider data' });
  }
});

/**
 * GET /api/data/news
 * Get all news from multiple sources
 */
router.get('/news', async (req, res) => {
  try {
    console.log('📰 [/data/news] Fetching news...');
    
    const news = await dataIngestionService.fetchAllNews();
    
    res.json({
      articles: news,
      count: news.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ [/data/news] Error:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

/**
 * GET /api/data/social
 * Get social sentiment (Truth Social, Reddit, etc.)
 */
router.get('/social', async (req, res) => {
  try {
    console.log('📱 [/data/social] Fetching social sentiment...');
    
    const social = await dataIngestionService.fetchSocialSentiment();
    
    res.json({
      posts: social,
      count: social.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ [/data/social] Error:', error);
    res.status(500).json({ error: 'Failed to fetch social data' });
  }
});

/**
 * GET /api/data/economic
 * Get economic calendar and events
 */
router.get('/economic', async (req, res) => {
  try {
    console.log('📊 [/data/economic] Fetching economic calendar...');
    
    const events = await dataIngestionService.fetchEconomicCalendar();
    
    res.json({
      events,
      count: events.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ [/data/economic] Error:', error);
    res.status(500).json({ error: 'Failed to fetch economic data' });
  }
});

/**
 * GET /api/data/ticker/:symbol
 * Get all data related to a specific ticker
 */
router.get('/ticker/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    console.log(`🎯 [/data/ticker/${symbol}] Fetching ticker data...`);
    
    const tickerData = await dataIngestionService.getDataForTicker(symbol);
    
    // Group by type
    const grouped = {
      ticker: symbol.toUpperCase(),
      political: tickerData.filter(d => d.type === 'political_trade'),
      insider: tickerData.filter(d => d.type === 'insider_trade'),
      news: tickerData.filter(d => d.type === 'news'),
      social: tickerData.filter(d => d.type === 'social'),
      total: tickerData.length,
      timestamp: new Date().toISOString()
    };
    
    console.log(`✅ [/data/ticker/${symbol}] Found ${grouped.total} items`);
    
    res.json(grouped);
    
  } catch (error: any) {
    console.error(`❌ [/data/ticker] Error:`, error);
    res.status(500).json({ error: 'Failed to fetch ticker data' });
  }
});

/**
 * GET /api/data/health
 * Health check for data sources
 */
router.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    service: 'data-ingestion',
    sources: {
      political: 'active',
      insider: 'active',
      news: 'active',
      social: 'active',
      economic: 'active'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
