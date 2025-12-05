import { Pool } from 'pg';
import unifiedIntelligenceFactory from './unifiedIntelligenceFactory.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class TradingOpportunitiesService {
  
  async generateTradingSignals(limit: number = 20) {
    try {
        // 1. Get Potential Targets from Digest
        const entries = await pool.query(`
          SELECT DISTINCT unnest(tickers) as ticker
          FROM digest_entries
          WHERE event_date >= NOW() - INTERVAL '48 hours'
          AND ai_relevance_score >= 75
          LIMIT 15
        `);

        if (entries.rows.length === 0) return [];
        
        const signals = [];
        const processed = new Set<string>();

        for (const row of entries.rows) {
            const ticker = row.ticker;
            if (!ticker || processed.has(ticker)) continue;
            processed.add(ticker);

            // 2. Run Unified Factory
            try {
                const bundle = await unifiedIntelligenceFactory.generateBundle(ticker);
                
                if (bundle.scoring.weighted_confidence > 60) {
                    signals.push({
                        ticker: bundle.ticker,
                        action: bundle.scoring.final_conviction,
                        confidence: bundle.scoring.weighted_confidence,
                        reasoning: bundle.scoring.primary_driver,
                        catalysts: bundle.engines.catalyst.detected ? [bundle.engines.catalyst.type] : [],
                        riskLevel: bundle.engines.fsi.traffic_light,
                        intelligence: bundle // Embed full bundle
                    });
                }
            } catch (e) {}
        }
        
        return signals.sort((a, b) => b.confidence - a.confidence).slice(0, limit);

    } catch (error: any) {
        console.error("Signal Gen Error:", error);
        return [];
    }
  }
  
  async generateTickerSignal(ticker: string) {
      try {
          const bundle = await unifiedIntelligenceFactory.generateBundle(ticker);
          return {
              ticker: bundle.ticker,
              action: bundle.scoring.final_conviction,
              confidence: bundle.scoring.weighted_confidence,
              reasoning: bundle.scoring.primary_driver,
              intelligence: bundle
          };
      } catch(e) { return null; }
  }
}

export default new TradingOpportunitiesService();
