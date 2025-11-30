import pool from '../db/index.js';
import marketDataService from './marketDataService.js';
import fmpService from './fmpService.js';

interface ShadowSignal {
  ticker: string;
  shadow_volume_ratio: number;
  bias: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
  stealth_score: number;
  reason: string;
  dark_prints: any[];
}

class ShadowLiquidityService {

  /**
   * Detects hidden institutional activity by analyzing Volume/Price Divergence.
   * Thesis: High Volume + Low Volatility = Absorption (Hidden Accumulation).
   * Thesis: Low Volume + High Volatility = Price Exploration (Weak).
   */
  async scanShadows(ticker: string): Promise<ShadowSignal> {
    // console.log(`      🌑 Shadow Scan: Analyzing ${ticker} for Dark Pool signatures...`);

    try {
        // 1. Get Intraday Data (Proxy for Tape Reading)
        // We need high-resolution data to see the "prints"
        const candles = await fmpService.getIntraday(ticker); // 5min candles
        
        if (!candles || candles.length < 12) {
            // Fallback to daily if intraday unavailable
            return this.getSimulatedShadow(ticker, "Insufficient Intraday Data");
        }

        // 2. Analyze "Stealth Blocks"
        // We look for candles with >2x Avg Volume but <0.5x Avg Range
        let shadowVol = 0;
        let visibleVol = 0;
        let accumulationScore = 0;
        let distributionScore = 0;
        const prints = [];

        // Calculate baselines
        const avgVol = candles.reduce((a: number, b: any) => a + b.volume, 0) / candles.length;
        const avgRange = candles.reduce((a: number, b: any) => a + (b.high - b.low), 0) / candles.length;

        // Scan last ~4 hours (50 candles)
        for (const c of candles.slice(0, 50)) {
            const range = c.high - c.low;
            const vol = c.volume;
            
            visibleVol += vol;

            // SIGNATURE A: ABSORPTION (High Vol, Tight Range)
            if (vol > (avgVol * 2.0) && range < (avgRange * 0.6)) {
                shadowVol += vol;
                // If closing near high => Accumulation
                // If closing near low => Distribution
                if (c.close > (c.open + c.close)/2) accumulationScore += vol;
                else distributionScore += vol;
                
                prints.push({
                    time: c.date,
                    price: c.close,
                    volume: vol,
                    type: 'ABSORPTION_BLOCK'
                });
            }
            
            // SIGNATURE B: EXHAUSTION (High Vol, Reversal Wick)
            // (Logic simplified for V1 speed)
        }

        // 3. Calculate Ratios
        const shadowRatio = visibleVol > 0 ? (shadowVol / visibleVol) * 100 : 0;
        let bias: ShadowSignal['bias'] = 'NEUTRAL';
        let stealthScore = Math.min(100, Math.round(shadowRatio * 2)); // Amplifier

        if (shadowRatio > 10) { // Significant hidden activity
            if (accumulationScore > distributionScore) {
                bias = 'ACCUMULATION';
                stealthScore += 10;
            } else if (distributionScore > accumulationScore) {
                bias = 'DISTRIBUTION';
                stealthScore += 10;
            }
        }

        // 4. Construct Signal
        const result: ShadowSignal = {
            ticker,
            shadow_volume_ratio: parseFloat(shadowRatio.toFixed(2)),
            bias,
            stealth_score: stealthScore,
            dark_prints: prints.slice(0, 5),
            reason: `${bias} Detected. ${shadowRatio.toFixed(1)}% of vol matched "Stealth" profile.`
        };

        // 5. Log to DB for History
        await this.logShadowPrint(ticker, result);

        return result;

    } catch (e: any) {
        console.error("Shadow Scan Error:", e.message);
        return this.getSimulatedShadow(ticker, "Engine Error");
    }
  }

  private getSimulatedShadow(ticker: string, reason: string): ShadowSignal {
      return {
          ticker,
          shadow_volume_ratio: 0,
          bias: 'NEUTRAL',
          stealth_score: 0,
          dark_prints: [],
          reason
      };
  }

  private async logShadowPrint(ticker: string, data: ShadowSignal) {
      try {
          await pool.query(`
            INSERT INTO shadow_liquidity_prints (ticker, shadow_ratio, created_at)
            VALUES ($1, $2, NOW())
          `, [ticker, data.shadow_volume_ratio]);
      } catch(e) {}
  }
}

export default new ShadowLiquidityService();
