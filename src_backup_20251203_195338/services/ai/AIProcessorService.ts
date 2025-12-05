import pool from '../../db/index.js';
import aiTickerExtractor from '../aiTickerExtractor.js';
import crypto from 'crypto';

class AIProcessorService {
  
  async processReddit(batchSize: number = 100) {
    const startTime = Date.now();
    const statusId = await this.logStart('reddit');
    
    try {
      console.log('🤖 Processing Reddit with AI...');
      
      const result = await pool.query(
        `SELECT * FROM raw_reddit_posts WHERE processed = FALSE 
         ORDER BY created_utc DESC LIMIT $1`,
        [batchSize]
      );
      
      if (result.rows.length === 0) {
        await this.logComplete(statusId, 0, 0, 0, 0);
        return { itemsProcessed: 0, tickersExtracted: 0 };
      }
      
      // FIX: raw_json is already an object, not a string
      const posts = result.rows.map(r => 
        typeof r.raw_json === 'string' ? JSON.parse(r.raw_json) : r.raw_json
      );
      
      const validated = await aiTickerExtractor.extractFromReddit(posts);
      
      let stored = 0;
      for (const v of validated) {
        try {
          await this.storeInDigest(v, 'reddit');
          stored++;
        } catch (err: any) {
          if (err.code !== '23505') console.error('Store error:', err.message);
        }
      }
      
      await pool.query(
        `UPDATE raw_reddit_posts SET processed = TRUE, processed_at = NOW()
         WHERE id = ANY($1)`,
        [result.rows.map(r => r.id)]
      );
      
      const duration = Math.floor((Date.now() - startTime) / 1000);
      await this.logComplete(statusId, result.rows.length, stored, duration, result.rows.length * 500);
      
      console.log(`   ✅ Processed ${result.rows.length} posts, extracted ${stored} tickers`);
      return { itemsProcessed: result.rows.length, tickersExtracted: stored };
      
    } catch (error: any) {
      await this.logFailed(statusId, error.message);
      throw error;
    }
  }
  
  async processNews(batchSize: number = 100) {
    const startTime = Date.now();
    const statusId = await this.logStart('news');
    
    try {
      console.log('🤖 Processing News with AI...');
      
      const result = await pool.query(
        `SELECT * FROM raw_news_articles WHERE processed = FALSE 
         ORDER BY published_at DESC LIMIT $1`,
        [batchSize]
      );
      
      if (result.rows.length === 0) {
        await this.logComplete(statusId, 0, 0, 0, 0);
        return { itemsProcessed: 0, tickersExtracted: 0 };
      }
      
      // FIX: raw_json is already an object, not a string
      const articles = result.rows.map(r => 
        typeof r.raw_json === 'string' ? JSON.parse(r.raw_json) : r.raw_json
      );
      
      const validated = await aiTickerExtractor.extractFromNews(articles);
      
      let stored = 0;
      for (const v of validated) {
        try {
          await this.storeInDigest(v, 'news');
          stored++;
        } catch (err: any) {
          if (err.code !== '23505') console.error('Store error:', err.message);
        }
      }
      
      await pool.query(
        `UPDATE raw_news_articles SET processed = TRUE, processed_at = NOW()
         WHERE id = ANY($1)`,
        [result.rows.map(r => r.id)]
      );
      
      const duration = Math.floor((Date.now() - startTime) / 1000);
      await this.logComplete(statusId, result.rows.length, stored, duration, result.rows.length * 500);
      
      console.log(`   ✅ Processed ${result.rows.length} articles, extracted ${stored} tickers`);
      return { itemsProcessed: result.rows.length, tickersExtracted: stored };
      
    } catch (error: any) {
      await this.logFailed(statusId, error.message);
      throw error;
    }
  }
  
  private async storeInDigest(validated: any, sourceType: string) {
    const importance = validated.relevanceScore >= 90 ? 'critical' :
                      validated.relevanceScore >= 75 ? 'high' :
                      validated.relevanceScore >= 50 ? 'medium' : 'low';
    
    const sentiment = ['bullish', 'bearish', 'neutral', 'mixed'].includes(validated.sentiment?.toLowerCase()) ?
                     validated.sentiment.toLowerCase() : 'neutral';
    
    const content = `${validated.ticker}-${validated.reasoning}-${validated.sourceUrl}`;
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    await pool.query(
      `INSERT INTO digest_entries (
        source_type, source_name, raw_data, raw_url, ai_summary,
        ai_relevance_score, ai_sentiment, ai_importance, tickers, tags,
        event_date, content_url, expires_at, content_hash, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      ON CONFLICT (content_hash) DO NOTHING`,
      [
        sourceType,
        (validated.sourceTitle || sourceType).substring(0, 100),
        JSON.stringify(validated),
        validated.sourceUrl || '',
        validated.reasoning,
        validated.relevanceScore,
        sentiment,
        importance,
        [validated.ticker],
        validated.keyPoints || [],
        new Date(),
        validated.sourceUrl || '',
        expiresAt,
        contentHash
      ]
    );
  }
  
  private async logStart(source: string) {
    const r = await pool.query(
      `INSERT INTO ai_processing_status (source_type, started_at, status)
       VALUES ($1, NOW(), 'running') RETURNING id`,
      [source]
    );
    return r.rows[0].id;
  }
  
  private async logComplete(id: number, processed: number, extracted: number, duration: number, tokens: number) {
    const cost = (tokens / 1000000) * 3;
    await pool.query(
      `UPDATE ai_processing_status SET status = 'completed',
       items_processed = $1, tickers_extracted = $2, completed_at = NOW(),
       duration_seconds = $3, ai_tokens_used = $4, estimated_cost_usd = $5
       WHERE id = $6`,
      [processed, extracted, duration, tokens, cost, id]
    );
  }
  
  private async logFailed(id: number, error: string) {
    await pool.query(
      `UPDATE ai_processing_status SET status = 'failed',
       error_message = $1, completed_at = NOW() WHERE id = $2`,
      [error, id]
    );
  }
}

export default new AIProcessorService();
