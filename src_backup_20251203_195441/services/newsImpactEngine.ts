import pool from '../db/index.js';
import crypto from 'crypto';

interface NewsRating {
  impact_score: number;
  is_noise: boolean;
  is_shock: boolean;
  catalyst_type: string;
  reason: string;
}

class NewsImpactEngine {

  // Keywords that suggest "Noise" (Clickbait, auto-generated content)
  private NOISE_TRIGGERS = [
      'why it moved', 'what to watch', '3 stocks to buy', 'motley fool',
      'zacks rank', 'prediction', 'could hit', 'top movers', 'market wrap',
      'mid-day update', 'morning brief', 'etf report', 'technical analysis'
  ];

  // Keywords that suggest "Material Impact" (Hard Catalysts)
  private SHOCK_TRIGGERS = [
      'fda approval', 'fda reject', 'sec probe', 'investigation', 'indicted',
      'subpoena', 'raid', 'bankruptcy', 'insolvent', 'default',
      'ceo resign', 'cfo resign', 'step down', 'fired', 'appointed',
      'merger', 'acquisition', 'buyout', 'hostile bid', 'rejected offer',
      'guidance raise', 'guidance cut', 'earnings beat', 'earnings miss',
      'contract win', 'partnership', 'patent', 'lawsuit', 'settlement'
  ];

  async analyzeBatch(entries: any[]) {
      // console.log(`      📰 NIE: Analyzing ${entries.length} news items...`);
      let shockCount = 0;

      for (const entry of entries) {
          const rating = this.rateHeadline(entry.title, entry.content || "");
          
          if (rating.is_shock) shockCount++;

          // Persist Rating
          await this.saveRating(entry.external_id || entry.url, rating);
      }

      if (shockCount > 0) console.log(`      ⚡ NIE: Detected ${shockCount} Shock Events.`);
  }

  rateHeadline(title: string, content: string): NewsRating {
      const text = (title + " " + content).toLowerCase();
      
      // 1. Check Noise
      for (const noise of this.NOISE_TRIGGERS) {
          if (text.includes(noise)) {
              return {
                  impact_score: 10,
                  is_noise: true,
                  is_shock: false,
                  catalyst_type: 'NOISE',
                  reason: `Matches noise pattern: "${noise}"`
              };
          }
      }

      // 2. Check Shock
      let shockType = 'GENERAL';
      let isShock = false;
      let score = 50; // Base

      for (const trigger of this.SHOCK_TRIGGERS) {
          if (text.includes(trigger)) {
              isShock = true;
              score = 90;
              if (trigger.includes('earnings') || trigger.includes('guidance')) shockType = 'EARNINGS';
              else if (trigger.includes('sec') || trigger.includes('lawsuit')) shockType = 'REGULATORY';
              else if (trigger.includes('fda')) shockType = 'BIOTECH';
              else if (trigger.includes('merger') || trigger.includes('acquisition')) shockType = 'M&A';
              else shockType = 'CORPORATE';
              break;
          }
      }

      // 3. Context Boosters
      if (!isShock) {
          if (text.includes('billion')) score += 10;
          if (text.includes('record')) score += 5;
          if (text.includes('unexpected')) score += 10;
          if (text.includes('surge') || text.includes('plunge')) score += 10;
      }

      return {
          impact_score: Math.min(99, score),
          is_noise: false,
          is_shock: isShock,
          catalyst_type: shockType,
          reason: isShock ? `Shock Trigger: ${shockType}` : 'Standard News'
      };
  }

  private async saveRating(idStr: string, rating: NewsRating) {
      const hash = crypto.createHash('sha256').update(idStr).digest('hex');
      try {
          await pool.query(`
            INSERT INTO news_impact_ratings (url_hash, impact_score, is_noise, is_shock, catalyst_type, confidence)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (url_hash) DO NOTHING
          `, [hash, rating.impact_score, rating.is_noise, rating.is_shock, rating.catalyst_type, 85]);
      } catch(e) {}
  }

  async getHighImpactNews(limit: number = 5) {
      const res = await pool.query(`
        SELECT n.impact_score, n.catalyst_type, d.ai_summary, d.source_name, d.event_date
        FROM news_impact_ratings n
        JOIN digest_entries d ON n.url_hash = d.content_hash
        WHERE n.is_noise = FALSE AND n.impact_score > 75
        ORDER BY d.event_date DESC
        LIMIT $1
      `, [limit]);
      return res.rows;
  }
}

export default new NewsImpactEngine();
