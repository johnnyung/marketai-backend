import fmpService from './fmpService.js';

class VolatilitySurfaceEngine {
  async analyze(ticker: string, currentPrice: number) {
    try {
        // Fallback to Volatility Regime logic since we lack surface data
        const candles = await fmpService.getDailyCandles(ticker, 14);
        
        if (candles && candles.length > 0) {
            let rangeSum = 0;
            candles.forEach(c => rangeSum += (c.high - c.low));
            const atr = rangeSum / candles.length;
            const atrPct = (atr / currentPrice) * 100;
            
            const ivRank = Math.min(100, atrPct * 20); // Proxy
            
            return {
                iv_rank: Math.round(ivRank),
                regime: ivRank > 60 ? 'HIGH_FEAR' : 'NORMAL',
                skew: 0,
                breakout_prob: Math.round(ivRank),
                details: [`ATR Volatility: ${atrPct.toFixed(2)}%`]
            };
        }
        
        return { iv_rank: 0, regime: 'NORMAL', skew: 0, breakout_prob: 0, details: ['Data Missing'] };
    } catch (e) {
        return { iv_rank: 0, regime: 'NORMAL', skew: 0, breakout_prob: 0, details: [] };
    }
  }
}
export default new VolatilitySurfaceEngine();
