import fmpService from './fmpService.js';

interface HFAISignal {
    score: number;
    sentiment: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
    whale_activity: { buying_funds: string[]; selling_funds: string[]; net_change: number; };
    details: string[];
}

class HedgeFund13FEngine {
  async analyze(ticker: string): Promise<HFAISignal> {
    const holders = await fmpService.getInstitutionalHolders(ticker);
    if (holders && holders.length > 0) {
        return {
            score: Math.min(100, holders.length),
            sentiment: 'ACCUMULATION',
            whale_activity: { buying_funds: [], selling_funds: [], net_change: holders.length },
            details: ['Real 13F Data']
        };
    }

    // Synthetic: Use Intraday VWAP trend
    // If Price > VWAP consistently -> Institutional Buying
    const candles = await fmpService.getIntraday(ticker);
    if (candles && candles.length > 20) {
        // Approx VWAP
        let totalPV = 0;
        let totalV = 0;
        candles.forEach((c: any) => {
            const typ = (c.high + c.low + c.close) / 3;
            totalPV += typ * c.volume;
            totalV += c.volume;
        });
        const vwap = totalV > 0 ? totalPV / totalV : 0;
        const current = candles[0].close;
        
        const sentiment: 'ACCUMULATION' | 'NEUTRAL' = current > vwap ? 'ACCUMULATION' : 'NEUTRAL';
        
        return {
            score: current > vwap ? 75 : 40,
            sentiment,
            whale_activity: { buying_funds: [], selling_funds: [], net_change: 0 },
            details: [`Price ${current > vwap ? '>' : '<'} VWAP (Synthetic)`]
        };
    }

    const s: 'NEUTRAL' = 'NEUTRAL';
    return { score: 0, sentiment: s, whale_activity: { buying_funds: [], selling_funds: [], net_change: 0 }, details: [] };
  }
}
export default new HedgeFund13FEngine();
