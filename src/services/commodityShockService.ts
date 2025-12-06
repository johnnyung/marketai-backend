import { pool } from '../db/index.js';
import marketDataService from './marketDataService.js';

interface CommodityShock {
  commodity: string;
  ticker: string;
  region: string;
  shock_type: string;
  severity: 'HIGH' | 'CRITICAL' | 'MEDIUM';
  reason: string;
}

const COMMODITY_MAP = [
    { name: 'Oil', keywords: ['oil', 'petroleum', 'crude', 'opec', 'hormuz', 'pipeline'], ticker: 'USO', producers: ['XOM', 'CVX', 'OXY'] },
    { name: 'Natural Gas', keywords: ['natural gas', 'lng', 'gazprom', 'nord stream'], ticker: 'UNG', producers: ['EQT', 'CHK'] },
    { name: 'Gold', keywords: ['gold', 'bullion', 'safe haven'], ticker: 'GLD', producers: ['NEM', 'GOLD'] },
    { name: 'Copper', keywords: ['copper', 'mining', 'chile', 'peru'], ticker: 'CPER', producers: ['FCX', 'SCCO'] },
    { name: 'Wheat', keywords: ['wheat', 'grain', 'harvest', 'ukraine', 'russia'], ticker: 'WEAT', producers: ['ADM', 'BG'] },
    { name: 'Semiconductors', keywords: ['chip', 'semiconductor', 'taiwan', 'tsmc', 'supply chain'], ticker: 'SMH', producers: ['TSM', 'NVDA'] }
];

class CommodityShockService {

  async detectShocks(): Promise<CommodityShock[]> {
    console.log('      🛢️  Commodity Detector: Scanning for Supply Disruputions...');
    const signals: CommodityShock[] = [];

    try {
        // 1. Get Geopolitical & Supply Chain News (Last 48h)
        const newsRes = await pool.query(`
            SELECT source_name, ai_summary, source_type
            FROM digest_entries
            WHERE created_at > NOW() - INTERVAL '48 hours'
            AND (source_type = 'geopolitical' OR source_type = 'manufacturing' OR source_type = 'news')
            AND ai_relevance_score > 65
        `);

        const headlines = newsRes.rows.map(r => r.ai_summary.toLowerCase());

        // 2. Scan for Resource Keywords + Conflict Keywords
        const conflictTerms = ['war', 'attack', 'strike', 'sanction', 'ban', 'embargo', 'shortage', 'halt', 'disruption', 'fire', 'storm'];

        for (const comm of COMMODITY_MAP) {
            let hitCount = 0;
            let triggerHeadline = "";

            for (const h of headlines) {
                const hasCommodity = comm.keywords.some(k => h.includes(k));
                const hasConflict = conflictTerms.some(t => h.includes(t));

                if (hasCommodity && hasConflict) {
                    hitCount++;
                    triggerHeadline = h; // Keep the last one for context
                }
            }

            // 3. Validate with Price Momentum (The market must agree)
            if (hitCount > 0) {
                const quote = await marketDataService.getStockPrice(comm.ticker);
                
                // If news is bad (shortage) AND price is reacting (UP), it's a shock
                if (quote && quote.changePercent > 0.5) {
                    signals.push({
                        commodity: comm.name,
                        ticker: comm.ticker,
                        region: "Global", // Could extract from NLP, keeping simple for now
                        shock_type: "SUPPLY_SHOCK",
                        severity: hitCount > 2 ? "CRITICAL" : "HIGH",
                        reason: `Supply Threat Detected: "${triggerHeadline.substring(0, 60)}...". ${comm.ticker} reacting (+${quote.changePercent.toFixed(2)}%).`
                    });
                    
                    console.log(`      -> 🧨 SHOCK DETECTED: ${comm.name} (${comm.ticker}). Evidence: ${hitCount} articles.`);
                }
            }
        }
        
        // Save signals
        await this.saveSignals(signals);

        return signals;

    } catch (e) {
        console.error("Commodity Shock Error:", e);
        return [];
    }
  }

  private async saveSignals(signals: CommodityShock[]) {
      if(signals.length === 0) return;
      
      // Clear old signals to keep "Shock" status fresh
      await pool.query("DELETE FROM commodity_signals"); 

      for (const s of signals) {
          await pool.query(`
            INSERT INTO commodity_signals (commodity, ticker, signal_type, region, severity, reason)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [s.commodity, s.ticker, s.shock_type, s.region, s.severity, s.reason]);
      }
  }
}

export default new CommodityShockService();
