import Anthropic from '@anthropic-ai/sdk';
import { Pool } from 'pg';
import aiTipTrackerService from './aiTipTrackerService.js';
import priceService from './priceService.js';
import tradeArchitectService from './tradeArchitectService.js';
import technicalIndicatorsService from './technicalIndicatorsService.js';
import retailInterpretabilityService from './retailInterpretabilityService.js';
import realTimeFeedService from './realTimeFeedService.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

class TradingOpportunitiesService {
  
  async generateTradingSignals(limit: number = 20, autoTrack: boolean = false) {
    try {
        const entries = await this.getRecentEntries(50);
        if (entries.length === 0) return [];
        
        const signals = await this.generateAISignals(entries, limit);
        return signals;
    } catch (error) {
        console.error("Signal Gen Error:", error);
        return [];
    }
  }

  private async getRecentEntries(limit: number) {
    // FIXED QUERY: Removed bad array operator
    const result = await pool.query(`
      SELECT source_type, source_name, ai_summary, ai_relevance_score, ai_sentiment, event_date
      FROM digest_entries
      WHERE event_date >= NOW() - INTERVAL '48 hours'
      ORDER BY ai_relevance_score DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  }

  private async generateAISignals(entries: any[], limit: number) {
      // Simplified Logic for Stability
      const signals = [];
      const tickers = new Set();
      
      for(const e of entries) {
          const match = e.ai_summary.match(/\b[A-Z]{2,5}\b/);
          if (match && !tickers.has(match[0])) {
              tickers.add(match[0]);
              signals.push({
                  ticker: match[0],
                  action: e.ai_sentiment === 'bullish' ? 'BUY' : 'WATCH',
                  confidence: e.ai_relevance_score,
                  reasoning: e.ai_summary,
                  catalysts: [e.source_name],
                  riskLevel: 'MEDIUM'
              });
          }
      }
      return signals.slice(0, limit);
  }
  
  // Stub for compatibility
  async generateTickerSignal(ticker: string) { return null; }
}

export default new TradingOpportunitiesService();
