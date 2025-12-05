import fmpService from './fmpService.js';

class ShadowLiquidityService {
  async scanShadows(ticker: string) {
    try {
        const intraday = await fmpService.getIntraday(ticker);
        
        if (!intraday || intraday.length < 10) {
            return {
                ticker,
                shadow_volume_ratio: 0,
                bias: 'UNKNOWN',
                stealth_score: 0,
                reason: 'No intraday data',
                dark_prints: []
            };
        }

        // Logic: Efficiency Ratio Proxy
        // If Price moves little but Volume is high -> Shadow Accumulation
        let shadowVol = 0;
        let totalVol = 0;
        
        intraday.slice(0, 30).forEach((bar: any) => {
            const range = Math.abs(bar.high - bar.low);
            const vol = bar.volume;
            totalVol += vol;
            if (range < (bar.open * 0.001)) { // < 0.1% move
                shadowVol += vol;
            }
        });

        const ratio = totalVol > 0 ? shadowVol / totalVol : 0;
        const score = Math.min(100, Math.round(ratio * 100));

        return {
            ticker,
            shadow_volume_ratio: parseFloat(ratio.toFixed(2)),
            bias: ratio > 0.4 ? 'ACCUMULATION' : 'NEUTRAL',
            stealth_score: score,
            reason: `Efficiency Ratio: ${ratio.toFixed(2)}`,
            dark_prints: []
        };

    } catch (e) {
        return { ticker, shadow_volume_ratio: 0, bias: 'UNKNOWN', stealth_score: 0, reason: 'Analysis error', dark_prints: [] };
    }
  }
}

export default new ShadowLiquidityService();
