import fmpService from './fmpService.js';

class InstitutionalFlowEngine {
  async analyzeFlows(ticker: string) {
    // 1. Try Real Holders
    const holders = await fmpService.getInstitutionalHolders(ticker);
    if (holders && holders.length > 0) {
        return {
            ticker,
            ownership_pct: 50,
            fund_count: holders.length,
            smart_money_bias: 'ACCUMULATION',
            conviction_score: Math.min(100, holders.length),
            etf_support: true,
            details: [`${holders.length} Real Holders`]
        };
    }

    // 2. Synthetic: High Volume Candles (Inst Activity Proxy)
    const candles = await fmpService.getIntraday(ticker);
    if (candles && candles.length > 20) {
        // Find huge volume bars
        const vols = candles.map((c: any) => c.volume);
        const avgVol = vols.reduce((a:any,b:any)=>a+b,0) / vols.length;
        const spikeCount = vols.filter((v:any) => v > avgVol * 2).length;
        
        const score = Math.min(100, spikeCount * 10);
        const bias = spikeCount > 3 ? 'ACCUMULATION' : 'NEUTRAL';

        return {
            ticker,
            ownership_pct: 0,
            fund_count: 0,
            smart_money_bias: bias,
            conviction_score: score,
            etf_support: false,
            details: [`${spikeCount} Volume Spikes (Synthetic)`]
        };
    }

    return { ticker, conviction_score: 0, smart_money_bias: 'UNKNOWN', ownership_pct: 0, fund_count: 0, etf_support: false, details: [] };
  }
}
export default new InstitutionalFlowEngine();
