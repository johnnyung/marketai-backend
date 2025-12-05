// backend/src/services/socialIntelligenceIntegration.ts
// FINAL FIXED: Normalized sentiment + truncated source_name

import pool from '../db/index.js';
import redditService from './redditService.js';
import newsApiService from './newsApiService.js';
import aiTickerExtractor from './aiTickerExtractor.js';
import crypto from 'crypto';

interface IntelligenceResult {
  redditIntelligence: number;
  newsIntelligence: number;
  totalStored: number;
}

class SocialIntelligenceIntegration {
  
  async ingestSocialIntelligence(): Promise<IntelligenceResult> {
    console.log('\n🧠 ===== AI SOCIAL INTELLIGENCE INGESTION =====\n');
    
    let redditCount = 0;
    let newsCount = 0;
    
    try {
      console.log('📱 Fetching Reddit posts...');
      const wsbPosts = await redditService.getWallStreetBetsHot(25);
      const stocksPosts = await redditService.getStocksPosts(25);
      const redditPosts = [...wsbPosts, ...stocksPosts];
      console.log(`   ✓ Fetched ${redditPosts.length} Reddit posts`);
      
      console.log('📰 Fetching News articles...');
      const newsArticles = await newsApiService.getFinancialNews(['stocks', 'market', 'trading'], 30);
      console.log(`   ✓ Fetched ${newsArticles.length} News articles`);
      
      if (redditPosts.length > 0) {
        console.log('\n🤖 Processing Reddit posts with AI...');
        redditCount = await this.processRedditWithAI(redditPosts);
        console.log(`   ✓ Stored ${redditCount} AI-validated Reddit entries`);
      }
      
      if (newsArticles.length > 0) {
        console.log('\n🤖 Processing News articles with AI...');
        newsCount = await this.processNewsWithAI(newsArticles);
        console.log(`   ✓ Stored ${newsCount} AI-validated News entries`);
      }
      
      const totalStored = redditCount + newsCount;
      
      console.log('\n✅ AI Social Intelligence Ingestion Complete!');
      console.log(`   📊 Total: ${totalStored} entries (${redditCount} Reddit, ${newsCount} News)\n`);
      
      return {
        redditIntelligence: redditCount,
        newsIntelligence: newsCount,
        totalStored
      };
      
    } catch (error) {
      console.error('❌ Social intelligence ingestion error:', error);
      throw error;
    }
  }
  
  private async processRedditWithAI(posts: any[]): Promise<number> {
    try {
      const validatedTickers = await aiTickerExtractor.extractFromReddit(posts);
      
      let storedCount = 0;
      
      for (const validated of validatedTickers) {
        try {
          const importance = this.getImportance(validated.relevanceScore);
          const sentiment = this.normalizeSentiment(validated.sentiment);
          const sourceName = this.truncateString(validated.sourceTitle || 'Reddit', 100);
          
          const content = `${validated.ticker}-${validated.reasoning}-${validated.sourceUrl}`;
          const contentHash = crypto.createHash('sha256').update(content).digest('hex');
          
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);
          
          await this.storeIntelligence({
            source_type: 'reddit',
            source_name: sourceName,
            raw_data: {
              ticker: validated.ticker,
              sentiment: validated.sentiment,
              reasoning: validated.reasoning,
              keyPoints: validated.keyPoints,
              relevanceScore: validated.relevanceScore,
              confidenceLevel: validated.confidenceLevel,
              sourceType: validated.sourceType,
              sourceTitle: validated.sourceTitle,
              sourceUrl: validated.sourceUrl
            },
            raw_url: validated.sourceUrl || 'https://reddit.com',
            ai_summary: validated.reasoning,
            ai_relevance_score: validated.relevanceScore,
            ai_sentiment: sentiment,
            ai_importance: importance,
            tickers: [validated.ticker],
            tags: validated.keyPoints || [],
            event_date: new Date(),
            content_url: validated.sourceUrl || 'https://reddit.com',
            expires_at: expiresAt,
            content_hash: contentHash
          });
          
          storedCount++;
        } catch (error) {
          console.error(`   ⚠️ Failed to store Reddit ticker: ${validated.ticker}`, error);
        }
      }
      
      return storedCount;
      
    } catch (error) {
      console.error('❌ Reddit AI processing error:', error);
      return 0;
    }
  }
  
  private async processNewsWithAI(articles: any[]): Promise<number> {
    try {
      const validatedTickers = await aiTickerExtractor.extractFromNews(articles);
      
      let storedCount = 0;
      
      for (const validated of validatedTickers) {
        try {
          const importance = this.getImportance(validated.relevanceScore);
          const sentiment = this.normalizeSentiment(validated.sentiment);
          const sourceName = this.truncateString(validated.sourceTitle || 'News', 100);
          
          const content = `${validated.ticker}-${validated.reasoning}-${validated.sourceUrl}`;
          const contentHash = crypto.createHash('sha256').update(content).digest('hex');
          
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);
          
          await this.storeIntelligence({
            source_type: 'news',
            source_name: sourceName,
            raw_data: {
              ticker: validated.ticker,
              sentiment: validated.sentiment,
              reasoning: validated.reasoning,
              keyPoints: validated.keyPoints,
              relevanceScore: validated.relevanceScore,
              confidenceLevel: validated.confidenceLevel,
              sourceType: validated.sourceType,
              sourceTitle: validated.sourceTitle,
              sourceUrl: validated.sourceUrl
            },
            raw_url: validated.sourceUrl || '',
            ai_summary: validated.reasoning,
            ai_relevance_score: validated.relevanceScore,
            ai_sentiment: sentiment,
            ai_importance: importance,
            tickers: [validated.ticker],
            tags: validated.keyPoints || [],
            event_date: new Date(),
            content_url: validated.sourceUrl || '',
            expires_at: expiresAt,
            content_hash: contentHash
          });
          
          storedCount++;
        } catch (error) {
          console.error(`   ⚠️ Failed to store news ticker: ${validated.ticker}`, error);
        }
      }
      
      return storedCount;
      
    } catch (error) {
      console.error('❌ News AI processing error:', error);
      return 0;
    }
  }
  
  /**
   * Normalize sentiment to match DB constraint
   * DB allows: 'bullish', 'bearish', 'neutral', 'mixed'
   */
  private normalizeSentiment(sentiment: string): 'bullish' | 'bearish' | 'neutral' | 'mixed' {
    const normalized = sentiment.toLowerCase();
    
    if (normalized === 'bullish') return 'bullish';
    if (normalized === 'bearish') return 'bearish';
    if (normalized === 'neutral') return 'neutral';
    if (normalized === 'mixed') return 'mixed';
    
    // Map other values to neutral
    if (['uncertain', 'unknown', 'unclear'].includes(normalized)) {
      return 'neutral';
    }
    
    // Default to neutral for any unrecognized sentiment
    return 'neutral';
  }
  
  /**
   * Truncate string to max length
   */
  private truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }
  
  /**
   * Determine importance level from relevance score
   */
  private getImportance(relevanceScore: number): 'critical' | 'high' | 'medium' | 'low' {
    if (relevanceScore >= 90) return 'critical';
    if (relevanceScore >= 75) return 'high';
    if (relevanceScore >= 50) return 'medium';
    return 'low';
  }
  
  /**
   * Store AI-validated intelligence in digest_entries table
   */
  private async storeIntelligence(data: {
    source_type: string;
    source_name: string;
    raw_data: any;
    raw_url: string;
    ai_summary: string;
    ai_relevance_score: number;
    ai_sentiment: string;
    ai_importance: string;
    tickers: string[];
    tags: string[];
    event_date: Date;
    content_url: string;
    expires_at: Date;
    content_hash: string;
  }): Promise<void> {
    
    await pool.query(
      `INSERT INTO digest_entries (
        source_type,
        source_name,
        raw_data,
        raw_url,
        ai_summary,
        ai_relevance_score,
        ai_sentiment,
        ai_importance,
        tickers,
        tags,
        event_date,
        content_url,
        expires_at,
        content_hash,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      ON CONFLICT (content_hash) DO NOTHING`,
      [
        data.source_type,
        data.source_name,
        JSON.stringify(data.raw_data),
        data.raw_url,
        data.ai_summary,
        data.ai_relevance_score,
        data.ai_sentiment,
        data.ai_importance,
        data.tickers,
        data.tags,
        data.event_date,
        data.content_url,
        data.expires_at,
        data.content_hash
      ]
    );
  }
  
  async getSocialIntelligenceForTicker(ticker: string, days: number = 7): Promise<any[]> {
    const result = await pool.query(
      `SELECT 
        id,
        source_type,
        source_name,
        ai_summary,
        ai_relevance_score,
        ai_sentiment,
        ai_importance,
        tickers,
        tags,
        event_date,
        content_url,
        created_at
       FROM digest_entries
       WHERE source_type IN ('reddit', 'news')
       AND $1 = ANY(tickers)
       AND event_date >= CURRENT_DATE - $2
       ORDER BY event_date DESC, ai_relevance_score DESC
       LIMIT 50`,
      [ticker, days]
    );
    
    return result.rows;
  }
  
  async getTrendingTickers(limit: number = 10): Promise<any[]> {
    const result = await pool.query(
      `WITH ticker_mentions AS (
        SELECT 
          unnest(tickers) as ticker,
          ai_relevance_score,
          ai_sentiment,
          event_date
        FROM digest_entries
        WHERE source_type IN ('reddit', 'news')
        AND event_date >= CURRENT_DATE - 1
      )
      SELECT 
        ticker,
        COUNT(*) as mention_count,
        AVG(ai_relevance_score) as avg_relevance,
        SUM(CASE WHEN ai_sentiment = 'bullish' THEN 1 ELSE 0 END) as bullish_mentions,
        SUM(CASE WHEN ai_sentiment = 'bearish' THEN 1 ELSE 0 END) as bearish_mentions,
        SUM(CASE WHEN ai_sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral_mentions,
        CASE 
          WHEN SUM(CASE WHEN ai_sentiment = 'bullish' THEN 1 ELSE 0 END) > 
               SUM(CASE WHEN ai_sentiment = 'bearish' THEN 1 ELSE 0 END) THEN 'bullish'
          WHEN SUM(CASE WHEN ai_sentiment = 'bearish' THEN 1 ELSE 0 END) > 
               SUM(CASE WHEN ai_sentiment = 'bullish' THEN 1 ELSE 0 END) THEN 'bearish'
          ELSE 'neutral'
        END as overall_sentiment,
        MAX(event_date) as last_mention
      FROM ticker_mentions
      GROUP BY ticker
      HAVING COUNT(*) >= 2
      ORDER BY AVG(ai_relevance_score) DESC, COUNT(*) DESC
      LIMIT $1`,
      [limit]
    );
    
    return result.rows;
  }
  
  async getSocialIntelligenceSummary(): Promise<{
    totalEntries: number;
    trendingTickers: number;
    highRelevance: number;
    bullishTickers: number;
    bearishTickers: number;
  }> {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_entries,
        (SELECT COUNT(DISTINCT ticker) 
         FROM digest_entries, unnest(tickers) as ticker 
         WHERE source_type IN ('reddit', 'news') 
         AND event_date >= CURRENT_DATE - 1) as trending_tickers,
        SUM(CASE WHEN ai_relevance_score >= 80 THEN 1 ELSE 0 END) as high_relevance,
        SUM(CASE WHEN ai_sentiment = 'bullish' THEN 1 ELSE 0 END) as bullish_tickers,
        SUM(CASE WHEN ai_sentiment = 'bearish' THEN 1 ELSE 0 END) as bearish_tickers
       FROM digest_entries
       WHERE source_type IN ('reddit', 'news')
       AND event_date >= CURRENT_DATE - 1`
    );
    
    const row = result.rows[0];
    
    return {
      totalEntries: parseInt(row.total_entries) || 0,
      trendingTickers: parseInt(row.trending_tickers) || 0,
      highRelevance: parseInt(row.high_relevance) || 0,
      bullishTickers: parseInt(row.bullish_tickers) || 0,
      bearishTickers: parseInt(row.bearish_tickers) || 0
    };
  }
}

export default new SocialIntelligenceIntegration();
