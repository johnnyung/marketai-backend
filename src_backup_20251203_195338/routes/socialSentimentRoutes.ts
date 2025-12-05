// backend/src/routes/socialSentimentRoutes.ts
// API Routes for Social Sentiment Analysis

import express from 'express';
import socialSentimentService from '../services/socialSentimentService.js';
import redditService from '../services/redditService.js';
import newsApiService from '../services/newsApiService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/social/analyze
 * Run complete social sentiment analysis
 */
router.post('/analyze', authenticateToken, async (req, res) => {
  try {
    console.log('🎯 API: Running social sentiment analysis...');
    
    const result = await socialSentimentService.analyzeSocialSentiment();
    
    res.json({
      success: true,
      data: result,
      message: `Analyzed ${result.trendingTickers.length} tickers from ${result.redditPosts} Reddit posts and ${result.newsArticles} news articles`
    });
    
  } catch (error: any) {
    console.error('Social analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze social sentiment'
    });
  }
});

/**
 * GET /api/social/trending
 * Get trending tickers
 */
router.get('/trending', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    
    const trending = await socialSentimentService.getTrendingTickers(limit);
    
    res.json({
      success: true,
      data: trending,
      count: trending.length
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/social/ticker/:ticker
 * Get sentiment for specific ticker
 */
router.get('/ticker/:ticker', authenticateToken, async (req, res) => {
  try {
    const { ticker } = req.params;
    
    const sentiment = await socialSentimentService.getTickerSentiment(ticker);
    
    res.json({
      success: true,
      data: sentiment,
      ticker: ticker.toUpperCase()
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/social/summary
 * Get daily sentiment summary
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const summary = await socialSentimentService.getDailySummary();
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/social/reddit/posts
 * Get recent Reddit posts
 */
router.get('/reddit/posts', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    
    const posts = await socialSentimentService.getRecentRedditPosts(limit);
    
    res.json({
      success: true,
      data: posts,
      count: posts.length
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/social/reddit/ticker/:ticker
 * Get Reddit posts for specific ticker
 */
router.get('/reddit/ticker/:ticker', authenticateToken, async (req, res) => {
  try {
    const { ticker } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const posts = await socialSentimentService.getRedditPostsForTicker(ticker, limit);
    
    res.json({
      success: true,
      data: posts,
      ticker: ticker.toUpperCase(),
      count: posts.length
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/social/reddit/wsb
 * Get WallStreetBets hot posts (live)
 */
router.get('/reddit/wsb', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 25;
    
    const posts = await redditService.getWallStreetBetsHot(limit);
    const trending = redditService.extractTickerMentions(posts);
    
    res.json({
      success: true,
      data: {
        posts,
        trending
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
 * GET /api/social/news/headlines
 * Get top financial headlines
 */
router.get('/news/headlines', authenticateToken, async (req, res) => {
  try {
    const category = (req.query.category as 'business' | 'technology') || 'business';
    const limit = parseInt(req.query.limit as string) || 20;
    
    const headlines = await newsApiService.getTopHeadlines(category, limit);
    
    res.json({
      success: true,
      data: headlines,
      count: headlines.length
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/social/news/ticker/:ticker
 * Get news for specific ticker
 */
router.get('/news/ticker/:ticker', authenticateToken, async (req, res) => {
  try {
    const { ticker } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const news = await newsApiService.getTickerNews(ticker, limit);
    
    res.json({
      success: true,
      data: news,
      ticker: ticker.toUpperCase(),
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
 * GET /api/social/news/breaking
 * Get breaking news (last 6 hours)
 */
router.get('/news/breaking', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    
    const news = await newsApiService.getBreakingNews(limit);
    
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
 * GET /api/social/health
 * Check social sentiment services health
 */
router.get('/health', async (req, res) => {
  try {
    const [redditHealth, newsHealth] = await Promise.all([
      redditService.checkHealth(),
      newsApiService.checkHealth()
    ]);
    
    res.json({
      success: true,
      data: {
        reddit: redditHealth ? 'healthy' : 'unhealthy',
        news: newsHealth ? 'healthy' : 'unhealthy',
        overall: (redditHealth && newsHealth) ? 'healthy' : 'degraded'
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
 * GET /api/social/info
 * Get service information
 */
router.get('/info', async (req, res) => {
  res.json({
    success: true,
    data: {
      reddit: redditService.getUsageInfo(),
      news: newsApiService.getUsageInfo()
    }
  });
});

export default router;
