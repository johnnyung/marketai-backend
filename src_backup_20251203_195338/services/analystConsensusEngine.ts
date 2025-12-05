import fmpService from './fmpService.js';

interface ACEAnalysis {
  ticker: string;
  street_score: number;
  consensus_rating: string;
  validation_status: 'CONFIRMED' | 'DIVERGENT' | 'UNSUPPORTED' | 'CONTRARIAN';
  upside_potential: number;
  avg_price_target: number;
  correlation_details: string[];
}

class AnalystConsensusEngine {
  async analyze(ticker: string, currentPrice: number, context: any): Promise<ACEAnalysis> {
    // 1. Try Real Analyst Data
    try {
        const targets = await fmpService.getPriceTargets(ticker);
        if (targets && targets.length > 0) {
            const latest = targets[0];
            const mean = latest.targetMean || currentPrice;
            const upside = ((mean - currentPrice) / currentPrice) * 100;
            
            let score = 60 + (upside / 2);
            score = Math.max(10, Math.min(95, score));

            return {
                ticker,
                street_score: Math.round(score),
                consensus_rating: latest.targetConsensus?.toUpperCase() || 'HOLD',
                validation_status: upside > 0 ? 'CONFIRMED' : 'DIVERGENT',
                upside_potential: parseFloat(upside.toFixed(2)),
                avg_price_target: mean,
                correlation_details: [`Target: $${mean}`]
            };
        }
    } catch (e) { /* Fallthrough */ }

    // 2. Fallback: Price Momentum (Implied Consensus)
    // If the street loves it, it's usually trending up.
    try {
        const candles = await fmpService.getDailyCandles(ticker, 20);
        if (candles && candles.length > 10) {
            const start = candles[candles.length - 1].close;
            const end = candles[0].close;
            const change = ((end - start) / start) * 100;
            
            // Score based on 20-day trend
            let score = 50 + change; 
            score = Math.max(20, Math.min(80, score));

            return {
                ticker,
                street_score: Math.round(score),
                consensus_rating: change > 0 ? 'BUY (IMPLIED)' : 'SELL (IMPLIED)',
                validation_status: 'UNSUPPORTED',
                upside_potential: parseFloat(change.toFixed(2)),
                avg_price_target: end * 1.1,
                correlation_details: ['Synthetic: Trend Proxy']
            };
        }
    } catch (e) { /* Fallthrough */ }

    // Ultimate Fail-Safe
    return { 
        ticker, 
        street_score: 40, // Not 0, not 50. Mildly bearish default for unknown.
        consensus_rating: 'UNKNOWN', 
        validation_status: 'UNSUPPORTED', 
        upside_potential: 0, 
        avg_price_target: 0, 
        correlation_details: [] 
    };
  }
}
export default new AnalystConsensusEngine();
