import marketDataService from './marketDataService.js';
import pool from '../db/index.js';

interface GlobalRegime {
  regime: 'GLOBAL_BULL' | 'GLOBAL_BEAR' | 'US_EXCEPTIONALISM' | 'GLOBAL_DRAG' | 'MIXED';
  divergence_score: number;
  details: string;
  metrics: {
    us: number;
    eu: number;
    asia: number;
    em: number;
  };
}

const PROXIES = {
    US: 'SPY',
    EU: 'VGK',   // Vanguard FTSE Europe
    ASIA: 'EWJ', // iShares MSCI Japan (Proxy for developed Asia liquidity)
    EM: 'EEM'    // iShares MSCI Emerging Markets
};

class GlobalDivergenceService {

  async analyzeGlobalState(): Promise<GlobalRegime> {
    console.log('      🌐 Global Scanner: Analyzing Macro Divergence...');

    try {
        // 1. Batch Fetch Prices
        const quotes = await marketDataService.getMultiplePrices([
            PROXIES.US, PROXIES.EU, PROXIES.ASIA, PROXIES.EM
        ]);

        const us = quotes.get(PROXIES.US)?.changePercent || 0;
        const eu = quotes.get(PROXIES.EU)?.changePercent || 0;
        const asia = quotes.get(PROXIES.ASIA)?.changePercent || 0;
        const em = quotes.get(PROXIES.EM)?.changePercent || 0;

        // 2. Calculate Global Average (Excluding US)
        const globalAvg = (eu + asia + em) / 3;
        
        // 3. Determine Regime
        let regime: GlobalRegime['regime'] = 'MIXED';
        
        if (us > 0.2 && eu > 0.2 && asia > 0.2 && em > 0.2) {
            regime = 'GLOBAL_BULL';
        } else if (us < -0.2 && eu < -0.2 && asia < -0.2 && em < -0.2) {
            regime = 'GLOBAL_BEAR';
        } else if (us > 0.5 && globalAvg < -0.2) {
            regime = 'US_EXCEPTIONALISM'; // Flight to safety in USD assets
        } else if (us < -0.2 && globalAvg > 0.5) {
            regime = 'GLOBAL_DRAG'; // US Specific weakness
        }

        // 4. Calculate Divergence Score (Standard Deviation proxy)
        // High score = High fragmentation = Higher risk/volatility
        const values = [us, eu, asia, em];
        const mean = values.reduce((a, b) => a + b, 0) / 4;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 4;
        const stdDev = Math.sqrt(variance);
        // Normalize: A stdDev of 1.0% is very high divergence -> Score 100
        const divergence_score = Math.min(100, Math.round(stdDev * 100));

        const details = `US: ${us.toFixed(2)}%, EU: ${eu.toFixed(2)}%, Asia: ${asia.toFixed(2)}%, EM: ${em.toFixed(2)}%`;

        console.log(`      -> 🌍 Regime: ${regime} (Divergence: ${divergence_score}/100)`);

        // 5. Save Snapshot
        await this.saveSnapshot(regime, us, eu, asia, em, divergence_score);

        return {
            regime,
            divergence_score,
            details,
            metrics: { us, eu, asia, em }
        };

    } catch (e) {
        console.error("Global Scanner Error:", e);
        return {
            regime: 'MIXED', divergence_score: 0, details: "Data Error",
            metrics: { us: 0, eu: 0, asia: 0, em: 0 }
        };
    }
  }

  private async saveSnapshot(regime: string, us: number, eu: number, asia: number, em: number, div: number) {
      try {
          await pool.query(`
            INSERT INTO global_market_snapshots
            (snapshot_date, regime, us_change, eu_change, asia_change, em_change, divergence_score)
            VALUES (CURRENT_DATE, $1, $2, $3, $4, $5, $6)
          `, [regime, us, eu, asia, em, div]);
      } catch(e) {}
  }
}

export default new GlobalDivergenceService();
