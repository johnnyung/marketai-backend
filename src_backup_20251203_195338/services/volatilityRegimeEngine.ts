import fmpService from './fmpService.js';

interface VolatilityRegime {
  regime: 'LOW_VOL' | 'NORMAL' | 'HIGH_VOL' | 'EXTREME' | 'UNKNOWN';
  metrics: {
    vix: number;
    atr_pct: number;
    hv_30: number;
  };
  adaptations: {
    stop_loss_multiplier: number;
    position_size_multiplier: number;
    entry_aggressiveness: string;
  };
}

class VolatilityRegimeEngine {
  async analyze(ticker: string, history: any[] = []): Promise<VolatilityRegime> {
    try {
        // FmpService now has a getDailyCandles polyfill that falls back to intraday
        const candles = await fmpService.getDailyCandles(ticker, 20);
        
        if (!candles || candles.length < 5) {
             return { regime: 'NORMAL', metrics: { vix: 0, atr_pct: 0, hv_30: 0 }, adaptations: { stop_loss_multiplier: 1, position_size_multiplier: 1, entry_aggressiveness: 'Neutral' } };
        }

        // Approx Volatility: Avg Range / Price
        let sumRange = 0;
        candles.forEach(c => sumRange += (c.high - c.low));
        const avgRange = sumRange / candles.length;
        const currentPrice = candles[0].close;
        const volPct = (avgRange / currentPrice) * 100;

        let regime: VolatilityRegime['regime'] = 'NORMAL';
        if (volPct > 3) regime = 'HIGH_VOL';
        if (volPct < 1) regime = 'LOW_VOL';

        return {
            regime,
            metrics: { vix: 0, atr_pct: parseFloat(volPct.toFixed(2)), hv_30: 0 },
            adaptations: { stop_loss_multiplier: 1, position_size_multiplier: 1, entry_aggressiveness: 'Neutral' }
        };
    } catch (e) {
        return { regime: 'NORMAL', metrics: { vix: 0, atr_pct: 0, hv_30: 0 }, adaptations: { stop_loss_multiplier: 1, position_size_multiplier: 1, entry_aggressiveness: 'Neutral' } };
    }
  }
}
export default new VolatilityRegimeEngine();
