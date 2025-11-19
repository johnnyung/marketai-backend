import pool from '../../db/index.js';
import newsApiService from '../newsApiService.js';

class NewsCollectorService {
  async collect() {
    const startTime = Date.now();
    const statusId = await this.logStart();
    
    try {
      console.log('📰 Collecting news...');
      
      const articles = await newsApiService.getFinancialNews(['stocks', 'market', 'trading'], 50);
      let stored = 0;
      
      for (const article of articles) {
        try {
          await pool.query(
            `INSERT INTO raw_news_articles (
              article_url, source, title, description, content, author,
              url, image_url, published_at, raw_json
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (article_url) DO NOTHING`,
            [
              article.url, article.source?.name || 'Unknown', article.title,
              article.description || null, article.content || null,
              article.author || null, article.url, article.urlToImage || null,
              new Date(article.publishedAt), JSON.stringify(article)
            ]
          );
          stored++;
        } catch (err: any) {
          if (err.code !== '23505') console.error('Store error:', err.message);
        }
      }
      
      const duration = Math.floor((Date.now() - startTime) / 1000);
      await this.logComplete(statusId, articles.length, stored, duration);
      
      console.log(`   ✅ Stored ${stored} articles in ${duration}s`);
      return { itemsCollected: articles.length, itemsStored: stored, durationSeconds: duration };
      
    } catch (error: any) {
      await this.logFailed(statusId, error.message);
      throw error;
    }
  }
  
  private async logStart() {
    const r = await pool.query(
      `INSERT INTO data_collection_status (source_type, started_at, status)
       VALUES ('news', NOW(), 'running') RETURNING id`
    );
    return r.rows[0].id;
  }
  
  private async logComplete(id: number, collected: number, stored: number, duration: number) {
    await pool.query(
      `UPDATE data_collection_status SET status = 'completed',
       items_collected = $1, items_stored = $2, completed_at = NOW(),
       duration_seconds = $3 WHERE id = $4`,
      [collected, stored, duration, id]
    );
  }
  
  private async logFailed(id: number, error: string) {
    await pool.query(
      `UPDATE data_collection_status SET status = 'failed',
       error_message = $1, completed_at = NOW() WHERE id = $2`,
      [error, id]
    );
  }
  
  async getStats() {
    const r = await pool.query(
      `SELECT COUNT(*) as total_articles,
       COUNT(*) FILTER (WHERE processed = FALSE) as unprocessed_articles,
       MAX(collected_at) as last_collection
       FROM raw_news_articles`
    );
    return r.rows[0];
  }
}

export default new NewsCollectorService();
