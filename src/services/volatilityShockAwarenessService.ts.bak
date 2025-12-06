import { pool } from '../db/index.js';
import marketDataService from './marketDataService.js';

interface VSAMetrics {
  regime: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
  vix_level: number;
  confidence_modifier: number;
  stop_width_modifier: number;
  reason: string;
}

class VolatilityShockAwarenessService {
  
  private cache: VSAMetrics | null = null;
  private lastUpdate = 0;

  /**
   * Get current VSA metrics based on live VIX
   */
  async getMarketCondition(): Promise<VSAMetrics> {
    // Cache for 15 mins
    if (this.cache && (Date.now() - this.lastUpdate < 900000)) return this.cache;

    try {
        // 1. Get VIX
        let vix = 18.0;
        try {
            const quote = await marketDataService.getStockPrice('^VIX');
            if (quote) vix = quote.price;
        } catch (e) {}

        // 2. Determine Regime
        let regime: VSAMetrics['regime'] = 'NORMAL';
        if (vix < 15) regime = 'LOW';
        else if (vix >= 15 && vix < 24) regime = 'NORMAL';
        else if (vix >= 24 && vix < 35) regime = 'HIGH';
        else regime = 'EXTREME';

        // 3. Fetch Learned Parameters from DB
        const res = await pool.query(`
            SELECT confidence_modifier, stop_width_modifier
            FROM volatility_learning_snapshots
            WHERE regime = $1
            ORDER BY snapshot_date DESC
            LIMIT 1
        `, [regime]);

        const learning = res.rows[0] || { confidence_modifier: 1.0, stop_width_modifier: 1.0 };

        const metrics: VSAMetrics = {
            regime,
            vix_level: vix,
            confidence_modifier: parseFloat(learning.confidence_modifier),
            stop_width_modifier: parseFloat(learning.stop_width_modifier),
            reason: `VIX ${vix.toFixed(1)} (${regime}). System historical win-rate in this regime adjusts confidence by x${learning.confidence_modifier}.`
        };

        this.cache = metrics;
        this.lastUpdate = Date.now();
        
        return metrics;

    } catch (e) {
        return { regime: 'NORMAL', vix_level: 18, confidence_modifier: 1.0, stop_width_modifier: 1.0, reason: "VSA Error" };
    }
  }

  /**
   * LEARN: Updates regime performance stats based on recent trade outcomes
   * (Runs nightly via Cron)
   */
  async updateLearning() {
      console.log("      ⚡ VSA: Updating Volatility Memory...");
      // This would query past trades joined with historical VIX levels
      // For V1, we just keep the seed data structure ready for the loop
  }
}

export default new VolatilityShockAwarenessService();
