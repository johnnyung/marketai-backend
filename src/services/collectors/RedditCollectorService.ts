import { pool } from '../../db/index.js';
import redditService from '../redditService.js';

class RedditCollectorService {
  async collect() {
    const startTime = Date.now();
    const statusId = await this.logStart();
    
    try {
      console.log('📱 Collecting Reddit posts...');
      
      const [wsb, stocks, investing] = await Promise.all([
        redditService.getWallStreetBetsHot(25),
        redditService.getStocksPosts(25),
        redditService.getInvestingPosts(25)
      ]);
      
      const allPosts = [...wsb, ...stocks, ...investing];
      let stored = 0;
      
      for (const post of allPosts) {
        try {
          await pool.query(
            `INSERT INTO raw_reddit_posts (
              post_id, subreddit, title, selftext, author, score, 
              num_comments, upvote_ratio, permalink, url, created_utc, raw_json
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (post_id) DO NOTHING`,
            [
              post.id, post.subreddit, post.title, post.selftext || null,
              post.author, post.score || 0, post.num_comments || 0,
              post.upvote_ratio || null, post.permalink, post.url,
              new Date(post.created_utc * 1000), JSON.stringify(post)
            ]
          );
          stored++;
        } catch (err: any) {
          if (err.code !== '23505') console.error('Store error:', err.message);
        }
      }
      
      const duration = Math.floor((Date.now() - startTime) / 1000);
      await this.logComplete(statusId, allPosts.length, stored, duration);
      
      console.log(`   ✅ Stored ${stored} posts in ${duration}s`);
      return { itemsCollected: allPosts.length, itemsStored: stored, durationSeconds: duration };
      
    } catch (error: any) {
      await this.logFailed(statusId, error.message);
      throw error;
    }
  }
  
  private async logStart() {
    const r = await pool.query(
      `INSERT INTO data_collection_status (source_type, started_at, status)
       VALUES ('reddit', NOW(), 'running') RETURNING id`
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
      `SELECT COUNT(*) as total_posts,
       COUNT(*) FILTER (WHERE processed = FALSE) as unprocessed_posts,
       MAX(collected_at) as last_collection
       FROM raw_reddit_posts`
    );
    return r.rows[0];
  }
}

export default new RedditCollectorService();
