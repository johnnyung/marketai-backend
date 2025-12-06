import { pool } from "../db/index.js";
import { Pool } from 'pg';
import redditService from './redditService.js';
import newsApiService from './newsApiService.js';


class SocialSentimentService {
  
  // 1. MOMENTUM VELOCITY (The New Feature)
  async getSentimentVelocity(ticker: string): Promise<number> {
    try {
        // Recent (24h)
        const recentRes = await pool.query(`
            SELECT COUNT(*) as count FROM digest_entries
            WHERE (source_type = 'social' OR source_type = 'social_reddit')
            AND raw_data::text ILIKE $1
            AND created_at > NOW() - INTERVAL '24 hours'
        `, [`%${ticker}%`]);
        const recent = parseInt(recentRes.rows[0].count) || 0;

        // Baseline (Previous 3 Days)
        const baselineRes = await pool.query(`
            SELECT COUNT(*) as count FROM digest_entries
            WHERE (source_type = 'social' OR source_type = 'social_reddit')
            AND raw_data::text ILIKE $1
            AND created_at BETWEEN NOW() - INTERVAL '4 days' AND NOW() - INTERVAL '1 day'
        `, [`%${ticker}%`]);
        const baseline = (parseInt(baselineRes.rows[0].count) || 0) / 3;

        if (baseline === 0) return recent > 2 ? 100 : 0;
        return ((recent - baseline) / baseline) * 100;
    } catch (e) { return 0; }
  }

  // 2. ANALYZE & STORE (Ingestion Trigger)
  async analyzeSocialSentiment() {
      // This is now largely handled by MasterIngestion, but we keep the signature valid
      return { trendingTickers: [], redditPosts: 0, newsArticles: 0 };
  }

  // 3. DASHBOARD DATA (Fixed Signatures)
  
  // Fix: Added 'limit' parameter
  async getTrendingTickers(limit: number = 10) {
      try {
          const res = await pool.query(`
            SELECT
                t.ticker,
                COUNT(*) as mentions,
                AVG(ai_sentiment_score) as sentiment
            FROM (
                SELECT unnest(tickers) as ticker,
                CASE WHEN ai_sentiment = 'bullish' THEN 1 WHEN ai_sentiment = 'bearish' THEN -1 ELSE 0 END as ai_sentiment_score
                FROM digest_entries
                WHERE source_type LIKE 'social%'
                AND created_at > NOW() - INTERVAL '24 hours'
            ) t
            GROUP BY t.ticker
            ORDER BY mentions DESC
            LIMIT $1
          `, [limit]);
          
          return res.rows.map(r => ({
              ticker: r.ticker,
              mentions: parseInt(r.mentions),
              score: parseFloat(r.sentiment) * 100, // Scale to -100 to 100
              sentiment: parseFloat(r.sentiment) > 0 ? 'bullish' : 'bearish'
          }));
      } catch (e) { return []; }
  }

  async getTickerSentiment(ticker: string) {
      return []; // Placeholder for specific route
  }

  async getDailySummary() {
      return { totalTickers: 0, bullishCount: 0, bearishCount: 0, topBullish: [], topBearish: [] };
  }

  // Fix: Added 'limit' parameter
  async getRecentRedditPosts(limit: number = 50) {
      try {
          const res = await pool.query(`
            SELECT * FROM digest_entries
            WHERE source_type = 'social_reddit'
            ORDER BY created_at DESC
            LIMIT $1
          `, [limit]);
          return res.rows.map(r => r.raw_data); // Return original structure
      } catch(e) { return []; }
  }

  // Fix: Added 'ticker' and 'limit' parameters
  async getRedditPostsForTicker(ticker: string, limit: number = 20) {
      try {
          const res = await pool.query(`
            SELECT * FROM digest_entries
            WHERE source_type = 'social_reddit'
            AND $1 = ANY(tickers)
            ORDER BY created_at DESC
            LIMIT $2
          `, [ticker, limit]);
          return res.rows.map(r => r.raw_data);
      } catch(e) { return []; }
  }
}

export default new SocialSentimentService();
