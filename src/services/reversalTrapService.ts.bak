import { pool } from '../db/index.js';
import marketDataService from './marketDataService.js';
import historicalDataService from './historicalDataService.js';
import { TechnicalMath } from '../utils/mathUtils.js';

interface TrapMetrics {
  is_trap_zone: boolean;
  reversal_risk_score: number; // 0-100
  avg_wick_depth: number;
  recommended_buffer: number;
  reason: string;
}

class ReversalTrapService {
  
  private cache: Record<string, TrapMetrics> = {};
  private lastUpdate = 0;

  async analyzeTrapRisk(ticker: string, volatilityRegime: string = 'NORMAL'): Promise<TrapMetrics> {
    try {
        // 1. Check DB for learned behavior
        const res = await pool.query(`
            SELECT fakeout_rate, avg_wick_depth_pct
            FROM reversal_trap_stats
            WHERE ticker_symbol = $1 AND volatility_regime = $2
        `, [ticker, volatilityRegime]);

        let fakeoutRate = 0;
        let wickDepth = 0;

        if (res.rows.length > 0) {
            fakeoutRate = parseFloat(res.rows[0].fakeout_rate);
            wickDepth = parseFloat(res.rows[0].avg_wick_depth_pct);
        } else {
            // Fallback: Analyze recent candles (Real-time check)
            // We check if Lows are often significantly below Opens/Closes (long wicks)
            const hist = await historicalDataService.getStockHistory(ticker, 30);
            if (hist.length > 10) {
                let wickCount = 0;
                let totalWick = 0;
                
                hist.forEach((d: any) => {
                    const bodyLow = Math.min(d.open || d.price, d.close || d.price);
                    const wickSize = (bodyLow - (d.low || d.price)) / bodyLow * 100;
                    if (wickSize > 1.0) { // >1% wick
                        wickCount++;
                        totalWick += wickSize;
                    }
                });
                
                fakeoutRate = (wickCount / hist.length) * 100;
                wickDepth = wickCount > 0 ? totalWick / wickCount : 0;
            }
        }

        // 2. Determine Risk Score
        const riskScore = Math.min(100, Math.round(fakeoutRate * 1.5)); // Cap at 100
        
        // 3. Calculate Buffer
        // If wicks are usually 3%, buffer should be 3.5%
        const buffer = wickDepth * 1.2;

        let reason = "Standard Price Action";
        if (riskScore > 60) {
            reason = `TRAP ALERT: High fakeout rate (${fakeoutRate.toFixed(0)}%). Wicks avg ${wickDepth.toFixed(1)}%.`;
        }

        return {
            is_trap_zone: riskScore > 50,
            reversal_risk_score: riskScore,
            avg_wick_depth: wickDepth,
            recommended_buffer: parseFloat(buffer.toFixed(2)),
            reason
        };

    } catch (e) {
        return { is_trap_zone: false, reversal_risk_score: 0, avg_wick_depth: 0, recommended_buffer: 0, reason: "RTD Error" };
    }
  }
}

export default new ReversalTrapService();
