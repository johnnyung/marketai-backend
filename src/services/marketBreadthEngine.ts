import fmpService from './fmpService.js';

interface BreadthSignal {
    score: number;
    regime: string;
    thrust_detected: boolean;
    metrics: { ad_ratio: number; sector_breadth: number; rsp_spy_divergence: number };
    details: string[];
}

class MarketBreadthEngine {
  async analyze(): Promise<BreadthSignal> {
    try {
        // Simple Breadth Proxy: Check SPY
        const spy = await fmpService.getPrice('SPY');
        // We need change data. If getPrice is quote-short, it might not have change.
        // FmpService polyfill sets change to 0 if missing.
        // Let's try to get profile for price/changes
        const profile = await fmpService.getCompanyProfile('SPY');
        const change = profile && profile.changes ? profile.changes : 0;
        
        const isUp = change > 0;
        const regime = isUp ? 'BULLISH' : 'BEARISH';
        
        return {
            score: isUp ? 70 : 30,
            regime,
            thrust_detected: false,
            metrics: { ad_ratio: 1, sector_breadth: 50, rsp_spy_divergence: 0 },
            details: [`Market Trend: ${isUp ? 'UP' : 'DOWN'}`]
        };
    } catch (e) {
        return { score: 0, regime: 'NEUTRAL', thrust_detected: false, metrics: {ad_ratio:0, sector_breadth:0, rsp_spy_divergence:0}, details: [] };
    }
  }
}
export default new MarketBreadthEngine();
