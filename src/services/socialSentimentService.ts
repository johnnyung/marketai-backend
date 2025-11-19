// backend/src/services/socialSentimentService.ts
// Aggregate Social Sentiment from Reddit + News
// Stores in database for trending analysis

import { Pool } from 'pg';
import redditService from './redditService.js';
import newsApiService from './newsApiService.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

interface SocialSentiment {
  ticker: string;
  source: 'reddit' | 'news' | 'combined';
  sentiment_score: number; // -100 to 100
  mention_count: number;
  period_start: Date;
  period_end: Date;
  confidence: number;
}

interface TrendingTicker {
  ticker: string;
  redditMentions: number;
  redditSentiment: 'bullish' | 'bearish' | 'neutral';
  newsArticles: number;
  newsSentiment: 'positive' | 'negative' | 'neutral';
  combinedScore: number;
  trending: boolean;
}

class SocialSentimentService {
  
  /**
   * Analyze and store social sentiment for all sources
   */
  async analyzeSocialSentiment(): Promise<{
    trendingTickers: TrendingTicker[];
    redditPosts: number;
    newsArticles: number;
  }> {
    console.log('\n🎯 === SOCIAL SENTIMENT ANALYSIS ===\n');
    
    try {
      // Get Reddit sentiment
      const redditData = await redditService.getComprehensiveSentiment();
      console.log(`  ✓ Reddit: ${redditData.trending.length} trending tickers`);

      // Get news headlines
      const newsArticles = await newsApiService.getFinancialNews(['stocks', 'market'], 50);
      console.log(`  ✓ News: ${newsArticles.length} articles`);

      // Combine and analyze
      const trendingTickers = this.combineSentiment(redditData.trending, newsArticles);
      console.log(`  ✓ Combined: ${trendingTickers.length} tickers analyzed`);

      // Store in database
      await this.storeSentimentData(trendingTickers);
      console.log(`  ✓ Stored sentiment data`);

      // Store Reddit posts
      await this.storeRedditPosts(redditData.wsb.slice(0, 20));
      console.log(`  ✓ Stored top Reddit posts`);

      console.log('\n✅ Social sentiment analysis complete\n');

      return {
        trendingTickers,
        redditPosts: redditData.wsb.length,
        newsArticles: newsArticles.length
      };
      
    } catch (error: any) {
      console.error('❌ Social sentiment analysis failed:', error.message);
      throw error;
    }
  }

  /**
   * Combine Reddit and News sentiment
   */
  private combineSentiment(redditMentions: any[], newsArticles: any[]): TrendingTicker[] {
    const tickerMap = new Map<string, TrendingTicker>();

    // Process Reddit mentions
    for (const mention of redditMentions) {
      tickerMap.set(mention.ticker, {
        ticker: mention.ticker,
        redditMentions: mention.mentions,
        redditSentiment: mention.sentiment,
        newsArticles: 0,
        newsSentiment: 'neutral',
        combinedScore: 0,
        trending: mention.mentions >= 5
      });
    }

    // Process news articles (extract tickers from titles/descriptions)
    for (const article of newsArticles) {
      const text = `${article.title} ${article.description}`.toUpperCase();
      const tickerRegex = /\b([A-Z]{2,5})\b/g;
      const matches = [...text.matchAll(tickerRegex)];

      for (const match of matches) {
        const ticker = match[1];
        
        // Only process if we have Reddit data for this ticker
        if (tickerMap.has(ticker)) {
          const data = tickerMap.get(ticker)!;
          data.newsArticles++;
          
          // Update news sentiment
          const articleSentiment = newsApiService.analyzeSentiment(article);
          if (articleSentiment === 'positive') {
            data.newsSentiment = 'positive';
          } else if (articleSentiment === 'negative' && data.newsSentiment !== 'positive') {
            data.newsSentiment = 'negative';
          }
        }
      }
    }

    // Calculate combined scores
    const tickers = Array.from(tickerMap.values());
    
    for (const ticker of tickers) {
      let score = 0;

      // Reddit sentiment contribution (0-50 points)
      score += ticker.redditMentions * 2; // 2 points per mention
      if (ticker.redditSentiment === 'bullish') score += 20;
      if (ticker.redditSentiment === 'bearish') score -= 20;

      // News sentiment contribution (0-30 points)
      score += ticker.newsArticles * 3; // 3 points per article
      if (ticker.newsSentiment === 'positive') score += 15;
      if (ticker.newsSentiment === 'negative') score -= 15;

      ticker.combinedScore = Math.min(100, Math.max(-100, score));
    }

    // Sort by combined score
    tickers.sort((a, b) => b.combinedScore - a.combinedScore);

    return tickers;
  }

  /**
   * Store sentiment data in database
   */
  private async storeSentimentData(tickers: TrendingTicker[]): Promise<void> {
    const periodStart = new Date();
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date();

    for (const ticker of tickers) {
      try {
        await pool.query(`
          INSERT INTO social_sentiment (
            ticker, source, sentiment_score, mention_count,
            period_start, period_end, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (ticker, source, period_start) 
          DO UPDATE SET
            sentiment_score = EXCLUDED.sentiment_score,
            mention_count = EXCLUDED.mention_count,
            period_end = EXCLUDED.period_end,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
        `, [
          ticker.ticker,
          'combined',
          ticker.combinedScore,
          ticker.redditMentions + ticker.newsArticles,
          periodStart,
          periodEnd,
          JSON.stringify({
            redditMentions: ticker.redditMentions,
            redditSentiment: ticker.redditSentiment,
            newsArticles: ticker.newsArticles,
            newsSentiment: ticker.newsSentiment,
            trending: ticker.trending
          })
        ]);
      } catch (error) {
        console.error(`  ✗ Failed to store sentiment for ${ticker.ticker}`);
      }
    }
  }

  /**
   * Store Reddit posts in database
   */
  private async storeRedditPosts(posts: any[]): Promise<void> {
    for (const post of posts) {
      try {
        await pool.query(`
          INSERT INTO reddit_posts (
            post_id, subreddit, title, content, author,
            score, num_comments, upvote_ratio, permalink,
            sentiment, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (post_id) DO NOTHING
        `, [
          post.id,
          post.subreddit,
          post.title,
          post.selftext || '',
          post.author,
          post.score,
          post.num_comments,
          post.upvote_ratio,
          post.permalink,
          'neutral', // Could run sentiment analysis here
          new Date(post.created_utc * 1000)
        ]);
      } catch (error) {
        // Ignore duplicates
      }
    }
  }

  /**
   * Get trending tickers from database
   */
  async getTrendingTickers(limit: number = 20): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        ticker,
        sentiment_score,
        mention_count,
        metadata,
        period_end
      FROM social_sentiment
      WHERE source = 'combined'
        AND period_start >= CURRENT_DATE
      ORDER BY sentiment_score DESC
      LIMIT $1
    `, [limit]);

    return result.rows.map(row => ({
      ticker: row.ticker,
      score: row.sentiment_score,
      mentions: row.mention_count,
      ...row.metadata,
      timestamp: row.period_end
    }));
  }

  /**
   * Get sentiment for specific ticker
   */
  async getTickerSentiment(ticker: string): Promise<any> {
    const result = await pool.query(`
      SELECT *
      FROM social_sentiment
      WHERE ticker = $1
        AND period_start >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY period_start DESC
    `, [ticker.toUpperCase()]);

    return result.rows;
  }

  /**
   * Get recent Reddit posts
   */
  async getRecentRedditPosts(limit: number = 50): Promise<any[]> {
    const result = await pool.query(`
      SELECT *
      FROM reddit_posts
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    return result.rows;
  }

  /**
   * Get Reddit posts for specific ticker
   */
  async getRedditPostsForTicker(ticker: string, limit: number = 20): Promise<any[]> {
    const result = await pool.query(`
      SELECT *
      FROM reddit_posts
      WHERE title ILIKE $1 OR content ILIKE $1
      ORDER BY score DESC, created_at DESC
      LIMIT $2
    `, [`%${ticker}%`, limit]);

    return result.rows;
  }

  /**
   * Get daily sentiment summary
   */
  async getDailySummary(): Promise<{
    totalTickers: number;
    bullishCount: number;
    bearishCount: number;
    topBullish: any[];
    topBearish: any[];
  }> {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_tickers,
        COUNT(*) FILTER (WHERE sentiment_score > 20) as bullish_count,
        COUNT(*) FILTER (WHERE sentiment_score < -20) as bearish_count
      FROM social_sentiment
      WHERE source = 'combined'
        AND period_start >= CURRENT_DATE
    `);

    const stats = result.rows[0];

    const topBullish = await pool.query(`
      SELECT ticker, sentiment_score, mention_count, metadata
      FROM social_sentiment
      WHERE source = 'combined'
        AND period_start >= CURRENT_DATE
        AND sentiment_score > 0
      ORDER BY sentiment_score DESC
      LIMIT 10
    `);

    const topBearish = await pool.query(`
      SELECT ticker, sentiment_score, mention_count, metadata
      FROM social_sentiment
      WHERE source = 'combined'
        AND period_start >= CURRENT_DATE
        AND sentiment_score < 0
      ORDER BY sentiment_score ASC
      LIMIT 10
    `);

    return {
      totalTickers: parseInt(stats.total_tickers),
      bullishCount: parseInt(stats.bullish_count),
      bearishCount: parseInt(stats.bearish_count),
      topBullish: topBullish.rows,
      topBearish: topBearish.rows
    };
  }
}

export default new SocialSentimentService();
