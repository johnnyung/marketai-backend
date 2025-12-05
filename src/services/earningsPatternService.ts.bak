import pool from '../db/index.js';

interface EarningsPattern {
  ticker: string;
  pattern: string;
  win_rate: number;
  avg_return: number;
  confidence: number;
  description: string;
}

class EarningsPatternService {

  // Check if a ticker has a known history
  async checkMemoryBank(ticker: string): Promise<EarningsPattern | null> {
    try {
        const res = await pool.query(`
            SELECT * FROM earnings_pattern_memory
            WHERE ticker = $1
        `, [ticker]);

        if (res.rows.length > 0) {
            const r = res.rows[0];
            return {
                ticker: r.ticker,
                pattern: r.pattern_type,
                win_rate: parseFloat(r.win_rate),
                avg_return: parseFloat(r.avg_move_pct),
                confidence: r.confidence_score,
                description: `${r.ticker} typically exhibits a ${r.pattern_type} (${r.win_rate}% Win Rate, Avg ${r.avg_move_pct}%) before earnings.`
            };
        }
        return null;
    } catch (e) {
        return null;
    }
  }

  // (Future) Learn from new data
  async learnPattern(ticker: string, priceAction: any[]) {
      // Placeholder for self-learning logic
      // Would analyze price action -14 days from earnings dates
  }
}

export default new EarningsPatternService();
