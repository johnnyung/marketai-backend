import fmpService from './fmpService.js';

class UnusualOptionsEngine {
  async analyze(ticker: string) {
    try {
        // Fallback Proxy: Volume Spike Analysis
        // FMP Quote-Short gives us volume
        const quote = await fmpService.getPrice(ticker);
        
        // We need average volume to detect spike. Quote-Short doesn't have avgVolume.
        // Try profile.
        const profile = await fmpService.getCompanyProfile(ticker);
        const avgVol = profile?.volAvg || 1000000;
        const vol = quote?.volume || 0;
        
        const volSpike = vol > (avgVol * 1.5);
        
        const sentiment: 'BULLISH' | 'NEUTRAL' = volSpike ? 'BULLISH' : 'NEUTRAL';
        const risk: 'LOW' | 'HIGH' = 'LOW'; 

        return {
            ticker,
            score: volSpike ? 80 : 40,
            sentiment,
            metrics: { 
                call_put_ratio: 1, 
                net_premium_flow: 0, 
                iv_rank: 50, 
                gamma_squeeze_risk: risk 
            },
            anomalies: volSpike ? ['High Volume Event'] : []
        };
    } catch (e) {
        const s: 'NEUTRAL' = 'NEUTRAL';
        const r: 'LOW' = 'LOW';
        return { ticker, score: 0, sentiment: s, metrics: { call_put_ratio: 0, net_premium_flow:0, iv_rank:0, gamma_squeeze_risk: r }, anomalies: [] };
    }
  }
}
export default new UnusualOptionsEngine();
