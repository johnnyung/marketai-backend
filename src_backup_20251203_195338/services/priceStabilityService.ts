import historicalDataService from './historicalDataService.js';
import { TechnicalMath } from '../utils/mathUtils.js';

interface StabilityMetrics {
  ticker: string;
  stability_score: number; // 0-100 (100 = Perfectly Smooth Trend)
  volatility_regime: 'CALM' | 'CLUSTERING' | 'STORM';
  noise_level: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: 'ENTER' | 'WAIT' | 'AVOID';
  reason: string;
}

class PriceStabilityService {

  async analyzeStability(ticker: string): Promise<StabilityMetrics> {
    // console.log(`      📉 Checking Price Stability: ${ticker}...`);

    try {
        // 1. Get Recent History (30 Days)
        const history = await historicalDataService.getStockHistory(ticker, 30);
        if (history.length < 20) {
            return { ticker, stability_score: 50, volatility_regime: 'CALM', noise_level: 'MEDIUM', recommendation: 'WAIT', reason: "Insufficient Data" };
        }

        const closes = history.map(h => h.price);
        
        // 2. Calculate Daily Returns
        const returns = TechnicalMath.getReturns(closes);
        
        // 3. Calculate Standard Deviation (Volatility)
        const vol = TechnicalMath.calculateVolatility(returns);
        
        // 4. Calculate "Smoothness" (R-Squared of Linear Regression)
        // A perfect trend has R2 = 1.0. Chaos has R2 ~ 0.
        const r2 = this.calculateRSquared(closes);

        // 5. Detect Volatility Clustering (Are big moves happening together?)
        // If recent 5 days vol > average 20 days vol
        const recentVol = TechnicalMath.calculateVolatility(returns.slice(-5));
        const avgVol = TechnicalMath.calculateVolatility(returns);
        
        let regime: StabilityMetrics['volatility_regime'] = 'CALM';
        if (recentVol > avgVol * 1.5) regime = 'CLUSTERING';
        if (recentVol > avgVol * 2.5) regime = 'STORM';

        // 6. Score Calculation
        // High R2 + Low Vol = High Stability
        let score = (r2 * 100) - (vol * 100); // Simple heuristic
        score = Math.max(0, Math.min(100, score));

        // 7. Recommendation
        let rec: StabilityMetrics['recommendation'] = 'ENTER';
        let reason = "";

        if (regime === 'STORM') {
            rec = 'AVOID';
            reason = `Volatility Storm detected. Price action is chaotic.`;
        } else if (score < 40) {
            rec = 'WAIT';
            reason = `Low Stability (Score: ${score.toFixed(0)}). Trend is noisy.`;
        } else {
            reason = `Stable Trend (Score: ${score.toFixed(0)}). Volatility is manageable.`;
        }

        return {
            ticker,
            stability_score: score,
            volatility_regime: regime,
            noise_level: score > 70 ? 'LOW' : score > 40 ? 'MEDIUM' : 'HIGH',
            recommendation: rec,
            reason
        };

    } catch (e) {
        console.error("Stability Check Error:", e);
        return { ticker, stability_score: 0, volatility_regime: 'STORM', noise_level: 'HIGH', recommendation: 'AVOID', reason: "Analysis Failed" };
    }
  }

  private calculateRSquared(y: number[]): number {
      const n = y.length;
      const x = Array.from({length: n}, (_, i) => i);
      
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
      const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      
      const yMean = sumY / n;
      const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
      const ssRes = x.reduce((sum, xi, i) => sum + Math.pow(y[i] - (slope * xi + intercept), 2), 0);
      
      return 1 - (ssRes / ssTot);
  }
}

export default new PriceStabilityService();
