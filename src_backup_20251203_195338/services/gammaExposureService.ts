import fmpService from './fmpService.js';

interface GammaProfile {
  ticker: string;
  net_gamma_exposure: number;
  volatility_regime: 'SUPPRESSED' | 'AMPLIFIED' | 'NEUTRAL';
  current_price: number;
  reason: string;
  gamma_flip_level: number;
  total_call_oi: number;
  total_put_oi: number;
  put_call_ratio: number;
}

class GammaExposureService {
  async analyze(ticker: string): Promise<GammaProfile> {
    try {
        // 1. Try Option Chain (Primary)
        const chain = await fmpService.getOptionChain(ticker);
        if (chain && chain.length > 0) {
            let calls = 0, puts = 0;
            chain.forEach((o: any) => {
                const type = o.contractType || o.type || '';
                if (type.includes('CALL')) calls += (o.openInterest || 0);
                if (type.includes('PUT')) puts += (o.openInterest || 0);
            });
            
            const pcr = puts > 0 ? calls / puts : 1;
            const netExp = calls - puts; // Real Net Exposure
            const regime = pcr > 1.2 ? 'SUPPRESSED' : pcr < 0.8 ? 'AMPLIFIED' : 'NEUTRAL';

            return {
                ticker,
                net_gamma_exposure: netExp,
                volatility_regime: regime,
                current_price: 0,
                reason: `OI PCR: ${pcr.toFixed(2)}`,
                gamma_flip_level: 0,
                total_call_oi: calls,
                total_put_oi: puts,
                put_call_ratio: parseFloat(pcr.toFixed(2))
            };
        }

        // 2. Fallback: Realized Volatility Proxy
        const candles = await fmpService.getDailyCandles(ticker, 30);
        if (candles && candles.length > 5) {
             let sumChange = 0;
             candles.forEach((c: any) => {
                 sumChange += Math.abs((c.close - c.open) / c.open);
             });
             const avgVol = sumChange / candles.length; // e.g. 0.015
             
             // Calculate a unique synthetic exposure score based on volatility
             // High Vol = Negative Gamma (Short Dealer Gamma) -> Negative Score
             // Low Vol = Positive Gamma (Long Dealer Gamma) -> Positive Score
             // Scaling: 0.01 (1%) vol -> +1000. 0.03 (3%) vol -> -1000.
             
             // Formula: (TargetBaseVol - ActualVol) * Scalar
             // Base = 0.02 (2%).
             // If Actual = 0.01, (0.02 - 0.01) * 100000 = +1000
             // If Actual = 0.03, (0.02 - 0.03) * 100000 = -1000
             
             const rawScore = (0.02 - avgVol) * 100000;
             const netExp = parseFloat(rawScore.toFixed(2)); // Keep decimals for uniqueness
             
             const regime = avgVol < 0.015 ? 'SUPPRESSED' : avgVol > 0.025 ? 'AMPLIFIED' : 'NEUTRAL';

             return {
                ticker,
                net_gamma_exposure: netExp,
                volatility_regime: regime,
                current_price: candles[0].close,
                reason: `Synthetic GEX (Vol: ${(avgVol*100).toFixed(2)}%)`,
                gamma_flip_level: 0,
                total_call_oi: 0,
                total_put_oi: 0,
                put_call_ratio: 1
             };
        }
        
    } catch (e) { /* Fallthrough */ }

    return {
        ticker,
        net_gamma_exposure: 0,
        volatility_regime: 'NEUTRAL',
        current_price: 0,
        reason: 'Data Unavailable',
        gamma_flip_level: 0,
        total_call_oi: 0,
        total_put_oi: 0,
        put_call_ratio: 0
    };
  }
}
export default new GammaExposureService();
