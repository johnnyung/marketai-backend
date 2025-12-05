import fmpService from './fmpService.js';
import marketDataService from './marketDataService.js';
import { TechnicalMath } from '../utils/mathUtils.js';

interface DriftAnalysis {
  ticker: string;
  earnings_date: string;
  surprise_pct: number;
  drift_probability: number; // 0-100
  direction: 'CONTINUATION' | 'REVERSAL' | 'NEUTRAL';
  drift_score: number;
  reason: string;
}

class EarningsDriftService {

  async analyzeDrift(ticker: string): Promise<DriftAnalysis> {
    try {
        // 1. Get Last Earnings Date & Surprise
        // Assuming we fetch last reported earnings
        // Since FMP earnings calendar is future-focused, we use historical-surprises endpoint if available,
        // or infer from price action around estimated date.
        
        // For this version, we use analyst estimates vs actual (if available)
        // Or we simulate based on recent price action + news sentiment
        
        const quote = await marketDataService.getStockPrice(ticker);
        if (!quote) throw new Error("No price data");
        
        // Use price momentum as proxy for market reaction to recent news (Earnings proxy)
        const volatility = await this.getRecentVolatility(ticker);
        
        // 2. PEAD Logic (Post-Earnings Announcement Drift)
        // High Surprise + Low Volatility = High Drift Probability
        // High Surprise + High Volatility = Reversal Risk
        
        // Determine if recent move was significant (>5%)
        const recentMove = quote.changePercent;
        const isSignificant = Math.abs(recentMove) > 5.0;
        
        let direction: DriftAnalysis['direction'] = 'NEUTRAL';
        let driftScore = 50;
        let reason = "No significant catalyst detected.";

        if (isSignificant) {
            if (recentMove > 0) {
                // Upside Move
                if (volatility < 2.5) {
                    direction = 'CONTINUATION';
                    driftScore = 85;
                    reason = `PEAD BULL: Stock surged +${recentMove.toFixed(1)}% with low volatility. Institutional accumulation likely.`;
                } else {
                    direction = 'REVERSAL';
                    driftScore = 40;
                    reason = `VOLATILITY ALERT: Stock surged +${recentMove.toFixed(1)}% but vol is high. Profit taking risk.`;
                }
            } else {
                // Downside Move
                if (volatility < 2.5) {
                    direction = 'CONTINUATION';
                    driftScore = 85; // Confidence in the trend (down)
                    reason = `PEAD BEAR: Stock dumped ${recentMove.toFixed(1)}% and is drifting lower.`;
                } else {
                    direction = 'REVERSAL'; // Bounce play?
                    driftScore = 60;
                    reason = `OVERSOLD: Stock dumped ${recentMove.toFixed(1)}% on high vol. Potential dead cat bounce.`;
                }
            }
        }

        return {
            ticker,
            earnings_date: new Date().toISOString().split('T')[0], // Placeholder for actual date
            surprise_pct: recentMove, // Proxy
            drift_probability: driftScore,
            direction,
            drift_score: driftScore,
            reason
        };

    } catch (e) {
        return {
            ticker, earnings_date: '', surprise_pct: 0, drift_probability: 0,
            direction: 'NEUTRAL', drift_score: 0, reason: "Analysis Failed"
        };
    }
  }

  private async getRecentVolatility(ticker: string): Promise<number> {
      // Proxy: Use beta from profile or calculate from history
      const profile = await fmpService.getCompanyProfile(ticker);
      return Number(profile?.beta || 1.5);
  }
}

export default new EarningsDriftService();
