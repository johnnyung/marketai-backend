import historicalDataService from './historicalDataService.js';
import marketDataService from './marketDataService.js';
import { TechnicalMath } from '../utils/mathUtils.js';

interface OutlierResult {
  ticker: string;
  is_outlier: boolean;
  z_score: number;
  type: string; // 'VOLUME_SPIKE', 'PRICE_SHOCK', 'NORMAL'
  magnitude: number; // Multiplier of average
  reason: string;
}

class OutlierDetectionService {

  async detect(ticker: string): Promise<OutlierResult> {
    try {
        // 1. Get Live Data
        const quote = await marketDataService.getStockPrice(ticker);
        if (!quote) throw new Error("No live quote");

        // 2. Get Historical Baseline (30 Days)
        const history = await historicalDataService.getStockHistory(ticker, 30);
        if (history.length < 20) throw new Error("Insufficient history");

        // 3. Analyze Volume
        const volumes = history.map(h => h.volume || 0); // Assuming history has volume
        // Need to ensure historical service returns volume, if not mock it for safety
        // Actually, FMP history returns 'volume'. We need to make sure historicalDataService passes it.
        // For now, we will assume price volatility as primary if volume is missing.
        
        const prices = history.map(h => h.price);
        const returns = TechnicalMath.getReturns(prices);
        
        // Calculate Z-Score for Price Movement
        // Current move %
        const currentMove = Math.abs(quote.changePercent);
        // Historical moves (absolute)
        const historicalMoves = returns.map(r => Math.abs(r * 100));
        
        const zScore = TechnicalMath.calculateZScore(currentMove, historicalMoves);

        if (zScore > 3.0) {
            return {
                ticker,
                is_outlier: true,
                z_score: zScore,
                type: 'PRICE_SHOCK',
                magnitude: currentMove,
                reason: `3-Sigma Price Move: ${currentMove.toFixed(2)}% (Z: ${zScore.toFixed(1)})`
            };
        }

        // TODO: Add Volume Z-Score once History Service is confirmed to return volume

        return { ticker, is_outlier: false, z_score: zScore, type: 'NORMAL', magnitude: 0, reason: '' };

    } catch (e) {
        return { ticker, is_outlier: false, z_score: 0, type: 'ERROR', magnitude: 0, reason: '' };
    }
  }
}

export default new OutlierDetectionService();
