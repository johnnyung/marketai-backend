import fmpService from './fmpService.js';

interface RealityResult {
  aligned: boolean;
  vwap: number;
  currentPrice: number;
  trend: 'UP' | 'DOWN' | 'FLAT';
  reason: string;
}

class RealityCheckService {
  
  async verifySignal(ticker: string, action: 'BUY' | 'SELL'): Promise<RealityResult> {
    console.log(`      📉 Reality Check: Validating ${ticker} ${action}...`);

    try {
        // Get 5min candles for today
        const candles = await fmpService.getIntraday(ticker);
        if (!candles || candles.length < 10) {
            // Insufficient data (e.g. pre-market), pass with caution
            return { aligned: true, vwap: 0, currentPrice: 0, trend: 'FLAT', reason: 'Insufficient intraday data' };
        }

        // Sort oldest to newest
        const sorted = candles.reverse();
        const recent = sorted.slice(-12); // Last hour

        // 1. Calculate VWAP (Volume Weighted Average Price) of last hour
        let totalVol = 0;
        let totalPV = 0;
        recent.forEach((c: any) => {
            totalVol += c.volume;
            totalPV += (c.close * c.volume);
        });
        const vwap = totalPV / totalVol;
        const currentPrice = recent[recent.length - 1].close;

        // 2. Determine Short-term Trend
        const first = recent[0].close;
        const trend = currentPrice > first ? 'UP' : 'DOWN';

        // 3. Validation Logic
        let aligned = false;
        let reason = "";

        if (action === 'BUY') {
            // Buy Signal requires price > VWAP OR Strong Uptrend
            if (currentPrice > vwap) {
                aligned = true;
                reason = `Price ($${currentPrice}) above intraday VWAP ($${vwap.toFixed(2)}). Momentum confirmed.`;
            } else if (trend === 'UP') {
                aligned = true;
                reason = `Price below VWAP but short-term trend is UP. Reversion play allowed.`;
            } else {
                aligned = false;
                reason = `Price ($${currentPrice}) below VWAP ($${vwap.toFixed(2)}) AND trending DOWN. "Catching a falling knife".`;
            }
        } else {
            // Sell/Watch logic (simplified)
            aligned = true;
            reason = "Reality check primarily filters BUY signals.";
        }

        return { aligned, vwap, currentPrice, trend, reason };

    } catch (e) {
        return { aligned: true, vwap: 0, currentPrice: 0, trend: 'FLAT', reason: 'Data Error (Skipping Check)' };
    }
  }
}

export default new RealityCheckService();
